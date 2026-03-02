-- Add 'paid' to the period_status enum
ALTER TYPE public.period_status ADD VALUE IF NOT EXISTS 'paid';

-- Add payment tracking columns to periods
ALTER TABLE public.periods
  ADD COLUMN IF NOT EXISTS payment_date date,
  ADD COLUMN IF NOT EXISTS payment_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_afas_ref text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
