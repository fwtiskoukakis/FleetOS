/**
 * Notification Preferences Service
 * Manages user notification preferences and settings
 */

import { supabase } from '../utils/supabase';
import { NotificationType, NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from './notification-types';

export interface NotificationPreferencesDB {
  id: string;
  user_id: string;
  enabled_types: string[];
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  critical_only_mode: boolean;
  max_daily_notifications: number;
  timezone: string;
  enable_contract_notifications: boolean;
  enable_maintenance_notifications: boolean;
  enable_financial_notifications: boolean;
  enable_operational_notifications: boolean;
  enable_milestone_notifications: boolean;
  enable_sound: boolean;
  enable_vibration: boolean;
  enable_email_notifications: boolean;
  email_daily_summary: boolean;
  email_weekly_summary: boolean;
  created_at: string;
  updated_at: string;
}

export class NotificationPreferencesService {
  
  /**
   * Get user notification preferences
   */
  static async getPreferences(userId: string): Promise<NotificationPreferencesDB | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create default
          return await this.createDefaultPreferences(userId);
        }
        console.error('Error getting notification preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return null;
    }
  }

  /**
   * Create default preferences for a user
   */
  static async createDefaultPreferences(userId: string): Promise<NotificationPreferencesDB | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          ...DEFAULT_NOTIFICATION_PREFERENCES,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating default preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating default preferences:', error);
      return null;
    }
  }

  /**
   * Update user notification preferences
   */
  static async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferencesDB>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating notification preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  /**
   * Toggle a specific notification type
   */
  static async toggleNotificationType(
    userId: string,
    type: NotificationType,
    enabled: boolean
  ): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);
      if (!preferences) return false;

      let enabledTypes = [...(preferences.enabled_types || [])];
      
      if (enabled && !enabledTypes.includes(type)) {
        enabledTypes.push(type);
      } else if (!enabled) {
        enabledTypes = enabledTypes.filter(t => t !== type);
      }

      return await this.updatePreferences(userId, { enabled_types: enabledTypes });
    } catch (error) {
      console.error('Error toggling notification type:', error);
      return false;
    }
  }

  /**
   * Toggle entire category of notifications
   */
  static async toggleCategory(
    userId: string,
    category: 'contract' | 'maintenance' | 'financial' | 'operational' | 'milestone',
    enabled: boolean
  ): Promise<boolean> {
    const columnMap = {
      contract: 'enable_contract_notifications',
      maintenance: 'enable_maintenance_notifications',
      financial: 'enable_financial_notifications',
      operational: 'enable_operational_notifications',
      milestone: 'enable_milestone_notifications',
    };

    return await this.updatePreferences(userId, {
      [columnMap[category]]: enabled,
    } as any);
  }

  /**
   * Set quiet hours
   */
  static async setQuietHours(
    userId: string,
    enabled: boolean,
    start?: string,
    end?: string
  ): Promise<boolean> {
    const updates: Partial<NotificationPreferencesDB> = {
      quiet_hours_enabled: enabled,
    };

    if (start) updates.quiet_hours_start = start;
    if (end) updates.quiet_hours_end = end;

    return await this.updatePreferences(userId, updates);
  }

  /**
   * Check if notification should be sent based on preferences
   */
  static async shouldSendNotification(
    userId: string,
    type: NotificationType,
    priority: 'critical' | 'high' | 'medium' | 'low'
  ): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);
      if (!preferences) return true; // Default to sending if no preferences

      // Check if critical only mode
      if (preferences.critical_only_mode && priority !== 'critical') {
        return false;
      }

      // Check if notification type is enabled
      if (!preferences.enabled_types.includes(type)) {
        return false;
      }

      // Check quiet hours (except for critical)
      if (preferences.quiet_hours_enabled && priority !== 'critical') {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const start = preferences.quiet_hours_start;
        const end = preferences.quiet_hours_end;
        
        // Check if current time is within quiet hours
        if (start && end) {
          const isInQuietHours = start > end 
            ? (currentTime >= start || currentTime < end) // Crosses midnight
            : (currentTime >= start && currentTime < end); // Same day
          
          if (isInQuietHours) {
            return false;
          }
        }
      }

      // Check daily notification limit (except for critical)
      if (priority !== 'critical' && preferences.max_daily_notifications > 0) {
        const count = await this.getDailyNotificationCount(userId);
        if (count >= preferences.max_daily_notifications) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking if notification should be sent:', error);
      return true; // Default to sending on error
    }
  }

  /**
   * Get daily notification count for user
   */
  static async getDailyNotificationCount(userId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('notification_daily_count')
        .select('count')
        .eq('user_id', userId)
        .eq('notification_date', today)
        .single();

      if (error || !data) {
        return 0;
      }

      return data.count || 0;
    } catch (error) {
      console.error('Error getting daily notification count:', error);
      return 0;
    }
  }

  /**
   * Increment daily notification count
   */
  static async incrementDailyCount(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existing } = await supabase
        .from('notification_daily_count')
        .select('*')
        .eq('user_id', userId)
        .eq('notification_date', today)
        .single();

      if (existing) {
        // Update existing count
        await supabase
          .from('notification_daily_count')
          .update({ count: existing.count + 1 })
          .eq('id', existing.id);
      } else {
        // Insert new count
        await supabase
          .from('notification_daily_count')
          .insert({
            user_id: userId,
            notification_date: today,
            count: 1,
          });
      }
    } catch (error) {
      console.error('Error incrementing daily notification count:', error);
    }
  }

  /**
   * Reset daily notification count (should run at midnight)
   */
  static async resetDailyCount(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await supabase
        .from('notification_daily_count')
        .delete()
        .eq('user_id', userId)
        .neq('notification_date', today);
    } catch (error) {
      console.error('Error resetting daily notification count:', error);
    }
  }

  /**
   * Export preferences as JSON
   */
  static async exportPreferences(userId: string): Promise<string | null> {
    try {
      const preferences = await this.getPreferences(userId);
      if (!preferences) return null;

      return JSON.stringify(preferences, null, 2);
    } catch (error) {
      console.error('Error exporting preferences:', error);
      return null;
    }
  }

  /**
   * Import preferences from JSON
   */
  static async importPreferences(userId: string, json: string): Promise<boolean> {
    try {
      const preferences = JSON.parse(json);
      delete preferences.id;
      delete preferences.user_id;
      delete preferences.created_at;
      delete preferences.updated_at;

      return await this.updatePreferences(userId, preferences);
    } catch (error) {
      console.error('Error importing preferences:', error);
      return false;
    }
  }
}

