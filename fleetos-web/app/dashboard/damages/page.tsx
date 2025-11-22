'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  AlertTriangle, Search, Grid3x3, List, X
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

type GridStyle = 'list' | 'grid3' | 'grid4' | 'grid5';

interface VehicleWithDamage {
  id: string;
  licensePlate: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  category?: string;
  damageCount: number;
  lastDamageDate: Date;
  severity: 'minor' | 'moderate' | 'severe';
  isInDatabase: boolean;
}

interface DamageDetail {
  id: string;
  severity: 'minor' | 'moderate' | 'severe';
  viewSide: 'front' | 'rear' | 'left' | 'right';
  description: string;
  createdAt: Date;
  contractRenterName: string;
  contractDate: Date;
}

export default function DamagesPage() {
  const router = useRouter();
  const [vehiclesWithDamages, setVehiclesWithDamages] = useState<VehicleWithDamage[]>([]);
  const [filtered, setFiltered] = useState<VehicleWithDamage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'minor' | 'moderate' | 'severe'>('all');
  const [gridStyle, setGridStyle] = useState<GridStyle>('grid5');
  const [damageModalVisible, setDamageModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithDamage | null>(null);
  const [damageDetails, setDamageDetails] = useState<DamageDetail[]>([]);

  useEffect(() => {
    loadVehiclesWithDamages();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehiclesWithDamages, search, filter]);

  async function loadVehiclesWithDamages() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      // Get all damage points with contract information
      let damageQuery = supabase
        .from('damage_points')
        .select(`
          *,
          contracts!inner(
            car_license_plate,
            renter_full_name,
            created_at,
            organization_id
          )
        `)
        .order('created_at', { ascending: false });

      if (organizationId) {
        damageQuery = damageQuery.eq('contracts.organization_id', organizationId);
      }

      const { data: damageData, error: damageError } = await damageQuery;

      if (damageError) {
        console.error('Error fetching damages:', damageError);
        return;
      }

      if (!damageData) {
        setVehiclesWithDamages([]);
        setLoading(false);
        return;
      }

      // Group damages by license plate
      const damageMap = new Map<string, {
        damageCount: number;
        lastDamageDate: Date;
        severity: 'minor' | 'moderate' | 'severe';
        plateNumber: string;
      }>();

      damageData.forEach((damage: any) => {
        const plateNumber = damage.contracts.car_license_plate;
        const damageDate = new Date(damage.created_at);
        
        if (!damageMap.has(plateNumber)) {
          damageMap.set(plateNumber, {
            damageCount: 0,
            lastDamageDate: damageDate,
            severity: damage.severity,
            plateNumber: plateNumber,
          });
        }

        const existing = damageMap.get(plateNumber)!;
        existing.damageCount++;
        
        // Update to most recent damage date
        if (damageDate > existing.lastDamageDate) {
          existing.lastDamageDate = damageDate;
        }

        // Update to highest severity
        const severityOrder: Record<string, number> = { minor: 1, moderate: 2, severe: 3 };
        if (severityOrder[damage.severity] > severityOrder[existing.severity]) {
          existing.severity = damage.severity;
        }
      });

      // Get all vehicles from database
      let vehiclesQuery = supabase
        .from('cars')
        .select('id, make, model, license_plate, year, color, category');

      if (organizationId) {
        vehiclesQuery = vehiclesQuery.eq('organization_id', organizationId);
      }

      const { data: allVehicles, error: vehiclesError } = await vehiclesQuery;

      if (vehiclesError) {
        console.error('Error loading vehicles:', vehiclesError);
      }

      const vehicleMap = new Map<string, any>();
      (allVehicles || []).forEach((vehicle: any) => {
        vehicleMap.set(vehicle.license_plate, vehicle);
      });

      // Create combined list
      const vehiclesWithDamagesList: VehicleWithDamage[] = Array.from(damageMap.values()).map(damageInfo => {
        const vehicle = vehicleMap.get(damageInfo.plateNumber);
        
        if (vehicle) {
          // Vehicle exists in database
          return {
            id: vehicle.id,
            licensePlate: damageInfo.plateNumber,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            category: vehicle.category,
            damageCount: damageInfo.damageCount,
            lastDamageDate: damageInfo.lastDamageDate,
            severity: damageInfo.severity,
            isInDatabase: true,
          };
        } else {
          // Vehicle doesn't exist in database - show only plate number
          return {
            id: `damage-${damageInfo.plateNumber}`,
            licensePlate: damageInfo.plateNumber,
            damageCount: damageInfo.damageCount,
            lastDamageDate: damageInfo.lastDamageDate,
            severity: damageInfo.severity,
            isInDatabase: false,
          };
        }
      });

      // Sort by last damage date (most recent first)
      vehiclesWithDamagesList.sort((a, b) => b.lastDamageDate.getTime() - a.lastDamageDate.getTime());

      setVehiclesWithDamages(vehiclesWithDamagesList);
    } catch (error) {
      console.error('Error loading vehicles with damages:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function filterVehicles() {
    let filteredList = [...vehiclesWithDamages];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filteredList = filteredList.filter(v => 
        v.licensePlate.toLowerCase().includes(searchLower) ||
        (v.make && v.make.toLowerCase().includes(searchLower)) ||
        (v.model && v.model.toLowerCase().includes(searchLower))
      );
    }

    // Filter by severity
    if (filter !== 'all') {
      filteredList = filteredList.filter(v => v.severity === filter);
    }

    setFiltered(filteredList);
  }

  async function loadDamageDetails(vehicle: VehicleWithDamage) {
    try {
      const { data: damageData, error } = await supabase
        .from('damage_points')
        .select(`
          *,
          contracts!inner(
            renter_full_name,
            created_at,
            car_license_plate
          )
        `)
        .eq('contracts.car_license_plate', vehicle.licensePlate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const details: DamageDetail[] = (damageData || []).map((damage: any) => ({
        id: damage.id,
        severity: damage.severity,
        viewSide: damage.view_side,
        description: damage.description || 'No description',
        createdAt: new Date(damage.created_at),
        contractRenterName: damage.contracts.renter_full_name || 'Unknown',
        contractDate: new Date(damage.contracts.created_at),
      }));

      setDamageDetails(details);
      setSelectedVehicle(vehicle);
      setDamageModalVisible(true);
    } catch (error) {
      console.error('Error loading damage details:', error);
    }
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'severe': return '#ef4444';
      case 'moderate': return '#f59e0b';
      case 'minor': return '#eab308';
      default: return '#6b7280';
    }
  }

  function getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'severe': return 'Severe';
      case 'moderate': return 'Moderate';
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
      default: return viewSide;
    }
  }

  function renderVehicleCard(vehicle: VehicleWithDamage) {
    const severityColor = getSeverityColor(vehicle.severity);
    
    return (
      <button
        key={vehicle.id}
        onClick={() => {
          if (vehicle.isInDatabase) {
            router.push(`/dashboard/fleet/${vehicle.id}`);
          } else {
            loadDamageDetails(vehicle);
          }
        }}
        className={`bg-white rounded-lg border-2 p-3 hover:shadow-md transition-shadow text-left ${
          gridStyle === 'list' ? 'w-full' : ''
        }`}
        style={{ borderColor: severityColor }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{vehicle.licensePlate}</p>
            {vehicle.make && vehicle.model && (
              <p className="text-xs text-gray-600 truncate">{vehicle.make} {vehicle.model}</p>
            )}
          </div>
          <div className="px-2 py-1 rounded text-xs font-semibold ml-2" style={{ backgroundColor: `${severityColor}15`, color: severityColor }}>
            {getSeverityLabel(vehicle.severity)}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{vehicle.damageCount} damage{vehicle.damageCount !== 1 ? 's' : ''}</span>
          <span>{format(vehicle.lastDamageDate, 'dd/MM/yyyy', { locale: el })}</span>
        </div>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading damages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by license plate, make, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('minor')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'minor'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Minor
              </button>
              <button
                onClick={() => setFilter('moderate')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'moderate'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Moderate
              </button>
              <button
                onClick={() => setFilter('severe')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'severe'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Severe
              </button>
            </div>

            {/* Grid Style */}
            <div className="flex gap-2">
              <button
                onClick={() => setGridStyle('list')}
                className={`p-2 rounded-lg transition-colors ${
                  gridStyle === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setGridStyle('grid3')}
                className={`p-2 rounded-lg transition-colors ${
                  gridStyle === 'grid3'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Vehicles Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No vehicles with damages found</p>
          </div>
        ) : (
          <div className={`grid gap-3 ${
            gridStyle === 'list' 
              ? 'grid-cols-1' 
              : gridStyle === 'grid3'
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'
          }`}>
            {filtered.map(vehicle => renderVehicleCard(vehicle))}
          </div>
        )}
      </main>

      {/* Damage Details Modal */}
      {damageModalVisible && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedVehicle.licensePlate}</h3>
                {selectedVehicle.make && selectedVehicle.model && (
                  <p className="text-sm text-gray-600">{selectedVehicle.make} {selectedVehicle.model}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setDamageModalVisible(false);
                  setSelectedVehicle(null);
                  setDamageDetails([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {damageDetails.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No damage details found</p>
              ) : (
                <div className="space-y-3">
                  {damageDetails.map(damage => (
                    <div key={damage.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold`} style={{ backgroundColor: `${getSeverityColor(damage.severity)}15`, color: getSeverityColor(damage.severity) }}>
                            {getSeverityLabel(damage.severity)}
                          </span>
                          <span className="text-xs text-gray-500">{getViewSideLabel(damage.viewSide)}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(damage.createdAt, 'dd/MM/yyyy', { locale: el })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{damage.description}</p>
                      <div className="text-xs text-gray-500">
                        Contract: {damage.contractRenterName} • {format(damage.contractDate, 'dd/MM/yyyy', { locale: el })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

