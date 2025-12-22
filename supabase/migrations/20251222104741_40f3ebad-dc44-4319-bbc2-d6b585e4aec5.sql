-- Add new loan fields for comprehensive loan details
ALTER TABLE public.loans 
  ADD COLUMN loan_name TEXT,
  ADD COLUMN loan_start_date DATE,
  ADD COLUMN maturity_date DATE,
  ADD COLUMN interest_rate NUMERIC(10, 6),
  ADD COLUMN interest_type TEXT NOT NULL DEFAULT 'cash_pay' CHECK (interest_type IN ('cash_pay', 'pik')),
  ADD COLUMN loan_type TEXT NOT NULL DEFAULT 'term_loan' CHECK (loan_type IN ('term_loan', 'committed_facility')),
  ADD COLUMN initial_principal NUMERIC(20, 2),
  ADD COLUMN total_commitment NUMERIC(20, 2),
  ADD COLUMN commitment_fee_rate NUMERIC(10, 6),
  ADD COLUMN commitment_fee_basis TEXT DEFAULT 'undrawn_only' CHECK (commitment_fee_basis IN ('undrawn_only', 'total_commitment'));