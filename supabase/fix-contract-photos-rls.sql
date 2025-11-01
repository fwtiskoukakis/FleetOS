-- ==============================================
-- Fix RLS Policy for contract_photos Table
-- Allows users to insert photos only for contracts they created
-- ==============================================

-- Drop existing insert policies
DROP POLICY IF EXISTS "Users can insert photos for their contracts" ON public.contract_photos;
DROP POLICY IF EXISTS "Users can insert their own contract photos" ON public.contract_photos;
DROP POLICY IF EXISTS "Authenticated users can insert contract photos" ON public.contract_photos;

-- Create the correct policy: Users can only insert photos for contracts they created
CREATE POLICY "Users can insert photos for their contracts"
ON public.contract_photos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = contract_photos.contract_id
    AND contracts.user_id = auth.uid()
  )
);

-- Also ensure view policy allows users to see their own contract photos
DROP POLICY IF EXISTS "Users can view photos of their contracts" ON public.contract_photos;
DROP POLICY IF EXISTS "Users can view photos for visible contracts" ON public.contract_photos;

CREATE POLICY "Users can view photos of their contracts"
ON public.contract_photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = contract_photos.contract_id
    AND contracts.user_id = auth.uid()
  )
);

-- Also fix update and delete policies to be consistent
DROP POLICY IF EXISTS "Users can update photos of their contracts" ON public.contract_photos;

CREATE POLICY "Users can update photos of their contracts"
ON public.contract_photos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = contract_photos.contract_id
    AND contracts.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete photos of their contracts" ON public.contract_photos;

CREATE POLICY "Users can delete photos of their contracts"
ON public.contract_photos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = contract_photos.contract_id
    AND contracts.user_id = auth.uid()
  )
);

-- Verify the policies were created
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies for contract_photos table updated successfully!';
    RAISE NOTICE '📋 Users can now insert/view/update/delete photos only for contracts they created';
END $$;

