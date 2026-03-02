import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConfirmPaymentInput {
  periodId: string;
  paymentDate: string;
  paymentAmount: number;
  paymentAfasRef: string;
}

/**
 * Mutation to confirm an AFAS cash payment against a period.
 * Updates the period row with payment details and sets status to 'paid'.
 */
export function useConfirmPayment(loanId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: ConfirmPaymentInput) => {
      const { error } = await supabase
        .from('periods')
        .update({
          status: 'paid' as any,
          payment_date: input.paymentDate,
          payment_amount: input.paymentAmount,
          payment_afas_ref: input.paymentAfasRef,
          paid_at: new Date().toISOString(),
        })
        .eq('id', input.periodId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Payment confirmed', description: 'Period marked as paid.' });
      // Invalidate both periods and accruals queries so the UI refreshes
      queryClient.invalidateQueries({ queryKey: ['loan-periods', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan-accruals', loanId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to confirm payment', description: error.message, variant: 'destructive' });
    },
  });
}
