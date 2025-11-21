'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  ArrowLeft, 
  Save, 
  Car, 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format, parseISO } from 'date-fns';

const LOCATION_OPTIONS = ['Piraeus Office', 'Piraeus Port', 'Athens Airport', 'Other'] as const;
type LocationOption = typeof LOCATION_OPTIONS[number];

export default function EditContractPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Available cars for selection
  const [availableCars, setAvailableCars] = useState<any[]>([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [showCarModal, setShowCarModal] = useState(false);
  const [carSearchQuery, setCarSearchQuery] = useState('');
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  
  // Location options
  const [pickupLocationOption, setPickupLocationOption] = useState<LocationOption>('Piraeus Office');
  const [pickupCustomLocation, setPickupCustomLocation] = useState('');
  const [dropoffLocationOption, setDropoffLocationOption] = useState<LocationOption>('Piraeus Office');
  const [dropoffCustomLocation, setDropoffCustomLocation] = useState('');
  
  // Form state
  const [renterInfo, setRenterInfo] = useState({
    fullName: '',
    idNumber: '',
    taxId: '',
    driverLicenseNumber: '',
    phoneNumber: '',
    email: '',
    address: '',
  });
  
  const [rentalPeriod, setRentalPeriod] = useState({
    pickupDate: new Date(),
    pickupTime: '10:00',
    pickupLocation: 'Piraeus Office',
    dropoffDate: new Date(),
    dropoffTime: '10:00',
    dropoffLocation: 'Piraeus Office',
    isDifferentDropoffLocation: false,
    totalCost: 0,
    depositAmount: 0,
    insuranceCost: 0,
  });
  
  const [carInfo, setCarInfo] = useState({
    makeModel: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    mileage: 0,
    category: '',
    color: '',
  });
  
  const [carCondition, setCarCondition] = useState({
    fuelLevel: 100,
    insuranceType: 'basic',
    exteriorCondition: 'good',
    interiorCondition: 'good',
    mechanicalCondition: 'good',
    mileage: 0,
  });
  
  const [observations, setObservations] = useState('');
  
  useEffect(() => {
    if (contractId) {
      loadAvailableCars();
      loadContract();
    }
  }, [contractId]);

  // Set selected car after both contract and cars are loaded
  useEffect(() => {
    if (carInfo.licensePlate && availableCars.length > 0 && !selectedCarId && !loading) {
      const matchingCar = availableCars.find(c => 
        c.license_plate === carInfo.licensePlate
      );
      if (matchingCar) {
        setSelectedCarId(matchingCar.id);
      }
    }
  }, [carInfo.licensePlate, availableCars.length, selectedCarId, loading]);
  
  async function loadAvailableCars() {
    try {
      setLoadingCars(true);
      const organizationId = await getOrganizationId();
      if (!organizationId) {
        console.warn('No organization found for user, cannot load cars.');
        setAvailableCars([]);
        setLoadingCars(false);
        return;
      }

      // Load all cars (not just available) so we can edit contracts for rented cars too
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('organization_id', organizationId)
        .order('make', { ascending: true });

      if (error) throw error;
      setAvailableCars(data || []);
    } catch (error) {
      console.error('Error loading cars:', error);
    } finally {
      setLoadingCars(false);
    }
  }
  
  async function loadContract() {
    if (typeof contractId !== 'string') {
      setError('Invalid contract ID');
      return;
    }

    setLoading(true);
    try {
      const organizationId = await getOrganizationId();
      if (!organizationId) {
        setError('No organization found for user, cannot load contract.');
        setLoading(false);
        return;
      }

      // Load contract with organization filter
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (contractError) {
        console.error('Error loading contract:', contractError);
        setError('Failed to load contract');
        return;
      }
      
      if (!contractData) {
        setError('Contract not found');
        return;
      }
      
      // Populate form with contract data
      setRenterInfo({
        fullName: contractData.renter_full_name || '',
        idNumber: contractData.renter_id_number || '',
        taxId: contractData.renter_tax_id || '',
        driverLicenseNumber: contractData.renter_driver_license_number || '',
        phoneNumber: contractData.renter_phone_number || '',
        email: contractData.renter_email || '',
        address: contractData.renter_address || '',
      });
      
      const pickupDate = contractData.pickup_date ? parseISO(contractData.pickup_date) : new Date();
      const dropoffDate = contractData.dropoff_date ? parseISO(contractData.dropoff_date) : new Date();
      
      // Parse location
      const pickupLoc = contractData.pickup_location || 'Piraeus Office';
      const isCustomPickup = !LOCATION_OPTIONS.includes(pickupLoc as LocationOption);
      if (isCustomPickup) {
        setPickupLocationOption('Other');
        setPickupCustomLocation(pickupLoc);
      } else {
        setPickupLocationOption(pickupLoc as LocationOption);
      }
      
      const dropoffLoc = contractData.dropoff_location || contractData.pickup_location || 'Piraeus Office';
      const isDifferentDropoff = dropoffLoc !== pickupLoc;
      const isCustomDropoff = !LOCATION_OPTIONS.includes(dropoffLoc as LocationOption);
      
      setRentalPeriod({
        pickupDate,
        pickupTime: contractData.pickup_time || '10:00',
        pickupLocation: pickupLoc,
        dropoffDate,
        dropoffTime: contractData.dropoff_time || '10:00',
        dropoffLocation: dropoffLoc,
        isDifferentDropoffLocation: isDifferentDropoff,
        totalCost: contractData.total_cost || 0,
        depositAmount: contractData.deposit_amount || 0,
        insuranceCost: contractData.insurance_cost || 0,
      });
      
      if (isCustomDropoff && isDifferentDropoff) {
        setDropoffLocationOption('Other');
        setDropoffCustomLocation(dropoffLoc);
      } else if (isDifferentDropoff) {
        setDropoffLocationOption(dropoffLoc as LocationOption);
      } else {
        setDropoffLocationOption(isCustomPickup ? 'Other' : (pickupLoc as LocationOption));
      }
      
      setCarInfo({
        makeModel: contractData.car_make_model || '',
        make: contractData.car_make || '',
        model: contractData.car_model || '',
        year: contractData.car_year || new Date().getFullYear(),
        licensePlate: contractData.car_license_plate || '',
        mileage: contractData.car_mileage || 0,
        category: contractData.car_category || '',
        color: contractData.car_color || '',
      });
      
      setCarCondition({
        fuelLevel: contractData.fuel_level ?? 100,
        insuranceType: contractData.insurance_type || 'basic',
        exteriorCondition: contractData.exterior_condition || 'good',
        interiorCondition: contractData.interior_condition || 'good',
        mechanicalCondition: contractData.mechanical_condition || 'good',
        mileage: contractData.car_mileage || 0,
      });
      
      setObservations(contractData.observations || '');
      
      // Set selected car ID if we can find it by license plate
      // This will be handled after cars are loaded in a separate effect
    } catch (error: any) {
      console.error('Exception loading contract:', error);
      setError('Failed to load contract: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }
  
  function handlePickupLocationChange(value: LocationOption) {
    setPickupLocationOption(value);
    if (value !== 'Other') {
      setPickupCustomLocation('');
      setRentalPeriod(prev => ({ ...prev, pickupLocation: value }));
    }
  }
  
  function handleDropoffLocationChange(value: LocationOption) {
    setDropoffLocationOption(value);
    if (value !== 'Other') {
      setDropoffCustomLocation('');
      setRentalPeriod(prev => ({ 
        ...prev, 
        dropoffLocation: value,
        isDifferentDropoffLocation: value !== pickupLocationOption
      }));
    }
  }
  
  function handleCarSelect(car: any) {
    setSelectedCarId(car.id);
    setCarInfo({
      makeModel: car.make_model || `${car.make || ''} ${car.model || ''}`.trim() || 'Unknown',
      make: car.make || '',
      model: car.model || '',
      year: car.year || new Date().getFullYear(),
      licensePlate: car.license_plate || '',
      mileage: car.current_mileage || 0,
      category: car.category || '',
      color: car.color || '',
    });
    setCarCondition(prev => ({
      ...prev,
      mileage: car.current_mileage || 0,
    }));
    setShowCarModal(false);
    setCarSearchQuery('');
  }
  
  function calculateTotalCost() {
    const pickup = new Date(rentalPeriod.pickupDate);
    const dropoff = new Date(rentalPeriod.dropoffDate);
    const days = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    
    // Basic calculation - you can enhance this with pricing logic
    const dailyRate = 50; // Default rate
    const total = days * dailyRate + (rentalPeriod.depositAmount || 0) + (rentalPeriod.insuranceCost || 0);
    
    setRentalPeriod(prev => ({
      ...prev,
      totalCost: total,
    }));
  }
  
  useEffect(() => {
    if (rentalPeriod.pickupDate && rentalPeriod.dropoffDate) {
      calculateTotalCost();
    }
  }, [rentalPeriod.pickupDate, rentalPeriod.dropoffDate, rentalPeriod.depositAmount, rentalPeriod.insuranceCost]);
  
  function validateContract(): boolean {
    if (!renterInfo.fullName?.trim()) {
      setError('Please enter the renter\'s full name');
      return false;
    }
    if (!renterInfo.idNumber?.trim()) {
      setError('Please enter the ID number');
      return false;
    }
    if (!carInfo.licensePlate?.trim()) {
      setError('Please select or enter the vehicle license plate');
      return false;
    }
    if (!rentalPeriod.pickupLocation?.trim()) {
      setError('Please enter the pickup location');
      return false;
    }
    if (rentalPeriod.isDifferentDropoffLocation && !rentalPeriod.dropoffLocation?.trim()) {
      setError('Please enter the dropoff location');
      return false;
    }
    return true;
  }
  
  async function handleSaveContract() {
    if (!validateContract()) {
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
      
      const organizationId = await getOrganizationId(user.id);
      if (!organizationId) {
        alert('Error: No organization found for your account. Cannot save contract.');
        setSaving(false);
        return;
      }

      // Determine contract status based on dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pickupDate = new Date(rentalPeriod.pickupDate);
      pickupDate.setHours(0, 0, 0, 0);
      const dropoffDate = new Date(rentalPeriod.dropoffDate);
      dropoffDate.setHours(0, 0, 0, 0);
      
      let status: 'active' | 'completed' | 'pending' | 'cancelled';
      if (today < pickupDate) {
        status = 'pending'; // Upcoming contracts are stored as 'pending'
      } else if (today > dropoffDate) {
        status = 'completed';
      } else if (today >= pickupDate && today <= dropoffDate) {
        status = 'active';
      } else {
        status = 'pending';
      }
      
      // Resolve final locations
      const finalPickupLocation = pickupLocationOption === 'Other' ? pickupCustomLocation : pickupLocationOption;
      const finalDropoffLocation = rentalPeriod.isDifferentDropoffLocation
        ? (dropoffLocationOption === 'Other' ? dropoffCustomLocation : dropoffLocationOption)
        : finalPickupLocation;
      
      // Prepare contract update data
      const contractData: any = {
        renter_full_name: renterInfo.fullName,
        renter_id_number: renterInfo.idNumber || null,
        renter_tax_id: renterInfo.taxId || null,
        renter_driver_license_number: renterInfo.driverLicenseNumber || null,
        renter_phone_number: renterInfo.phoneNumber || null,
        renter_email: renterInfo.email || null,
        renter_address: renterInfo.address || null,
        
        pickup_date: rentalPeriod.pickupDate.toISOString().split('T')[0],
        pickup_time: rentalPeriod.pickupTime,
        pickup_location: finalPickupLocation,
        dropoff_date: rentalPeriod.dropoffDate.toISOString().split('T')[0],
        dropoff_time: rentalPeriod.dropoffTime,
        dropoff_location: finalDropoffLocation,
        
        car_make_model: carInfo.makeModel || `${carInfo.make} ${carInfo.model}`.trim(),
        car_make: carInfo.make || null,
        car_model: carInfo.model || null,
        car_year: carInfo.year || null,
        car_license_plate: carInfo.licensePlate.toUpperCase(),
        car_category: carInfo.category || null,
        car_color: carInfo.color || null,
        car_mileage: carCondition.mileage || 0,
        
        fuel_level: carCondition.fuelLevel ?? 100,
        insurance_type: carCondition.insuranceType || 'basic',
        exterior_condition: carCondition.exteriorCondition || 'good',
        interior_condition: carCondition.interiorCondition || 'good',
        mechanical_condition: carCondition.mechanicalCondition || 'good',
        
        total_cost: rentalPeriod.totalCost || 0,
        deposit_amount: rentalPeriod.depositAmount || 0,
        insurance_cost: rentalPeriod.insuranceCost || 0,
        observations: observations || null,
        status,
        updated_at: new Date().toISOString(),
      };
      
      // Update contract with organization filter
      const { error: updateError } = await supabase
        .from('contracts')
        .update(contractData)
        .eq('id', contractId)
        .eq('organization_id', organizationId);
      
      if (updateError) {
        console.error('Error updating contract:', updateError);
        throw updateError;
      }
      
      setSuccess(true);
      
      // Redirect to contract details after a short delay
      setTimeout(() => {
        router.push(`/dashboard/rentals/${contractId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating contract:', err);
      setError(err.message || 'Failed to update contract. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  
  const filteredCars = availableCars.filter(car => {
    if (!carSearchQuery.trim()) return true;
    const query = carSearchQuery.toLowerCase();
    return (
      car.license_plate?.toLowerCase().includes(query) ||
      car.make_model?.toLowerCase().includes(query) ||
      `${car.make} ${car.model}`.toLowerCase().includes(query)
    );
  });
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (error && !renterInfo.fullName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Contract not found</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard/rentals')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Rentals
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
              <Link href="/dashboard/rentals">
                <FleetOSLogo variant="icon" size={40} />
              </Link>
              <button
                onClick={() => router.push(`/dashboard/rentals/${contractId}`)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Edit Contract</h1>
            <div className="w-24" /> {/* Spacer for centering */}
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
            <Link href="/dashboard/fleet" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Fleet
            </Link>
            <Link href="/dashboard/rentals" className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600">
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
      
      {/* Main Content - Same form as new contract page */}
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
              <p className="text-sm font-medium text-green-800">Contract updated successfully!</p>
              <p className="text-sm text-green-700 mt-1">Redirecting to contract details...</p>
            </div>
          </div>
        )}
        
        <form onSubmit={async (e) => { 
          e.preventDefault(); 
          if (validateContract()) {
            await handleSaveContract();
          }
        }} className="space-y-6">
          {/* All form sections from new contract page - copied exactly */}
          {/* 1. Renter Info Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">1. Renter Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={renterInfo.fullName}
                  onChange={(e) => setRenterInfo({ ...renterInfo, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                <input
                  type="text"
                  required
                  value={renterInfo.idNumber}
                  onChange={(e) => setRenterInfo({ ...renterInfo, idNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AA123456"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (ΑΦΜ)</label>
                <input
                  type="text"
                  value={renterInfo.taxId}
                  onChange={(e) => setRenterInfo({ ...renterInfo, taxId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123456789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver License Number</label>
                <input
                  type="text"
                  value={renterInfo.driverLicenseNumber}
                  onChange={(e) => setRenterInfo({ ...renterInfo, driverLicenseNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DL123456"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={renterInfo.phoneNumber}
                  onChange={(e) => setRenterInfo({ ...renterInfo, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+30 123 456 7890"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={renterInfo.email}
                  onChange={(e) => setRenterInfo({ ...renterInfo, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="customer@example.com"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={renterInfo.address}
                  onChange={(e) => setRenterInfo({ ...renterInfo, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Street address, City, Country"
                />
              </div>
            </div>
          </div>
          
          {/* 2. Rental Period Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">2. Rental Period</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date *</label>
                <input
                  type="date"
                  required
                  value={format(rentalPeriod.pickupDate, 'yyyy-MM-dd')}
                  onChange={(e) => setRentalPeriod({ ...rentalPeriod, pickupDate: new Date(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time *</label>
                <input
                  type="time"
                  required
                  value={rentalPeriod.pickupTime}
                  onChange={(e) => setRentalPeriod({ ...rentalPeriod, pickupTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location *</label>
                <select
                  required
                  value={pickupLocationOption}
                  onChange={(e) => handlePickupLocationChange(e.target.value as LocationOption)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LOCATION_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {pickupLocationOption === 'Other' && (
                  <input
                    type="text"
                    required
                    value={pickupCustomLocation}
                    onChange={(e) => {
                      setPickupCustomLocation(e.target.value);
                      setRentalPeriod(prev => ({ ...prev, pickupLocation: e.target.value }));
                    }}
                    className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Custom pickup location"
                  />
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dropoff Date *</label>
                <input
                  type="date"
                  required
                  value={format(rentalPeriod.dropoffDate, 'yyyy-MM-dd')}
                  onChange={(e) => setRentalPeriod({ ...rentalPeriod, dropoffDate: new Date(e.target.value) })}
                  min={format(rentalPeriod.pickupDate, 'yyyy-MM-dd')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dropoff Time *</label>
                <input
                  type="time"
                  required
                  value={rentalPeriod.dropoffTime}
                  onChange={(e) => setRentalPeriod({ ...rentalPeriod, dropoffTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={rentalPeriod.isDifferentDropoffLocation}
                    onChange={(e) => setRentalPeriod({ ...rentalPeriod, isDifferentDropoffLocation: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Different dropoff location</span>
                </label>
                {rentalPeriod.isDifferentDropoffLocation && (
                  <>
                    <select
                      value={dropoffLocationOption}
                      onChange={(e) => handleDropoffLocationChange(e.target.value as LocationOption)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {LOCATION_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {dropoffLocationOption === 'Other' && (
                      <input
                        type="text"
                        value={dropoffCustomLocation}
                        onChange={(e) => {
                          setDropoffCustomLocation(e.target.value);
                          setRentalPeriod(prev => ({ ...prev, dropoffLocation: e.target.value }));
                        }}
                        className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Custom dropoff location"
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* 3. Vehicle Selection Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">3. Vehicle Selection</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={carInfo.licensePlate}
                    onChange={(e) => setCarInfo({ ...carInfo, licensePlate: e.target.value.toUpperCase() })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder="ABC-1234"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCarModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Select Vehicle
                  </button>
                </div>
              </div>
              
              {carInfo.licensePlate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make/Model</label>
                    <input
                      type="text"
                      value={carInfo.makeModel}
                      onChange={(e) => setCarInfo({ ...carInfo, makeModel: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Toyota Yaris"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="number"
                      value={carInfo.year || ''}
                      onChange={(e) => setCarInfo({ ...carInfo, year: parseInt(e.target.value) || new Date().getFullYear() })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2023"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                    <input
                      type="number"
                      value={carCondition.mileage || ''}
                      onChange={(e) => {
                        const mileage = parseInt(e.target.value) || 0;
                        setCarCondition({ ...carCondition, mileage });
                        setCarInfo({ ...carInfo, mileage });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="50000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Level (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={carCondition.fuelLevel || ''}
                      onChange={(e) => setCarCondition({ ...carCondition, fuelLevel: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="100"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 4. Pricing Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">4. Pricing</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rentalPeriod.depositAmount || ''}
                  onChange={(e) => setRentalPeriod({ ...rentalPeriod, depositAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Cost</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rentalPeriod.insuranceCost || ''}
                  onChange={(e) => setRentalPeriod({ ...rentalPeriod, insuranceCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={rentalPeriod.totalCost || ''}
                  onChange={(e) => setRentalPeriod({ ...rentalPeriod, totalCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          
          {/* 5. Observations Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">5. Observations</h2>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Additional notes or observations..."
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pb-8">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/rentals/${contractId}`)}
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
      
      {/* Vehicle Selection Modal */}
      {showCarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Select Vehicle</h3>
              <button
                onClick={() => {
                  setShowCarModal(false);
                  setCarSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                value={carSearchQuery}
                onChange={(e) => setCarSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by license plate, make, or model..."
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {loadingCars ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600">Loading vehicles...</p>
                </div>
              ) : filteredCars.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No vehicles found</p>
              ) : (
                <div className="space-y-2">
                  {filteredCars.map((car) => (
                    <button
                      key={car.id}
                      type="button"
                      onClick={() => handleCarSelect(car)}
                      className={`w-full p-4 border rounded-lg text-left hover:bg-gray-50 transition-colors ${
                        selectedCarId === car.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {car.make_model || `${car.make || ''} ${car.model || ''}`.trim() || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-600">{car.license_plate || 'No plate'}</p>
                          {car.year && <p className="text-xs text-gray-500">{car.year}</p>}
                        </div>
                        {car.status && (
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            car.status === 'available' ? 'bg-green-100 text-green-800' :
                            car.status === 'rented' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {car.status}
                          </span>
                        )}
                      </div>
                    </button>
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

