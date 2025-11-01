-- ==============================================
-- ADD AUTH TRIGGER TO AUTO-CREATE USER PROFILE
-- ==============================================
-- This trigger automatically creates a profile in public.users
-- when a user signs up in auth.users

-- Function to handle new user creation
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

-- Trigger that fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Auth trigger created successfully!';
    RAISE NOTICE '🔧 New users will automatically get a profile in public.users';
    RAISE NOTICE '🚀 Signup should now work correctly!';
END $$;

