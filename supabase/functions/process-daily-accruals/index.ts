import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoanEvent {
  id: string;
  loan_id: string;
  event_type: string;
  effective_date: string;
  amount: number | null;
  rate: number | null;
  status: string;
  metadata: Record<string, unknown>;
}

interface LoanState {
  outstandingPrincipal: number;
  currentRate: number;
  totalCommitment: number;
  undrawnCommitment: number;
  interestType: string;
}

interface Loan {
  id: string;
  borrower_name: string;
  status: string;
  interest_type: string;
  total_commitment: number | null;
  commitment_fee_rate: number | null;
  loan_start_date: string | null;
}

// Apply event to state
function applyEventToState(state: LoanState, event: LoanEvent): LoanState {
  const newState = { ...state };
  
  switch (event.event_type) {
    case 'principal_draw':
      newState.outstandingPrincipal += event.amount || 0;
      newState.undrawnCommitment = Math.max(0, newState.totalCommitment - newState.outstandingPrincipal);
      break;
    case 'principal_repayment':
      newState.outstandingPrincipal -= event.amount || 0;
      newState.outstandingPrincipal = Math.max(0, newState.outstandingPrincipal);
      newState.undrawnCommitment = Math.max(0, newState.totalCommitment - newState.outstandingPrincipal);
      break;
    case 'interest_rate_set':
    case 'interest_rate_change':
      newState.currentRate = event.rate || 0;
      break;
    case 'pik_flag_set':
      newState.interestType = (event.metadata?.interest_type as string) || 'cash_pay';
      break;
    case 'commitment_set':
      newState.totalCommitment = event.amount || 0;
      newState.undrawnCommitment = Math.max(0, newState.totalCommitment - newState.outstandingPrincipal);
      break;
    case 'commitment_change':
      newState.totalCommitment += event.amount || 0;
      newState.undrawnCommitment = Math.max(0, newState.totalCommitment - newState.outstandingPrincipal);
      break;
    case 'commitment_cancel':
      newState.totalCommitment -= event.amount || 0;
      newState.totalCommitment = Math.max(0, newState.totalCommitment);
      newState.undrawnCommitment = Math.max(0, newState.totalCommitment - newState.outstandingPrincipal);
      break;
    case 'pik_capitalization_posted':
      newState.outstandingPrincipal += event.amount || 0;
      break;
    case 'fee_invoice':
      // PIK fees add to principal (check payment_type, not fee_type)
      if (event.metadata?.payment_type === 'pik') {
        newState.outstandingPrincipal += event.amount || 0;
      }
      break;
  }
  
  return newState;
}

// Get loan state at a specific date
function getLoanStateAtDate(
  events: LoanEvent[],
  targetDate: string,
  initialCommitment: number
): LoanState {
  const sortedEvents = events
    .filter(e => e.status === 'approved')
    .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());
  
  const targetTime = new Date(targetDate).getTime();
  
  let state: LoanState = {
    outstandingPrincipal: 0,
    currentRate: 0,
    interestType: 'cash_pay',
    totalCommitment: initialCommitment,
    undrawnCommitment: initialCommitment,
  };
  
  for (const event of sortedEvents) {
    const eventTime = new Date(event.effective_date).getTime();
    if (eventTime > targetTime) break;
    state = applyEventToState(state, event);
  }
  
  return state;
}

// Calculate daily interest (30/360)
function calculateDailyInterest(principal: number, annualRate: number): number {
  return (principal * annualRate) / 360;
}

// Calculate daily commitment fee (30/360)
function calculateDailyCommitmentFee(undrawnAmount: number, annualFeeRate: number): number {
  return (undrawnAmount * annualFeeRate) / 360;
}

// Generate array of dates between start and end (inclusive)
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting daily accrual processing...');

    // Parse request body for optional date override or range
    let processingDates: string[] = [];
    let backfillMode = false;
    
    try {
      const body = await req.json();
      if (body?.backfill) {
        // Backfill mode: generate accruals for loans from their start date to end_date
        backfillMode = true;
        const endDate = body.end_date || new Date().toISOString().split('T')[0];
        console.log(`Backfill mode enabled, end date: ${endDate}`);
        
        // We'll handle this per-loan below
        processingDates = [endDate]; // Just store end date for now
      } else if (body?.start_date && body?.end_date) {
        // Date range mode
        processingDates = getDateRange(body.start_date, body.end_date);
        console.log(`Processing date range: ${body.start_date} to ${body.end_date} (${processingDates.length} days)`);
      } else if (body?.date) {
        processingDates = [body.date];
      } else {
        processingDates = [new Date().toISOString().split('T')[0]];
      }
    } catch {
      // No body or invalid JSON, use today's date
      processingDates = [new Date().toISOString().split('T')[0]];
    }

    // Create processing job record
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        job_type: 'daily_accrual',
        status: 'running',
        started_at: new Date().toISOString(),
        metadata: { 
          processing_dates: processingDates.length > 10 
            ? `${processingDates[0]} to ${processingDates[processingDates.length - 1]}` 
            : processingDates,
          backfill_mode: backfillMode
        }
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job record:', jobError);
      throw jobError;
    }

    console.log(`Created job: ${job.id}`);

    // Fetch all active loans
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*')
      .eq('status', 'active');

    if (loansError) {
      throw loansError;
    }

    console.log(`Found ${loans?.length || 0} active loans`);

    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: Array<{ loan_id: string; date?: string; error: string }> = [];

    // Process each loan
    for (const loan of (loans as Loan[]) || []) {
      try {
        // Fetch events for this loan once
        const { data: events, error: eventsError } = await supabase
          .from('loan_events')
          .select('*')
          .eq('loan_id', loan.id)
          .eq('status', 'approved');

        if (eventsError) {
          throw eventsError;
        }

        // In backfill mode, determine the date range for this specific loan
        let loanDates = processingDates;
        if (backfillMode) {
          // Find the earliest event date for this loan
          const sortedEvents = (events as LoanEvent[]).sort(
            (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
          );
          const earliestEventDate = sortedEvents[0]?.effective_date;
          const loanStartDate = loan.loan_start_date;
          
          // Use the earlier of loan_start_date or first event date
          let startDate = earliestEventDate;
          if (loanStartDate && (!startDate || loanStartDate < startDate)) {
            startDate = loanStartDate;
          }
          
          if (!startDate) {
            console.log(`Loan ${loan.id} has no start date or events, skipping`);
            skippedCount++;
            continue;
          }
          
          const endDate = processingDates[0]; // end_date stored here
          loanDates = getDateRange(startDate, endDate);
          console.log(`Loan ${loan.id}: backfilling ${loanDates.length} days from ${startDate} to ${endDate}`);
        }

        // Fetch existing accruals for this loan to avoid duplicates
        const { data: existingAccruals } = await supabase
          .from('accrual_entries')
          .select('accrual_date')
          .eq('loan_id', loan.id);

        const existingDates = new Set((existingAccruals || []).map(a => a.accrual_date));

        // Fetch all periods for this loan
        const { data: periods } = await supabase
          .from('periods')
          .select('id, period_start, period_end')
          .eq('loan_id', loan.id);

        const initialCommitment = loan.total_commitment || 0;
        const commitmentFeeRate = loan.commitment_fee_rate || 0;

        // Process each date
        const accrualInserts: Array<{
          loan_id: string;
          period_id: string | null;
          accrual_date: string;
          principal_balance: number;
          interest_rate: number;
          daily_interest: number;
          commitment_balance: number;
          commitment_fee_rate: number;
          daily_commitment_fee: number;
          is_pik: boolean;
        }> = [];

        for (const processingDate of loanDates) {
          // Skip if accrual already exists
          if (existingDates.has(processingDate)) {
            skippedCount++;
            continue;
          }

          // Find the period this date belongs to
          const period = (periods || []).find(
            p => processingDate >= p.period_start && processingDate <= p.period_end
          );

          // Get loan state at this date
          const state = getLoanStateAtDate(events as LoanEvent[], processingDate, initialCommitment);
          
          // Calculate daily accruals
          const dailyInterest = calculateDailyInterest(state.outstandingPrincipal, state.currentRate);
          const dailyCommitmentFee = calculateDailyCommitmentFee(state.undrawnCommitment, commitmentFeeRate);

          accrualInserts.push({
            loan_id: loan.id,
            period_id: period?.id || null,
            accrual_date: processingDate,
            principal_balance: state.outstandingPrincipal,
            interest_rate: state.currentRate,
            daily_interest: dailyInterest,
            commitment_balance: state.undrawnCommitment,
            commitment_fee_rate: commitmentFeeRate,
            daily_commitment_fee: dailyCommitmentFee,
            is_pik: loan.interest_type === 'pik',
          });
        }

        // Batch insert accruals (in chunks of 500 to avoid hitting limits)
        const chunkSize = 500;
        for (let i = 0; i < accrualInserts.length; i += chunkSize) {
          const chunk = accrualInserts.slice(i, i + chunkSize);
          const { error: insertError } = await supabase
            .from('accrual_entries')
            .insert(chunk);

          if (insertError) {
            throw insertError;
          }
        }

        processedCount += accrualInserts.length;
        console.log(`Processed ${accrualInserts.length} accruals for loan ${loan.id} (${loan.borrower_name})`);

      } catch (loanError) {
        errorCount++;
        const errorMessage = loanError instanceof Error ? loanError.message : 'Unknown error';
        errors.push({ loan_id: loan.id, error: errorMessage });
        console.error(`Error processing loan ${loan.id}:`, errorMessage);
      }
    }

    // Update job status
    const { error: updateError } = await supabase
      .from('processing_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_count: processedCount,
        error_count: errorCount,
        error_details: errors.length > 0 ? errors : null,
        metadata: {
          processed_count: processedCount,
          skipped_count: skippedCount,
          error_count: errorCount,
          backfill_mode: backfillMode
        }
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('Failed to update job record:', updateError);
    }

    console.log(`Daily accrual processing complete. Processed: ${processedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        processed_count: processedCount,
        skipped_count: skippedCount,
        error_count: errorCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Daily accrual processing failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
