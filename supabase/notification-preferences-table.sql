-- Notification Preferences Table
-- Stores user notification preferences and settings

-- Drop existing table if exists
DROP TABLE IF EXISTS notification_preferences CASCADE;

-- Create notification_preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Enabled notification types (array of notification type strings)
  enabled_types TEXT[] DEFAULT ARRAY[
    'pickup_24h', 'pickup_3h', 'pickup_30min',
    'return_7d', 'return_3d', 'return_1d', 'return_3h', 'return_overdue',
    'kteo_60d', 'kteo_30d', 'kteo_14d', 'kteo_7d', 'kteo_3d', 'kteo_1d', 'kteo_expired', 'kteo_overdue',
    'insurance_60d', 'insurance_30d', 'insurance_14d', 'insurance_7d', 'insurance_3d', 'insurance_1d', 'insurance_expired',
    'road_tax_30d', 'road_tax_14d', 'road_tax_7d', 'road_tax_expired',
    'tires_30d', 'tires_14d', 'tires_7d',
    'service_due', 'service_overdue',
    'payment_due_tomorrow', 'payment_overdue', 'deposit_not_received',
    'damage_reported', 'damage_repair_completed',
    'morning_briefing', 'end_of_day_summary', 'weekend_planning',
    'double_booking', 'maintenance_during_rental', 'gap_opportunity',
    'all_vehicles_booked', 'low_availability', 'vehicle_available',
    'daily_revenue_summary', 'weekly_revenue_summary', 'monthly_milestone',
    'milestone_achieved', 'perfect_week',
    'general'
  ],
  
  -- Quiet hours (no notifications during this time, except critical)
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  
  -- Critical only mode (only show critical priority notifications)
  critical_only_mode BOOLEAN DEFAULT false,
  
  -- Maximum daily notifications (0 = unlimited)
  max_daily_notifications INTEGER DEFAULT 10,
  
  -- Timezone
  timezone TEXT DEFAULT 'Europe/Athens',
  
  -- Category preferences
  enable_contract_notifications BOOLEAN DEFAULT true,
  enable_maintenance_notifications BOOLEAN DEFAULT true,
  enable_financial_notifications BOOLEAN DEFAULT true,
  enable_operational_notifications BOOLEAN DEFAULT true,
  enable_milestone_notifications BOOLEAN DEFAULT true,
  
  -- Sound and vibration preferences
  enable_sound BOOLEAN DEFAULT true,
  enable_vibration BOOLEAN DEFAULT true,
  
  -- Email notifications
  enable_email_notifications BOOLEAN DEFAULT false,
  email_daily_summary BOOLEAN DEFAULT false,
  email_weekly_summary BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint on user_id (one preference per user)
ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Add notification count tracking table
CREATE TABLE IF NOT EXISTS notification_daily_count (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_date)
);

-- Enable RLS on daily count table
ALTER TABLE notification_daily_count ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily count
CREATE POLICY "Users can view own notification count"
  ON notification_daily_count
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification count"
  ON notification_daily_count
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update notification count"
  ON notification_daily_count
  FOR UPDATE
  USING (true);

-- Create index
CREATE INDEX idx_notification_daily_count_user_date ON notification_daily_count(user_id, notification_date);

-- Grant necessary permissions
GRANT ALL ON notification_preferences TO authenticated;
GRANT ALL ON notification_daily_count TO authenticated;

-- Insert default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE notification_preferences IS 'Stores user notification preferences and settings for the fleet management app';
COMMENT ON COLUMN notification_preferences.enabled_types IS 'Array of enabled notification type strings';
COMMENT ON COLUMN notification_preferences.quiet_hours_enabled IS 'Enable quiet hours (no non-critical notifications during this time)';
COMMENT ON COLUMN notification_preferences.critical_only_mode IS 'Only show critical priority notifications';
COMMENT ON COLUMN notification_preferences.max_daily_notifications IS 'Maximum number of non-critical notifications per day (0 = unlimited)';

