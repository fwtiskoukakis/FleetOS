'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { calculateExpiryUrgency, calculateServiceUrgency, getMostUrgent, UrgencyResult } from '@/lib/maintenance-urgency';
import { 
  Wrench, CheckCircle2, AlertTriangle, Calendar,
  Shield, Settings
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

type SortOption = 'kteo' | 'tires' | 'insurance' | 'service';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  kteo_expiry_date: string | null;
  tires_next_change_date: string | null;
  insurance_expiry_date: string | null;
  current_mileage: number | null;
  next_service_mileage: number | null;
}

interface VehicleMaintenanceInfo {
  vehicle: Vehicle;
  kteoUrgency: UrgencyResult;
  tiresUrgency: UrgencyResult;
  insuranceUrgency: UrgencyResult;
  serviceUrgency: UrgencyResult;
  mostUrgent: UrgencyResult;
}

export default function MaintenancePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceInfo, setMaintenanceInfo] = useState<VehicleMaintenanceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('kteo');

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    calculateMaintenanceInfo();
  }, [vehicles, sortBy]);

  async function loadVehicles() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      let vehiclesQuery = supabase
        .from('cars')
        .select('id, make, model, license_plate, kteo_expiry_date, tires_next_change_date, insurance_expiry_date, current_mileage, next_service_mileage');

      if (organizationId) {
        vehiclesQuery = vehiclesQuery.eq('organization_id', organizationId);
      }

      const { data: vehiclesData, error } = await vehiclesQuery;

      if (error) {
        console.error('Error loading vehicles:', error);
        return;
      }

      setVehicles(vehiclesData || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function calculateMaintenanceInfo() {
    const info: VehicleMaintenanceInfo[] = vehicles.map(vehicle => {
      const kteoUrgency = calculateExpiryUrgency(vehicle.kteo_expiry_date ? parseISO(vehicle.kteo_expiry_date) : null);
      const tiresUrgency = calculateExpiryUrgency(vehicle.tires_next_change_date ? parseISO(vehicle.tires_next_change_date) : null);
      const insuranceUrgency = calculateExpiryUrgency(vehicle.insurance_expiry_date ? parseISO(vehicle.insurance_expiry_date) : null);
      const serviceUrgency = calculateServiceUrgency(vehicle.current_mileage || 0, vehicle.next_service_mileage || 0);

      const mostUrgent = getMostUrgent(kteoUrgency, tiresUrgency, insuranceUrgency, serviceUrgency);

      return {
        vehicle,
        kteoUrgency,
        tiresUrgency,
        insuranceUrgency,
        serviceUrgency,
        mostUrgent,
      };
    });

    // Sort based on selected option
    const sorted = [...info].sort((a, b) => {
      let urgencyA: UrgencyResult;
      let urgencyB: UrgencyResult;

      switch (sortBy) {
        case 'kteo':
          urgencyA = a.kteoUrgency;
          urgencyB = b.kteoUrgency;
          break;
        case 'tires':
          urgencyA = a.tiresUrgency;
          urgencyB = b.tiresUrgency;
          break;
        case 'insurance':
          urgencyA = a.insuranceUrgency;
          urgencyB = b.insuranceUrgency;
          break;
        case 'service':
          urgencyA = a.serviceUrgency;
          urgencyB = b.serviceUrgency;
          break;
        default:
          urgencyA = a.kteoUrgency;
          urgencyB = b.kteoUrgency;
      }

      // Sort by urgency level first
      const priorityMap: Record<string, number> = { expired: 0, critical: 1, warning: 2, soon: 3, ok: 4 };
      if (priorityMap[urgencyA.level] !== priorityMap[urgencyB.level]) {
        return priorityMap[urgencyA.level] - priorityMap[urgencyB.level];
      }

      // Then by days/km remaining
      return urgencyA.daysRemaining - urgencyB.daysRemaining;
    });

    setMaintenanceInfo(sorted);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVehicles();
  };

  function getSortLabel(option: SortOption): string {
    switch (option) {
      case 'kteo': return 'KTEO Expiry';
      case 'tires': return 'Tire Change';
      case 'insurance': return 'Insurance Expiry';
      case 'service': return 'Service';
      default: return '';
    }
  }

  function formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return format(parseISO(date), 'd MMM yyyy', { locale: el });
  }

  function getUrgencyLabel(urgency: UrgencyResult): string {
    switch (urgency.level) {
      case 'expired': return 'EXPIRED';
      case 'critical': return 'URGENT';
      case 'warning': return 'WARNING';
      case 'soon': return 'SOON';
      default: return 'OK';
    }
  }

  function renderMaintenanceCard(item: VehicleMaintenanceInfo) {
    const { vehicle, kteoUrgency, tiresUrgency, insuranceUrgency, serviceUrgency, mostUrgent } = item;

    return (
      <button
        key={vehicle.id}
        onClick={() => router.push(`/dashboard/fleet/${vehicle.id}`)}
        className="w-full bg-white rounded-lg border-l-4 p-4 mb-3 hover:shadow-md transition-shadow text-left"
        style={{ borderLeftColor: mostUrgent.color }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-gray-900">{vehicle.license_plate}</p>
            <p className="text-sm text-gray-600">{vehicle.make} {vehicle.model}</p>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${mostUrgent.color}15`, color: mostUrgent.color }}>
            {getUrgencyLabel(mostUrgent)}
          </div>
        </div>

        <div className="space-y-2">
          {/* KTEO */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: kteoUrgency.color }} />
              <span className="text-sm text-gray-700">KTEO</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{formatDate(vehicle.kteo_expiry_date)}</span>
              <span className="text-xs font-medium" style={{ color: kteoUrgency.color }}>
                {kteoUrgency.label}
              </span>
            </div>
          </div>

          {/* Tires */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: tiresUrgency.color }}></div>
              <span className="text-sm text-gray-700">Tires</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{formatDate(vehicle.tires_next_change_date)}</span>
              <span className="text-xs font-medium" style={{ color: tiresUrgency.color }}>
                {tiresUrgency.label}
              </span>
            </div>
          </div>

          {/* Insurance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: insuranceUrgency.color }} />
              <span className="text-sm text-gray-700">Insurance</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{formatDate(vehicle.insurance_expiry_date)}</span>
              <span className="text-xs font-medium" style={{ color: insuranceUrgency.color }}>
                {insuranceUrgency.label}
              </span>
            </div>
          </div>

          {/* Service */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" style={{ color: serviceUrgency.color }} />
              <span className="text-sm text-gray-700">Service</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {vehicle.next_service_mileage ? `${vehicle.next_service_mileage.toLocaleString()} km` : '-'}
              </span>
              <span className="text-xs font-medium" style={{ color: serviceUrgency.color }}>
                {serviceUrgency.label}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading maintenance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {/* Sort Options */}
        <div className="bg-white rounded-lg border border-gray-200 p-2 mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setSortBy('kteo')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'kteo'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            KTEO
          </button>
          <button
            onClick={() => setSortBy('tires')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'tires'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tires
          </button>
          <button
            onClick={() => setSortBy('insurance')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'insurance'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Insurance
          </button>
          <button
            onClick={() => setSortBy('service')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'service'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Service
          </button>
        </div>

        {/* Maintenance Cards */}
        {maintenanceInfo.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No vehicles found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {maintenanceInfo.map(item => renderMaintenanceCard(item))}
          </div>
        )}
      </main>
    </div>
  );
}

