-- Create loan_documents table for tracking file metadata
CREATE TABLE IF NOT EXISTS public.loan_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  content_type text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for querying documents by loan
CREATE INDEX idx_loan_documents_loan_id ON public.loan_documents(loan_id);

-- Enable RLS
ALTER TABLE public.loan_documents ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read/insert/delete
CREATE POLICY "Authenticated users can view loan documents"
  ON public.loan_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert loan documents"
  ON public.loan_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete loan documents"
  ON public.loan_documents FOR DELETE
  TO authenticated
  USING (true);

-- Create storage bucket for loan documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('loan-documents', 'loan-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: any authenticated user can read/upload/delete
CREATE POLICY "Authenticated users can read loan documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'loan-documents');

CREATE POLICY "Authenticated users can upload loan documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'loan-documents');

CREATE POLICY "Authenticated users can delete loan documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'loan-documents');
