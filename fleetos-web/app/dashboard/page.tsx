'use client';

/**
 * DASHBOARD PAGE - EXACTLY MATCHING MOBILE APP
 * 
 * This dashboard recreates the mobile app's HomeScreen exactly, with all sections:
 * 1. Fleet Availability Section (4 stat cards)
 * 2. Urgent Maintenance Alerts Section
 * 3. Today/Week Activity Section (with toggle)
 * 4. Revenue Stats Section (compact card)
 * 5. Contract Stats Section (4 stat cards)
 * 6. Search Bar
 * 7. Filter Buttons (All, Active, Upcoming, Completed)
 * 8. Contracts List (with contract cards)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import FleetOSLogo from '@/components/FleetOSLogo';
import { 
  Car, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Calendar as CalendarIcon,
  DollarSign,
  Search,
  X,
  ChevronRight,
  Phone,
  FileText,
  CheckCircle,
  Timer,
  CheckCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle as Warning,
  Eye,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { calculateExpiryUrgency, calculateServiceUrgency } from '@/lib/maintenance-urgency';
import { getActualContractStatus, getStatusColor, getStatusLabel, type Contract } from '@/lib/contract-utils';
import { formatDate } from '@/lib/utils';

// Types matching mobile app
interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  upcomingContracts: number;
  totalRevenue: number;
  revenueThisMonth: number;
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
type FilterType = 'all' | 'active' | 'completed' | 'upcoming';

export default function DashboardPage() {
  const router = useRouter();
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activityView, setActivityView] = useState<ActivityView>('today');
  const [user, setUser] = useState<any>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
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
      // Get current user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        router.push('/login');
        return;
      }

      // Ensure user record exists
      let userData: any = { id: authUser.id, email: authUser.email || '' };
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, name, organization_id')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!existingUser) {
        await supabase.from('users').insert({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        });
        userData = { id: authUser.id, email: authUser.email || '', organization_id: null };
      } else {
        userData = existingUser;
      }

      setUser(userData);

      // Load all data in parallel (same as mobile app)
      const [loadedContracts, loadedVehicles] = await Promise.all([
        loadContracts(),
        loadVehicles(),
      ]);

      // Calculate all dashboard metrics
      await Promise.all([
        calculateFleetStats(loadedVehicles),
        loadActivityData(loadedContracts),
        calculateStats(loadedContracts),
      ]);

      setLoadingDashboard(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoadingDashboard(false);
    }
  }

  async function loadContracts(): Promise<Contract[]> {
    try {
      // Get user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's organization_id
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      const organizationId = userData?.organization_id;

      // Build query with organization filter
      let query = supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by organization_id if available, otherwise filter by user_id
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        // Fallback to user_id if no organization_id
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const loadedContracts = (data || []).map((c: any) => ({
        id: c.id,
        renter_full_name: c.renter_full_name,
        renter_email: c.renter_email,
        renter_phone_number: c.renter_phone_number,
        car_license_plate: c.car_license_plate,
        car_make_model: c.car_make_model,
        pickup_date: c.pickup_date,
        pickup_time: c.pickup_time,
        dropoff_date: c.dropoff_date,
        dropoff_time: c.dropoff_time,
        pickup_location: c.pickup_location,
        dropoff_location: c.dropoff_location,
        total_cost: c.total_cost || c.total_price || 0,
        total_price: c.total_price,
        status: c.status,
        damage_points: [],
        aade_status: c.aade_status,
        aade_dcl_id: c.aade_dcl_id,
      }));

      setContracts(loadedContracts);
      return loadedContracts;
    } catch (error) {
      console.error('Error loading contracts:', error);
      return [];
    }
  }

  async function loadVehicles(): Promise<any[]> {
    try {
      // Get user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's organization_id
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      let organizationId = userData?.organization_id;

      // Strategy 1: Find cars by organization_id
      let vehicles: any[] = [];
      
      if (organizationId) {
        const { data, error } = await supabase
          .from('cars')
          .select('*')
          .eq('organization_id', organizationId)
          .order('license_plate', { ascending: true });
        
        if (error) throw error;
        vehicles = data || [];
      }

      // Strategy 2: If no vehicles found, find through contracts
      if (vehicles.length === 0) {
        // Get organization_id from contracts
        const { data: contractData } = await supabase
          .from('contracts')
          .select('organization_id, car_license_plate')
          .eq('user_id', user.id)
          .not('organization_id', 'is', null)
          .limit(1)
          .maybeSingle();
        
        if (contractData?.organization_id) {
          organizationId = contractData.organization_id;
          // Update user's organization_id
          await supabase
            .from('users')
            .update({ organization_id: organizationId })
            .eq('id', user.id);
          
          // Get cars by organization_id
          const { data, error } = await supabase
            .from('cars')
            .select('*')
            .eq('organization_id', organizationId)
            .order('license_plate', { ascending: true });
          
          if (!error && data) {
            vehicles = data;
          }
        } else {
          // Get license plates from contracts and find those cars
          const { data: userContracts } = await supabase
            .from('contracts')
            .select('car_license_plate')
            .eq('user_id', user.id)
            .not('car_license_plate', 'is', null);
          
          if (userContracts && userContracts.length > 0) {
            const licensePlates = [...new Set(userContracts.map(c => c.car_license_plate).filter(Boolean))];
            
            const { data: carsByPlates } = await supabase
              .from('cars')
              .select('*')
              .in('license_plate', licensePlates)
              .order('license_plate', { ascending: true });
            
            if (carsByPlates) {
              vehicles = carsByPlates;
              
              // If cars have organization_id, use it to get all cars
              const carWithOrgId = carsByPlates.find(c => c.organization_id);
              if (carWithOrgId?.organization_id) {
                const { data: allOrgCars } = await supabase
                  .from('cars')
                  .select('*')
                  .eq('organization_id', carWithOrgId.organization_id)
                  .order('license_plate', { ascending: true });
                
                if (allOrgCars && allOrgCars.length > vehicles.length) {
                  vehicles = allOrgCars;
                  organizationId = carWithOrgId.organization_id;
                  // Update user's organization_id
                  await supabase
                    .from('users')
                    .update({ organization_id: organizationId })
                    .eq('id', user.id);
                }
              }
            }
          }
        }
      }

      return vehicles;
    } catch (error) {
      console.error('Error loading vehicles:', error);
      return [];
    }
  }

  async function calculateFleetStats(vehicles: any[]) {
    setVehicles(vehicles);

    // Calculate fleet availability (same as mobile app)
    const total = vehicles.length;
    const available = vehicles.filter(v => v.status === 'available').length;
    const rented = vehicles.filter(v => v.status === 'rented').length;
    const maintenance = vehicles.filter(v => v.status === 'maintenance').length;

    // Calculate maintenance alerts (same as mobile app)
    const alerts: MaintenanceAlert[] = [];
    vehicles.forEach(vehicle => {
      const vehicleName = `${vehicle.make || ''} ${vehicle.model || ''} (${vehicle.license_plate || ''})`;
      
      // Check KTEO
      if (vehicle.kteo_expiry_date) {
        const kteoUrgency = calculateExpiryUrgency(new Date(vehicle.kteo_expiry_date));
        if (kteoUrgency.level !== 'ok') {
          alerts.push({
            vehicleId: vehicle.id,
            vehicleName,
            alertType: 'kteo',
            urgency: kteoUrgency,
          });
        }
      }

      // Check Insurance
      if (vehicle.insurance_expiry_date) {
        const insuranceUrgency = calculateExpiryUrgency(new Date(vehicle.insurance_expiry_date));
        if (insuranceUrgency.level !== 'ok') {
          alerts.push({
            vehicleId: vehicle.id,
            vehicleName,
            alertType: 'insurance',
            urgency: insuranceUrgency,
          });
        }
      }

      // Check Tires
      if (vehicle.tires_next_change_date) {
        const tiresUrgency = calculateExpiryUrgency(new Date(vehicle.tires_next_change_date));
        if (tiresUrgency.level !== 'ok') {
          alerts.push({
            vehicleId: vehicle.id,
            vehicleName,
            alertType: 'tires',
            urgency: tiresUrgency,
          });
        }
      }

      // Check Service
      if (vehicle.next_service_mileage && vehicle.current_mileage) {
        const serviceUrgency = calculateServiceUrgency(vehicle.current_mileage, vehicle.next_service_mileage);
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

    // Sort alerts by urgency (same as mobile app)
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

  async function loadActivityData(contracts: Contract[]) {
    const today = startOfDay(new Date());
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const todayEvents: ActivityEvent[] = [];
    const weekEvents: ActivityEvent[] = [];

    contracts.forEach(contract => {
      const pickupDate = new Date(contract.pickup_date);
      const dropoffDate = new Date(contract.dropoff_date);
      
      const pickupTime = contract.pickup_time?.split(':').slice(0, 2).join(':') || '00:00';
      const dropoffTime = contract.dropoff_time?.split(':').slice(0, 2).join(':') || '00:00';
      
      // Today's pickups
      if (isSameDay(pickupDate, today)) {
        todayEvents.push({
          id: `${contract.id}-pickup`,
          type: 'pickup',
          contractId: contract.id,
          vehicleName: contract.car_make_model || contract.car_license_plate || 'Unknown',
          customerName: contract.renter_full_name || 'Unknown',
          time: pickupTime,
          date: pickupDate,
          location: contract.pickup_location || '',
        });
      }
      
      // Today's returns
      if (isSameDay(dropoffDate, today)) {
        todayEvents.push({
          id: `${contract.id}-return`,
          type: 'return',
          contractId: contract.id,
          vehicleName: contract.car_make_model || contract.car_license_plate || 'Unknown',
          customerName: contract.renter_full_name || 'Unknown',
          time: dropoffTime,
          date: dropoffDate,
          location: contract.dropoff_location || '',
        });
      }

      // Week's pickups
      if (pickupDate >= weekStart && pickupDate <= weekEnd) {
        weekEvents.push({
          id: `${contract.id}-pickup`,
          type: 'pickup',
          contractId: contract.id,
          vehicleName: contract.car_make_model || contract.car_license_plate || 'Unknown',
          customerName: contract.renter_full_name || 'Unknown',
          time: pickupTime,
          date: pickupDate,
          location: contract.pickup_location || '',
        });
      }
      
      // Week's returns
      if (dropoffDate >= weekStart && dropoffDate <= weekEnd) {
        weekEvents.push({
          id: `${contract.id}-return`,
          type: 'return',
          contractId: contract.id,
          vehicleName: contract.car_make_model || contract.car_license_plate || 'Unknown',
          customerName: contract.renter_full_name || 'Unknown',
          time: dropoffTime,
          date: dropoffDate,
          location: contract.dropoff_location || '',
        });
      }
    });

    // Sort by time
    todayEvents.sort((a, b) => a.time.localeCompare(b.time));
    weekEvents.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time);
    });

    setTodayActivities(todayEvents);
    setWeekActivities(weekEvents);
  }

  function calculateStats(contracts: Contract[]) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const active = contracts.filter(c => getActualContractStatus(c) === 'active').length;
    const completed = contracts.filter(c => getActualContractStatus(c) === 'completed').length;
    const upcoming = contracts.filter(c => getActualContractStatus(c) === 'upcoming').length;

    const totalRevenue = contracts.reduce((sum, c) => sum + (c.total_cost || 0), 0);
    
    const revenueThisMonth = contracts
      .filter(c => {
        const pickup = new Date(c.pickup_date);
        return pickup.getMonth() === thisMonth && pickup.getFullYear() === thisYear;
      })
      .reduce((sum, c) => sum + (c.total_cost || 0), 0);

    setStats({
      totalContracts: contracts.length,
      activeContracts: active,
      completedContracts: completed,
      upcomingContracts: upcoming,
      totalRevenue,
      revenueThisMonth,
    });
  }

  function filterContracts() {
    let filtered = contracts;

    // Filter by status
    if (activeFilter !== 'all') {
      filtered = filtered.filter(c => getActualContractStatus(c) === activeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contract => {
        return (
          contract.renter_full_name?.toLowerCase().includes(query) ||
          contract.car_license_plate?.toLowerCase().includes(query) ||
          contract.car_make_model?.toLowerCase().includes(query)
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

  function getAlertTypeLabel(type: string): string {
    switch (type) {
      case 'kteo': return 'ΚΤΕΟ';
      case 'insurance': return 'Ασφάλεια';
      case 'tires': return 'Ελαστικά';
      case 'service': return 'Σέρβις';
      default: return type;
    }
  }

  function renderStatsCard(icon: any, label: string, value: string | number, color: string, onClick?: () => void) {
    const Icon = icon;
    return (
      <div
        onClick={onClick}
        className={`bg-white rounded-lg p-3 flex flex-row items-center gap-2 border-l-4 shadow-sm ${
          onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
        }`}
        style={{ borderLeftColor: color }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="text-xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-600 font-medium">{label}</div>
        </div>
      </div>
    );
  }

  function renderFilterButton(filter: FilterType, label: string, icon: any) {
    const isActive = activeFilter === filter;
    const Icon = icon;
    return (
      <button
        onClick={() => setActiveFilter(filter)}
        className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-colors ${
          isActive 
            ? 'bg-blue-600 text-white' 
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <Icon size={14} />
        <span>{label}</span>
      </button>
    );
  }

  function renderContractCard(contract: Contract) {
    const actualStatus = getActualContractStatus(contract);
    const statusColor = getStatusColor(actualStatus);
    
    return (
      <div
        key={contract.id}
        onClick={() => router.push(`/dashboard/rentals/${contract.id}`)}
        className="bg-white rounded-lg p-3 mb-2 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-bold text-sm text-gray-900 truncate">
                  {contract.renter_full_name || 'Unknown'}
                </div>
                {contract.renter_phone_number && (
                  <a
                    href={`tel:${contract.renter_phone_number}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"
                  >
                    <Phone size={10} className="text-blue-600" />
                  </a>
                )}
              </div>
              <div className="text-xs text-gray-600 truncate">
                {contract.car_make_model || ''} • {contract.car_license_plate || ''}
              </div>
            </div>
          </div>
          <div 
            className="px-2 py-1 rounded-lg text-xs font-bold uppercase"
            style={{ backgroundColor: statusColor + '20', color: statusColor }}
          >
            {getStatusLabel(actualStatus)}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-2 text-xs">
            <CalendarIcon size={12} className="text-gray-500" />
            <span className="text-gray-600">Παραλαβή:</span>
            <span className="text-gray-900 font-semibold">
              {formatDate(contract.pickup_date, 'dd/MM')} {contract.pickup_time}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <CalendarIcon size={12} className="text-gray-500" />
            <span className="text-gray-600">Επιστροφή:</span>
            <span className="text-gray-900 font-semibold">
              {formatDate(contract.dropoff_date, 'dd/MM')} {contract.dropoff_time}
            </span>
          </div>
          {contract.pickup_location && (
            <div className="flex items-center gap-2 text-xs">
              <Clock size={12} className="text-gray-500" />
              <span className="text-gray-600">Τοποθεσία:</span>
              <span className="text-gray-900 truncate">{contract.pickup_location}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <DollarSign size={14} className="text-blue-600" />
            <span className="font-bold text-base text-gray-900">€{contract.total_cost || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            {contract.damage_points && contract.damage_points.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100">
                <AlertTriangle size={12} className="text-orange-600" />
                <span className="text-xs font-bold text-orange-600">{contract.damage_points.length}</span>
              </div>
            )}
            {(contract.aade_status === 'submitted' || contract.aade_status === 'completed') && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 border border-green-200">
                <CheckCircle size={10} className="text-green-600" />
                <span className="text-xs font-bold text-green-600">ΑΑΔΕ</span>
              </div>
            )}
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (loadingDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Φόρτωση δεδομένων...</p>
        </div>
      </div>
    );
  }

  const activities = activityView === 'today' ? todayActivities : weekActivities;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              <FleetOSLogo variant="icon" size={40} />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">{user?.organization?.company_name || 'FleetOS'}</p>
              </div>
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        {/* Fleet Availability Section */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Διαθεσιμότητα Στόλου</h2>
          <div className="grid grid-cols-2 gap-2">
            {renderStatsCard(Car, 'Σύνολο', fleetAvailability.totalVehicles, '#8E8E93', () => router.push('/dashboard/fleet'))}
            {renderStatsCard(CheckCircle2, 'Διαθέσιμα', fleetAvailability.availableVehicles, '#34C759')}
            {renderStatsCard(Clock, 'Ενοικιαζόμενα', fleetAvailability.rentedVehicles, '#007AFF')}
            {renderStatsCard(AlertTriangle, 'Κατάσταση', fleetAvailability.maintenanceVehicles, '#FF9500')}
          </div>
        </div>

        {/* Urgent Maintenance Alerts Section */}
        {maintenanceAlerts.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Warning size={14} className="text-red-500" />
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Επείγοντες Ενημερώσεις</h2>
              </div>
              {fleetAvailability.urgentMaintenanceCount > 0 && (
                <div className="bg-red-500 rounded-full px-2 py-0.5 min-w-[24px] text-center">
                  <span className="text-xs font-bold text-white">{fleetAvailability.urgentMaintenanceCount}</span>
                </div>
              )}
            </div>
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              {maintenanceAlerts.slice(0, 3).map((alert, index) => (
                <div
                  key={alert.vehicleId + alert.alertType}
                  onClick={() => router.push(`/dashboard/fleet?vehicle=${alert.vehicleId}`)}
                  className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${
                    index < Math.min(maintenanceAlerts.length, 3) - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: alert.urgency.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 truncate">
                      {getAlertTypeLabel(alert.alertType)}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{alert.vehicleName}</div>
                  </div>
                  <span className="text-xs font-bold" style={{ color: alert.urgency.color }}>
                    {alert.urgency.label}
                  </span>
                </div>
              ))}
              {maintenanceAlerts.length > 3 && (
                <div
                  onClick={() => router.push('/dashboard/fleet')}
                  className="p-3 border-t border-gray-100 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50"
                >
                  <span className="text-sm font-bold text-blue-600">Προβολή Όλων ({maintenanceAlerts.length})</span>
                  <ChevronRight size={14} className="text-blue-600" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Today/Week Activity Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              {activityView === 'today' ? 'Σήμερα' : 'Εβδομάδα'}
            </h2>
            <div className="flex items-center gap-1 bg-white rounded-lg p-1">
              <button
                onClick={() => setActivityView('today')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activityView === 'today' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600'
                }`}
              >
                Σήμερα
              </button>
              <button
                onClick={() => setActivityView('week')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activityView === 'week' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600'
                }`}
              >
                Εβδομάδα
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            {activities.length === 0 ? (
              <div className="p-8 text-center">
                <CalendarIcon size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {activityView === 'today' ? 'Δεν υπάρχουν εκκρεμότητες σήμερα' : 'Δεν υπάρχουν εκκρεμότητες αυτή την εβδομάδα'}
                </p>
              </div>
            ) : (
              <>
                {activities.slice(0, 4).map((activity, index) => (
                  <div
                    key={activity.id}
                    onClick={() => router.push(`/dashboard/rentals/${activity.contractId}`)}
                    className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${
                      index < Math.min(activities.length, 4) - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: activity.type === 'pickup' ? '#34C75920' : '#FF950020'
                      }}
                    >
                      {activity.type === 'pickup' ? (
                        <ArrowDownCircle size={18} className="text-green-600" />
                      ) : (
                        <ArrowUpCircle size={18} className="text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-900 truncate">
                        {activity.type === 'pickup' ? '🟢 Παραλαβή' : '🔴 Επιστροφή'}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {activity.customerName} • {activity.vehicleName}
                      </div>
                    </div>
                    <div className="text-right mr-2 max-w-[120px]">
                      <div className="text-xs font-bold text-blue-600 mb-0.5">
                        {format(activity.date, 'dd/MM', { locale: el })}
                      </div>
                      <div className="text-xs text-gray-600 truncate">{activity.location}</div>
                    </div>
                    <div className="text-sm font-bold text-gray-900">{activity.time}</div>
                  </div>
                ))}
                {activities.length > 4 && (
                  <div
                    onClick={() => router.push('/dashboard/rentals')}
                    className="p-3 border-t border-gray-100 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50"
                  >
                    <span className="text-sm font-bold text-blue-600">Προβολή Full Ημερολογίου</span>
                    <ChevronRight size={14} className="text-blue-600" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Revenue Stats - Compact Single Card */}
        <div className="mb-4">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2">
                <TrendingUp size={16} className="text-green-600" />
                <div>
                  <div className="text-xs text-gray-600 font-medium">Συνολικά</div>
                  <div className="text-base font-bold text-gray-900">€{stats.totalRevenue.toLocaleString()}</div>
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex-1 flex items-center gap-2">
                <CalendarIcon size={16} className="text-blue-600" />
                <div>
                  <div className="text-xs text-gray-600 font-medium">Αυτόν τον Μήνα</div>
                  <div className="text-base font-bold text-gray-900">€{stats.revenueThisMonth.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Stats */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Συμβόλαια</h2>
          <div className="grid grid-cols-2 gap-2">
            {renderStatsCard(FileText, 'Συνολικά', stats.totalContracts, '#007AFF', () => setActiveFilter('all'))}
            {renderStatsCard(CheckCircle2, 'Ενεργά', stats.activeContracts, '#34C759', () => setActiveFilter('active'))}
            {renderStatsCard(Timer, 'Επερχόμενα', stats.upcomingContracts, '#007AFF', () => setActiveFilter('upcoming'))}
            {renderStatsCard(CheckCheck, 'Ολοκληρωμένα', stats.completedContracts, '#8E8E93', () => setActiveFilter('completed'))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-3">
          <div className="bg-white rounded-lg flex items-center gap-2 px-3 h-9 border border-gray-200">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Αναζήτηση συμβολαίων..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm text-gray-900 placeholder-gray-500 focus:outline-none"
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {renderFilterButton('all', 'Ολα', FileText)}
            {renderFilterButton('active', 'Ενεργά', CheckCircle2)}
            {renderFilterButton('upcoming', 'Επερχόμενα', Timer)}
            {renderFilterButton('completed', 'Ολοκληρωμένα', CheckCheck)}
          </div>
        </div>

        {/* Contracts List */}
        <div>
          <div className="mb-2">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Συμβόλαια ({filteredContracts.length})
            </h2>
          </div>

          {filteredContracts.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <FileText size={64} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Δεν υπάρχουν συμβόλαια</h3>
              <p className="text-sm text-gray-600 mb-6">
                {activeFilter === 'all'
                  ? 'Δημιουργήστε το πρώτο σας συμβόλαιο'
                  : `Δεν υπάρχουν ${getStatusLabel(activeFilter).toLowerCase()} συμβόλαια`}
              </p>
              {activeFilter === 'all' && (
                <button
                  onClick={() => router.push('/dashboard/rentals/new')}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  <Plus size={20} />
                  <span>Νέο Συμβόλαιο</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContracts.map(contract => renderContractCard(contract))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
