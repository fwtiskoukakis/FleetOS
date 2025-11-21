import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../contexts/theme-context';
import { Spacing } from '../../utils/design-system';
import { supabase } from '../../services/supabase.service';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface OnlineBooking {
  id: string;
  booking_number: string;
  customer_full_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_date: string;
  dropoff_date: string;
  rental_days: number;
  total_price: number;
  amount_paid: number;
  amount_remaining: number;
  booking_status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'deposit_paid' | 'fully_paid' | 'refunded' | 'cancelled';
  created_at: string;
  car?: {
    make: string;
    model: string;
    license_plate: string;
  };
  pickup_location?: {
    name_el: string;
  };
  dropoff_location?: {
    name_el: string;
  };
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  in_progress: '#3b82f6',
  completed: '#6b7280',
  cancelled: '#ef4444',
  no_show: '#dc2626',
};

const STATUS_LABELS = {
  pending: 'Εκκρεμής',
  confirmed: 'Επιβεβαιωμένη',
  in_progress: 'Σε Εξέλιξη',
  completed: 'Ολοκληρωμένη',
  cancelled: 'Ακυρωμένη',
  no_show: 'Δεν εμφανίστηκε',
};

const PAYMENT_STATUS_LABELS = {
  pending: 'Εκκρεμής',
  deposit_paid: 'Προκαταβολή',
  fully_paid: 'Πληρωμένη',
  refunded: 'Επιστροφή',
  cancelled: 'Ακυρωμένη',
};

export default function BookingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [bookings, setBookings] = useState<OnlineBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<OnlineBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [searchQuery, filterStatus, bookings]);

  async function loadBookings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('online_bookings')
        .select(`
          *,
          car:booking_cars(make, model, license_plate),
          pickup_location:locations!pickup_location_id(name_el),
          dropoff_location:locations!dropoff_location_id(name_el)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης κρατήσεων');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  }

  function filterBookings() {
    let filtered = bookings;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(b => b.booking_status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.booking_number.toLowerCase().includes(query) ||
        b.customer_full_name.toLowerCase().includes(query) ||
        b.customer_email.toLowerCase().includes(query) ||
        b.customer_phone.includes(query) ||
        (b.car && `${b.car.make} ${b.car.model}`.toLowerCase().includes(query))
      );
    }

    setFilteredBookings(filtered);
  }

  async function confirmBooking(booking: OnlineBooking) {
    Alert.alert(
      'Επιβεβαίωση Κράτησης',
      `Επιβεβαίωση κράτησης ${booking.booking_number};`,
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Επιβεβαίωση',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('online_bookings')
                .update({ booking_status: 'confirmed' })
                .eq('id', booking.id);

              if (error) throw error;
              Alert.alert('Επιτυχία', 'Η κράτηση επιβεβαιώθηκε');
              loadBookings();
            } catch (error) {
              console.error('Error confirming booking:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία επιβεβαίωσης');
            }
          },
        },
      ]
    );
  }

  async function cancelBooking(booking: OnlineBooking) {
    Alert.alert(
      'Ακύρωση Κράτησης',
      `Ακύρωση κράτησης ${booking.booking_number};`,
      [
        { text: 'Όχι', style: 'cancel' },
        {
          text: 'Ναι, Ακύρωση',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('online_bookings')
                .update({
                  booking_status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                })
                .eq('id', booking.id);

              if (error) throw error;
              Alert.alert('Επιτυχία', 'Η κράτηση ακυρώθηκε');
              loadBookings();
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία ακύρωσης');
            }
          },
        },
      ]
    );
  }

  async function convertToContract(booking: OnlineBooking) {
    Alert.alert(
      'Μετατροπή σε Συμβόλαιο',
      'Θέλετε να δημιουργήσετε συμβόλαιο από αυτή την κράτηση;',
      [
        { text: 'Άκυρο', style: 'cancel' },
        {
          text: 'Δημιουργία',
          onPress: () => {
            // Navigate to contract creation with pre-filled data
            router.push({
              pathname: '/new-contract',
              params: {
                bookingId: booking.id,
                // Pre-fill contract data from booking
                customerName: booking.customer_full_name,
                customerEmail: booking.customer_email,
                customerPhone: booking.customer_phone,
              },
            });
          },
        },
      ]
    );
  }

  function viewBookingDetails(booking: OnlineBooking) {
    // Navigate to booking details screen
    router.push(`/book-online/booking-details/${booking.id}`);
  }

  function formatDate(dateString: string) {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: el });
  }

  function getStatusColor(status: string) {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6b7280';
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Κρατήσεις</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {filteredBookings.length} κρατήσεις
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Αναζήτηση (όνομα, email, booking#...)"
          placeholderTextColor={colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              filterStatus === status && { backgroundColor: colors.primary },
              { borderColor: colors.border },
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: filterStatus === status ? '#fff' : colors.text },
              ]}
            >
              {status === 'all' ? 'Όλες' : STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Φόρτωση...
          </Text>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Δεν βρέθηκαν κρατήσεις
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={[styles.bookingCard, { backgroundColor: colors.card }]}
              onPress={() => viewBookingDetails(booking)}
              activeOpacity={0.7}
            >
              {/* Header */}
              <View style={styles.bookingHeader}>
                <View style={styles.bookingNumberContainer}>
                  <Text style={[styles.bookingNumber, { color: colors.primary }]}>
                    {booking.booking_number}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.booking_status) }]}>
                    <Text style={styles.statusBadgeText}>
                      {STATUS_LABELS[booking.booking_status]}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.bookingDate, { color: colors.textSecondary }]}>
                  {formatDate(booking.created_at)}
                </Text>
              </View>

              {/* Customer Info */}
              <View style={styles.infoRow}>
                <Ionicons name="person" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {booking.customer_full_name}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mail" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {booking.customer_email}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="call" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {booking.customer_phone}
                </Text>
              </View>

              {/* Car & Dates */}
              {booking.car && (
                <View style={[styles.carInfoContainer, { backgroundColor: colors.background }]}>
                  <Ionicons name="car-sport" size={20} color={colors.primary} />
                  <Text style={[styles.carInfoText, { color: colors.text }]}>
                    {booking.car.make} {booking.car.model}
                  </Text>
                </View>
              )}

              <View style={styles.dateRow}>
                <View style={styles.dateColumn}>
                  <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Παραλαβή</Text>
                  <Text style={[styles.dateText, { color: colors.text }]}>
                    {formatDate(booking.pickup_date)}
                  </Text>
                  {booking.pickup_location && (
                    <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {booking.pickup_location.name_el}
                    </Text>
                  )}
                </View>
                <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} />
                <View style={styles.dateColumn}>
                  <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Παράδοση</Text>
                  <Text style={[styles.dateText, { color: colors.text }]}>
                    {formatDate(booking.dropoff_date)}
                  </Text>
                  {booking.dropoff_location && (
                    <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {booking.dropoff_location.name_el}
                    </Text>
                  )}
                </View>
              </View>

              {/* Payment Info */}
              <View style={styles.paymentRow}>
                <View style={styles.paymentInfo}>
                  <Text style={[styles.totalPrice, { color: colors.text }]}>
                    €{booking.total_price.toFixed(2)}
                  </Text>
                  <Text style={[styles.paymentStatus, { color: colors.textSecondary }]}>
                    {PAYMENT_STATUS_LABELS[booking.payment_status]}
                  </Text>
                </View>
                {booking.amount_remaining > 0 && (
                  <View style={[styles.remainingBadge, { backgroundColor: '#f59e0b' + '20' }]}>
                    <Text style={[styles.remainingText, { color: '#f59e0b' }]}>
                      Υπόλοιπο: €{booking.amount_remaining.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              {booking.booking_status === 'pending' && (
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10b981' + '15' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      confirmBooking(booking);
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    <Text style={[styles.actionButtonText, { color: '#10b981' }]}>
                      Επιβεβαίωση
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#ef4444' + '15' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      cancelBooking(booking);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                    <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
                      Ακύρωση
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {booking.booking_status === 'confirmed' && (
                <TouchableOpacity
                  style={[styles.convertButton, { backgroundColor: colors.primary }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    convertToContract(booking);
                  }}
                >
                  <Ionicons name="document-text" size={18} color="#fff" />
                  <Text style={styles.convertButtonText}>
                    Μετατροπή σε Συμβόλαιο
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: 10,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterContainer: {
    marginTop: Spacing.sm,
  },
  filterContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  bookingCard: {
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  bookingNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bookingNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  bookingDate: {
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
  },
  carInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  carInfoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  dateColumn: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 11,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  paymentInfo: {
    flex: 1,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  paymentStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  remainingBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  convertButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

