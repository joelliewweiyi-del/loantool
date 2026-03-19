-- Funding / back leverage provider conversation tracking
-- Tracks ongoing negotiations with warehouse line / repo facility providers

-- === Enum: funding deal stage ===

CREATE TYPE public.funding_stage AS ENUM (
  'initial_contact',
  'nda_signed',
  'term_sheet',
  'due_diligence',
  'credit_committee',
  'docs_negotiation',
  'closed'
);

-- === Table: funding_counterparties ===
-- One row per back leverage provider (e.g. ATLAS, Cerebus, BAWAG)

CREATE TABLE IF NOT EXISTS public.funding_counterparties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  stage public.funding_stage NOT NULL DEFAULT 'initial_contact',
  key_terms jsonb DEFAULT '{}'::jsonb NOT NULL,
  next_followup date,
  contact_name text,
  contact_email text,
  notes text,
  sort_order int DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_funding_counterparties_stage ON public.funding_counterparties(stage);

-- === Table: funding_notes ===
-- Conversation thread per counterparty

CREATE TABLE IF NOT EXISTS public.funding_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  counterparty_id uuid NOT NULL REFERENCES public.funding_counterparties(id) ON DELETE CASCADE,
  content text NOT NULL,
  activity_type text,
  activity_date date,
  attachments jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_by_email text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz
);

CREATE INDEX idx_funding_notes_counterparty ON public.funding_notes(counterparty_id);
CREATE INDEX idx_funding_notes_created ON public.funding_notes(created_at DESC);

-- === RLS ===

ALTER TABLE public.funding_counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_notes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can read funding counterparties"
  ON public.funding_counterparties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert funding counterparties"
  ON public.funding_counterparties FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update funding counterparties"
  ON public.funding_counterparties FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete funding counterparties"
  ON public.funding_counterparties FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read funding notes"
  ON public.funding_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert funding notes"
  ON public.funding_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own funding notes"
  ON public.funding_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own funding notes"
  ON public.funding_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- === Seed initial counterparties ===

INSERT INTO public.funding_counterparties (name, stage, sort_order, key_terms)
VALUES
  ('ATLAS', 'initial_contact', 0, '{}'),
  ('Cerebus', 'initial_contact', 1, '{}'),
  ('BAWAG', 'initial_contact', 2, '{}');
