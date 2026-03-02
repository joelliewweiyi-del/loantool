import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMonthlyApprovalDetails } from '@/hooks/useMonthlyApproval';
import { useToast } from '@/hooks/use-toast';
import { calculatePeriodAccruals } from '@/lib/loanCalculations';
import type { LoanEvent, InterestType, Period } from '@/types/loan';

export interface AfasMatch {
  amount: number;
  date: string;
  description: string;
  ref: string;
}

export interface EnrichedPeriod {
  id: string;
  loan_id: string;
  period_start: string;
  period_end: string;
  status: string;
  has_economic_events: boolean;
  loanNumericId: string;
  borrowerName: string;
  vehicle: string;
  // Calculated
  interestAccrued: number;
  commitmentFeeAccrued: number;
  totalDue: number;
  expectedCashDue: number;
  // AFAS match
  afasPayment: AfasMatch | null;
  delta: number | null; // afas amount - calculated, null if no match
  allAfasPayments: AfasMatch[]; // all AFAS transactions for this loan
  // Already confirmed
  isConfirmed: boolean;
  paymentDate: string | null;
  paymentAmount: number | null;
}

export interface MonthlyApprovalAccruals {
  id: string;
  status: string;
  approved_at: string | null;
  notes: string | null;
  periods: EnrichedPeriod[];
  totalDue: number;
  matchedCount: number;
  unmatchedCount: number;
  confirmedCount: number;
  totalAllPeriods: number;
}

export function useMonthlyApprovalAccruals(yearMonth: string | undefined) {
  const { data: baseData, isLoading: baseLoading } = useMonthlyApprovalDetails(yearMonth);

  const loanIds = useMemo(() => {
    if (!baseData?.periods) return [];
    return [...new Set(baseData.periods.map(p => p.loan_id))];
  }, [baseData?.periods]);

  // Loan metadata
  const { data: loansData, isLoading: loansLoading } = useQuery({
    queryKey: ['monthly-approval-loans', loanIds],
    queryFn: async () => {
      if (loanIds.length === 0) return [];
      const { data, error } = await supabase
        .from('loans')
        .select('id, loan_id, borrower_name, total_commitment, commitment_fee_rate, interest_type, vehicle, cash_interest_percentage')
        .in('id', loanIds);
      if (error) throw error;
      return data as Array<{
        id: string;
        loan_id: string;
        borrower_name: string;
        total_commitment: number | null;
        commitment_fee_rate: number | null;
        interest_type: InterestType;
        vehicle: string | null;
        cash_interest_percentage: number | null;
      }>;
    },
    enabled: loanIds.length > 0,
  });

  // All approved events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['monthly-approval-events', loanIds],
    queryFn: async () => {
      if (loanIds.length === 0) return [];
      const { data, error } = await supabase
        .from('loan_events')
        .select('*')
        .in('loan_id', loanIds)
        .eq('status', 'approved')
        .order('effective_date', { ascending: true });
      if (error) throw error;
      return data as LoanEvent[];
    },
    enabled: loanIds.length > 0,
  });

  // AFAS payments (bulk fetch for all loan accounts)
  const { data: afasData, isLoading: afasLoading } = useQuery({
    queryKey: ['monthly-approval-afas'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-draws', {
        body: {
          filterFieldIds: 'UnitId,JournalId,AccountNo',
          filterValues: '5,50,400..599',
          operatorTypes: '1,1,15',
          take: 5000,
        },
      });
      if (error) throw error;
      return (data?.allData?.rows ?? []) as Array<{
        AccountNo: number;
        EntryDate: string;
        AmtCredit: number;
        AmtDebit: number;
        Description: string;
        EntryNo: number;
        SeqNo: number;
      }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const result = useMemo((): MonthlyApprovalAccruals | null => {
    if (!baseData?.periods || !loansData || !eventsData || !afasData) return null;

    const loanMap = new Map(loansData.map(l => [l.id, l]));
    // Numeric loan_id → UUID
    const numericToUuid = new Map(loansData.map(l => [l.loan_id, l.id]));

    const eventsByLoan = new Map<string, LoanEvent[]>();
    for (const event of eventsData) {
      const existing = eventsByLoan.get(event.loan_id);
      if (existing) existing.push(event);
      else eventsByLoan.set(event.loan_id, [event]);
    }

    // Build AFAS payments grouped by loan UUID
    const afasByLoan = new Map<string, Array<{ amount: number; date: string; description: string; ref: string }>>();
    for (const row of afasData) {
      if (row.AmtCredit <= 0) continue; // only credit entries
      const uuid = numericToUuid.get(String(row.AccountNo));
      if (!uuid) continue;
      const entry = {
        amount: row.AmtCredit,
        date: row.EntryDate,
        description: row.Description,
        ref: `${row.EntryNo}-${row.SeqNo}`,
      };
      const existing = afasByLoan.get(uuid);
      if (existing) existing.push(entry);
      else afasByLoan.set(uuid, [entry]);
    }

    // Collect confirmed AFAS refs (already linked to paid periods)
    const confirmedRefs = new Set<string>();
    for (const period of baseData.periods) {
      if (period.payment_afas_ref) confirmedRefs.add(period.payment_afas_ref);
    }

    // Filter to cash-pay only, calculate accruals, match AFAS
    let totalDue = 0;
    let matchedCount = 0;
    let unmatchedCount = 0;
    let confirmedCount = 0;

    const cashPeriods = baseData.periods.filter(period => {
      const loan = loanMap.get(period.loan_id);
      return loan?.interest_type === 'cash_pay';
    });

    // Sort by period_end so earlier periods claim AFAS payments first
    const sorted = [...cashPeriods].sort(
      (a, b) => new Date(a.period_end).getTime() - new Date(b.period_end).getTime()
    );

    const usedRefs = new Set<string>();
    const enrichedPeriods: EnrichedPeriod[] = [];

    for (const period of sorted) {
      const loan = loanMap.get(period.loan_id);
      const events = eventsByLoan.get(period.loan_id) ?? [];
      const accruals = calculatePeriodAccruals(
        period as Period,
        events,
        loan?.commitment_fee_rate ?? 0,
        loan?.total_commitment ?? 0,
        loan?.interest_type ?? 'cash_pay'
      );

      const isConfirmed = period.status === 'paid' && !!period.payment_date;
      const cashPct = (loan?.cash_interest_percentage ?? 100) / 100;
      const expectedCashDue = accruals.interestAccrued * cashPct + accruals.commitmentFeeAccrued + accruals.feesInvoiced;
      totalDue += accruals.totalDue;

      // Try to match an AFAS payment
      let afasPayment: AfasMatch | null = null;

      if (isConfirmed) {
        // Already confirmed — show the stored payment data
        confirmedCount++;
        afasPayment = period.payment_amount != null ? {
          amount: period.payment_amount,
          date: period.payment_date!,
          description: '',
          ref: period.payment_afas_ref ?? '',
        } : null;
      } else if (expectedCashDue > 0) {
        // Try matching from AFAS data — date window only, pick closest amount
        const loanAfas = afasByLoan.get(period.loan_id) ?? [];
        const windowStart = new Date(period.period_start);
        const windowEnd = new Date(period.period_end);
        windowEnd.setDate(windowEnd.getDate() + 14);

        let bestDelta = Infinity;
        for (const payment of loanAfas) {
          if (usedRefs.has(payment.ref) || confirmedRefs.has(payment.ref)) continue;
          const payDate = new Date(payment.date);
          if (payDate >= windowStart && payDate <= windowEnd) {
            const delta = Math.abs(payment.amount - expectedCashDue);
            if (!afasPayment || delta < bestDelta) {
              afasPayment = payment;
              bestDelta = delta;
            }
          }
        }
        if (afasPayment) usedRefs.add(afasPayment.ref);
      }

      if (!isConfirmed) {
        if (afasPayment) matchedCount++;
        else if (expectedCashDue > 0) unmatchedCount++;
      }

      enrichedPeriods.push({
        id: period.id,
        loan_id: period.loan_id,
        period_start: period.period_start,
        period_end: period.period_end,
        status: period.status,
        has_economic_events: period.has_economic_events,
        loanNumericId: loan?.loan_id ?? '',
        borrowerName: loan?.borrower_name ?? '',
        vehicle: loan?.vehicle ?? '',
        interestAccrued: accruals.interestAccrued,
        commitmentFeeAccrued: accruals.commitmentFeeAccrued,
        totalDue: accruals.totalDue,
        expectedCashDue,
        afasPayment,
        delta: afasPayment && !isConfirmed ? afasPayment.amount - expectedCashDue : null,
        allAfasPayments: afasByLoan.get(period.loan_id) ?? [],
        isConfirmed,
        paymentDate: period.payment_date ?? null,
        paymentAmount: period.payment_amount ?? null,
      });
    }

    return {
      id: baseData.id,
      status: baseData.status,
      approved_at: baseData.approved_at,
      notes: baseData.notes,
      periods: enrichedPeriods,
      totalDue,
      matchedCount,
      unmatchedCount,
      confirmedCount,
      totalAllPeriods: baseData.periods.length,
    };
  }, [baseData, loansData, eventsData, afasData]);

  return {
    data: result,
    isLoading: baseLoading || loansLoading || eventsLoading || afasLoading,
  };
}

/** Confirm an AFAS payment match from the monthly approval page. */
export function useConfirmPaymentFromApproval(yearMonth: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { periodId: string; paymentDate: string; paymentAmount: number; paymentAfasRef: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ['monthly-approval', yearMonth] });
      queryClient.invalidateQueries({ queryKey: ['monthly-approval-loans'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-approval-events'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-approval-afas'] });
      queryClient.invalidateQueries({ queryKey: ['payment-counts'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to confirm', description: error.message, variant: 'destructive' });
    },
  });
}
