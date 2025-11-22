'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { Users, Plus, Search, Mail, Phone, Star, Ban, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

type StatusFilter = 'all' | 'vip' | 'blacklisted' | 'expired';

export default function CustomersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  useEffect(() => {
    loadCustomers();
  }, [statusFilter]);

  async function loadCustomers() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCustomers([]);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      // Try to load from customer_profiles table first
      let customersQuery = supabase
        .from('customer_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (organizationId) {
        customersQuery = customersQuery.eq('organization_id', organizationId);
      }

      const { data: customerProfiles, error: profilesError } = await customersQuery;

      // If customer_profiles table exists and has data, use it
      if (customerProfiles && customerProfiles.length > 0) {
        setCustomers(customerProfiles);
        
        // Calculate stats
        const stats = {
          total: customerProfiles.length,
          vip: customerProfiles.filter((c: any) => c.vip_status).length,
          blacklisted: customerProfiles.filter((c: any) => c.blacklist_status).length,
          newThisMonth: customerProfiles.filter((c: any) => {
            const created = new Date(c.created_at);
            const now = new Date();
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
          }).length,
          totalRevenue: customerProfiles.reduce((sum: number, c: any) => sum + (parseFloat(c.total_spent) || 0), 0),
        };
        setCustomerStats(stats);
      } else {
        // Fallback: Extract customers from contracts
        let contractsQuery = supabase
          .from('contracts')
          .select('renter_full_name, renter_email, renter_phone_number, renter_id_number, total_cost, created_at, organization_id')
          .order('created_at', { ascending: false });

        if (organizationId) {
          contractsQuery = contractsQuery.eq('organization_id', organizationId);
        } else {
          contractsQuery = contractsQuery.eq('user_id', user.id);
        }

        const { data: contracts, error } = await contractsQuery;

        if (error) {
          console.error('Error loading contracts:', error);
          return;
        }

        // Create unique customers map
        const customerMap = new Map<string, any>();
        
        contracts?.forEach((contract: any) => {
          const key = contract.renter_email?.toLowerCase() || 
                     `${contract.renter_full_name}-${contract.renter_phone_number}`;
          
          if (!customerMap.has(key)) {
            customerMap.set(key, {
              id: key,
              full_name: contract.renter_full_name,
              email: contract.renter_email,
              phone_primary: contract.renter_phone_number,
              id_number: contract.renter_id_number,
              vip_status: false,
              blacklist_status: false,
              customer_rating: null,
              total_rentals: 0,
              total_spent: 0,
              created_at: contract.created_at,
              organization_id: contract.organization_id,
            });
          }
          
          const customer = customerMap.get(key);
          customer.total_rentals += 1;
          customer.total_spent += parseFloat(contract.total_cost) || 0;
          // Use earliest created_at
          if (new Date(contract.created_at) < new Date(customer.created_at)) {
            customer.created_at = contract.created_at;
          }
        });

        const customersList = Array.from(customerMap.values());
        setCustomers(customersList);
        
        // Calculate stats
        const stats = {
          total: customersList.length,
          vip: customersList.filter((c: any) => c.vip_status).length,
          blacklisted: customersList.filter((c: any) => c.blacklist_status).length,
          newThisMonth: customersList.filter((c: any) => {
            const created = new Date(c.created_at);
            const now = new Date();
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
          }).length,
          totalRevenue: customersList.reduce((sum: number, c: any) => sum + (c.total_spent || 0), 0),
        };
        setCustomerStats(stats);
      }
    } catch (error) {
      console.error('Exception loading customers:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterCustomers() {
    let result = customers;
    
    // Apply status filter
    if (statusFilter === 'vip') {
      result = result.filter((c: any) => c.vip_status);
    } else if (statusFilter === 'blacklisted') {
      result = result.filter((c: any) => c.blacklist_status);
    } else if (statusFilter === 'expired') {
      // Check for expired driver licenses or IDs
      result = result.filter((c: any) => {
        const licenseExpiry = c.driver_license_expiry ? new Date(c.driver_license_expiry) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return licenseExpiry && licenseExpiry < today;
      });
    }
    
    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c: any) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone_primary?.toLowerCase().includes(q) ||
        c.id_number?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }

  const filteredCustomers = filterCustomers();

  function getCustomerStatusColor(customer: any): string {
    if (customer.blacklist_status) return '#FF3B30'; // Red
    if (customer.vip_status) return '#FF9500'; // Orange
    if (customer.customer_rating && customer.customer_rating >= 4) return '#34C759'; // Green
    return '#8E8E93'; // Gray
  }

  function getCustomerStatusLabel(customer: any): string {
    if (customer.blacklist_status) return 'Μαύρη Λίστα';
    if (customer.vip_status) return 'VIP';
    if (customer.customer_rating && customer.customer_rating >= 4) return 'Εξαιρετικός';
    return 'Κανονικός';
  }

  async function toggleVipStatus(customer: any) {
    try {
      // Try to update customer_profiles table first
      const { error: profilesError } = await supabase
        .from('customer_profiles')
        .update({ vip_status: !customer.vip_status })
        .eq('id', customer.id);

      if (profilesError) {
        // If table doesn't exist or update fails, just update local state
        console.warn('Could not update customer_profiles:', profilesError);
      }

      // Update local state
      setCustomers(customers.map((c: any) => 
        c.id === customer.id ? { ...c, vip_status: !c.vip_status } : c
      ));
      setShowMenu(null);
    } catch (error) {
      console.error('Error toggling VIP status:', error);
    }
  }

  function editCustomer(customer: any) {
    setEditingCustomer(customer);
    setShowEditModal(true);
    setShowMenu(null);
  }

  function viewCustomerDetails(customer: any) {
    router.push(`/dashboard/customers/${encodeURIComponent(customer.id)}`);
    setShowMenu(null);
  }

  async function deleteCustomer(customer: any) {
    if (!confirm(`Are you sure you want to delete customer "${customer.full_name}"?`)) {
      setShowMenu(null);
      return;
    }

    try {
      // Try to delete from customer_profiles table
      const { error: deleteError } = await supabase
        .from('customer_profiles')
        .delete()
        .eq('id', customer.id);

      if (deleteError) {
        console.warn('Could not delete from customer_profiles:', deleteError);
      }

      // Update local state
      setCustomers(customers.filter((c: any) => c.id !== customer.id));
      setShowMenu(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {customerStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-gray-600">Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{customerStats.total}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-orange-600" />
                <p className="text-sm text-gray-600">VIP</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{customerStats.vip}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <p className="text-sm text-gray-600">New This Month</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{customerStats.newThisMonth}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">€</span>
                <p className="text-sm text-gray-600">Total Revenue</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">€{customerStats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
          
          {/* Filters - Horizontal Scroll */}
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {[
                { value: 'all', label: 'All' },
                { value: 'vip', label: 'VIP' },
                { value: 'blacklisted', label: 'Blacklist' },
                { value: 'expired', label: 'Expired Docs' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as StatusFilter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    statusFilter === filter.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Customers List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search filters'
                : 'Add your first customer to the database'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => router.push('/dashboard/customers/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Customer
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => {
              const statusColor = getCustomerStatusColor(customer);
              const statusLabel = getCustomerStatusLabel(customer);
              
              return (
                <div key={customer.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow relative">
                  {/* Customer Header */}
                  <div className="flex items-start gap-4 mb-4">
                    {/* Avatar */}
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: statusColor }}
                    >
                      {customer.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    
                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                        {customer.full_name || 'Unknown Customer'}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        {customer.email ? (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span>No email</span>
                          </div>
                        )}
                        {customer.phone_primary ? (
                          <div className="flex items-center gap-2 truncate">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{customer.phone_primary}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span>No phone</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Status Badge & Menu */}
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className="px-2 py-1 text-xs font-medium rounded"
                        style={{
                          backgroundColor: `${statusColor}20`,
                          color: statusColor,
                        }}
                      >
                        {statusLabel}
                      </span>
                      <div className="relative">
                        <button
                          onClick={() => setShowMenu(showMenu === customer.id ? null : customer.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>
                        {showMenu === customer.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                            <button
                              onClick={() => viewCustomerDetails(customer)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => editCustomer(customer)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => toggleVipStatus(customer)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                              <Star className="w-4 h-4" />
                              {customer.vip_status ? 'Remove VIP' : 'Add VIP'}
                            </button>
                            <button
                              onClick={() => deleteCustomer(customer)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Customer Stats */}
                  <div className="border-t border-gray-200 pt-4 mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Rentals</p>
                      <p className="text-lg font-semibold text-gray-900">{customer.total_rentals || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total Spent</p>
                      <p className="text-lg font-semibold text-gray-900">€{(customer.total_spent || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Rating</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {customer.customer_rating ? `${customer.customer_rating}/5` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Member Since</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {customer.created_at
                          ? format(new Date(customer.created_at), 'MM/yyyy', { locale: el })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowMenu(null)}
        />
      )}
    </div>
  );
}
