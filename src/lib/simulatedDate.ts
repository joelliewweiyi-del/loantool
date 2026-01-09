/**
 * Simulated current date for development/demo purposes.
 * Change this to test different time periods.
 * Set to null to use the actual current date.
 */
export const SIMULATED_DATE = new Date('2026-06-15');

/**
 * Returns the simulated current date, or actual date if simulation is disabled.
 */
export function getCurrentDate(): Date {
  return SIMULATED_DATE || new Date();
}

/**
 * Returns the simulated current date as an ISO string (date only).
 */
export function getCurrentDateString(): string {
  return getCurrentDate().toISOString().split('T')[0];
}
