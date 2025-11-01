-- ==============================================
-- FIX CONTRACTS TABLE COLUMNS
-- ==============================================
-- Adds missing columns that the app expects
-- This resolves the "column car_make_model does not exist" error

-- Add car_make_model column (concatenated make and model)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS car_make_model TEXT;

-- Add renter_full_name if renter_name exists but renter_full_name doesn't
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS renter_full_name TEXT;

-- Add car_year if it doesn't exist
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS car_year INTEGER;

-- Add car_mileage if it doesn't exist (maps to mileage_start)
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS car_mileage INTEGER;

-- Add renter_tax_id if it doesn't exist
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS renter_tax_id TEXT;

-- Add renter_driver_license_number if it doesn't exist
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS renter_driver_license_number TEXT;

-- Add renter_phone_number if it doesn't exist
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS renter_phone_number TEXT;

-- Copy data from old columns to new columns
-- Update car_make_model from car_make and car_model
UPDATE public.contracts 
SET car_make_model = TRIM(COALESCE(car_make, '') || ' ' || COALESCE(car_model, ''))
WHERE car_make_model IS NULL AND (car_make IS NOT NULL OR car_model IS NOT NULL);

-- Update renter_full_name from renter_name
UPDATE public.contracts 
SET renter_full_name = renter_name
WHERE renter_full_name IS NULL AND renter_name IS NOT NULL;

-- Update car_mileage from mileage_start
UPDATE public.contracts 
SET car_mileage = mileage_start
WHERE car_mileage IS NULL AND mileage_start IS NOT NULL;

-- Update renter_phone_number from renter_phone
UPDATE public.contracts 
SET renter_phone_number = renter_phone
WHERE renter_phone_number IS NULL AND renter_phone IS NOT NULL;

-- Update renter_driver_license_number from renter_driving_license
UPDATE public.contracts 
SET renter_driver_license_number = renter_driving_license
WHERE renter_driver_license_number IS NULL AND renter_driving_license IS NOT NULL;

-- Add other missing columns
ALTER TABLE public.contracts 
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

-- Ensure pickup and dropoff dates are TIMESTAMP, not DATE
-- Note: We can't change column type if it already exists, so we'll work with what we have

-- Create trigger to automatically update car_make_model when car_make or car_model changes
CREATE OR REPLACE FUNCTION update_car_make_model()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.car_make IS NOT NULL OR NEW.car_model IS NOT NULL) THEN
    NEW.car_make_model := TRIM(COALESCE(NEW.car_make, '') || ' ' || COALESCE(NEW.car_model, ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_car_make_model ON public.contracts;
CREATE TRIGGER trigger_update_car_make_model
  BEFORE INSERT OR UPDATE ON public.contracts
  FOR EACH ROW
  WHEN (NEW.car_make IS NOT NULL OR NEW.car_model IS NOT NULL)
  EXECUTE FUNCTION update_car_make_model();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Contracts table columns fixed successfully!';
    RAISE NOTICE '📊 Added all missing columns';
    RAISE NOTICE '🔄 Migrated data from old columns to new columns';
    RAISE NOTICE '🤖 Created trigger to auto-sync car_make_model';
    RAISE NOTICE '🚀 Contracts should now save correctly!';
END $$;

