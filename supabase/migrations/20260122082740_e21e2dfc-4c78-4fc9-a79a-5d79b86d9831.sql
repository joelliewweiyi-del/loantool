-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Grant admin role to joel@raxfinance.nl
INSERT INTO public.user_roles (user_id, role)
VALUES ('264f1ca2-2e17-4837-a917-a2bf0c8f82bb', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update loans table to allow admin DELETE
CREATE POLICY "Admin can delete loans"
ON public.loans
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Update loan_events table to allow admin DELETE
CREATE POLICY "Admin can delete events"
ON public.loan_events
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Update periods table to allow admin DELETE
CREATE POLICY "Admin can delete periods"
ON public.periods
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Update accrual_entries table to allow admin DELETE
CREATE POLICY "Admin can delete accrual entries"
ON public.accrual_entries
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Allow admin to update any event (full access)
CREATE POLICY "Admin can update any event"
ON public.loan_events
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Allow admin full control on notice_snapshots
CREATE POLICY "Admin can delete snapshots"
ON public.notice_snapshots
FOR DELETE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can update snapshots"
ON public.notice_snapshots
FOR UPDATE
USING (public.is_admin(auth.uid()));