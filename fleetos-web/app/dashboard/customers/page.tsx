'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Users, Plus, Search, Mail, Phone } from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

export default function CustomersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      setLoading(true);
      
      // Get all contracts to extract unique customers
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('renter_full_name, renter_email, renter_phone_number, renter_id_number, total_cost')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading contracts:', error);
        return;
      }

      // Create unique customers map
      const customerMap = new Map<string, any>();
      
      contracts?.forEach(contract => {
        const key = contract.renter_email?.toLowerCase() || 
                   `${contract.renter_full_name}-${contract.renter_phone_number}`;
        
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: key,
            full_name: contract.renter_full_name,
            email: contract.renter_email,
            phone_primary: contract.renter_phone_number,
            id_number: contract.renter_id_number,
            total_rentals: 0,
            total_spent: 0,
          });
        }
        
        const customer = customerMap.get(key);
        customer.total_rentals += 1;
        customer.total_spent += contract.total_cost || 0;
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Exception loading customers:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone_primary?.toLowerCase().includes(query)
    );
  });

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
                <h1 className="text-xl font-bold text-gray-900">Customers</h1>
                <p className="text-sm text-gray-600">Manage your customer database</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/customers/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Customer
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
            <Link href="/dashboard/rentals" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Rentals
            </Link>
            <Link href="/dashboard/customers" className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600">
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
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Customers Grid */}
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
              {searchQuery ? 'Try adjusting your search query' : 'Customers will appear here after creating contracts'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {customer.full_name || 'Unknown Customer'}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.phone_primary && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{customer.phone_primary}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Rentals:</span>
                    <span className="font-medium text-gray-900">{customer.total_rentals}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Total Spent:</span>
                    <span className="font-medium text-gray-900">€{customer.total_spent.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/dashboard/customers/${encodeURIComponent(customer.id)}`)}
                  className="mt-4 w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View & Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

