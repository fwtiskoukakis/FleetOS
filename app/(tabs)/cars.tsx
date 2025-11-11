import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  TextInput,
  FlatList,
  Dimensions,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Breadcrumb } from '../../components/breadcrumb';
import { SimpleGlassCard } from '../../components/glass-card';
import { Colors, Typography, Shadows, Glass } from '../../utils/design-system';
import { smoothScrollConfig } from '../../utils/animations';
import { VehicleService } from '../../services/vehicle.service';
import { useThemeColors } from '../../contexts/theme-context';
import { Vehicle, VehicleStatus } from '../../models/vehicle.interface';
import { calculateExpiryUrgency, calculateServiceUrgency } from '../../utils/maintenance-urgency';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;

type GridStyle = 'list' | 'grid3' | 'grid4' | 'grid5';
type SortOption = 
  | 'default' 
  | 'urgent' 
  | 'kteo_due' 
  | 'insurance_due' 
  | 'tires_due' 
  | 'tires_recent' 
  | 'service_due';

const getGridConfig = (style: GridStyle) => {
  switch (style) {
    case 'list':
      return { numColumns: 1, cardWidth: width - (CARD_MARGIN * 2) };
    case 'grid3':
      return { numColumns: 3, cardWidth: (width - (CARD_MARGIN * 4)) / 3 };
    case 'grid4':
      return { numColumns: 4, cardWidth: (width - (CARD_MARGIN * 5)) / 4 };
    case 'grid5':
      return { numColumns: 5, cardWidth: (width - (CARD_MARGIN * 6)) / 5 };
    default:
      return { numColumns: 5, cardWidth: (width - (CARD_MARGIN * 6)) / 5 };
  }
};

export default function CarsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filtered, setFiltered] = useState<Vehicle[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'rented' | 'maintenance'>('all');
  const [gridStyle, setGridStyle] = useState<GridStyle>('grid5');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  
  // Date/Time pickers for availability filtering
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [pickupTime, setPickupTime] = useState<Date>(new Date());
  const [dropoffDate, setDropoffDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  });
  const [dropoffTime, setDropoffTime] = useState<Date>(new Date());
  const [showPickupDatePicker, setShowPickupDatePicker] = useState(false);
  const [showPickupTimePicker, setShowPickupTimePicker] = useState(false);
  const [showDropoffDatePicker, setShowDropoffDatePicker] = useState(false);
  const [showDropoffTimePicker, setShowDropoffTimePicker] = useState(false);
  const [filterByAvailability, setFilterByAvailability] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState<Set<string>>(new Set());
  
  // Dropdown modals
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  useEffect(() => {
    loadCars();
  }, []);

  useEffect(() => {
    if (filterByAvailability) {
      checkVehicleAvailability();
    } else {
      filterCars();
    }
  }, [vehicles, search, filter, sortBy, filterByAvailability, pickupDate, pickupTime, dropoffDate, dropoffTime]);

  // Check which vehicles are available during selected period
  async function checkVehicleAvailability() {
    if (!filterByAvailability) {
      filterCars();
      return;
    }

    try {
      // Combine date and time for pickup and dropoff
      const pickupDateTime = new Date(pickupDate);
      pickupDateTime.setHours(pickupTime.getHours(), pickupTime.getMinutes(), 0, 0);
      
      const dropoffDateTime = new Date(dropoffDate);
      dropoffDateTime.setHours(dropoffTime.getHours(), dropoffTime.getMinutes(), 0, 0);

      // Get all active contracts that might overlap
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('car_license_plate, pickup_date, pickup_time, dropoff_date, dropoff_time, status')
        .in('status', ['active', 'upcoming']);

      if (error) {
        console.error('Error fetching contracts for availability:', error);
        filterCars();
        return;
      }

      // Check each vehicle for conflicts
      const available = new Set<string>();
      
      for (const vehicle of vehicles) {
        // Skip maintenance vehicles
        if (vehicle.status === 'maintenance') {
          continue;
        }

        // Check if vehicle has overlapping contracts
        const hasConflict = contracts?.some(contract => {
          if (contract.car_license_plate?.toUpperCase() !== vehicle.licensePlate.toUpperCase()) {
            return false;
          }

          // Parse contract dates/times
          const contractPickup = new Date(contract.pickup_date);
          const [pickupH, pickupM] = (contract.pickup_time || '00:00').split(':');
          contractPickup.setHours(parseInt(pickupH) || 0, parseInt(pickupM) || 0, 0, 0);

          const contractDropoff = new Date(contract.dropoff_date);
          const [dropoffH, dropoffM] = (contract.dropoff_time || '23:59').split(':');
          contractDropoff.setHours(parseInt(dropoffH) || 23, parseInt(dropoffM) || 59, 0, 0);

          // Check for overlap: user pickup < contract dropoff AND user dropoff > contract pickup
          return pickupDateTime < contractDropoff && dropoffDateTime > contractPickup;
        });

        if (!hasConflict) {
          available.add(vehicle.id);
        }
      }

      setAvailableVehicles(available);
      filterCars();
    } catch (error) {
      console.error('Error checking vehicle availability:', error);
      filterCars();
    }
  }

  async function loadCars() {
    try {
      // First sync all vehicles from contracts to ensure none are missing
      try {
        await VehicleService.syncAllVehiclesFromContracts();
      } catch (syncError) {
        console.error('Error syncing vehicles from contracts:', syncError);
        // Continue loading even if sync fails
      }
      
      // Then load all vehicles
      const data = await VehicleService.getAllVehiclesWithUpdatedAvailability();
      setVehicles(data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης οχημάτων');
    }
  }

  async function deleteVehicle(vehicle: Vehicle) {
    Alert.alert(
      'Επιβεβαίωση Διαγραφής',
      `Είστε σίγουροι ότι θέλετε να διαγράψετε το όχημα "${vehicle.make} ${vehicle.model}" (${vehicle.licensePlate});`,
      [
        { text: 'Ακύρωση', style: 'cancel' },
        {
          text: 'Διαγραφή',
          style: 'destructive',
          onPress: async () => {
            try {
              await VehicleService.deleteVehicle(vehicle.id);
              Alert.alert('Επιτυχία', 'Το όχημα διαγράφηκε επιτυχώς.');
              loadCars();
            } catch (error) {
              console.error('Error deleting vehicle:', error);
              Alert.alert('Σφάλμα', 'Αποτυχία διαγραφής οχήματος.');
            }
          }
        }
      ]
    );
  }

  function getMostUrgentMaintenance(vehicle: Vehicle): { priority: number; label: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const urgencies: Array<{ date: Date | null; priority: number; label: string }> = [];
    
    if (vehicle.kteoExpiryDate) {
      const days = Math.floor((vehicle.kteoExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      urgencies.push({ date: vehicle.kteoExpiryDate, priority: days < 0 ? 0 : days, label: 'KTEO' });
    }
    
    if (vehicle.insuranceExpiryDate) {
      const days = Math.floor((vehicle.insuranceExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      urgencies.push({ date: vehicle.insuranceExpiryDate, priority: days < 0 ? 0 : days, label: 'Ασφάλεια' });
    }
    
    if (vehicle.tiresNextChangeDate) {
      const days = Math.floor((vehicle.tiresNextChangeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      urgencies.push({ date: vehicle.tiresNextChangeDate, priority: days < 0 ? 0 : days, label: 'Λάστιχα' });
    }
    
    if (vehicle.nextServiceMileage && vehicle.currentMileage) {
      const km = vehicle.nextServiceMileage - vehicle.currentMileage;
      urgencies.push({ date: null, priority: km < 0 ? 0 : km, label: 'Σέρβις' });
    }
    
    if (urgencies.length === 0) {
      return { priority: 9999, label: 'OK' };
    }
    
    urgencies.sort((a, b) => a.priority - b.priority);
    return urgencies[0];
  }

  function filterCars() {
    let result = vehicles;
    
    // Apply availability filter if enabled
    if (filterByAvailability && availableVehicles.size > 0) {
      result = result.filter(v => availableVehicles.has(v.id));
    }
    
    // Apply status filter
    if (filter === 'available') result = result.filter(v => v.status === 'available');
    if (filter === 'rented') result = result.filter(v => v.status === 'rented');
    if (filter === 'maintenance') result = result.filter(v => v.status === 'maintenance');
    
    // Apply search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.licensePlate.toLowerCase().includes(q)
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'kteo_due':
        result.sort((a, b) => {
          if (!a.kteoExpiryDate && !b.kteoExpiryDate) return 0;
          if (!a.kteoExpiryDate) return 1;
          if (!b.kteoExpiryDate) return -1;
          return a.kteoExpiryDate.getTime() - b.kteoExpiryDate.getTime();
        });
        break;
      case 'insurance_due':
        result.sort((a, b) => {
          if (!a.insuranceExpiryDate && !b.insuranceExpiryDate) return 0;
          if (!a.insuranceExpiryDate) return 1;
          if (!b.insuranceExpiryDate) return -1;
          return a.insuranceExpiryDate.getTime() - b.insuranceExpiryDate.getTime();
        });
        break;
      case 'tires_due':
        result.sort((a, b) => {
          if (!a.tiresNextChangeDate && !b.tiresNextChangeDate) return 0;
          if (!a.tiresNextChangeDate) return 1;
          if (!b.tiresNextChangeDate) return -1;
          return a.tiresNextChangeDate.getTime() - b.tiresNextChangeDate.getTime();
        });
        break;
      case 'tires_recent':
        result.sort((a, b) => {
          const aDate = a.tiresFrontDate || a.tiresRearDate;
          const bDate = b.tiresFrontDate || b.tiresRearDate;
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return bDate.getTime() - aDate.getTime(); // Most recent first
        });
        break;
      case 'service_due':
        result.sort((a, b) => {
          if (!a.nextServiceMileage && !b.nextServiceMileage) return 0;
          if (!a.nextServiceMileage) return 1;
          if (!b.nextServiceMileage) return -1;
          return a.nextServiceMileage - b.nextServiceMileage;
        });
        break;
      case 'urgent':
        // Sort by most urgent maintenance item
        result.sort((a, b) => {
          const aUrgency = getMostUrgentMaintenance(a);
          const bUrgency = getMostUrgentMaintenance(b);
          return aUrgency.priority - bUrgency.priority;
        });
        break;
      default:
        // Default: sort by license plate
        result.sort((a, b) => a.licensePlate.localeCompare(b.licensePlate));
    }
    
    setFiltered(result);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCars();
    setRefreshing(false);
  };

  function getViewLabel(style: GridStyle): string {
    switch (style) {
      case 'list': return 'List';
      case 'grid3': return '3x';
      case 'grid4': return '4x';
      case 'grid5': return '5x';
      default: return 'List';
    }
  }

  function getSortLabel(option: SortOption): string {
    switch (option) {
      case 'default': return 'Default';
      case 'urgent': return 'Urgent';
      case 'kteo_due': return 'KTEO';
      case 'insurance_due': return 'Insurance';
      case 'tires_due': return 'Tires Due';
      case 'tires_recent': return 'Recent Tires';
      case 'service_due': return 'Service';
      default: return 'Default';
    }
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <Breadcrumb 
        items={[
          { label: 'Αρχική', path: '/', icon: 'home' },
          { label: 'Στόλος' },
        ]}
      />

      {/* Single Row Header */}
      <View style={s.compactHeader}>
        {/* Status Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={s.filtersCompact}
          contentContainerStyle={s.filtersCompactContent}
        >
          {([['all', 'All'], ['available', 'Available'], ['rented', 'Rented'], ['maintenance', 'Maintenance']] as const).map(([f, label]) => (
            <TouchableOpacity 
              key={f} 
              style={[s.filterBtnCompact, filter === f && s.filterBtnCompactActive, filter !== f && { backgroundColor: colors.card }]} 
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterTextCompact, filter === f && s.filterTextCompactActive, filter !== f && { color: colors.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* View & Sort Dropdowns */}
        <View style={s.dropdownsRow}>
          <TouchableOpacity 
            style={[s.dropdownBtnCompact, { backgroundColor: colors.card }]}
            onPress={() => setShowViewDropdown(true)}
          >
            <Text style={[s.dropdownTextCompact, { color: colors.text }]}>{getViewLabel(gridStyle)}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.dropdownBtnCompact, { backgroundColor: colors.card }]}
            onPress={() => setShowSortDropdown(true)}
          >
            <Text style={[s.dropdownTextCompact, { color: colors.text }]}>{getSortLabel(sortBy)}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar - Separate Row */}
      <View style={s.searchRow}>
        <View style={[s.searchBoxCompact, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput 
            style={[s.searchInputCompact, { color: colors.text }]} 
            placeholder="Search..." 
            value={search} 
            onChangeText={setSearch}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {/* Availability Filter Section */}
      <View style={s.availabilitySection}>
        <View style={s.availabilityHeader}>
          <TouchableOpacity
            style={[s.availabilityToggle, filterByAvailability && s.availabilityToggleActive]}
            onPress={() => setFilterByAvailability(!filterByAvailability)}
          >
            <Ionicons 
              name={filterByAvailability ? "checkmark-circle" : "checkmark-circle-outline"} 
              size={18} 
              color={filterByAvailability ? '#fff' : Colors.textSecondary} 
            />
            <Text style={[s.availabilityToggleText, filterByAvailability && s.availabilityToggleTextActive]}>
              Φίλτρο Διαθεσιμότητας
            </Text>
          </TouchableOpacity>
          {filterByAvailability && (
            <TouchableOpacity
              style={s.clearAvailabilityButton}
              onPress={() => {
                setFilterByAvailability(false);
                setAvailableVehicles(new Set());
              }}
            >
              <Ionicons name="close-circle" size={18} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
        
        {filterByAvailability && (
          <View style={s.dateTimePickerContainer}>
            {/* Pickup Date/Time */}
            <View style={s.dateTimeRow}>
              <Text style={s.dateTimeLabel}>Ανάληψη:</Text>
              <TouchableOpacity 
                style={s.dateTimeButton}
                onPress={() => setShowPickupDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                <Text style={s.dateTimeText}>
                  {pickupDate.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={s.dateTimeButton}
                onPress={() => setShowPickupTimePicker(true)}
              >
                <Ionicons name="time-outline" size={16} color={Colors.primary} />
                <Text style={s.dateTimeText}>
                  {pickupTime.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Dropoff Date/Time */}
            <View style={s.dateTimeRow}>
              <Text style={s.dateTimeLabel}>Επιστροφή:</Text>
              <TouchableOpacity 
                style={s.dateTimeButton}
                onPress={() => setShowDropoffDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                <Text style={s.dateTimeText}>
                  {dropoffDate.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={s.dateTimeButton}
                onPress={() => setShowDropoffTimePicker(true)}
              >
                <Ionicons name="time-outline" size={16} color={Colors.primary} />
                <Text style={s.dateTimeText}>
                  {dropoffTime.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* View Dropdown Modal */}
      <Modal
        visible={showViewDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowViewDropdown(false)}
      >
        <Pressable style={s.dropdownOverlay} onPress={() => setShowViewDropdown(false)}>
          <View style={[s.dropdownContent, { backgroundColor: colors.card }]}>
            {[
              ['list', 'List', 'list-outline'],
              ['grid3', '3 Columns', 'grid-outline'],
              ['grid4', '4 Columns', 'grid-outline'],
              ['grid5', '5 Columns', 'grid-outline'],
            ].map(([style, label, icon]) => (
              <TouchableOpacity
                key={style}
                style={[s.dropdownOption, gridStyle === style && s.dropdownOptionActive]}
                onPress={() => {
                  setGridStyle(style as GridStyle);
                  setShowViewDropdown(false);
                }}
              >
                <Ionicons
                  name={icon as any}
                  size={18}
                  color={gridStyle === style ? colors.primary : colors.textSecondary}
                />
                <Text style={[s.dropdownOptionText, gridStyle === style && s.dropdownOptionTextActive, gridStyle !== style && { color: colors.textSecondary }]}>
                  {label}
                </Text>
                {gridStyle === style && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Sort Dropdown Modal */}
      <Modal
        visible={showSortDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortDropdown(false)}
      >
        <Pressable style={s.dropdownOverlay} onPress={() => setShowSortDropdown(false)}>
          <View style={s.dropdownContent}>
            {[
              ['default', 'Default', 'swap-vertical'],
              ['urgent', 'Most Urgent', 'warning'],
              ['kteo_due', 'KTEO Due', 'calendar'],
              ['insurance_due', 'Insurance Due', 'shield'],
              ['tires_due', 'Tires Due', 'ellipse'],
              ['tires_recent', 'Recent Tires', 'time'],
              ['service_due', 'Service Due', 'construct'],
            ].map(([sort, label, icon]) => (
              <TouchableOpacity
                key={sort}
                style={[s.dropdownOption, sortBy === sort && s.dropdownOptionActive]}
                onPress={() => {
                  setSortBy(sort as SortOption);
                  setShowSortDropdown(false);
                }}
              >
                <Ionicons
                  name={icon as any}
                  size={18}
                  color={sortBy === sort ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[s.dropdownOptionText, sortBy === sort && s.dropdownOptionTextActive]}>
                  {label}
                </Text>
                {sortBy === sort && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Date/Time Pickers */}
      {showPickupDatePicker && (
        <DateTimePicker
          value={pickupDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowPickupDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setPickupDate(selectedDate);
              if (selectedDate > dropoffDate) {
                const newDropoff = new Date(selectedDate);
                newDropoff.setDate(newDropoff.getDate() + 1);
                setDropoffDate(newDropoff);
              }
            }
          }}
          minimumDate={new Date()}
        />
      )}
      {showPickupTimePicker && (
        <DateTimePicker
          value={pickupTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            setShowPickupTimePicker(Platform.OS === 'ios');
            if (selectedTime) {
              setPickupTime(selectedTime);
            }
          }}
        />
      )}
      {showDropoffDatePicker && (
        <DateTimePicker
          value={dropoffDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDropoffDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              if (selectedDate < pickupDate) {
                Alert.alert('Σφάλμα', 'Η ημερομηνία επιστροφής πρέπει να είναι μετά την ανάληψη');
                return;
              }
              setDropoffDate(selectedDate);
            }
          }}
          minimumDate={pickupDate}
        />
      )}
      {showDropoffTimePicker && (
        <DateTimePicker
          value={dropoffTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            setShowDropoffTimePicker(Platform.OS === 'ios');
            if (selectedTime) {
              setDropoffTime(selectedTime);
            }
          }}
        />
      )}

      <FlatList
        key={gridStyle} // Force re-render when grid style changes
        data={filtered}
        numColumns={getGridConfig(gridStyle).numColumns}
        keyExtractor={(item) => item.id}
        style={s.list}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item: vehicle }) => {
          const config = getGridConfig(gridStyle);
          
          // Debug logging for status
          if (vehicle.licensePlate === 'BMZ1133') {
            console.log(`🔍 DEBUG BMZ1133: status=${vehicle.status}, plate=${vehicle.licensePlate}`);
            console.log(`🔍 DEBUG BMZ1133: getStatusColor result=${getStatusColor(vehicle.status)}`);
          }
          
          // Use the same color logic as vehicle details page
          function getStatusColor(status: string): string {
            switch (status) {
              case 'available': return Colors.success;
              case 'rented': return Colors.primary;
              case 'maintenance': return Colors.warning;
              case 'retired': return Colors.textSecondary;
              default: return Colors.textSecondary;
            }
          }
          
          if (gridStyle === 'list') {
            // Calculate maintenance urgencies
            const kteoUrgency = calculateExpiryUrgency(vehicle.kteoExpiryDate);
            const tiresUrgency = calculateExpiryUrgency(vehicle.tiresNextChangeDate);
            const insuranceUrgency = calculateExpiryUrgency(vehicle.insuranceExpiryDate);
            const serviceUrgency = calculateServiceUrgency(vehicle.currentMileage, vehicle.nextServiceMileage);
            const hasUrgentMaintenance = [kteoUrgency, tiresUrgency, insuranceUrgency, serviceUrgency]
              .some(u => u.level === 'expired' || u.level === 'critical' || u.level === 'warning');
            
            return (
              <TouchableOpacity 
                style={[s.listCard, { width: config.cardWidth, backgroundColor: colors.card }]} 
                onPress={() => router.push(`/car-details?carId=${vehicle.id}`)}
                activeOpacity={0.7}
              >
                <View style={s.listRow}>
                  <View style={s.listLeft}>
                    <View style={s.listNameRow}>
                      <Text style={[s.listName, { color: colors.text }]} numberOfLines={1}>{vehicle.make} {vehicle.model}</Text>
                      {vehicle.hasGps && (
                        <Ionicons name="location" size={14} color="#22D3EE" style={s.gpsIcon} />
                      )}
                      {hasUrgentMaintenance && (
                        <Ionicons name="warning" size={16} color="#FF9500" style={s.warningIcon} />
                      )}
                    </View>
                    <Text style={[s.listDetail, { color: colors.textSecondary }]}>{vehicle.licensePlate} • {vehicle.year}</Text>
                    {vehicle.color && <Text style={[s.listDetail, { color: colors.textSecondary }]}>Χρώμα: {vehicle.color}</Text>}
                    {vehicle.category && <Text style={[s.listDetail, { color: colors.textSecondary }]}>Κατηγορία: {vehicle.category}</Text>}
                    {hasUrgentMaintenance && (
                      <View style={s.maintenanceIndicators}>
                        {(kteoUrgency.level === 'expired' || kteoUrgency.level === 'critical' || kteoUrgency.level === 'warning') && (
                          <View style={s.maintenanceChip}>
                            <Ionicons name="checkmark-circle" size={12} color={kteoUrgency.color} />
                            <Text style={[s.maintenanceChipText, { color: kteoUrgency.color }]}>KTEO</Text>
                          </View>
                        )}
                        {(insuranceUrgency.level === 'expired' || insuranceUrgency.level === 'critical' || insuranceUrgency.level === 'warning') && (
                          <View style={s.maintenanceChip}>
                            <Ionicons name="shield-checkmark" size={12} color={insuranceUrgency.color} />
                            <Text style={[s.maintenanceChipText, { color: insuranceUrgency.color }]}>Ασφάλεια</Text>
                          </View>
                        )}
                        {(tiresUrgency.level === 'expired' || tiresUrgency.level === 'critical' || tiresUrgency.level === 'warning') && (
                          <View style={s.maintenanceChip}>
                            <Ionicons name="ellipse" size={12} color={tiresUrgency.color} />
                            <Text style={[s.maintenanceChipText, { color: tiresUrgency.color }]}>Λάστιχα</Text>
                          </View>
                        )}
                        {(serviceUrgency.level === 'expired' || serviceUrgency.level === 'critical' || serviceUrgency.level === 'warning') && (
                          <View style={s.maintenanceChip}>
                            <Ionicons name="construct" size={12} color={serviceUrgency.color} />
                            <Text style={[s.maintenanceChipText, { color: serviceUrgency.color }]}>Σέρβις</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={s.listRight}>
                    <View style={[s.listBadge, { backgroundColor: getStatusColor(vehicle.status) + '15' }]}>
                      <Text style={[s.listBadgeText, { color: getStatusColor(vehicle.status) }]}>
                        {vehicle.status === 'available' ? 'Διαθέσιμο' : vehicle.status === 'rented' ? 'Ενοικιασμένο' : 'Συντήρηση'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={s.listDeleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        deleteVehicle(vehicle);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }
          
          return (
            <TouchableOpacity 
              style={[s.gridCard, { width: config.cardWidth, backgroundColor: colors.card }]} 
              onPress={() => router.push(`/car-details?carId=${vehicle.id}`)}
              activeOpacity={0.7}
            >
              <View style={s.gridCardContent}>
                <View style={s.gridCardHeader}>
                  <View style={s.gridCardHeaderLeft}>
                    <View style={[s.statusDot, { backgroundColor: getStatusColor(vehicle.status) }]} />
                    {vehicle.hasGps && (
                      <Ionicons name="location" size={10} color="#22D3EE" style={s.gpsIcon} />
                    )}
                  </View>
                  <TouchableOpacity
                    style={s.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteVehicle(vehicle);
                    }}
                  >
                    <Ionicons name="trash-outline" size={12} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                <View style={s.gridCardBody}>
                  <Text style={[s.makeModel, { color: colors.text }]} numberOfLines={2}>
                    {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={[s.plateNumber, { color: colors.textSecondary }]} numberOfLines={1}>
                    {vehicle.licensePlate}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => (
          <View style={s.empty}>
            <Ionicons name="car-outline" size={48} color={colors.textSecondary} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>Δεν βρέθηκαν αυτοκίνητα</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  
  // Compact Header (Single Row)
  compactHeader: { 
    backgroundColor: '#fff', 
    paddingHorizontal: 6, 
    paddingVertical: 6, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchRow: {
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBoxCompact: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f3f4f6', 
    borderRadius: 8, 
    paddingHorizontal: 8, 
    height: 32,
    gap: 6,
  },
  searchInputCompact: { 
    flex: 1, 
    fontSize: 13, 
    color: Colors.text,
    fontWeight: '500',
  },
  filtersCompact: {
    flex: 1,
  },
  filtersCompactContent: { 
    flexDirection: 'row', 
    gap: 4,
  },
  filterBtnCompact: { 
    paddingHorizontal: 8, 
    paddingVertical: 5, 
    borderRadius: 8, 
    backgroundColor: '#f3f4f6',
  },
  filterBtnCompactActive: { 
    backgroundColor: Colors.primary,
  },
  filterTextCompact: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: Colors.textSecondary,
  },
  filterTextCompactActive: { 
    color: '#fff',
  },
  dropdownsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dropdownBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 3,
  },
  dropdownTextCompact: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 4,
  },
  dropdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  
  // Dropdown Modals
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    maxWidth: width * 0.8,
    ...Shadows.lg,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dropdownOptionActive: {
    backgroundColor: '#f3f4f6',
  },
  dropdownOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  dropdownOptionTextActive: {
    fontWeight: '600',
    color: Colors.primary,
  },
  
  // Legacy styles (kept for reference but not used)
  topBar: { backgroundColor: '#fff', padding: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 8, height: 36, marginBottom: 6, gap: 6 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  
  // Grid Style Selector
  gridStyleSelector: { marginBottom: 4 },
  gridStyleLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  gridStyleButtons: {},
  gridStyleButtonsContent: { flexDirection: 'row', gap: 4 },
  gridStyleBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 14, 
    backgroundColor: '#f3f4f6', 
    marginRight: 4,
    gap: 3,
  },
  gridStyleBtnActive: { backgroundColor: Colors.primary },
  gridStyleText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  gridStyleTextActive: { color: '#fff' },
  
  filters: {},
  filtersContent: { flexDirection: 'row', gap: 4 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: '#f3f4f6', marginRight: 4 },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  
  // Sorting Bar - Inline version
  sortBarInline: {
    marginTop: 4,
  },
  sortBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sortBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    marginRight: 4,
    gap: 3,
  },
  sortBtnActive: {
    backgroundColor: Colors.primary,
  },
  sortText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sortTextActive: {
    color: '#fff',
  },
  
  // Availability Filter Section
  availabilitySection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    gap: 5,
  },
  availabilityToggleActive: {
    backgroundColor: Colors.primary,
  },
  availabilityToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  availabilityToggleTextActive: {
    color: '#fff',
  },
  clearAvailabilityButton: {
    padding: 3,
  },
  dateTimePickerContainer: {
    gap: 6,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    minWidth: 65,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    gap: 3,
    flex: 1,
  },
  dateTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  
  list: { flex: 1, padding: 6 },
  listContent: { paddingBottom: 100 },
  
  // Grid View Styles
  gridCard: { 
    backgroundColor: '#fff', 
    borderRadius: 10, 
    margin: 4,
    ...Shadows.sm 
  },
  gridCardContent: {
    padding: 6,
    height: 70,
    justifyContent: 'space-between',
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  gridCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gpsIcon: {
    marginLeft: 2,
  },
  gridCardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  makeModel: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: Colors.text, 
    textAlign: 'center',
    lineHeight: 13,
  },
  plateNumber: { 
    fontSize: 9, 
    color: Colors.textSecondary, 
    textAlign: 'center',
    marginTop: 1,
    fontWeight: '600',
  },
  deleteButton: { 
    padding: 2,
  },
  
  // List View Styles
  listCard: { 
    backgroundColor: '#fff', 
    borderRadius: 10, 
    marginBottom: 6,
    ...Shadows.sm 
  },
  listRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 10,
  },
  listLeft: { 
    flex: 1, 
    marginRight: 8 
  },
  listName: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: Colors.text, 
    marginBottom: 1 
  },
  listDetail: { 
    fontSize: 11, 
    color: Colors.textSecondary, 
    marginBottom: 1 
  },
  listRight: { 
    alignItems: 'flex-end', 
    gap: 4 
  },
  listBadge: { 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 8 
  },
  listBadgeText: { 
    fontSize: 9, 
    fontWeight: '700', 
    textTransform: 'uppercase' 
  },
  listDeleteButton: { 
    padding: 3 
  },
  listNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  warningIcon: {
    marginLeft: 4,
  },
  maintenanceIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 4,
  },
  maintenanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    gap: 2,
  },
  maintenanceChipText: {
    fontSize: 8,
    fontWeight: '600',
  },
  
  empty: { 
    alignItems: 'center', 
    paddingVertical: 48,
    width: '100%',
  },
  emptyText: { 
    fontSize: 14, 
    color: Colors.textSecondary, 
    marginTop: 12 
  },
});
