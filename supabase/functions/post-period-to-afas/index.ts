import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostingRequest {
  period_id: string;
  dry_run?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const afasToken = Deno.env.get('AFAS_TOKEN');
    const afasEnvId = Deno.env.get('AFAS_ENVIRONMENT_ID');
    const adminCode = Deno.env.get('AFAS_ADMINISTRATIE_CODE') || '05';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!afasToken || !afasEnvId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing AFAS credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          loan_name,
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

    // Generate invoice number
    const invoiceNumber = `INT-${loan.loan_id}-${period.period_end}`;
    
    // Build description
    const description = `Interest ${period.period_start} - ${period.period_end} | ${loan.loan_name}`;

    // AFAS FiEntries payload - single line for total
    const afasPayload = {
      FiEntries: {
        Element: {
          Fields: {
            AdCd: adminCode,
            JoCd: "70", // Sales journal - adjust as needed
            DaJo: period.period_end, // Journal date = period end
            DaDu: new Date(new Date(period.period_end).getTime() + 30 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0], // Due date = 30 days later
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
                  AcId: "9350", // Interest income GL account - TODO: make configurable
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
          period: {
            id: period.id,
            period_start: period.period_start,
            period_end: period.period_end,
            status: period.status
          },
          loan: {
            id: loan.id,
            name: loan.loan_name,
            external_loan_id: loan.external_loan_id
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
    const baseUrl = `https://${afasEnvId}.rest.afas.online/profitrestservices`;
    const updateUrl = `${baseUrl}/connectors/FiEntries`;

    console.log('Posting to AFAS:', updateUrl);
    console.log('Payload:', JSON.stringify(afasPayload, null, 2));

    const afasResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `AfasToken ${btoa(afasToken)}`,
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
