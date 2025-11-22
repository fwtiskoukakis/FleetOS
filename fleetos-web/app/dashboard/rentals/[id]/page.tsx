'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getActualContractStatus, getStatusColor, getStatusLabel } from '@/lib/contract-utils';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  MapPin, 
  Clock, 
  Car, 
  User, 
  DollarSign,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  Signature,
  X
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format, parseISO, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { formatDate, formatCurrency } from '@/lib/utils';
import { PhotoStorageService } from '@/lib/photo-storage.service';
import { saveContract, type Contract, type RenterInfo, type RentalPeriod, type CarInfo, type CarCondition } from '@/lib/contract.service';

export default function ContractDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [damagePoints, setDamagePoints] = useState<any[]>([]);
  const [contractPhotos, setContractPhotos] = useState<string[]>([]);
  const [clientSignature, setClientSignature] = useState<string>('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Renew contract state
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewPickupDate, setRenewPickupDate] = useState<Date>(new Date());
  const [renewDropoffDate, setRenewDropoffDate] = useState<Date>(new Date());
  const [renewPickupTime, setRenewPickupTime] = useState<string>('10:00');
  const [renewDropoffTime, setRenewDropoffTime] = useState<string>('10:00');
  const [renewTotalCost, setRenewTotalCost] = useState<string>('0');
  const [renewDepositAmount, setRenewDepositAmount] = useState<string>('0');
  const [renewInsuranceCost, setRenewInsuranceCost] = useState<string>('0');
  const [renewNotes, setRenewNotes] = useState<string>('');
  const [copyPhotos, setCopyPhotos] = useState<boolean>(false);
  const [copySignature, setCopySignature] = useState<boolean>(false);
  const [isRenewing, setIsRenewing] = useState<boolean>(false);
  const [showRenewPickupDatePicker, setShowRenewPickupDatePicker] = useState<boolean>(false);
  const [showRenewDropoffDatePicker, setShowRenewDropoffDatePicker] = useState<boolean>(false);
  
  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);
  
  async function loadContract() {
    try {
      setLoading(true);
      
      // Get user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
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
        .from('contracts')
        .select('*')
        .eq('id', contractId);

      // Filter by organization_id if available, otherwise filter by user_id
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        // Fallback to user_id if no organization_id
        query = query.eq('user_id', user.id);
      }

      const { data: contractData, error: contractError } = await query.maybeSingle();
      
      if (contractError) {
        console.error('Error loading contract:', contractError);
        alert('Failed to load contract');
        router.push('/dashboard/rentals');
        return;
      }
      
      if (!contractData) {
        alert('Contract not found');
        router.push('/dashboard/rentals');
        return;
      }
      
      setContract(contractData);
      
      // Load damage points
      const { data: damageData, error: damageError } = await supabase
        .from('damage_points')
        .select('*')
        .eq('contract_id', contractId);
      
      if (!damageError && damageData) {
        setDamagePoints(damageData);
      }
      
      // Load contract photos
      const { PhotoStorageService } = await import('@/lib/photo-storage.service');
      try {
        const photos = await PhotoStorageService.getContractPhotos(contractId);
        const photoUrls = photos.map(photo => photo.photo_url).filter(Boolean);
        setContractPhotos(photoUrls);
      } catch (error) {
        console.error('Error loading contract photos:', error);
      }
      
      // Load client signature if available
      if (contractData.client_signature_url) {
        setClientSignature(contractData.client_signature_url);
      }
    } catch (error) {
      console.error('Exception loading contract:', error);
      alert('Failed to load contract');
      router.push('/dashboard/rentals');
    } finally {
      setLoading(false);
    }
  }
  
  async function handleDelete() {
    if (!contract) return;
    
    if (!confirm(`Are you sure you want to delete this contract? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setDeleting(true);
      
      // Delete damage points first
      if (damagePoints.length > 0) {
        await supabase
          .from('damage_points')
          .delete()
          .eq('contract_id', contractId);
      }
      
      // Delete contract
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);
      
      if (error) throw error;
      
      alert('Contract deleted successfully');
      router.push('/dashboard/rentals');
    } catch (error: any) {
      console.error('Error deleting contract:', error);
      alert('Failed to delete contract: ' + (error.message || 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  }
  
  function calculateRentalDays() {
    if (!contract) return 0;
    try {
      const pickup = parseISO(contract.pickup_date);
      const dropoff = parseISO(contract.dropoff_date);
      return Math.ceil(differenceInDays(dropoff, pickup)) || 1;
    } catch {
      return 1;
    }
  }
  
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
  
  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Contract not found</h3>
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
  
  const actualStatus = getActualContractStatus(contract);
  const statusColor = getStatusColor(actualStatus);
  const rentalDays = calculateRentalDays();
  
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
            <h1 className="text-xl font-bold text-gray-900">Contract Details</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/dashboard/rentals/${contractId}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit size={16} />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
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
        {/* AADE Status Badge */}
        {contract.aade_status && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              {contract.aade_status === 'submitted' || contract.aade_status === 'completed' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-600 capitalize">AADE: {contract.aade_status}</p>
                    {contract.aade_dcl_id && (
                      <p className="text-xs text-gray-600 mt-1">DCL ID: {contract.aade_dcl_id}</p>
                    )}
                  </div>
                </>
              ) : contract.aade_status === 'failed' ? (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm font-semibold text-red-600 capitalize">AADE: {contract.aade_status}</p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm font-semibold text-yellow-600 capitalize">AADE: {contract.aade_status}</p>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Contract Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Contract #{contract.contract_number || contractId.slice(0, 8).toUpperCase()}
              </h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: statusColor }} />
                <span className={`text-sm font-semibold uppercase px-2 py-1 rounded-lg`} style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
                  {getStatusLabel(actualStatus)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Created</p>
              <p className="text-lg font-bold text-gray-900">
                {contract.created_at ? format(parseISO(contract.created_at), 'dd MMM yyyy', { locale: el }) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Renter Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Renter Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
              <p className="text-base font-semibold text-gray-900">{contract.renter_full_name || 'N/A'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">ID Number</label>
              <p className="text-base text-gray-900">{contract.renter_id_number || 'N/A'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone
              </label>
              <p className="text-base text-gray-900">
                {contract.renter_phone_number ? (
                  <a href={`tel:${contract.renter_phone_number}`} className="text-blue-600 hover:text-blue-800">
                    {contract.renter_phone_number}
                  </a>
                ) : 'N/A'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <p className="text-base text-gray-900">
                {contract.renter_email ? (
                  <a href={`mailto:${contract.renter_email}`} className="text-blue-600 hover:text-blue-800">
                    {contract.renter_email}
                  </a>
                ) : 'N/A'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Driver License</label>
              <p className="text-base text-gray-900">{contract.renter_driver_license_number || 'N/A'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Tax ID (ΑΦΜ)</label>
              <p className="text-base text-gray-900">{contract.renter_tax_id || 'N/A'}</p>
            </div>
            
            {contract.renter_address && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                <p className="text-base text-gray-900">{contract.renter_address}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Rental Period */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Rental Period</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Pickup Date & Time</label>
              <div className="flex items-center gap-2 text-base text-gray-900">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{format(parseISO(contract.pickup_date), 'dd MMM yyyy', { locale: el })}</span>
                <Clock className="w-4 h-4 text-gray-500 ml-2" />
                <span>{contract.pickup_time || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{contract.pickup_location || 'N/A'}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Dropoff Date & Time</label>
              <div className="flex items-center gap-2 text-base text-gray-900">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{format(parseISO(contract.dropoff_date), 'dd MMM yyyy', { locale: el })}</span>
                <Clock className="w-4 h-4 text-gray-500 ml-2" />
                <span>{contract.dropoff_time || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{contract.dropoff_location || contract.pickup_location || 'N/A'}</span>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">
                  Rental Duration: <strong>{rentalDays} {rentalDays === 1 ? 'day' : 'days'}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Vehicle Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Vehicle Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Make/Model</label>
              <p className="text-base font-semibold text-gray-900">{contract.car_make_model || 'N/A'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">License Plate</label>
              <p className="text-base text-gray-900">{contract.car_license_plate || 'N/A'}</p>
            </div>
            
            {contract.car_year && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Year</label>
                <p className="text-base text-gray-900">{contract.car_year}</p>
              </div>
            )}
            
            {contract.car_color && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Color</label>
                <p className="text-base text-gray-900">{contract.car_color}</p>
              </div>
            )}
            
            {contract.car_mileage && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Mileage</label>
                <p className="text-base text-gray-900">{contract.car_mileage.toLocaleString()} km</p>
              </div>
            )}
            
            {contract.fuel_level !== null && contract.fuel_level !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Fuel Level</label>
                <p className="text-base text-gray-900">
                  {contract.fuel_level > 8 
                    ? `${contract.fuel_level}%` 
                    : `${contract.fuel_level}/8`} {/* Display 0-8 scale or legacy percentage */}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Car Condition */}
        {(contract.exterior_condition || contract.interior_condition || contract.mechanical_condition) && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Car Condition</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contract.exterior_condition && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Exterior</label>
                  <p className="text-base text-gray-900">{contract.exterior_condition.charAt(0).toUpperCase() + contract.exterior_condition.slice(1)}</p>
                </div>
              )}
              
              {contract.interior_condition && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Interior</label>
                  <p className="text-base text-gray-900">{contract.interior_condition.charAt(0).toUpperCase() + contract.interior_condition.slice(1)}</p>
                </div>
              )}
              
              {contract.mechanical_condition && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mechanical</label>
                  <p className="text-base text-gray-900">{contract.mechanical_condition.charAt(0).toUpperCase() + contract.mechanical_condition.slice(1)}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Damage Points - List View (matches mobile app exactly) */}
        {damagePoints.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-bold text-gray-900">Damage Points ({damagePoints.length})</h2>
            </div>
            
            <div className="space-y-3">
              {damagePoints.map((damage, index) => {
                const markerTypeLabels: Record<string, string> = {
                  'slight-scratch': 'Slight Scratch',
                  'heavy-scratch': 'Heavy Scratch',
                  'bent': 'Bent',
                  'broken': 'Broken'
                };
                const markerLabel = damage.marker_type ? markerTypeLabels[damage.marker_type] : 'Damage';
                
                return (
                  <div key={damage.id || index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {markerLabel} - {damage.description || (damage.view_side || 'Unknown')} ({damage.severity || 'minor'})
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Pricing */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Pricing</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contract.deposit_amount > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Deposit</label>
                <p className="text-lg font-semibold text-gray-900">€{contract.deposit_amount.toFixed(2)}</p>
              </div>
            )}
            
            {contract.insurance_cost > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Insurance</label>
                <p className="text-lg font-semibold text-gray-900">€{contract.insurance_cost.toFixed(2)}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Total Cost</label>
              <p className="text-2xl font-bold text-blue-600">€{(contract.total_cost || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        {/* AADE Status */}
        {contract.aade_status && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">AADE Status</h2>
            </div>
            
            <div className="flex items-center gap-3">
              {contract.aade_status === 'submitted' || contract.aade_status === 'completed' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-base font-semibold text-gray-900 capitalize">{contract.aade_status}</p>
                </>
              ) : contract.aade_status === 'failed' ? (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <p className="text-base font-semibold text-gray-900 capitalize">{contract.aade_status}</p>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <p className="text-base font-semibold text-gray-900 capitalize">{contract.aade_status}</p>
                </>
              )}
              {contract.aade_dcl_id && (
                <span className="text-sm text-gray-600">DCL ID: {contract.aade_dcl_id}</span>
              )}
            </div>
          </div>
        )}
        
        {/* Contract Photos */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Contract Photos</h2>
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
              {contractPhotos.length}
            </span>
          </div>
          
          {contractPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {contractPhotos.map((photoUrl, index) => (
                <div
                  key={index}
                  className="relative group cursor-pointer"
                  onClick={() => {
                    setSelectedPhoto(photoUrl);
                    setShowPhotoModal(true);
                  }}
                >
                  <img
                    src={photoUrl}
                    alt={`Contract photo ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-300 hover:opacity-80 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-opacity flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No photos added yet</p>
            </div>
          )}
        </div>
        
        {/* Client Signature */}
        {clientSignature && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Signature className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Client Signature</h2>
            </div>
            
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
              <img
                src={clientSignature}
                alt="Client signature"
                className="w-full h-48 object-contain bg-white rounded border border-gray-200"
              />
            </div>
          </div>
        )}
        
        {/* Observations */}
        {contract.observations && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Observations</h2>
            </div>
            <p className="text-base text-gray-900 whitespace-pre-wrap">{contract.observations}</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleOpenRenewModal}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <RefreshCw size={18} />
            Renew Contract
          </button>
          <button
            onClick={() => router.push(`/dashboard/rentals/${contractId}/edit`)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit size={18} />
            Edit Contract
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </main>
      
      {/* Renew Contract Modal */}
      {renewModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Renew Contract</h2>
              <button
                onClick={handleCloseRenewModal}
                disabled={isRenewing}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Rental Period */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">Rental Period</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Pickup</label>
                    <button
                      type="button"
                      onClick={() => setShowRenewPickupDatePicker(true)}
                      disabled={isRenewing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-left text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      {format(renewPickupDate, 'dd/MM/yyyy')}
                    </button>
                    {showRenewPickupDatePicker && (
                      <input
                        type="date"
                        value={format(renewPickupDate, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          setRenewPickupDate(date);
                          setShowRenewPickupDatePicker(false);
                          if (date > renewDropoffDate) {
                            const newDropoff = new Date(date);
                            newDropoff.setMonth(newDropoff.getMonth() + 1);
                            setRenewDropoffDate(newDropoff);
                          }
                        }}
                        className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    )}
                    <input
                      type="time"
                      value={renewPickupTime}
                      onChange={(e) => setRenewPickupTime(e.target.value)}
                      disabled={isRenewing}
                      className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Dropoff</label>
                    <button
                      type="button"
                      onClick={() => setShowRenewDropoffDatePicker(true)}
                      disabled={isRenewing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-left text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      {format(renewDropoffDate, 'dd/MM/yyyy')}
                    </button>
                    {showRenewDropoffDatePicker && (
                      <input
                        type="date"
                        value={format(renewDropoffDate, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          if (date <= renewPickupDate) {
                            alert('Dropoff date must be after pickup date');
                            return;
                          }
                          setRenewDropoffDate(date);
                          setShowRenewDropoffDatePicker(false);
                        }}
                        className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    )}
                    <input
                      type="time"
                      value={renewDropoffTime}
                      onChange={(e) => setRenewDropoffTime(e.target.value)}
                      disabled={isRenewing}
                      className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
              
              {/* Pricing */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">Pricing</h3>
                <div className="space-y-3">
                  <input
                    type="number"
                    value={renewTotalCost}
                    onChange={(e) => setRenewTotalCost(e.target.value)}
                    placeholder="Total Cost (€)"
                    disabled={isRenewing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  />
                  <input
                    type="number"
                    value={renewDepositAmount}
                    onChange={(e) => setRenewDepositAmount(e.target.value)}
                    placeholder="Deposit (€)"
                    disabled={isRenewing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  />
                  <input
                    type="number"
                    value={renewInsuranceCost}
                    onChange={(e) => setRenewInsuranceCost(e.target.value)}
                    placeholder="Insurance Cost (€)"
                    disabled={isRenewing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  />
                </div>
              </div>
              
              {/* Toggles */}
              <div className="mb-6 border border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Copy Photos</p>
                    <p className="text-xs text-gray-600">Use the same photos as the original contract</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copyPhotos}
                      onChange={(e) => setCopyPhotos(e.target.checked)}
                      disabled={isRenewing}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Copy Signature</p>
                    <p className="text-xs text-gray-600">Keep the existing client signature</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copySignature}
                      onChange={(e) => setCopySignature(e.target.checked)}
                      disabled={isRenewing}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                  </label>
                </div>
              </div>
              
              {/* Notes */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">Notes</h3>
                <textarea
                  value={renewNotes}
                  onChange={(e) => setRenewNotes(e.target.value)}
                  placeholder="Add notes for the renewal (optional)"
                  rows={3}
                  disabled={isRenewing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                />
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex items-center gap-4 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseRenewModal}
                disabled={isRenewing}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRenewContract}
                disabled={isRenewing}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRenewing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Create Renewal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Photo Modal */}
      {showPhotoModal && selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 z-10"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <img
              src={selectedPhoto}
              alt="Full size photo"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

