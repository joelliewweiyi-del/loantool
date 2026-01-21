/**
 * Format a number as currency (EUR)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    currencyDisplay: 'symbol',
  }).format(amount);
}

/**
 * Format a number as a percentage
 */
export function formatPercent(rate: number | null | undefined, decimals = 2): string {
  if (rate === null || rate === undefined) return '—';
  return `${(rate * 100).toFixed(decimals)}%`;
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format a datetime for display
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Format event type for display
 */
export function formatEventType(type: string): string {
  // Custom labels for specific event types
  const labels: Record<string, string> = {
    'pik_capitalization_posted': 'Interest Charge',
    'principal_draw': 'Principal Draw',
    'principal_repayment': 'Principal Repayment',
    'interest_rate_set': 'Rate Set',
    'interest_rate_change': 'Rate Change',
    'commitment_set': 'Commitment Set',
    'commitment_change': 'Commitment Change',
    'commitment_cancel': 'Commitment Cancel',
    'fee_invoice': 'Fee Invoice',
    'cash_received': 'Cash Received',
    'pik_flag_set': 'PIK Flag Set',
  };
  
  if (labels[type]) {
    return labels[type];
  }
  
  // Fallback: convert snake_case to Title Case
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Calculate days between two dates using actual calendar days
 */
export function daysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days between two dates using 30/360 convention (US NASD method).
 * Each month is treated as 30 days, year as 360 days.
 * 
 * Formula: (Y2 - Y1) × 360 + (M2 - M1) × 30 + (D2 - D1)
 * 
 * Adjustments:
 * - If D1 is 31, change D1 to 30
 * - If D2 is 31 and D1 is 30 or 31, change D2 to 30
 * 
 * @param inclusive - If true, adds 1 to include both start and end dates (for period counting)
 */
export function daysBetween30360(
  startDate: string | Date, 
  endDate: string | Date,
  inclusive: boolean = true
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);
  
  let d1 = start.getUTCDate();
  let m1 = start.getUTCMonth() + 1;
  let y1 = start.getUTCFullYear();
  
  let d2 = end.getUTCDate();
  let m2 = end.getUTCMonth() + 1;
  let y2 = end.getUTCFullYear();
  
  // Adjustment rules (US NASD 30/360)
  if (d1 === 31) d1 = 30;
  if (d2 === 31 && d1 >= 30) d2 = 30;
  
  const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  
  // Add 1 for inclusive counting (both start and end dates count)
  return inclusive ? days + 1 : days;
}

/**
 * Calculate day count fraction for ACT/365 Fixed
 */
export function dayCountFraction(days: number): number {
  return days / 365;
}

/**
 * Calculate day count fraction for 30/360
 */
export function dayCountFraction30360(days: number): number {
  return days / 360;
}
