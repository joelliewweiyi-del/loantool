-- Add separate payment type fields for fees and interest
ALTER TABLE public.loans 
ADD COLUMN fee_payment_type TEXT NOT NULL DEFAULT 'pik' CHECK (fee_payment_type IN ('pik', 'cash')),
ADD COLUMN interest_payment_type TEXT NOT NULL DEFAULT 'cash' CHECK (interest_payment_type IN ('pik', 'cash'));

-- Migrate existing data: copy interest_type to both new fields for backward compatibility
UPDATE public.loans 
SET 
  fee_payment_type = CASE WHEN interest_type = 'pik' THEN 'pik' ELSE 'cash' END,
  interest_payment_type = CASE WHEN interest_type = 'pik' THEN 'pik' ELSE 'cash' END;

-- Add comment for clarity
COMMENT ON COLUMN public.loans.fee_payment_type IS 'How arrangement fees are handled: pik = capitalized into principal, cash = withheld from borrower';
COMMENT ON COLUMN public.loans.interest_payment_type IS 'How monthly interest is handled: pik = capitalized into principal, cash = invoiced for payment';