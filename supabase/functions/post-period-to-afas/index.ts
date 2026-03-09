import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAfasToken, getAfasBaseUrl, buildAfasAuthHeader } from "../_shared/afas-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostingRequest {
  period_id: string;
  dry_run?: boolean;
}

interface AppConfig {
  afas_gl_interest_pik: string;
  afas_gl_interest_cash: string;
  afas_journal_code: string;
  afas_admin_code: string;
  afas_payment_terms_days: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const afasToken = await getAfasToken();
    const afasBaseUrl = await getAfasBaseUrl();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!afasToken || !afasBaseUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing AFAS credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = buildAfasAuthHeader(afasToken);

    const body: PostingRequest = await req.json();
    const { period_id, dry_run = false } = body;

    if (!period_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing period_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load configuration from app_config table
    const configKeys = [
      'afas_gl_interest_pik', 'afas_gl_interest_cash',
      'afas_journal_code', 'afas_admin_code', 'afas_payment_terms_days',
    ];
    const { data: configRows, error: configError } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', configKeys);

    if (configError) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to load config: ${configError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config: Record<string, string> = {};
    for (const row of configRows || []) {
      config[row.key] = row.value;
    }

    // Validate required config
    const missingKeys = configKeys.filter(k => !config[k]);
    if (missingKeys.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: `Missing app_config keys: ${missingKeys.join(', ')}. Run the seed migration or set them manually.` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminCode = config.afas_admin_code;
    const journalCode = config.afas_journal_code;
    const paymentTermsDays = parseInt(config.afas_payment_terms_days, 10) || 30;

    // Fetch period with loan data
    const { data: period, error: periodError } = await supabase
      .from('periods')
      .select(`
        id,
        period_start,
        period_end,
        status,
        afas_posted_at,
        afas_invoice_number,
        loan_id,
        loans (
          id,
          borrower_name,
          loan_id,
          interest_type,
          commitment_fee_rate,
          total_commitment
        )
      `)
      .eq('id', period_id)
      .single();

    if (periodError || !period) {
      return new Response(
        JSON.stringify({ success: false, error: `Period not found: ${periodError?.message}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already posted (idempotency)
    if (period.afas_posted_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Period already posted to AFAS',
          afas_invoice_number: period.afas_invoice_number,
          afas_posted_at: period.afas_posted_at
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check period status
    if (period.status !== 'sent') {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Period must be in 'sent' status to post. Current status: ${period.status}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const loan = period.loans as any;
    if (!loan) {
      return new Response(
        JSON.stringify({ success: false, error: 'Loan not found for period' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate period totals from approved events
    // Get PIK capitalization event for this period (contains interest + commitment fee)
    const { data: pikEvent } = await supabase
      .from('loan_events')
      .select('amount, metadata')
      .eq('loan_id', period.loan_id)
      .eq('event_type', 'pik_capitalization_posted')
      .eq('status', 'approved')
      .eq('metadata->>period_id', period.id)
      .single();

    let totalAmount = 0;
    let interestAmount = 0;
    let commitmentFeeAmount = 0;

    if (pikEvent) {
      totalAmount = pikEvent.amount || 0;
      interestAmount = pikEvent.metadata?.interest_accrued || 0;
      commitmentFeeAmount = pikEvent.metadata?.commitment_fee_accrued || 0;
    }

    if (totalAmount <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No amount to post - period has zero or negative total'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate invoice number with version suffix to prevent collisions on re-post
    const { count: priorPostCount } = await supabase
      .from('periods')
      .select('id', { count: 'exact', head: true })
      .eq('loan_id', period.loan_id)
      .eq('period_end', period.period_end)
      .not('afas_invoice_number', 'is', null);

    const version = (priorPostCount || 0) + 1;
    const invoiceNumber = version === 1
      ? `INT-${loan.loan_id}-${period.period_end}`
      : `INT-${loan.loan_id}-${period.period_end}-v${version}`;

    // Build description
    const description = `Interest ${period.period_start} - ${period.period_end} | ${loan.borrower_name}`;

    // Select GL account based on loan interest type
    const glAccount = loan.interest_type === 'pik'
      ? config.afas_gl_interest_pik
      : config.afas_gl_interest_cash;

    // Calculate due date from config
    const dueDate = new Date(
      new Date(period.period_end).getTime() + paymentTermsDays * 24 * 60 * 60 * 1000
    ).toISOString().split('T')[0];

    // AFAS FiEntries payload - single line for total
    const afasPayload = {
      FiEntries: {
        Element: {
          Fields: {
            AdCd: adminCode,
            JoCd: journalCode,
            DaJo: period.period_end, // Journal date = period end
            DaDu: dueDate,
            InNu: invoiceNumber,
            Ds: description,
            // Link to debtor via loan_id
            DbId: loan.loan_id,
          },
          Objects: {
            FiEntriesLines: {
              Element: {
                Fields: {
                  TyNt: 1,
                  AcId: glAccount,
                  AmVa: totalAmount,
                  Ds: `Interest: €${interestAmount.toFixed(2)} | Commitment Fee: €${commitmentFeeAmount.toFixed(2)}`,
                  DC: "C", // Credit (income)
                }
              }
            }
          }
        }
      }
    };

    // Dry run mode - return payload without posting
    if (dry_run) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          message: 'Dry run - payload that would be sent:',
          payload: afasPayload,
          config: {
            gl_account: glAccount,
            journal_code: journalCode,
            admin_code: adminCode,
            payment_terms_days: paymentTermsDays,
          },
          period: {
            id: period.id,
            period_start: period.period_start,
            period_end: period.period_end,
            status: period.status
          },
          loan: {
            id: loan.id,
            borrower_name: loan.borrower_name,
            loan_id: loan.loan_id,
            interest_type: loan.interest_type,
          },
          amounts: {
            total: totalAmount,
            interest: interestAmount,
            commitment_fee: commitmentFeeAmount
          },
          invoice_number: invoiceNumber
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Post to AFAS
    const updateUrl = `${afasBaseUrl}/connectors/FiEntries`;

    console.log('Posting to AFAS:', updateUrl);
    console.log('Payload:', JSON.stringify(afasPayload, null, 2));

    const afasResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(afasPayload),
    });

    const responseText = await afasResponse.text();
    console.log('AFAS Response Status:', afasResponse.status);
    console.log('AFAS Response Body:', responseText);

    if (afasResponse.ok) {
      // Success - update period with posting info
      const { error: updateError } = await supabase
        .from('periods')
        .update({
          afas_posted_at: new Date().toISOString(),
          afas_invoice_number: invoiceNumber,
          afas_post_error: null // Clear any previous error
        })
        .eq('id', period_id);

      if (updateError) {
        console.error('Failed to update period after successful AFAS post:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Successfully posted to AFAS',
          invoice_number: invoiceNumber,
          amount: totalAmount,
          afas_status: afasResponse.status,
          afas_response: responseText || 'Entry created'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Failed - flag for retry
      const { error: updateError } = await supabase
        .from('periods')
        .update({
          afas_post_error: `AFAS Error ${afasResponse.status}: ${responseText}`
        })
        .eq('id', period_id);

      if (updateError) {
        console.error('Failed to update period with error:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'AFAS posting failed',
          afas_status: afasResponse.status,
          afas_error: responseText,
          payload_sent: afasPayload
        }),
        { status: afasResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in post-period-to-afas:', errMessage);
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
