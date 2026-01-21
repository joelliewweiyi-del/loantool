-- Fix the RLS policy for approving events
-- The current policy checks status='draft' on both old and new rows
-- We need to allow the transition from 'draft' to 'approved'

DROP POLICY IF EXISTS "Controller can approve events" ON public.loan_events;

CREATE POLICY "Controller can approve events" 
ON public.loan_events 
FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'controller'::app_role) 
  AND status = 'draft'::event_status
)
WITH CHECK (
  has_role(auth.uid(), 'controller'::app_role)
  AND status IN ('draft'::event_status, 'approved'::event_status)
);