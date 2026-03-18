-- Collateral Register: tracks cadastral parcels and security registrations per loan
-- Also adds structured guarantor tracking per loan

-- Add combined guarantee cap to loans table
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS combined_guarantee_cap numeric(20, 2);

-- Create collateral_items table
CREATE TABLE IF NOT EXISTS public.collateral_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,

  -- Cadastral data (Kadastrale gegevens)
  gemeente text,
  sectie text,
  perceelnummer text,
  kadastrale_grootte text,  -- Stored as text: mixed formats like "49,421 m²", "3/100 aandeel"

  -- Ownership type
  ownership_type text NOT NULL DEFAULT 'eigendom',

  -- Registration
  registration_date date,
  registration_amount numeric(20, 2),

  -- Location
  city text,
  address text,

  -- Security provider
  security_provider text,

  -- Status tracking
  status text NOT NULL DEFAULT 'active',
  status_changed_at timestamptz,
  status_changed_by uuid REFERENCES auth.users(id),
  status_notes text,

  -- Notes
  notes text,

  -- Audit
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_collateral_items_loan_id ON public.collateral_items(loan_id);
CREATE INDEX idx_collateral_items_status ON public.collateral_items(status);

-- Enable RLS
ALTER TABLE public.collateral_items ENABLE ROW LEVEL SECURITY;

-- Any role can read
CREATE POLICY "Authenticated users can view collateral items"
  ON public.collateral_items FOR SELECT
  TO authenticated
  USING (true);

-- PM and Admin can insert
CREATE POLICY "PM and Admin can insert collateral items"
  ON public.collateral_items FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'pm'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- PM and Admin can update
CREATE POLICY "PM and Admin can update collateral items"
  ON public.collateral_items FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'pm'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- PM and Admin can delete
CREATE POLICY "PM and Admin can delete collateral items"
  ON public.collateral_items FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'pm'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );


-- Create loan_guarantors table
CREATE TABLE IF NOT EXISTS public.loan_guarantors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,

  guarantor_name text NOT NULL,
  guarantee_cap numeric(20, 2),

  -- Status
  status text NOT NULL DEFAULT 'active',
  status_changed_at timestamptz,
  status_notes text,

  -- Audit
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_loan_guarantors_loan_id ON public.loan_guarantors(loan_id);

-- Enable RLS
ALTER TABLE public.loan_guarantors ENABLE ROW LEVEL SECURITY;

-- Any role can read
CREATE POLICY "Authenticated users can view loan guarantors"
  ON public.loan_guarantors FOR SELECT
  TO authenticated
  USING (true);

-- PM and Admin can insert
CREATE POLICY "PM and Admin can insert loan guarantors"
  ON public.loan_guarantors FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'pm'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- PM and Admin can update
CREATE POLICY "PM and Admin can update loan guarantors"
  ON public.loan_guarantors FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'pm'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- PM and Admin can delete
CREATE POLICY "PM and Admin can delete loan guarantors"
  ON public.loan_guarantors FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'pm'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
