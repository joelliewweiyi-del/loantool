
-- Step 1: Disable the delete prevention trigger
ALTER TABLE loan_events DISABLE TRIGGER prevent_approved_event_deletion;
