-- ==============================================
-- ONLINE BOOKING SYSTEM - COMPLETE DATABASE SCHEMA
-- ==============================================
-- Version: 1.0
-- Date: 2025-11-16
-- Description: Complete schema for car rental online booking system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- LOCATIONS (Τοποθεσίες Παραλαβής/Παράδοσης)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID, -- For multi-tenant support
  
  name TEXT NOT NULL,
  name_el TEXT NOT NULL,
  address TEXT NOT NULL,
  address_el TEXT,
  google_maps_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Display settings
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Extra fees
  extra_delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
  extra_pickup_fee DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Working hours
  opening_time TIME DEFAULT '08:00:00',
  closing_time TIME DEFAULT '20:00:00',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- CAR CATEGORIES (Κατηγορίες Οχημάτων)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.car_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID,
  
  name TEXT NOT NULL,
  name_el TEXT NOT NULL,
  description TEXT,
  description_el TEXT,
  
  -- Features
  seats INTEGER NOT NULL CHECK (seats > 0),
  doors INTEGER NOT NULL CHECK (doors > 0),
  transmission TEXT CHECK (transmission IN ('manual', 'automatic', 'both')),
  luggage_capacity INTEGER DEFAULT 1,
  
  -- Additional features (stored as JSONB for flexibility)
  features JSONB DEFAULT '[]'::jsonb, -- ["air_conditioning", "bluetooth", "gps"]
  
  -- Display
  icon_url TEXT,
  icon_name TEXT, -- Icon identifier for consistent display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- BOOKING CARS (Μεμονωμένα Αυτοκίνητα)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.booking_cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID,
  category_id UUID NOT NULL REFERENCES public.car_categories(id) ON DELETE RESTRICT,
  
  -- Car details
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
  license_plate TEXT NOT NULL,
  color TEXT,
  vin TEXT, -- Vehicle Identification Number
  
  -- Display info
  main_photo_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  featured_order INTEGER DEFAULT 0,
  
  -- Availability
  is_available_for_booking BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- Minimum rental requirements
  min_age_requirement INTEGER DEFAULT 21 CHECK (min_age_requirement >= 18),
  min_license_years INTEGER DEFAULT 1 CHECK (min_license_years >= 0),
  
  -- Link to existing cars table (optional)
  car_id UUID, -- References existing cars table if needed
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(license_plate)
);

-- ==============================================
-- CAR PHOTOS (Φωτογραφίες Αυτοκινήτων)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.car_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES public.booking_cars(id) ON DELETE CASCADE,
  
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_main_photo BOOLEAN DEFAULT false,
  
  -- Photo metadata
  file_size INTEGER, -- bytes
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast retrieval
CREATE INDEX IF NOT EXISTS car_photos_car_id_idx ON public.car_photos (car_id);
CREATE INDEX IF NOT EXISTS car_photos_display_order_idx ON public.car_photos (car_id, display_order);

-- ==============================================
-- PRICING (Τιμολόγηση - Ημερήσια)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.car_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Can be per category OR per individual car
  category_id UUID REFERENCES public.car_categories(id) ON DELETE CASCADE,
  car_id UUID REFERENCES public.booking_cars(id) ON DELETE CASCADE,
  
  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Price per day
  price_per_day DECIMAL(10, 2) NOT NULL CHECK (price_per_day >= 0),
  
  -- Minimum rental days
  min_rental_days INTEGER DEFAULT 1 CHECK (min_rental_days > 0),
  
  -- Discount for longer rentals (optional)
  weekly_discount_percent DECIMAL(5, 2) DEFAULT 0.00,
  monthly_discount_percent DECIMAL(5, 2) DEFAULT 0.00,
  
  -- Priority (higher number = higher priority)
  -- Useful for overriding category pricing with specific car pricing
  priority INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (
    (category_id IS NOT NULL AND car_id IS NULL) OR
    (category_id IS NULL AND car_id IS NOT NULL)
  ),
  CHECK (end_date >= start_date)
);

-- Indexes for fast date range queries
CREATE INDEX IF NOT EXISTS car_pricing_dates_idx ON public.car_pricing (start_date, end_date);
CREATE INDEX IF NOT EXISTS car_pricing_category_idx ON public.car_pricing (category_id);
CREATE INDEX IF NOT EXISTS car_pricing_car_idx ON public.car_pricing (car_id);
CREATE INDEX IF NOT EXISTS car_pricing_priority_idx ON public.car_pricing (priority DESC);

-- ==============================================
-- EXTRA OPTIONS (Πρόσθετες Επιλογές)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.extra_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID,
  
  name TEXT NOT NULL,
  name_el TEXT NOT NULL,
  description TEXT,
  description_el TEXT,
  
  -- Pricing
  price_per_day DECIMAL(10, 2) NOT NULL CHECK (price_per_day >= 0),
  is_one_time_fee BOOLEAN DEFAULT false, -- true = charge once, false = per day
  
  -- Display
  icon_name TEXT, -- Icon identifier (e.g., "gps", "child-seat", "additional-driver")
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT false,
  
  -- Inventory tracking (optional)
  has_limited_quantity BOOLEAN DEFAULT false,
  available_quantity INTEGER,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- INSURANCE TYPES (Τύποι Ασφάλειας)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.insurance_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID,
  
  name TEXT NOT NULL,
  name_el TEXT NOT NULL,
  description TEXT,
  description_el TEXT,
  
  -- Coverage details
  deductible DECIMAL(10, 2) DEFAULT 0.00, -- Απαλλαγή
  coverage_amount DECIMAL(10, 2),
  covers_theft BOOLEAN DEFAULT false,
  covers_glass BOOLEAN DEFAULT false,
  covers_tires BOOLEAN DEFAULT false,
  covers_undercarriage BOOLEAN DEFAULT false,
  
  -- Pricing
  price_per_day DECIMAL(10, 2) NOT NULL CHECK (price_per_day >= 0),
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  badge_text TEXT, -- e.g., "RECOMMENDED", "BEST VALUE"
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- PAYMENT METHODS (Μέθοδοι Πληρωμής)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID,
  
  name TEXT NOT NULL,
  name_el TEXT NOT NULL,
  description TEXT,
  description_el TEXT,
  
  -- Payment provider
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'bank_transfer', 'cash', 'viva_wallet', 'revolut')),
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  requires_full_payment BOOLEAN DEFAULT false,
  deposit_percentage DECIMAL(5, 2) DEFAULT 30.00 CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100),
  min_deposit_amount DECIMAL(10, 2) DEFAULT 50.00,
  
  -- Provider credentials (should be encrypted at application level)
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  webhook_secret TEXT,
  merchant_id TEXT,
  
  -- Display
  logo_url TEXT,
  display_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- ONLINE BOOKINGS (Κρατήσεις Πελατών)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.online_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_number TEXT UNIQUE NOT NULL,
  
  -- Customer information
  customer_email TEXT NOT NULL,
  customer_full_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_id_number TEXT,
  customer_driver_license TEXT,
  customer_age INTEGER CHECK (customer_age >= 18 OR customer_age IS NULL),
  customer_address TEXT,
  customer_city TEXT,
  customer_country TEXT DEFAULT 'Greece',
  
  -- Rental details
  car_id UUID NOT NULL REFERENCES public.booking_cars(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.car_categories(id) ON DELETE RESTRICT,
  
  -- Dates & locations
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  pickup_location_id UUID NOT NULL REFERENCES public.locations(id),
  
  dropoff_date DATE NOT NULL,
  dropoff_time TIME NOT NULL,
  dropoff_location_id UUID NOT NULL REFERENCES public.locations(id),
  
  -- Calculated rental days
  rental_days INTEGER GENERATED ALWAYS AS (dropoff_date - pickup_date) STORED,
  
  -- Pricing breakdown
  base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
  extras_price DECIMAL(10, 2) DEFAULT 0.00 CHECK (extras_price >= 0),
  insurance_price DECIMAL(10, 2) DEFAULT 0.00 CHECK (insurance_price >= 0),
  location_fees DECIMAL(10, 2) DEFAULT 0.00 CHECK (location_fees >= 0),
  discount_amount DECIMAL(10, 2) DEFAULT 0.00 CHECK (discount_amount >= 0),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  
  -- Payment
  payment_method_id UUID REFERENCES public.payment_methods(id),
  payment_status TEXT CHECK (payment_status IN ('pending', 'deposit_paid', 'fully_paid', 'refunded', 'cancelled')) DEFAULT 'pending',
  amount_paid DECIMAL(10, 2) DEFAULT 0.00 CHECK (amount_paid >= 0),
  amount_remaining DECIMAL(10, 2) CHECK (amount_remaining >= 0),
  
  -- Status
  booking_status TEXT CHECK (booking_status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
  
  -- Insurance selection
  selected_insurance_id UUID REFERENCES public.insurance_types(id),
  
  -- Notes
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Special requirements
  flight_number TEXT,
  special_requests TEXT,
  
  -- Conversion to contract
  contract_id UUID REFERENCES public.contracts(id),
  converted_to_contract_at TIMESTAMP WITH TIME ZONE,
  converted_by UUID REFERENCES public.users(id),
  
  -- Confirmation
  confirmation_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  -- IP and user agent for fraud detection
  ip_address INET,
  user_agent TEXT,
  
  -- Check that dates make sense
  CHECK (dropoff_date > pickup_date)
);

-- Generate booking number function
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  year_part TEXT;
  counter INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Get the count of bookings this year + 1
  SELECT COALESCE(COUNT(*), 0) + 1 INTO counter
  FROM public.online_bookings
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  new_number := 'BK-' || year_part || '-' || LPAD(counter::TEXT, 6, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate booking number
CREATE OR REPLACE FUNCTION set_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
    NEW.booking_number := generate_booking_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_booking_number
  BEFORE INSERT ON public.online_bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_number();

-- Indexes for online_bookings
CREATE INDEX IF NOT EXISTS online_bookings_dates_idx ON public.online_bookings (pickup_date, dropoff_date);
CREATE INDEX IF NOT EXISTS online_bookings_status_idx ON public.online_bookings (booking_status);
CREATE INDEX IF NOT EXISTS online_bookings_payment_status_idx ON public.online_bookings (payment_status);
CREATE INDEX IF NOT EXISTS online_bookings_email_idx ON public.online_bookings (customer_email);
CREATE INDEX IF NOT EXISTS online_bookings_car_idx ON public.online_bookings (car_id);
CREATE INDEX IF NOT EXISTS online_bookings_created_at_idx ON public.online_bookings (created_at DESC);

-- ==============================================
-- BOOKING EXTRAS (Πρόσθετα Κράτησης)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.booking_extras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.online_bookings(id) ON DELETE CASCADE,
  extra_option_id UUID NOT NULL REFERENCES public.extra_options(id) ON DELETE RESTRICT,
  
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  price_per_unit DECIMAL(10, 2) NOT NULL CHECK (price_per_unit >= 0),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  is_per_day BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_extras_booking_id_idx ON public.booking_extras (booking_id);

-- ==============================================
-- PAYMENT TRANSACTIONS (Συναλλαγές Πληρωμών)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.online_bookings(id) ON DELETE RESTRICT,
  
  -- Transaction details
  transaction_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'EUR',
  
  -- Transaction type
  transaction_type TEXT CHECK (transaction_type IN ('deposit', 'full_payment', 'remaining_payment', 'refund')) DEFAULT 'full_payment',
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')) DEFAULT 'pending',
  
  -- Provider info
  payment_provider TEXT NOT NULL,
  provider_response JSONB,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS payment_transactions_booking_id_idx ON public.payment_transactions (booking_id);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON public.payment_transactions (status);

-- ==============================================
-- BOOKING DESIGN SETTINGS (Ρυθμίσεις Εμφάνισης)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.booking_design_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE,
  
  -- Colors
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#10b981',
  accent_color TEXT DEFAULT '#f59e0b',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1f2937',
  
  -- Logo & Branding
  logo_url TEXT,
  logo_dark_url TEXT, -- For dark backgrounds
  favicon_url TEXT,
  background_image_url TEXT,
  
  -- Company info
  company_name TEXT NOT NULL,
  company_name_el TEXT NOT NULL,
  tagline TEXT,
  tagline_el TEXT,
  description TEXT,
  description_el TEXT,
  
  -- Contact
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp_number TEXT,
  address TEXT,
  
  -- Social media
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  
  -- Terms & Policies
  terms_and_conditions TEXT,
  terms_and_conditions_el TEXT,
  privacy_policy TEXT,
  privacy_policy_el TEXT,
  cancellation_policy TEXT,
  cancellation_policy_el TEXT,
  
  -- Features
  allow_instant_booking BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT false,
  show_prices_without_vat BOOLEAN DEFAULT false,
  enable_reviews BOOLEAN DEFAULT true,
  enable_loyalty_program BOOLEAN DEFAULT false,
  min_booking_hours INTEGER DEFAULT 24, -- Minimum hours before pickup
  max_booking_days INTEGER DEFAULT 365, -- Maximum days in advance
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- CAR AVAILABILITY CALENDAR (Διαθεσιμότητα)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.car_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES public.booking_cars(id) ON DELETE CASCADE,
  
  blocked_from DATE NOT NULL,
  blocked_until DATE NOT NULL,
  
  reason TEXT CHECK (reason IN ('booked', 'maintenance', 'unavailable', 'manual_block')) NOT NULL,
  booking_id UUID REFERENCES public.online_bookings(id) ON DELETE CASCADE,
  
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  
  CHECK (blocked_until >= blocked_from)
);

CREATE INDEX IF NOT EXISTS car_availability_dates_idx ON public.car_availability (blocked_from, blocked_until);
CREATE INDEX IF NOT EXISTS car_availability_car_idx ON public.car_availability (car_id);
CREATE INDEX IF NOT EXISTS car_availability_reason_idx ON public.car_availability (reason);

-- Function to check car availability
CREATE OR REPLACE FUNCTION is_car_available(
  p_car_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM public.car_availability
  WHERE car_id = p_car_id
    AND blocked_from <= p_end_date
    AND blocked_until >= p_start_date;
    
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- DISCOUNT CODES (Κωδικοί Έκπτωσης)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID,
  
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  
  -- Discount type
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
  
  -- Validity
  valid_from DATE,
  valid_until DATE,
  max_uses INTEGER,
  times_used INTEGER DEFAULT 0,
  
  -- Constraints
  min_rental_days INTEGER,
  min_order_amount DECIMAL(10, 2),
  
  -- Applicability
  applies_to_categories UUID[], -- Array of category IDs
  applies_to_cars UUID[], -- Array of car IDs
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  
  CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

-- ==============================================
-- BOOKING REVIEWS (Αξιολογήσεις)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.booking_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.online_bookings(id) ON DELETE CASCADE,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  
  -- Detailed ratings
  car_condition_rating INTEGER CHECK (car_condition_rating >= 1 AND car_condition_rating <= 5),
  service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- Status
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  
  -- Response from company
  company_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS booking_reviews_booking_id_idx ON public.booking_reviews (booking_id);
CREATE INDEX IF NOT EXISTS booking_reviews_approved_idx ON public.booking_reviews (is_approved, created_at DESC);

-- ==============================================
-- UPDATE TRIGGERS
-- ==============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_car_categories_updated_at BEFORE UPDATE ON public.car_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_cars_updated_at BEFORE UPDATE ON public.booking_cars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_car_pricing_updated_at BEFORE UPDATE ON public.car_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extra_options_updated_at BEFORE UPDATE ON public.extra_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_types_updated_at BEFORE UPDATE ON public.insurance_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_online_bookings_updated_at BEFORE UPDATE ON public.online_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_design_settings_updated_at BEFORE UPDATE ON public.booking_design_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_design_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_reviews ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- PUBLIC ACCESS POLICIES (For booking website)
-- ==============================================

-- Locations - Public can view active locations
CREATE POLICY "Public can view active locations"
  ON public.locations FOR SELECT
  USING (is_active = true);

-- Car Categories - Public can view active categories
CREATE POLICY "Public can view active categories"
  ON public.car_categories FOR SELECT
  USING (is_active = true);

-- Booking Cars - Public can view available cars
CREATE POLICY "Public can view available cars"
  ON public.booking_cars FOR SELECT
  USING (is_available_for_booking = true AND is_active = true);

-- Car Photos - Public can view all photos
CREATE POLICY "Public can view car photos"
  ON public.car_photos FOR SELECT
  USING (true);

-- Car Pricing - Public can view pricing
CREATE POLICY "Public can view pricing"
  ON public.car_pricing FOR SELECT
  USING (true);

-- Extra Options - Public can view active extras
CREATE POLICY "Public can view active extras"
  ON public.extra_options FOR SELECT
  USING (is_active = true);

-- Insurance Types - Public can view active insurance
CREATE POLICY "Public can view active insurance types"
  ON public.insurance_types FOR SELECT
  USING (is_active = true);

-- Payment Methods - Public can view active methods
CREATE POLICY "Public can view active payment methods"
  ON public.payment_methods FOR SELECT
  USING (is_active = true);

-- Design Settings - Public can view
CREATE POLICY "Public can view design settings"
  ON public.booking_design_settings FOR SELECT
  USING (true);

-- Discount Codes - Public can view active codes (read-only)
CREATE POLICY "Public can view active discount codes"
  ON public.discount_codes FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until >= CURRENT_DATE));

-- Reviews - Public can view approved reviews
CREATE POLICY "Public can view approved reviews"
  ON public.booking_reviews FOR SELECT
  USING (is_approved = true);

-- ==============================================
-- BOOKING CREATION POLICIES
-- ==============================================

-- Anyone can create bookings (anonymous customers)
CREATE POLICY "Anyone can create bookings"
  ON public.online_bookings FOR INSERT
  WITH CHECK (true);

-- Anyone can add booking extras
CREATE POLICY "Anyone can add booking extras"
  ON public.booking_extras FOR INSERT
  WITH CHECK (true);

-- Anyone can create payment transactions
CREATE POLICY "Anyone can create payment transactions"
  ON public.payment_transactions FOR INSERT
  WITH CHECK (true);

-- ==============================================
-- ADMIN POLICIES (Authenticated users)
-- ==============================================

-- Authenticated users can view all data
CREATE POLICY "Authenticated users can view all locations"
  ON public.locations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage locations"
  ON public.locations FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all categories"
  ON public.car_categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage categories"
  ON public.car_categories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all cars"
  ON public.booking_cars FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage cars"
  ON public.booking_cars FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage car photos"
  ON public.car_photos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage pricing"
  ON public.car_pricing FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all extras"
  ON public.extra_options FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage extras"
  ON public.extra_options FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all insurance"
  ON public.insurance_types FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage insurance"
  ON public.insurance_types FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage payment methods"
  ON public.payment_methods FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all bookings"
  ON public.online_bookings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update bookings"
  ON public.online_bookings FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete bookings"
  ON public.online_bookings FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view booking extras"
  ON public.booking_extras FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update transactions"
  ON public.payment_transactions FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage design settings"
  ON public.booking_design_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage availability"
  ON public.car_availability FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage discount codes"
  ON public.discount_codes FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all reviews"
  ON public.booking_reviews FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage reviews"
  ON public.booking_reviews FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ==============================================
-- VIEWS FOR REPORTING
-- ==============================================

-- View for booking summary
CREATE OR REPLACE VIEW public.booking_summary AS
SELECT 
  b.id,
  b.booking_number,
  b.customer_full_name,
  b.customer_email,
  b.customer_phone,
  bc.make || ' ' || bc.model as car_name,
  bc.license_plate,
  cat.name_el as category_name,
  b.pickup_date,
  b.pickup_time,
  pl.name_el as pickup_location,
  b.dropoff_date,
  b.dropoff_time,
  dl.name_el as dropoff_location,
  b.rental_days,
  b.total_price,
  b.amount_paid,
  b.amount_remaining,
  b.booking_status,
  b.payment_status,
  b.created_at
FROM public.online_bookings b
JOIN public.booking_cars bc ON b.car_id = bc.id
JOIN public.car_categories cat ON b.category_id = cat.id
JOIN public.locations pl ON b.pickup_location_id = pl.id
JOIN public.locations dl ON b.dropoff_location_id = dl.id
ORDER BY b.created_at DESC;

-- View for car availability summary
CREATE OR REPLACE VIEW public.car_availability_summary AS
SELECT 
  bc.id as car_id,
  bc.make || ' ' || bc.model as car_name,
  bc.license_plate,
  cat.name_el as category,
  bc.is_available_for_booking,
  bc.is_active,
  COUNT(ca.id) as blocked_periods,
  ARRAY_AGG(
    JSON_BUILD_OBJECT(
      'from', ca.blocked_from,
      'until', ca.blocked_until,
      'reason', ca.reason
    ) ORDER BY ca.blocked_from
  ) FILTER (WHERE ca.id IS NOT NULL) as blocked_dates
FROM public.booking_cars bc
JOIN public.car_categories cat ON bc.category_id = cat.id
LEFT JOIN public.car_availability ca ON bc.id = ca.car_id
  AND ca.blocked_until >= CURRENT_DATE
GROUP BY bc.id, bc.make, bc.model, bc.license_plate, cat.name_el, bc.is_available_for_booking, bc.is_active;

-- ==============================================
-- SAMPLE DATA (Optional - for testing)
-- ==============================================

-- Insert default design settings
INSERT INTO public.booking_design_settings (
  company_name,
  company_name_el,
  tagline,
  tagline_el,
  contact_email,
  contact_phone
) VALUES (
  'Piraeus Car Rentals',
  'Ενοικιάσεις Αυτοκινήτων Πειραιάς',
  'Book your perfect car in minutes',
  'Κλείστε το ιδανικό αυτοκίνητο σε λεπτά',
  'info@piraeus-rentals.gr',
  '+30 210 123 4567'
) ON CONFLICT DO NOTHING;

-- Insert default locations
INSERT INTO public.locations (name, name_el, address, address_el, is_active) VALUES
  ('Athens Airport', 'Αεροδρόμιο Αθηνών', 'Athens International Airport', 'Διεθνής Αερολιμένας Αθηνών', true),
  ('Piraeus Port', 'Λιμάνι Πειραιά', 'Piraeus Port, Gate E1', 'Λιμάνι Πειραιά, Πύλη Ε1', true),
  ('Syntagma Square', 'Πλατεία Συντάγματος', 'Syntagma Square, Athens', 'Πλατεία Συντάγματος, Αθήνα', true)
ON CONFLICT DO NOTHING;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Online Booking System Schema Created Successfully!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  ✓ locations';
  RAISE NOTICE '  ✓ car_categories';
  RAISE NOTICE '  ✓ booking_cars';
  RAISE NOTICE '  ✓ car_photos';
  RAISE NOTICE '  ✓ car_pricing';
  RAISE NOTICE '  ✓ extra_options';
  RAISE NOTICE '  ✓ insurance_types';
  RAISE NOTICE '  ✓ payment_methods';
  RAISE NOTICE '  ✓ online_bookings';
  RAISE NOTICE '  ✓ booking_extras';
  RAISE NOTICE '  ✓ payment_transactions';
  RAISE NOTICE '  ✓ booking_design_settings';
  RAISE NOTICE '  ✓ car_availability';
  RAISE NOTICE '  ✓ discount_codes';
  RAISE NOTICE '  ✓ booking_reviews';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run this schema in your Supabase SQL editor';
  RAISE NOTICE '  2. Create storage buckets for car photos';
  RAISE NOTICE '  3. Start building the admin interface';
  RAISE NOTICE '';
END $$;

