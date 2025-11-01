-- ==============================================
-- Fix Cars Table Schema Cache Issues
-- ==============================================
-- This script ensures the cars table has only the base columns
-- and helps resolve schema cache issues

-- First, check what columns exist
DO $$
DECLARE
    column_list TEXT;
BEGIN
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO column_list
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'cars';
    
    RAISE NOTICE 'Current cars table columns: %', column_list;
END $$;

-- Ensure base columns exist (these should ALWAYS exist)
-- These match the original SAFE_SETUP.sql schema
DO $$
BEGIN
    -- Create table if it doesn't exist with base columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cars' AND table_schema = 'public') THEN
        CREATE TABLE public.cars (
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
        RAISE NOTICE 'Created cars table with base schema';
    ELSE
        RAISE NOTICE 'Cars table already exists';
    END IF;
END $$;

-- Verify required columns exist
DO $$
DECLARE
    missing_columns TEXT[];
    required_cols TEXT[] := ARRAY['license_plate', 'make', 'model'];
    col TEXT;
BEGIN
    FOREACH col IN ARRAY required_cols
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'cars' 
            AND column_name = col
            AND table_schema = 'public'
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Missing required columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All required columns (license_plate, make, model) exist';
    END IF;
END $$;

-- Note: After running this, you may need to refresh Supabase's schema cache
-- This can be done by restarting your Supabase project or waiting a few minutes

