import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDateString } from '@/lib/simulatedDate';

export interface LoanPaymentCount {
  totalDue: number;       // periods with period_end < today
  paidCount: number;      // periods with status = 'paid'
  unconfirmedCount: number; // AFAS payments not yet matched to a paid period
}

/**
 * Fetches period payment status counts for all loans, plus AFAS cash payment
 * counts to identify unconfirmed (received but not yet confirmed) payments.
 * Returns a map of loan UUID → { totalDue, paidCount, unconfirmedCount }.
 */
export function usePaymentCounts() {
  return useQuery({
    queryKey: ['payment-counts'],
    queryFn: async () => {
      const today = getCurrentDateString();

      // AFAS went live 1 Dec 2025. Pre-AFAS periods (period_start < this date)
      // are only counted if already confirmed as paid — they can never be
      // verified via AFAS otherwise and would drag down the progress bar.
      const AFAS_GO_LIVE = '2025-12-01';

      // Fetch periods and AFAS payments in parallel
      const [periodsResult, afasResult, loansResult] = await Promise.all([
        supabase
          .from('periods')
          .select('loan_id, status, payment_afas_ref, period_start')
          .lt('period_end', today),
        supabase.functions.invoke('test-afas-draws', {
          body: {
            filterFieldIds: 'UnitId,JournalId,AccountNo',
            filterValues: '5,50,400..599',
            operatorTypes: '1,1,15',
            take: 500,
          },
        }),
        supabase
          .from('loans')
          .select('id, loan_id'),
      ]);

      if (periodsResult.error) throw periodsResult.error;

      // Build loan_id (numeric) → UUID map
      const loanIdToUuid = new Map<string, string>();
      if (loansResult.data) {
        for (const loan of loansResult.data) {
          if (loan.loan_id) loanIdToUuid.set(loan.loan_id, loan.id);
        }
      }

      // Count AFAS payment refs per loan UUID
      const afasRefsByLoan = new Map<string, Set<string>>();
      const afasRows = afasResult.data?.allData?.rows ?? [];
      for (const row of afasRows as Array<{ AccountNo: number; EntryNo: number; SeqNo: number; AmtCredit: number }>) {
        const uuid = loanIdToUuid.get(String(row.AccountNo));
        if (!uuid) continue;
        // Only count credit entries (actual payments received)
        if (row.AmtCredit <= 0) continue;
        const ref = `${row.EntryNo}-${row.SeqNo}`;
        const existing = afasRefsByLoan.get(uuid);
        if (existing) existing.add(ref);
        else afasRefsByLoan.set(uuid, new Set([ref]));
      }

      // Count periods and compute unconfirmed
      const counts = new Map<string, LoanPaymentCount>();

      // Collect confirmed refs per loan
      const confirmedRefsByLoan = new Map<string, Set<string>>();

      for (const row of periodsResult.data) {
        // Pre-AFAS periods: only count if already confirmed paid
        const isPreAfas = row.period_start < AFAS_GO_LIVE;
        if (isPreAfas && row.status !== 'paid') continue;

        const existing = counts.get(row.loan_id);
        if (existing) {
          existing.totalDue++;
          if (row.status === 'paid') existing.paidCount++;
        } else {
          counts.set(row.loan_id, {
            totalDue: 1,
            paidCount: row.status === 'paid' ? 1 : 0,
            unconfirmedCount: 0,
          });
        }
        // Track confirmed AFAS refs
        if (row.status === 'paid' && row.payment_afas_ref) {
          const refs = confirmedRefsByLoan.get(row.loan_id);
          if (refs) refs.add(row.payment_afas_ref);
          else confirmedRefsByLoan.set(row.loan_id, new Set([row.payment_afas_ref]));
        }
      }

      // Compute unconfirmed: AFAS refs that aren't in confirmed refs
      for (const [uuid, afasRefs] of afasRefsByLoan) {
        const confirmed = confirmedRefsByLoan.get(uuid) ?? new Set();
        let unconfirmed = 0;
        for (const ref of afasRefs) {
          if (!confirmed.has(ref)) unconfirmed++;
        }
        const existing = counts.get(uuid);
        if (existing) {
          existing.unconfirmedCount = unconfirmed;
        } else {
          counts.set(uuid, { totalDue: 0, paidCount: 0, unconfirmedCount: unconfirmed });
        }
      }

      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });
}
