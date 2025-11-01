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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Breadcrumb } from '../../components/breadcrumb';
import { SimpleGlassCard } from '../../components/glass-card';
import { Colors, Typography, Shadows, Glass } from '../../utils/design-system';
import { smoothScrollConfig } from '../../utils/animations';
import { VehicleService } from '../../services/vehicle.service';
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

  return (
    <View style={s.container}>
      <Breadcrumb 
        items={[
          { label: 'Αρχική', path: '/', icon: 'home' },
          { label: 'Στόλος' },
        ]}
      />

      <View style={s.topBar}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textSecondary} />
          <TextInput style={s.searchInput} placeholder="Αναζήτηση..." value={search} onChangeText={setSearch} />
        </View>
        
        {/* Grid Style Selector */}
        <View style={s.gridStyleSelector}>
          <Text style={s.gridStyleLabel}>Προβολή:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={s.gridStyleButtons}
            contentContainerStyle={s.gridStyleButtonsContent}
          >
            {([
              ['list', 'Λίστα', 'list-outline'],
              ['grid3', '3x', 'grid-outline'],
              ['grid4', '4x', 'grid-outline'],
              ['grid5', '5x', 'grid-outline']
            ] as const).map(([style, label, icon]) => (
              <TouchableOpacity 
                key={style} 
                style={[s.gridStyleBtn, gridStyle === style && s.gridStyleBtnActive]} 
                onPress={() => setGridStyle(style as GridStyle)}
              >
                <Ionicons 
                  name={icon as any} 
                  size={14} 
                  color={gridStyle === style ? '#fff' : Colors.textSecondary} 
                />
                <Text style={[s.gridStyleText, gridStyle === style && s.gridStyleTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={s.filters}
          contentContainerStyle={s.filtersContent}
        >
          {([['all', 'Ολα'], ['available', 'Διαθέσιμα'], ['rented', 'Ενοικιασμένα'], ['maintenance', 'Συντήρηση']] as const).map(([f, label]) => (
            <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterBtnActive]} onPress={() => setFilter(f)}>
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {label} ({f === 'all' ? vehicles.length : vehicles.filter(c => c.status === f).length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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

      {/* Sorting Bar */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={s.sortBar}
        contentContainerStyle={s.sortBarContent}
      >
        <Text style={s.sortLabel}>Ταξινόμηση:</Text>
        {([
          ['default', 'Προεπιλογή', 'swap-vertical'],
          ['urgent', 'Επείγοντα', 'warning'],
          ['kteo_due', 'KTEO Λήξη', 'calendar'],
          ['insurance_due', 'Ασφάλεια', 'shield'],
          ['tires_due', 'Λάστιχα Λήξη', 'ellipse'],
          ['tires_recent', 'Πρόσφατα Λάστιχα', 'time'],
          ['service_due', 'Σέρβις', 'construct'],
        ] as const).map(([sort, label, icon]) => (
          <TouchableOpacity
            key={sort}
            style={[s.sortBtn, sortBy === sort && s.sortBtnActive]}
            onPress={() => setSortBy(sort as SortOption)}
          >
            <Ionicons
              name={icon as any}
              size={14}
              color={sortBy === sort ? '#fff' : Colors.textSecondary}
            />
            <Text style={[s.sortText, sortBy === sort && s.sortTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
                style={[s.listCard, { width: config.cardWidth }]} 
                onPress={() => router.push(`/car-details?carId=${vehicle.id}`)}
                activeOpacity={0.7}
              >
                <View style={s.listRow}>
                  <View style={s.listLeft}>
                    <View style={s.listNameRow}>
                      <Text style={s.listName} numberOfLines={1}>{vehicle.make} {vehicle.model}</Text>
                      {vehicle.hasGps && (
                        <Ionicons name="location" size={14} color="#22D3EE" style={s.gpsIcon} />
                      )}
                      {hasUrgentMaintenance && (
                        <Ionicons name="warning" size={16} color="#FF9500" style={s.warningIcon} />
                      )}
                    </View>
                    <Text style={s.listDetail}>{vehicle.licensePlate} • {vehicle.year}</Text>
                    {vehicle.color && <Text style={s.listDetail}>Χρώμα: {vehicle.color}</Text>}
                    {vehicle.category && <Text style={s.listDetail}>Κατηγορία: {vehicle.category}</Text>}
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
              style={[s.gridCard, { width: config.cardWidth }]} 
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
                  <Text style={s.makeModel} numberOfLines={2}>
                    {vehicle.make} {vehicle.model}
                  </Text>
                  <Text style={s.plateNumber} numberOfLines={1}>
                    {vehicle.licensePlate}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => (
          <View style={s.empty}>
            <Ionicons name="car-outline" size={48} color={Colors.textSecondary} />
            <Text style={s.emptyText}>Δεν βρέθηκαν αυτοκίνητα</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { backgroundColor: '#fff', padding: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 8, height: 36, marginBottom: 8, gap: 6 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  
  // Grid Style Selector
  gridStyleSelector: { marginBottom: 8 },
  gridStyleLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  gridStyleButtons: {},
  gridStyleButtonsContent: { flexDirection: 'row', gap: 6 },
  gridStyleBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 16, 
    backgroundColor: '#f3f4f6', 
    marginRight: 6,
    gap: 4,
  },
  gridStyleBtnActive: { backgroundColor: Colors.primary },
  gridStyleText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  gridStyleTextActive: { color: '#fff' },
  
  filters: {},
  filtersContent: { flexDirection: 'row', gap: 6 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6', marginRight: 6 },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  
  // Sorting Bar
  sortBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sortBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 8,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 6,
    gap: 4,
  },
  sortBtnActive: {
    backgroundColor: Colors.primary,
  },
  sortText: {
    fontSize: 11,
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
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  availabilityToggleActive: {
    backgroundColor: Colors.primary,
  },
  availabilityToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  availabilityToggleTextActive: {
    color: '#fff',
  },
  clearAvailabilityButton: {
    padding: 4,
  },
  dateTimePickerContainer: {
    gap: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    minWidth: 70,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    gap: 4,
    flex: 1,
  },
  dateTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  
  list: { flex: 1, padding: CARD_MARGIN },
  listContent: { paddingBottom: 100 },
  
  // Grid View Styles
  gridCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    margin: CARD_MARGIN / 2,
    ...Shadows.sm 
  },
  gridCardContent: {
    padding: 8,
    height: 80,
    justifyContent: 'space-between',
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gpsIcon: {
    marginLeft: 2,
  },
  gridCardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  makeModel: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: Colors.text, 
    textAlign: 'center',
    lineHeight: 14,
  },
  plateNumber: { 
    fontSize: 10, 
    color: Colors.textSecondary, 
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
  deleteButton: { 
    padding: 2,
  },
  
  // List View Styles
  listCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginBottom: 8,
    ...Shadows.sm 
  },
  listRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 12,
  },
  listLeft: { 
    flex: 1, 
    marginRight: 8 
  },
  listName: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: Colors.text, 
    marginBottom: 2 
  },
  listDetail: { 
    fontSize: 12, 
    color: Colors.textSecondary, 
    marginBottom: 2 
  },
  listRight: { 
    alignItems: 'flex-end', 
    gap: 6 
  },
  listBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 10 
  },
  listBadgeText: { 
    fontSize: 10, 
    fontWeight: '700', 
    textTransform: 'uppercase' 
  },
  listDeleteButton: { 
    padding: 4 
  },
  listNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  warningIcon: {
    marginLeft: 6,
  },
  maintenanceIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  maintenanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 3,
  },
  maintenanceChipText: {
    fontSize: 9,
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
