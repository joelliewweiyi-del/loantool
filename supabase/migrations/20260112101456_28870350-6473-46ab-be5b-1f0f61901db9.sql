-- Add vehicle column to loans table
ALTER TABLE public.loans ADD COLUMN vehicle TEXT DEFAULT 'RED IV';

-- Update loan 520 to TLF vehicle
UPDATE public.loans SET vehicle = 'TLF' WHERE loan_name = '520';

-- Add an index for filtering by vehicle
CREATE INDEX idx_loans_vehicle ON public.loans(vehicle);