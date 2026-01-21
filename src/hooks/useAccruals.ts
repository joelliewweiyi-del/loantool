import { useMemo } from 'react';
import { useLoan, useLoanEvents, useLoanPeriods } from './useLoans';
import {
  calculateAllPeriodAccruals,
  calculateAccrualsSummary,
  getLoanStateAtDate,
  sortEventsByDate,
  PeriodAccrual,
  AccrualsSummary,
} from '@/lib/loanCalculations';

export interface UseAccrualsResult {
  periodAccruals: PeriodAccrual[];
  summary: AccrualsSummary;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to calculate and return accruals data for a loan.
 * Derives all accrual information from the event ledger.
 * When no periods exist, derives current state directly from events.
 */
export function useAccruals(loanId: string | undefined): UseAccrualsResult {
  const { data: loan, isLoading: loanLoading, error: loanError } = useLoan(loanId);
  const { data: events, isLoading: eventsLoading, error: eventsError } = useLoanEvents(loanId);
  const { data: periods, isLoading: periodsLoading, error: periodsError } = useLoanPeriods(loanId);

  const isLoading = loanLoading || eventsLoading || periodsLoading;
  const error = loanError || eventsError || periodsError || null;

  const result = useMemo(() => {
    if (!loan || !events) {
      return {
        periodAccruals: [],
        summary: {
          totalDays: 0,
          totalInterestAccrued: 0,
          totalCommitmentFees: 0,
          totalFeesInvoiced: 0,
          totalPikCapitalized: 0,
          totalDue: 0,
          currentPrincipal: 0,
          currentRate: 0,
          averageRate: 0,
          totalCommitment: 0,
          currentUndrawn: 0,
          commitmentFeeRate: 0,
        },
      };
    }

    const commitmentFeeRate = loan.commitment_fee_rate || 0;
    const initialCommitment = loan.total_commitment || 0;
    const loanInterestType = (loan.interest_type as 'cash_pay' | 'pik') || 'cash_pay';

    // If no periods exist, derive current state from events directly
    if (!periods || periods.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const currentState = getLoanStateAtDate(
        sortEventsByDate(events),
        today,
        initialCommitment,
        loanInterestType
      );

      return {
        periodAccruals: [],
        summary: {
          totalDays: 0,
          totalInterestAccrued: 0,
          totalCommitmentFees: 0,
          totalFeesInvoiced: 0,
          totalPikCapitalized: 0,
          totalDue: 0,
          currentPrincipal: currentState.outstandingPrincipal,
          currentRate: currentState.currentRate,
          averageRate: currentState.currentRate,
          totalCommitment: currentState.totalCommitment,
          currentUndrawn: currentState.undrawnCommitment,
          commitmentFeeRate: commitmentFeeRate,
        },
      };
    }

    const periodAccruals = calculateAllPeriodAccruals(
      periods,
      events,
      commitmentFeeRate,
      initialCommitment,
      loanInterestType
    );

    // Pass approved events to calculate current principal from event ledger only
    const approvedEvents = events.filter(e => e.status === 'approved');
    const summary = calculateAccrualsSummary(periodAccruals, approvedEvents);

    return { periodAccruals, summary };
  }, [loan, events, periods]);

  return {
    ...result,
    isLoading,
    error,
  };
}
