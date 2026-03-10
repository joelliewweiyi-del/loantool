-- Re-backfill created_by_email from auth.users (cast to handle type mismatch)
UPDATE loan_activity_log l
SET created_by_email = u.email
FROM auth.users u
WHERE l.created_by::uuid = u.id
  AND l.created_by_email IS NULL;
