-- Add category and metadata fields to loans table
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS valuation numeric,
ADD COLUMN IF NOT EXISTS valuation_date date,
ADD COLUMN IF NOT EXISTS ltv numeric,
ADD COLUMN IF NOT EXISTS rental_income numeric,
ADD COLUMN IF NOT EXISTS remarks text,
ADD COLUMN IF NOT EXISTS external_loan_id text;