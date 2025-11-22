'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { Users, Mail, Phone, Edit, Save, X, ArrowLeft, Calendar, FileText, DollarSign, Clock, MessageSquare, Star, Ban, CheckCircle2 } from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

interface RentalHistoryItem {
  id: string;
  vehicle: string;
  date: string;
  cost: number;
  duration: number;
}

interface CommunicationHistoryItem {
  id: string;
  communication_type: 'email' | 'sms' | 'phone' | 'other';
  message: string;
  created_at: string;
}

interface CustomerHistory {
  rentals: RentalHistoryItem[];
  communications: CommunicationHistoryItem[];
}

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory>({ rentals: [], communications: [] });
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_primary: '',
    id_number: '',
    address: '',
    driver_license_number: '',
    notes: '',
    vip_status: false,
    blacklist_status: false,
  });

  useEffect(() => {
    if (customerId) {
      loadCustomer();
      loadCustomerHistory();
    }
  }, [customerId]);

  async function loadCustomer() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      // Try to load from customer_profiles first
      let query = supabase
        .from('customer_profiles')
        .select('*')
        .eq('id', customerId);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: profileData, error: profileError } = await query.maybeSingle();

      if (profileData) {
        setCustomer(profileData);
        setFormData({
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          phone_primary: profileData.phone_primary || '',
          id_number: profileData.id_number || '',
          address: profileData.address || '',
          driver_license_number: profileData.driver_license_number || '',
          notes: profileData.notes || '',
          vip_status: profileData.vip_status || false,
          blacklist_status: profileData.blacklist_status || false,
        });
        setLoading(false);
        return;
      }

      // If not found in customer_profiles, try to load from contracts
      let contractsQuery = supabase
        .from('contracts')
        .select('renter_full_name, renter_email, renter_phone_number, renter_id_number, renter_address, renter_driver_license_number')
        .or(`renter_email.eq.${customerId},renter_phone_number.eq.${customerId}`)
        .limit(1);

      if (organizationId) {
        contractsQuery = contractsQuery.eq('organization_id', organizationId);
      } else {
        contractsQuery = contractsQuery.eq('user_id', user.id);
      }

      const { data: contracts, error: contractsError } = await contractsQuery.maybeSingle();

      if (contracts) {
        const customerFromContract = {
          id: customerId,
          full_name: contracts.renter_full_name || '',
          email: contracts.renter_email || '',
          phone_primary: contracts.renter_phone_number || '',
          id_number: contracts.renter_id_number || '',
          address: contracts.renter_address || '',
          driver_license_number: contracts.renter_driver_license_number || '',
          notes: '',
          vip_status: false,
          blacklist_status: false,
        };
        
        setCustomer(customerFromContract);
        setFormData({
          ...customerFromContract,
        });
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomerHistory() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const organizationId = await getOrganizationId(user.id);

      // Load rental history from contracts
      let contractsQuery = supabase
        .from('contracts')
        .select('id, pickup_date, dropoff_date, total_cost, car_make_model, car_license_plate')
        .or(`renter_email.eq.${customerId},renter_phone_number.eq.${customerId}`)
        .order('pickup_date', { ascending: false })
        .limit(5);

      if (organizationId) {
        contractsQuery = contractsQuery.eq('organization_id', organizationId);
      } else {
        contractsQuery = contractsQuery.eq('user_id', user.id);
      }

      const { data: contracts, error: contractsError } = await contractsQuery;

      const rentals: RentalHistoryItem[] = (contracts || []).map((contract: any) => {
        const pickupDate = contract.pickup_date ? parseISO(contract.pickup_date) : new Date();
        const dropoffDate = contract.dropoff_date ? parseISO(contract.dropoff_date) : new Date();
        const duration = Math.max(1, Math.ceil((dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        return {
          id: contract.id,
          vehicle: contract.car_make_model || contract.car_license_plate || 'Unknown',
          date: contract.pickup_date || new Date().toISOString(),
          cost: contract.total_cost || 0,
          duration,
        };
      });

      // Load communication history (placeholder - this would need a communications table)
      const communications: CommunicationHistoryItem[] = [];

      setCustomerHistory({ rentals, communications });
    } catch (error) {
      console.error('Error loading customer history:', error);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const organizationId = await getOrganizationId(user.id);

      // Try to update customer_profiles first
      const { data: existingProfile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('id', customerId)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('customer_profiles')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customerId);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('customer_profiles')
          .insert({
            id: customerId,
            organization_id: organizationId,
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      // Reload customer data
      await loadCustomer();
      setEditing(false);
      alert('Customer updated successfully!');
    } catch (error: any) {
      console.error('Error saving customer:', error);
      alert('Failed to save customer: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (customer) {
      setFormData({
        full_name: customer.full_name || '',
        email: customer.email || '',
        phone_primary: customer.phone_primary || '',
        id_number: customer.id_number || '',
        address: customer.address || '',
        driver_license_number: customer.driver_license_number || '',
        notes: customer.notes || '',
        vip_status: customer.vip_status || false,
        blacklist_status: customer.blacklist_status || false,
      });
    }
    setEditing(false);
  }

  function getCustomerStatusColor() {
    if (customer?.blacklist_status) return 'text-red-600 bg-red-50 border-red-600';
    if (customer?.vip_status) return 'text-yellow-600 bg-yellow-50 border-yellow-600';
    return 'text-gray-600 bg-gray-50 border-gray-600';
  }

  function getCustomerStatusLabel() {
    if (customer?.blacklist_status) return 'Blacklist';
    if (customer?.vip_status) return 'VIP';
    return 'Regular';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading customer...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer not found</h3>
          <button
            onClick={() => router.push('/dashboard/customers')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Customers
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
              <Link href="/dashboard/customers">
                <FleetOSLogo variant="icon" size={40} />
              </Link>
              <button
                onClick={() => router.push('/dashboard/customers')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit size={16} />
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            <Link href="/dashboard" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 whitespace-nowrap">
              Dashboard
            </Link>
            <Link href="/dashboard/customers" className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600 whitespace-nowrap">
              Customers
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {/* Customer Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-blue-600">
                  {customer.full_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{customer.full_name || 'Unknown'}</h2>
                <p className="text-gray-600 mb-1 flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  {customer.email || 'No email'}
                </p>
                <p className="text-gray-600 flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  {customer.phone_primary || 'No phone'}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getCustomerStatusColor()}`}>
                {getCustomerStatusLabel()}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-gray-200">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              ) : (
                <p className="text-gray-900 font-medium">{customer.full_name || 'Not provided'}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Mail size={16} className="text-gray-500" />
                Email
              </label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="customer@example.com"
                />
              ) : (
                <p className="text-gray-900">{customer.email || 'Not provided'}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Phone size={16} className="text-gray-500" />
                Phone
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.phone_primary}
                  onChange={(e) => setFormData({ ...formData, phone_primary: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+30 123 456 7890"
                />
              ) : (
                <p className="text-gray-900">{customer.phone_primary || 'Not provided'}</p>
              )}
            </div>

            {/* ID Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AB123456"
                />
              ) : (
                <p className="text-gray-900">{customer.id_number || 'Not provided'}</p>
              )}
            </div>

            {/* Driver License */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver License Number</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.driver_license_number}
                  onChange={(e) => setFormData({ ...formData, driver_license_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DL123456"
                />
              ) : (
                <p className="text-gray-900">{customer.driver_license_number || 'Not provided'}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              {editing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Street address, City, Country"
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{customer.address || 'Not provided'}</p>
              )}
            </div>

            {/* VIP/Blacklist Status */}
            {editing && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Star size={16} className="text-yellow-500" />
                    VIP Status
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.vip_status}
                      onChange={(e) => setFormData({ ...formData, vip_status: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Ban size={16} className="text-red-500" />
                    Blacklist Status
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.blacklist_status}
                      onChange={(e) => setFormData({ ...formData, blacklist_status: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              {editing ? (
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional notes about this customer..."
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{customer.notes || 'No notes'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Rental History */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} />
            Rental History
          </h2>
          {customerHistory.rentals.length === 0 ? (
            <p className="text-gray-500 text-center py-8 italic">No rental history</p>
          ) : (
            <div className="space-y-4">
              {customerHistory.rentals.map((rental) => (
                <div key={rental.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{rental.vehicle}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(parseISO(rental.date), 'dd/MM/yyyy', { locale: el })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">€{rental.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-500 mt-1">{rental.duration} days</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Communication History */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={20} />
            Communication History
          </h2>
          {customerHistory.communications.length === 0 ? (
            <p className="text-gray-500 text-center py-8 italic">No communication history</p>
          ) : (
            <div className="space-y-4">
              {customerHistory.communications.map((comm) => (
                <div key={comm.id} className="py-3 border-b border-gray-200 last:border-b-0">
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-blue-600 capitalize">
                      {comm.communication_type === 'email' ? 'Email' :
                       comm.communication_type === 'sms' ? 'SMS' :
                       comm.communication_type === 'phone' ? 'Phone' : comm.communication_type}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{comm.message}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(comm.created_at), 'dd/MM/yyyy HH:mm', { locale: el })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
