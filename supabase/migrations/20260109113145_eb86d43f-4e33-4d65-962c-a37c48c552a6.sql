
-- Disable the deletion prevention trigger temporarily
ALTER TABLE loan_events DISABLE TRIGGER prevent_approved_event_deletion;

-- Delete all related data for loan 496 (2e747c9c-0877-4c10-ace5-85b591948cde)
DELETE FROM accrual_entries WHERE loan_id = '2e747c9c-0877-4c10-ace5-85b591948cde';
DELETE FROM notice_snapshots WHERE loan_id = '2e747c9c-0877-4c10-ace5-85b591948cde';
DELETE FROM periods WHERE loan_id = '2e747c9c-0877-4c10-ace5-85b591948cde';
DELETE FROM loan_facilities WHERE loan_id = '2e747c9c-0877-4c10-ace5-85b591948cde';
DELETE FROM loan_events WHERE loan_id = '2e747c9c-0877-4c10-ace5-85b591948cde';
DELETE FROM loans WHERE id = '2e747c9c-0877-4c10-ace5-85b591948cde';

-- Re-enable the trigger
ALTER TABLE loan_events ENABLE TRIGGER prevent_approved_event_deletion;
