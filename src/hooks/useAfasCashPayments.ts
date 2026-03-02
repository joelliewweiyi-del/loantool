import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AfasCashPayment {
  date: string;
  amount: number;
  description: string;
  ref: string; // EntryNo-SeqNo as unique reference
}

/**
 * Fetches cash interest payments from AFAS for a specific loan.
 * Uses the test-afas-draws edge function with an exact-match filter
 * on AccountNo (debtor account = loan ID).
 */
export function useAfasCashPayments(loanNumericId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['afas-cash-payments', loanNumericId],
    queryFn: async (): Promise<AfasCashPayment[]> => {
      const { data, error } = await supabase.functions.invoke('test-afas-draws', {
        body: {
          filterFieldIds: 'UnitId,JournalId,AccountNo',
          filterValues: `5,50,${loanNumericId}`,
          operatorTypes: '1,1,1', // all exact match
          take: 500,
        },
      });
      if (error) throw error;

      const rows = (data?.allData?.rows ?? []) as Array<{
        EntryDate: string;
        AmtCredit: number;
        AmtDebit: number;
        Description: string;
        EntryNo: number;
        SeqNo: number;
      }>;

      return rows
        .map((r) => ({
          date: r.EntryDate,
          amount: r.AmtCredit > 0 ? r.AmtCredit : -r.AmtDebit,
          description: r.Description,
          ref: `${r.EntryNo}-${r.SeqNo}`,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!loanNumericId,
  });
}
