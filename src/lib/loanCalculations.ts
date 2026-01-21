import { LoanEvent, Period, InterestType } from '@/types/loan';
import { daysBetween30360 } from './format';

/**
 * Represents the state of a loan at a specific point in time.
 * This is derived by replaying events from the ledger.
 */
export interface LoanState {
  date: string;
  outstandingPrincipal: number;
  currentRate: number;
  interestType: InterestType;
  totalCommitment: number;
  undrawnCommitment: number;
}

/**
 * Represents a single day's accrual calculation
 */
export interface DailyAccrual {
  date: string;
  principal: number;
  rate: number;
  interestType: InterestType;
  dailyInterest: number;
  cumulativeInterest: number;
  commitment: number;
  undrawn: number;
  commitmentFee: number;
  cumulativeCommitmentFee: number;
}

/**
 * Represents the accruals for a single period
 */
export interface PeriodAccrual {
  periodId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  days: number;
  
  // Opening balances
  openingPrincipal: number;
  openingRate: number;
  openingCommitment: number;
  openingUndrawn: number;
  
  // Movements during period
  principalDrawn: number;
  principalRepaid: number;
  pikCapitalized: number;
  
  // Closing balances
  closingPrincipal: number;
  closingRate: number;
  closingCommitment: number;
  closingUndrawn: number;
  
  // Calculated accruals
  interestAccrued: number;
  commitmentFeeAccrued: number;
  commitmentFeeRate: number;
  avgUndrawnAmount: number;
  feesInvoiced: number;
  
  // Total due for the period
  totalDue: number;
  
  // Daily breakdown for drill-down
  dailyAccruals: DailyAccrual[];
  
  // Interest accrual segments (when rate changes mid-period)
  interestSegments: InterestSegment[];
  
  // Commitment fee segments (when undrawn changes)
  commitmentFeeSegments: CommitmentFeeSegment[];
}

/**
 * Represents a segment of commitment fee calculation
 */
export interface CommitmentFeeSegment {
  startDate: string;
  endDate: string;
  days: number;
  commitment: number;
  undrawn: number;
  feeRate: number;
  fee: number;
}

/**
 * Represents a segment of interest calculation when rates change mid-period
 */
export interface InterestSegment {
  startDate: string;
  endDate: string;
  days: number;
  principal: number;
  rate: number;
  interest: number;
  interestType: InterestType;
}

/**
 * Sorts events by effective date (ascending)
 */
export function sortEventsByDate(events: LoanEvent[]): LoanEvent[] {
  return [...events]
    .filter(e => e.status === 'approved') // Only use approved events for calculations
    .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());
}

/**
 * Gets the loan state at a specific date by replaying all events up to that date.
 * This is the core function that derives current state from the event ledger.
 */
export function getLoanStateAtDate(
  events: LoanEvent[],
  targetDate: string,
  initialCommitment: number = 0,
  defaultInterestType: InterestType = 'cash_pay'
): LoanState {
  const sortedEvents = sortEventsByDate(events);
  const targetTime = new Date(targetDate).getTime();
  
  let state: LoanState = {
    date: targetDate,
    outstandingPrincipal: 0,
    currentRate: 0,
    interestType: defaultInterestType,
    totalCommitment: initialCommitment,
    undrawnCommitment: initialCommitment,
  };
  
  for (const event of sortedEvents) {
    const eventTime = new Date(event.effective_date).getTime();
    if (eventTime > targetTime) break;
    
    state = applyEventToState(state, event);
  }
  
  state.date = targetDate;
  return state;
}

/**
 * Applies a single event to the loan state, returning a new state.
 * This is a pure function that doesn't mutate the input.
 */
export function applyEventToState(state: LoanState, event: LoanEvent): LoanState {
  const newState = { ...state, date: event.effective_date };
  
  switch (event.event_type) {
    case 'principal_draw':
      newState.outstandingPrincipal += event.amount || 0;
      newState.undrawnCommitment = Math.max(0, newState.totalCommitment - newState.outstandingPrincipal);
      break;
      
    case 'principal_repayment':
      newState.outstandingPrincipal -= event.amount || 0;
      newState.outstandingPrincipal = Math.max(0, newState.outstandingPrincipal);
      newState.undrawnCommitment = Math.max(0, newState.totalCommitment - newState.outstandingPrincipal);
      break;
      
    case 'interest_rate_set':
    case 'interest_rate_change':
      newState.currentRate = event.rate || 0;
      break;
      
    case 'pik_flag_set':
      // Metadata should contain the interest type, default to cash_pay
      newState.interestType = (event.metadata?.interest_type as InterestType) || 'cash_pay';
      break;
      
    case 'commitment_set':
      newState.totalCommitment = event.amount || 0;
      newState.undrawnCommitment = Math.max(0, newState.totalCommitment - newState.outstandingPrincipal);
      break;
      
    case 'commitment_change':
      newState.totalCommitment += event.amount || 0;
      newState.undrawnCommitment = Math.max(0, newState.totalCommitment - newState.outstandingPrincipal);
      break;
      
    case 'commitment_cancel':
      newState.totalCommitment -= event.amount || 0;
      newState.totalCommitment = Math.max(0, newState.totalCommitment);
      newState.undrawnCommitment = Math.max(0, newState.totalCommitment - newState.outstandingPrincipal);
      break;
      
    case 'pik_capitalization_posted':
      // PIK interest is capitalized (added to principal)
      newState.outstandingPrincipal += event.amount || 0;
      break;
      
    case 'fee_invoice':
      // PIK fees are capitalized (added to principal) when payment_type is 'pik'
      const feeMetadata = event.metadata as Record<string, unknown>;
      if (feeMetadata?.payment_type === 'pik') {
        newState.outstandingPrincipal += event.amount || 0;
        newState.undrawnCommitment = Math.max(0, newState.totalCommitment - newState.outstandingPrincipal);
      }
      break;
      
    // cash_received doesn't affect loan state, just records cash flows
    default:
      break;
  }
  
  return newState;
}

/**
 * Calculates daily interest using 30/360 day count convention
 * Daily rate = annual rate / 360
 */
export function calculateDailyInterest(principal: number, annualRate: number): number {
  return (principal * annualRate) / 360;
}

/**
 * Calculates daily commitment fee on undrawn amount using 30/360
 */
export function calculateDailyCommitmentFee(
  undrawnAmount: number,
  annualFeeRate: number
): number {
  return (undrawnAmount * annualFeeRate) / 360;
}

/**
 * Generates daily accruals for a date range.
 * Handles rate changes and principal movements within the period.
 */
export function calculateDailyAccruals(
  events: LoanEvent[],
  startDate: string,
  endDate: string,
  commitmentFeeRate: number = 0,
  initialCommitment: number = 0
): DailyAccrual[] {
  const dailyAccruals: DailyAccrual[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let cumulativeInterest = 0;
  let cumulativeCommitmentFee = 0;
  
  // Get initial state at start of period
  const dayBeforeStart = new Date(start);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const state = getLoanStateAtDate(events, dateStr, initialCommitment);
    
    const dailyInterest = calculateDailyInterest(state.outstandingPrincipal, state.currentRate);
    const dailyCommitmentFee = calculateDailyCommitmentFee(state.undrawnCommitment, commitmentFeeRate);
    
    cumulativeInterest += dailyInterest;
    cumulativeCommitmentFee += dailyCommitmentFee;
    
    dailyAccruals.push({
      date: dateStr,
      principal: state.outstandingPrincipal,
      rate: state.currentRate,
      interestType: state.interestType,
      dailyInterest,
      cumulativeInterest,
      commitment: state.totalCommitment,
      undrawn: state.undrawnCommitment,
      commitmentFee: dailyCommitmentFee,
      cumulativeCommitmentFee,
    });
  }
  
  return dailyAccruals;
}

/**
 * Identifies interest calculation segments when rate or principal changes.
 * Each segment represents a contiguous period with the same rate/principal.
 */
export function calculateInterestSegments(
  events: LoanEvent[],
  startDate: string,
  endDate: string,
  initialCommitment: number = 0
): InterestSegment[] {
  const segments: InterestSegment[] = [];
  const sortedEvents = sortEventsByDate(events);
  
  // Get state at start of period
  const startState = getLoanStateAtDate(sortedEvents, startDate, initialCommitment);
  
  // Find all events that affect interest calculation within the period
  const relevantEventTypes = [
    'principal_draw',
    'principal_repayment',
    'interest_rate_set',
    'interest_rate_change',
    'pik_capitalization_posted',
  ];
  
  const periodEvents = sortedEvents.filter(e => {
    const eventDate = new Date(e.effective_date);
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    return eventDate > periodStart && 
           eventDate <= periodEnd && 
           relevantEventTypes.includes(e.event_type);
  });
  
  // Build segments based on when state changes
  let segmentStart = startDate;
  let currentState = startState;
  
  for (const event of periodEvents) {
    // Close current segment at the day before the event
    const eventDate = new Date(event.effective_date);
    const segmentEnd = new Date(eventDate);
    segmentEnd.setDate(segmentEnd.getDate() - 1);
    
    if (new Date(segmentStart) <= segmentEnd) {
      const days = daysBetween30360(segmentStart, segmentEnd.toISOString().split('T')[0]);
      const interest = currentState.outstandingPrincipal * currentState.currentRate * (days / 360);
      
      segments.push({
        startDate: segmentStart,
        endDate: segmentEnd.toISOString().split('T')[0],
        days,
        principal: currentState.outstandingPrincipal,
        rate: currentState.currentRate,
        interest,
        interestType: currentState.interestType,
      });
    }
    
    // Apply event and start new segment
    currentState = applyEventToState(currentState, event);
    segmentStart = event.effective_date;
  }
  
  // Close final segment
  const days = daysBetween30360(segmentStart, endDate);
  if (days > 0) {
    const interest = currentState.outstandingPrincipal * currentState.currentRate * (days / 360);
    
    segments.push({
      startDate: segmentStart,
      endDate: endDate,
      days,
      principal: currentState.outstandingPrincipal,
      rate: currentState.currentRate,
      interest,
      interestType: currentState.interestType,
    });
  }
  
  return segments;
}

/**
 * Calculates commitment fee segments when undrawn amount changes.
 */
export function calculateCommitmentFeeSegments(
  events: LoanEvent[],
  startDate: string,
  endDate: string,
  feeRate: number,
  initialCommitment: number = 0
): CommitmentFeeSegment[] {
  const segments: CommitmentFeeSegment[] = [];
  const sortedEvents = sortEventsByDate(events);
  
  // Get state at start of period
  const startState = getLoanStateAtDate(sortedEvents, startDate, initialCommitment);
  
  // Find all events that affect undrawn amount within the period
  const relevantEventTypes = [
    'principal_draw',
    'principal_repayment',
    'commitment_set',
    'commitment_change',
    'commitment_cancel',
  ];
  
  const periodEvents = sortedEvents.filter(e => {
    const eventDate = new Date(e.effective_date);
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    return eventDate > periodStart && 
           eventDate <= periodEnd && 
           relevantEventTypes.includes(e.event_type);
  });
  
  // Build segments based on when undrawn changes
  let segmentStart = startDate;
  let currentState = startState;
  
  for (const event of periodEvents) {
    // Close current segment at the day before the event
    const eventDate = new Date(event.effective_date);
    const segmentEnd = new Date(eventDate);
    segmentEnd.setDate(segmentEnd.getDate() - 1);
    
    if (new Date(segmentStart) <= segmentEnd) {
      const days = daysBetween30360(segmentStart, segmentEnd.toISOString().split('T')[0]);
      const fee = currentState.undrawnCommitment * feeRate * (days / 360);
      
      segments.push({
        startDate: segmentStart,
        endDate: segmentEnd.toISOString().split('T')[0],
        days,
        commitment: currentState.totalCommitment,
        undrawn: currentState.undrawnCommitment,
        feeRate,
        fee,
      });
    }
    
    // Apply event and start new segment
    currentState = applyEventToState(currentState, event);
    segmentStart = event.effective_date;
  }
  
  // Close final segment
  const days = daysBetween30360(segmentStart, endDate);
  if (days > 0) {
    const fee = currentState.undrawnCommitment * feeRate * (days / 360);
    
    segments.push({
      startDate: segmentStart,
      endDate: endDate,
      days,
      commitment: currentState.totalCommitment,
      undrawn: currentState.undrawnCommitment,
      feeRate,
      fee,
    });
  }
  
  return segments;
}

/**
 * Calculates comprehensive accruals for a single period.
 */
export function calculatePeriodAccruals(
  period: Period,
  events: LoanEvent[],
  commitmentFeeRate: number = 0,
  initialCommitment: number = 0,
  loanInterestType: InterestType = 'cash_pay'
): PeriodAccrual {
  const sortedEvents = sortEventsByDate(events);
  const periodStart = period.period_start;
  const periodEnd = period.period_end;
  const days = daysBetween30360(periodStart, periodEnd);
  
  // Get opening state (day before period start)
  const dayBefore = new Date(periodStart);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const openingState = getLoanStateAtDate(sortedEvents, dayBefore.toISOString().split('T')[0], initialCommitment, loanInterestType);
  
  // Get closing state (end of period)
  const closingState = getLoanStateAtDate(sortedEvents, periodEnd, initialCommitment, loanInterestType);
  
  // Calculate movements during period
  const periodEvents = sortedEvents.filter(e => {
    const eventDate = new Date(e.effective_date);
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    return eventDate >= start && eventDate <= end;
  });
  
  let principalDrawn = 0;
  let principalRepaid = 0;
  let pikCapitalized = 0;
  let feesInvoiced = 0;
  
  for (const event of periodEvents) {
    switch (event.event_type) {
      case 'principal_draw':
        principalDrawn += event.amount || 0;
        break;
      case 'principal_repayment':
        principalRepaid += event.amount || 0;
        break;
      case 'pik_capitalization_posted':
        pikCapitalized += event.amount || 0;
        break;
      case 'fee_invoice':
        feesInvoiced += event.amount || 0;
        break;
    }
  }
  
  // Calculate interest segments
  const interestSegments = calculateInterestSegments(sortedEvents, periodStart, periodEnd, initialCommitment);
  const interestAccrued = interestSegments.reduce((sum, seg) => sum + seg.interest, 0);
  
  // Calculate daily accruals for detailed view
  const dailyAccruals = calculateDailyAccruals(sortedEvents, periodStart, periodEnd, commitmentFeeRate, initialCommitment);
  const commitmentFeeAccrued = dailyAccruals.reduce((sum, day) => sum + day.commitmentFee, 0);
  
  // Calculate average undrawn amount for the period
  const avgUndrawnAmount = dailyAccruals.length > 0 
    ? dailyAccruals.reduce((sum, day) => sum + day.undrawn, 0) / dailyAccruals.length
    : 0;
  
  // Build commitment fee segments
  const commitmentFeeSegments = calculateCommitmentFeeSegments(
    sortedEvents, 
    periodStart, 
    periodEnd, 
    commitmentFeeRate, 
    initialCommitment
  );
  
  // Total due (cash pay interest + commitment fee + invoiced fees)
  const cashPayInterest = interestSegments
    .filter(seg => seg.interestType === 'cash_pay')
    .reduce((sum, seg) => sum + seg.interest, 0);
  
  const totalDue = cashPayInterest + commitmentFeeAccrued + feesInvoiced;
  
  // For PIK loans, the closing principal should include the interest charge
  // that will be capitalized at period end
  const interestCharge = interestAccrued + commitmentFeeAccrued;
  const isPikLoan = openingState.interestType === 'pik';
  
  // Calculate projected closing principal:
  // If PIK has already been posted (pikCapitalized > 0), use the actual closing state
  // Otherwise, project what it will be after capitalization
  const projectedClosingPrincipal = isPikLoan
    ? (pikCapitalized > 0 
        // PIK already posted - use actual closing balance
        ? closingState.outstandingPrincipal
        // PIK not yet posted - project the closing balance
        : openingState.outstandingPrincipal + principalDrawn - principalRepaid + feesInvoiced + interestCharge)
    : closingState.outstandingPrincipal;
  
  return {
    periodId: period.id,
    periodStart,
    periodEnd,
    status: period.status,
    days,
    openingPrincipal: openingState.outstandingPrincipal,
    openingRate: openingState.currentRate,
    openingCommitment: openingState.totalCommitment,
    openingUndrawn: openingState.undrawnCommitment,
    principalDrawn,
    principalRepaid,
    pikCapitalized,
    closingPrincipal: projectedClosingPrincipal,
    closingRate: closingState.currentRate,
    closingCommitment: closingState.totalCommitment,
    closingUndrawn: closingState.undrawnCommitment,
    interestAccrued,
    commitmentFeeAccrued,
    commitmentFeeRate,
    avgUndrawnAmount,
    feesInvoiced,
    totalDue,
    dailyAccruals,
    interestSegments,
    commitmentFeeSegments,
  };
}

/**
 * Calculates accruals for all periods of a loan.
 */
export function calculateAllPeriodAccruals(
  periods: Period[],
  events: LoanEvent[],
  commitmentFeeRate: number = 0,
  initialCommitment: number = 0,
  loanInterestType: InterestType = 'cash_pay'
): PeriodAccrual[] {
  return periods
    .sort((a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime())
    .map(period => calculatePeriodAccruals(period, events, commitmentFeeRate, initialCommitment, loanInterestType));
}

/**
 * Summary statistics across all periods
 */
export interface AccrualsSummary {
  totalDays: number;
  totalInterestAccrued: number;
  totalCommitmentFees: number;
  totalFeesInvoiced: number;
  totalPikCapitalized: number;
  totalDue: number;
  currentPrincipal: number;
  currentRate: number;
  averageRate: number;
  // Commitment breakdown
  totalCommitment: number;
  currentUndrawn: number;
  commitmentFeeRate: number;
}

/**
 * Calculates summary statistics for all period accruals
 */
export function calculateAccrualsSummary(periodAccruals: PeriodAccrual[]): AccrualsSummary {
  if (periodAccruals.length === 0) {
    return {
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
    };
  }
  
  const lastPeriod = periodAccruals[periodAccruals.length - 1];
  
  // Calculate weighted average rate
  let totalPrincipalDays = 0;
  let weightedRateSum = 0;
  
  for (const pa of periodAccruals) {
    for (const seg of pa.interestSegments) {
      const principalDays = seg.principal * seg.days;
      totalPrincipalDays += principalDays;
      weightedRateSum += seg.rate * principalDays;
    }
  }
  
  const averageRate = totalPrincipalDays > 0 ? weightedRateSum / totalPrincipalDays : 0;
  
  return {
    totalDays: periodAccruals.reduce((sum, pa) => sum + pa.days, 0),
    totalInterestAccrued: periodAccruals.reduce((sum, pa) => sum + pa.interestAccrued, 0),
    totalCommitmentFees: periodAccruals.reduce((sum, pa) => sum + pa.commitmentFeeAccrued, 0),
    totalFeesInvoiced: periodAccruals.reduce((sum, pa) => sum + pa.feesInvoiced, 0),
    totalPikCapitalized: periodAccruals.reduce((sum, pa) => sum + pa.pikCapitalized, 0),
    totalDue: periodAccruals.reduce((sum, pa) => sum + pa.totalDue, 0),
    currentPrincipal: lastPeriod.closingPrincipal,
    currentRate: lastPeriod.closingRate,
    averageRate,
    totalCommitment: lastPeriod.closingCommitment,
    currentUndrawn: lastPeriod.closingUndrawn,
    commitmentFeeRate: lastPeriod.commitmentFeeRate,
  };
}
