/**
 * Notification History Service
 * Manages notification history stored in the database
 */

import { supabase } from '../utils/supabase';
import { NotificationType, NOTIFICATION_CONFIGS } from './notification-types';

export interface NotificationHistory {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  data?: any;
  sent_at: string;
  read_at?: string;
  is_read: boolean;
  contract_id?: string;
  vehicle_id?: string;
}

export class NotificationHistoryService {
  /**
   * Save notification to history
   */
  static async saveToHistory(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any,
    contractId?: string,
    vehicleId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_history')
        .insert({
          user_id: userId,
          notification_type: type,
          title,
          body,
          data,
          contract_id: contractId,
          vehicle_id: vehicleId,
        });

      if (error) {
        console.error('Error saving notification to history:', error);
      }
    } catch (error) {
      console.error('Error saving notification to history:', error);
    }
  }

  /**
   * Get all notifications for a user
   */
  static async getAllNotifications(userId: string): Promise<NotificationHistory[]> {
    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching notification history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  }

  /**
   * Get unread notifications count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notification_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_history')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Delete all read notifications
   */
  static async deleteAllRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_history')
        .delete()
        .eq('user_id', userId)
        .eq('is_read', true);

      if (error) {
        console.error('Error deleting read notifications:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      return false;
    }
  }

  /**
   * Get notification with config details
   */
  static getNotificationWithConfig(notification: NotificationHistory) {
    const config = NOTIFICATION_CONFIGS[notification.notification_type];
    
    return {
      ...notification,
      config,
      emoji: config?.emoji || '📢',
      category: config?.category || 'operational',
      priority: config?.priority || 'medium',
    };
  }
}

