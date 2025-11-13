import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../utils/design-system';
import { VehicleService } from '../services/vehicle.service';
import { SupabaseContractService } from '../services/supabase-contract.service';
import { Vehicle } from '../models/vehicle.interface';
import { Contract } from '../models/contract.interface';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';
import { el } from 'date-fns/locale';
import { useThemeColors } from '../contexts/theme-context';

const { width } = Dimensions.get('window');
const DAY_WIDTH = 45; // Width of each day column (compact)
const VEHICLE_HEIGHT = 60; // Height of each vehicle row (taller for 2 lines of text)
const HEADER_HEIGHT = 50;
const VEHICLE_LABEL_WIDTH = 80; // Compact but readable

interface VehicleBooking {
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  contractId: string;
  renterName: string;
  status: 'active' | 'completed' | 'pending';
}

interface VehicleCalendarData {
  vehicle: Vehicle;
  bookings: VehicleBooking[];
}

interface PopupData {
  booking: VehicleBooking;
  vehicleName: string;
  position: { x: number; y: number };
}

export function VehicleCalendarGrid() {
  const router = useRouter();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [vehicleData, setVehicleData] = useState<VehicleCalendarData[]>([]);
  const [dates, setDates] = useState<Date[]>([]);
  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const popupAnim = useRef(new Animated.Value(0)).current;
  const horizontalScrollRef = useRef<ScrollView>(null);
  const headerScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const labelsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  useEffect(() => {
    if (popupData) {
      Animated.spring(popupAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    } else {
      Animated.timing(popupAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [popupData]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Get date range for current month
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
      setDates(daysInMonth);

      // Load vehicles
      const vehicles = await VehicleService.getAllVehicles();
      
      // Load all contracts
      const contracts = await SupabaseContractService.getAllContracts();

      // Map bookings to vehicles
      const vehicleCalendarData: VehicleCalendarData[] = vehicles.map(vehicle => {
        const vehicleBookings: VehicleBooking[] = contracts
          .filter(contract => contract.carInfo.licensePlate === vehicle.licensePlate)
          .map(contract => {
            const pickupDate = new Date(contract.rentalPeriod.pickupDate);
            const dropoffDate = new Date(contract.rentalPeriod.dropoffDate);
            
            // Map contract status to booking status
            let bookingStatus: 'active' | 'completed' | 'pending' = 'active';
            if (contract.status === 'completed') {
              bookingStatus = 'completed';
            } else if (contract.status === 'upcoming') {
              bookingStatus = 'pending';
            }
            
            return {
              vehicleId: vehicle.id,
              startDate: pickupDate,
              endDate: dropoffDate,
              contractId: contract.id,
              renterName: contract.renterInfo.fullName,
              status: bookingStatus,
            };
          })
          .filter(booking => {
            // Only include bookings that overlap with current month
            return (
              isWithinInterval(booking.startDate, { start: monthStart, end: monthEnd }) ||
              isWithinInterval(booking.endDate, { start: monthStart, end: monthEnd }) ||
              (booking.startDate <= monthStart && booking.endDate >= monthEnd)
            );
          });

        return {
          vehicle,
          bookings: vehicleBookings,
        };
      });

      console.log('Vehicle Calendar Data:', vehicleCalendarData.map(v => ({
        vehicle: `${v.vehicle.make} ${v.vehicle.model} (${v.vehicle.licensePlate})`,
        bookingsCount: v.bookings.length,
      })));

      setVehicleData(vehicleCalendarData);
    } catch (error) {
      console.error('Error loading vehicle calendar data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleBarPress(booking: VehicleBooking, vehicleName: string, event: any) {
    // Get touch position for popup
    event.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      setPopupData({
        booking,
        vehicleName,
        position: { x: pageX, y: pageY },
      });
    });
  }

  function closePopup() {
    setPopupData(null);
  }

  function navigateToContract() {
    if (popupData) {
      closePopup();
      router.push(`/contract-details?contractId=${popupData.booking.contractId}`);
    }
  }

  function getBookingColor(status: string): string {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'completed':
        return Colors.textSecondary;
      case 'pending':
        return Colors.warning;
      default:
        return Colors.primary;
    }
  }

  function calculateBarPosition(booking: VehicleBooking, dates: Date[]): { left: number; width: number } | null {
    const firstDayOfMonth = dates[0];
    const lastDayOfMonth = dates[dates.length - 1];

    // Adjust booking dates to month boundaries
    const displayStart = booking.startDate < firstDayOfMonth ? firstDayOfMonth : booking.startDate;
    const displayEnd = booking.endDate > lastDayOfMonth ? lastDayOfMonth : booking.endDate;

    // Find start and end indices
    const startIndex = dates.findIndex(date => isSameDay(date, displayStart));
    const endIndex = dates.findIndex(date => isSameDay(date, displayEnd));

    if (startIndex === -1 || endIndex === -1) return null;

    const left = startIndex * DAY_WIDTH;
    const width = (endIndex - startIndex + 1) * DAY_WIDTH;

    return { left, width };
  }

  function renderVehicleLabel(data: VehicleCalendarData, index: number) {
    const licensePlate = data.vehicle.licensePlate;
    const model = data.vehicle.model || data.vehicle.make;
    
    return (
      <View key={`label-${data.vehicle.id}`} style={[styles.vehicleLabel, { backgroundColor: colors.card }]}>
        <Text style={[styles.vehicleModel, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
          {model}
        </Text>
        <Text style={[styles.vehiclePlate, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
          {licensePlate}
        </Text>
      </View>
    );
  }

  function renderVehicleTimeline(data: VehicleCalendarData, index: number) {
    const vehicleName = `${data.vehicle.make} ${data.vehicle.model}`;

    return (
      <View key={`timeline-${data.vehicle.id}`} style={styles.vehicleRow}>
        {/* Timeline Area */}
        <View style={styles.timeline}>
          {/* Background Grid */}
          <View style={styles.gridRow}>
            {dates.map((date, idx) => {
              const isToday = isSameDay(date, new Date());
              return (
                <View
                  key={idx}
                  style={[
                    styles.gridCell,
                    {
                      backgroundColor: isToday
                        ? Colors.primary + '10'
                        : idx % 2 === 0 
                          ? colors.isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
                          : 'transparent',
                      borderRightColor: colors.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      borderLeftWidth: isToday ? 2 : 0,
                      borderRightWidth: isToday ? 2 : 1,
                      borderLeftColor: isToday ? Colors.primary : 'transparent',
                      borderRightColor: isToday ? Colors.primary : (colors.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'),
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Booking Bars */}
          {data.bookings.map((booking, bookingIdx) => {
            const barPosition = calculateBarPosition(booking, dates);
            if (!barPosition) return null;

            const bookingColor = getBookingColor(booking.status);

            return (
              <TouchableOpacity
                key={bookingIdx}
                style={[
                  styles.bookingBar,
                  {
                    left: barPosition.left + 4,
                    width: barPosition.width - 8,
                    backgroundColor: bookingColor,
                  },
                ]}
                activeOpacity={0.8}
                onPress={(e) => handleBarPress(booking, vehicleName, e)}
              >
                <Text style={styles.bookingBarText} numberOfLines={1}>
                  {booking.renterName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Φόρτωση ημερολογίου οχημάτων...
        </Text>
      </View>
    );
  }

  if (vehicleData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="car-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Δεν υπάρχουν οχήματα</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Προσθέστε οχήματα για να εμφανιστούν στο ημερολόγιο
        </Text>
      </View>
    );
  }

  const handleHorizontalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    headerScrollRef.current?.scrollTo({ x: scrollX, animated: false });
  };

  const handleVerticalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    labelsScrollRef.current?.scrollTo({ y: scrollY, animated: false });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Dates */}
      <View style={styles.header}>
        {/* Empty space for vehicle labels */}
        <View style={[styles.headerVehicleSpace, { backgroundColor: colors.card }]} />

        {/* Date Headers */}
        <ScrollView
          ref={headerScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          scrollEnabled={false}
        >
          <View style={styles.dateHeaderRow}>
            {dates.map((date, index) => {
              const isToday = isSameDay(date, new Date());
              return (
                <View
                  key={index}
                  style={[
                    styles.dateHeader,
                    isToday && {
                      backgroundColor: Colors.primary + '20',
                      borderLeftWidth: 2,
                      borderRightWidth: 2,
                      borderBottomWidth: 2,
                      borderLeftColor: Colors.primary,
                      borderRightColor: Colors.primary,
                      borderBottomColor: Colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.dateDay, { color: isToday ? Colors.primary : colors.text }]}>
                    {format(date, 'd')}
                  </Text>
                  <Text style={[styles.dateWeekday, { color: isToday ? Colors.primary : colors.textSecondary }]}>
                    {format(date, 'EEE', { locale: el })}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Vehicle Rows */}
      <View style={styles.contentContainer}>
        {/* Fixed Vehicle Labels Column */}
        <ScrollView
          ref={labelsScrollRef}
          style={styles.vehicleLabelsColumn}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          <View>
            {vehicleData.map((data, index) => renderVehicleLabel(data, index))}
          </View>
        </ScrollView>

        {/* Scrollable Timeline Area */}
        <ScrollView
          ref={verticalScrollRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleVerticalScroll}
        >
          <ScrollView
            ref={horizontalScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleHorizontalScroll}
          >
            <View>
              {vehicleData.map((data, index) => renderVehicleTimeline(data, index))}
            </View>
          </ScrollView>
        </ScrollView>
      </View>

      {/* Popup Modal */}
      {popupData && (
        <Modal
          visible={!!popupData}
          transparent
          animationType="none"
          onRequestClose={closePopup}
        >
          <TouchableOpacity
            style={styles.popupOverlay}
            activeOpacity={1}
            onPress={closePopup}
          >
            <Animated.View
              style={[
                styles.popup,
                {
                  backgroundColor: colors.card,
                  transform: [
                    {
                      scale: popupAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                  opacity: popupAnim,
                },
              ]}
            >
              <View style={styles.popupContent}>
                <View style={styles.popupHeader}>
                  <Ionicons name="car" size={20} color={Colors.primary} />
                  <Text style={[styles.popupVehicle, { color: colors.text }]}>
                    {popupData.vehicleName}
                  </Text>
                </View>

                <View style={styles.popupBody}>
                  <View style={styles.popupRow}>
                    <Ionicons name="person" size={16} color={colors.textSecondary} />
                    <Text style={[styles.popupLabel, { color: colors.textSecondary }]}>Ενοικιαστής:</Text>
                    <Text style={[styles.popupValue, { color: colors.text }]}>
                      {popupData.booking.renterName}
                    </Text>
                  </View>

                  <View style={styles.popupRow}>
                    <Ionicons name="calendar" size={16} color={colors.textSecondary} />
                    <Text style={[styles.popupLabel, { color: colors.textSecondary }]}>Περίοδος:</Text>
                    <Text style={[styles.popupValue, { color: colors.text }]}>
                      {format(popupData.booking.startDate, 'dd/MM')} - {format(popupData.booking.endDate, 'dd/MM')}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.popupButton, { backgroundColor: Colors.primary }]}
                  onPress={navigateToContract}
                  activeOpacity={0.8}
                >
                  <Text style={styles.popupButtonText}>Προβολή Συμβολαίου</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: colors.card }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Ενεργό</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Σε αναμονή</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.textSecondary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Ολοκληρωμένο</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.title3,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    height: HEADER_HEIGHT,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary + '30',
  },
  headerVehicleSpace: {
    width: VEHICLE_LABEL_WIDTH,
    maxWidth: VEHICLE_LABEL_WIDTH,
    minWidth: VEHICLE_LABEL_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 2,
    borderRightColor: Colors.primary + '30',
  },
  dateHeaderRow: {
    flexDirection: 'row',
  },
  dateHeader: {
    width: DAY_WIDTH,
    height: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 0, 0, 0.05)',
  },
  dateDay: {
    ...Typography.caption1,
    fontWeight: '700',
    fontSize: 14,
  },
  dateWeekday: {
    ...Typography.caption2,
    fontSize: 9,
    marginTop: 1,
    textTransform: 'uppercase',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  vehicleLabelsColumn: {
    width: VEHICLE_LABEL_WIDTH,
    maxWidth: VEHICLE_LABEL_WIDTH,
    minWidth: VEHICLE_LABEL_WIDTH,
    borderRightWidth: 2,
    borderRightColor: Colors.primary + '30',
  },
  scrollView: {
    flex: 1,
  },
  vehicleRow: {
    height: VEHICLE_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  vehicleLabel: {
    width: VEHICLE_LABEL_WIDTH,
    height: VEHICLE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  vehicleModel: {
    ...Typography.caption2,
    fontWeight: '500',
    fontSize: 9,
    marginBottom: 2,
  },
  vehicleName: {
    ...Typography.caption1,
    fontWeight: '600',
    fontSize: 10,
  },
  vehiclePlate: {
    ...Typography.caption1,
    fontWeight: '700',
    fontSize: 11,
  },
  timeline: {
    flex: 1,
    position: 'relative',
  },
  gridRow: {
    flexDirection: 'row',
    height: VEHICLE_HEIGHT,
  },
  gridCell: {
    width: DAY_WIDTH,
    height: VEHICLE_HEIGHT,
    borderRightWidth: 1,
  },
  bookingBar: {
    position: 'absolute',
    top: 10,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 6,
    ...Shadows.md,
  },
  bookingBarText: {
    ...Typography.caption1,
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    ...Shadows.lg,
  },
  popupContent: {
    padding: Spacing.lg,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  popupVehicle: {
    ...Typography.title3,
    fontWeight: '700',
    flex: 1,
  },
  popupBody: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  popupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  popupLabel: {
    ...Typography.body,
    width: 90,
  },
  popupValue: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
  },
  popupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  popupButtonText: {
    ...Typography.body,
    color: '#fff',
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...Typography.caption1,
  },
});

