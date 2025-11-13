-- ============================================
-- Create Notification History Table
-- Run this in your Supabase SQL Editor
-- ============================================

-- Drop existing table if you want to start fresh (optional)
-- DROP TABLE IF EXISTS public.notification_history CASCADE;

-- Create notification_history table
CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT FALSE,
  
  -- For tracking related entities
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES cars(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS notification_history_user_id_idx 
  ON public.notification_history(user_id);

CREATE INDEX IF NOT EXISTS notification_history_is_read_idx 
  ON public.notification_history(is_read);

CREATE INDEX IF NOT EXISTS notification_history_sent_at_idx 
  ON public.notification_history(sent_at DESC);

CREATE INDEX IF NOT EXISTS notification_history_contract_id_idx 
  ON public.notification_history(contract_id) WHERE contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notification_history_vehicle_id_idx 
  ON public.notification_history(vehicle_id) WHERE vehicle_id IS NOT NULL;

-- Note: vehicle_id references the 'cars' table (your vehicles table is named 'cars')

-- Enable Row Level Security
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notification_history;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notification_history;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notification_history;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notification_history;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notification_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
  ON public.notification_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notification_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notification_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE public.notification_history IS 'Stores notification history for all users';
COMMENT ON COLUMN public.notification_history.notification_type IS 'Type of notification (e.g., contract_pickup_reminder, maintenance_due, etc.)';
COMMENT ON COLUMN public.notification_history.data IS 'Additional JSON data for the notification';
COMMENT ON COLUMN public.notification_history.is_read IS 'Whether the user has read the notification';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'notification_history table created successfully!';
END $$;


