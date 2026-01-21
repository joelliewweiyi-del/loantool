-- Rename opening_outstanding to just outstanding
ALTER TABLE public.loans RENAME COLUMN opening_outstanding TO outstanding;