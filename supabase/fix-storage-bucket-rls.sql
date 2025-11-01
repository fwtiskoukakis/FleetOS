-- ==============================================
-- Fix Storage Bucket RLS Policies for contract-photos
-- Allows authenticated users to upload photos without folder restrictions
-- ==============================================

-- Drop ALL existing policies for contract-photos bucket first
-- This ensures we start with a clean slate
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  -- Find and drop all policies that might be related to contract-photos
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND (policyname ILIKE '%contract%photo%' OR policyname ILIKE '%contract-photos%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- Simple INSERT policy: Allow any authenticated user to upload to contract-photos bucket
CREATE POLICY "Authenticated users can upload contract photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contract-photos'
);

-- Simple SELECT policy: Allow authenticated users to view contract photos
CREATE POLICY "Authenticated users can view contract photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contract-photos'
);

-- Simple UPDATE policy: Allow authenticated users to update contract photos
CREATE POLICY "Authenticated users can update contract photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contract-photos'
);

-- Simple DELETE policy: Allow authenticated users to delete contract photos
CREATE POLICY "Authenticated users can delete contract photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contract-photos'
);

-- Verify policies were created
DO $$
BEGIN
    RAISE NOTICE '✅ Storage bucket RLS policies for contract-photos updated successfully!';
    RAISE NOTICE '📋 Authenticated users can now upload/view/update/delete photos';
END $$;

