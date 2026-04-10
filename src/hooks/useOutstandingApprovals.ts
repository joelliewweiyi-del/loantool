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
  isFullRepayment?: boolean;
}

export interface OutstandingApprovalsSummary {
  draftEvents: number;
  pendingDraws: number;
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

    // 1. Draft events — aggregate by loan+month+event_type
    if (draftEvents) {
      const eventGroups = new Map<string, {
        eventIds: string[]; loanUuid: string; loanNumericId: string; borrowerName: string;
        vehicle: string; yearMonth: string; latestDate: string; eventType: string;
        totalAmount: number; count: number;
      }>();
      for (const event of draftEvents) {
        const loan = loanMap.get(event.loan_id);
        if (!loan) continue;
        const key = `${event.loan_id}|${event.effective_date.slice(0, 7)}|${event.event_type}`;
        const existing = eventGroups.get(key);
        if (existing) {
          existing.eventIds.push(event.id);
          existing.totalAmount += event.amount ?? 0;
          existing.count += 1;
          if (event.effective_date > existing.latestDate) existing.latestDate = event.effective_date;
        } else {
          eventGroups.set(key, {
            eventIds: [event.id],
            loanUuid: event.loan_id,
            loanNumericId: loan.loan_id,
            borrowerName: loan.borrower_name,
            vehicle: loan.vehicle ?? '',
            yearMonth: event.effective_date.slice(0, 7),
            latestDate: event.effective_date,
            eventType: event.event_type,
            totalAmount: event.amount ?? 0,
            count: 1,
          });
        }
      }
      for (const [, group] of eventGroups) {
        const typeLabel = formatEventType(group.eventType);
        const label = group.count === 1 ? typeLabel : `${group.count}× ${typeLabel}`;
        items.push({
          id: `event-${group.eventIds[0]}`,
          category: 'event_approval',
          loanUuid: group.loanUuid,
          loanNumericId: group.loanNumericId,
          borrowerName: group.borrowerName,
          vehicle: group.vehicle,
          yearMonth: group.yearMonth,
          effectiveDate: group.latestDate,
          label,
          amount: group.totalAmount,
          initiatedBy: 'pm',
          waitingOn: 'controller',
          actionPayload: { eventIds: group.eventIds, eventId: group.eventIds[0], loanId: group.loanUuid },
        });
      }
    }

    // 2. Unconfirmed AFAS draws/repayments — aggregate by loan+month
    if (drawsData?.transactions) {
      const pendingByLoanMonth = new Map<string, {
        loanUuid: string; loanId: string; borrowerName: string; vehicle: string;
        yearMonth: string; latestDate: string; totalAmount: number; count: number;
        draws: number; repayments: number; hasFullRepayment: boolean;
      }>();
      for (const tx of drawsData.transactions) {
        if (tx.isConfirmed) continue;
        const key = `${tx.loanId}|${tx.entryDate.slice(0, 7)}`;
        const existing = pendingByLoanMonth.get(key);
        if (existing) {
          existing.totalAmount += tx.amount;
          existing.count += 1;
          if (tx.type === 'draw') existing.draws += 1; else existing.repayments += 1;
          if (tx.entryDate > existing.latestDate) existing.latestDate = tx.entryDate;
          if (tx.isFullRepayment) existing.hasFullRepayment = true;
        } else {
          pendingByLoanMonth.set(key, {
            loanUuid: tx.loanUuid ?? '', loanId: tx.loanId,
            borrowerName: tx.borrowerName, vehicle: tx.vehicle,
            yearMonth: tx.entryDate.slice(0, 7), latestDate: tx.entryDate,
            totalAmount: tx.amount, count: 1,
            draws: tx.type === 'draw' ? 1 : 0, repayments: tx.type === 'repayment' ? 1 : 0,
            hasFullRepayment: !!tx.isFullRepayment,
          });
        }
      }
      for (const [, group] of pendingByLoanMonth) {
        const typeLabel = group.hasFullRepayment ? 'Full Repayment'
          : group.draws > 0 && group.repayments > 0 ? 'Mixed'
          : group.draws > 0 ? (group.count === 1 ? 'Draw' : `${group.count} Draws`)
          : (group.count === 1 ? 'Repayment' : `${group.count} Repayments`);
        items.push({
          id: `draw-${group.loanId}-${group.yearMonth}`,
          category: 'draw_confirmation',
          loanUuid: group.loanUuid,
          loanNumericId: group.loanId,
          borrowerName: group.borrowerName,
          vehicle: group.vehicle,
          yearMonth: group.yearMonth,
          effectiveDate: group.latestDate,
          label: `${typeLabel} (AFAS)`,
          amount: group.totalAmount,
          initiatedBy: 'afas',
          waitingOn: 'pm',
          actionPayload: { yearMonth: group.yearMonth },
          isFullRepayment: group.hasFullRepayment,
        });
      }
    }

    // 3. PIK periods needing roll-up
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

    const deduped = items;

    // Sort by date descending
    deduped.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

    const summary: OutstandingApprovalsSummary = {
      draftEvents: deduped.filter(i => i.category === 'event_approval').length,
      pendingDraws: deduped.filter(i => i.category === 'draw_confirmation').length,
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
