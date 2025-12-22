import { useMemo } from 'react';
import { useLoan, useLoanEvents, useLoanPeriods } from './useLoans';
import {
  calculateAllPeriodAccruals,
  calculateAccrualsSummary,
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
 */
export function useAccruals(loanId: string | undefined): UseAccrualsResult {
  const { data: loan, isLoading: loanLoading, error: loanError } = useLoan(loanId);
  const { data: events, isLoading: eventsLoading, error: eventsError } = useLoanEvents(loanId);
  const { data: periods, isLoading: periodsLoading, error: periodsError } = useLoanPeriods(loanId);

  const isLoading = loanLoading || eventsLoading || periodsLoading;
  const error = loanError || eventsError || periodsError || null;

  const result = useMemo(() => {
    if (!loan || !events || !periods) {
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

    const periodAccruals = calculateAllPeriodAccruals(
      periods,
      events,
      commitmentFeeRate,
      initialCommitment
    );

    const summary = calculateAccrualsSummary(periodAccruals);

    return { periodAccruals, summary };
  }, [loan, events, periods]);

  return {
    ...result,
    isLoading,
    error,
  };
}
