-- =====================================================
-- Company Logos Storage Bucket Setup
-- =====================================================
-- This migration creates the storage bucket for business logos
-- and sets up the necessary RLS policies for Super Admins

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,  -- Public bucket so logos can be displayed
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies for company-logos bucket
-- =====================================================

-- Policy 1: Allow public read access (anyone can view logos)
CREATE POLICY "Public Access - Read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Policy 2: Allow Super Admins (role = 0) to upload/insert logos
CREATE POLICY "Super Admin Upload - Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 0
  )
);

-- Policy 3: Allow Super Admins (role = 0) to update logos
CREATE POLICY "Super Admin Upload - Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 0
  )
)
WITH CHECK (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 0
  )
);

-- Policy 4: Allow Super Admins (role = 0) to delete logos
CREATE POLICY "Super Admin Upload - Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 0
  )
);

-- =====================================================
-- Verify Setup
-- =====================================================
-- You can run these queries to verify the setup:
--
-- Check if bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'company-logos';
--
-- Check policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%company-logos%';
