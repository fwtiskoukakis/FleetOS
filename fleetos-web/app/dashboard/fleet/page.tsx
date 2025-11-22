'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  Car, Plus, Search, Filter, Edit, Trash2, 
  LayoutGrid, List, ChevronDown, Calendar, Clock,
  AlertTriangle, CheckCircle2, Shield, Wrench, Circle
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { calculateExpiryUrgency, calculateServiceUrgency, getMostUrgent } from '@/lib/maintenance-urgency';

type GridStyle = 'list' | 'grid3' | 'grid4' | 'grid5';
type SortOption = 'default' | 'urgent' | 'kteo_due' | 'insurance_due' | 'tires_due' | 'tires_recent' | 'service_due';
type StatusFilter = 'all' | 'available' | 'rented' | 'maintenance';

export default function FleetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [gridStyle, setGridStyle] = useState<GridStyle>('grid3');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Availability filtering
  const [filterByAvailability, setFilterByAvailability] = useState(false);
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [pickupTime, setPickupTime] = useState<string>('10:00');
  const [dropoffDate, setDropoffDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  });
  const [dropoffTime, setDropoffTime] = useState<string>('10:00');
  const [availableVehicles, setAvailableVehicles] = useState<Set<string>>(new Set());
  const [showPickupDatePicker, setShowPickupDatePicker] = useState(false);
  const [showDropoffDatePicker, setShowDropoffDatePicker] = useState(false);

  useEffect(() => {
    loadCars();
  }, []);

  useEffect(() => {
    if (filterByAvailability) {
      checkVehicleAvailability();
    }
  }, [filterByAvailability, pickupDate, pickupTime, dropoffDate, dropoffTime, cars]);

  async function loadCars() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCars([]);
        setLoading(false);
        return;
      }

      // Get organization_id using centralized utility
      const organizationId = await getOrganizationId(user.id);

      // Build query with organization filter
      let query = supabase
        .from('cars')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by organization_id if available, otherwise filter by user_id
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading cars:', error);
        return;
      }

      setCars(data || []);
    } catch (error) {
      console.error('Exception loading cars:', error);
      setCars([]);
    } finally {
      setLoading(false);
    }
  }

  async function checkVehicleAvailability() {
    if (!filterByAvailability) return;

    try {
      // Combine date and time for pickup and dropoff
      const pickupDateTime = new Date(pickupDate);
      const [pickupH, pickupM] = pickupTime.split(':');
      pickupDateTime.setHours(parseInt(pickupH) || 0, parseInt(pickupM) || 0, 0, 0);
      
      const dropoffDateTime = new Date(dropoffDate);
      const [dropoffH, dropoffM] = dropoffTime.split(':');
      dropoffDateTime.setHours(parseInt(dropoffH) || 0, parseInt(dropoffM) || 0, 0, 0);

      // Get all active contracts that might overlap
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const organizationId = await getOrganizationId(user.id);
      let contractsQuery = supabase
        .from('contracts')
        .select('car_license_plate, pickup_date, pickup_time, dropoff_date, dropoff_time, status')
        .in('status', ['active', 'upcoming', 'pending']);

      if (organizationId) {
        contractsQuery = contractsQuery.eq('organization_id', organizationId);
      } else {
        contractsQuery = contractsQuery.eq('user_id', user.id);
      }

      const { data: contracts, error } = await contractsQuery;

      if (error) {
        console.error('Error fetching contracts for availability:', error);
        return;
      }

      // Check each vehicle for conflicts
      const available = new Set<string>();
      
      for (const vehicle of cars) {
        // Skip maintenance vehicles
        if (vehicle.status === 'maintenance') {
          continue;
        }

        // Check if vehicle has overlapping contracts
        const hasConflict = contracts?.some(contract => {
          if (contract.car_license_plate?.toUpperCase() !== vehicle.license_plate?.toUpperCase()) {
            return false;
          }

          // Parse contract dates/times
          const contractPickup = new Date(contract.pickup_date);
          const [pickupH, pickupM] = (contract.pickup_time || '00:00').split(':');
          contractPickup.setHours(parseInt(pickupH) || 0, parseInt(pickupM) || 0, 0, 0);

          const contractDropoff = new Date(contract.dropoff_date);
          const [dropoffH, dropoffM] = (contract.dropoff_time || '23:59').split(':');
          contractDropoff.setHours(parseInt(dropoffH) || 23, parseInt(dropoffM) || 59, 0, 0);

          // Check for overlap
          return (
            (pickupDateTime >= contractPickup && pickupDateTime <= contractDropoff) ||
            (dropoffDateTime >= contractPickup && dropoffDateTime <= contractDropoff) ||
            (pickupDateTime <= contractPickup && dropoffDateTime >= contractDropoff)
          );
        });

        if (!hasConflict) {
          available.add(vehicle.id);
        }
      }

      setAvailableVehicles(available);
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  }

  function getMostUrgentMaintenance(car: any): { priority: number; label: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const urgencies: Array<{ date: Date | null; priority: number; label: string }> = [];
    
    if (car.kteo_expiry_date) {
      const kteoDate = new Date(car.kteo_expiry_date);
      const days = Math.floor((kteoDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      urgencies.push({ date: kteoDate, priority: days < 0 ? 0 : days, label: 'KTEO' });
    }
    
    if (car.insurance_expiry_date) {
      const insuranceDate = new Date(car.insurance_expiry_date);
      const days = Math.floor((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      urgencies.push({ date: insuranceDate, priority: days < 0 ? 0 : days, label: 'Ασφάλεια' });
    }
    
    if (car.tires_next_change_date) {
      const tiresDate = new Date(car.tires_next_change_date);
      const days = Math.floor((tiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      urgencies.push({ date: tiresDate, priority: days < 0 ? 0 : days, label: 'Λάστιχα' });
    }
    
    if (car.next_service_mileage && car.mileage) {
      const km = car.next_service_mileage - car.mileage;
      urgencies.push({ date: null, priority: km < 0 ? 0 : km, label: 'Σέρβις' });
    }
    
    if (urgencies.length === 0) {
      return { priority: 9999, label: 'OK' };
    }
    
    urgencies.sort((a, b) => a.priority - b.priority);
    return urgencies[0];
  }

  function filterCars() {
    let result = cars;
    
    // Apply availability filter if enabled
    if (filterByAvailability && availableVehicles.size > 0) {
      result = result.filter(c => availableVehicles.has(c.id));
    }
    
    // Apply status filter
    if (statusFilter === 'available') result = result.filter(c => c.status === 'available');
    if (statusFilter === 'rented') result = result.filter(c => c.status === 'rented');
    if (statusFilter === 'maintenance') result = result.filter(c => c.status === 'maintenance');
    
    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.license_plate?.toLowerCase().includes(q) ||
        c.make?.toLowerCase().includes(q) ||
        c.model?.toLowerCase().includes(q) ||
        `${c.make || ''} ${c.model || ''}`.toLowerCase().includes(q)
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'kteo_due':
        result.sort((a, b) => {
          const aDate = a.kteo_expiry_date ? new Date(a.kteo_expiry_date).getTime() : Infinity;
          const bDate = b.kteo_expiry_date ? new Date(b.kteo_expiry_date).getTime() : Infinity;
          return aDate - bDate;
        });
        break;
      case 'insurance_due':
        result.sort((a, b) => {
          const aDate = a.insurance_expiry_date ? new Date(a.insurance_expiry_date).getTime() : Infinity;
          const bDate = b.insurance_expiry_date ? new Date(b.insurance_expiry_date).getTime() : Infinity;
          return aDate - bDate;
        });
        break;
      case 'tires_due':
        result.sort((a, b) => {
          const aDate = a.tires_next_change_date ? new Date(a.tires_next_change_date).getTime() : Infinity;
          const bDate = b.tires_next_change_date ? new Date(b.tires_next_change_date).getTime() : Infinity;
          return aDate - bDate;
        });
        break;
      case 'tires_recent':
        result.sort((a, b) => {
          const aDate = a.tires_front_date || a.tires_rear_date;
          const bDate = b.tires_front_date || b.tires_rear_date;
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        break;
      case 'service_due':
        result.sort((a, b) => {
          const aMileage = a.next_service_mileage || Infinity;
          const bMileage = b.next_service_mileage || Infinity;
          return aMileage - bMileage;
        });
        break;
      case 'urgent':
        result.sort((a, b) => {
          const aUrgency = getMostUrgentMaintenance(a);
          const bUrgency = getMostUrgentMaintenance(b);
          return aUrgency.priority - bUrgency.priority;
        });
        break;
      default:
        result.sort((a, b) => (a.license_plate || '').localeCompare(b.license_plate || ''));
    }
    
    return result;
  }

  const filteredCars = filterCars();

  function getStatusColor(status: string): string {
    switch (status) {
      case 'available': return '#34C759';
      case 'rented': return '#007AFF';
      case 'maintenance': return '#FF9500';
      case 'retired': return '#8E8E93';
      default: return '#8E8E93';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'available': return 'Διαθέσιμο';
      case 'rented': return 'Ενοικιασμένο';
      case 'maintenance': return 'Συντήρηση';
      case 'retired': return 'Αποσυρμένο';
      default: return status;
    }
  }

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

  function formatDateInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function formatTimeInput(time: string): string {
    return time;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <FleetOSLogo variant="icon" size={40} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Fleet Management</h1>
                <p className="text-sm text-gray-600">Manage your vehicles</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/fleet/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Vehicle
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Filters - Horizontal Scroll */}
        <div className="mb-4 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {(['all', 'available', 'rented', 'maintenance'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  statusFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* View & Sort Dropdowns */}
        <div className="mb-4 flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">{getViewLabel(gridStyle)}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showViewDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                {([
                  ['list', 'List', List],
                  ['grid3', '3 Columns', LayoutGrid],
                  ['grid4', '4 Columns', LayoutGrid],
                  ['grid5', '5 Columns', LayoutGrid],
                ] as [string, string, any][]).map(([style, label, Icon]) => (
                  <button
                    key={style as string}
                    onClick={() => {
                      setGridStyle(style as GridStyle);
                      setShowViewDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      gridStyle === style ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">{getSortLabel(sortBy)}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showSortDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                {[
                  ['default', 'Default'],
                  ['urgent', 'Most Urgent'],
                  ['kteo_due', 'KTEO Due'],
                  ['insurance_due', 'Insurance Due'],
                  ['tires_due', 'Tires Due'],
                  ['tires_recent', 'Recent Tires'],
                  ['service_due', 'Service Due'],
                ].map(([sort, label]) => (
                  <button
                    key={sort}
                    onClick={() => {
                      setSortBy(sort as SortOption);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      sortBy === sort ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by license plate, make, or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Availability Filter Section */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterByAvailability}
                onChange={(e) => setFilterByAvailability(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Filter by Availability</span>
            </label>
            {filterByAvailability && (
              <button
                onClick={() => {
                  setFilterByAvailability(false);
                  setAvailableVehicles(new Set());
                }}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Clear
              </button>
            )}
          </div>
          
          {filterByAvailability && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup Date/Time */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pickup:</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={formatDateInput(pickupDate)}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      setPickupDate(newDate);
                      if (newDate > dropoffDate) {
                        const nextDay = new Date(newDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        setDropoffDate(nextDay);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              
              {/* Dropoff Date/Time */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dropoff:</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={formatDateInput(dropoffDate)}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      if (newDate < pickupDate) {
                        alert('Dropoff date must be after pickup date');
                        return;
                      }
                      setDropoffDate(newDate);
                    }}
                    min={formatDateInput(pickupDate)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="time"
                    value={dropoffTime}
                    onChange={(e) => setDropoffTime(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cars Grid/List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading vehicles...</p>
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No vehicles found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all' || filterByAvailability
                ? 'Try adjusting your filters'
                : 'Get started by adding your first vehicle'}
            </p>
            {!searchQuery && statusFilter === 'all' && !filterByAvailability && (
              <button
                onClick={() => router.push('/dashboard/fleet/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Vehicle
              </button>
            )}
          </div>
        ) : gridStyle === 'list' ? (
          /* List View */
          <div className="space-y-3">
            {filteredCars.map((car) => {
              const kteoUrgency = calculateExpiryUrgency(car.kteo_expiry_date ? new Date(car.kteo_expiry_date) : null);
              const tiresUrgency = calculateExpiryUrgency(car.tires_next_change_date ? new Date(car.tires_next_change_date) : null);
              const insuranceUrgency = calculateExpiryUrgency(car.insurance_expiry_date ? new Date(car.insurance_expiry_date) : null);
              const serviceUrgency = calculateServiceUrgency(car.mileage, car.next_service_mileage);
              const hasUrgentMaintenance = [kteoUrgency, tiresUrgency, insuranceUrgency, serviceUrgency]
                .some(u => u.level === 'expired' || u.level === 'critical' || u.level === 'warning');
              const statusColor = getStatusColor(car.status || 'available');
              
              return (
                <div
                  key={car.id}
                  onClick={() => router.push(`/dashboard/fleet/${car.id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {car.make || ''} {car.model || ''}
                        </h3>
                        {hasUrgentMaintenance && (
                          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {car.license_plate || 'No plate'} • {car.year || ''}
                      </p>
                      {car.color && (
                        <p className="text-xs text-gray-500 mb-1">Color: {car.color}</p>
                      )}
                      {car.category && (
                        <p className="text-xs text-gray-500 mb-2">Category: {car.category}</p>
                      )}
                      {hasUrgentMaintenance && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(kteoUrgency.level === 'expired' || kteoUrgency.level === 'critical' || kteoUrgency.level === 'warning') && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              KTEO
                            </span>
                          )}
                          {(insuranceUrgency.level === 'expired' || insuranceUrgency.level === 'critical' || insuranceUrgency.level === 'warning') && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                              <Shield className="w-3 h-3" />
                              Insurance
                            </span>
                          )}
                          {(tiresUrgency.level === 'expired' || tiresUrgency.level === 'critical' || tiresUrgency.level === 'warning') && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                              <Circle className="w-3 h-3" />
                              Tires
                            </span>
                          )}
                          {(serviceUrgency.level === 'expired' || serviceUrgency.level === 'critical' || serviceUrgency.level === 'warning') && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium">
                              <Wrench className="w-3 h-3" />
                              Service
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span
                        className="px-2 py-1 text-xs font-medium rounded"
                        style={{
                          backgroundColor: `${statusColor}15`,
                          color: statusColor,
                        }}
                      >
                        {getStatusLabel(car.status || 'available')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Grid View */
          <div
            className={`grid gap-4 ${
              gridStyle === 'grid3' ? 'grid-cols-1 md:grid-cols-3' :
              gridStyle === 'grid4' ? 'grid-cols-2 md:grid-cols-4' :
              'grid-cols-2 md:grid-cols-5'
            }`}
          >
            {filteredCars.map((car) => {
              const statusColor = getStatusColor(car.status || 'available');
              
              return (
                <div
                  key={car.id}
                  onClick={() => router.push(`/dashboard/fleet/${car.id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                      {car.make || ''} {car.model || ''}
                    </h3>
                    <p className="text-xs text-gray-600 truncate">
                      {car.license_plate || 'No plate'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Click outside to close dropdowns */}
      {(showViewDropdown || showSortDropdown) && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => {
            setShowViewDropdown(false);
            setShowSortDropdown(false);
          }}
        />
      )}
    </div>
  );
}
