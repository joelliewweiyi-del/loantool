-- Allow activity notes not tied to any loan (general notes)
ALTER TABLE public.loan_activity_log ALTER COLUMN loan_id DROP NOT NULL;

-- Partial index for querying general notes efficiently
CREATE INDEX idx_activity_log_general ON public.loan_activity_log (created_at DESC) WHERE loan_id IS NULL;
