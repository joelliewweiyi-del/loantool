import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMonthlyApprovalDraws } from './useMonthlyApprovalDraws';
import { useMonthlyApprovalAccruals } from './useMonthlyApprovalAccruals';
import { getCurrentDate } from '@/lib/simulatedDate';
import { format, subMonths, startOfMonth } from 'date-fns';
import type { LoanEvent } from '@/types/loan';

export type ApprovalCategory =
  | 'event_approval'
  | 'draw_confirmation'
  | 'payment_confirmation'
  | 'period_approval'
  | 'pik_rollup';

export interface OutstandingItem {
  id: string;
  category: ApprovalCategory;
  loanUuid: string;
  loanNumericId: string;
  borrowerName: string;
  vehicle: string;
  yearMonth: string;
  effectiveDate: string;
  label: string;
  amount: number | null;
  initiatedBy: 'pm' | 'controller' | 'system' | 'afas';
  waitingOn: 'pm' | 'controller';
  actionPayload: Record<string, unknown>;
}

export interface OutstandingApprovalsSummary {
  draftEvents: number;
  pendingDraws: number;
  pendingPayments: number;
  pendingPeriods: number;
  pikRollups: number;
  total: number;
}

/**
 * Aggregates all outstanding approval items across the portfolio.
 * Queries:
 * 1. Draft loan events (waiting for controller approval)
 * 2. Unconfirmed AFAS draws (waiting for PM confirmation)
 * 3. Unconfirmed AFAS payments (waiting for controller confirmation)
 * 4. Unapproved periods past their end date
 * 5. PIK loans needing roll-up
 */
export function useOutstandingApprovals() {
  const now = getCurrentDate();
  const todayStr = format(now, 'yyyy-MM-dd');

  // Look back 6 months for outstanding items
  const months = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < 6; i++) {
      result.push(format(subMonths(startOfMonth(now), i), 'yyyy-MM'));
    }
    return result;
  }, []);

  // 1. Draft events — waiting for controller approval
  const { data: draftEvents, isLoading: draftsLoading } = useQuery({
    queryKey: ['outstanding-draft-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_events')
        .select('id, loan_id, event_type, effective_date, amount, rate, status, created_at, created_by, metadata')
        .eq('status', 'draft')
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return data as LoanEvent[];
    },
    staleTime: 30 * 1000,
  });

  // Loan metadata for resolving UUIDs to numeric IDs
  const { data: loansData, isLoading: loansLoading } = useQuery({
    queryKey: ['outstanding-loans-meta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('id, loan_id, borrower_name, vehicle, interest_type');
      if (error) throw error;
      return data as Array<{
        id: string;
        loan_id: string;
        borrower_name: string;
        vehicle: string | null;
        interest_type: string | null;
      }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2 & 3. AFAS draws and payments — reuse existing hooks (no month filter to get all)
  const { data: drawsData, isLoading: drawsLoading } = useMonthlyApprovalDraws(undefined);

  // 4. Unapproved periods past their end date
  const { data: pendingPeriods, isLoading: periodsLoading } = useQuery({
    queryKey: ['outstanding-pending-periods', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periods')
        .select('id, loan_id, period_start, period_end, status')
        .in('status', ['open', 'submitted'])
        .lt('period_end', todayStr)
        .order('period_end', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });

  // 5. PIK roll-ups needed — PIK loans with unapproved periods and no capitalization event
  const pikLoanIds = useMemo(() => {
    if (!loansData || !pendingPeriods) return [];
    const pikLoans = new Set(loansData.filter(l => l.interest_type === 'pik').map(l => l.id));
    return [...new Set(pendingPeriods.filter(p => pikLoans.has(p.loan_id)).map(p => p.loan_id))];
  }, [loansData, pendingPeriods]);

  const { data: pikCapEvents, isLoading: pikLoading } = useQuery({
    queryKey: ['outstanding-pik-cap-events', pikLoanIds],
    queryFn: async () => {
      if (pikLoanIds.length === 0) return [];
      const { data, error } = await supabase
        .from('loan_events')
        .select('id, loan_id, event_type, effective_date, status')
        .in('loan_id', pikLoanIds)
        .eq('event_type', 'pik_capitalization_posted');
      if (error) throw error;
      return data;
    },
    enabled: pikLoanIds.length > 0,
  });

  // Merge all streams into a unified list
  const { items, summary } = useMemo(() => {
    const items: OutstandingItem[] = [];
    const loanMap = new Map(loansData?.map(l => [l.id, l]) ?? []);

    const formatEventType = (type: string) => {
      const labels: Record<string, string> = {
        principal_draw: 'Principal Draw',
        principal_repayment: 'Principal Repayment',
        interest_rate_set: 'Rate Set',
        interest_rate_change: 'Rate Change',
        pik_flag_set: 'PIK Flag',
        commitment_set: 'Commitment Set',
        commitment_change: 'Commitment Change',
        commitment_cancel: 'Commitment Cancel',
        cash_received: 'Cash Received',
        fee_invoice: 'Fee Invoice',
        pik_capitalization_posted: 'PIK Roll-Up',
      };
      return labels[type] || type;
    };

    // 1. Draft events
    if (draftEvents) {
      for (const event of draftEvents) {
        const loan = loanMap.get(event.loan_id);
        if (!loan) continue;
        items.push({
          id: `event-${event.id}`,
          category: 'event_approval',
          loanUuid: event.loan_id,
          loanNumericId: loan.loan_id,
          borrowerName: loan.borrower_name,
          vehicle: loan.vehicle ?? '',
          yearMonth: event.effective_date.slice(0, 7),
          effectiveDate: event.effective_date,
          label: formatEventType(event.event_type),
          amount: event.amount,
          initiatedBy: 'pm',
          waitingOn: 'controller',
          actionPayload: { eventId: event.id, loanId: event.loan_id },
        });
      }
    }

    // 2. Unconfirmed AFAS draws/repayments
    if (drawsData?.transactions) {
      for (const tx of drawsData.transactions) {
        if (tx.isConfirmed) continue;
        items.push({
          id: `draw-${tx.afasRef}`,
          category: 'draw_confirmation',
          loanUuid: tx.loanUuid ?? '',
          loanNumericId: tx.loanId,
          borrowerName: tx.borrowerName,
          vehicle: tx.vehicle,
          yearMonth: tx.entryDate.slice(0, 7),
          effectiveDate: tx.entryDate,
          label: tx.type === 'draw' ? 'Draw (AFAS)' : 'Repayment (AFAS)',
          amount: tx.amount,
          initiatedBy: 'afas',
          waitingOn: 'pm',
          actionPayload: {
            loanUuid: tx.loanUuid,
            eventType: tx.type === 'draw' ? 'principal_draw' : 'principal_repayment',
            effectiveDate: tx.entryDate,
            amount: tx.amount,
            afasRef: tx.afasRef,
            afasDescription: tx.description,
          },
        });
      }
    }

    // 3. Payment confirmations — periods that are sent/approved but not paid
    // We detect these from pendingPeriods where status is not 'paid' and period has ended
    // The actual AFAS match data comes from the monthly approval hooks per month
    // For the overview, we just show periods that are past due and not paid
    if (pendingPeriods && loansData) {
      const cashLoans = new Set(loansData.filter(l => l.interest_type === 'cash_pay').map(l => l.id));
      for (const period of pendingPeriods) {
        if (!cashLoans.has(period.loan_id)) continue;
        const loan = loanMap.get(period.loan_id);
        if (!loan) continue;

        // Period approval items (periods that haven't been approved yet)
        if (period.status === 'open' || period.status === 'submitted') {
          items.push({
            id: `period-${period.id}`,
            category: 'period_approval',
            loanUuid: period.loan_id,
            loanNumericId: loan.loan_id,
            borrowerName: loan.borrower_name,
            vehicle: loan.vehicle ?? '',
            yearMonth: period.period_start.slice(0, 7),
            effectiveDate: period.period_end,
            label: `Period ${period.period_start.slice(5, 7)}/${period.period_start.slice(0, 4)}`,
            amount: null,
            initiatedBy: 'system',
            waitingOn: 'controller',
            actionPayload: { periodId: period.id, yearMonth: period.period_start.slice(0, 7) },
          });
        }
      }
    }

    // 4. PIK periods needing roll-up
    if (pendingPeriods && loansData) {
      const pikLoans = new Set(loansData.filter(l => l.interest_type === 'pik').map(l => l.id));
      const pikCapByLoan = new Map<string, Set<string>>();
      for (const e of pikCapEvents ?? []) {
        if (!pikCapByLoan.has(e.loan_id)) pikCapByLoan.set(e.loan_id, new Set());
        // Use effective_date month as key
        pikCapByLoan.get(e.loan_id)!.add(e.effective_date.slice(0, 7));
      }

      for (const period of pendingPeriods) {
        if (!pikLoans.has(period.loan_id)) continue;
        const loan = loanMap.get(period.loan_id);
        if (!loan) continue;
        const periodMonth = period.period_start.slice(0, 7);
        const hasCapEvent = pikCapByLoan.get(period.loan_id)?.has(periodMonth);

        if (!hasCapEvent) {
          items.push({
            id: `pik-${period.id}`,
            category: 'pik_rollup',
            loanUuid: period.loan_id,
            loanNumericId: loan.loan_id,
            borrowerName: loan.borrower_name,
            vehicle: loan.vehicle ?? '',
            yearMonth: periodMonth,
            effectiveDate: period.period_end,
            label: `PIK Roll-Up ${period.period_start.slice(5, 7)}/${period.period_start.slice(0, 4)}`,
            amount: null,
            initiatedBy: 'system',
            waitingOn: 'pm',
            actionPayload: { periodId: period.id, loanId: period.loan_id },
          });
        }
      }
    }

    // Deduplicate: period_approval items for PIK loans that already have a pik_rollup item
    const pikPeriodIds = new Set(items.filter(i => i.category === 'pik_rollup').map(i => i.actionPayload.periodId));
    const deduped = items.filter(i => {
      if (i.category === 'period_approval' && pikPeriodIds.has(i.actionPayload.periodId)) return false;
      return true;
    });

    // Sort by date descending
    deduped.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

    const summary: OutstandingApprovalsSummary = {
      draftEvents: deduped.filter(i => i.category === 'event_approval').length,
      pendingDraws: deduped.filter(i => i.category === 'draw_confirmation').length,
      pendingPayments: deduped.filter(i => i.category === 'payment_confirmation').length,
      pendingPeriods: deduped.filter(i => i.category === 'period_approval').length,
      pikRollups: deduped.filter(i => i.category === 'pik_rollup').length,
      total: deduped.length,
    };

    return { items: deduped, summary };
  }, [draftEvents, drawsData, pendingPeriods, loansData, pikCapEvents]);

  // Group by yearMonth
  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, OutstandingItem[]>();
    for (const item of items) {
      const existing = groups.get(item.yearMonth);
      if (existing) existing.push(item);
      else groups.set(item.yearMonth, [item]);
    }
    // Sort months descending
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  return {
    items,
    groupedByMonth,
    summary,
    isLoading: draftsLoading || loansLoading || drawsLoading || periodsLoading || pikLoading,
  };
}
