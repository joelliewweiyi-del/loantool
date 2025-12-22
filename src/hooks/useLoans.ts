import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loan, LoanEvent, Period, LoanFacility } from '@/types/loan';
import { useToast } from '@/hooks/use-toast';

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
    mutationFn: async (data: { borrower_name: string; payment_due_rule?: string }) => {
      const { data: loan, error } = await supabase
        .from('loans')
        .insert([data])
        .select()
        .single();
      
      if (error) throw error;
      return loan as Loan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      toast({ title: 'Loan created successfully' });
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
      event_type: string;
      effective_date: string;
      value_date: string | null;
      amount: number | null;
      rate: number | null;
      metadata: Record<string, unknown>;
      status: string;
      created_by: string;
    }) => {
      const { data: event, error } = await supabase
        .from('loan_events')
        .insert([{
          ...data,
          metadata: data.metadata as unknown as Record<string, never>
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

      const { error } = await supabase
        .from('loan_events')
        .update({ 
          status: 'approved',
          approved_by: user.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', eventId);
      
      if (error) throw error;
      return { eventId, loanId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-events', variables.loanId] });
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
