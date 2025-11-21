'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Users, Mail, Phone, Edit, Save, X, ArrowLeft, Calendar, FileText, DollarSign } from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_primary: '',
    id_number: '',
    address: '',
    driver_license_number: '',
    notes: '',
  });

  useEffect(() => {
    loadCustomer();
    loadContracts();
  }, [customerId]);

  async function loadCustomer() {
    try {
      setLoading(true);
      
      // Get user's organization_id
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
        .from('customer_profiles')
        .select('*')
        .eq('id', customerId);

      // Filter by organization_id if available
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

      // Filter by organization_id if available, otherwise filter by user_id
      if (organizationId) {
        contractsQuery = contractsQuery.eq('organization_id', organizationId);
      } else {
        contractsQuery = contractsQuery.eq('user_id', user.id);
      }

      const { data: contracts, error: contractsError } = await contractsQuery.maybeSingle();

      if (contracts) {
        // Create customer object from contract data
        const customerFromContract = {
          id: customerId,
          full_name: contracts.renter_full_name || '',
          email: contracts.renter_email || '',
          phone_primary: contracts.renter_phone_number || '',
          id_number: contracts.renter_id_number || '',
          address: contracts.renter_address || '',
          driver_license_number: contracts.renter_driver_license_number || '',
          notes: '',
        };
        
        setCustomer(customerFromContract);
        setFormData({
          full_name: customerFromContract.full_name,
          email: customerFromContract.email,
          phone_primary: customerFromContract.phone_primary,
          id_number: customerFromContract.id_number,
          address: customerFromContract.address,
          driver_license_number: customerFromContract.driver_license_number,
          notes: customerFromContract.notes,
        });
      }
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadContracts() {
    // Load contracts for this customer to show stats
    // This will be used to show rental history
  }

  async function handleSave() {
    try {
      setSaving(true);

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
        // Create new profile from contract data
        // Get organization_id from user or contracts
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Try to get organization_id from user or contracts
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .maybeSingle();

        const { data: contractData } = await supabase
          .from('contracts')
          .select('organization_id')
          .limit(1)
          .maybeSingle();

        const orgId = userData?.organization_id || contractData?.organization_id;

        const { error } = await supabase
          .from('customer_profiles')
          .insert({
            id: customerId,
            organization_id: orgId,
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
      });
    }
    setEditing(false);
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
            <Link href="/dashboard/fleet" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 whitespace-nowrap">
              Fleet
            </Link>
            <Link href="/dashboard/rentals" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 whitespace-nowrap">
              Rentals
            </Link>
            <Link href="/dashboard/customers" className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600 whitespace-nowrap">
              Customers
            </Link>
            <Link href="/dashboard/book-online" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 whitespace-nowrap">
              Book Online
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {/* Customer Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Information</h2>

          <div className="space-y-4">
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
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={24} />
            Rental History
          </h2>
          <p className="text-gray-600">Rental history will be displayed here</p>
        </div>
      </main>
    </div>
  );
}

