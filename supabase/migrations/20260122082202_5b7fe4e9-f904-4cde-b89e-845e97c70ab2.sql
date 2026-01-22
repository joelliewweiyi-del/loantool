-- Fix arrangement fee metadata for cash_pay loans that incorrectly have payment_type = 'pik'
-- This is a one-time data correction for loans 504, 509, 510

-- Temporarily disable the trigger
DROP TRIGGER IF EXISTS prevent_approved_event_update ON loan_events;

-- Update the incorrect metadata
UPDATE loan_events
SET metadata = jsonb_set(metadata, '{payment_type}', '"cash"')
WHERE id IN (
  '4bbdc3c3-e2e9-4915-94fa-cbae10e86501',  -- Loan 504
  'af588fbc-8e55-4689-abf1-642936e1f8dd',  -- Loan 509
  'cb4231b0-2918-4bc4-b69f-dacff7d29ab1'   -- Loan 510
);

-- Re-enable the trigger
CREATE TRIGGER prevent_approved_event_update
  BEFORE UPDATE ON loan_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_approved_event_modification();

-- Log this correction in audit_log
INSERT INTO audit_log (object_type, object_id, action, before_state, after_state)
VALUES 
  ('loan_event', '4bbdc3c3-e2e9-4915-94fa-cbae10e86501', 'metadata_correction', 
   '{"payment_type": "pik"}'::jsonb, '{"payment_type": "cash"}'::jsonb),
  ('loan_event', 'af588fbc-8e55-4689-abf1-642936e1f8dd', 'metadata_correction',
   '{"payment_type": "pik"}'::jsonb, '{"payment_type": "cash"}'::jsonb),
  ('loan_event', 'cb4231b0-2918-4bc4-b69f-dacff7d29ab1', 'metadata_correction',
   '{"payment_type": "pik"}'::jsonb, '{"payment_type": "cash"}'::jsonb);