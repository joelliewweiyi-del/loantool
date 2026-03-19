-- Backfill due_date on covenant_submissions where it's NULL.
-- Derive from period_label: "Q1 2026" → end of Q1, "2025" → end of year, "FY2024" → end of year.

UPDATE covenant_submissions
SET due_date = CASE
  -- Quarterly: Q1 YYYY → March 31, Q2 → June 30, Q3 → Sept 30, Q4 → Dec 31
  WHEN period_label ~ '^Q1\s+\d{4}$' THEN
    make_date(substring(period_label from '\d{4}')::int, 3, 31)
  WHEN period_label ~ '^Q2\s+\d{4}$' THEN
    make_date(substring(period_label from '\d{4}')::int, 6, 30)
  WHEN period_label ~ '^Q3\s+\d{4}$' THEN
    make_date(substring(period_label from '\d{4}')::int, 9, 30)
  WHEN period_label ~ '^Q4\s+\d{4}$' THEN
    make_date(substring(period_label from '\d{4}')::int, 12, 31)
  -- Annual: "2025" or "FY2024" → Dec 31 of that year
  WHEN period_label ~ '^\d{4}$' THEN
    make_date(period_label::int, 12, 31)
  WHEN period_label ~ '^FY\d{4}$' THEN
    make_date(substring(period_label from '\d{4}')::int, 12, 31)
  ELSE NULL
END
WHERE due_date IS NULL
  AND period_label IS NOT NULL;
