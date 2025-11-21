'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Calendar, Plus, Search, Phone, CloudCheck } from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { formatDate } from '@/lib/utils';
import { getActualContractStatus, getStatusColor, getStatusLabel } from '@/lib/contract-utils';
import { getOrganizationId } from '@/lib/organization';

export default function RentalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'upcoming'>('all');

  useEffect(() => {
    loadContracts();
  }, []);

  async function loadContracts() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setContracts([]);
        return;
      }

      // Get organization_id using centralized utility
      const organizationId = await getOrganizationId(user.id);

      // Build query with organization filter
      let query = supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by organization_id if available, otherwise filter by user_id
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading contracts:', error);
        return;
      }

      setContracts(data || []);
    } catch (error) {
      console.error('Exception loading contracts:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredContracts = contracts.filter(contract => {
    // Status filter - use actual status calculation
    if (statusFilter !== 'all') {
      const actualStatus = getActualContractStatus(contract);
      if (actualStatus !== statusFilter) return false;
    }

    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contract.renter_full_name?.toLowerCase().includes(query) ||
      contract.car_license_plate?.toLowerCase().includes(query) ||
      contract.car_make_model?.toLowerCase().includes(query) ||
      contract.renter_phone_number?.toLowerCase().includes(query)
    );
  });

  function handlePhoneCall(phoneNumber: string, e?: React.MouseEvent) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <FleetOSLogo variant="icon" size={40} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Rentals</h1>
                <p className="text-sm text-gray-600">Manage contracts and rentals</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/rentals/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Contract
            </button>
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
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by customer name, license plate, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Filters - Horizontal Scroll (matches mobile app) */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === 'active' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === 'upcoming' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === 'completed' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Contracts List - Card View (matches mobile app exactly) */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading contracts...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No contracts found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by creating your first contract'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => router.push('/dashboard/rentals/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Contract
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContracts.map((contract) => {
              const actualStatus = getActualContractStatus(contract);
              const statusColor = getStatusColor(actualStatus);
              const pickupDate = formatDate(contract.pickup_date, 'dd/MM');
              const dropoffDate = formatDate(contract.dropoff_date, 'dd/MM');
              
              return (
                <div
                  key={contract.id}
                  onClick={() => router.push(`/dashboard/rentals/${contract.id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    {/* Left Side - Customer and Car Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name Row with Phone Button */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {contract.renter_full_name || 'N/A'}
                        </h3>
                        {contract.renter_phone_number && (
                          <button
                            onClick={(e) => handlePhoneCall(contract.renter_phone_number, e)}
                            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Call customer"
                          >
                            <Phone className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                      </div>
                      
                      {/* Car Info */}
                      <p className="text-sm text-gray-600 mb-1 truncate">
                        {contract.car_make_model || 'N/A'} • {contract.car_license_plate || 'N/A'}
                      </p>
                      
                      {/* Dates */}
                      <p className="text-xs text-gray-500">
                        {pickupDate} {contract.pickup_time || ''} - {dropoffDate} {contract.dropoff_time || ''}
                      </p>
                    </div>
                    
                    {/* Right Side - Status, Price, AADE */}
                    <div className="flex flex-col items-end gap-2 ml-4">
                      {/* Status Badge */}
                      <div 
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: `${statusColor}15`,
                          color: statusColor
                        }}
                      >
                        {getStatusLabel(actualStatus)}
                      </div>
                      
                      {/* Price */}
                      <p className="text-base font-semibold text-gray-900">
                        €{contract.total_cost || contract.total_price || 0}
                      </p>
                      
                      {/* AADE Status Badge */}
                      {(contract.aade_status === 'submitted' || contract.aade_status === 'completed') && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded">
                          <CloudCheck className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-gray-600">AADE</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

