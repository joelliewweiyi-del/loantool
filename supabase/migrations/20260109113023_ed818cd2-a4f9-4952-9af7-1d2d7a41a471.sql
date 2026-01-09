-- Disable the deletion prevention trigger
ALTER TABLE loan_events DISABLE TRIGGER prevent_approved_event_deletion;