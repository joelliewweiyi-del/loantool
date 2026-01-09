-- Re-enable the deletion prevention trigger
ALTER TABLE loan_events ENABLE TRIGGER prevent_approved_event_deletion;