-- ==============================================
-- Complete Vehicle Management Enhancement
-- Adds GPS tracking, service history, and auto-sync
-- ==============================================

-- Add GPS field to cars table
ALTER TABLE public.cars 
  ADD COLUMN IF NOT EXISTS has_gps BOOLEAN DEFAULT false;

-- Add category field if missing (for vehicle category: car, atv, scooter, motorcycle, van, truck)
ALTER TABLE public.cars 
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Add KTEO fields if missing (from enhance-cars-table.sql)
ALTER TABLE public.cars 
  ADD COLUMN IF NOT EXISTS kteo_last_date DATE,
  ADD COLUMN IF NOT EXISTS kteo_expiry_date DATE;

-- Add Insurance fields if missing
ALTER TABLE public.cars 
  ADD COLUMN IF NOT EXISTS insurance_type TEXT,
  ADD COLUMN IF NOT EXISTS insurance_company TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS insurance_has_mixed_coverage BOOLEAN DEFAULT false;

-- Add Tire fields if missing
ALTER TABLE public.cars 
  ADD COLUMN IF NOT EXISTS tires_front_date DATE,
  ADD COLUMN IF NOT EXISTS tires_front_brand TEXT,
  ADD COLUMN IF NOT EXISTS tires_rear_date DATE,
  ADD COLUMN IF NOT EXISTS tires_rear_brand TEXT;

-- Add tire next change date if missing
ALTER TABLE public.cars 
  ADD COLUMN IF NOT EXISTS tires_next_change_date DATE;

-- Add current_mileage field if missing (main vehicle mileage tracking)
ALTER TABLE public.cars 
  ADD COLUMN IF NOT EXISTS current_mileage INTEGER DEFAULT 0;

-- Add Service tracking fields if missing
ALTER TABLE public.cars 
  ADD COLUMN IF NOT EXISTS last_service_date DATE,
  ADD COLUMN IF NOT EXISTS last_service_mileage INTEGER,
  ADD COLUMN IF NOT EXISTS next_service_mileage INTEGER;

-- Add notes field if missing
ALTER TABLE public.cars 
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add status field if missing (available, rented, maintenance)
ALTER TABLE public.cars 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

-- Add user_id field if missing (for multi-user support)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cars' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add service history table
CREATE TABLE IF NOT EXISTS public.vehicle_service_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('regular', 'tire_change', 'kteo', 'insurance', 'other')),
  service_date DATE NOT NULL,
  service_mileage INTEGER,
  description TEXT,
  cost NUMERIC(10, 2),
  performed_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for service history
ALTER TABLE public.vehicle_service_history ENABLE ROW LEVEL SECURITY;

-- Service history policies
DROP POLICY IF EXISTS "Users can view service history" ON public.vehicle_service_history;
CREATE POLICY "Users can view service history"
  ON public.vehicle_service_history
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert service history" ON public.vehicle_service_history;
CREATE POLICY "Users can insert service history"
  ON public.vehicle_service_history
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update service history" ON public.vehicle_service_history;
CREATE POLICY "Users can update service history"
  ON public.vehicle_service_history
  FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete service history" ON public.vehicle_service_history;
CREATE POLICY "Users can delete service history"
  ON public.vehicle_service_history
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Indexes for service history
CREATE INDEX IF NOT EXISTS vehicle_service_history_vehicle_id_idx 
  ON public.vehicle_service_history(vehicle_id);
CREATE INDEX IF NOT EXISTS vehicle_service_history_service_date_idx 
  ON public.vehicle_service_history(service_date DESC);
CREATE INDEX IF NOT EXISTS vehicle_service_history_service_type_idx 
  ON public.vehicle_service_history(service_type);

-- Function: Auto-sync vehicles from contracts
CREATE OR REPLACE FUNCTION sync_vehicle_from_contract(
  p_license_plate TEXT,
  p_make TEXT,
  p_model TEXT,
  p_year INTEGER DEFAULT NULL,
  p_color TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_vehicle_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Check if vehicle exists
  SELECT id INTO v_vehicle_id
  FROM public.cars
  WHERE license_plate = UPPER(TRIM(p_license_plate));
  
  -- If exists, return existing ID
  IF v_vehicle_id IS NOT NULL THEN
    RETURN v_vehicle_id;
  END IF;
  
  -- Create new vehicle from contract data
  INSERT INTO public.cars (
    user_id,
    license_plate,
    make,
    model,
    year,
    color,
    category,
    current_mileage,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    UPPER(TRIM(p_license_plate)),
    p_make,
    p_model,
    COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER),
    p_color,
    p_category,
    0,
    'available',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_vehicle_id;
  
  RETURN v_vehicle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-sync vehicle when contract is created/updated
CREATE OR REPLACE FUNCTION auto_sync_vehicle_from_contract()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.car_license_plate IS NOT NULL AND TRIM(NEW.car_license_plate) != '' THEN
    BEGIN
      PERFORM sync_vehicle_from_contract(
        NEW.car_license_plate,
        COALESCE(SPLIT_PART(NEW.car_make_model, ' ', 1), 'Unknown'),
        COALESCE(SUBSTRING(NEW.car_make_model FROM POSITION(' ' IN NEW.car_make_model) + 1), 'Unknown'),
        NEW.car_year,
        NEW.car_color,
        NEW.car_category
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail contract creation
      RAISE WARNING 'Failed to sync vehicle from contract: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_sync_vehicle ON public.contracts;
CREATE TRIGGER trigger_auto_sync_vehicle
  AFTER INSERT OR UPDATE OF car_license_plate, car_make_model ON public.contracts
  FOR EACH ROW
  WHEN (NEW.car_license_plate IS NOT NULL AND TRIM(NEW.car_license_plate) != '')
  EXECUTE FUNCTION auto_sync_vehicle_from_contract();

-- Index for faster sorting (only create if columns exist)
DO $$
BEGIN
  -- Check and create indexes only if columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cars' AND column_name = 'kteo_expiry_date') THEN
    CREATE INDEX IF NOT EXISTS cars_kteo_expiry_asc_idx ON public.cars(kteo_expiry_date ASC NULLS LAST);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cars' AND column_name = 'insurance_expiry_date') THEN
    CREATE INDEX IF NOT EXISTS cars_insurance_expiry_asc_idx ON public.cars(insurance_expiry_date ASC NULLS LAST);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cars' AND column_name = 'tires_next_change_date') THEN
    CREATE INDEX IF NOT EXISTS cars_tires_next_change_asc_idx ON public.cars(tires_next_change_date ASC NULLS LAST);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cars' AND column_name = 'tires_front_date') THEN
    CREATE INDEX IF NOT EXISTS cars_tires_front_date_desc_idx ON public.cars(tires_front_date DESC NULLS LAST);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cars' AND column_name = 'tires_rear_date') THEN
    CREATE INDEX IF NOT EXISTS cars_tires_rear_date_desc_idx ON public.cars(tires_rear_date DESC NULLS LAST);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cars' AND column_name = 'last_service_date') THEN
    CREATE INDEX IF NOT EXISTS cars_last_service_date_desc_idx ON public.cars(last_service_date DESC NULLS LAST);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cars' AND column_name = 'next_service_mileage') THEN
    CREATE INDEX IF NOT EXISTS cars_next_service_mileage_asc_idx ON public.cars(next_service_mileage ASC NULLS LAST);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cars' AND column_name = 'has_gps') THEN
    CREATE INDEX IF NOT EXISTS cars_has_gps_idx ON public.cars(has_gps);
  END IF;
END $$;

COMMENT ON COLUMN public.cars.has_gps IS 'Whether vehicle has GPS tracking installed';
COMMENT ON TABLE public.vehicle_service_history IS 'Complete service history for all vehicle maintenance';

-- Update trigger for service history
CREATE OR REPLACE FUNCTION update_vehicle_service_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vehicle_service_history_updated_at ON public.vehicle_service_history;
CREATE TRIGGER update_vehicle_service_history_updated_at
  BEFORE UPDATE ON public.vehicle_service_history
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_service_history_updated_at();

DO $$
BEGIN
    RAISE NOTICE '✅ Vehicle management enhancement completed!';
    RAISE NOTICE '📡 Added GPS tracking field';
    RAISE NOTICE '📋 Created service history table';
    RAISE NOTICE '🔄 Added auto-sync from contracts';
    RAISE NOTICE '📊 Added sorting indexes';
END $$;

