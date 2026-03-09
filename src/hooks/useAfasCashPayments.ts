import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AfasCashPayment {
  date: string;
  amount: number;
  description: string;
  ref: string; // EntryNo-SeqNo as unique reference
}

interface AfasPaymentRow {
  EntryDate: string;
  AmtCredit: number;
  AmtDebit: number;
  Description: string;
  EntryNo: number;
  SeqNo: number;
}

/**
 * Fetches cash interest payments from AFAS for a specific loan.
 *
 * For depot-split loans (cash_interest_percentage < 100), the J50 credit on the
 * debtor account may be the GROSS invoice amount (not the net cash). AFAS books
 * the depot portion as a debit on account 1751 in the same bank entry (EntryNo).
 * This hook fetches both and nets them out so the returned amount is always the
 * true cash received.
 *
 * See CLAUDE.md → "Depot Split Accounting in AFAS" for full details.
 */
export function useAfasCashPayments(loanNumericId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['afas-cash-payments', loanNumericId],
    queryFn: async (): Promise<AfasCashPayment[]> => {
      // Fetch J50 credits on the loan's debtor account AND J50 debits on 1751
      const [payRes, depotRes] = await Promise.all([
        supabase.functions.invoke('test-afas-draws', {
          body: {
            filterFieldIds: 'UnitId,JournalId,AccountNo',
            filterValues: `5,50,${loanNumericId}`,
            operatorTypes: '1,1,1',
            take: 500,
          },
        }),
        supabase.functions.invoke('test-afas-draws', {
          body: {
            filterFieldIds: 'UnitId,JournalId,AccountNo',
            filterValues: '5,50,1751',
            operatorTypes: '1,1,1',
            take: 500,
          },
        }),
      ]);
      if (payRes.error) throw payRes.error;
      if (depotRes.error) throw depotRes.error;

      const payRows = (payRes.data?.allData?.rows ?? []) as AfasPaymentRow[];
      const depotRows = (depotRes.data?.allData?.rows ?? []) as AfasPaymentRow[];

      // Build map: EntryNo → depot debit amount (only debits whose description
      // mentions this loan, to avoid cross-matching with other loans in the same
      // bank entry).
      const depotByEntry = new Map<number, number>();
      for (const r of depotRows) {
        if (r.AmtDebit > 0 && (r.Description || '').includes(String(loanNumericId))) {
          depotByEntry.set(r.EntryNo, (depotByEntry.get(r.EntryNo) ?? 0) + r.AmtDebit);
        }
      }

      return payRows
        .map((r) => ({
          date: r.EntryDate,
          amount: (r.AmtCredit > 0 ? r.AmtCredit : -r.AmtDebit) - (depotByEntry.get(r.EntryNo) ?? 0),
          description: r.Description,
          ref: `${r.EntryNo}-${r.SeqNo}`,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!loanNumericId,
  });
}

/**
 * Fetches depot (interest reserve) settlements from AFAS for a specific loan.
 * Same as cash payments but JournalId = 90 (memorial) instead of 50 (bank).
 * Only relevant for loans with cash_interest_percentage < 100.
 */
/**
 * Fetches ALL depot (interest reserve) settlements from AFAS for a specific loan.
 *
 * Two booking methods exist (see CLAUDE.md → "Depot Split Accounting in AFAS"):
 * - Method 1: J50 debit on account 1751 (depot portion netted from gross bank settlement)
 * - Method 2: J90 credit on the debtor account (memorial journal)
 *
 * This hook fetches both and merges them so the total reflects all depot usage.
 */
export function useAfasDepotPayments(loanNumericId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['afas-depot-payments', loanNumericId],
    queryFn: async (): Promise<AfasCashPayment[]> => {
      const [j90Res, j50_1751Res] = await Promise.all([
        // Method 2: J90 credits on debtor account
        supabase.functions.invoke('test-afas-draws', {
          body: {
            filterFieldIds: 'UnitId,JournalId,AccountNo',
            filterValues: `5,90,${loanNumericId}`,
            operatorTypes: '1,1,1',
            take: 500,
          },
        }),
        // Method 1: J50 debits on account 1751
        supabase.functions.invoke('test-afas-draws', {
          body: {
            filterFieldIds: 'UnitId,JournalId,AccountNo',
            filterValues: '5,50,1751',
            operatorTypes: '1,1,1',
            take: 500,
          },
        }),
      ]);
      if (j90Res.error) throw j90Res.error;
      if (j50_1751Res.error) throw j50_1751Res.error;

      const j90Rows = (j90Res.data?.allData?.rows ?? []) as AfasPaymentRow[];
      const j50_1751Rows = (j50_1751Res.data?.allData?.rows ?? []) as AfasPaymentRow[];

      // J90 credits on the debtor account
      const j90Payments: AfasCashPayment[] = j90Rows
        .filter(r => r.AmtCredit > 0)
        .map(r => ({
          date: r.EntryDate,
          amount: r.AmtCredit,
          description: r.Description,
          ref: `${r.EntryNo}-${r.SeqNo}`,
        }));

      // J50 debits on 1751 that mention this loan
      const j50Payments: AfasCashPayment[] = j50_1751Rows
        .filter(r => r.AmtDebit > 0 && (r.Description || '').includes(String(loanNumericId)))
        .map(r => ({
          date: r.EntryDate,
          amount: r.AmtDebit,
          description: r.Description,
          ref: `${r.EntryNo}-${r.SeqNo}`,
        }));

      return [...j90Payments, ...j50Payments]
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!loanNumericId,
  });
}
