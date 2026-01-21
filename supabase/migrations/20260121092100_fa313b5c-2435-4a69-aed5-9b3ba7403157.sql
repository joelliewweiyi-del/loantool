-- Rename initial_principal to initial_outstanding in loans table
ALTER TABLE public.loans RENAME COLUMN initial_principal TO initial_outstanding;