-- Add amortization schedule fields, payment timing, and exit fee terms to loans
-- Supports loans like RAX 516 that have scheduled quarterly repayments,
-- interest paid in advance, and multi-tranche exit fee structures.

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS payment_timing text NOT NULL DEFAULT 'in_arrears'
    CHECK (payment_timing IN ('in_advance', 'in_arrears')),
  ADD COLUMN IF NOT EXISTS amortization_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS amortization_frequency text DEFAULT NULL
    CHECK (amortization_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  ADD COLUMN IF NOT EXISTS amortization_start_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS exit_fee_terms text DEFAULT NULL;

COMMENT ON COLUMN loans.payment_timing IS 'Whether interest is paid in_advance (vooraf, due at period start) or in_arrears (due after period end)';
COMMENT ON COLUMN loans.amortization_amount IS 'Scheduled periodic principal repayment amount in EUR';
COMMENT ON COLUMN loans.amortization_frequency IS 'Frequency of scheduled amortization payments';
COMMENT ON COLUMN loans.amortization_start_date IS 'Date of first scheduled amortization payment';
COMMENT ON COLUMN loans.exit_fee_terms IS 'Free-text description of exit fee / prepayment penalty terms, including tranche-specific rules';
