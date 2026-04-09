import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMonthlyApprovalDetails } from '@/hooks/useMonthlyApproval';
import { useToast } from '@/hooks/use-toast';
import { calculatePeriodAccruals, type AmortizationParams } from '@/lib/loanCalculations';
import { AFAS_PAYMENT_MATCH_WINDOW_DAYS } from '@/lib/constants';
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
  expectedDepotDue: number;
  cashPct: number;
  // AFAS match
  afasPayment: AfasMatch | null;
  afasDepot: AfasMatch | null;
  delta: number | null; // afas amount - calculated, null if no match
  allAfasPayments: AfasMatch[]; // all AFAS transactions for this loan
  // Already confirmed
  isConfirmed: boolean;
  paymentDate: string | null;
  paymentAmount: number | null;
}

export interface PikPeriodStatus {
  loanUuid: string;
  loanNumericId: string;
  borrowerName: string;
  vehicle: string;
  periodId: string;
  periodStart: string;
  periodEnd: string;
  interestAccrued: number;
  rollUpStatus: 'needs_rollup' | 'draft' | 'approved';
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
  pikPeriods: PikPeriodStatus[];
  pikNeedsAction: number;
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
        .select('id, loan_id, borrower_name, total_commitment, commitment_fee_rate, interest_type, vehicle, cash_interest_percentage, amortization_amount, amortization_frequency, amortization_start_date')
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
        amortization_amount: number | null;
        amortization_frequency: string | null;
        amortization_start_date: string | null;
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

  // PIK capitalization events (both draft and approved) for the month
  const { data: pikCapEvents, isLoading: pikLoading } = useQuery({
    queryKey: ['monthly-approval-pik-cap-events', loanIds, yearMonth],
    queryFn: async () => {
      if (loanIds.length === 0 || !yearMonth) return [];
      const [year, month] = yearMonth.split('-').map(Number);
      const monthStart = `${yearMonth}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('loan_events')
        .select('id, loan_id, event_type, effective_date, amount, status')
        .in('loan_id', loanIds)
        .eq('event_type', 'pik_capitalization_posted')
        .gte('effective_date', monthStart)
        .lte('effective_date', monthEnd);
      if (error) throw error;
      return data;
    },
    enabled: loanIds.length > 0 && !!yearMonth,
  });

  // AFAS cash payments (journal 50 — bank)
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

  // AFAS depot payments (journal 90 — memorial) — for loans with depot split
  const { data: afasDepotData, isLoading: afasDepotLoading } = useQuery({
    queryKey: ['monthly-approval-afas-depot'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-draws', {
        body: {
          filterFieldIds: 'UnitId,JournalId,AccountNo',
          filterValues: '5,90,400..599',
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

  // AFAS account 1751 debits (journal 50) — depot reserve netting.
  // When AFAS books the full invoice amount as a J50 credit on the debtor account,
  // it simultaneously debits 1751 for the depot portion in the same bank entry.
  // We subtract these to get the true net cash amount.
  // See CLAUDE.md → "Depot Split Accounting in AFAS".
  const { data: afas1751Data, isLoading: afas1751Loading } = useQuery({
    queryKey: ['monthly-approval-afas-1751'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-draws', {
        body: {
          filterFieldIds: 'UnitId,JournalId,AccountNo',
          filterValues: '5,50,1751',
          operatorTypes: '1,1,1',
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

    // Build 1751 depot debit map: "EntryNo-loanNumericId" → debit amount.
    // This nets out the depot portion from gross J50 settlements.
    const depotDebits1751 = new Map<string, number>();
    if (afas1751Data) {
      for (const row of afas1751Data) {
        if (row.AmtDebit <= 0) continue;
        // Match to loan by checking description for loan numeric ID
        for (const loan of loansData) {
          if ((row.Description || '').includes(loan.loan_id)) {
            const key = `${row.EntryNo}-${loan.loan_id}`;
            depotDebits1751.set(key, (depotDebits1751.get(key) ?? 0) + row.AmtDebit);
          }
        }
      }
    }

    // Build AFAS payments grouped by loan UUID, with 1751 netting applied
    type AfasEntry = { amount: number; date: string; description: string; ref: string };
    function groupAfasRows(rows: typeof afasData, applyNetting = false): Map<string, AfasEntry[]> {
      const map = new Map<string, AfasEntry[]>();
      for (const row of rows) {
        if (row.AmtCredit <= 0) continue;
        const loanId = String(row.AccountNo);
        const uuid = numericToUuid.get(loanId);
        if (!uuid) continue;
        // Subtract matching 1751 depot debit from this bank entry
        const depotDebit = applyNetting ? (depotDebits1751.get(`${row.EntryNo}-${loanId}`) ?? 0) : 0;
        const entry: AfasEntry = {
          amount: row.AmtCredit - depotDebit,
          date: row.EntryDate,
          description: row.Description,
          ref: `${row.EntryNo}-${row.SeqNo}`,
        };
        const existing = map.get(uuid);
        if (existing) existing.push(entry);
        else map.set(uuid, [entry]);
      }
      return map;
    }

    const afasByLoan = groupAfasRows(afasData, true); // apply 1751 netting to J50 data
    const depotByLoan = afasDepotData ? groupAfasRows(afasDepotData) : new Map<string, AfasEntry[]>();

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
      const amortizationParams: AmortizationParams | null =
        loan?.amortization_amount && loan?.amortization_frequency && loan?.amortization_start_date
          ? {
              amount: loan.amortization_amount,
              frequency: loan.amortization_frequency as AmortizationParams['frequency'],
              startDate: loan.amortization_start_date,
            }
          : null;
      const accruals = calculatePeriodAccruals(
        period as Period,
        events,
        loan?.commitment_fee_rate ?? 0,
        loan?.total_commitment ?? 0,
        loan?.interest_type ?? 'cash_pay',
        amortizationParams
      );

      const isConfirmed = period.status === 'paid' && !!period.payment_date;
      const cashPct = (loan?.cash_interest_percentage ?? 100) / 100;
      const expectedCashDue = accruals.interestAccrued * cashPct + accruals.commitmentFeeAccrued + accruals.feesInvoiced + accruals.amortizationDue;
      const expectedDepotDue = cashPct < 1 ? accruals.interestAccrued * (1 - cashPct) : 0;
      totalDue += accruals.totalDue;

      // Try to match an AFAS depot payment (journal 90)
      let afasDepot: AfasMatch | null = null;
      if (!isConfirmed && expectedDepotDue > 0) {
        const loanDepot = depotByLoan.get(period.loan_id) ?? [];
        const windowStart = new Date(period.period_start);
        const windowEnd = new Date(period.period_end);
        windowEnd.setDate(windowEnd.getDate() + AFAS_PAYMENT_MATCH_WINDOW_DAYS);

        let bestDelta = Infinity;
        for (const payment of loanDepot) {
          const payDate = new Date(payment.date);
          if (payDate >= windowStart && payDate <= windowEnd) {
            const delta = Math.abs(payment.amount - expectedDepotDue);
            if (!afasDepot || delta < bestDelta) {
              afasDepot = payment;
              bestDelta = delta;
            }
          }
        }
      }

      // Try to match an AFAS cash payment.
      // The amounts in afasByLoan are already netted (1751 debits subtracted),
      // so they represent the true cash amount regardless of AFAS booking method.
      let afasPayment: AfasMatch | null = null;

      if (isConfirmed) {
        confirmedCount++;
        afasPayment = period.payment_amount != null ? {
          amount: period.payment_amount,
          date: period.payment_date!,
          description: '',
          ref: period.payment_afas_ref ?? '',
        } : null;
      } else if (expectedCashDue > 0) {
        const loanAfas = afasByLoan.get(period.loan_id) ?? [];
        const windowStart = new Date(period.period_start);
        const windowEnd = new Date(period.period_end);
        windowEnd.setDate(windowEnd.getDate() + AFAS_PAYMENT_MATCH_WINDOW_DAYS);

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
        expectedDepotDue,
        cashPct,
        afasPayment,
        afasDepot,
        delta: afasPayment && !isConfirmed ? afasPayment.amount - expectedCashDue : null,
        allAfasPayments: afasByLoan.get(period.loan_id) ?? [],
        isConfirmed,
        paymentDate: period.payment_date ?? null,
        paymentAmount: period.payment_amount ?? null,
      });
    }

    // PIK periods — show roll-up status
    const pikPeriods: PikPeriodStatus[] = [];
    const pikLoanPeriods = baseData.periods.filter(period => {
      const loan = loanMap.get(period.loan_id);
      return loan?.interest_type === 'pik';
    });

    for (const period of pikLoanPeriods) {
      const loan = loanMap.get(period.loan_id);
      const events = eventsByLoan.get(period.loan_id) ?? [];
      const accruals = calculatePeriodAccruals(
        period as Period,
        events,
        loan?.commitment_fee_rate ?? 0,
        loan?.total_commitment ?? 0,
        loan?.interest_type ?? 'pik'
      );

      const pikEvent = (pikCapEvents ?? []).find(e => e.loan_id === period.loan_id);
      let rollUpStatus: PikPeriodStatus['rollUpStatus'] = 'needs_rollup';
      if (pikEvent) {
        rollUpStatus = pikEvent.status === 'approved' ? 'approved' : 'draft';
      }

      pikPeriods.push({
        loanUuid: period.loan_id,
        loanNumericId: loan?.loan_id ?? '',
        borrowerName: loan?.borrower_name ?? '',
        vehicle: loan?.vehicle ?? '',
        periodId: period.id,
        periodStart: period.period_start,
        periodEnd: period.period_end,
        interestAccrued: accruals.interestAccrued,
        rollUpStatus,
      });
    }

    const pikNeedsAction = pikPeriods.filter(p => p.rollUpStatus !== 'approved').length;

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
      pikPeriods,
      pikNeedsAction,
    };
  }, [baseData, loansData, eventsData, afasData, afasDepotData, afas1751Data, pikCapEvents]);

  return {
    data: result,
    isLoading: baseLoading || loansLoading || eventsLoading || afasLoading || afasDepotLoading || afas1751Loading || pikLoading,
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
