'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  Save, 
  Car, 
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format, parseISO } from 'date-fns';

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form state - matching mobile app exactly
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    color: '',
    category: 'car' as 'car' | 'atv' | 'scooter' | 'motorcycle' | 'van' | 'truck',
    currentMileage: 0,
    status: 'available' as 'available' | 'rented' | 'maintenance' | 'sold',
    
    // GPS Tracking
    hasGps: false,
    
    // KTEO
    kteoLastDate: null as string | null,
    kteoExpiryDate: null as string | null,
    
    // Insurance
    insuranceType: 'basic' as 'basic' | 'full',
    insuranceExpiryDate: null as string | null,
    insuranceCompany: '',
    insurancePolicyNumber: '',
    insuranceHasMixedCoverage: false,
    
    // Tires
    tiresFrontDate: null as string | null,
    tiresFrontBrand: '',
    tiresRearDate: null as string | null,
    tiresRearBrand: '',
    tiresNextChangeDate: null as string | null,
    
    // Service
    lastServiceDate: null as string | null,
    lastServiceMileage: null as number | null,
    nextServiceMileage: null as number | null,
    
    notes: '',
  });

  useEffect(() => {
    if (vehicleId) {
      loadVehicle();
    }
  }, [vehicleId]);

  async function loadVehicle() {
    try {
      setLoading(true);
      
      // Get user's organization_id for filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Get user's organization_id
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      const organizationId = userData?.organization_id;

      // Build query with organization filter
      let query = supabase
        .from('cars')
        .select('*')
        .eq('id', vehicleId);

      // Filter by organization_id if available, otherwise filter by user_id
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data: vehicle, error: vehicleError } = await query.maybeSingle();

      if (vehicleError) {
        console.error('Error loading vehicle:', vehicleError);
        setError('Failed to load vehicle');
        return;
      }

      if (!vehicle) {
        setError('Vehicle not found');
        return;
      }

      // Populate form with vehicle data
      setFormData({
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || new Date().getFullYear(),
        licensePlate: vehicle.license_plate || '',
        color: vehicle.color || '',
        category: vehicle.category || 'car',
        currentMileage: vehicle.current_mileage || 0,
        status: vehicle.status || 'available',
        hasGps: vehicle.has_gps || false,
        kteoLastDate: vehicle.kteo_last_date ? format(parseISO(vehicle.kteo_last_date), 'yyyy-MM-dd') : null,
        kteoExpiryDate: vehicle.kteo_expiry_date ? format(parseISO(vehicle.kteo_expiry_date), 'yyyy-MM-dd') : null,
        insuranceType: vehicle.insurance_type || 'basic',
        insuranceExpiryDate: vehicle.insurance_expiry_date ? format(parseISO(vehicle.insurance_expiry_date), 'yyyy-MM-dd') : null,
        insuranceCompany: vehicle.insurance_company || '',
        insurancePolicyNumber: vehicle.insurance_policy_number || '',
        insuranceHasMixedCoverage: vehicle.insurance_has_mixed_coverage || false,
        tiresFrontDate: vehicle.tires_front_date ? format(parseISO(vehicle.tires_front_date), 'yyyy-MM-dd') : null,
        tiresFrontBrand: vehicle.tires_front_brand || '',
        tiresRearDate: vehicle.tires_rear_date ? format(parseISO(vehicle.tires_rear_date), 'yyyy-MM-dd') : null,
        tiresRearBrand: vehicle.tires_rear_brand || '',
        tiresNextChangeDate: vehicle.tires_next_change_date ? format(parseISO(vehicle.tires_next_change_date), 'yyyy-MM-dd') : null,
        lastServiceDate: vehicle.last_service_date ? format(parseISO(vehicle.last_service_date), 'yyyy-MM-dd') : null,
        lastServiceMileage: vehicle.last_service_mileage || null,
        nextServiceMileage: vehicle.next_service_mileage || null,
        notes: vehicle.notes || '',
      });
    } catch (error: any) {
      console.error('Exception loading vehicle:', error);
      setError('Failed to load vehicle: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  function validateVehicle(): boolean {
    if (!formData.make?.trim()) {
      setError('Please enter the vehicle make');
      return false;
    }
    if (!formData.model?.trim()) {
      setError('Please enter the vehicle model');
      return false;
    }
    if (!formData.licensePlate?.trim()) {
      setError('Please enter the license plate');
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validateVehicle()) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated. Please log in first.');
      }

      // Get user's organization_id
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      const organizationId = userData?.organization_id;

      // Prepare vehicle update data
      const vehicleData: any = {
        make: formData.make,
        model: formData.model,
        year: formData.year,
        license_plate: formData.licensePlate.toUpperCase(),
        color: formData.color || null,
        category: formData.category,
        current_mileage: formData.currentMileage || 0,
        status: formData.status,
        has_gps: formData.hasGps,
        
        // KTEO
        kteo_last_date: formData.kteoLastDate || null,
        kteo_expiry_date: formData.kteoExpiryDate || null,
        
        // Insurance
        insurance_type: formData.insuranceType,
        insurance_expiry_date: formData.insuranceExpiryDate || null,
        insurance_company: formData.insuranceCompany || null,
        insurance_policy_number: formData.insurancePolicyNumber || null,
        insurance_has_mixed_coverage: formData.insuranceHasMixedCoverage,
        
        // Tires
        tires_front_date: formData.tiresFrontDate || null,
        tires_front_brand: formData.tiresFrontBrand || null,
        tires_rear_date: formData.tiresRearDate || null,
        tires_rear_brand: formData.tiresRearBrand || null,
        tires_next_change_date: formData.tiresNextChangeDate || null,
        
        // Service
        last_service_date: formData.lastServiceDate || null,
        last_service_mileage: formData.lastServiceMileage || null,
        next_service_mileage: formData.nextServiceMileage || null,
        
        notes: formData.notes || null,
      };

      // Build update query with organization filter
      let query = supabase
        .from('cars')
        .update(vehicleData)
        .eq('id', vehicleId);

      // Filter by organization_id if available, otherwise filter by user_id
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { error: updateError } = await query;

      if (updateError) {
        console.error('Error updating vehicle:', updateError);
        throw updateError;
      }

      setSuccess(true);

      // Redirect to vehicle details after a short delay
      setTimeout(() => {
        router.push(`/dashboard/fleet/${vehicleId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating vehicle:', err);
      setError(err.message || 'Failed to update vehicle. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading vehicle...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.make) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Vehicle not found</h3>
          <p className="text-gray-600 mb-4">{error}</p>
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
            <h1 className="text-xl font-bold text-gray-900">Edit Vehicle</h1>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content - Same form as new vehicle page */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Vehicle updated successfully!</p>
              <p className="text-sm text-green-700 mt-1">Redirecting to vehicle details...</p>
            </div>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
          {/* Same form sections as new vehicle page - copied from new/page.tsx */}
          {/* 1. Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">1. Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
                <input
                  type="text"
                  required
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Toyota"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Yaris"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate *</label>
                <input
                  type="text"
                  required
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="ABC-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year || ''}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2023"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="White"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="car">Car</option>
                  <option value="atv">ATV</option>
                  <option value="scooter">Scooter</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Mileage</label>
                <input
                  type="number"
                  min="0"
                  value={formData.currentMileage || ''}
                  onChange={(e) => setFormData({ ...formData, currentMileage: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="sold">Sold</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hasGps}
                    onChange={(e) => setFormData({ ...formData, hasGps: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">GPS Tracking Enabled</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. KTEO */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">2. KTEO</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last KTEO Date</label>
                <input
                  type="date"
                  value={formData.kteoLastDate || ''}
                  onChange={(e) => setFormData({ ...formData, kteoLastDate: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KTEO Expiry Date</label>
                <input
                  type="date"
                  value={formData.kteoExpiryDate || ''}
                  onChange={(e) => setFormData({ ...formData, kteoExpiryDate: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Insurance */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">3. Insurance</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="insuranceType"
                      value="basic"
                      checked={formData.insuranceType === 'basic'}
                      onChange={(e) => setFormData({ ...formData, insuranceType: 'basic' })}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Basic</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="insuranceType"
                      value="full"
                      checked={formData.insuranceType === 'full'}
                      onChange={(e) => setFormData({ ...formData, insuranceType: 'full' })}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Full</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.insuranceHasMixedCoverage}
                    onChange={(e) => setFormData({ ...formData, insuranceHasMixedCoverage: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Has Mixed Coverage</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Expiry Date</label>
                  <input
                    type="date"
                    value={formData.insuranceExpiryDate || ''}
                    onChange={(e) => setFormData({ ...formData, insuranceExpiryDate: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Company</label>
                  <input
                    type="text"
                    value={formData.insuranceCompany}
                    onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., National Insurance"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Policy Number</label>
                  <input
                    type="text"
                    value={formData.insurancePolicyNumber}
                    onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., POL123456"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Tires */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">4. Tires</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Front Tires Change Date</label>
                <input
                  type="date"
                  value={formData.tiresFrontDate || ''}
                  onChange={(e) => setFormData({ ...formData, tiresFrontDate: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Front Tires Brand</label>
                <input
                  type="text"
                  value={formData.tiresFrontBrand}
                  onChange={(e) => setFormData({ ...formData, tiresFrontBrand: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Michelin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rear Tires Change Date</label>
                <input
                  type="date"
                  value={formData.tiresRearDate || ''}
                  onChange={(e) => setFormData({ ...formData, tiresRearDate: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rear Tires Brand</label>
                <input
                  type="text"
                  value={formData.tiresRearBrand}
                  onChange={(e) => setFormData({ ...formData, tiresRearBrand: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Michelin"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Tires Change Date (Recommended)</label>
                <input
                  type="date"
                  value={formData.tiresNextChangeDate || ''}
                  onChange={(e) => setFormData({ ...formData, tiresNextChangeDate: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 5. Service */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">5. Service</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Service Date</label>
                <input
                  type="date"
                  value={formData.lastServiceDate || ''}
                  onChange={(e) => setFormData({ ...formData, lastServiceDate: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Service Mileage</label>
                <input
                  type="number"
                  min="0"
                  value={formData.lastServiceMileage || ''}
                  onChange={(e) => setFormData({ ...formData, lastServiceMileage: parseInt(e.target.value) || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="48000"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Service Mileage (km)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.nextServiceMileage || ''}
                  onChange={(e) => setFormData({ ...formData, nextServiceMileage: parseInt(e.target.value) || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="60000"
                />
              </div>
            </div>
          </div>

          {/* 6. Notes */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">6. Notes</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Add any additional notes about this vehicle..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pb-8">
            <button
              type="button"
              onClick={() => router.push('/dashboard/fleet')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

