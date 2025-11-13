import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Breadcrumb } from '../../components/breadcrumb';
import { ContextAwareFab } from '../../components/context-aware-fab';
import { SimpleGlassCard } from '../../components/glass-card';
import { SupabaseContractService } from '../../services/supabase-contract.service';
import { Contract } from '../../models/contract.interface';
import { Colors, Typography, Spacing, Shadows, BorderRadius, Glass } from '../../utils/design-system';
import { smoothScrollConfig } from '../../utils/animations';
import { addDays, subDays, startOfDay, format, isSameDay, startOfMonth, endOfMonth, getDay, isBefore, addMonths } from 'date-fns';
import { el } from 'date-fns/locale';
import { useThemeColors } from '../../contexts/theme-context';
import { VehicleCalendarGrid } from '../../components/vehicle-calendar-grid';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'pickup' | 'dropoff' | 'maintenance' | 'inspection' | 'other';
  contractId?: string;
  carId?: string;
  description?: string;
  isCompleted: boolean;
  vehicleName?: string;
  renterName?: string;
  location?: string;
  time?: string;
}

const DAY_LABELS = ['ΔΕ', 'ΤΡ', 'ΤΕ', 'ΠΕ', 'ΠΑ', 'ΣΑ', 'ΚΥ'];

export default function CalendarScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'month' | 'agenda' | 'vehicles'>('month');
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [dayModalMounted, setDayModalMounted] = useState(false);
  const dayModalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadCalendarEvents();
  }, []);

  async function loadCalendarEvents() {
    try {
      setLoading(true);
      const contracts = await SupabaseContractService.getAllContracts();
      const calendarEvents: CalendarEvent[] = [];

      // Convert contracts to calendar events
      contracts.forEach(contract => {
        const pickupDate = new Date(contract.rentalPeriod.pickupDate);
        const dropoffDate = new Date(contract.rentalPeriod.dropoffDate);
        const pickupTime = contract.rentalPeriod.pickupTime?.slice(0, 5) || '';
        const dropoffTime = contract.rentalPeriod.dropoffTime?.slice(0, 5) || '';
        const pickupLocation = contract.rentalPeriod.pickupLocation || 'Χωρίς τοποθεσία';
        const dropoffLocation = contract.rentalPeriod.dropoffLocation || pickupLocation || 'Χωρίς τοποθεσία';
        const vehicleName = contract.carInfo.makeModel;
        const renterName = contract.renterInfo.fullName;

        // Pickup event
        calendarEvents.push({
          id: `${contract.id}-pickup`,
          title: `Παράλαβη - ${contract.renterInfo.fullName}`,
          date: pickupDate,
          type: 'pickup',
          contractId: contract.id,
          description: `${contract.carInfo.makeModel} • ${contract.carInfo.licensePlate}`,
          isCompleted: contract.status === 'completed',
          vehicleName,
          renterName,
          location: pickupLocation,
          time: pickupTime,
        });

        // Dropoff event
        calendarEvents.push({
          id: `${contract.id}-dropoff`,
          title: `Επιστροφή - ${contract.renterInfo.fullName}`,
          date: dropoffDate,
          type: 'dropoff',
          contractId: contract.id,
          description: `${contract.carInfo.makeModel} • ${contract.carInfo.licensePlate}`,
          isCompleted: contract.status === 'completed',
          vehicleName,
          renterName,
          location: dropoffLocation,
          time: dropoffTime,
        });
      });

      // Sort events by date
      calendarEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης ημερολογίου');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const today = useMemo(() => startOfDay(new Date()), []);
  const futureEvents = useMemo(
    () => events.filter(event => !isBefore(startOfDay(event.date), today)),
    [events, today]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    futureEvents.forEach(event => {
      const key = format(event.date, 'yyyy-MM-dd');
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(event);
    });
    map.forEach(list => list.sort((a, b) => a.date.getTime() - b.date.getTime()));
    return map;
  }, [futureEvents]);

  function renderAgendaEvent(event: CalendarEvent, compact: boolean = false) {
    const meta = (() => {
      switch (event.type) {
        case 'pickup':
          return { label: 'Παραλαβή', icon: 'arrow-down-circle', color: Colors.success };
        case 'dropoff':
          return { label: 'Επιστροφή', icon: 'arrow-up-circle', color: Colors.warning };
        case 'maintenance':
          return { label: 'Σέρβις', icon: 'build', color: Colors.info };
        case 'inspection':
          return { label: 'Έλεγχος', icon: 'shield-checkmark', color: Colors.secondary };
        default:
          return { label: 'Γεγονός', icon: 'calendar', color: Colors.primary };
      }
    })();

    const timeText = event.time || formatTime(event.date);
    const dateText = format(event.date, 'dd/MM', { locale: el });
    const titleText = event.vehicleName || event.title;
    const subtitleText = event.renterName || event.description || '';
    const locationText = event.location || 'Χωρίς τοποθεσία';

    return (
      <TouchableOpacity
        key={event.id}
        style={[styles.agendaCard, compact && styles.agendaCardCompact, { backgroundColor: colors.card }]}
        activeOpacity={0.8}
        onPress={() => {
          if (event.contractId) {
            router.push(`/contract-details?contractId=${event.contractId}`);
          }
        }}
      >
        <View style={[styles.agendaIconContainer, { backgroundColor: meta.color + '20' }]}>
          <Ionicons name={meta.icon as any} size={22} color={meta.color} />
          </View>
        <View style={styles.agendaContent}>
          <Text style={[styles.agendaTitle, compact && styles.agendaTitleCompact, { color: colors.text }]} numberOfLines={1}>
            {meta.label}
          </Text>
          <Text style={[styles.agendaSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {titleText}
            {subtitleText ? ` • ${subtitleText}` : ''}
          </Text>
          {!compact && (
            <Text style={[styles.agendaLocation, { color: colors.textSecondary }]} numberOfLines={1}>
              {locationText}
            </Text>
          )}
        </View>
        <View style={styles.agendaRight}>
          <Text style={[styles.agendaDate, { color: colors.textSecondary }]}>{dateText}</Text>
          <View style={styles.agendaTimePill}>
            <Ionicons name="time-outline" size={14} color={meta.color} />
            <Text style={[styles.agendaTimeText, { color: meta.color }]}>{timeText}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function renderEmptyState(message?: string) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Δεν υπάρχουν γεγονότα</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {message || 'Δημιουργήστε συμβόλαια για να εμφανιστούν στο ημερολόγιο'}
        </Text>
      </View>
    );
  }

  const agendaDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days: Array<{
      key: string;
      date: Date;
      eventCount: number;
      isCurrentMonth: boolean;
    }> = [];

    const createDay = (date: Date, isCurrentMonth: boolean) => {
      const key = format(date, 'yyyy-MM-dd');
      const eventCount = eventsByDate.get(key)?.length || 0;
      return { key, date, eventCount, isCurrentMonth };
    };

    const startWeekday = (getDay(start) + 6) % 7;
    for (let i = startWeekday; i > 0; i--) {
      const date = subDays(start, i);
      days.push(createDay(date, false));
    }

    let cursor = start;
    while (cursor.getTime() <= end.getTime()) {
      days.push(createDay(cursor, true));
      cursor = addDays(cursor, 1);
    }

    const targetCells = Math.max(42, Math.ceil(days.length / 7) * 7);
    let trailingDate = addDays(end, 1);
    while (days.length < targetCells) {
      days.push(createDay(trailingDate, false));
      trailingDate = addDays(trailingDate, 1);
    }

    return days;
  }, [eventsByDate, currentMonth]);

  const handleSelectDate = (date: Date, fromUser = false) => {
    if (!isSameDay(date, selectedDate)) {
      setSelectedDate(date);
    }

    if (fromUser) {
      const key = format(startOfDay(date), 'yyyy-MM-dd');
      const dayEvents = eventsByDate.get(key) || [];
      if (dayEvents.length > 0) {
        setDayModalVisible(true);
      } else {
        setDayModalVisible(false);
      }
    } else {
      setDayModalVisible(false);
    }
  };

  const handleDayPress = (day: { date: Date; isCurrentMonth: boolean }) => {
    if (!day.isCurrentMonth) {
      const nextMonth = startOfMonth(day.date);
      setCurrentMonth(nextMonth);
      setTimeout(() => handleSelectDate(day.date, true), 80);
    } else {
      handleSelectDate(day.date, true);
    }
  };

  useEffect(() => {
    if (dayModalVisible) {
      setDayModalMounted(true);
    }
  }, [dayModalVisible]);

  useEffect(() => {
    if (!dayModalMounted) {
      return;
    }

    if (dayModalVisible) {
      dayModalAnim.stopAnimation();
      dayModalAnim.setValue(0);
      Animated.timing(dayModalAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(dayModalAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setDayModalMounted(false);
        }
      });
    }
  }, [dayModalVisible, dayModalMounted, dayModalAnim]);

  const closeDayModal = () => setDayModalVisible(false);

  useEffect(() => {
    if (hasAutoSelected) return;

    const todayKey = format(today, 'yyyy-MM-dd');
    let targetDate: Date | null = null;

    if (eventsByDate.has(todayKey)) {
      targetDate = today;
    } else if (agendaDays.length > 0) {
      targetDate = agendaDays[0].date;
    }

    if (targetDate) {
      if (!isSameDay(targetDate, selectedDate)) {
        setSelectedDate(targetDate);
      }
      setHasAutoSelected(true);
      setDayModalVisible(false);
    }
  }, [eventsByDate, agendaDays, today, selectedDate, hasAutoSelected]);

  const selectedDayKey = format(startOfDay(selectedDate), 'yyyy-MM-dd');
  const selectedDayEvents = eventsByDate.get(selectedDayKey) || [];

  const upcomingEventsList = useMemo(() => {
    const list: Array<{ date: Date; events: CalendarEvent[] }> = [];
    eventsByDate.forEach((value, key) => {
      const dayDate = new Date(key);
      if (!isBefore(dayDate, today)) {
        list.push({ date: dayDate, events: value });
      }
    });
    list.sort((a, b) => a.date.getTime() - b.date.getTime());
    return list;
  }, [eventsByDate, today]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Breadcrumb 
        items={[
          { label: 'Αρχική', path: '/', icon: 'home' },
          { label: 'Ημερολόγιο' },
        ]}
      />
      
      <View style={styles.headerWrapper}>
        <SimpleGlassCard variant="ultraThin" style={styles.headerGlass}>
          <View style={styles.headerContent}>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, activeView === 'month' && styles.toggleButtonActive]}
                onPress={() => setActiveView('month')}
              >
                <Text style={[styles.toggleButtonText, activeView === 'month' && styles.toggleButtonTextActive]}>
                  Μήνας
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, activeView === 'agenda' && styles.toggleButtonActive]}
                onPress={() => setActiveView('agenda')}
              >
                <Text style={[styles.toggleButtonText, activeView === 'agenda' && styles.toggleButtonTextActive]}>
                  Επερχόμενα
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, activeView === 'vehicles' && styles.toggleButtonActive]}
                onPress={() => setActiveView('vehicles')}
              >
                <Text style={[styles.toggleButtonText, activeView === 'vehicles' && styles.toggleButtonTextActive]}>
                  Οχήματα
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SimpleGlassCard>
      </View>

      {loading && activeView !== 'vehicles' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : (
        <>
          {activeView === 'vehicles' ? (
            <VehicleCalendarGrid />
          ) : activeView === 'month' ? (
            <View style={styles.monthViewContainer}>
              <View style={styles.monthHeader}>
                <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, -1))}>
                  <Ionicons name="chevron-back" size={20} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                  {format(currentMonth, 'LLLL yyyy', { locale: el })}
                </Text>
                <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.dayNameRow}>
                {DAY_LABELS.map((label) => (
                  <Text key={label} style={styles.dayNameText}>
                    {label}
                  </Text>
                ))}
              </View>
              <View style={styles.dayGrid}>
                {agendaDays.map((day) => {
                  const isSelected = isSameDay(day.date, selectedDate);
                  const isToday = isSameDay(day.date, today);
                  const weekdayIndex = (getDay(day.date) + 6) % 7;
                  const labelColor = isSelected
                    ? '#ffffff'
                    : day.isCurrentMonth
                      ? Colors.text
                      : 'rgba(148, 163, 184, 0.95)';
                  const subLabelColor = isSelected
                    ? 'rgba(248, 250, 252, 0.9)'
                    : day.isCurrentMonth
                      ? 'rgba(71, 85, 105, 0.95)'
                      : 'rgba(148, 163, 184, 0.75)';
                  const dotCount = Math.min(day.eventCount, 3);
                  const extraDots = Math.max(day.eventCount - dotCount, 0);
                  return (
                    <TouchableOpacity
                      key={day.key}
                      style={[
                        styles.dayCell,
                        !day.isCurrentMonth && styles.dayCellMuted,
                      ]}
                      onPress={() => handleDayPress(day)}
                    >
                      <View
                        style={[
                          styles.dayCellInner,
                          !day.isCurrentMonth && styles.dayCellInnerMuted,
                          isSelected && styles.dayCellInnerSelected,
                          isToday && styles.dayCellInnerToday,
                        ]}
                      >
                        <Text style={[styles.dayCellLabel, { color: labelColor }]}>
                          {format(day.date, 'd')}
                        </Text>
                        <Text style={[styles.dayCellSubLabel, { color: subLabelColor }]}>
                          {DAY_LABELS[weekdayIndex]}
                        </Text>
                        <View style={styles.dayDotRow}>
                          {dotCount === 0 ? (
                            <View style={[styles.dayDot, styles.dayDotEmpty]} />
                          ) : (
                            <>
                              {Array.from({ length: dotCount }).map((_, idx) => (
                                <View
                                  key={idx}
                                  style={[
                                    styles.dayDot,
                                    isSelected ? styles.dayDotSelected : styles.dayDotFilled,
                                  ]}
                                />
                              ))}
                              {extraDots > 0 && (
                                <Text style={[styles.dayDotMore, isSelected && styles.dayDotMoreSelected]}>
                                  +{extraDots}
                                </Text>
                              )}
                            </>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              {...smoothScrollConfig}
            >
              {upcomingEventsList.length === 0 ? (
                renderEmptyState('Δεν υπάρχουν επερχόμενα γεγονότα')
          ) : (
                upcomingEventsList.map(group => (
                  <View key={format(group.date, 'yyyy-MM-dd')} style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      {format(group.date, 'EEEE d MMMM', { locale: el })}
                    </Text>
            <View style={styles.eventsList}>
                      {group.events.map(event => renderAgendaEvent(event, true))}
                    </View>
            </View>
                ))
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* Context-Aware Floating Action Button */}
      <ContextAwareFab
        onGenerateReport={() => {
          Alert.alert('Συνέχεια', 'Η λειτουργία δημιουργίας αναφοράς θα προστεθεί σύντομα');
        }}
        onExportData={() => {
          Alert.alert('Συνέχεια', 'Η λειτουργία εξαγωγής δεδομένων θα προστεθεί σύντομα');
        }}
        onScheduleReport={() => {
          Alert.alert('Συνέχεια', 'Η λειτουργία προγραμματισμού αναφορών θα προστεθεί σύντομα');
        }}
      />

      {dayModalMounted && (
        <Modal
          visible={dayModalMounted}
          animationType="none"
          transparent
          onRequestClose={closeDayModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeDayModal} />
            <Animated.View
              style={[
                styles.modalCard,
                {
                  opacity: dayModalAnim,
                  transform: [
                    {
                      translateY: dayModalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [60, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isSameDay(selectedDate, today) ? 'Σήμερα' : format(selectedDate, 'EEEE d MMMM', { locale: el })}
                </Text>
                <TouchableOpacity onPress={closeDayModal}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
                {selectedDayEvents.length === 0 ? (
                  <Text style={styles.modalEmpty}>Δεν υπάρχουν γεγονότα για αυτήν την ημέρα</Text>
                ) : (
                  selectedDayEvents.map(event => renderAgendaEvent(event))
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // Already iOS color
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Space for bottom tab bar and FAB
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.headline,
    color: Colors.text,
    fontWeight: '600',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  eventsList: {
    paddingHorizontal: Spacing.md,
  },
  agendaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  agendaCardCompact: {
    paddingVertical: Spacing.sm - 2,
  },
  agendaIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  agendaContent: {
    flex: 1,
  },
  agendaTitle: {
    ...Typography.footnote,
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  agendaTitleCompact: {
    fontSize: 11,
  },
  agendaSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  agendaLocation: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  agendaRight: {
    alignItems: 'flex-end',
    marginLeft: Spacing.sm,
  },
  agendaDate: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  agendaTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    gap: 4,
  },
  agendaTimeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedText: {
    fontSize: 16,
  },
  pendingText: {
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.title3,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  modalTitle: {
    ...Typography.title3,
    color: Colors.text,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  modalContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  modalEmpty: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  headerWrapper: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerGlass: {
    borderRadius: BorderRadius.xxxl,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs + 2,
    shadowColor: Colors.primary,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: BorderRadius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 4,
  },
  toggleButton: {
    paddingHorizontal: 16,
    borderRadius: BorderRadius.pill,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    shadowColor: Colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  toggleButtonText: {
    fontSize: 14,
    color: 'rgba(8, 47, 73, 0.55)',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthViewContainer: {
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    shadowColor: Colors.primary,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
  },
  monthTitle: {
    ...Typography.title3,
    color: Colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  dayNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  dayNameText: {
    flexBasis: '14.2857%',
    maxWidth: '14.2857%',
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  dayGrid: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    flexBasis: '14.2857%',
    maxWidth: '14.2857%',
    paddingHorizontal: 2,
    marginBottom: Spacing.sm,
  },
  dayCellMuted: {
    opacity: 0.75,
  },
  dayCellInner: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.backgroundSecondary,
    ...Shadows.xs,
  },
  dayCellInnerMuted: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dayCellInnerSelected: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  dayCellInnerToday: {
    borderWidth: 1.5,
    borderColor: Colors.primaryLight || '#93c5fd',
  },
  dayCellLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  dayCellSubLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dayDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    minHeight: 6,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
    backgroundColor: Colors.border,
  },
  dayDotEmpty: {
    opacity: 0.4,
  },
  dayDotFilled: {
    backgroundColor: Colors.secondary,
  },
  dayDotSelected: {
    backgroundColor: '#fff',
  },
  dayDotMore: {
    fontSize: 10,
    color: Colors.secondary,
    fontWeight: '600',
    marginLeft: 2,
  },
  dayDotMoreSelected: {
    color: '#fff',
  },
  daySummary: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  daySummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  daySummaryTitle: {
    ...Typography.subheadline,
    color: Colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  daySummaryAction: {
    ...Typography.caption1,
    color: Colors.primary,
    fontWeight: '600',
  },
  daySummaryEmpty: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  daySummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  daySummaryBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  daySummaryBadgeText: {
    color: '#fff',
    fontSize: 16,
  },
  daySummaryContent: {
    flex: 1,
  },
  daySummaryTitleText: {
    ...Typography.footnote,
    color: Colors.text,
    fontWeight: '600',
  },
  daySummarySubtitle: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
});
