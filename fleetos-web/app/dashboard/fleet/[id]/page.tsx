'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Edit,
  Car,
  Calendar,
  Wrench,
  TrendingUp,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  Phone,
  User
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format, parseISO } from 'date-fns';
import { getOrganizationId } from '@/lib/organization';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  color: string;
  category: string;
  current_mileage: number;
  status: string;
  has_gps: boolean;
  
  // KTEO
  kteo_last_date: string | null;
  kteo_expiry_date: string | null;
  
  // Insurance
  insurance_type: string;
  insurance_expiry_date: string | null;
  insurance_company: string | null;
  insurance_policy_number: string | null;
  insurance_has_mixed_coverage: boolean;
  
  // Tires
  tires_front_date: string | null;
  tires_front_brand: string | null;
  tires_rear_date: string | null;
  tires_rear_brand: string | null;
  tires_next_change_date: string | null;
  
  // Service
  last_service_date: string | null;
  last_service_mileage: number | null;
  next_service_mileage: number | null;
  
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Contract {
  id: string;
  renter_full_name: string;
  pickup_date: string;
  dropoff_date: string;
  total_cost: number;
  created_at: string;
}

interface DamagePoint {
  id: string;
  contract_id: string;
  description: string;
  severity: string;
  view_side: string;
  created_at: string;
  contracts: Contract | null;
}

export default function VehicleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [damages, setDamages] = useState<DamagePoint[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'performance' | 'accessories'>('overview');
  const [loadingDamages, setLoadingDamages] = useState(false);
  const [stats, setStats] = useState({
    totalContracts: 0,
    totalRevenue: 0,
    totalDamages: 0,
  });

  useEffect(() => {
    if (vehicleId) {
      loadVehicleDetails();
    }
  }, [vehicleId]);

  async function loadVehicleDetails() {
    if (typeof vehicleId !== 'string') {
      return;
    }

    setLoading(true);
    try {
      const organizationId = await getOrganizationId();
      if (!organizationId) {
        console.error('No organization found for user, cannot load vehicle details.');
        setLoading(false);
        return;
      }

      // Load vehicle
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('cars')
        .select('*')
        .eq('id', vehicleId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (vehicleError) {
        console.error('Error loading vehicle:', vehicleError);
        return;
      }

      if (!vehicleData) {
        return;
      }

      setVehicle(vehicleData as Vehicle);

      // Load contracts for this vehicle
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('id, renter_full_name, pickup_date, dropoff_date, total_cost, created_at')
        .eq('car_license_plate', vehicleData.license_plate)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (contractsError) {
        console.error('Error loading contracts:', contractsError);
      } else {
        setContracts(contractsData || []);
        const totalRevenue = (contractsData || []).reduce((sum, c) => sum + (c.total_cost || 0), 0);
        setStats(prev => ({
          ...prev,
          totalContracts: contractsData?.length || 0,
          totalRevenue,
        }));
      }

      // Load damage history
      if (vehicleData.license_plate) {
        loadDamageHistory(vehicleData.license_plate, organizationId);
      }
    } catch (error) {
      console.error('Exception loading vehicle details:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDamageHistory(licensePlate: string, organizationId: string) {
    setLoadingDamages(true);
    try {
      // Get contract IDs for this vehicle
      const { data: vehicleContracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, renter_full_name, pickup_date, dropoff_date, total_cost')
        .eq('car_license_plate', licensePlate)
        .eq('organization_id', organizationId);

      if (contractsError) {
        console.error('Error loading contracts for damage history:', contractsError);
        setDamages([]);
        setStats(prev => ({ ...prev, totalDamages: 0 }));
        return;
      }

      if (!vehicleContracts || vehicleContracts.length === 0) {
        setDamages([]);
        setStats(prev => ({ ...prev, totalDamages: 0 }));
        return;
      }

      const contractIds = vehicleContracts.map(c => c.id);
      const contractMap = new Map(vehicleContracts.map(c => [c.id, c]));

      // Load damage points for these contracts
      const { data: damagesData, error: damagesError } = await supabase
        .from('damage_points')
        .select('*')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (damagesError) {
        console.error('Error loading damage history:', damagesError);
        setDamages([]);
        setStats(prev => ({ ...prev, totalDamages: 0 }));
      } else {
        // Attach contract info to each damage
        const damagesWithContracts = (damagesData || []).map(damage => ({
          ...damage,
          contracts: contractMap.get(damage.contract_id) || null,
        }));
        setDamages(damagesWithContracts);
        setStats(prev => ({ ...prev, totalDamages: damagesWithContracts.length }));
      }
    } catch (error) {
      console.error('Exception loading damage history:', error);
      setDamages([]);
      setStats(prev => ({ ...prev, totalDamages: 0 }));
    } finally {
      setLoadingDamages(false);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'rented': return 'bg-blue-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'sold': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'available': return 'Available';
      case 'rented': return 'Rented';
      case 'maintenance': return 'Maintenance';
      case 'sold': return 'Sold';
      default: return status;
    }
  }

  function getCategoryLabel(category: string): string {
    switch (category) {
      case 'car': return 'Car';
      case 'atv': return 'ATV';
      case 'scooter': return 'Scooter';
      case 'motorcycle': return 'Motorcycle';
      case 'van': return 'Van';
      case 'truck': return 'Truck';
      default: return category;
    }
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'major': return 'bg-orange-500';
      case 'minor': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  }

  function getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'critical': return 'Critical';
      case 'major': return 'Major';
      case 'minor': return 'Minor';
      default: return severity;
    }
  }

  function getViewSideLabel(viewSide: string): string {
    switch (viewSide) {
      case 'front': return 'Front';
      case 'rear': return 'Rear';
      case 'left': return 'Left';
      case 'right': return 'Right';
      case 'top': return 'Top';
      default: return viewSide;
    }
  }

  function renderTabButton(tab: string, title: string, icon: any) {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab as any)}
        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {icon({ size: 20 })}
        <span className="text-sm font-medium">{title}</span>
      </button>
    );
  }

  function renderOverviewTab() {
    if (!vehicle) return null;

    return (
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Make & Model</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.make} {vehicle.model}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Year</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.year}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">License Plate</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.license_plate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Category</p>
              <p className="text-base font-semibold text-gray-900">{getCategoryLabel(vehicle.category)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Color</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.color || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Current Mileage</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.current_mileage?.toLocaleString() || 0} km</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Insurance Type</p>
              <p className="text-base font-semibold text-gray-900 capitalize">
                {vehicle.insurance_type === 'basic' ? 'Basic' : vehicle.insurance_type === 'full' ? 'Full' : vehicle.insurance_type || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.status)}`}></div>
                <p className="text-base font-semibold text-gray-900">{getStatusLabel(vehicle.status)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Financial</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Rentals</p>
              <p className="text-base font-semibold text-gray-900">{stats.totalContracts}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
              <p className="text-base font-semibold text-gray-900">€{stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Insurance & Documents Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Insurance & Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Insurance Company</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.insurance_company || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Policy Number</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.insurance_policy_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Insurance Expiry</p>
              <p className="text-base font-semibold text-gray-900">
                {vehicle.insurance_expiry_date ? format(parseISO(vehicle.insurance_expiry_date), 'dd/MM/yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">KTEO Expiry</p>
              <p className="text-base font-semibold text-gray-900">
                {vehicle.kteo_expiry_date ? format(parseISO(vehicle.kteo_expiry_date), 'dd/MM/yyyy') : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Damage History Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Damage History</h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              {stats.totalDamages}
            </span>
          </div>
          
          {loadingDamages ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">Loading damage history...</p>
            </div>
          ) : damages.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-700 font-medium">No damages recorded</p>
              <p className="text-sm text-gray-500 mt-1">The vehicle is in excellent condition!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {damages.map((damage) => (
                <div key={damage.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        damage.severity === 'severe' ? 'bg-red-100 text-red-700' :
                        damage.severity === 'moderate' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {damage.severity === 'severe' ? 'Severe' :
                         damage.severity === 'moderate' ? 'Moderate' :
                         'Minor'}
                      </span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-500">{getViewSideLabel(damage.view_side)}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {format(parseISO(damage.created_at), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{damage.description || 'No description'}</p>
                  {damage.contracts && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-4 h-4" />
                      <span>{damage.contracts.renter_full_name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderMaintenanceTab() {
    if (!vehicle) return null;

    return (
      <div className="space-y-6">
        {/* KTEO */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">KTEO</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Last KTEO Date</p>
              <p className="text-base font-semibold text-gray-900">
                {vehicle.kteo_last_date ? format(parseISO(vehicle.kteo_last_date), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">KTEO Expiry Date</p>
              <p className="text-base font-semibold text-gray-900">
                {vehicle.kteo_expiry_date ? format(parseISO(vehicle.kteo_expiry_date), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Insurance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Insurance</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Insurance Type</p>
              <p className="text-base font-semibold text-gray-900 capitalize">{vehicle.insurance_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Has Mixed Coverage</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.insurance_has_mixed_coverage ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Insurance Expiry Date</p>
              <p className="text-base font-semibold text-gray-900">
                {vehicle.insurance_expiry_date ? format(parseISO(vehicle.insurance_expiry_date), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Insurance Company</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.insurance_company || 'N/A'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 mb-1">Policy Number</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.insurance_policy_number || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Tires */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Tires</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Front Tires Change Date</p>
              <p className="text-base font-semibold text-gray-900">
                {vehicle.tires_front_date ? format(parseISO(vehicle.tires_front_date), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Front Tires Brand</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.tires_front_brand || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Rear Tires Change Date</p>
              <p className="text-base font-semibold text-gray-900">
                {vehicle.tires_rear_date ? format(parseISO(vehicle.tires_rear_date), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Rear Tires Brand</p>
              <p className="text-base font-semibold text-gray-900">{vehicle.tires_rear_brand || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Next Tires Change Date</p>
              <p className="text-base font-semibold text-gray-900">
                {vehicle.tires_next_change_date ? format(parseISO(vehicle.tires_next_change_date), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Service */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Service</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Last Service Date</p>
              <p className="text-base font-semibold text-gray-900">
                {vehicle.last_service_date ? format(parseISO(vehicle.last_service_date), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Last Service Mileage</p>
              <p className="text-base font-semibold text-gray-900">
                {vehicle.last_service_mileage ? `${vehicle.last_service_mileage.toLocaleString()} km` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Next Service Mileage</p>
              <p className="text-base font-semibold text-gray-900">
                {vehicle.next_service_mileage ? `${vehicle.next_service_mileage.toLocaleString()} km` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderPerformanceTab() {
    if (!vehicle) return null;

    return (
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-500">Total Contracts</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalContracts}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-500">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">€{stats.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-gray-500">Total Damages</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalDamages}</p>
          </div>
        </div>

        {/* Recent Contracts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Contracts</h3>
          {contracts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No contracts found</p>
          ) : (
            <div className="space-y-3">
              {contracts.slice(0, 10).map((contract) => (
                <div key={contract.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{contract.renter_full_name}</p>
                      <p className="text-sm text-gray-500">
                        {format(parseISO(contract.pickup_date), 'dd MMM yyyy')} - {format(parseISO(contract.dropoff_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">€{contract.total_cost.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Damage History */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Damage History</h3>
          {loadingDamages ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">Loading damage history...</p>
            </div>
          ) : damages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No damages recorded</p>
          ) : (
            <div className="space-y-3">
              {damages.map((damage) => (
                <div key={damage.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(damage.severity)}`}></div>
                      <span className="text-sm font-semibold text-gray-900">{getSeverityLabel(damage.severity)}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-500">{getViewSideLabel(damage.view_side)}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {format(parseISO(damage.created_at), 'dd MMM yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{damage.description}</p>
                  {damage.contracts && (
                    <p className="text-xs text-gray-500 mt-1">
                      Contract: {damage.contracts.renter_full_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderAccessoriesTab() {
    if (!vehicle) return null;

    return (
      <div className="space-y-6">
        {/* Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {vehicle.notes || 'No notes available'}
          </p>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Additional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Created At</p>
              <p className="text-base font-semibold text-gray-900">
                {format(parseISO(vehicle.created_at), 'dd MMM yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Last Updated</p>
              <p className="text-base font-semibold text-gray-900">
                {format(parseISO(vehicle.updated_at), 'dd MMM yyyy HH:mm')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Vehicle not found</h3>
          <button
            onClick={() => router.push('/dashboard/fleet')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Fleet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/fleet">
                <FleetOSLogo variant="icon" size={40} />
              </Link>
              <button
                onClick={() => router.push('/dashboard/fleet')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">{vehicle.make} {vehicle.model}</h1>
              <p className="text-sm text-gray-500">{vehicle.license_plate}</p>
            </div>
            <div className="w-24 flex justify-end">
              <Link
                href={`/dashboard/fleet/${vehicleId}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit size={18} />
                <span className="text-sm font-medium">Edit</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/dashboard" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Dashboard
            </Link>
            <Link href="/dashboard/fleet" className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600">
              Fleet
            </Link>
            <Link href="/dashboard/rentals" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Rentals
            </Link>
            <Link href="/dashboard/customers" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Customers
            </Link>
            <Link href="/dashboard/book-online" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Book Online
            </Link>
          </div>
        </div>
      </nav>

      {/* Vehicle Status */}
      <div className="bg-white border-b border-gray-200 py-3">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.status)}`}></div>
            <span className="text-sm font-medium text-gray-900">{getStatusLabel(vehicle.status)}</span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-500">{getCategoryLabel(vehicle.category)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-2">
            {renderTabButton('overview', 'Overview', (props: any) => <Car {...props} />)}
            {renderTabButton('maintenance', 'Maintenance', (props: any) => <Wrench {...props} />)}
            {renderTabButton('performance', 'Performance', (props: any) => <TrendingUp {...props} />)}
            {renderTabButton('accessories', 'Accessories', (props: any) => <Package {...props} />)}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'maintenance' && renderMaintenanceTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
        {activeTab === 'accessories' && renderAccessoriesTab()}
      </main>
    </div>
  );
}

