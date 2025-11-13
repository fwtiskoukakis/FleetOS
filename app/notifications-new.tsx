import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/app-header';
import { BottomTabBar } from '../components/bottom-tab-bar';
import { SimpleGlassCard } from '../components/glass-card';
import { Breadcrumb } from '../components/breadcrumb';
import { Colors, Typography, Spacing, BorderRadius } from '../utils/design-system';
import { smoothScrollConfig } from '../utils/animations';
import { NotificationHistoryService, NotificationHistory } from '../services/notification-history.service';
import { supabase } from '../utils/supabase';
import { useThemeColors } from '../contexts/theme-context';

export default function NotificationsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      const history = await NotificationHistoryService.getAllNotifications(user.id);
      setNotifications(history);
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης ειδοποιήσεων');
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }

  async function handleNotificationPress(notification: NotificationHistory) {
    // Mark as read
    if (!notification.is_read) {
      await NotificationHistoryService.markAsRead(notification.id);
      await loadNotifications(); // Reload to update UI
    }

    // Navigate based on notification type
    if (notification.contract_id) {
      router.push(`/contract-details?contractId=${notification.contract_id}`);
    } else if (notification.vehicle_id) {
      router.push(`/car-details?vehicleId=${notification.vehicle_id}`);
    }
  }

  async function markAllAsRead() {
    if (!userId) return;
    const success = await NotificationHistoryService.markAllAsRead(userId);
    if (success) {
      await loadNotifications();
    }
  }

  async function clearAll() {
    if (!userId) return;
    Alert.alert(
      'Διαγραφή Όλων',
      'Είστε σίγουροι ότι θέλετε να διαγράψετε όλες τις διαβασμένες ειδοποιήσεις;',
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            const success = await NotificationHistoryService.deleteAllRead(userId);
            if (success) {
              await loadNotifications();
            }
          },
        },
      ]
    );
  }

  function getNotificationIcon(notificationWithConfig: any) {
    const category = notificationWithConfig.category;
    switch (category) {
      case 'contract':
        return 'document-text';
      case 'maintenance':
        return 'construct';
      case 'financial':
        return 'cash';
      case 'alert':
        return 'warning';
      case 'milestone':
        return 'trophy';
      default:
        return 'notifications';
    }
  }

  function getNotificationColor(notificationWithConfig: any) {
    const priority = notificationWithConfig.priority;
    switch (priority) {
      case 'critical':
        return Colors.error;
      case 'high':
        return Colors.warning;
      case 'medium':
        return Colors.info;
      case 'low':
        return Colors.success;
      default:
        return Colors.primary;
    }
  }

  function formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} λεπτά πριν`;
    } else if (diffHours < 24) {
      return `${diffHours} ώρες πριν`;
    } else if (diffDays === 1) {
      return 'Χθες';
    } else {
      return date.toLocaleDateString('el-GR');
    }
  }

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter(n => !n.is_read)
      : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader title="Ειδοποιήσεις" showBack={true} showActions={true} />

      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Αρχική', path: '/', icon: 'home' },
          { label: 'Ειδοποιήσεις' },
        ]}
      />

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.isDark ? '#2a2a2a' : Colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, { color: filter === 'all' ? colors.primary : colors.textSecondary }]}>
            Όλες
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setFilter('unread')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, { color: filter === 'unread' ? colors.primary : colors.textSecondary }]}>
            Μη Αναγνωσμένες {unreadCount > 0 && `(${unreadCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      {notifications.length > 0 && (
        <View style={styles.actionsContainer}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.actionButton} activeOpacity={0.7}>
              <Ionicons name="checkmark-done" size={18} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Όλες Αναγνωσμένες</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={clearAll} style={styles.actionButton} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
            <Text style={[styles.actionText, { color: Colors.error }]}>Διαγραφή Αναγνωσμένων</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        {...smoothScrollConfig}
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Δεν υπάρχουν ειδοποιήσεις</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {filter === 'unread'
                ? 'Έχετε διαβάσει όλες τις ειδοποιήσεις σας'
                : 'Θα εμφανιστούν εδώ όταν λάβετε ειδοποιήσεις'}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => {
            const notificationWithConfig = NotificationHistoryService.getNotificationWithConfig(notification);
            return (
              <TouchableOpacity
                key={notification.id}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
              >
                <SimpleGlassCard style={[styles.notificationCard, notification.is_read && styles.readCard]}>
                  <View style={styles.notificationHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(notificationWithConfig) + '15' }]}>
                      <Text style={styles.notificationEmoji}>{notificationWithConfig.emoji}</Text>
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={[styles.notificationTitle, { color: colors.text }, notification.is_read && styles.readText]}>
                        {notification.title}
                      </Text>
                      <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>{notification.body}</Text>
                      <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                        {formatTimestamp(new Date(notification.sent_at))}
                      </Text>
                    </View>
                    {!notification.is_read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                  </View>
                </SimpleGlassCard>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  filterTab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.md,
  },
  filterText: {
    ...Typography.body,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  actionText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyTitle: {
    ...Typography.title3,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    ...Typography.body,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  notificationCard: {
    marginBottom: Spacing.sm,
  },
  readCard: {
    opacity: 0.6,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  notificationEmoji: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  readText: {
    opacity: 0.7,
  },
  notificationMessage: {
    ...Typography.footnote,
    marginBottom: 4,
    lineHeight: 18,
  },
  notificationTime: {
    ...Typography.caption2,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: Spacing.xs,
    marginTop: 6,
  },
});

