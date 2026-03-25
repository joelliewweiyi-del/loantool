import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculatePeriodAccruals, InterestSegment, CommitmentFeeSegment, PeriodAccrual } from '@/lib/loanCalculations';
import type { LoanEvent, InterestType, Period } from '@/types/loan';

export interface CalcSheetRow {
  // Loan info
  loanId: string;          // numeric ID e.g. "516"
  loanUuid: string;
  borrowerName: string;
  vehicle: string;
  interestType: InterestType;

  // Period info
  periodStart: string;
  periodEnd: string;
  periodStatus: string;

  // Row type: 'interest' | 'commitment_fee' | 'loan_subtotal' | 'vehicle_subtotal' | 'grand_total'
  rowType: 'interest' | 'commitment_fee' | 'loan_subtotal' | 'vehicle_subtotal' | 'grand_total';

  // Segment info (for interest / commitment_fee rows)
  segmentIndex?: number;
  segmentCount?: number;
  segStartDate?: string;
  segEndDate?: string;
  days?: number;
  baseAmount?: number;      // principal or undrawn
  rate?: number;
  amount?: number;           // calculated interest or fee
  formula?: string;          // e.g. "€2,500,000 × 8.50% × 30/360"

  // Event that caused segment boundary
  boundaryEvent?: string;    // e.g. "Draw +€500,000"

  // Subtotal fields
  totalInterest?: number;
  totalCommitmentFee?: number;
  totalDue?: number;

  // Opening/closing for context
  openingPrincipal?: number;
  closingPrincipal?: number;
  openingRate?: number;
  closingRate?: number;
}

export interface CalcSheetData {
  rows: CalcSheetRow[];
  month: string;
  totalInterest: number;
  totalCommitmentFee: number;
  totalDue: number;
  loanCount: number;
}

function formatEur(n: number): string {
  return `€${n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function buildFormula(base: number, rate: number, days: number): string {
  return `${formatEur(base)} × ${(rate * 100).toFixed(4)}% × ${days}/360`;
}

export function useCalculationSheet(yearMonth: string) {
  // 1. Fetch periods for this month
  const { data: periodsData, isLoading: periodsLoading } = useQuery({
    queryKey: ['calc-sheet-periods', yearMonth],
    queryFn: async () => {
      const startOfMonth = `${yearMonth}-01`;
      const endOfMonth = new Date(
        parseInt(yearMonth.split('-')[0]),
        parseInt(yearMonth.split('-')[1]),
        0
      ).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .gte('period_end', startOfMonth)
        .lte('period_start', endOfMonth)
        .order('period_start', { ascending: true });
      if (error) throw error;
      return data as Period[];
    },
    enabled: !!yearMonth,
  });

  const loanIds = useMemo(() => {
    if (!periodsData) return [];
    return [...new Set(periodsData.map(p => p.loan_id))];
  }, [periodsData]);

  // 2. Fetch loan metadata
  const { data: loansData, isLoading: loansLoading } = useQuery({
    queryKey: ['calc-sheet-loans', loanIds],
    queryFn: async () => {
      if (loanIds.length === 0) return [];
      const { data, error } = await supabase
        .from('loans')
        .select('id, loan_id, borrower_name, total_commitment, commitment_fee_rate, interest_type, vehicle')
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
      }>;
    },
    enabled: loanIds.length > 0,
  });

  // 3. Fetch all approved events for these loans
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['calc-sheet-events', loanIds],
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

  // 4. Build flat rows
  const result = useMemo((): CalcSheetData | null => {
    if (!periodsData || !loansData || !eventsData) return null;

    const loanMap = new Map(loansData.map(l => [l.id, l]));
    const eventsByLoan = new Map<string, LoanEvent[]>();
    for (const event of eventsData) {
      const existing = eventsByLoan.get(event.loan_id);
      if (existing) existing.push(event);
      else eventsByLoan.set(event.loan_id, [event]);
    }

    const rows: CalcSheetRow[] = [];
    let grandTotalInterest = 0;
    let grandTotalCommitmentFee = 0;
    let grandTotalDue = 0;

    // Group periods by vehicle, then by loan
    const byVehicle = new Map<string, Map<string, { loan: typeof loansData[0]; periods: Period[] }>>();
    for (const period of periodsData) {
      const loan = loanMap.get(period.loan_id);
      if (!loan) continue;
      const vehicle = loan.vehicle || 'Other';
      if (!byVehicle.has(vehicle)) byVehicle.set(vehicle, new Map());
      const vehicleMap = byVehicle.get(vehicle)!;
      if (!vehicleMap.has(loan.id)) vehicleMap.set(loan.id, { loan, periods: [] });
      vehicleMap.get(loan.id)!.periods.push(period);
    }

    for (const [vehicle, loanPeriods] of byVehicle) {
      let vehicleTotalInterest = 0;
      let vehicleTotalCommitmentFee = 0;
      let vehicleTotalDue = 0;

      for (const [, { loan, periods }] of loanPeriods) {
        const events = eventsByLoan.get(loan.id) ?? [];

        for (const period of periods) {
          const accruals = calculatePeriodAccruals(
            period,
            events,
            loan.commitment_fee_rate ?? 0,
            loan.total_commitment ?? 0,
            loan.interest_type ?? 'cash_pay'
          );

          // Find mid-period events for boundary descriptions
          const midPeriodEvents = events.filter(e => {
            const d = e.effective_date;
            return d > period.period_start && d < period.period_end;
          });

          // Interest segment rows
          const intSegs = accruals.interestSegments;
          for (let i = 0; i < intSegs.length; i++) {
            const seg = intSegs[i];
            // Find the event that starts this segment (if not the first)
            let boundaryEvent: string | undefined;
            if (i > 0) {
              const boundaryDate = seg.startDate;
              const ev = midPeriodEvents.find(e => e.effective_date === boundaryDate);
              if (ev) {
                const amt = ev.amount ? formatEur(ev.amount) : '';
                const sign = ['principal_draw', 'commitment_set', 'commitment_change'].includes(ev.event_type) ? '+' : '';
                boundaryEvent = `${ev.event_type.replace(/_/g, ' ')} ${sign}${amt}`.trim();
              }
            }

            rows.push({
              loanId: loan.loan_id,
              loanUuid: loan.id,
              borrowerName: loan.borrower_name,
              vehicle,
              interestType: loan.interest_type,
              periodStart: period.period_start,
              periodEnd: period.period_end,
              periodStatus: period.status,
              rowType: 'interest',
              segmentIndex: i + 1,
              segmentCount: intSegs.length,
              segStartDate: seg.startDate,
              segEndDate: seg.endDate,
              days: seg.days,
              baseAmount: seg.principal,
              rate: seg.rate,
              amount: seg.interest,
              formula: buildFormula(seg.principal, seg.rate, seg.days),
              boundaryEvent,
              openingPrincipal: accruals.openingPrincipal,
              closingPrincipal: accruals.closingPrincipal,
              openingRate: accruals.openingRate,
              closingRate: accruals.closingRate,
            });
          }

          // Commitment fee segment rows
          const feeSegs = accruals.commitmentFeeSegments;
          for (let i = 0; i < feeSegs.length; i++) {
            const seg = feeSegs[i];
            if (seg.fee === 0 && seg.undrawn === 0) continue; // skip zero undrawn

            let boundaryEvent: string | undefined;
            if (i > 0) {
              const ev = midPeriodEvents.find(e => e.effective_date === seg.startDate);
              if (ev) {
                const amt = ev.amount ? formatEur(ev.amount) : '';
                boundaryEvent = `${ev.event_type.replace(/_/g, ' ')} ${amt}`.trim();
              }
            }

            rows.push({
              loanId: loan.loan_id,
              loanUuid: loan.id,
              borrowerName: loan.borrower_name,
              vehicle,
              interestType: loan.interest_type,
              periodStart: period.period_start,
              periodEnd: period.period_end,
              periodStatus: period.status,
              rowType: 'commitment_fee',
              segmentIndex: i + 1,
              segmentCount: feeSegs.length,
              segStartDate: seg.startDate,
              segEndDate: seg.endDate,
              days: seg.days,
              baseAmount: seg.undrawn,
              rate: seg.feeRate,
              amount: seg.fee,
              formula: buildFormula(seg.undrawn, seg.feeRate, seg.days),
              boundaryEvent,
            });
          }

          // Loan-period subtotal
          rows.push({
            loanId: loan.loan_id,
            loanUuid: loan.id,
            borrowerName: loan.borrower_name,
            vehicle,
            interestType: loan.interest_type,
            periodStart: period.period_start,
            periodEnd: period.period_end,
            periodStatus: period.status,
            rowType: 'loan_subtotal',
            totalInterest: accruals.interestAccrued,
            totalCommitmentFee: accruals.commitmentFeeAccrued,
            totalDue: accruals.totalDue,
            openingPrincipal: accruals.openingPrincipal,
            closingPrincipal: accruals.closingPrincipal,
            openingRate: accruals.openingRate,
            closingRate: accruals.closingRate,
          });

          vehicleTotalInterest += accruals.interestAccrued;
          vehicleTotalCommitmentFee += accruals.commitmentFeeAccrued;
          vehicleTotalDue += accruals.totalDue;
        }
      }

      // Vehicle subtotal
      rows.push({
        loanId: '',
        loanUuid: '',
        borrowerName: '',
        vehicle,
        interestType: 'cash_pay',
        periodStart: '',
        periodEnd: '',
        periodStatus: '',
        rowType: 'vehicle_subtotal',
        totalInterest: vehicleTotalInterest,
        totalCommitmentFee: vehicleTotalCommitmentFee,
        totalDue: vehicleTotalDue,
      });

      grandTotalInterest += vehicleTotalInterest;
      grandTotalCommitmentFee += vehicleTotalCommitmentFee;
      grandTotalDue += vehicleTotalDue;
    }

    // Grand total
    rows.push({
      loanId: '',
      loanUuid: '',
      borrowerName: '',
      vehicle: '',
      interestType: 'cash_pay',
      periodStart: '',
      periodEnd: '',
      periodStatus: '',
      rowType: 'grand_total',
      totalInterest: grandTotalInterest,
      totalCommitmentFee: grandTotalCommitmentFee,
      totalDue: grandTotalDue,
    });

    return {
      rows,
      month: yearMonth,
      totalInterest: grandTotalInterest,
      totalCommitmentFee: grandTotalCommitmentFee,
      totalDue: grandTotalDue,
      loanCount: loansData.length,
    };
  }, [periodsData, loansData, eventsData]);

  return {
    data: result,
    isLoading: periodsLoading || loansLoading || eventsLoading,
  };
}
