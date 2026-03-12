-- Add attachments JSONB column to loan_activity_log for photo uploads
ALTER TABLE loan_activity_log
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT NULL;

-- Create storage bucket for activity photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-photos', 'activity-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload
CREATE POLICY "Authenticated users can upload activity photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'activity-photos');

-- Any authenticated user with a role can view
CREATE POLICY "Authenticated users can view activity photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'activity-photos');

-- Authors can delete their own uploads (path starts with their user id)
CREATE POLICY "Users can delete own activity photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'activity-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
