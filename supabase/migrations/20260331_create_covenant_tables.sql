-- Covenant tracking tables for loan compliance monitoring
-- Replaces the Excel-based "Afspraken Kredietbrief" workbook

-- === Enums ===

CREATE TYPE public.covenant_type AS ENUM (
  'valuation',
  'rent_roll',
  'annual_accounts',
  'insurance',
  'kyc_check',
  'financial_covenant'
);

CREATE TYPE public.covenant_status AS ENUM (
  'pending',
  'requested',
  'received',
  'reviewed',
  'not_applicable',
  'breached',
  'overdue'
);

-- === Table: loan_covenants ===
-- One row per covenant definition per loan per tracking year

CREATE TABLE IF NOT EXISTS public.loan_covenants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  covenant_type public.covenant_type NOT NULL,
  frequency text,
  frequency_detail text,
  threshold_value numeric,
  threshold_operator text,
  threshold_metric text,
  tracking_year int NOT NULL,
  notification_days int DEFAULT 14,
  active boolean DEFAULT true NOT NULL,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_loan_covenants_loan ON public.loan_covenants(loan_id);
CREATE INDEX idx_loan_covenants_type ON public.loan_covenants(covenant_type);
CREATE INDEX idx_loan_covenants_year ON public.loan_covenants(tracking_year);
CREATE INDEX idx_loan_covenants_loan_type_year
  ON public.loan_covenants(loan_id, covenant_type, tracking_year);

ALTER TABLE public.loan_covenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view covenants"
  ON public.loan_covenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert covenants"
  ON public.loan_covenants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update covenants"
  ON public.loan_covenants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete covenants"
  ON public.loan_covenants FOR DELETE TO authenticated USING (true);

-- === Table: covenant_submissions ===
-- One row per delivery instance (e.g. Q1 2026 rent roll for loan X)

CREATE TABLE IF NOT EXISTS public.covenant_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  covenant_id uuid NOT NULL REFERENCES public.loan_covenants(id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  due_date date,
  reminder_date date,
  status public.covenant_status NOT NULL DEFAULT 'pending',
  received_at date,
  received_by text,
  file_url text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_covenant_submissions_covenant_period
  ON public.covenant_submissions(covenant_id, period_label);
CREATE INDEX idx_covenant_submissions_loan ON public.covenant_submissions(loan_id);
CREATE INDEX idx_covenant_submissions_status ON public.covenant_submissions(status);
CREATE INDEX idx_covenant_submissions_due ON public.covenant_submissions(due_date);

ALTER TABLE public.covenant_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view submissions"
  ON public.covenant_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert submissions"
  ON public.covenant_submissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update submissions"
  ON public.covenant_submissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete submissions"
  ON public.covenant_submissions FOR DELETE TO authenticated USING (true);

-- === Table: rent_roll_entries ===
-- Parsed tenant rows from the standardized rent roll template

CREATE TABLE IF NOT EXISTS public.rent_roll_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES public.covenant_submissions(id) ON DELETE CASCADE,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  tenant_name text,
  lease_start date,
  lease_end date,
  notice_period text,
  renewal_period text,
  sqm numeric,
  annual_rent numeric,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_rent_roll_entries_submission ON public.rent_roll_entries(submission_id);
CREATE INDEX idx_rent_roll_entries_loan ON public.rent_roll_entries(loan_id);

ALTER TABLE public.rent_roll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rent roll entries"
  ON public.rent_roll_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert rent roll entries"
  ON public.rent_roll_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update rent roll entries"
  ON public.rent_roll_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete rent roll entries"
  ON public.rent_roll_entries FOR DELETE TO authenticated USING (true);
