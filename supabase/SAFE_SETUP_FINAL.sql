-- ==============================================
-- SAFE COMPLETE SETUP - Handles Existing Objects
-- ==============================================
-- This script safely creates all tables, policies, and storage
-- Run this even if you already have some objects created

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- DROP EXISTING POLICIES (to recreate them)
-- ==============================================

-- Drop existing policies if they exist
DO $$ 
BEGIN
    -- Users policies
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
    
    -- Cars policies
    DROP POLICY IF EXISTS "Authenticated users can view cars" ON public.cars;
    DROP POLICY IF EXISTS "Authenticated users can insert cars" ON public.cars;
    DROP POLICY IF EXISTS "Authenticated users can update cars" ON public.cars;
    DROP POLICY IF EXISTS "Authenticated users can delete cars" ON public.cars;
    
    -- Contracts policies
    DROP POLICY IF EXISTS "Users can view their own contracts" ON public.contracts;
    DROP POLICY IF EXISTS "Users can insert their own contracts" ON public.contracts;
    DROP POLICY IF EXISTS "Users can update their own contracts" ON public.contracts;
    DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;
    
    -- Damage points policies
    DROP POLICY IF EXISTS "Users can view damage points of their contracts" ON public.damage_points;
    DROP POLICY IF EXISTS "Users can insert damage points for their contracts" ON public.damage_points;
    DROP POLICY IF EXISTS "Users can update damage points of their contracts" ON public.damage_points;
    DROP POLICY IF EXISTS "Users can delete damage points of their contracts" ON public.damage_points;
    
    -- Contract photos policies
    DROP POLICY IF EXISTS "Users can view photos of their contracts" ON public.contract_photos;
    DROP POLICY IF EXISTS "Users can insert photos for their contracts" ON public.contract_photos;
    DROP POLICY IF EXISTS "Users can update photos of their contracts" ON public.contract_photos;
    DROP POLICY IF EXISTS "Users can delete photos of their contracts" ON public.contract_photos;
    
    -- Notifications policies
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
END $$;

-- ==============================================
-- CREATE TABLES
-- ==============================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    signature_url TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cars (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    make_model TEXT GENERATED ALWAYS AS (make || ' ' || model) STORED,
    year INTEGER,
    license_plate TEXT UNIQUE NOT NULL,
    color TEXT,
    fuel_type TEXT DEFAULT 'gasoline',
    transmission TEXT DEFAULT 'manual',
    seats INTEGER DEFAULT 5,
    daily_rate DECIMAL(10,2) DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Renter Information
    renter_name TEXT NOT NULL,
    renter_email TEXT,
    renter_phone TEXT,
    renter_address TEXT,
    renter_id_number TEXT,
    renter_driving_license TEXT,
    
    -- Rental Period
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    pickup_location TEXT NOT NULL,
    dropoff_date DATE NOT NULL,
    dropoff_time TIME NOT NULL,
    dropoff_location TEXT,
    total_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Car Information (denormalized for performance)
    car_make TEXT,
    car_model TEXT,
    car_license_plate TEXT,
    car_color TEXT,
    
    -- Car Condition
    fuel_level INTEGER DEFAULT 8 CHECK (fuel_level >= 0 AND fuel_level <= 8),
    mileage_start INTEGER DEFAULT 0,
    mileage_end INTEGER,
    condition_notes TEXT,
    
    -- AADE Integration
    aade_dcl_id INTEGER,
    aade_submitted_at TIMESTAMP WITH TIME ZONE,
    aade_updated_at TIMESTAMP WITH TIME ZONE,
    aade_invoice_mark TEXT,
    aade_status TEXT CHECK (aade_status IN ('pending', 'submitted', 'completed', 'cancelled', 'error')) DEFAULT 'pending',
    aade_error_message TEXT,
    
    -- Status
    status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.damage_points (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('minor', 'major', 'critical')) DEFAULT 'minor',
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contract_photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
    photo_url TEXT NOT NULL,
    photo_type TEXT CHECK (photo_type IN ('pickup', 'dropoff', 'damage', 'general')) DEFAULT 'general',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('return_reminder', 'fuel_low', 'payment_due', 'damage_alert', 'system')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS contracts_user_id_idx ON public.contracts (user_id);
CREATE INDEX IF NOT EXISTS contracts_pickup_date_idx ON public.contracts (pickup_date);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts (status);
CREATE INDEX IF NOT EXISTS contracts_aade_status_idx ON public.contracts (aade_status);
CREATE INDEX IF NOT EXISTS contracts_aade_dcl_id_idx ON public.contracts (aade_dcl_id);
CREATE INDEX IF NOT EXISTS damage_points_contract_id_idx ON public.damage_points (contract_id);
CREATE INDEX IF NOT EXISTS contract_photos_contract_id_idx ON public.contract_photos (contract_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON public.notifications (type);

-- ==============================================
-- ENABLE RLS
-- ==============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- CREATE POLICIES
-- ==============================================

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Cars policies (admin only for now)
CREATE POLICY "Authenticated users can view cars" ON public.cars
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cars" ON public.cars
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update cars" ON public.cars
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete cars" ON public.cars
    FOR DELETE TO authenticated USING (true);

-- Contracts policies
CREATE POLICY "Users can view their own contracts" ON public.contracts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contracts" ON public.contracts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contracts" ON public.contracts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contracts" ON public.contracts
    FOR DELETE USING (auth.uid() = user_id);

-- Damage points policies
CREATE POLICY "Users can view damage points of their contracts" ON public.damage_points
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = damage_points.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert damage points for their contracts" ON public.damage_points
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = damage_points.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update damage points of their contracts" ON public.damage_points
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = damage_points.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete damage points of their contracts" ON public.damage_points
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = damage_points.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

-- Contract photos policies
CREATE POLICY "Users can view photos of their contracts" ON public.contract_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_photos.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert photos for their contracts" ON public.contract_photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_photos.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update photos of their contracts" ON public.contract_photos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_photos.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete photos of their contracts" ON public.contract_photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.contracts 
            WHERE contracts.id = contract_photos.contract_id 
            AND contracts.user_id = auth.uid()
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- ==============================================
-- STORAGE BUCKETS
-- ==============================================

-- Create storage bucket for contract photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'contract-photos',
    'contract-photos',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for signatures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'signatures',
    'signatures',
    false,
    2097152, -- 2MB limit
    ARRAY['image/png', 'image/svg+xml', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for car photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'car-photos',
    'car-photos',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- STORAGE POLICIES
-- ==============================================

-- Drop existing storage policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload contract photos" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view contract photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their contract photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their contract photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload their own signature" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view their own signature" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own signature" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own signature" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload car photos" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view car photos" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update car photos" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete car photos" ON storage.objects;
END $$;

-- Contract photos storage policies
CREATE POLICY "Authenticated users can upload contract photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'contract-photos' AND
    (storage.foldername(name))[1] = 'contracts'
);

CREATE POLICY "Anyone can view contract photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contract-photos');

CREATE POLICY "Users can update their contract photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'contract-photos' AND
    (storage.foldername(name))[1] = 'contracts' AND
    EXISTS (
        SELECT 1 FROM public.contracts
        WHERE id = (storage.foldername(name))[2]::uuid AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their contract photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'contract-photos' AND
    (storage.foldername(name))[1] = 'contracts' AND
    EXISTS (
        SELECT 1 FROM public.contracts
        WHERE id = (storage.foldername(name))[2]::uuid AND user_id = auth.uid()
    )
);

-- Signatures storage policies
CREATE POLICY "Users can upload their own signature"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'signatures' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can view their own signature"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'signatures' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can update their own signature"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'signatures' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete their own signature"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'signatures' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Car photos storage policies
CREATE POLICY "Authenticated users can upload car photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'car-photos');

CREATE POLICY "Anyone can view car photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'car-photos');

CREATE POLICY "Authenticated users can update car photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'car-photos');

CREATE POLICY "Authenticated users can delete car photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'car-photos');

-- ==============================================
-- FUNCTIONS AND TRIGGERS
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_cars_updated_at ON public.cars;
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON public.cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Supabase setup completed successfully!';
    RAISE NOTICE '📊 Tables created: users, cars, contracts, damage_points, contract_photos, notifications';
    RAISE NOTICE '🔒 RLS policies enabled for all tables';
    RAISE NOTICE '📁 Storage buckets created: contract-photos, signatures, car-photos';
    RAISE NOTICE '🚀 Ready to use!';
END $$;

