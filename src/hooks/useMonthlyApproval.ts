import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MonthlyApproval, Period } from '@/types/loan';

export interface PeriodWithLoan extends Period {
  loans?: {
    borrower_name: string;
    loan_name: string | null;
  };
}

export interface MonthlyApprovalWithPeriods extends MonthlyApproval {
  periods: PeriodWithLoan[];
}

export function useMonthlyApprovals() {
  return useQuery({
    queryKey: ['monthly-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_approvals')
        .select('*')
        .order('year_month', { ascending: false });
      
      if (error) throw error;
      return data as MonthlyApproval[];
    },
  });
}

export function useMonthlyApprovalDetails(yearMonth: string | undefined) {
  return useQuery({
    queryKey: ['monthly-approval', yearMonth],
    queryFn: async () => {
      if (!yearMonth) return null;

      // Get or create monthly approval record
      let { data: approval, error: approvalError } = await supabase
        .from('monthly_approvals')
        .select('*')
        .eq('year_month', yearMonth)
        .single();

      if (approvalError && approvalError.code === 'PGRST116') {
        // Create new approval record
        const { data: newApproval, error: createError } = await supabase
          .from('monthly_approvals')
          .insert({ year_month: yearMonth })
          .select()
          .single();
        
        if (createError) throw createError;
        approval = newApproval;
      } else if (approvalError) {
        throw approvalError;
      }

      // Get periods for this month
      const startOfMonth = `${yearMonth}-01`;
      const endOfMonth = new Date(parseInt(yearMonth.split('-')[0]), parseInt(yearMonth.split('-')[1]), 0)
        .toISOString().split('T')[0];

      const { data: periods, error: periodsError } = await supabase
        .from('periods')
        .select(`
          *,
          loans:loan_id (
            borrower_name,
            loan_name
          )
        `)
        .gte('period_end', startOfMonth)
        .lte('period_start', endOfMonth)
        .order('period_start', { ascending: true });

      if (periodsError) throw periodsError;

      // Update approval counts
      const totalPeriods = periods?.length || 0;
      const periodsWithExceptions = periods?.filter(p => p.has_economic_events)?.length || 0;

      if (approval && (approval.total_periods !== totalPeriods || approval.periods_with_exceptions !== periodsWithExceptions)) {
        await supabase
          .from('monthly_approvals')
          .update({ 
            total_periods: totalPeriods,
            periods_with_exceptions: periodsWithExceptions 
          })
          .eq('id', approval.id);
      }

      return {
        ...approval,
        total_periods: totalPeriods,
        periods_with_exceptions: periodsWithExceptions,
        periods: periods || [],
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
      // Get the approval record
      const { data: approval, error: fetchError } = await supabase
        .from('monthly_approvals')
        .select('id')
        .eq('year_month', yearMonth)
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

export function useProcessingJobs() {
  return useQuery({
    queryKey: ['processing-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
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
