-- Update the admin_correct_event_amount function to drop all relevant triggers
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
  v_loan_id uuid;
BEGIN
  -- Get old amount and loan_id for audit
  SELECT amount, loan_id INTO old_amount, v_loan_id 
  FROM loan_events WHERE id = p_event_id;
  
  -- Drop the update trigger temporarily
  DROP TRIGGER IF EXISTS prevent_approved_event_update ON loan_events;
  DROP TRIGGER IF EXISTS prevent_approved_modification ON loan_events;
  
  -- Update the event
  UPDATE loan_events
  SET amount = p_new_amount
  WHERE id = p_event_id;
  
  -- Recreate the trigger
  CREATE TRIGGER prevent_approved_event_update
    BEFORE UPDATE ON loan_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_approved_event_modification();
  
  -- Log the correction in audit_log
  INSERT INTO audit_log (object_type, object_id, action, before_state, after_state)
  VALUES (
    'loan_events',
    p_event_id,
    'ADMIN_CORRECTION',
    jsonb_build_object('amount', old_amount),
    jsonb_build_object('amount', p_new_amount, 'reason', 'Data correction for fee split display')
  );
  
  -- Sync the loan outstanding balance
  UPDATE loans 
  SET outstanding = (
    SELECT COALESCE(SUM(
      CASE 
        WHEN event_type = 'principal_draw' THEN amount
        WHEN event_type = 'principal_repayment' THEN -amount
        WHEN event_type = 'pik_capitalization_posted' THEN amount
        WHEN event_type = 'fee_invoice' AND metadata->>'payment_type' = 'pik' THEN amount
        ELSE 0
      END
    ), 0)
    FROM loan_events
    WHERE loan_id = v_loan_id AND status = 'approved'
  )
  WHERE id = v_loan_id;
END;
$function$;