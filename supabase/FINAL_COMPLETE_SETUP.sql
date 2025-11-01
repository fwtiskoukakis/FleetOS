-- ==============================================
-- COMPLETE FINAL SETUP - RUN THIS ONE TIME
-- ==============================================
-- This combines all fixes into one script

-- 1. Add missing columns
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

ALTER TABLE public.cars 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance'));

CREATE INDEX IF NOT EXISTS users_company_vat_number_idx ON public.users (company_vat_number);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON public.users (is_active);
CREATE INDEX IF NOT EXISTS cars_status_idx ON public.cars (status);

-- 2. Create auth trigger function
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

-- 3. Create auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Fix any existing users missing profiles
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Complete setup finished successfully!';
    RAISE NOTICE '📊 Added missing columns to users and cars tables';
    RAISE NOTICE '🔧 Created auth trigger for automatic profile creation';
    RAISE NOTICE '👤 Fixed any existing users missing profiles';
    RAISE NOTICE '🚀 Everything should work now!';
END $$;

