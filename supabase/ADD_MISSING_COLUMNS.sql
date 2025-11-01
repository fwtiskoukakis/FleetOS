-- ==============================================
-- ADD MISSING COLUMNS TO EXISTING DATABASE
-- ==============================================
-- This adds missing columns that the app expects

-- Add AADE and profile columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS aade_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS aade_username TEXT,
ADD COLUMN IF NOT EXISTS aade_subscription_key TEXT,
ADD COLUMN IF NOT EXISTS company_vat_number TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_activity TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add status column to cars table
ALTER TABLE public.cars 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance'));

-- Create indexes
CREATE INDEX IF NOT EXISTS users_company_vat_number_idx ON public.users (company_vat_number);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON public.users (is_active);
CREATE INDEX IF NOT EXISTS cars_status_idx ON public.cars (status);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Missing columns added successfully!';
    RAISE NOTICE '📊 Users table: Added AADE fields and profile fields';
    RAISE NOTICE '📊 Cars table: Added status field';
    RAISE NOTICE '🚀 App should now work correctly!';
END $$;

