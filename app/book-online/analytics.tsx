import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../contexts/theme-context';
import { Spacing } from '../../utils/design-system';
import { supabase } from '../../services/supabase.service';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { el } from 'date-fns/locale';

interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  monthRevenue: number;
  avgBookingValue: number;
  avgRentalDays: number;
}

export default function BookOnlineAnalyticsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    avgBookingValue: 0,
    avgRentalDays: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('online_bookings')
        .select('*');

      if (error) throw error;

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const totalRevenue = data.reduce((sum, b) => sum + (b.total_price || 0), 0);
      
      const monthRevenue = data
        .filter(b => {
          const bookingDate = parseISO(b.created_at);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        })
        .reduce((sum, b) => sum + (b.total_price || 0), 0);

      const completedBookings = data.filter(b => b.booking_status === 'completed');
      const avgBookingValue = completedBookings.length > 0
        ? completedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0) / completedBookings.length
        : 0;

      const avgRentalDays = data.length > 0
        ? data.reduce((sum, b) => sum + (b.rental_days || 0), 0) / data.length
        : 0;

      setStats({
        total: data.length,
        pending: data.filter(b => b.booking_status === 'pending').length,
        confirmed: data.filter(b => b.booking_status === 'confirmed').length,
        in_progress: data.filter(b => b.booking_status === 'in_progress').length,
        completed: data.filter(b => b.booking_status === 'completed').length,
        cancelled: data.filter(b => b.booking_status === 'cancelled').length,
        totalRevenue,
        monthRevenue,
        avgBookingValue,
        avgRentalDays,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης στατιστικών');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadStats();
  }

  function StatCard({ icon, label, value, color }: any) {
    return (
      <View style={[styles.statCard, { backgroundColor: colors.card, borderLeftColor: color, borderLeftWidth: 4 }]}>
        <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.statContent}>
          <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="stats-chart" size={48} color={colors.textSecondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Φόρτωση στατιστικών...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Αναλυτικά</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Στατιστικά και αναφορές κρατήσεων
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Overview Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Επισκόπηση</Text>
        <View style={styles.grid}>
          <StatCard icon="documents" label="Συνολικά" value={stats.total} color="#3b82f6" />
          <StatCard icon="checkmark-circle" label="Επιβεβαιωμένες" value={stats.confirmed} color="#10b981" />
          <StatCard icon="time" label="Εκκρεμείς" value={stats.pending} color="#f59e0b" />
          <StatCard icon="play-circle" label="Σε Εξέλιξη" value={stats.in_progress} color="#6366f1" />
        </View>

        <View style={styles.grid}>
          <StatCard icon="checkmark-done" label="Ολοκληρωμένες" value={stats.completed} color="#6b7280" />
          <StatCard icon="close-circle" label="Ακυρωμένες" value={stats.cancelled} color="#ef4444" />
        </View>

        {/* Revenue Section */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.md }]}>Έσοδα</Text>
        <View style={styles.revenueSection}>
          <View style={[styles.revenueCard, { backgroundColor: colors.card }]}>
            <View style={styles.revenueRow}>
              <View style={styles.revenueItem}>
                <Ionicons name="trending-up" size={18} color="#10b981" />
                <View style={styles.revenueTextContainer}>
                  <Text style={[styles.revenueLabel, { color: colors.textSecondary }]}>Συνολικά</Text>
                  <Text style={[styles.revenueValue, { color: colors.text }]}>
                    €{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
              <View style={[styles.revenueDivider, { backgroundColor: colors.border }]} />
              <View style={styles.revenueItem}>
                <Ionicons name="calendar" size={18} color="#3b82f6" />
                <View style={styles.revenueTextContainer}>
                  <Text style={[styles.revenueLabel, { color: colors.textSecondary }]}>Αυτόν τον Μήνα</Text>
                  <Text style={[styles.revenueValue, { color: colors.text }]}>
                    €{stats.monthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={[styles.revenueCard, { backgroundColor: colors.card }]}>
            <View style={styles.revenueRowSingle}>
              <Ionicons name="calculator" size={18} color="#6366f1" />
              <View style={styles.revenueTextContainer}>
                <Text style={[styles.revenueLabel, { color: colors.textSecondary }]}>Μέση Αξία Κράτησης</Text>
                <Text style={[styles.revenueValue, { color: colors.text }]}>
                  €{stats.avgBookingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.revenueCard, { backgroundColor: colors.card }]}>
            <View style={styles.revenueRowSingle}>
              <Ionicons name="calendar-outline" size={18} color="#8b5cf6" />
              <View style={styles.revenueTextContainer}>
                <Text style={[styles.revenueLabel, { color: colors.textSecondary }]}>Μέσες Ημέρες Ενοικίασης</Text>
                <Text style={[styles.revenueValue, { color: colors.text }]}>
                  {stats.avgRentalDays.toFixed(1)} ημέρες
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: { fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: { padding: Spacing.xs },
  headerTextContainer: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  scrollView: { flex: 1 },
  content: { padding: Spacing.md },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginVertical: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 10,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  statContent: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '500' },
  revenueSection: { gap: Spacing.xs },
  revenueCard: {
    borderRadius: 10,
    padding: Spacing.md,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  revenueRowSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  revenueItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  revenueTextContainer: { flex: 1 },
  revenueDivider: {
    width: 1,
    height: 30,
  },
  revenueLabel: {
    fontSize: 10,
    marginBottom: 2,
    fontWeight: '500',
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});

