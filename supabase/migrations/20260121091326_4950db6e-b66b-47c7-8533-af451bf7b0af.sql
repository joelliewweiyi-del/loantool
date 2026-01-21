-- Restore the trigger that prevents approved event deletion
CREATE OR REPLACE FUNCTION public.prevent_approved_event_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'approved' THEN
    RAISE EXCEPTION 'Cannot delete approved events. Use reversing events instead.';
  END IF;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER prevent_approved_event_deletion
  BEFORE DELETE ON loan_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_approved_event_delete();