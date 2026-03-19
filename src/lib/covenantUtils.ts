/**
 * Derive a due date from a period_label when no explicit due_date is set.
 * "Q1 2026" → "2026-03-31", "Q2 2026" → "2026-06-30", "2025" → "2025-12-31", "FY2024" → "2024-12-31"
 */
export function inferDueDate(periodLabel: string): string | null {
  const qMatch = periodLabel.match(/^Q(\d)\s+(\d{4})$/);
  if (qMatch) {
    const q = parseInt(qMatch[1]);
    const y = qMatch[2];
    switch (q) {
      case 1: return `${y}-03-31`;
      case 2: return `${y}-06-30`;
      case 3: return `${y}-09-30`;
      case 4: return `${y}-12-31`;
    }
  }

  const yearMatch = periodLabel.match(/^(\d{4})$/);
  if (yearMatch) return `${yearMatch[1]}-12-31`;

  const fyMatch = periodLabel.match(/^FY(\d{4})$/);
  if (fyMatch) return `${fyMatch[1]}-12-31`;

  return null;
}

/** Get the effective due date: explicit due_date, or inferred from period_label */
export function effectiveDueDate(dueDate: string | null, periodLabel: string): string | null {
  return dueDate || inferDueDate(periodLabel);
}
