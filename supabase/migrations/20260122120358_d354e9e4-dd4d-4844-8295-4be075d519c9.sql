-- Drop the loan_type column from loans table
ALTER TABLE public.loans DROP COLUMN IF EXISTS loan_type;