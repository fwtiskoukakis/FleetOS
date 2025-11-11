import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
  Dimensions,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Contract } from '../../models/contract.interface';
import { SupabaseContractService } from '../../services/supabase-contract.service';
import { supabase } from '../../utils/supabase';
import { ContextAwareFab } from '../../components/context-aware-fab';
import { SimpleGlassCard } from '../../components/glass-card';
import { Colors, Typography, Spacing, Shadows, BorderRadius, Glass } from '../../utils/design-system';
import { smoothScrollConfig } from '../../utils/animations';
import { getAADEStatusMessage } from '../../utils/aade-contract-helper';
import { FleetOSIcon } from '../../components/fleetos-logo';
import { VehicleService } from '../../services/vehicle.service';
import { Vehicle } from '../../models/vehicle.interface';
import { calculateExpiryUrgency, calculateServiceUrgency } from '../../utils/maintenance-urgency';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, format, isSameDay, addDays, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { useThemeColors } from '../../contexts/theme-context';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  upcomingContracts: number;
  totalRevenue: number;
  revenueThisMonth: number;
  avgRentalDays: number;
}

interface FleetAvailability {
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
  urgentMaintenanceCount: number;
}

interface MaintenanceAlert {
  vehicleId: string;
  vehicleName: string;
  alertType: 'kteo' | 'insurance' | 'tires' | 'service';
  urgency: {
    level: 'expired' | 'critical' | 'warning' | 'soon' | 'ok';
    color: string;
    label: string;
  };
}

interface ActivityEvent {
  id: string;
  type: 'pickup' | 'return';
  contractId: string;
  vehicleName: string;
  customerName: string;
  time: string;
  date: Date;
  location: string;
}

type ActivityView = 'today' | 'week';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed' | 'upcoming'>('all');
  const [activityView, setActivityView] = useState<ActivityView>('today');
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
  const [todayActivities, setTodayActivities] = useState<ActivityEvent[]>([]);
  const [weekActivities, setWeekActivities] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalContracts: 0,
    activeContracts: 0,
    completedContracts: 0,
    upcomingContracts: 0,
    totalRevenue: 0,
    revenueThisMonth: 0,
    avgRentalDays: 0,
  });
  const [fleetAvailability, setFleetAvailability] = useState<FleetAvailability>({
    totalVehicles: 0,
    availableVehicles: 0,
    rentedVehicles: 0,
    maintenanceVehicles: 0,
    urgentMaintenanceCount: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    filterContracts();
  }, [contracts, searchQuery, activeFilter]);

  async function loadDashboardData() {
    setLoadingDashboard(true);
    try {
      // Load all data in parallel
      const [loadedContracts, loadedVehicles] = await Promise.all([
        loadContracts(),
        VehicleService.getAllVehicles(),
      ]);

      // Calculate all dashboard metrics
      await Promise.all([
        calculateFleetStats(loadedVehicles),
        loadActivityData(),
      ]);

      setLoadingDashboard(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoadingDashboard(false);
    }
  }

  async function loadContracts() {
    try {
      const loadedContracts = await SupabaseContractService.getAllContracts();
      
      // Add example AADE status to first two contracts for demonstration
      const contractsWithAADE = loadedContracts.map((contract, index) => {
        if (index === 0) {
          return { ...contract, aadeStatus: 'submitted' as const, aadeDclId: 123456 };
        } else if (index === 1) {
          return { ...contract, aadeStatus: 'completed' as const, aadeDclId: 789012 };
        }
        return contract;
      });
      
      setContracts(contractsWithAADE);
      calculateStats(contractsWithAADE);
      return contractsWithAADE;
    } catch (error) {
      console.error('Error loading contracts:', error);
      Alert.alert('Σφάλμα', 'Αποτυχία φόρτωσης συμβολαίων');
      return [];
    }
  }

  async function calculateFleetStats(vehicles: Vehicle[]) {
    setVehicles(vehicles);

    // Calculate fleet availability
    const total = vehicles.length;
    const available = vehicles.filter(v => v.status === 'available').length;
    const rented = vehicles.filter(v => v.status === 'rented').length;
    const maintenance = vehicles.filter(v => v.status === 'maintenance').length;

    // Calculate maintenance alerts
    const alerts: MaintenanceAlert[] = [];
    vehicles.forEach(vehicle => {
      const vehicleName = `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`;
      
      // Check KTEO
      const kteoUrgency = calculateExpiryUrgency(vehicle.kteoExpiryDate);
      if (kteoUrgency.level !== 'ok') {
        alerts.push({
          vehicleId: vehicle.id,
          vehicleName,
          alertType: 'kteo',
          urgency: kteoUrgency,
        });
      }

      // Check Insurance
      const insuranceUrgency = calculateExpiryUrgency(vehicle.insuranceExpiryDate);
      if (insuranceUrgency.level !== 'ok') {
        alerts.push({
          vehicleId: vehicle.id,
          vehicleName,
          alertType: 'insurance',
          urgency: insuranceUrgency,
        });
      }

      // Check Tires
      const tiresUrgency = calculateExpiryUrgency(vehicle.tiresNextChangeDate);
      if (tiresUrgency.level !== 'ok') {
        alerts.push({
          vehicleId: vehicle.id,
          vehicleName,
          alertType: 'tires',
          urgency: tiresUrgency,
        });
      }

      // Check Service
      if (vehicle.nextServiceMileage && vehicle.currentMileage) {
        const serviceUrgency = calculateServiceUrgency(vehicle.currentMileage, vehicle.nextServiceMileage);
        if (serviceUrgency.level !== 'ok') {
          alerts.push({
            vehicleId: vehicle.id,
            vehicleName,
            alertType: 'service',
            urgency: serviceUrgency,
          });
        }
      }
    });

    // Sort alerts by urgency
    const urgencyOrder = { expired: 0, critical: 1, warning: 2, soon: 3, ok: 4 };
    alerts.sort((a, b) => urgencyOrder[a.urgency.level] - urgencyOrder[b.urgency.level]);

    setMaintenanceAlerts(alerts.slice(0, 5)); // Show top 5 most urgent
    setFleetAvailability({
      totalVehicles: total,
      availableVehicles: available,
      rentedVehicles: rented,
      maintenanceVehicles: maintenance,
      urgentMaintenanceCount: alerts.filter(a => a.urgency.level === 'expired' || a.urgency.level === 'critical').length,
    });
  }

  async function loadActivityData() {
    const today = startOfDay(new Date()); // Ensure we're comparing dates only
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    try {
      // Get today's activities - query all recent contracts to catch overlapping rentals
      const allContracts = await SupabaseContractService.getAllContracts();
      
      const todayEvents: ActivityEvent[] = [];
      allContracts.forEach(contract => {
        const pickupDate = new Date(contract.rentalPeriod.pickupDate);
        const dropoffDate = new Date(contract.rentalPeriod.dropoffDate);
        
        // Format time as HH:mm (remove seconds if present)
        const pickupTime = contract.rentalPeriod.pickupTime?.split(':').slice(0, 2).join(':') || '00:00';
        const dropoffTime = contract.rentalPeriod.dropoffTime?.split(':').slice(0, 2).join(':') || '00:00';
        
        if (isSameDay(pickupDate, today)) {
          todayEvents.push({
            id: `${contract.id}-pickup`,
            type: 'pickup',
            contractId: contract.id,
            vehicleName: contract.carInfo.makeModel,
            customerName: contract.renterInfo.fullName,
            time: pickupTime,
            date: pickupDate,
            location: contract.rentalPeriod.pickupLocation,
          });
        }
        
        if (isSameDay(dropoffDate, today)) {
          todayEvents.push({
            id: `${contract.id}-return`,
            type: 'return',
            contractId: contract.id,
            vehicleName: contract.carInfo.makeModel,
            customerName: contract.renterInfo.fullName,
            time: dropoffTime,
            date: dropoffDate,
            location: contract.rentalPeriod.dropoffLocation,
          });
        }
      });

      // Sort by time
      todayEvents.sort((a, b) => a.time.localeCompare(b.time));
      setTodayActivities(todayEvents);

      // Get week's activities - reuse allContracts for efficiency
      const weekEvents: ActivityEvent[] = [];
      allContracts.forEach(contract => {
        const pickupDate = new Date(contract.rentalPeriod.pickupDate);
        const dropoffDate = new Date(contract.rentalPeriod.dropoffDate);
        
        // Format time as HH:mm (remove seconds if present)
        const pickupTime = contract.rentalPeriod.pickupTime?.split(':').slice(0, 2).join(':') || '00:00';
        const dropoffTime = contract.rentalPeriod.dropoffTime?.split(':').slice(0, 2).join(':') || '00:00';
        
        if (pickupDate >= weekStart && pickupDate <= weekEnd) {
          weekEvents.push({
            id: `${contract.id}-pickup`,
            type: 'pickup',
            contractId: contract.id,
            vehicleName: contract.carInfo.makeModel,
            customerName: contract.renterInfo.fullName,
            time: pickupTime,
            date: pickupDate,
            location: contract.rentalPeriod.pickupLocation,
          });
        }
        
        if (dropoffDate >= weekStart && dropoffDate <= weekEnd) {
          weekEvents.push({
            id: `${contract.id}-return`,
            type: 'return',
            contractId: contract.id,
            vehicleName: contract.carInfo.makeModel,
            customerName: contract.renterInfo.fullName,
            time: dropoffTime,
            date: dropoffDate,
            location: contract.rentalPeriod.dropoffLocation,
          });
        }
      });

      // Sort by date, then time
      weekEvents.sort((a, b) => {
        const dateCompare = a.date.getTime() - b.date.getTime();
        return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time);
      });
      setWeekActivities(weekEvents);

    } catch (error) {
      console.error('Error loading activity data:', error);
    }
  }

  function calculateStats(contracts: Contract[]) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const active = contracts.filter(c => getActualContractStatus(c) === 'active').length;
    const completed = contracts.filter(c => getActualContractStatus(c) === 'completed').length;
    const upcoming = contracts.filter(c => getActualContractStatus(c) === 'upcoming').length;

    const totalRevenue = contracts.reduce((sum, c) => sum + (c.rentalPeriod.totalCost || 0), 0);
    
    const revenueThisMonth = contracts
      .filter(c => {
        const pickup = new Date(c.rentalPeriod.pickupDate);
        return pickup.getMonth() === thisMonth && pickup.getFullYear() === thisYear;
      })
      .reduce((sum, c) => sum + (c.rentalPeriod.totalCost || 0), 0);

    const activeContracts = contracts.filter(c => c.status === 'active');
    const avgRentalDays = activeContracts.length > 0
      ? activeContracts.reduce((sum, c) => {
          const pickup = new Date(c.rentalPeriod.pickupDate);
          const dropoff = new Date(c.rentalPeriod.dropoffDate);
          return sum + Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / activeContracts.length
      : 0;

    setStats({
      totalContracts: contracts.length,
      activeContracts: active,
      completedContracts: completed,
      upcomingContracts: upcoming,
      totalRevenue,
      revenueThisMonth,
      avgRentalDays: Math.round(avgRentalDays),
    });
  }

  function filterContracts() {
    let filtered = contracts;

    // Filter by status using actual calculated status
    if (activeFilter !== 'all') {
      filtered = filtered.filter(c => getActualContractStatus(c) === activeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contract => {
        return (
          contract.renterInfo.fullName.toLowerCase().includes(query) ||
          contract.carInfo.licensePlate.toLowerCase().includes(query) ||
          contract.carInfo.makeModel?.toLowerCase().includes(query)
        );
      });
    }

    setFilteredContracts(filtered);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function getActualContractStatus(contract: Contract): 'active' | 'completed' | 'upcoming' {
    try {
      const now = new Date();
      
      // Validate and parse pickup datetime
      const pickupDate = new Date(contract.rentalPeriod.pickupDate);
      if (isNaN(pickupDate.getTime())) {
        console.warn('Invalid pickup date for contract:', contract.id);
        return contract.status; // Fallback to stored status
      }
      
      const pickupTimeParts = contract.rentalPeriod.pickupTime?.split(':') || ['00', '00'];
      const pickupHours = parseInt(pickupTimeParts[0]) || 0;
      const pickupMinutes = parseInt(pickupTimeParts[1]) || 0;
      pickupDate.setHours(pickupHours, pickupMinutes, 0, 0);
      
      // Validate and parse dropoff datetime
      const dropoffDate = new Date(contract.rentalPeriod.dropoffDate);
      if (isNaN(dropoffDate.getTime())) {
        console.warn('Invalid dropoff date for contract:', contract.id);
        return contract.status; // Fallback to stored status
      }
      
      const dropoffTimeParts = contract.rentalPeriod.dropoffTime?.split(':') || ['23', '59'];
      const dropoffHours = parseInt(dropoffTimeParts[0]) || 23;
      const dropoffMinutes = parseInt(dropoffTimeParts[1]) || 59;
      dropoffDate.setHours(dropoffHours, dropoffMinutes, 0, 0);
      
      // Check if dates are valid after setting time
      if (isNaN(pickupDate.getTime()) || isNaN(dropoffDate.getTime())) {
        console.warn('Invalid dates after time parsing for contract:', contract.id);
        return contract.status;
      }
      
      // Determine actual status based on current time
      if (now < pickupDate) {
        return 'upcoming';
      } else if (now >= pickupDate && now <= dropoffDate) {
        return 'active';
      } else {
        return 'completed';
      }
    } catch (error) {
      console.error('Error calculating contract status:', error);
      return contract.status; // Fallback to stored status on error
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return Colors.success;
      case 'completed': return Colors.textSecondary;
      case 'upcoming': return Colors.info;
      default: return Colors.textSecondary;
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Ενεργό';
      case 'completed': return 'Ολοκληρωμένο';
      case 'upcoming': return 'Επερχόμενο';
      default: return status;
    }
  }

  function handlePhoneCall(phoneNumber: string, e: any) {
    e.stopPropagation();
    const phone = phoneNumber.replace(/\s/g, ''); // Remove spaces
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Σφάλμα', 'Δεν είναι δυνατή η κλήση');
    });
  }

  function renderStatsCard(icon: any, label: string, value: string | number, color: string, onPress?: () => void) {
    return (
      <TouchableOpacity
        style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderFilterButton(filter: typeof activeFilter, label: string, icon: any) {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setActiveFilter(filter)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={icon}
          size={18}
          color={isActive ? '#FFFFFF' : Colors.textSecondary}
        />
        <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  function renderContractCard(contract: Contract) {
    const actualStatus = getActualContractStatus(contract);
    
    return (
      <TouchableOpacity
        key={contract.id}
        style={styles.contractCard}
        onPress={() => router.push(`/contract-details?contractId=${contract.id}`)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.contractHeader}>
          <View style={styles.contractHeaderLeft}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(actualStatus) }]} />
            <View style={styles.contractHeaderInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.contractName} numberOfLines={1}>
                  {contract.renterInfo.fullName}
                </Text>
                <TouchableOpacity
                  style={styles.phoneButton}
                  onPress={(e) => handlePhoneCall(contract.renterInfo.phoneNumber || contract.renterInfo.phone, e)}
                >
                  <Ionicons name="call" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.contractCar} numberOfLines={1}>
                {contract.carInfo.makeModel} • {contract.carInfo.licensePlate}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(actualStatus) + '15' }]}>
            <Text style={[styles.statusBadgeText, { color: getStatusColor(actualStatus) }]}>
              {getStatusLabel(actualStatus)}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.contractDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Παραλαβή:</Text>
            <Text style={styles.detailValue}>
              {new Date(contract.rentalPeriod.pickupDate).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })} {contract.rentalPeriod.pickupTime}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Επιστροφή:</Text>
            <Text style={styles.detailValue}>
              {new Date(contract.rentalPeriod.dropoffDate).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })} {contract.rentalPeriod.dropoffTime}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Τοποθεσία:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {contract.rentalPeriod.pickupLocation}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.contractFooter}>
          <View style={styles.priceContainer}>
            <Ionicons name="cash-outline" size={16} color={Colors.primary} />
            <Text style={styles.priceValue}>€{contract.rentalPeriod.totalCost || 0}</Text>
          </View>
          <View style={styles.footerIcons}>
            {contract.damagePoints && contract.damagePoints.length > 0 && (
              <View style={styles.footerIconBadge}>
                <Ionicons name="warning" size={14} color={Colors.warning} />
                <Text style={styles.footerIconBadgeText}>{contract.damagePoints.length}</Text>
              </View>
            )}
            {(contract.aadeStatus === 'submitted' || contract.aadeStatus === 'completed') && (
              <View style={styles.aadeBadgeHome}>
                <Ionicons name="cloud-done" size={12} color="#28a745" />
                <Text style={styles.aadeBadgeTextHome}>ΑΑΔΕ</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function renderFleetAvailabilitySection() {
    return (
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Διαθεσιμότητα Στόλου</Text>
        <View style={styles.statsGrid}>
          {renderStatsCard('car-outline', 'Σύνολο', fleetAvailability.totalVehicles, Colors.text, () => router.push('/(tabs)/cars'))}
          {renderStatsCard('checkmark-circle', 'Διαθέσιμα', fleetAvailability.availableVehicles, Colors.success)}
          {renderStatsCard('time-outline', 'Ενοικιαζόμενα', fleetAvailability.rentedVehicles, Colors.info)}
          {renderStatsCard('warning', 'Κατάσταση', fleetAvailability.maintenanceVehicles, '#FF9500')}
        </View>
      </View>
    );
  }

  function renderMaintenanceAlertsSection() {
    if (maintenanceAlerts.length === 0) return null;

    return (
      <View style={styles.urgentSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="warning" size={16} color={Colors.error} />
            <Text style={styles.sectionTitle}>Επείγοντες Ενημερώσεις</Text>
          </View>
          {fleetAvailability.urgentMaintenanceCount > 0 && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>{fleetAvailability.urgentMaintenanceCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.urgentCard}>
          {maintenanceAlerts.slice(0, 3).map((alert, index) => (
            <TouchableOpacity
              key={alert.vehicleId + alert.alertType}
              style={[styles.urgentItem, index < maintenanceAlerts.slice(0, 3).length - 1 && styles.urgentItemBorder]}
              onPress={() => router.push(`/car-details?licensePlate=${alert.vehicleName.split('(')[1].replace(')', '')}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.urgentDot, { backgroundColor: alert.urgency.color }]} />
              <View style={styles.urgentContent}>
                <Text style={styles.urgentVehicle} numberOfLines={1}>
                  {getAlertTypeLabel(alert.alertType)}
                </Text>
                <Text style={styles.urgentPlate} numberOfLines={1}>
                  {alert.vehicleName}
                </Text>
              </View>
              <Text style={[styles.urgentTime, { color: alert.urgency.color }]}>
                {alert.urgency.label}
              </Text>
            </TouchableOpacity>
          ))}
          {maintenanceAlerts.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/(tabs)/maintenance')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>Προβολή Όλων ({maintenanceAlerts.length})</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  function renderActivitySection() {
    const activities = activityView === 'today' ? todayActivities : weekActivities;

    return (
      <View style={styles.activitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activityView === 'today' ? 'Σήμερα' : 'Εβδομάδα'}
          </Text>
          <View style={styles.activityToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, activityView === 'today' && styles.toggleButtonActive]}
              onPress={() => setActivityView('today')}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, activityView === 'today' && styles.toggleTextActive]}>Σήμερα</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, activityView === 'week' && styles.toggleButtonActive]}
              onPress={() => setActivityView('week')}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, activityView === 'week' && styles.toggleTextActive]}>Εβδομάδα</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.activityCard}>
          {activities.length === 0 ? (
            <View style={styles.noActivityContainer}>
              <Ionicons name="calendar-outline" size={32} color={Colors.textSecondary} />
              <Text style={styles.noActivityText}>
                {activityView === 'today' ? 'Δεν υπάρχουν εκκρεμότητες σήμερα' : 'Δεν υπάρχουν εκκρεμότητες αυτή την εβδομάδα'}
              </Text>
            </View>
          ) : (
            <>
              {activities.slice(0, 4).map((activity, index) => (
                <TouchableOpacity
                  key={activity.id}
                  style={[styles.activityItem, index < Math.min(activities.length, 4) - 1 && styles.activityItemBorder]}
                  onPress={() => router.push(`/contract-details?contractId=${activity.contractId}`)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.activityIconContainer, { backgroundColor: activity.type === 'pickup' ? Colors.success + '20' : Colors.warning + '20' }]}>
                    <Ionicons
                      name={activity.type === 'pickup' ? 'arrow-down-circle' : 'arrow-up-circle'}
                      size={20}
                      color={activity.type === 'pickup' ? Colors.success : Colors.warning}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {activity.type === 'pickup' ? '🟢 Παραλαβή' : '🔴 Επιστροφή'}
                    </Text>
                    <Text style={styles.activityDetails} numberOfLines={1}>
                      {activity.customerName} • {activity.vehicleName}
                    </Text>
                  </View>
                  <View style={styles.activityRightInfo}>
                    <Text style={styles.activityLocationDate} numberOfLines={1}>
                      {format(activity.date, 'dd/MM', { locale: el })}
                    </Text>
                    <Text style={styles.activityLocationText} numberOfLines={1}>
                      {activity.location}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {activity.time}
                  </Text>
                </TouchableOpacity>
              ))}
              {activities.length > 4 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => router.push('/(tabs)/calendar')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>Προβολή Full Ημερολογίου</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  }

  function getAlertTypeLabel(type: string): string {
    switch (type) {
      case 'kteo': return 'ΚΤΕΟ';
      case 'insurance': return 'Ασφάλεια';
      case 'tires': return 'Ελαστικά';
      case 'service': return 'Σέρβις';
      default: return type;
    }
  }

  function renderEmptyState() {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="document-text-outline" size={64} color={Colors.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>Δεν υπάρχουν συμβόλαια</Text>
        <Text style={styles.emptySubtitle}>
          {activeFilter === 'all'
            ? 'Δημιουργήστε το πρώτο σας συμβόλαιο πατώντας το κουμπί +'
            : `Δεν υπάρχουν ${getStatusLabel(activeFilter).toLowerCase()} συμβόλαια`}
        </Text>
        {activeFilter === 'all' && (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/new-contract')}
            activeOpacity={0.8}
          >
            <FleetOSIcon variant="icon" size={24} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Νέο Συμβόλαιο</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        {...smoothScrollConfig}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loadingDashboard ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Φόρτωση δεδομένων...</Text>
          </View>
        ) : (
          <>
            {/* Fleet Availability */}
            {renderFleetAvailabilitySection()}

            {/* Urgent Maintenance Alerts */}
            {renderMaintenanceAlertsSection()}

            {/* Today/Week Activity */}
            {renderActivitySection()}

            {/* Revenue Stats - Compact Single Card */}
            <View style={styles.revenueSection}>
              <View style={styles.revenueCard}>
                <View style={styles.revenueRow}>
                  <View style={styles.revenueItem}>
                    <Ionicons name="trending-up" size={18} color={Colors.success} />
                    <View style={styles.revenueTextContainer}>
                      <Text style={styles.revenueLabel}>Συνολικά</Text>
                      <Text style={styles.revenueValue}>€{stats.totalRevenue.toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={styles.revenueDivider} />
                  <View style={styles.revenueItem}>
                    <Ionicons name="calendar" size={18} color={Colors.primary} />
                    <View style={styles.revenueTextContainer}>
                      <Text style={styles.revenueLabel}>Αυτόν τον Μήνα</Text>
                      <Text style={styles.revenueValue}>€{stats.revenueThisMonth.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Contract Stats */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Συμβόλαια</Text>
              <View style={styles.statsGrid}>
                {renderStatsCard('documents', 'Συνολικά', stats.totalContracts, Colors.primary, () => setActiveFilter('all'))}
                {renderStatsCard('checkmark-circle', 'Ενεργά', stats.activeContracts, Colors.success, () => setActiveFilter('active'))}
                {renderStatsCard('time', 'Επερχόμενα', stats.upcomingContracts, Colors.info, () => setActiveFilter('upcoming'))}
                {renderStatsCard('checkmark-done', 'Ολοκληρωμένα', stats.completedContracts, Colors.textSecondary, () => setActiveFilter('completed'))}
              </View>
            </View>
          </>
        )}

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Αναζήτηση συμβολαίων..."
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            {renderFilterButton('all', 'Ολα', 'grid-outline')}
            {renderFilterButton('active', 'Ενεργά', 'checkmark-circle-outline')}
            {renderFilterButton('upcoming', 'Επερχόμενα', 'time-outline')}
            {renderFilterButton('completed', 'Ολοκληρωμένα', 'checkmark-done-outline')}
          </ScrollView>
        </View>

        {/* Contracts List */}
        <View style={styles.contractsSection}>
          <View style={styles.contractsHeader}>
            <Text style={styles.sectionTitle}>
              Συμβόλαια ({filteredContracts.length})
            </Text>
          </View>

          {filteredContracts.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.contractsList}>
              {filteredContracts.map(contract => renderContractCard(contract))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <ContextAwareFab
        onNewContract={() => router.push('/new-contract')}
        onNewDamage={() => router.push('/damage-report')}
        onNewUser={() => router.push('/user-management')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // iOS #F2F2F7
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
    flexGrow: 1,
  },
  // Stats Section
  statsSection: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // Revenue Section
  revenueSection: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  revenueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    ...Shadows.sm,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  revenueItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  revenueTextContainer: {
    flex: 1,
  },
  revenueDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderLight,
  },
  revenueLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 2,
    fontWeight: '500',
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  // Search Section
  searchSection: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  // Filters Section
  filtersSection: {
    paddingBottom: 6,
  },
  filtersScroll: {
    paddingHorizontal: 8,
    gap: 6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  // Contracts Section
  contractsSection: {
    paddingHorizontal: 8,
  },
  contractsHeader: {
    marginBottom: 8,
  },
  contractsList: {
    gap: 6,
  },
  // Contract Card
  contractCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    ...Shadows.sm,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  contractHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  contractHeaderInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  contractName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  phoneButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractCar: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contractDetails: {
    marginBottom: 6,
    gap: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    width: 65,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 10,
    color: Colors.text,
    fontWeight: '600',
    flex: 1,
  },
  contractFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  footerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerIconBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  footerIconBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.warning,
  },
  aadeBadgeHome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: '#28a74515',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#28a74530',
  },
  aadeBadgeTextHome: {
    fontSize: 9,
    fontWeight: '700',
    color: '#28a745',
    letterSpacing: 0.5,
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    ...Shadows.sm,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Loading State
  loadingContainer: {
    paddingVertical: Spacing.xl * 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Urgent Maintenance Section
  urgentSection: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  urgentBadge: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  urgentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  urgentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  urgentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  urgentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urgentContent: {
    flex: 1,
  },
  urgentVehicle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  urgentPlate: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  urgentTime: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Activity Section
  activitySection: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activityToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  activityDetails: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activityRightInfo: {
    alignItems: 'flex-end',
    marginRight: 8,
    maxWidth: 120,
  },
  activityLocationDate: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  activityLocationText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  noActivityContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
  },
  noActivityText: {
    marginTop: Spacing.md,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});
