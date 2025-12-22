-- Create enum types
CREATE TYPE public.loan_status AS ENUM ('active', 'repaid', 'defaulted');
CREATE TYPE public.facility_type AS ENUM ('capex', 'interest_depot', 'other');
CREATE TYPE public.event_status AS ENUM ('draft', 'approved');
CREATE TYPE public.period_status AS ENUM ('open', 'submitted', 'approved', 'sent');
CREATE TYPE public.app_role AS ENUM ('pm', 'controller');
CREATE TYPE public.event_type AS ENUM (
  'principal_draw',
  'principal_repayment',
  'interest_rate_set',
  'interest_rate_change',
  'pik_flag_set',
  'commitment_set',
  'commitment_change',
  'commitment_cancel',
  'cash_received',
  'fee_invoice',
  'pik_capitalization_posted'
);

-- User roles table (security definer pattern)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any role (pm or controller)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- Loans table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_name TEXT NOT NULL,
  status loan_status NOT NULL DEFAULT 'active',
  notice_frequency TEXT NOT NULL DEFAULT 'monthly',
  payment_due_rule TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Loan facilities table
CREATE TABLE public.loan_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  facility_type facility_type NOT NULL,
  commitment_amount NUMERIC(20, 2) NOT NULL,
  commitment_fee_rate NUMERIC(10, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_facilities ENABLE ROW LEVEL SECURITY;

-- Loan events table (append-only ledger)
CREATE TABLE public.loan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE RESTRICT NOT NULL,
  facility_id UUID REFERENCES public.loan_facilities(id) ON DELETE RESTRICT,
  event_type event_type NOT NULL,
  effective_date DATE NOT NULL,
  value_date DATE,
  amount NUMERIC(20, 2),
  rate NUMERIC(10, 6),
  metadata JSONB DEFAULT '{}',
  status event_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ
);

ALTER TABLE public.loan_events ENABLE ROW LEVEL SECURITY;

-- Periods table
CREATE TABLE public.periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status period_status NOT NULL DEFAULT 'open',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  snapshot_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

-- Notice snapshots table (immutable legal record)
CREATE TABLE public.notice_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE RESTRICT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version_number INTEGER NOT NULL DEFAULT 1,
  is_adjustment BOOLEAN NOT NULL DEFAULT false,
  references_snapshot_id UUID REFERENCES public.notice_snapshots(id),
  totals JSONB NOT NULL DEFAULT '{}',
  line_items JSONB NOT NULL DEFAULT '[]',
  inputs_hash TEXT NOT NULL,
  pdf_file_reference TEXT
);

ALTER TABLE public.notice_snapshots ENABLE ROW LEVEL SECURITY;

-- Audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type TEXT NOT NULL,
  object_id UUID NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  before_state JSONB,
  after_state JSONB
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Update periods foreign key to snapshots
ALTER TABLE public.periods 
  ADD CONSTRAINT periods_snapshot_id_fkey 
  FOREIGN KEY (snapshot_id) REFERENCES public.notice_snapshots(id);

-- RLS Policies

-- User roles: users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Loans: any authenticated user with a role can view
CREATE POLICY "Users with roles can view loans"
  ON public.loans
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Loans: pm and controller can insert
CREATE POLICY "PM and Controller can create loans"
  ON public.loans
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

-- Loans: pm and controller can update
CREATE POLICY "PM and Controller can update loans"
  ON public.loans
  FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Loan facilities: users with roles can view
CREATE POLICY "Users with roles can view facilities"
  ON public.loan_facilities
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Loan facilities: pm and controller can insert
CREATE POLICY "PM and Controller can create facilities"
  ON public.loan_facilities
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

-- Loan events: users with roles can view
CREATE POLICY "Users with roles can view events"
  ON public.loan_events
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Loan events: pm can create draft events
CREATE POLICY "PM can create draft events"
  ON public.loan_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_any_role(auth.uid()) 
    AND status = 'draft'
  );

-- Loan events: controller can update draft to approved
CREATE POLICY "Controller can approve events"
  ON public.loan_events
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'controller') 
    AND status = 'draft'
  );

-- Periods: users with roles can view
CREATE POLICY "Users with roles can view periods"
  ON public.periods
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Periods: system can create periods
CREATE POLICY "Users with roles can create periods"
  ON public.periods
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

-- Periods: pm can submit, controller can approve
CREATE POLICY "PM and Controller can update periods"
  ON public.periods
  FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Notice snapshots: users with roles can view
CREATE POLICY "Users with roles can view snapshots"
  ON public.notice_snapshots
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Notice snapshots: only controller can create
CREATE POLICY "Controller can create snapshots"
  ON public.notice_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'controller'));

-- Audit log: users with roles can view
CREATE POLICY "Users with roles can view audit log"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Audit log: system inserts via trigger
CREATE POLICY "System can insert audit log"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (object_type, object_id, action, user_id, before_state, after_state)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', auth.uid(), NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (object_type, object_id, action, user_id, before_state, after_state)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (object_type, object_id, action, user_id, before_state, after_state)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create audit triggers
CREATE TRIGGER audit_loans
  AFTER INSERT OR UPDATE OR DELETE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_loan_facilities
  AFTER INSERT OR UPDATE OR DELETE ON public.loan_facilities
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_loan_events
  AFTER INSERT OR UPDATE OR DELETE ON public.loan_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_periods
  AFTER INSERT OR UPDATE OR DELETE ON public.periods
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_notice_snapshots
  AFTER INSERT OR UPDATE OR DELETE ON public.notice_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Prevent deletion of approved events
CREATE OR REPLACE FUNCTION public.prevent_approved_event_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'approved' THEN
    RAISE EXCEPTION 'Cannot delete approved events. Use reversing events instead.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_approved_event_deletion
  BEFORE DELETE ON public.loan_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_approved_event_delete();

-- Prevent modification of approved events
CREATE OR REPLACE FUNCTION public.prevent_approved_event_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'approved' AND NEW.status = 'approved' THEN
    -- Only allow if nothing changed except potentially system fields
    IF OLD.event_type != NEW.event_type 
       OR OLD.effective_date != NEW.effective_date
       OR OLD.value_date IS DISTINCT FROM NEW.value_date
       OR OLD.amount IS DISTINCT FROM NEW.amount
       OR OLD.rate IS DISTINCT FROM NEW.rate
       OR OLD.metadata IS DISTINCT FROM NEW.metadata THEN
      RAISE EXCEPTION 'Cannot modify approved events. Use reversing events instead.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_approved_event_update
  BEFORE UPDATE ON public.loan_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_approved_event_modification();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();