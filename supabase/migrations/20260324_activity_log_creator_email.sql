-- Add created_by_email to activity log for display purposes
ALTER TABLE loan_activity_log ADD COLUMN IF NOT EXISTS created_by_email text;

-- Backfill existing entries from auth.users
UPDATE loan_activity_log l
SET created_by_email = u.email
FROM auth.users u
WHERE l.created_by = u.id
  AND l.created_by_email IS NULL;
