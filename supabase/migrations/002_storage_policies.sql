-- Storage policies for documents bucket
-- Run this after creating the 'documents' storage bucket in Supabase Dashboard

-- Policy: Users can upload documents
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy: Users can view their documents
CREATE POLICY "Users can view their documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Policy: Users can delete their documents
CREATE POLICY "Users can delete their documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

