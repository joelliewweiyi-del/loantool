import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FundingCounterparty, FundingNote, FundingStage, ActivityType, ActivityAttachment } from '@/types/loan';
import { useToast } from '@/hooks/use-toast';

// ── Queries ──

export function useCounterparties() {
  return useQuery({
    queryKey: ['funding-counterparties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funding_counterparties' as any)
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as FundingCounterparty[];
    },
  });
}

export function useFundingNotes(counterpartyId: string | undefined) {
  return useQuery({
    queryKey: ['funding-notes', counterpartyId],
    queryFn: async () => {
      if (!counterpartyId) return [];
      const { data, error } = await supabase
        .from('funding_notes' as any)
        .select('*')
        .eq('counterparty_id', counterpartyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FundingNote[];
    },
    enabled: !!counterpartyId,
  });
}

export function useAllFundingNotes() {
  return useQuery({
    queryKey: ['all-funding-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funding_notes' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FundingNote[];
    },
  });
}

// ── Counterparty mutations ──

export function useCreateCounterparty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      stage?: FundingStage;
      contact_name?: string;
      contact_email?: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('funding_counterparties' as any)
        .insert([{
          name: input.name,
          stage: input.stage || 'initial_contact',
          contact_name: input.contact_name || null,
          contact_email: input.contact_email || null,
          notes: input.notes || null,
          created_by: user.user.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FundingCounterparty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-counterparties'] });
      toast({ title: 'Counterparty added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add counterparty', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCounterparty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      stage?: FundingStage;
      key_terms?: Record<string, any>;
      next_followup?: string | null;
      contact_name?: string | null;
      contact_email?: string | null;
      notes?: string | null;
    }) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('funding_counterparties' as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FundingCounterparty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-counterparties'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update counterparty', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCounterparty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('funding_counterparties' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-counterparties'] });
      queryClient.invalidateQueries({ queryKey: ['all-funding-notes'] });
      toast({ title: 'Counterparty removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove counterparty', description: error.message, variant: 'destructive' });
    },
  });
}

// ── Note mutations ──

export function useCreateFundingNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      counterparty_id: string;
      content: string;
      activity_type?: ActivityType | null;
      activity_date?: string | null;
      attachments?: ActivityAttachment[] | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('funding_notes' as any)
        .insert([{
          counterparty_id: input.counterparty_id,
          content: input.content,
          activity_type: input.activity_type || null,
          activity_date: input.activity_date || null,
          attachments: input.attachments?.length ? input.attachments : null,
          created_by: user.user.id,
          created_by_email: user.user.email || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FundingNote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['funding-notes', variables.counterparty_id] });
      queryClient.invalidateQueries({ queryKey: ['all-funding-notes'] });
      toast({ title: 'Note added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add note', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFundingNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      counterparty_id: string;
      content: string;
      activity_type?: ActivityType | null;
      activity_date?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('funding_notes' as any)
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
      return data as unknown as FundingNote;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['funding-notes', variables.counterparty_id] });
      queryClient.invalidateQueries({ queryKey: ['all-funding-notes'] });
      toast({ title: 'Note updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update note', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFundingNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, counterpartyId }: { id: string; counterpartyId: string }) => {
      const { error } = await supabase
        .from('funding_notes' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['funding-notes', variables.counterpartyId] });
      queryClient.invalidateQueries({ queryKey: ['all-funding-notes'] });
      toast({ title: 'Note deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete note', description: error.message, variant: 'destructive' });
    },
  });
}
