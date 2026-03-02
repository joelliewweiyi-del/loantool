-- Add loan tape fields (property_status, earmarked) - already applied
ALTER TABLE loans ADD COLUMN IF NOT EXISTS property_status text;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS earmarked boolean DEFAULT false;
