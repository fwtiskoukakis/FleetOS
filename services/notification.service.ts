/**
 * Notification Service
 * Handles push notifications using Expo Notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../utils/supabase';
import { NotificationType, NOTIFICATION_CONFIGS, NotificationPriority } from './notification-types';
import { NotificationHistoryService } from './notification-history.service';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type?: NotificationType;
  title?: string;
  body: string;
  data?: any;
  priority?: NotificationPriority;
}

export class NotificationService {
  private static expoPushToken: string | null = null;

  /**
   * Initialize notification service and request permissions
   */
  static async initialize(): Promise<string | null> {
    try {
      // Check if running on physical device (required for push notifications)
      if (!Device.isDevice) {
        console.log('Push notifications only work on physical devices');
        return null;
      }

      // Request notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
        return null;
      }

      // Get Expo Push Token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '7bea0453-324a-4cb4-894c-48f86d8f37cc', // From app.json extra.eas.projectId
      });

      this.expoPushToken = token.data;
      console.log('Expo Push Token:', token.data);

      // Configure notification channels (Android only)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('contracts', {
          name: 'Συμβόλαια',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Υπενθυμίσεις',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250],
          sound: 'default',
        });
      }

      return token.data;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to database for the current user
   */
  static async savePushToken(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          push_token: token,
          device_type: Platform.OS,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,device_type',
        });

      if (error) {
        console.error('Error saving push token:', error);
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  /**
   * Schedule a local notification
   */
  static async scheduleLocalNotification(
    notification: NotificationData,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      // Map priority to Android importance
      let androidPriority = Notifications.AndroidNotificationPriority.DEFAULT;
      if (notification.priority) {
        switch (notification.priority) {
          case 'critical':
            androidPriority = Notifications.AndroidNotificationPriority.MAX;
            break;
          case 'high':
            androidPriority = Notifications.AndroidNotificationPriority.HIGH;
            break;
          case 'medium':
            androidPriority = Notifications.AndroidNotificationPriority.DEFAULT;
            break;
          case 'low':
            androidPriority = Notifications.AndroidNotificationPriority.LOW;
            break;
        }
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title || 'Ειδοποίηση',
          body: notification.body,
          data: { ...notification.data, type: notification.type },
          sound: true,
          priority: androidPriority,
        },
        trigger: trigger || null, // null = show immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Schedule contract reminder notification
   */
  static async scheduleContractReminder(
    contractId: string,
    licensePlate: string,
    dropoffDate: Date,
    hoursBeforeReminder: number = 2
  ): Promise<string | null> {
    try {
      const reminderTime = new Date(dropoffDate);
      reminderTime.setHours(reminderTime.getHours() - hoursBeforeReminder);

      // Only schedule if in the future
      if (reminderTime <= new Date()) {
        return null;
      }

      return await this.scheduleLocalNotification(
        {
          type: 'contract_reminder',
          title: 'Υπενθύμιση Συμβολαίου',
          body: `Το όχημα ${licensePlate} πρέπει να επιστραφεί σε ${hoursBeforeReminder} ώρες`,
          data: { contractId, licensePlate },
        },
        {
          date: reminderTime,
        }
      );
    } catch (error) {
      console.error('Error scheduling contract reminder:', error);
      return null;
    }
  }

  /**
   * Schedule vehicle maintenance reminder
   */
  static async scheduleMaintenanceReminder(
    vehicleId: string,
    licensePlate: string,
    maintenanceType: 'kteo' | 'insurance' | 'service',
    dueDate: Date,
    daysBeforeReminder: number = 7
  ): Promise<string | null> {
    try {
      const reminderTime = new Date(dueDate);
      reminderTime.setDate(reminderTime.getDate() - daysBeforeReminder);

      if (reminderTime <= new Date()) {
        return null;
      }

      const titles = {
        kteo: 'Υπενθύμιση ΚΤΕΟ',
        insurance: 'Υπενθύμιση Ασφάλισης',
        service: 'Υπενθύμιση Service',
      };

      return await this.scheduleLocalNotification(
        {
          type: 'vehicle_maintenance',
          title: titles[maintenanceType],
          body: `Το όχημα ${licensePlate} χρειάζεται ${maintenanceType === 'kteo' ? 'ΚΤΕΟ' : maintenanceType === 'insurance' ? 'ανανέωση ασφάλισης' : 'service'} σε ${daysBeforeReminder} ημέρες`,
          data: { vehicleId, licensePlate, maintenanceType },
        },
        {
          date: reminderTime,
        }
      );
    } catch (error) {
      console.error('Error scheduling maintenance reminder:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Send immediate notification
   */
  static async sendImmediateNotification(notification: NotificationData): Promise<string> {
    return await this.scheduleLocalNotification(notification, null);
  }

  /**
   * Schedule notification by type (using predefined configurations)
   */
  static async scheduleNotificationByType(
    type: NotificationType,
    partial: Partial<NotificationData>,
    trigger?: Date | Notifications.NotificationTriggerInput
  ): Promise<string> {
    const config = NOTIFICATION_CONFIGS[type];
    if (!config) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    const notification: NotificationData = {
      type,
      title: partial.title || `${config.emoji} ${config.title}`,
      body: partial.body,
      data: { ...partial.data, type, category: config.category },
      priority: config.priority,
    };

    // Convert Date to trigger if provided
    const triggerInput = trigger instanceof Date 
      ? { date: trigger } 
      : trigger;

    const notificationId = await this.scheduleLocalNotification(notification, triggerInput || null);

    // Save to history if immediate notification (no trigger)
    if (!trigger) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await NotificationHistoryService.saveToHistory(
            user.id,
            type,
            notification.title || '',
            notification.body,
            notification.data,
            partial.data?.contractId,
            partial.data?.vehicleId
          );
        }
      } catch (error) {
        console.error('Error saving to notification history:', error);
      }
    }

    return notificationId;
  }

  /**
   * Send immediate notification by type
   */
  static async sendNotificationByType(
    type: NotificationType,
    partial: Partial<NotificationData>
  ): Promise<string> {
    return await this.scheduleNotificationByType(type, partial, null);
  }

  /**
   * Get current push token
   */
  static getCurrentPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Set up notification listeners
   */
  static addNotificationReceivedListener(
    handler: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(handler);
  }

  /**
   * Set up notification response listener (when user taps notification)
   */
  static addNotificationResponseReceivedListener(
    handler: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }

  /**
   * Get notification badge count (iOS)
   */
  static async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Set notification badge count (iOS)
   */
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Clear all notifications from notification center
   */
  static async dismissAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error dismissing notifications:', error);
    }
  }
}

