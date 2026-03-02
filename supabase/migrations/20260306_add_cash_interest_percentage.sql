ALTER TABLE loans ADD COLUMN IF NOT EXISTS cash_interest_percentage numeric DEFAULT NULL;

COMMENT ON COLUMN loans.cash_interest_percentage IS 'Percentage of interest paid in cash (0-100). NULL = 100%. Remainder comes from interest depot.';
