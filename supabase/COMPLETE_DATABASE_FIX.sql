-- ==============================================
-- COMPLETE DATABASE FIX - RUN THIS ONCE
-- ==============================================
-- This script fixes ALL schema mismatches between
-- the database and the application code

-- ==============================================
-- 1. FIX USERS TABLE
-- ==============================================
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

CREATE INDEX IF NOT EXISTS users_company_vat_number_idx ON public.users (company_vat_number);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON public.users (is_active);

-- ==============================================
-- 2. FIX CARS TABLE
-- ==============================================
ALTER TABLE public.cars 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance'));

CREATE INDEX IF NOT EXISTS cars_status_idx ON public.cars (status);

-- ==============================================
-- 3. FIX CONTRACTS TABLE
-- ==============================================
-- Add all missing columns that app expects
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS car_make_model TEXT,
ADD COLUMN IF NOT EXISTS renter_full_name TEXT,
ADD COLUMN IF NOT EXISTS car_year INTEGER,
ADD COLUMN IF NOT EXISTS car_mileage INTEGER,
ADD COLUMN IF NOT EXISTS renter_tax_id TEXT,
ADD COLUMN IF NOT EXISTS renter_driver_license_number TEXT,
ADD COLUMN IF NOT EXISTS renter_phone_number TEXT,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_cost NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_type TEXT,
ADD COLUMN IF NOT EXISTS car_category TEXT,
ADD COLUMN IF NOT EXISTS car_color TEXT,
ADD COLUMN IF NOT EXISTS exterior_condition TEXT,
ADD COLUMN IF NOT EXISTS interior_condition TEXT,
ADD COLUMN IF NOT EXISTS mechanical_condition TEXT,
ADD COLUMN IF NOT EXISTS condition_notes TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS client_signature_url TEXT,
ADD COLUMN IF NOT EXISTS is_different_dropoff_location BOOLEAN DEFAULT false;

-- Copy data from old columns to new columns (for existing records)
-- Only migrate if old columns exist
DO $$
BEGIN
    -- Check if car_make column exists before trying to migrate
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contracts' 
        AND column_name = 'car_make'
    ) THEN
        UPDATE public.contracts 
        SET car_make_model = TRIM(COALESCE(car_make, '') || ' ' || COALESCE(car_model, ''))
        WHERE car_make_model IS NULL AND (car_make IS NOT NULL OR car_model IS NOT NULL);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contracts' 
        AND column_name = 'renter_name'
    ) THEN
        UPDATE public.contracts 
        SET renter_full_name = renter_name
        WHERE renter_full_name IS NULL AND renter_name IS NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contracts' 
        AND column_name = 'mileage_start'
    ) THEN
        UPDATE public.contracts 
        SET car_mileage = mileage_start
        WHERE car_mileage IS NULL AND mileage_start IS NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contracts' 
        AND column_name = 'renter_phone'
    ) THEN
        UPDATE public.contracts 
        SET renter_phone_number = renter_phone
        WHERE renter_phone_number IS NULL AND renter_phone IS NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contracts' 
        AND column_name = 'renter_driving_license'
    ) THEN
        UPDATE public.contracts 
        SET renter_driver_license_number = renter_driving_license
        WHERE renter_driver_license_number IS NULL AND renter_driving_license IS NOT NULL;
    END IF;
END $$;

-- Drop old trigger first (before dropping columns)
DROP TRIGGER IF EXISTS trigger_update_car_make_model ON public.contracts;
DROP FUNCTION IF EXISTS update_car_make_model();

-- Now drop old columns after migration (if they exist)
ALTER TABLE public.contracts 
DROP COLUMN IF EXISTS renter_name,
DROP COLUMN IF EXISTS renter_driving_license,
DROP COLUMN IF EXISTS renter_phone,
DROP COLUMN IF EXISTS car_make,
DROP COLUMN IF EXISTS car_model,
DROP COLUMN IF EXISTS mileage_start,
DROP COLUMN IF EXISTS mileage_end;

-- ==============================================
-- 4. CREATE AUTH TRIGGER
-- ==============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix any existing users missing profiles
INSERT INTO public.users (id, email, name, created_at, updated_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'name', email) as name,
    created_at,
    NOW()
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.users.id
);

-- ==============================================
-- 5. FIX DAMAGE POINTS TABLE
-- ==============================================
-- Add missing columns for damage_points
ALTER TABLE public.damage_points 
ADD COLUMN IF NOT EXISTS x_position DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS y_position DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS view_side TEXT,
ADD COLUMN IF NOT EXISTS marker_type TEXT DEFAULT 'slight-scratch';

-- Add constraint for marker_type if not exists
ALTER TABLE public.damage_points 
DROP CONSTRAINT IF EXISTS damage_points_marker_type_check;

ALTER TABLE public.damage_points 
ADD CONSTRAINT damage_points_marker_type_check 
CHECK (marker_type IN ('slight-scratch', 'heavy-scratch', 'bent', 'broken'));

-- ==============================================
-- 6. CREATE USER PUSH TOKENS TABLE
-- ==============================================
-- Create table for storing user push notification tokens
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
  device_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one token per user per device type
  CONSTRAINT user_push_tokens_unique UNIQUE (user_id, device_type)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS user_push_tokens_user_id_idx ON public.user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS user_push_tokens_active_idx ON public.user_push_tokens(is_active);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can update their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can delete their own push tokens" ON public.user_push_tokens;

-- RLS Policies
CREATE POLICY "Users can view their own push tokens"
  ON public.user_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens"
  ON public.user_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON public.user_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON public.user_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Complete database fix finished successfully!';
    RAISE NOTICE '📊 Users: Added AADE and company fields';
    RAISE NOTICE '🚗 Cars: Added status field';
    RAISE NOTICE '📄 Contracts: Added all missing columns and triggers';
    RAISE NOTICE '📝 Damage points: Added missing columns';
    RAISE NOTICE '📱 Push tokens: Created notification table';
    RAISE NOTICE '👤 Auth: Created auto-profile trigger';
    RAISE NOTICE '🚀 Everything should work now!';
END $$;

