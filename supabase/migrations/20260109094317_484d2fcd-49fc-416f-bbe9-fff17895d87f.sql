-- =====================================================
-- PRD v2.0 DATABASE MIGRATION
-- Monthly Batch Approval + Automated Processing
-- =====================================================

-- 1. Create monthly_approvals table for batch approval workflow
CREATE TABLE public.monthly_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month TEXT NOT NULL, -- Format: YYYY-MM
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  total_periods INTEGER NOT NULL DEFAULT 0,
  periods_with_exceptions INTEGER NOT NULL DEFAULT 0,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (year_month)
);

-- Enable RLS on monthly_approvals
ALTER TABLE public.monthly_approvals ENABLE ROW LEVEL SECURITY;

-- RLS policies for monthly_approvals
CREATE POLICY "Users with roles can view monthly approvals"
ON public.monthly_approvals FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Controller can create monthly approvals"
ON public.monthly_approvals FOR INSERT
WITH CHECK (has_role(auth.uid(), 'controller'::app_role));

CREATE POLICY "Controller can update monthly approvals"
ON public.monthly_approvals FOR UPDATE
USING (has_role(auth.uid(), 'controller'::app_role));

-- 2. Add new columns to periods table
ALTER TABLE public.periods
ADD COLUMN IF NOT EXISTS processing_mode TEXT DEFAULT 'manual' CHECK (processing_mode IN ('auto', 'manual')),
ADD COLUMN IF NOT EXISTS has_economic_events BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_approval_id UUID REFERENCES public.monthly_approvals(id),
ADD COLUMN IF NOT EXISTS auto_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS exception_reason TEXT;

-- 3. Add requires_approval column to loan_events
ALTER TABLE public.loan_events
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN DEFAULT false;

-- 4. Create accrual_entries table for daily accrual tracking
CREATE TABLE public.accrual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.periods(id),
  accrual_date DATE NOT NULL,
  principal_balance NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL,
  daily_interest NUMERIC NOT NULL,
  commitment_balance NUMERIC,
  commitment_fee_rate NUMERIC,
  daily_commitment_fee NUMERIC DEFAULT 0,
  is_pik BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (loan_id, accrual_date)
);

-- Enable RLS on accrual_entries
ALTER TABLE public.accrual_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for accrual_entries
CREATE POLICY "Users with roles can view accrual entries"
ON public.accrual_entries FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "System can insert accrual entries"
ON public.accrual_entries FOR INSERT
WITH CHECK (has_any_role(auth.uid()));

-- 5. Create processing_jobs table to track automated jobs
CREATE TABLE public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('daily_accrual', 'month_end', 'period_close')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  processed_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_details JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on processing_jobs
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for processing_jobs
CREATE POLICY "Users with roles can view processing jobs"
ON public.processing_jobs FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "System can manage processing jobs"
ON public.processing_jobs FOR ALL
USING (has_any_role(auth.uid()));

-- 6. Add trigger for updated_at on monthly_approvals
CREATE TRIGGER update_monthly_approvals_updated_at
BEFORE UPDATE ON public.monthly_approvals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Create function to detect economic events in a period
CREATE OR REPLACE FUNCTION public.period_has_economic_events(p_period_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.loan_events e
    JOIN public.periods p ON e.loan_id = p.loan_id
    WHERE p.id = p_period_id
      AND e.effective_date >= p.period_start
      AND e.effective_date <= p.period_end
      AND e.event_type IN (
        'principal_draw',
        'principal_repayment', 
        'interest_rate_change',
        'commitment_change',
        'commitment_cancel',
        'fee_invoice'
      )
  )
$$;

-- 8. Create function to get period processing mode
CREATE OR REPLACE FUNCTION public.determine_period_processing_mode(p_period_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.period_has_economic_events(p_period_id) THEN 'manual'
    ELSE 'auto'
  END
$$;