import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loan, LoanEvent, Period, LoanFacility, EventType, EventStatus } from '@/types/loan';
import { useToast } from '@/hooks/use-toast';
import type { Database, Json } from '@/integrations/supabase/types';
import { startOfMonth, endOfMonth, addMonths, format, parseISO, isBefore, isAfter } from 'date-fns';
import { calculateInterestSegments, calculateCommitmentFeeSegments } from '@/lib/loanCalculations';

type DbEventType = Database['public']['Enums']['event_type'];
type DbEventStatus = Database['public']['Enums']['event_status'];

function generateMonthlyPeriods(
  loanId: string,
  startDate: string,
  maturityDate?: string | null
): Database['public']['Tables']['periods']['Insert'][] {
  const periods: Database['public']['Tables']['periods']['Insert'][] = [];
  const start = parseISO(startDate);
  const today = new Date();
  const maturity = maturityDate ? parseISO(maturityDate) : null;
  const endOfCurrentMonth = endOfMonth(today);
  const effectiveEnd = maturity && isBefore(maturity, endOfCurrentMonth) ? maturity : endOfCurrentMonth;
  let currentMonthStart = startOfMonth(start);
  while (isBefore(currentMonthStart, effectiveEnd) || format(currentMonthStart, 'yyyy-MM') === format(effectiveEnd, 'yyyy-MM')) {
    const monthEnd = endOfMonth(currentMonthStart);
    const periodStart = periods.length === 0 && isAfter(start, currentMonthStart)
      ? format(start, 'yyyy-MM-dd')
      : format(currentMonthStart, 'yyyy-MM-dd');
    const periodEnd = maturityDate && isBefore(parseISO(maturityDate), monthEnd)
      ? maturityDate
      : format(monthEnd, 'yyyy-MM-dd');
    periods.push({ loan_id: loanId, period_start: periodStart, period_end: periodEnd, status: 'open', processing_mode: 'auto' });
    currentMonthStart = addMonths(currentMonthStart, 1);
    if (periods.length >= 120) break;
  }
  return periods;
}

export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('loans').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Loan[];
    },
  });
}

/**
 * Returns the current open period's interest and commitment fee per loan,
 * computed from events using the same 30E/360 segment logic as the Accruals tab.
 * This guarantees values match exactly what is shown in the Accruals tab.
 */
export function useLatestChargesPerLoan() {
  return useQuery({
    queryKey: ['latest-charges-per-loan'],
    queryFn: async () => {
      // 1. Get the latest open period per loan
      const { data: openPeriods, error: periodsError } = await supabase
        .from('periods')
        .select('id, loan_id, period_start, period_end')
        .eq('status', 'open')
        .order('period_start', { ascending: false });
      if (periodsError) throw periodsError;

      const latestPeriodByLoan: Record<string, { id: string; period_start: string; period_end: string }> = {};
      for (const p of openPeriods || []) {
        if (!(p.loan_id in latestPeriodByLoan)) {
          latestPeriodByLoan[p.loan_id] = { id: p.id, period_start: p.period_start, period_end: p.period_end };
        }
      }

      const loanIds = Object.keys(latestPeriodByLoan);
      if (loanIds.length === 0) return {} as Record<string, { interest: number; commitmentFee: number }>;

      // 2. Fetch all approved events + loan metadata in parallel
      const [{ data: eventsData, error: eventsError }, { data: loansData, error: loansError }] = await Promise.all([
        supabase
          .from('loan_events')
          .select('id, loan_id, event_type, effective_date, amount, rate, metadata, status')
          .in('loan_id', loanIds)
          .eq('status', 'approved')
          .order('effective_date', { ascending: true }),
        supabase
          .from('loans')
          .select('id, total_commitment, commitment_fee_rate, interest_type')
          .in('id', loanIds),
      ]);
      if (eventsError) throw eventsError;
      if (loansError) throw loansError;

      // Group events by loan
      const eventsByLoan: Record<string, LoanEvent[]> = {};
      for (const e of eventsData || []) {
        if (!eventsByLoan[e.loan_id]) eventsByLoan[e.loan_id] = [];
        eventsByLoan[e.loan_id].push(e as LoanEvent);
      }

      const loanMeta: Record<string, { totalCommitment: number; feeRate: number; interestType: string }> = {};
      for (const l of loansData || []) {
        loanMeta[l.id] = {
          totalCommitment: l.total_commitment || 0,
          feeRate: l.commitment_fee_rate || 0,
          interestType: l.interest_type || 'cash_pay',
        };
      }

      // 3. For each loan compute using the same 30E/360 segment logic as the Accruals tab
      const result: Record<string, { interest: number; commitmentFee: number }> = {};

      for (const loanId of loanIds) {
        const period = latestPeriodByLoan[loanId];
        const events = eventsByLoan[loanId] || [];
        const meta = loanMeta[loanId] || { totalCommitment: 0, feeRate: 0, interestType: 'cash_pay' };

        const interestSegments = calculateInterestSegments(
          events,
          period.period_start,
          period.period_end,
          meta.totalCommitment,
          meta.interestType as 'cash_pay' | 'pik'
        );
        const interestAccrued = interestSegments.reduce((sum, s) => sum + s.interest, 0);

        const cfSegments = calculateCommitmentFeeSegments(
          events,
          period.period_start,
          period.period_end,
          meta.feeRate,
          meta.totalCommitment
        );
        const commitmentFeeAccrued = cfSegments.reduce((sum, s) => sum + s.fee, 0);

        result[loanId] = { interest: interestAccrued, commitmentFee: commitmentFeeAccrued };
      }

      return result;
    },
  });
}

export function useLoan(id: string | undefined) {
  return useQuery({
    queryKey: ['loans', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('loans').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as Loan | null;
    },
    enabled: !!id,
  });
}

export function useLoanEvents(loanId: string | undefined) {
  return useQuery({
    queryKey: ['loan-events', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase
        .from('loan_events')
        .select('*')
        .eq('loan_id', loanId)
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return data as LoanEvent[];
    },
    enabled: !!loanId,
  });
}

export function useLoanPeriods(loanId: string | undefined) {
  return useQuery({
    queryKey: ['loan-periods', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('loan_id', loanId)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data as Period[];
    },
    enabled: !!loanId,
  });
}

export function useLoanFacilities(loanId: string | undefined) {
  return useQuery({
    queryKey: ['loan-facilities', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase
        .from('loan_facilities')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LoanFacility[];
    },
    enabled: !!loanId,
  });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      loan_id: string;
      borrower_name: string;
      payment_due_rule?: string | null;
      loan_start_date?: string | null;
      maturity_date?: string | null;
      interest_rate?: number | null;
      interest_type?: string;
      fee_payment_type?: string;
      interest_payment_type?: string;
      outstanding?: number | null;
      total_commitment?: number | null;
      commitment_fee_rate?: number | null;
      commitment_fee_basis?: string | null;
      notice_frequency?: string;
      vehicle?: string;
      facility?: string | null;
      arrangement_fee?: number | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      const userId = user.user.id;
      const { arrangement_fee, ...loanData } = data;
      const { data: loan, error } = await supabase.from('loans').insert([loanData]).select().single();
      if (error) throw error;
      const createdLoan = loan as Loan;
      const effectiveDate = loanData.loan_start_date || new Date().toISOString().split('T')[0];
      const isFeeCapitalized = loanData.fee_payment_type === 'pik';

      const createFoundingEvent = async (
        eventType: DbEventType,
        amount: number | null,
        rate: number | null,
        metadata: Record<string, unknown>
      ) => {
        const { error } = await supabase.rpc('create_founding_event', {
          p_loan_id: createdLoan.id,
          p_event_type: eventType,
          p_effective_date: effectiveDate,
          p_amount: amount,
          p_rate: rate,
          p_created_by: userId,
          p_metadata: metadata as unknown as Json,
        });
        if (error) throw error;
      };

      if (loanData.total_commitment && loanData.total_commitment > 0)
        await createFoundingEvent('commitment_set', loanData.total_commitment, null, { auto_generated: true, description: 'Initial commitment' });
      if (loanData.interest_rate && loanData.interest_rate > 0)
        await createFoundingEvent('interest_rate_set', null, loanData.interest_rate, { auto_generated: true, description: 'Initial rate' });
      if (loanData.outstanding && loanData.outstanding > 0)
        await createFoundingEvent('principal_draw', loanData.outstanding, null, { auto_generated: true, description: 'Opening principal draw' });
      if (arrangement_fee && arrangement_fee > 0)
        await createFoundingEvent('fee_invoice', arrangement_fee, null, {
          auto_generated: true, fee_type: 'arrangement',
          payment_type: isFeeCapitalized ? 'pik' : 'cash',
          description: isFeeCapitalized ? 'Arrangement fee (capitalised)' : 'Arrangement fee (withheld from borrower)',
        });

      if (loanData.loan_start_date) {
        const monthlyPeriods = generateMonthlyPeriods(createdLoan.id, loanData.loan_start_date, loanData.maturity_date);
        if (monthlyPeriods.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: periodsError } = await supabase.from('periods').insert(monthlyPeriods as any);
          if (periodsError) console.error('Failed to create periods:', periodsError);
        }
      }
      return createdLoan;
    },
    onSuccess: (loan) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-periods', loan.id] });
      toast({ title: 'Loan created with founding events and periods' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create loan', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateLoanEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      loan_id: string;
      facility_id: string | null;
      event_type: EventType;
      effective_date: string;
      value_date: string | null;
      amount: number | null;
      rate: number | null;
      metadata: Record<string, unknown>;
      status: EventStatus;
      created_by: string;
    }) => {
      const payload = {
        loan_id: data.loan_id,
        facility_id: data.facility_id,
        event_type: data.event_type as DbEventType,
        effective_date: data.effective_date,
        value_date: data.value_date,
        amount: data.amount,
        rate: data.rate,
        metadata: data.metadata as unknown as Database['public']['Tables']['loan_events']['Insert']['metadata'],
        status: data.status as DbEventStatus,
        created_by: data.created_by,
      };
      const { data: event, error } = await supabase.from('loan_events').insert([payload]).select().single();
      if (error) throw error;
      return event as LoanEvent;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-events', variables.loan_id] });
      toast({ title: 'Event created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create event', description: error.message, variant: 'destructive' });
    },
  });
}

export function useApproveEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ eventId, loanId }: { eventId: string; loanId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('loan_events')
        .update({ status: 'approved', approved_by: user.user.id, approved_at: new Date().toISOString() })
        .eq('id', eventId);
      if (error) throw error;

      const { data: events, error: eventsError } = await supabase
        .from('loan_events')
        .select('*')
        .eq('loan_id', loanId)
        .eq('status', 'approved')
        .order('effective_date', { ascending: true });
      if (eventsError) throw eventsError;

      let outstanding = 0;
      for (const event of events || []) {
        if (event.event_type === 'principal_draw') outstanding += event.amount || 0;
        else if (event.event_type === 'principal_repayment') outstanding = Math.max(0, outstanding - (event.amount || 0));
        else if (event.event_type === 'pik_capitalization_posted') outstanding += event.amount || 0;
        else if (event.event_type === 'fee_invoice') {
          const meta = event.metadata as Record<string, unknown>;
          if (meta?.payment_type === 'pik') outstanding += event.amount || 0;
        }
      }

      const { error: updateError } = await supabase
        .from('loans')
        .update({ outstanding, updated_at: new Date().toISOString() })
        .eq('id', loanId);
      if (updateError) throw updateError;

      return { eventId, loanId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-events', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast({ title: 'Event approved successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to approve event', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateInterestChargeEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      loan_id: string;
      period_id: string;
      period_start: string;
      period_end: string;
      interest_accrued: number;
      commitment_fee_accrued: number;
      opening_principal: number;
      closing_principal: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const totalCharge = data.interest_accrued + data.commitment_fee_accrued;

      const { data: existing } = await supabase
        .from('loan_events')
        .select('id')
        .eq('loan_id', data.loan_id)
        .eq('event_type', 'pik_capitalization_posted')
        .contains('metadata', { period_id: data.period_id })
        .maybeSingle();

      if (existing) throw new Error('Interest charge event already exists for this period');

      const chargePayload = {
        loan_id: data.loan_id,
        event_type: 'pik_capitalization_posted' as DbEventType,
        effective_date: data.period_end,
        amount: totalCharge,
        rate: null,
        status: 'draft' as DbEventStatus,
        created_by: user.user.id,
        requires_approval: true,
        metadata: {
          period_id: data.period_id,
          period_start: data.period_start,
          period_end: data.period_end,
          interest_accrued: data.interest_accrued,
          commitment_fee_accrued: data.commitment_fee_accrued,
          opening_principal: data.opening_principal,
          closing_principal: data.closing_principal,
          day_count_convention: '30/360',
        } as unknown as Database['public']['Tables']['loan_events']['Insert']['metadata'],
      };

      const { data: event, error } = await supabase.from('loan_events').insert([chargePayload]).select().single();
      if (error) throw error;
      return event as LoanEvent;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-events', variables.loan_id] });
      toast({ title: 'Interest charge created for approval' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create interest charge', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLoan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (loanId: string) => {
      const { error } = await supabase.rpc('admin_delete_loan', { p_loan_id: loanId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast({ title: 'Loan deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete loan', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLoan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Loan> }) => {
      const { data, error } = await supabase
        .from('loans')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Loan;
    },
    onSuccess: (loan) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans', loan.id] });
      toast({ title: 'Loan updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update loan', description: error.message, variant: 'destructive' });
    },
  });
}
