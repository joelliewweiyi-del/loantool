-- Add facility column to loans table
ALTER TABLE public.loans ADD COLUMN facility text;

-- Set facility for loan 520 to TLF DEC A
UPDATE public.loans SET facility = 'TLF DEC A' WHERE loan_name = '520';