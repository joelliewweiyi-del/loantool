-- Create admin function to delete a loan and all related data
-- This bypasses the immutability triggers for admin cleanup
CREATE OR REPLACE FUNCTION public.admin_delete_loan(p_loan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete loans';
  END IF;

  -- Drop the delete trigger temporarily
  DROP TRIGGER IF EXISTS prevent_approved_event_delete ON loan_events;
  
  -- Delete in order respecting foreign keys
  DELETE FROM accrual_entries WHERE loan_id = p_loan_id;
  DELETE FROM notice_snapshots WHERE loan_id = p_loan_id;
  DELETE FROM periods WHERE loan_id = p_loan_id;
  DELETE FROM loan_events WHERE loan_id = p_loan_id;
  DELETE FROM loan_facilities WHERE loan_id = p_loan_id;
  DELETE FROM loans WHERE id = p_loan_id;
  
  -- Recreate the trigger
  CREATE TRIGGER prevent_approved_event_delete
    BEFORE DELETE ON loan_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_approved_event_delete();
  
  -- Log the admin action
  INSERT INTO audit_log (object_type, object_id, action, user_id, before_state)
  VALUES ('loans', p_loan_id, 'ADMIN_DELETE', auth.uid(), jsonb_build_object('deleted_loan_id', p_loan_id));
END;
$$;