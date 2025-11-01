-- ==============================================
-- FIX MISSING USER PROFILE
-- ==============================================
-- This creates the missing profile for existing auth users

-- Insert missing profile for user 9a64caa3-4886-4583-9021-13d7940de6ad
INSERT INTO public.users (id, email, name, created_at, updated_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'name', email) as name,
    created_at,
    NOW()
FROM auth.users
WHERE id = '9a64caa3-4886-4583-9021-13d7940de6ad'
AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.users.id
);

-- Verify it was created
SELECT id, email, name, created_at FROM public.users WHERE id = '9a64caa3-4886-4583-9021-13d7940de6ad';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ User profile created/fixed!';
    RAISE NOTICE '🚀 You should now be able to see your profile!';
END $$;

