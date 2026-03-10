import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoanActivityLog, ActivityType } from '@/types/loan';
import { useToast } from '@/hooks/use-toast';

export function useLoanActivityLog(loanId: string | undefined) {
  return useQuery({
    queryKey: ['loan-activity-log', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase
        .from('loan_activity_log' as any)
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LoanActivityLog[];
    },
    enabled: !!loanId,
  });
}

export interface ActivityLogWithLoan extends LoanActivityLog {
  borrower_name: string;
  loan_display_id: string;
  vehicle: string | null;
}

export function useAllActivityLog() {
  return useQuery({
    queryKey: ['all-activity-log'],
    queryFn: async () => {
      const [activityRes, loansRes] = await Promise.all([
        supabase
          .from('loan_activity_log' as any)
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('loans')
          .select('id, borrower_name, loan_id, vehicle'),
      ]);
      if (activityRes.error) throw activityRes.error;
      if (loansRes.error) throw loansRes.error;

      const loansMap: Record<string, { borrower_name: string; loan_id: string; vehicle: string | null }> = {};
      for (const l of loansRes.data || []) {
        loansMap[l.id] = { borrower_name: l.borrower_name, loan_id: l.loan_id, vehicle: l.vehicle };
      }

      return ((activityRes.data || []) as unknown as LoanActivityLog[]).map(a => ({
        ...a,
        borrower_name: loansMap[a.loan_id]?.borrower_name || 'Unknown',
        loan_display_id: loansMap[a.loan_id]?.loan_id || '',
        vehicle: loansMap[a.loan_id]?.vehicle || null,
      })) as ActivityLogWithLoan[];
    },
  });
}

export function useLatestActivityPerLoan() {
  return useQuery({
    queryKey: ['latest-activity-per-loan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_activity_log' as any)
        .select('loan_id, content, created_at, activity_type')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const result: Record<string, { content: string; created_at: string; activity_type: ActivityType | null }> = {};
      for (const row of (data || []) as any[]) {
        if (!(row.loan_id in result)) {
          result[row.loan_id] = {
            content: row.content,
            created_at: row.created_at,
            activity_type: row.activity_type as ActivityType | null,
          };
        }
      }
      return result;
    },
  });
}

export function useCreateActivityLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      loan_id: string;
      content: string;
      activity_type?: ActivityType | null;
      activity_date?: string | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('loan_activity_log' as any)
        .insert([{
          loan_id: input.loan_id,
          content: input.content,
          activity_type: input.activity_type || null,
          activity_date: input.activity_date || null,
          created_by: user.user.id,
          created_by_email: user.user.email || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LoanActivityLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-activity-log', variables.loan_id] });
      queryClient.invalidateQueries({ queryKey: ['latest-activity-per-loan'] });
      toast({ title: 'Note added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add note', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateActivityLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      loan_id: string;
      content: string;
      activity_type?: ActivityType | null;
      activity_date?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('loan_activity_log' as any)
        .update({
          content: input.content,
          activity_type: input.activity_type || null,
          activity_date: input.activity_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LoanActivityLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-activity-log', variables.loan_id] });
      queryClient.invalidateQueries({ queryKey: ['latest-activity-per-loan'] });
      toast({ title: 'Note updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update note', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteActivityLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, loanId }: { id: string; loanId: string }) => {
      const { error } = await supabase
        .from('loan_activity_log' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-activity-log', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['latest-activity-per-loan'] });
      toast({ title: 'Note deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete note', description: error.message, variant: 'destructive' });
    },
  });
}
