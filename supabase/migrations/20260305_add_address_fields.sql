-- Add borrower/property address fields
ALTER TABLE loans ADD COLUMN IF NOT EXISTS borrower_email text;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS borrower_address text;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS property_address text;
