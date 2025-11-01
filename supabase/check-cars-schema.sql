-- ==============================================
-- Check Current Cars Table Schema
-- ==============================================
-- Run this to see what columns actually exist in the cars table

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cars'
ORDER BY ordinal_position;

-- ==============================================
-- Expected base columns (from SAFE_SETUP.sql):
-- id, make, model, make_model (generated), year, license_plate, 
-- color, fuel_type, transmission, seats, daily_rate, 
-- is_available, photo_url, created_at, updated_at
-- ==============================================

-- If user_id exists, drop it temporarily if causing issues:
-- ALTER TABLE public.cars DROP COLUMN IF EXISTS user_id;

-- If you see errors about columns, the schema cache might need refreshing.
-- In Supabase dashboard: Settings > API > "Clear schema cache" or restart Supabase.

