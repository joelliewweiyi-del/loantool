-- Rename external_loan_id to loan_number and make it required with unique constraint
-- First, update any NULL values to a generated value to avoid constraint violations
UPDATE public.loans 
SET external_loan_id = CONCAT('LOAN-', SUBSTRING(id::text, 1, 8))
WHERE external_loan_id IS NULL;

-- Rename the column
ALTER TABLE public.loans RENAME COLUMN external_loan_id TO loan_number;

-- Make it NOT NULL
ALTER TABLE public.loans ALTER COLUMN loan_number SET NOT NULL;

-- Add unique constraint
ALTER TABLE public.loans ADD CONSTRAINT loans_loan_number_unique UNIQUE (loan_number);