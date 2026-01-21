-- Create an admin function to correct event amounts (bypasses trigger check)
-- This is for data corrections only, maintains full audit trail
CREATE OR REPLACE FUNCTION public.admin_correct_event_amount(
  p_event_id uuid,
  p_new_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  old_amount numeric;
BEGIN
  -- Get old amount for audit
  SELECT amount INTO old_amount FROM loan_events WHERE id = p_event_id;
  
  -- Temporarily disable the modification trigger for this session
  SET LOCAL session_replication_role = 'replica';
  
  -- Update the event
  UPDATE loan_events
  SET amount = p_new_amount
  WHERE id = p_event_id;
  
  -- Re-enable triggers
  SET LOCAL session_replication_role = 'origin';
  
  -- Log the correction in audit_log
  INSERT INTO audit_log (object_type, object_id, action, before_state, after_state)
  VALUES (
    'loan_events',
    p_event_id,
    'ADMIN_CORRECTION',
    jsonb_build_object('amount', old_amount),
    jsonb_build_object('amount', p_new_amount)
  );
END;
$function$;