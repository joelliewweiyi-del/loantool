import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConfirmDrawInput {
  loanUuid: string;
  eventType: 'principal_draw' | 'principal_repayment';
  effectiveDate: string;
  amount: number;
  afasRef: string;
  afasDescription: string;
}

/**
 * Mutation to confirm an AFAS draw/repayment transaction.
 * Creates a draft loan event (principal_draw or principal_repayment)
 * that must be separately approved by a controller.
 */
export function useConfirmDraw(loanId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: ConfirmDrawInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Duplicate check: prevent confirming the same AFAS transaction twice
      const { data: existing } = await supabase
        .from('loan_events')
        .select('id')
        .eq('loan_id', input.loanUuid)
        .in('event_type', ['principal_draw', 'principal_repayment'])
        .contains('metadata', { afas_ref: input.afasRef })
        .maybeSingle();

      if (existing) throw new Error('This AFAS transaction has already been confirmed');

      const { data: event, error } = await supabase
        .from('loan_events')
        .insert([{
          loan_id: input.loanUuid,
          event_type: input.eventType,
          effective_date: input.effectiveDate,
          amount: input.amount,
          status: 'draft',
          created_by: userData.user.id,
          metadata: {
            afas_ref: input.afasRef,
            afas_description: input.afasDescription,
            source: 'afas_confirmation',
            confirmed_at: new Date().toISOString(),
          },
        }])
        .select()
        .single();

      if (error) throw error;
      return event;
    },
    onSuccess: (_, variables) => {
      const label = variables.eventType === 'principal_draw' ? 'Draw' : 'Repayment';
      toast({ title: `${label} confirmed`, description: 'Draft event created for controller approval.' });
      queryClient.invalidateQueries({ queryKey: ['loan-events', loanId ?? variables.loanUuid] });
      queryClient.invalidateQueries({ queryKey: ['afas-draw-confirmations'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to confirm', description: error.message, variant: 'destructive' });
    },
  });
}
