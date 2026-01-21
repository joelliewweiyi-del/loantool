-- Drop trigger first, then function
DROP TRIGGER IF EXISTS prevent_approved_event_deletion ON loan_events;
DROP FUNCTION IF EXISTS prevent_approved_event_delete() CASCADE;