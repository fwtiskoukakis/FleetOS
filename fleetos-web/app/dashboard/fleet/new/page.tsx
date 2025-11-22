'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { format } from 'date-fns';

export default function NewVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

      // Try to find organization_id from contracts/cars if not set
      let orgId = organizationId;
      if (!orgId) {
        const { data: contractData } = await supabase
          .from('contracts')
          .select('organization_id')
          .eq('user_id', user.id)
          .not('organization_id', 'is', null)
          .limit(1)
          .maybeSingle();
        
        if (contractData?.organization_id) {
          orgId = contractData.organization_id;
          // Update user's organization_id
          await supabase
            .from('users')
            .update({ organization_id: orgId })
            .eq('id', user.id);
        } else {
          // Try from cars
          const { data: carData } = await supabase
            .from('cars')
            .select('organization_id')
            .not('organization_id', 'is', null)
            .limit(1)
            .maybeSingle();
          
          if (carData?.organization_id) {
            orgId = carData.organization_id;
            await supabase
              .from('users')
              .update({ organization_id: orgId })
              .eq('id', user.id);
          }
        }
      }

      // Prepare vehicle data
      const vehicleData: any = {
        user_id: user.id,
        organization_id: orgId || null,
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

      // Save vehicle
      const { data: savedVehicle, error: saveError } = await supabase
        .from('cars')
        .insert(vehicleData)
        .select()
        .single();

      if (saveError) {
        console.error('Error saving vehicle:', saveError);
        throw saveError;
      }

      setSuccess(true);

      // Redirect to vehicle details after a short delay
      setTimeout(() => {
        router.push(`/dashboard/fleet/${savedVehicle.id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving vehicle:', err);
      setError(err.message || 'Failed to save vehicle. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
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
              <p className="text-sm font-medium text-green-800">Vehicle saved successfully!</p>
              <p className="text-sm text-green-700 mt-1">Redirecting to vehicle details...</p>
            </div>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
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
                  Save Vehicle
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

