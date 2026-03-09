-- Activity type enum for categorizing logged interactions
CREATE TYPE public.activity_type AS ENUM ('call', 'email', 'meeting', 'site_visit', 'other');

-- Loan activity log: PM notes and conversation records per loan
CREATE TABLE public.loan_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  activity_type public.activity_type,
  activity_date DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_loan_activity_log_loan_id ON public.loan_activity_log (loan_id, created_at DESC);

-- RLS: any authenticated user with a role can view
CREATE POLICY "Users with roles can view activity log"
  ON public.loan_activity_log
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- INSERT: any role can create
CREATE POLICY "Users with roles can create activity log"
  ON public.loan_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

-- UPDATE: author only
CREATE POLICY "Author can update own activity log"
  ON public.loan_activity_log
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: author only
CREATE POLICY "Author can delete own activity log"
  ON public.loan_activity_log
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
