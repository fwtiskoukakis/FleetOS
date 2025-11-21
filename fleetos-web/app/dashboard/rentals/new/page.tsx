'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { saveContract, type Contract, type RenterInfo, type RentalPeriod, type CarInfo, type CarCondition } from '@/lib/contract.service';
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
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

const LOCATION_OPTIONS = ['Piraeus Office', 'Piraeus Port', 'Athens Airport', 'Other'] as const;
type LocationOption = typeof LOCATION_OPTIONS[number];

export default function NewContractPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
  const [renterInfo, setRenterInfo] = useState<RenterInfo>({
    fullName: '',
    idNumber: '',
    taxId: '',
    driverLicenseNumber: '',
    phoneNumber: '',
    email: '',
    address: '',
  });
  
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>({
    pickupDate: new Date(),
    pickupTime: format(new Date(), 'HH:mm'),
    pickupLocation: 'Piraeus Office',
    dropoffDate: new Date(),
    dropoffTime: format(new Date(), 'HH:mm'),
    dropoffLocation: 'Piraeus Office',
    isDifferentDropoffLocation: false,
    totalCost: 0,
  });
  
  const [carInfo, setCarInfo] = useState<CarInfo>({
    makeModel: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    mileage: 0,
    category: '',
    color: '',
  });
  
  const [carCondition, setCarCondition] = useState<CarCondition>({
    fuelLevel: 100,
    insuranceType: 'basic',
    exteriorCondition: 'good',
    interiorCondition: 'good',
    mechanicalCondition: 'good',
    mileage: 0,
  });
  
  const [observations, setObservations] = useState('');
  
  // Load available cars
  useEffect(() => {
    loadCars();
  }, []);
  
  async function loadCars() {
    try {
      setLoadingCars(true);
      
      // Get user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAvailableCars([]);
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
        .select('id, make, model, license_plate, year, color, make_model, category')
        .eq('status', 'available')
        .order('license_plate', { ascending: true });

      // Filter by organization_id if available, otherwise filter by user_id
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        // Fallback to user_id if no organization_id
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading cars:', error);
        return;
      }
      
      setAvailableCars(data || []);
    } catch (error) {
      console.error('Exception loading cars:', error);
    } finally {
      setLoadingCars(false);
    }
  }
  
  function handleCarSelect(car: any) {
    const makeModel = car.make_model || `${car.make} ${car.model}`.trim();
    setSelectedCarId(car.id);
    setCarInfo({
      makeModel,
      make: car.make || '',
      model: car.model || '',
      year: car.year || new Date().getFullYear(),
      licensePlate: car.license_plate || '',
      mileage: 0,
      category: car.category || '',
      color: car.color || '',
    });
    setCarCondition(prev => ({
      ...prev,
      mileage: 0,
    }));
    setShowCarModal(false);
    setCarSearchQuery('');
  }
  
  function handlePickupLocationChange(option: LocationOption) {
    setPickupLocationOption(option);
    if (option !== 'Other') {
      setPickupCustomLocation('');
    }
    
    const location = option === 'Other' ? pickupCustomLocation : option;
    setRentalPeriod(prev => ({
      ...prev,
      pickupLocation: location,
      dropoffLocation: prev.isDifferentDropoffLocation ? prev.dropoffLocation : location,
    }));
    
    if (!rentalPeriod.isDifferentDropoffLocation) {
      setDropoffLocationOption(option);
      if (option !== 'Other') {
        setDropoffCustomLocation('');
      }
    }
  }
  
  function handleDropoffLocationChange(option: LocationOption) {
    setDropoffLocationOption(option);
    if (option !== 'Other') {
      setDropoffCustomLocation('');
    }
    
    const location = option === 'Other' ? dropoffCustomLocation : option;
    setRentalPeriod(prev => ({
      ...prev,
      dropoffLocation: location,
    }));
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
      setError('Παρακαλώ συμπληρώστε το ονοματεπώνυμο');
      return false;
    }
    if (!renterInfo.idNumber?.trim()) {
      setError('Παρακαλώ συμπληρώστε τον αριθμό ταυτότητας');
      return false;
    }
    if (!renterInfo.taxId?.trim()) {
      setError('Παρακαλώ συμπληρώστε τον ΑΦΜ');
      return false;
    }
    if (!renterInfo.driverLicenseNumber?.trim()) {
      setError('Παρακαλώ συμπληρώστε τον αριθμό διπλώματος οδήγησης');
      return false;
    }
    if (!renterInfo.phoneNumber?.trim()) {
      setError('Παρακαλώ συμπληρώστε τον αριθμό τηλεφώνου');
      return false;
    }
    if (!renterInfo.address?.trim()) {
      setError('Παρακαλώ συμπληρώστε τη διεύθυνση');
      return false;
    }
    if (!carInfo.licensePlate?.trim()) {
      setError('Παρακαλώ επιλέξτε ή συμπληρώστε την πινακίδα οχήματος');
      return false;
    }
    if (!rentalPeriod.pickupLocation?.trim()) {
      setError('Παρακαλώ συμπληρώστε την τοποθεσία παραλαβής');
      return false;
    }
    if (rentalPeriod.isDifferentDropoffLocation && !rentalPeriod.dropoffLocation?.trim()) {
      setError('Παρακαλώ συμπληρώστε την τοποθεσία επιστροφής');
      return false;
    }
    if (rentalPeriod.totalCost <= 0) {
      setError('Παρακαλώ συμπληρώστε το συνολικό κόστος');
      return false;
    }
    return true;
  }
  
  async function handleSaveContract() {
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Δεν είστε συνδεδεμένος. Παρακαλώ συνδεθείτε πρώτα.');
      }
      
      // Determine contract status based on dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pickupDate = new Date(rentalPeriod.pickupDate);
      pickupDate.setHours(0, 0, 0, 0);
      const dropoffDate = new Date(rentalPeriod.dropoffDate);
      dropoffDate.setHours(0, 0, 0, 0);
      
      let status: 'active' | 'completed' | 'upcoming' | 'pending';
      if (today < pickupDate) {
        status = 'upcoming';
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
      
      // Create contract object
      const contract: Contract = {
        userId: user.id,
        renterInfo,
        rentalPeriod: {
          ...rentalPeriod,
          pickupLocation: finalPickupLocation,
          dropoffLocation: finalDropoffLocation,
        },
        carInfo,
        carCondition,
        observations: observations || undefined,
        status,
      };
      
      // Save contract
      const savedContract = await saveContract(contract);
      
      setSuccess(true);
      
      // Redirect to contract details after a short delay
      setTimeout(() => {
        router.push(`/dashboard/rentals/${savedContract.id}`);
      }, 2000);
    } catch (err: any) {
      console.error('Error saving contract:', err);
      setError(err.message || 'Αποτυχία αποθήκευσης συμβολαίου. Παρακαλώ προσπαθήστε ξανά.');
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
                onClick={() => router.push('/dashboard/rentals')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>
            <h1 className="text-xl font-bold text-gray-900">New Contract</h1>
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
              <p className="text-sm font-medium text-green-800">Contract saved successfully!</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (ΑΦΜ) *</label>
                <input
                  type="text"
                  required
                  value={renterInfo.taxId}
                  onChange={(e) => setRenterInfo({ ...renterInfo, taxId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123456789"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver License Number *</label>
                <input
                  type="text"
                  required
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <textarea
                  required
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
                      required
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
                        required
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
              <h2 className="text-lg font-bold text-gray-900">3. Vehicle Information</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Vehicle *</label>
                <button
                  type="button"
                  onClick={() => setShowCarModal(true)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-50"
                >
                  {selectedCarId && carInfo.licensePlate ? (
                    <div>
                      <div className="font-medium text-gray-900">{carInfo.makeModel} - {carInfo.licensePlate}</div>
                      {carInfo.year && <div className="text-sm text-gray-500">Year: {carInfo.year}</div>}
                    </div>
                  ) : (
                    <span className="text-gray-500">Click to select a vehicle...</span>
                  )}
                </button>
              </div>
              
              {selectedCarId && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Make/Model</label>
                      <input
                        type="text"
                        value={carInfo.makeModel}
                        onChange={(e) => setCarInfo({ ...carInfo, makeModel: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Toyota Yaris"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">License Plate *</label>
                      <input
                        type="text"
                        required
                        value={carInfo.licensePlate}
                        onChange={(e) => setCarInfo({ ...carInfo, licensePlate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ABC-1234"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <input
                        type="number"
                        value={carInfo.year || ''}
                        onChange={(e) => setCarInfo({ ...carInfo, year: parseInt(e.target.value) || undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="2023"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                      <input
                        type="number"
                        value={carCondition.mileage || ''}
                        onChange={(e) => setCarCondition({ ...carCondition, mileage: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                </>
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
                  step="0.01"
                  min="0"
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
                  step="0.01"
                  min="0"
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
                  step="0.01"
                  min="0"
                  required
                  value={rentalPeriod.totalCost || ''}
                  onChange={(e) => setRentalPeriod({ ...rentalPeriod, totalCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Rental Period:</strong> {Math.ceil((new Date(rentalPeriod.dropoffDate).getTime() - new Date(rentalPeriod.pickupDate).getTime()) / (1000 * 60 * 60 * 24)) || 1} day(s)
              </p>
            </div>
          </div>
          
          {/* 5. Car Condition Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">5. Car Condition</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Level (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={carCondition.fuelLevel || 100}
                  onChange={(e) => setCarCondition({ ...carCondition, fuelLevel: parseInt(e.target.value) || 100 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Type</label>
                <select
                  value={carCondition.insuranceType}
                  onChange={(e) => setCarCondition({ ...carCondition, insuranceType: e.target.value as 'basic' | 'full' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="basic">Basic</option>
                  <option value="full">Full</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exterior Condition</label>
                <select
                  value={carCondition.exteriorCondition}
                  onChange={(e) => setCarCondition({ ...carCondition, exteriorCondition: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interior Condition</label>
                <select
                  value={carCondition.interiorCondition}
                  onChange={(e) => setCarCondition({ ...carCondition, interiorCondition: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mechanical Condition</label>
                <select
                  value={carCondition.mechanicalCondition}
                  onChange={(e) => setCarCondition({ ...carCondition, mechanicalCondition: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* 6. Observations Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">6. Observations / Notes</h2>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Add any observations or notes about this contract..."
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pb-8">
            <button
              type="button"
              onClick={() => router.push('/dashboard/rentals')}
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
                  Save Contract
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* Car Selection Modal */}
        {showCarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Select Vehicle</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCarModal(false);
                    setCarSearchQuery('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-4 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Search by license plate or model..."
                  value={carSearchQuery}
                  onChange={(e) => setCarSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="overflow-y-auto flex-1 p-4">
                {loadingCars ? (
                  <div className="text-center py-8">
                    <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-gray-600">Loading vehicles...</p>
                  </div>
                ) : filteredCars.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Car className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No vehicles found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCars.map((car) => {
                      const makeModel = car.make_model || `${car.make} ${car.model}`.trim();
                      const isSelected = selectedCarId === car.id;
                      return (
                        <button
                          key={car.id}
                          type="button"
                          onClick={() => handleCarSelect(car)}
                          className={`w-full text-left p-4 border rounded-lg transition-colors ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{makeModel}</div>
                              <div className="text-sm text-gray-500">{car.license_plate}</div>
                              {car.year && <div className="text-xs text-gray-400">Year: {car.year}</div>}
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCarModal(false);
                    setCarSearchQuery('');
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

