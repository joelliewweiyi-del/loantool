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

// Calculate daily interest (ACT/365)
function calculateDailyInterest(principal: number, annualRate: number): number {
  return (principal * annualRate) / 365;
}

// Calculate daily commitment fee
function calculateDailyCommitmentFee(undrawnAmount: number, annualFeeRate: number): number {
  return (undrawnAmount * annualFeeRate) / 365;
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

    // Parse request body for optional date override
    let processingDate = new Date().toISOString().split('T')[0];
    try {
      const body = await req.json();
      if (body?.date) {
        processingDate = body.date;
      }
    } catch {
      // No body or invalid JSON, use today's date
    }

    console.log(`Processing accruals for date: ${processingDate}`);

    // Create processing job record
    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        job_type: 'daily_accrual',
        status: 'running',
        started_at: new Date().toISOString(),
        metadata: { processing_date: processingDate }
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
    const errors: Array<{ loan_id: string; error: string }> = [];

    // Process each loan
    for (const loan of (loans as Loan[]) || []) {
      try {
        // Check if accrual already exists for this date
        const { data: existingAccrual } = await supabase
          .from('accrual_entries')
          .select('id')
          .eq('loan_id', loan.id)
          .eq('accrual_date', processingDate)
          .single();

        if (existingAccrual) {
          console.log(`Accrual already exists for loan ${loan.id} on ${processingDate}, skipping`);
          continue;
        }

        // Fetch events for this loan
        const { data: events, error: eventsError } = await supabase
          .from('loan_events')
          .select('*')
          .eq('loan_id', loan.id)
          .eq('status', 'approved');

        if (eventsError) {
          throw eventsError;
        }

        // Find the period this date belongs to
        const { data: period } = await supabase
          .from('periods')
          .select('id')
          .eq('loan_id', loan.id)
          .lte('period_start', processingDate)
          .gte('period_end', processingDate)
          .single();

        // Get loan state at this date
        const initialCommitment = loan.total_commitment || 0;
        const state = getLoanStateAtDate(events as LoanEvent[], processingDate, initialCommitment);
        
        // Calculate daily accruals
        const dailyInterest = calculateDailyInterest(state.outstandingPrincipal, state.currentRate);
        const commitmentFeeRate = loan.commitment_fee_rate || 0;
        const dailyCommitmentFee = calculateDailyCommitmentFee(state.undrawnCommitment, commitmentFeeRate);

        // Insert accrual entry
        const { error: insertError } = await supabase
          .from('accrual_entries')
          .insert({
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

        if (insertError) {
          throw insertError;
        }

        processedCount++;
        console.log(`Processed accrual for loan ${loan.id}: interest=${dailyInterest.toFixed(2)}, fee=${dailyCommitmentFee.toFixed(2)}`);

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
        status: errorCount > 0 ? 'completed' : 'completed',
        completed_at: new Date().toISOString(),
        processed_count: processedCount,
        error_count: errorCount,
        error_details: errors.length > 0 ? errors : null,
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('Failed to update job record:', updateError);
    }

    console.log(`Daily accrual processing complete. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        processing_date: processingDate,
        processed_count: processedCount,
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
