import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, addMonths, format, parseISO, isBefore, isAfter } from 'date-fns';
import { getCurrentDate } from '@/lib/simulatedDate';
import type { Database } from '@/integrations/supabase/types';

type PeriodInsert = Database['public']['Tables']['periods']['Insert'];

/**
 * Generates missing monthly period records for all active loans.
 * For each loan, finds the latest existing period and generates new periods
 * from the following month through the end of the current month.
 */
export function useGeneratePeriods() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // 1. Fetch all active loans
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('id, loan_start_date, maturity_date, status')
        .eq('status', 'active');
      if (loansError) throw loansError;
      if (!loans || loans.length === 0) return { generated: 0, loans: 0 };

      // 2. For each loan, find the latest period_end
      const loanIds = loans.map(l => l.id);
      const { data: periods, error: periodsError } = await supabase
        .from('periods')
        .select('loan_id, period_end')
        .in('loan_id', loanIds)
        .order('period_end', { ascending: false });
      if (periodsError) throw periodsError;

      // Build map: loan_id → latest period_end
      const latestPeriodEnd = new Map<string, string>();
      for (const p of periods ?? []) {
        if (!latestPeriodEnd.has(p.loan_id)) {
          latestPeriodEnd.set(p.loan_id, p.period_end);
        }
      }

      // 3. Generate missing periods
      const today = getCurrentDate();
      const endOfCurrentMonth = endOfMonth(today);
      const newPeriods: PeriodInsert[] = [];

      for (const loan of loans) {
        const lastEnd = latestPeriodEnd.get(loan.id);
        if (!lastEnd) {
          // Loan has no periods at all — generate from loan start
          if (loan.loan_start_date) {
            newPeriods.push(...generatePeriodsFromDate(
              loan.id,
              loan.loan_start_date,
              loan.maturity_date,
              endOfCurrentMonth,
            ));
          }
          continue;
        }

        const lastEndDate = parseISO(lastEnd);
        // If last period already covers or extends past current month, skip
        if (!isBefore(lastEndDate, endOfCurrentMonth)) continue;

        // If maturity is before or at last period end, skip (loan fully covered)
        if (loan.maturity_date && !isAfter(parseISO(loan.maturity_date), lastEndDate)) continue;

        // Generate from the month after lastEnd through current month
        const nextMonthStart = startOfMonth(addMonths(lastEndDate, 1));
        const effectiveEnd = loan.maturity_date && isBefore(parseISO(loan.maturity_date), endOfCurrentMonth)
          ? parseISO(loan.maturity_date)
          : endOfCurrentMonth;

        let current = nextMonthStart;
        while (isBefore(current, effectiveEnd) || format(current, 'yyyy-MM') === format(effectiveEnd, 'yyyy-MM')) {
          const monthEnd = endOfMonth(current);
          const periodStart = format(current, 'yyyy-MM-dd');
          const periodEnd = loan.maturity_date && isBefore(parseISO(loan.maturity_date), monthEnd)
            ? loan.maturity_date
            : format(monthEnd, 'yyyy-MM-dd');

          newPeriods.push({
            loan_id: loan.id,
            period_start: periodStart,
            period_end: periodEnd,
            status: 'open',
            processing_mode: 'auto',
          });

          current = addMonths(current, 1);
          if (newPeriods.length >= 5000) break; // safety limit
        }
      }

      if (newPeriods.length === 0) return { generated: 0, loans: 0 };

      // 4. Insert in batches
      const batchSize = 500;
      const loansWithNewPeriods = new Set(newPeriods.map(p => p.loan_id));

      for (let i = 0; i < newPeriods.length; i += batchSize) {
        const batch = newPeriods.slice(i, i + batchSize);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('periods').insert(batch as any);
        if (error) throw new Error(`Failed to insert periods batch: ${error.message}`);
      }

      return { generated: newPeriods.length, loans: loansWithNewPeriods.size };
    },
    onSuccess: (result) => {
      if (result.generated === 0) {
        toast({ title: 'All periods up to date', description: 'No new periods needed.' });
      } else {
        toast({
          title: 'Periods generated',
          description: `Created ${result.generated} period(s) across ${result.loans} loan(s).`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-periods'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-approval'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to generate periods', description: error.message, variant: 'destructive' });
    },
  });
}

/** Generate period records from a start date to an end boundary. */
function generatePeriodsFromDate(
  loanId: string,
  startDate: string,
  maturityDate: string | null,
  endBoundary: Date,
): PeriodInsert[] {
  const periods: PeriodInsert[] = [];
  const start = parseISO(startDate);
  const effectiveEnd = maturityDate && isBefore(parseISO(maturityDate), endBoundary)
    ? parseISO(maturityDate)
    : endBoundary;

  let current = startOfMonth(start);
  while (isBefore(current, effectiveEnd) || format(current, 'yyyy-MM') === format(effectiveEnd, 'yyyy-MM')) {
    const monthEnd = endOfMonth(current);
    const periodStart = periods.length === 0 && isAfter(start, current)
      ? format(start, 'yyyy-MM-dd')
      : format(current, 'yyyy-MM-dd');
    const periodEnd = maturityDate && isBefore(parseISO(maturityDate), monthEnd)
      ? maturityDate
      : format(monthEnd, 'yyyy-MM-dd');

    periods.push({
      loan_id: loanId,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'open',
      processing_mode: 'auto',
    });

    current = addMonths(current, 1);
    if (periods.length >= 600) break;
  }
  return periods;
}
