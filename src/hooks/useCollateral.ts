import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CollateralItem, LoanGuarantor } from '@/types/loan';

export type CollateralItemWithLoan = CollateralItem & {
  loan_id_display: string;
  borrower_name: string;
};

/** Fetch all collateral items across all loans, joined with loan info. */
export function useAllCollateralItems() {
  return useQuery({
    queryKey: ['collateral-items-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collateral_items')
        .select('*, loans!inner(loan_id, borrower_name)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(row => ({
        ...row,
        loan_id_display: row.loans.loan_id,
        borrower_name: row.loans.borrower_name,
        loans: undefined,
      })) as CollateralItemWithLoan[];
    },
  });
}

/** Fetch all guarantors across all loans, joined with loan info. */
export function useAllGuarantors() {
  return useQuery({
    queryKey: ['loan-guarantors-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_guarantors')
        .select('*, loans!inner(loan_id, borrower_name)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(row => ({
        ...row,
        loan_id_display: row.loans.loan_id,
        borrower_name: row.loans.borrower_name,
        loans: undefined,
      })) as (LoanGuarantor & { loan_id_display: string; borrower_name: string })[];
    },
  });
}

export function useCollateralItems(loanId: string | undefined) {
  return useQuery({
    queryKey: ['collateral-items', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase
        .from('collateral_items')
        .select('*')
        .eq('loan_id', loanId)
        .order('registration_date', { ascending: true })
        .order('perceelnummer', { ascending: true });
      if (error) throw error;
      return data as CollateralItem[];
    },
    enabled: !!loanId,
  });
}

export function useLoanGuarantors(loanId: string | undefined) {
  return useQuery({
    queryKey: ['loan-guarantors', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase
        .from('loan_guarantors')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as LoanGuarantor[];
    },
    enabled: !!loanId,
  });
}

export function useCreateCollateralItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CollateralItem, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'status_changed_at' | 'status_changed_by' | 'status_notes'>) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('collateral_items')
        .insert({ ...input, created_by: user.user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collateral-items', variables.loan_id] });
    },
  });
}

export function useUpdateCollateralItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, loanId, ...updates }: { id: string; loanId: string } & Partial<CollateralItem>) => {
      const { error } = await supabase
        .from('collateral_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collateral-items', variables.loanId] });
    },
  });
}

export function useReleaseCollateralItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, loanId, status, statusNotes }: { id: string; loanId: string; status: 'released' | 'sold'; statusNotes: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('collateral_items')
        .update({
          status,
          status_changed_at: new Date().toISOString(),
          status_changed_by: user.user!.id,
          status_notes: statusNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collateral-items', variables.loanId] });
    },
  });
}

export function useDeleteCollateralItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, loanId }: { id: string; loanId: string }) => {
      const { error } = await supabase
        .from('collateral_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collateral-items', variables.loanId] });
    },
  });
}

export function useCreateGuarantor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { loan_id: string; guarantor_name: string; guarantee_cap: number | null }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('loan_guarantors')
        .insert({ ...input, created_by: user.user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-guarantors', variables.loan_id] });
    },
  });
}

export function useUpdateGuarantor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, loanId, ...updates }: { id: string; loanId: string; guarantor_name?: string; guarantee_cap?: number | null }) => {
      const { error } = await supabase
        .from('loan_guarantors')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-guarantors', variables.loanId] });
    },
  });
}

export function useReleaseGuarantor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, loanId, statusNotes }: { id: string; loanId: string; statusNotes: string }) => {
      const { error } = await supabase
        .from('loan_guarantors')
        .update({
          status: 'released',
          status_changed_at: new Date().toISOString(),
          status_notes: statusNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-guarantors', variables.loanId] });
    },
  });
}

export function useDeleteGuarantor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, loanId }: { id: string; loanId: string }) => {
      const { error } = await supabase
        .from('loan_guarantors')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-guarantors', variables.loanId] });
    },
  });
}
