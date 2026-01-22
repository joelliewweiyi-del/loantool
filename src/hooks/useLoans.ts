import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loan, LoanEvent, Period, LoanFacility, EventType, EventStatus } from '@/types/loan';
import { useToast } from '@/hooks/use-toast';
import type { Database, Json } from '@/integrations/supabase/types';
import { startOfMonth, endOfMonth, addMonths, format, parseISO, isBefore, isAfter } from 'date-fns';

type DbEventType = Database['public']['Enums']['event_type'];

// Generate monthly periods from start date to end date (or today if no maturity)
function generateMonthlyPeriods(
  loanId: string,
  startDate: string,
  endDate?: string | null
): Database['public']['Tables']['periods']['Insert'][] {
  const periods: Database['public']['Tables']['periods']['Insert'][] = [];
  
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : new Date(); // Default to today if no maturity
  
  // Start from the first day of the start month
  let currentMonthStart = startOfMonth(start);
  
  while (isBefore(currentMonthStart, end) || format(currentMonthStart, 'yyyy-MM') === format(end, 'yyyy-MM')) {
    const monthEnd = endOfMonth(currentMonthStart);
    
    // Period start: use actual loan start date for first period, otherwise 1st of month
    const periodStart = periods.length === 0 && isAfter(start, currentMonthStart)
      ? format(start, 'yyyy-MM-dd')
      : format(currentMonthStart, 'yyyy-MM-dd');
    
    // Period end: use maturity date if it falls within this month, otherwise end of month
    const periodEnd = endDate && isBefore(parseISO(endDate), monthEnd)
      ? endDate
      : format(monthEnd, 'yyyy-MM-dd');
    
    periods.push({
      loan_id: loanId,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'open',
      processing_mode: 'auto',
    });
    
    // Move to next month
    currentMonthStart = addMonths(currentMonthStart, 1);
    
    // Safety: don't generate more than 120 months (10 years)
    if (periods.length >= 120) break;
  }
  
  return periods;
}
type DbEventStatus = Database['public']['Enums']['event_status'];

export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Loan[];
    },
  });
}

export function useLoan(id: string | undefined) {
  return useQuery({
    queryKey: ['loans', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
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
      loan_type?: string;
      outstanding?: number | null;
      total_commitment?: number | null;
      commitment_fee_rate?: number | null;
      commitment_fee_basis?: string | null;
      notice_frequency?: string;
      vehicle?: string;
      facility?: string | null;
      arrangement_fee?: number | null;
    }) => {
      // Get current user for created_by
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      const userId = user.user.id;

      // Extract arrangement_fee before creating loan (it's not a loans table field)
      const { arrangement_fee, ...loanData } = data;

      // Create the loan
      const { data: loan, error } = await supabase
        .from('loans')
        .insert([loanData])
        .select()
        .single();
      
      if (error) throw error;
      const createdLoan = loan as Loan;

      // Auto-generate founding events based on loan creation data
      const effectiveDate = loanData.loan_start_date || new Date().toISOString().split('T')[0];
      const isPikLoan = loanData.interest_type === 'pik';

      // Use the create_founding_event RPC function to bypass RLS for approved founding events
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

      // 1. Commitment Set (if total_commitment provided)
      if (loanData.total_commitment && loanData.total_commitment > 0) {
        await createFoundingEvent(
          'commitment_set',
          loanData.total_commitment,
          null,
          { auto_generated: true, description: 'Initial commitment' }
        );
      }

      // 2. Interest Rate Set (if interest_rate provided)
      if (loanData.interest_rate && loanData.interest_rate > 0) {
        await createFoundingEvent(
          'interest_rate_set',
          null,
          loanData.interest_rate,
          { auto_generated: true, description: 'Initial rate' }
        );
      }

      // 3. Principal Draw (if outstanding provided)
      if (loanData.outstanding && loanData.outstanding > 0) {
        await createFoundingEvent(
          'principal_draw',
          loanData.outstanding,
          null,
          { auto_generated: true, description: 'Opening principal draw' }
        );
      }

      // 4. Arrangement Fee (if provided)
      if (arrangement_fee && arrangement_fee > 0) {
        await createFoundingEvent(
          'fee_invoice',
          arrangement_fee,
          null,
          { 
            auto_generated: true, 
            fee_type: 'arrangement',
            payment_type: isPikLoan ? 'pik' : 'cash',
            description: isPikLoan ? 'Arrangement fee (capitalised)' : 'Arrangement fee (withheld from borrower)'
          }
        );
      }

      // Auto-generate monthly periods from loan start to maturity (or today)
      if (loanData.loan_start_date) {
        const monthlyPeriods = generateMonthlyPeriods(
          createdLoan.id,
          loanData.loan_start_date,
          loanData.maturity_date
        );

        if (monthlyPeriods.length > 0) {
          console.log(`Creating ${monthlyPeriods.length} monthly periods for loan`);
          const { error: periodsError } = await supabase
            .from('periods')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert(monthlyPeriods as any);
          
          if (periodsError) {
            console.error('Failed to create periods:', periodsError);
            // Don't throw - loan and events were created, periods are less critical
          }
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
      toast({ 
        title: 'Failed to create loan', 
        description: error.message,
        variant: 'destructive' 
      });
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
      const { data: event, error } = await supabase
        .from('loan_events')
        .insert([{
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
        }])
        .select()
        .single();
      
      if (error) throw error;
      return event as LoanEvent;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-events', variables.loan_id] });
      toast({ title: 'Event created successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to create event', 
        description: error.message,
        variant: 'destructive' 
      });
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

      // Approve the event
      const { error } = await supabase
        .from('loan_events')
        .update({ 
          status: 'approved',
          approved_by: user.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', eventId);
      
      if (error) throw error;

      // Recalculate and update the loan's outstanding balance
      // Fetch all approved events for this loan (including the newly approved one)
      const { data: events, error: eventsError } = await supabase
        .from('loan_events')
        .select('*')
        .eq('loan_id', loanId)
        .eq('status', 'approved')
        .order('effective_date', { ascending: true });

      if (eventsError) throw eventsError;

      // Calculate new outstanding balance by replaying events
      let outstanding = 0;
      for (const event of events || []) {
        switch (event.event_type) {
          case 'principal_draw':
            outstanding += event.amount || 0;
            break;
          case 'principal_repayment':
            outstanding -= event.amount || 0;
            outstanding = Math.max(0, outstanding);
            break;
          case 'pik_capitalization_posted':
            outstanding += event.amount || 0;
            break;
          case 'fee_invoice':
            // PIK fees are capitalized
            const meta = event.metadata as Record<string, unknown>;
            if (meta?.payment_type === 'pik') {
              outstanding += event.amount || 0;
            }
            break;
        }
      }

      // Update the loan's outstanding balance
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
      toast({ 
        title: 'Failed to approve event', 
        description: error.message,
        variant: 'destructive' 
      });
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
      
      // Check if an interest charge event already exists for this period
      const { data: existing } = await supabase
        .from('loan_events')
        .select('id')
        .eq('loan_id', data.loan_id)
        .eq('event_type', 'pik_capitalization_posted')
        .contains('metadata', { period_id: data.period_id })
        .maybeSingle();

      if (existing) {
        throw new Error('Interest charge event already exists for this period');
      }

      const { data: event, error } = await supabase
        .from('loan_events')
        .insert([{
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
        }])
        .select()
        .single();
      
      if (error) throw error;
      return event as LoanEvent;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-events', variables.loan_id] });
      toast({ title: 'Interest charge created for approval' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to create interest charge', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useDeleteLoan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (loanId: string) => {
      // Use the admin RPC function that bypasses triggers
      const { error } = await supabase.rpc('admin_delete_loan', {
        p_loan_id: loanId
      });
      
      if (error) throw error;
      return loanId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast({ title: 'Loan deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete loan', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUpdateLoan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      borrower_name?: string;
      loan_start_date?: string | null;
      maturity_date?: string | null;
      interest_rate?: number | null;
      interest_type?: string;
      total_commitment?: number | null;
      commitment_fee_rate?: number | null;
      commitment_fee_basis?: string;
      notice_frequency?: string;
      payment_due_rule?: string | null;
      vehicle?: string;
      facility?: string | null;
      city?: string | null;
      category?: string | null;
      remarks?: string | null;
    }) => {
      const { id, ...updates } = data;
      
      const { data: updatedLoan, error } = await supabase
        .from('loans')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updatedLoan as Loan;
    },
    onSuccess: (loan) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans', loan.id] });
      toast({ title: 'Loan updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update loan', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}
