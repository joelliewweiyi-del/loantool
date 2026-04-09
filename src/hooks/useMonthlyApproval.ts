import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MonthlyApproval, Period } from '@/types/loan';

export interface PeriodWithLoan extends Period {
  loans?: {
    borrower_name: string;
    loan_id: string;
    payment_timing?: string;
  };
}

export interface MonthlyApprovalWithPeriods extends MonthlyApproval {
  periods: PeriodWithLoan[];
}

export function useMonthlyApprovalDetails(yearMonth: string | undefined) {
  return useQuery({
    queryKey: ['monthly-approval', yearMonth],
    queryFn: async () => {
      if (!yearMonth) return null;

      // Read-only: fetch existing approval record
      const { data: approval, error: approvalError } = await supabase
        .from('monthly_approvals')
        .select('*')
        .eq('year_month', yearMonth)
        .maybeSingle();

      if (approvalError) throw approvalError;

      // Get periods for this month
      const startOfMonth = `${yearMonth}-01`;
      const endOfMonth = new Date(parseInt(yearMonth.split('-')[0]), parseInt(yearMonth.split('-')[1]), 0)
        .toISOString().split('T')[0];
      // For in-advance loans, also show next month's period (payment due on 1st)
      const nextMonthEnd = new Date(parseInt(yearMonth.split('-')[0]), parseInt(yearMonth.split('-')[1]) + 1, 0)
        .toISOString().split('T')[0];

      const { data: periods, error: periodsError } = await supabase
        .from('periods')
        .select(`
          *,
          loans:loan_id (
            borrower_name,
            loan_id,
            payment_timing
          )
        `)
        .gte('period_end', startOfMonth)
        .lte('period_start', nextMonthEnd)
        .order('period_start', { ascending: true });

      if (periodsError) throw periodsError;

      // Filter: keep this month's periods for all loans,
      // plus next month's periods only for in-advance loans
      const filteredPeriods = (periods || []).filter(p => {
        const isThisMonth = p.period_start <= endOfMonth;
        if (isThisMonth) return true;
        return p.loans?.payment_timing === 'in_advance';
      });

      const totalPeriods = filteredPeriods.length;
      const periodsWithExceptions = filteredPeriods.filter(p => p.has_economic_events)?.length || 0;

      return {
        ...(approval ?? { id: '', year_month: yearMonth, status: 'pending', approved_by: null, approved_at: null, notes: null, total_periods: 0, periods_with_exceptions: 0, created_at: '' }),
        total_periods: totalPeriods,
        periods_with_exceptions: periodsWithExceptions,
        periods: filteredPeriods,
      } as MonthlyApprovalWithPeriods;
    },
    enabled: !!yearMonth,
  });
}

export function useApproveMonth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ yearMonth, notes }: { yearMonth: string; notes?: string }) => {
      // Ensure approval record exists (upsert), then fetch its id
      const { data: approval, error: fetchError } = await supabase
        .from('monthly_approvals')
        .upsert({ year_month: yearMonth }, { onConflict: 'year_month' })
        .select('id')
        .single();

      if (fetchError) throw fetchError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update approval status
      const { error: updateError } = await supabase
        .from('monthly_approvals')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          notes,
        })
        .eq('id', approval.id);

      if (updateError) throw updateError;

      // Update all periods in this month to approved
      const startOfMonth = `${yearMonth}-01`;
      const endOfMonth = new Date(parseInt(yearMonth.split('-')[0]), parseInt(yearMonth.split('-')[1]), 0)
        .toISOString().split('T')[0];

      // Approve this month's periods (all loans)
      const { error: periodsError } = await supabase
        .from('periods')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          monthly_approval_id: approval.id,
        })
        .gte('period_end', startOfMonth)
        .lte('period_start', endOfMonth)
        .in('status', ['open', 'submitted']);

      // Also approve next month's periods for in-advance loans
      const nextMonthStart = new Date(parseInt(yearMonth.split('-')[0]), parseInt(yearMonth.split('-')[1]), 1)
        .toISOString().split('T')[0];
      const nextMonthEnd = new Date(parseInt(yearMonth.split('-')[0]), parseInt(yearMonth.split('-')[1]) + 1, 0)
        .toISOString().split('T')[0];

      // Get in-advance loan IDs
      const { data: advanceLoans } = await supabase
        .from('loans')
        .select('id')
        .eq('payment_timing', 'in_advance');

      if (advanceLoans && advanceLoans.length > 0) {
        const advanceLoanIds = advanceLoans.map(l => l.id);
        await supabase
          .from('periods')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            monthly_approval_id: approval.id,
          })
          .gte('period_start', nextMonthStart)
          .lte('period_start', nextMonthEnd)
          .in('loan_id', advanceLoanIds)
          .in('status', ['open', 'submitted']);
      }

      if (periodsError) throw periodsError;

      return approval;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-approval', variables.yearMonth] });
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      toast({
        title: 'Month approved',
        description: `All periods for ${variables.yearMonth} have been approved.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Approval failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useTriggerDailyAccruals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (date?: string) => {
      const { data, error } = await supabase.functions.invoke('process-daily-accruals', {
        body: date ? { date } : {},
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['processing-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['accrual-entries'] });
      toast({
        title: 'Processing complete',
        description: `Processed ${data.processed_count} loans. ${data.error_count > 0 ? `${data.error_count} errors.` : ''}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Processing failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}
