-- ==============================================
-- WORDPRESS INTEGRATION ENHANCEMENTS
-- Additional database schema for WordPress plugin integration
-- ==============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 0. CREATE ORGANIZATIONS TABLE IF NOT EXISTS
-- ==============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Info
  company_name TEXT NOT NULL,
  trading_name TEXT, -- Display name
  slug TEXT UNIQUE NOT NULL, -- URL-friendly (e.g., aggelos-rentals)
  
  -- Legal Info
  vat_number TEXT UNIQUE NOT NULL, -- ΑΦΜ
  doy TEXT, -- Tax Office
  activity_code TEXT, -- ΚΑΔ
  registration_number TEXT, -- ΓΕΜΗ
  
  -- Contact Info
  primary_address TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'GR',
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT,
  email_primary TEXT NOT NULL,
  email_support TEXT,
  website TEXT,
  
  -- Branding
  logo_url TEXT, -- Main logo
  icon_url TEXT, -- Small icon/favicon
  brand_color_primary TEXT DEFAULT '#007AFF',
  brand_color_secondary TEXT DEFAULT '#FFD700',
  contract_header_image_url TEXT,
  
  -- AADE Integration
  aade_user_id TEXT,
  aade_subscription_key TEXT,
  aade_enabled BOOLEAN DEFAULT false,
  aade_test_mode BOOLEAN DEFAULT true,
  
  -- Business Settings
  business_type TEXT CHECK (business_type IN ('small', 'medium', 'large')),
  timezone TEXT DEFAULT 'Europe/Athens',
  currency TEXT DEFAULT 'EUR',
  language TEXT DEFAULT 'el',
  
  -- Features & Limits
  max_users INTEGER DEFAULT 5,
  max_vehicles INTEGER DEFAULT 50,
  max_contracts_per_month INTEGER DEFAULT 1000,
  
  -- Subscription
  subscription_plan TEXT CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
  subscription_status TEXT CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_starts_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for organizations if they don't exist
CREATE INDEX IF NOT EXISTS organizations_slug_idx ON public.organizations (slug);
CREATE INDEX IF NOT EXISTS organizations_vat_number_idx ON public.organizations (vat_number);
CREATE INDEX IF NOT EXISTS organizations_slug_active_idx ON public.organizations(slug, is_active, subscription_status);

-- ==============================================
-- 0.1. CREATE BRANCHES TABLE IF NOT EXISTS
-- ==============================================
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint if organizations table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'branches_organization_id_fkey'
    ) THEN
      ALTER TABLE public.branches
        ADD CONSTRAINT branches_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ==============================================
-- 0.5. ADD ORGANIZATION_ID COLUMNS TO EXISTING TABLES
-- ==============================================
-- Add organization_id column to tables that need it for multi-tenancy
DO $$
BEGIN
  -- Add organization_id to online_bookings table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'online_bookings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'organization_id') THEN
      ALTER TABLE public.online_bookings ADD COLUMN organization_id UUID;
      
      -- Add foreign key if organizations table exists and constraint doesn't exist
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'online_bookings_organization_id_fkey'
        ) THEN
          ALTER TABLE public.online_bookings 
            ADD CONSTRAINT online_bookings_organization_id_fkey 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
      END IF;
      
      -- Create index
      CREATE INDEX IF NOT EXISTS online_bookings_organization_id_idx ON public.online_bookings(organization_id);
    END IF;
  END IF;
  
  -- Add organization_id to contracts table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'organization_id') THEN
      ALTER TABLE public.contracts ADD COLUMN organization_id UUID;
      
      -- Add foreign key if organizations table exists and constraint doesn't exist
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'contracts_organization_id_fkey'
        ) THEN
          ALTER TABLE public.contracts 
            ADD CONSTRAINT contracts_organization_id_fkey 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
      END IF;
      
      -- Create index
      CREATE INDEX IF NOT EXISTS contracts_organization_id_idx ON public.contracts(organization_id);
    END IF;
  END IF;
  
  -- Add organization_id to cars table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cars') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'organization_id') THEN
      ALTER TABLE public.cars ADD COLUMN organization_id UUID;
      
      -- Add foreign key if organizations table exists and constraint doesn't exist
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'cars_organization_id_fkey'
        ) THEN
          ALTER TABLE public.cars 
            ADD CONSTRAINT cars_organization_id_fkey 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
      END IF;
      
      -- Create index
      CREATE INDEX IF NOT EXISTS cars_organization_id_idx ON public.cars(organization_id);
    END IF;
  END IF;
  
  -- Add organization_id to booking_cars table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_cars') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'booking_cars' AND column_name = 'organization_id') THEN
      ALTER TABLE public.booking_cars ADD COLUMN organization_id UUID;
      
      -- Add foreign key if organizations table exists and constraint doesn't exist
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'booking_cars_organization_id_fkey'
        ) THEN
          ALTER TABLE public.booking_cars 
            ADD CONSTRAINT booking_cars_organization_id_fkey 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
      END IF;
      
      -- Create index
      CREATE INDEX IF NOT EXISTS booking_cars_organization_id_idx ON public.booking_cars(organization_id);
    END IF;
  END IF;
  
  -- Add organization_id to customer_profiles table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customer_profiles' AND column_name = 'organization_id') THEN
      ALTER TABLE public.customer_profiles ADD COLUMN organization_id UUID;
      
      -- Add foreign key if organizations table exists and constraint doesn't exist
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'customer_profiles_organization_id_fkey'
        ) THEN
          ALTER TABLE public.customer_profiles 
            ADD CONSTRAINT customer_profiles_organization_id_fkey 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
      END IF;
      
      -- Create index
      CREATE INDEX IF NOT EXISTS customer_profiles_organization_id_idx ON public.customer_profiles(organization_id);
    END IF;
  END IF;
  
  -- Add organization_id to invoices table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'organization_id') THEN
      ALTER TABLE public.invoices ADD COLUMN organization_id UUID;
      
      -- Add foreign key if organizations table exists and constraint doesn't exist
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'invoices_organization_id_fkey'
        ) THEN
          ALTER TABLE public.invoices 
            ADD CONSTRAINT invoices_organization_id_fkey 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
      END IF;
      
      -- Create index
      CREATE INDEX IF NOT EXISTS invoices_organization_id_idx ON public.invoices(organization_id);
    END IF;
  END IF;
END $$;

-- ==============================================
-- 1. ENHANCE ONLINE_BOOKINGS TABLE
-- ==============================================
-- Add columns one by one (PostgreSQL doesn't support multiple ADD COLUMN IF NOT EXISTS in one statement)
DO $$
BEGIN
  -- Customer Information (Complete Contract Data)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'customer_tax_id') THEN
    ALTER TABLE public.online_bookings ADD COLUMN customer_tax_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'customer_driver_license_issue_date') THEN
    ALTER TABLE public.online_bookings ADD COLUMN customer_driver_license_issue_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'customer_driver_license_expiry_date') THEN
    ALTER TABLE public.online_bookings ADD COLUMN customer_driver_license_expiry_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'customer_date_of_birth') THEN
    ALTER TABLE public.online_bookings ADD COLUMN customer_date_of_birth DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'customer_age') THEN
    ALTER TABLE public.online_bookings ADD COLUMN customer_age INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'customer_city') THEN
    ALTER TABLE public.online_bookings ADD COLUMN customer_city TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'customer_country') THEN
    ALTER TABLE public.online_bookings ADD COLUMN customer_country TEXT DEFAULT 'Greece';
  END IF;
  
  -- Branch Support
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'branch_id') THEN
    ALTER TABLE public.online_bookings ADD COLUMN branch_id UUID;
  END IF;
  
  -- Booking Session Management
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'session_id') THEN
    ALTER TABLE public.online_bookings ADD COLUMN session_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'expires_at') THEN
    ALTER TABLE public.online_bookings ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Invoice & AADE Integration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'invoice_id') THEN
    ALTER TABLE public.online_bookings ADD COLUMN invoice_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'aade_dcl_id') THEN
    ALTER TABLE public.online_bookings ADD COLUMN aade_dcl_id INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'aade_status') THEN
    ALTER TABLE public.online_bookings ADD COLUMN aade_status TEXT CHECK (aade_status IN ('pending', 'submitted', 'completed', 'error'));
  END IF;
  
  -- Modification Tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'modification_count') THEN
    ALTER TABLE public.online_bookings ADD COLUMN modification_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'last_modified_at') THEN
    ALTER TABLE public.online_bookings ADD COLUMN last_modified_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Source Tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'source') THEN
    ALTER TABLE public.online_bookings ADD COLUMN source TEXT DEFAULT 'direct' CHECK (source IN ('direct', 'wordpress', 'api', 'mobile'));
  END IF;
  
  -- Discount Code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'online_bookings' AND column_name = 'discount_code_id') THEN
    ALTER TABLE public.online_bookings ADD COLUMN discount_code_id UUID;
  END IF;
END $$;

-- Add foreign key constraints separately (if tables exist)
DO $$
BEGIN
  -- Branch foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'online_bookings_branch_id_fkey'
    ) THEN
      ALTER TABLE public.online_bookings
        ADD CONSTRAINT online_bookings_branch_id_fkey 
        FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Invoice foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'online_bookings_invoice_id_fkey'
    ) THEN
      ALTER TABLE public.online_bookings
        ADD CONSTRAINT online_bookings_invoice_id_fkey 
        FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Discount code foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discount_codes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'online_bookings_discount_code_id_fkey'
    ) THEN
      ALTER TABLE public.online_bookings
        ADD CONSTRAINT online_bookings_discount_code_id_fkey 
        FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create index for session_id
CREATE INDEX IF NOT EXISTS online_bookings_session_id_idx ON public.online_bookings(session_id);

-- Create index for expires_at
CREATE INDEX IF NOT EXISTS online_bookings_expires_at_idx ON public.online_bookings(expires_at);

-- Create index for source
CREATE INDEX IF NOT EXISTS online_bookings_source_idx ON public.online_bookings(source);

-- ==============================================
-- 2. ENHANCE CONTRACTS TABLE
-- ==============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'contract_number') THEN
    ALTER TABLE public.contracts ADD COLUMN contract_number TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'branch_id') THEN
    ALTER TABLE public.contracts ADD COLUMN branch_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'online_booking_id') THEN
    ALTER TABLE public.contracts ADD COLUMN online_booking_id UUID;
  END IF;
END $$;

-- Add foreign key constraints separately (if tables exist)
DO $$
BEGIN
  -- Branch foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'contracts_branch_id_fkey'
    ) THEN
      ALTER TABLE public.contracts
        ADD CONSTRAINT contracts_branch_id_fkey 
        FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Online booking foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'online_bookings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'contracts_online_booking_id_fkey'
    ) THEN
      ALTER TABLE public.contracts
        ADD CONSTRAINT contracts_online_booking_id_fkey 
        FOREIGN KEY (online_booking_id) REFERENCES public.online_bookings(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create index for contract_number
CREATE INDEX IF NOT EXISTS contracts_contract_number_idx ON public.contracts(contract_number);

-- Create index for online_booking_id
CREATE INDEX IF NOT EXISTS contracts_online_booking_id_idx ON public.contracts(online_booking_id);

-- ==============================================
-- 3. CAR AVAILABILITY FUNCTION
-- ==============================================
CREATE OR REPLACE FUNCTION is_car_available(
  p_car_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  conflicting_booking_count INTEGER;
  conflicting_availability_count INTEGER;
BEGIN
  -- Check for conflicting bookings
  SELECT COUNT(*) INTO conflicting_booking_count
  FROM public.online_bookings
  WHERE car_id = p_car_id
    AND booking_status NOT IN ('cancelled', 'expired', 'no_show')
    AND (
      (pickup_date <= p_start_date AND dropoff_date >= p_start_date) OR
      (pickup_date <= p_end_date AND dropoff_date >= p_end_date) OR
      (pickup_date >= p_start_date AND dropoff_date <= p_end_date)
    );

  -- Check for conflicting availability blocks
  SELECT COUNT(*) INTO conflicting_availability_count
  FROM public.car_availability
  WHERE car_id = p_car_id
    AND is_active = true
    AND (
      (blocked_from <= p_start_date AND blocked_until >= p_start_date) OR
      (blocked_from <= p_end_date AND blocked_until >= p_end_date) OR
      (blocked_from >= p_start_date AND blocked_until <= p_end_date)
    );

  -- Check for conflicting contracts
  SELECT COUNT(*) INTO conflicting_booking_count
  FROM public.contracts
  WHERE car_license_plate IN (
    SELECT license_plate FROM public.booking_cars WHERE id = p_car_id
  )
    AND status NOT IN ('completed', 'cancelled')
    AND (
      (pickup_date <= p_start_date AND dropoff_date >= p_start_date) OR
      (pickup_date <= p_end_date AND dropoff_date >= p_end_date) OR
      (pickup_date >= p_start_date AND dropoff_date <= p_end_date)
    );

  RETURN (conflicting_booking_count = 0 AND conflicting_availability_count = 0);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 4. CONTRACT NUMBER GENERATION FUNCTION
-- ==============================================
CREATE OR REPLACE FUNCTION generate_contract_number(p_organization_id UUID)
RETURNS TEXT AS $$
DECLARE
  org_settings RECORD;
  new_number TEXT;
  counter INTEGER;
  prefix TEXT;
BEGIN
  -- Get organization settings (if table exists)
  prefix := 'CNT'; -- Default prefix
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_settings') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_settings' AND column_name = 'organization_id') THEN
      SELECT contract_prefix, contract_number_start INTO org_settings
      FROM public.organization_settings
      WHERE organization_id = p_organization_id;
      
      prefix := COALESCE(org_settings.contract_prefix, 'CNT');
    END IF;
  END IF;
  
  -- Get next number (if contracts table exists and has organization_id)
  counter := 1000; -- Default start
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'organization_id') THEN
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(contract_number FROM '[0-9]+$') AS INTEGER)),
        COALESCE(org_settings.contract_number_start, 1000) - 1
      ) + 1
      INTO counter
      FROM public.contracts
      WHERE organization_id = p_organization_id
        AND contract_number IS NOT NULL
        AND contract_number LIKE prefix || '-%';
    ELSE
      -- If contracts table exists but no organization_id, just count all contracts
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(contract_number FROM '[0-9]+$') AS INTEGER)),
        1000 - 1
      ) + 1
      INTO counter
      FROM public.contracts
      WHERE contract_number IS NOT NULL
        AND contract_number LIKE prefix || '-%';
    END IF;
  END IF;

  new_number := prefix || '-' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 5. BOOKING EXPIRATION FUNCTION
-- ==============================================
CREATE OR REPLACE FUNCTION expire_unpaid_bookings()
RETURNS void AS $$
BEGIN
  UPDATE public.online_bookings
  SET booking_status = 'expired',
      admin_notes = COALESCE(admin_notes, '') || E'\nExpired due to non-payment at ' || NOW()::TEXT
  WHERE booking_status = 'pending'
    AND payment_status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW()
    AND pickup_date > CURRENT_DATE; -- Only expire future bookings
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 6. DUPLICATE BOOKING CHECK FUNCTION
-- ==============================================
CREATE OR REPLACE FUNCTION check_duplicate_booking(
  p_customer_email TEXT,
  p_car_id UUID,
  p_pickup_date DATE,
  p_dropoff_date DATE,
  p_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  duplicate_count INTEGER := 0;
  has_org_id BOOLEAN := FALSE;
BEGIN
  -- Check if organization_id column exists in online_bookings
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'online_bookings' 
      AND column_name = 'organization_id'
  ) INTO has_org_id;
  
  IF has_org_id THEN
    SELECT COUNT(*) INTO duplicate_count
    FROM public.online_bookings
    WHERE customer_email = LOWER(p_customer_email)
      AND car_id = p_car_id
      AND organization_id = p_organization_id
      AND booking_status NOT IN ('cancelled', 'expired', 'no_show')
      AND (
        (pickup_date <= p_pickup_date AND dropoff_date >= p_pickup_date) OR
        (pickup_date <= p_dropoff_date AND dropoff_date >= p_dropoff_date) OR
        (pickup_date >= p_pickup_date AND dropoff_date <= p_dropoff_date)
      );
  ELSE
    -- If no organization_id column, check without it
    SELECT COUNT(*) INTO duplicate_count
    FROM public.online_bookings
    WHERE customer_email = LOWER(p_customer_email)
      AND car_id = p_car_id
      AND booking_status NOT IN ('cancelled', 'expired', 'no_show')
      AND (
        (pickup_date <= p_pickup_date AND dropoff_date >= p_pickup_date) OR
        (pickup_date <= p_dropoff_date AND dropoff_date >= p_dropoff_date) OR
        (pickup_date >= p_pickup_date AND dropoff_date <= p_dropoff_date)
      );
  END IF;
  
  RETURN duplicate_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 7. AUTO-BLOCK CAR DATES ON BOOKING CREATION
-- ==============================================
CREATE OR REPLACE FUNCTION block_car_dates_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only block if booking is confirmed or pending with payment
  IF NEW.booking_status IN ('confirmed', 'pending') 
     AND NEW.payment_status IN ('deposit_paid', 'fully_paid') THEN
    INSERT INTO public.car_availability (
      car_id,
      blocked_from,
      blocked_until,
      reason,
      booking_id,
      is_active
    ) VALUES (
      NEW.car_id,
      NEW.pickup_date,
      NEW.dropoff_date,
      'booked',
      NEW.id,
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_created_block_dates
  AFTER INSERT ON public.online_bookings
  FOR EACH ROW
  EXECUTE FUNCTION block_car_dates_on_booking();

-- ==============================================
-- 8. AUTO-CREATE CONTRACT FROM BOOKING FUNCTION
-- ==============================================
CREATE OR REPLACE FUNCTION auto_create_contract_from_booking(p_booking_id UUID)
RETURNS UUID AS $$
DECLARE
  booking_record RECORD;
  contract_id UUID;
  customer_id UUID;
  car_record RECORD;
  contract_number TEXT;
  branch_id UUID;
  has_org_id BOOLEAN := FALSE;
  current_mileage INTEGER := 0;
  current_fuel_level INTEGER := 8; -- Default full tank
  customer_has_org_id BOOLEAN := FALSE;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record
  FROM public.online_bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Check if contract already exists
  IF booking_record.contract_id IS NOT NULL THEN
    RETURN booking_record.contract_id;
  END IF;

  -- Get car details
  SELECT * INTO car_record
  FROM public.booking_cars
  WHERE id = booking_record.car_id;

  -- Find or create customer (if customer_profiles table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_profiles') THEN
    -- Check if organization_id column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'customer_profiles' 
        AND column_name = 'organization_id'
    ) INTO customer_has_org_id;
    
    IF customer_has_org_id THEN
      SELECT id INTO customer_id
      FROM public.customer_profiles
      WHERE email = booking_record.customer_email
        AND organization_id = booking_record.organization_id
      LIMIT 1;
    ELSE
      SELECT id INTO customer_id
      FROM public.customer_profiles
      WHERE email = booking_record.customer_email
      LIMIT 1;
    END IF;

    IF customer_id IS NULL THEN
      IF customer_has_org_id THEN
        INSERT INTO public.customer_profiles (
          organization_id,
          full_name,
          email,
          phone_number,
          address,
          city,
          country,
          tax_id,
          date_of_birth,
          driver_license_number,
          driver_license_issue_date,
          driver_license_expiry_date
        ) VALUES (
          booking_record.organization_id,
          booking_record.customer_full_name,
          booking_record.customer_email,
          booking_record.customer_phone,
          booking_record.customer_address,
          booking_record.customer_city,
          booking_record.customer_country,
          booking_record.customer_tax_id,
          booking_record.customer_date_of_birth,
          booking_record.customer_driver_license,
          booking_record.customer_driver_license_issue_date,
          booking_record.customer_driver_license_expiry_date
        ) RETURNING id INTO customer_id;
      ELSE
        INSERT INTO public.customer_profiles (
          full_name,
          email,
          phone_number,
          address,
          city,
          country,
          tax_id,
          date_of_birth,
          driver_license_number,
          driver_license_issue_date,
          driver_license_expiry_date
        ) VALUES (
          booking_record.customer_full_name,
          booking_record.customer_email,
          booking_record.customer_phone,
          booking_record.customer_address,
          booking_record.customer_city,
          booking_record.customer_country,
          booking_record.customer_tax_id,
          booking_record.customer_date_of_birth,
          booking_record.customer_driver_license,
          booking_record.customer_driver_license_issue_date,
          booking_record.customer_driver_license_expiry_date
        ) RETURNING id INTO customer_id;
      END IF;
    END IF;
  ELSE
    customer_id := NULL;
  END IF;

  -- Find branch by location (if branches table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
    SELECT b.id INTO branch_id
    FROM public.branches b
    JOIN public.locations l ON l.id = booking_record.pickup_location_id
    WHERE b.organization_id = booking_record.organization_id
    LIMIT 1;
  ELSE
    branch_id := NULL;
  END IF;

  -- Generate contract number
  SELECT generate_contract_number(booking_record.organization_id) INTO contract_number;

  -- Get current car mileage and fuel level
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cars') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'organization_id') THEN
      SELECT current_mileage, COALESCE(fuel_level, 8) INTO current_mileage, current_fuel_level
      FROM public.cars
      WHERE license_plate = car_record.license_plate
        AND organization_id = booking_record.organization_id
      LIMIT 1;
    ELSE
      -- If cars table exists but no organization_id column
      SELECT current_mileage, COALESCE(fuel_level, 8) INTO current_mileage, current_fuel_level
      FROM public.cars
      WHERE license_plate = car_record.license_plate
      LIMIT 1;
    END IF;
  END IF;

  -- Check if organization_id column exists in contracts table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'contracts' 
      AND column_name = 'organization_id'
  ) INTO has_org_id;
  
  -- Create contract (using conditional INSERT to handle optional organization_id column)
  IF has_org_id THEN
      -- Include organization_id in INSERT
      INSERT INTO public.contracts (
        organization_id,
        customer_id,
        online_booking_id,
        branch_id,
        contract_number,
        renter_full_name,
        renter_id_number,
        renter_tax_id,
        renter_driver_license_number,
        renter_phone_number,
        renter_email,
        renter_address,
        pickup_date,
        pickup_time,
        pickup_location,
        dropoff_date,
        dropoff_time,
        dropoff_location,
        is_different_dropoff_location,
        total_cost,
        deposit_amount,
        insurance_cost,
        car_make_model,
        car_year,
        car_license_plate,
        car_mileage,
        car_category,
        car_color,
        fuel_level,
        insurance_type,
        exterior_condition,
        interior_condition,
        mechanical_condition,
        status,
        created_at
      ) VALUES (
        booking_record.organization_id,
        customer_id,
        p_booking_id,
        branch_id,
        contract_number,
        booking_record.customer_full_name,
        booking_record.customer_id_number,
        booking_record.customer_tax_id,
        booking_record.customer_driver_license,
        booking_record.customer_phone,
        booking_record.customer_email,
        booking_record.customer_address,
        booking_record.pickup_date,
        booking_record.pickup_time,
        (SELECT name_el FROM public.locations WHERE id = booking_record.pickup_location_id),
        booking_record.dropoff_date,
        booking_record.dropoff_time,
        (SELECT name_el FROM public.locations WHERE id = booking_record.dropoff_location_id),
        booking_record.pickup_location_id != booking_record.dropoff_location_id,
        booking_record.total_price,
        booking_record.amount_paid,
        booking_record.insurance_price,
        car_record.make || ' ' || car_record.model,
        car_record.year,
        car_record.license_plate,
        current_mileage,
        (SELECT name_el FROM public.car_categories WHERE id = car_record.category_id),
        car_record.color,
        current_fuel_level,
        COALESCE((SELECT name FROM public.insurance_types WHERE id = booking_record.selected_insurance_id), 'basic'),
        'good',
        'good',
        'good',
        'active',
        NOW()
      ) RETURNING id INTO contract_id;
    ELSE
      -- Exclude organization_id from INSERT
      INSERT INTO public.contracts (
        customer_id,
        online_booking_id,
        branch_id,
        contract_number,
        renter_full_name,
        renter_id_number,
        renter_tax_id,
        renter_driver_license_number,
        renter_phone_number,
        renter_email,
        renter_address,
        pickup_date,
        pickup_time,
        pickup_location,
        dropoff_date,
        dropoff_time,
        dropoff_location,
        is_different_dropoff_location,
        total_cost,
        deposit_amount,
        insurance_cost,
        car_make_model,
        car_year,
        car_license_plate,
        car_mileage,
        car_category,
        car_color,
        fuel_level,
        insurance_type,
        exterior_condition,
        interior_condition,
        mechanical_condition,
        status,
        created_at
      ) VALUES (
        customer_id,
        p_booking_id,
        branch_id,
        contract_number,
        booking_record.customer_full_name,
        booking_record.customer_id_number,
        booking_record.customer_tax_id,
        booking_record.customer_driver_license,
        booking_record.customer_phone,
        booking_record.customer_email,
        booking_record.customer_address,
        booking_record.pickup_date,
        booking_record.pickup_time,
        (SELECT name_el FROM public.locations WHERE id = booking_record.pickup_location_id),
        booking_record.dropoff_date,
        booking_record.dropoff_time,
        (SELECT name_el FROM public.locations WHERE id = booking_record.dropoff_location_id),
        booking_record.pickup_location_id != booking_record.dropoff_location_id,
        booking_record.total_price,
        booking_record.amount_paid,
        booking_record.insurance_price,
        car_record.make || ' ' || car_record.model,
        car_record.year,
        car_record.license_plate,
        current_mileage,
        (SELECT name_el FROM public.car_categories WHERE id = car_record.category_id),
        car_record.color,
        current_fuel_level,
        COALESCE((SELECT name FROM public.insurance_types WHERE id = booking_record.selected_insurance_id), 'basic'),
        'good',
        'good',
        'good',
        'active',
        NOW()
      ) RETURNING id INTO contract_id;
  END IF;

  -- Update booking with contract_id
  UPDATE public.online_bookings
  SET contract_id = contract_id,
      converted_to_contract_at = NOW()
  WHERE id = p_booking_id;

  RETURN contract_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 9. SUBSCRIPTION LIMIT CHECK FUNCTION
-- ==============================================
CREATE OR REPLACE FUNCTION check_contract_limit(p_organization_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER := 0;
  max_allowed INTEGER;
BEGIN
  -- Get current month's contract count (if contracts table exists and has organization_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'organization_id') THEN
      SELECT COUNT(*) INTO current_count
      FROM public.contracts
      WHERE organization_id = p_organization_id
        AND created_at IS NOT NULL
        AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    END IF;
  END IF;
  
  -- Get organization limit (if organizations table exists)
  max_allowed := 999999; -- Default unlimited
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'max_contracts_per_month') THEN
      SELECT max_contracts_per_month INTO max_allowed
      FROM public.organizations
      WHERE id = p_organization_id;
      max_allowed := COALESCE(max_allowed, 999999);
    END IF;
  END IF;
  
  RETURN current_count < max_allowed;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 10. ORGANIZATION VALIDATION FUNCTION
-- ==============================================
CREATE OR REPLACE FUNCTION validate_organization_access(p_slug TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  organization_id UUID,
  subscription_status TEXT,
  is_active BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  org_record RECORD;
BEGIN
  SELECT * INTO org_record
  FROM public.organizations
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, false, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  IF NOT org_record.is_active THEN
    RETURN QUERY SELECT false, org_record.id, org_record.subscription_status, false, 'Organization is not active'::TEXT;
    RETURN;
  END IF;

  IF org_record.subscription_status NOT IN ('active', 'trial') THEN
    RETURN QUERY SELECT false, org_record.id, org_record.subscription_status, false, 'Subscription is not active'::TEXT;
    RETURN;
  END IF;

  IF org_record.subscription_status = 'trial' AND org_record.trial_ends_at < NOW() THEN
    RETURN QUERY SELECT false, org_record.id, org_record.subscription_status, false, 'Trial period has expired'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, org_record.id, org_record.subscription_status, org_record.is_active, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 11. ADDITIONAL INDEXES FOR PERFORMANCE
-- ==============================================
CREATE INDEX IF NOT EXISTS online_bookings_org_status_idx 
  ON public.online_bookings(organization_id, booking_status, created_at DESC);

CREATE INDEX IF NOT EXISTS online_bookings_customer_email_idx 
  ON public.online_bookings(customer_email, organization_id);

CREATE INDEX IF NOT EXISTS car_availability_dates_car_idx 
  ON public.car_availability(car_id, blocked_from, blocked_until);

CREATE INDEX IF NOT EXISTS contracts_org_created_idx 
  ON public.contracts(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS organizations_slug_active_idx 
  ON public.organizations(slug, is_active, subscription_status);

-- ==============================================
-- 12. BOOKING AUDIT LOG TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.booking_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES public.online_bookings(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'cancelled', 'status_changed', 'payment_processed')),
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_audit_log_booking_id_idx ON public.booking_audit_log(booking_id);
CREATE INDEX IF NOT EXISTS booking_audit_log_created_at_idx ON public.booking_audit_log(created_at DESC);

-- ==============================================
-- 12.5. CREATE INTEGRATIONS TABLE IF NOT EXISTS
-- ==============================================
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  integration_type TEXT CHECK (integration_type IN ('wordpress', 'woocommerce', 'wheelsys', 'xml_feed', 'api', 'webhook')),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  credentials JSONB,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT CHECK (sync_status IN ('success', 'failed', 'pending', 'in_progress')),
  sync_error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint if organizations table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'integrations_organization_id_fkey'
    ) THEN
      ALTER TABLE public.integrations
        ADD CONSTRAINT integrations_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS integrations_organization_id_idx ON public.integrations(organization_id);

-- ==============================================
-- 13. INTEGRATION HEALTH LOG TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS public.integration_health_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID,
  organization_id UUID,
  
  check_type TEXT NOT NULL CHECK (check_type IN ('api_test', 'webhook_test', 'sync_test', 'connection_test')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'warning')),
  response_time_ms INTEGER,
  error_message TEXT,
  response_data JSONB,
  
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints conditionally
DO $$
BEGIN
  -- Add integration_id foreign key if integrations table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integrations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'integration_health_logs_integration_id_fkey'
    ) THEN
      ALTER TABLE public.integration_health_logs
        ADD CONSTRAINT integration_health_logs_integration_id_fkey 
        FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE CASCADE;
    END IF;
  END IF;
  
  -- Add organization_id foreign key if organizations table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'integration_health_logs_organization_id_fkey'
    ) THEN
      ALTER TABLE public.integration_health_logs
        ADD CONSTRAINT integration_health_logs_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS integration_health_logs_integration_idx ON public.integration_health_logs(integration_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS integration_health_logs_org_idx ON public.integration_health_logs(organization_id, checked_at DESC);

-- Auto-update integration sync_status (only if integrations table exists)
CREATE OR REPLACE FUNCTION update_integration_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if integrations table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integrations') THEN
    IF NEW.integration_id IS NOT NULL THEN
      IF NEW.status = 'failed' THEN
        UPDATE public.integrations
        SET sync_status = 'failed',
            sync_error_message = NEW.error_message,
            last_sync_at = NEW.checked_at
        WHERE id = NEW.integration_id;
      ELSIF NEW.status = 'success' THEN
        UPDATE public.integrations
        SET sync_status = 'success',
            last_sync_at = NEW.checked_at,
            sync_error_message = NULL
        WHERE id = NEW.integration_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if integrations table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integrations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'on_integration_health_log'
    ) THEN
      CREATE TRIGGER on_integration_health_log
        AFTER INSERT ON public.integration_health_logs
        FOR EACH ROW
        EXECUTE FUNCTION update_integration_status();
    END IF;
  END IF;
END $$;

-- ==============================================
-- 14. INVOICE AUTO-GENERATION FUNCTION
-- ==============================================
CREATE OR REPLACE FUNCTION create_invoice_from_booking(p_booking_id UUID)
RETURNS UUID AS $$
DECLARE
  booking_record RECORD;
  invoice_id UUID;
  customer_id UUID;
  org_settings RECORD;
  tax_rate DECIMAL;
  invoice_has_org_id BOOLEAN := FALSE;
  invoice_count INTEGER := 1;
BEGIN
  SELECT * INTO booking_record
  FROM public.online_bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Check if invoice already exists
  IF booking_record.invoice_id IS NOT NULL THEN
    RETURN booking_record.invoice_id;
  END IF;

  -- Get customer ID (if customer_profiles table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_profiles') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customer_profiles' AND column_name = 'organization_id') THEN
      SELECT id INTO customer_id
      FROM public.customer_profiles
      WHERE email = booking_record.customer_email
        AND organization_id = booking_record.organization_id
      LIMIT 1;
    ELSE
      SELECT id INTO customer_id
      FROM public.customer_profiles
      WHERE email = booking_record.customer_email
      LIMIT 1;
    END IF;
  ELSE
    customer_id := NULL;
  END IF;

  -- Get organization tax rate (if organization_settings table exists)
  tax_rate := 0.24; -- Default 24% for Greece
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_settings') THEN
    SELECT tax_rate INTO tax_rate
    FROM public.organization_settings
    WHERE organization_id = booking_record.organization_id;
    tax_rate := COALESCE(tax_rate, 0.24);
  END IF;

  -- Only create invoice if invoices table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    DECLARE
      subtotal DECIMAL := booking_record.base_price + booking_record.extras_price + booking_record.insurance_price + booking_record.location_fees;
      vat_amount DECIMAL := subtotal * tax_rate;
      total_amount DECIMAL := subtotal + vat_amount;
      invoice_has_org_id BOOLEAN := FALSE;
      invoice_count INTEGER := 1;
    BEGIN
      -- Check if invoices table has organization_id column
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'invoices' 
          AND column_name = 'organization_id'
      ) INTO invoice_has_org_id;
      
      -- Get invoice count
      IF invoice_has_org_id THEN
        SELECT COUNT(*) + 1 INTO invoice_count
        FROM public.invoices
        WHERE organization_id = booking_record.organization_id;
      ELSE
        SELECT COUNT(*) + 1 INTO invoice_count
        FROM public.invoices;
      END IF;
      
      -- Create invoice
      IF invoice_has_org_id THEN
        INSERT INTO public.invoices (
          organization_id,
          customer_id,
          invoice_number,
          invoice_date,
          due_date,
          amount,
          tax_amount,
          total_amount,
          status,
          reference_type,
          reference_id
        ) VALUES (
          booking_record.organization_id,
          customer_id,
          'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(invoice_count::TEXT, 4, '0'),
          CURRENT_DATE,
          booking_record.pickup_date,
          subtotal,
          vat_amount,
          total_amount,
          CASE WHEN booking_record.payment_status = 'fully_paid' THEN 'paid' ELSE 'sent' END,
          'online_booking',
          p_booking_id
        ) RETURNING id INTO invoice_id;
      ELSE
        INSERT INTO public.invoices (
          customer_id,
          invoice_number,
          invoice_date,
          due_date,
          amount,
          tax_amount,
          total_amount,
          status,
          reference_type,
          reference_id
        ) VALUES (
          customer_id,
          'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(invoice_count::TEXT, 4, '0'),
          CURRENT_DATE,
          booking_record.pickup_date,
          subtotal,
          vat_amount,
          total_amount,
          CASE WHEN booking_record.payment_status = 'fully_paid' THEN 'paid' ELSE 'sent' END,
          'online_booking',
          p_booking_id
        ) RETURNING id INTO invoice_id;
      END IF;

      -- Update booking with invoice_id
      UPDATE public.online_bookings
      SET invoice_id = invoice_id
      WHERE id = p_booking_id;
    END;

    RETURN invoice_id;
  ELSE
    -- Invoices table doesn't exist, return NULL
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================
DO $$
BEGIN
  RAISE NOTICE '✅ WordPress Integration Database Enhancements Applied Successfully!';
  RAISE NOTICE '📊 New Functions: is_car_available, generate_contract_number, expire_unpaid_bookings, check_duplicate_booking, auto_create_contract_from_booking, check_contract_limit, validate_organization_access, create_invoice_from_booking';
  RAISE NOTICE '🔧 New Triggers: on_booking_created_block_dates, on_integration_health_log';
  RAISE NOTICE '📈 New Indexes: Multiple performance indexes added';
  RAISE NOTICE '📋 New Tables: booking_audit_log, integration_health_logs';
END $$;

