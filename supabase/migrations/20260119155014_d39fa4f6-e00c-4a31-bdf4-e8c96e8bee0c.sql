-- Table to store synced AFAS invoices for reconciliation
CREATE TABLE public.afas_invoice_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- AFAS data
  afas_invoice_nr text NOT NULL,
  afas_debtor_id text,
  afas_invoice_date date,
  afas_due_date date,
  afas_amount numeric NOT NULL,
  afas_open_amount numeric,
  afas_description text,
  afas_raw_data jsonb DEFAULT '{}'::jsonb,
  
  -- TMO matching
  loan_id uuid REFERENCES public.loans(id),
  period_id uuid REFERENCES public.periods(id),
  parsed_loan_number text,
  parsed_period_month text,
  match_status text NOT NULL DEFAULT 'unmatched' CHECK (match_status IN ('matched', 'unmatched', 'manual', 'error')),
  match_notes text,
  
  -- Reconciliation
  tmo_expected_amount numeric,
  amount_difference numeric GENERATED ALWAYS AS (afas_amount - COALESCE(tmo_expected_amount, 0)) STORED,
  is_paid boolean DEFAULT false,
  payment_date date,
  
  -- Sync tracking
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Unique constraint on AFAS invoice number
  UNIQUE(afas_invoice_nr)
);

-- Enable RLS
ALTER TABLE public.afas_invoice_sync ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users with roles can view afas_invoice_sync"
  ON public.afas_invoice_sync FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Users with roles can insert afas_invoice_sync"
  ON public.afas_invoice_sync FOR INSERT
  WITH CHECK (has_any_role(auth.uid()));

CREATE POLICY "Users with roles can update afas_invoice_sync"
  ON public.afas_invoice_sync FOR UPDATE
  USING (has_any_role(auth.uid()));

-- Sync log to track sync operations
CREATE TABLE public.afas_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL DEFAULT 'debtor_invoices',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  invoices_fetched integer DEFAULT 0,
  invoices_matched integer DEFAULT 0,
  invoices_unmatched integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.afas_sync_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users with roles can view afas_sync_runs"
  ON public.afas_sync_runs FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Users with roles can insert afas_sync_runs"
  ON public.afas_sync_runs FOR INSERT
  WITH CHECK (has_any_role(auth.uid()));

CREATE POLICY "Users with roles can update afas_sync_runs"
  ON public.afas_sync_runs FOR UPDATE
  USING (has_any_role(auth.uid()));

-- Index for faster lookups
CREATE INDEX idx_afas_invoice_sync_loan_id ON public.afas_invoice_sync(loan_id);
CREATE INDEX idx_afas_invoice_sync_period_id ON public.afas_invoice_sync(period_id);
CREATE INDEX idx_afas_invoice_sync_match_status ON public.afas_invoice_sync(match_status);
CREATE INDEX idx_afas_invoice_sync_synced_at ON public.afas_invoice_sync(synced_at DESC);