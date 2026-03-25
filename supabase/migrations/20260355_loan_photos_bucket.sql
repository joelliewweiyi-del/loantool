-- Create storage bucket for loan property photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('loan-photos', 'loan-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload loan photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'loan-photos');

-- Allow public read access
CREATE POLICY "Public can view loan photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'loan-photos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete loan photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'loan-photos');
