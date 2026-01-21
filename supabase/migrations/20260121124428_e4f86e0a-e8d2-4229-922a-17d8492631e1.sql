-- Add AFAS posting tracking columns to periods table
ALTER TABLE public.periods
ADD COLUMN IF NOT EXISTS afas_posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS afas_invoice_number TEXT,
ADD COLUMN IF NOT EXISTS afas_post_error TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.periods.afas_posted_at IS 'Timestamp when period was successfully posted to AFAS';
COMMENT ON COLUMN public.periods.afas_invoice_number IS 'Invoice number assigned in AFAS';
COMMENT ON COLUMN public.periods.afas_post_error IS 'Error message if AFAS posting failed - flagged for retry';