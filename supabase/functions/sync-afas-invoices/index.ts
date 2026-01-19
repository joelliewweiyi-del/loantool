import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// GL Code mapping for AFAS invoice types
const GL_CODES = {
  RENTE_REGULIER: '9350',      // Regular interest
  RENTE_COMMITMENT: '9351',    // Commitment fees
  EXIT_FEE: '9352',            // Exit fees
  LATE_PAYMENT: '9353',        // Late payment penalties
  ARRANGEMENT_FEE: '8170',     // Arrangement fees (afsluitprovisie)
  PRINCIPAL: '1750',           // Loans principal
  COMMITMENT: '1751',          // Loans commitment
};

interface AfasInvoice {
  InvoiceNr: string;
  DebtorId: string;
  InvoiceDate: string;
  DueDate?: string;
  Amount: number;
  OpenAmount?: number;
  Description?: string;
  GlAccount?: string;          // Grootboekrekening
  [key: string]: unknown;
}

interface ParsedInvoiceInfo {
  loanNumber: string | null;
  periodMonth: string | null;
  periodYear: string | null;
}

// Parse Description to extract loan number and period
// Format examples from AFAS: "458 - Rente P12 2025", "484 - Rente P11 2025"
function parseAfasDescription(description: string): ParsedInvoiceInfo {
  const result: ParsedInvoiceInfo = {
    loanNumber: null,
    periodMonth: null,
    periodYear: null,
  };

  if (!description) return result;

  // Pattern: "458 - Rente P12 2025" or "484 - Rente P11 2025"
  // Loan number is at the start before " - "
  const loanMatch = description.match(/^(\d+)\s*-/);
  if (loanMatch) {
    result.loanNumber = loanMatch[1];
  }

  // Period pattern: P12, P11, P01 etc.
  const periodMatch = description.match(/[Pp](\d{1,2})\s*(\d{4})/);
  if (periodMatch) {
    result.periodMonth = periodMatch[1].padStart(2, '0');
    result.periodYear = periodMatch[2];
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let syncRunId: string | null = null;

  try {
    const afasToken = Deno.env.get('AFAS_TOKEN');
    const afasEnvId = Deno.env.get('AFAS_ENVIRONMENT_ID');

    if (!afasToken || !afasEnvId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing AFAS credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create sync run record
    const { data: syncRun, error: syncRunError } = await supabase
      .from('afas_sync_runs')
      .insert({ sync_type: 'debtor_invoices', status: 'running' })
      .select()
      .single();

    if (syncRunError) {
      console.error('Failed to create sync run:', syncRunError);
    } else {
      syncRunId = syncRun.id;
    }

    // Fetch all loans to build lookup map
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('id, external_loan_id, borrower_name');

    if (loansError) {
      throw new Error(`Failed to fetch loans: ${loansError.message}`);
    }

    // Build loan lookup by external_loan_id
    const loanMap = new Map<string, { id: string; borrower_name: string }>();
    for (const loan of loans || []) {
      if (loan.external_loan_id) {
        loanMap.set(loan.external_loan_id, { id: loan.id, borrower_name: loan.borrower_name });
      }
    }

    // Fetch periods for matching
    const { data: periods, error: periodsError } = await supabase
      .from('periods')
      .select('id, loan_id, period_start, period_end');

    if (periodsError) {
      throw new Error(`Failed to fetch periods: ${periodsError.message}`);
    }

    // Build period lookup by loan_id + month
    const periodMap = new Map<string, string>();
    for (const period of periods || []) {
      // Key: loanId + YYYY-MM
      const yearMonth = period.period_start.substring(0, 7);
      const key = `${period.loan_id}-${yearMonth}`;
      periodMap.set(key, period.id);
    }

    // Fetch AFAS debtor invoices
    const baseUrl = `https://${afasEnvId}.rest.afas.online/profitrestservices`;
    const connectorName = 'Profit_Debtor_Invoices';
    
    console.log('Fetching invoices from AFAS...');
    
    const response = await fetch(`${baseUrl}/connectors/${connectorName}`, {
      method: 'GET',
      headers: {
        'Authorization': `AfasToken ${btoa(afasToken)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AFAS API error: ${response.status} - ${errorText}`);
    }

    const afasData = await response.json();
    const invoices: AfasInvoice[] = afasData.rows || [];
    
    console.log(`Fetched ${invoices.length} invoices from AFAS`);

    let matched = 0;
    let unmatched = 0;
    const syncResults: Array<{
      invoice_nr: string;
      status: string;
      loan_id?: string;
      period_id?: string;
    }> = [];

    // Process each invoice
    for (const invoice of invoices) {
      const invoiceNr = invoice.InvoiceNr?.toString() || '';
      const description = invoice.Description?.toString() || '';
      const glAccount = invoice.GlAccount?.toString() || '';
      
      // Only process interest invoices (GL code 9350 = Rente regulier)
      if (glAccount !== GL_CODES.RENTE_REGULIER) {
        continue;
      }
      
      // Parse Description to extract loan and period
      const parsed = parseAfasDescription(description);

      let loanId: string | null = null;
      let periodId: string | null = null;
      let matchStatus = 'unmatched';
      let matchNotes = '';

      // Try to match loan
      if (parsed.loanNumber) {
        const loanInfo = loanMap.get(parsed.loanNumber);
        if (loanInfo) {
          loanId = loanInfo.id;
          matchStatus = 'matched';

          // Try to match period using year from description (more reliable than invoice date)
          if (parsed.periodMonth && parsed.periodYear) {
            const periodKey = `${loanId}-${parsed.periodYear}-${parsed.periodMonth}`;
            const foundPeriodId = periodMap.get(periodKey);
            if (foundPeriodId) {
              periodId = foundPeriodId;
            } else {
              matchNotes = `Period not found for ${parsed.periodYear}-${parsed.periodMonth}`;
            }
          }
        } else {
          matchNotes = `Loan not found for external_loan_id: ${parsed.loanNumber}`;
        }
      } else {
        matchNotes = 'Could not parse loan number from invoice';
      }

      // Calculate TMO expected amount if we have a period
      let tmoExpectedAmount: number | null = null;
      if (periodId) {
        // Sum daily interest from accrual_entries for this period
        const { data: accruals } = await supabase
          .from('accrual_entries')
          .select('daily_interest')
          .eq('period_id', periodId);
        
        if (accruals && accruals.length > 0) {
          tmoExpectedAmount = accruals.reduce((sum, a) => sum + (a.daily_interest || 0), 0);
        }
      }

      // Upsert invoice sync record
      const { error: upsertError } = await supabase
        .from('afas_invoice_sync')
        .upsert({
          afas_invoice_nr: invoiceNr,
          afas_debtor_id: invoice.DebtorId?.toString(),
          afas_invoice_date: invoice.InvoiceDate,
          afas_due_date: invoice.DueDate,
          afas_amount: invoice.Amount || 0,
          afas_open_amount: invoice.OpenAmount,
          afas_description: description,
          afas_raw_data: invoice,
          loan_id: loanId,
          period_id: periodId,
          parsed_loan_number: parsed.loanNumber,
          parsed_period_month: parsed.periodMonth,
          match_status: matchStatus,
          match_notes: matchNotes,
          tmo_expected_amount: tmoExpectedAmount,
          is_paid: (invoice.OpenAmount || 0) === 0,
          last_updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'afas_invoice_nr',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error(`Failed to upsert invoice ${invoiceNr}:`, upsertError);
      }

      if (matchStatus === 'matched') {
        matched++;
      } else {
        unmatched++;
      }

      syncResults.push({
        invoice_nr: invoiceNr,
        status: matchStatus,
        loan_id: loanId || undefined,
        period_id: periodId || undefined,
      });
    }

    // Update sync run with results
    if (syncRunId) {
      await supabase
        .from('afas_sync_runs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          invoices_fetched: invoices.length,
          invoices_matched: matched,
          invoices_unmatched: unmatched,
          metadata: { interest_invoices_processed: syncResults.length }
        })
        .eq('id', syncRunId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sync_run_id: syncRunId,
        total_fetched: invoices.length,
        interest_invoices_processed: syncResults.length,
        matched,
        unmatched,
        results: syncResults.slice(0, 20), // Return first 20 for preview
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Sync error:', errMessage);

    // Update sync run with error
    if (syncRunId) {
      await supabase
        .from('afas_sync_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: errMessage,
        })
        .eq('id', syncRunId);
    }

    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
