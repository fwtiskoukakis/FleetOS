'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { Car, Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

export default function FleetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCars();
  }, []);

  async function loadCars() {
    try {
      setLoading(true);
      
      // Get user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCars([]);
        setLoading(false);
        return;
      }

      console.log('=== LOADING CARS ===');
      console.log('User ID:', user.id);
      console.log('User Email:', user.email);

      // First, try to get ALL cars without filters to see what's available
      // (This is just for debugging - we'll remove this in production)
      const { data: allCarsCheck, error: allCarsError } = await supabase
        .from('cars')
        .select('id, make, model, license_plate, organization_id')
        .limit(20);
      
      console.log('Sample cars in DB (first 20):', allCarsCheck);
      if (allCarsError) {
        console.error('Error fetching sample cars:', allCarsError);
      }

      // Try to get organization_id from users table first
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      let organizationId = userData?.organization_id;
      console.log('Organization ID from users table:', organizationId);

      // If no organization_id, try to infer it from existing cars/contracts
      if (!organizationId) {
        organizationId = await getOrganizationId(user.id);
        console.log('Organization ID after inference:', organizationId);
      }

      // Since cars table doesn't have user_id, we need to find cars through contracts
      // Strategy: Find cars used in user's contracts, then get their organization_id
      let allCars: any[] = [];
      let foundOrganizationId = organizationId;
      
      // First, try to find organization_id from contracts
      if (!foundOrganizationId) {
        const { data: userContracts } = await supabase
          .from('contracts')
          .select('organization_id, car_license_plate')
          .eq('user_id', user.id)
          .not('organization_id', 'is', null)
          .limit(1)
          .maybeSingle();
        
        if (userContracts?.organization_id) {
          foundOrganizationId = userContracts.organization_id;
          console.log('Found organization_id from contracts:', foundOrganizationId);
          // Update user's organization_id
          await supabase
            .from('users')
            .update({ organization_id: foundOrganizationId })
            .eq('id', user.id);
        }
      }

      // Strategy 1: Find cars by organization_id (if we have it)
      if (foundOrganizationId) {
        const { data: orgCars, error: errorByOrgId } = await supabase
          .from('cars')
          .select('*')
          .eq('organization_id', foundOrganizationId)
          .order('created_at', { ascending: false });

        if (errorByOrgId) {
          console.error('Error loading cars by organization_id:', errorByOrgId);
        } else {
          allCars = orgCars || [];
          console.log('Cars by organization_id:', allCars.length);
        }
      }

      // Strategy 2: If no cars found by organization_id, find cars through contracts (by license_plate)
      if (allCars.length === 0) {
        console.log('No cars found by organization_id. Finding cars through contracts...');
        
        // Get all unique license plates from user's contracts
        const { data: userContracts } = await supabase
          .from('contracts')
          .select('car_license_plate, organization_id')
          .eq('user_id', user.id)
          .not('car_license_plate', 'is', null);
        
        if (userContracts && userContracts.length > 0) {
          const licensePlates = [...new Set(userContracts.map(c => c.car_license_plate).filter(Boolean))];
          console.log('Found license plates from contracts:', licensePlates);
          
          // Try to find organization_id from contracts
          const contractWithOrgId = userContracts.find(c => c.organization_id);
          if (contractWithOrgId?.organization_id && !foundOrganizationId) {
            foundOrganizationId = contractWithOrgId.organization_id;
            console.log('Setting organization_id from contract:', foundOrganizationId);
            await supabase
              .from('users')
              .update({ organization_id: foundOrganizationId })
              .eq('id', user.id);
          }
          
          // Get cars by license plates
          if (licensePlates.length > 0) {
            const { data: carsByPlates } = await supabase
              .from('cars')
              .select('*')
              .in('license_plate', licensePlates)
              .order('created_at', { ascending: false });
            
            if (carsByPlates && carsByPlates.length > 0) {
              allCars = carsByPlates;
              console.log('Found', allCars.length, 'cars by license plates from contracts');
              
              // If cars have organization_id, use it to get all cars from that organization
              const carWithOrgId = carsByPlates.find(c => c.organization_id);
              if (carWithOrgId?.organization_id && carWithOrgId.organization_id !== foundOrganizationId) {
                console.log('Found cars with organization_id:', carWithOrgId.organization_id);
                const { data: allOrgCars } = await supabase
                  .from('cars')
                  .select('*')
                  .eq('organization_id', carWithOrgId.organization_id)
                  .order('created_at', { ascending: false });
                
                if (allOrgCars && allOrgCars.length > allCars.length) {
                  allCars = allOrgCars;
                  foundOrganizationId = carWithOrgId.organization_id;
                  // Update user's organization_id
                  await supabase
                    .from('users')
                    .update({ organization_id: foundOrganizationId })
                    .eq('id', user.id);
                  console.log('Updated to show all cars from organization:', foundOrganizationId);
                }
              }
            }
          }
        }
      }

      // Strategy 3: If still no cars, check all cars in DB and try to infer organization
      if (allCars.length === 0 && allCarsCheck && allCarsCheck.length > 0) {
        console.warn('Still no cars found. Checking if cars have organization_id...');
        
        // Find cars with organization_id
        const carWithOrgId = allCarsCheck.find((c: any) => c.organization_id);
        if (carWithOrgId && carWithOrgId.organization_id) {
          console.log('Found cars with organization_id:', carWithOrgId.organization_id);
          const { data: otherOrgCars } = await supabase
            .from('cars')
            .select('*')
            .eq('organization_id', carWithOrgId.organization_id)
            .order('created_at', { ascending: false });
          
          if (otherOrgCars && otherOrgCars.length > 0) {
            allCars = otherOrgCars;
            foundOrganizationId = carWithOrgId.organization_id;
            // Update user's organization_id
            await supabase
              .from('users')
              .update({ organization_id: foundOrganizationId })
              .eq('id', user.id);
            console.log('Using cars with organization_id:', foundOrganizationId);
          }
        } else {
          // Last resort: show all cars (if RLS allows or if no filtering)
          console.warn('No organization_id found. Showing all cars (may be filtered by RLS)');
          const { data: allCarsData } = await supabase
            .from('cars')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (allCarsData) {
            allCars = allCarsData;
            console.log('Showing all cars (no filter):', allCars.length);
          }
        }
      }

      // Sort by created_at descending
      allCars.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      console.log('Final cars count:', allCars.length);
      
      // If we found cars but no organization_id, try to set it from the first car
      if (allCars.length > 0 && !organizationId && allCars[0].organization_id) {
        console.log('Found cars with organization_id, updating user...');
        await supabase
          .from('users')
          .update({ organization_id: allCars[0].organization_id })
          .eq('id', user.id);
      }
      
      setCars(allCars);
      
      if (allCars.length === 0) {
        console.warn('⚠️ NO CARS FOUND. Debug info:');
        console.log('- User ID:', user.id);
        console.log('- Organization ID:', organizationId);
        console.log('- Cars by user_id error:', errorByUserId);
        console.log('- Sample cars in DB:', allCarsCheck?.slice(0, 5));
      }
    } catch (error) {
      console.error('Exception loading cars:', error);
      setCars([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredCars = cars.filter(car => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      car.license_plate?.toLowerCase().includes(query) ||
      car.make_model?.toLowerCase().includes(query) ||
      `${car.make} ${car.model}`.toLowerCase().includes(query)
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
                <h1 className="text-xl font-bold text-gray-900">Fleet Management</h1>
                <p className="text-sm text-gray-600">Manage your vehicles</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/fleet/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Vehicle
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
            <Link href="/dashboard/fleet" className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600">
              Fleet
            </Link>
            <Link href="/dashboard/rentals" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
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
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by license plate, make, or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Cars Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading vehicles...</p>
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No vehicles found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try adjusting your search query' : 'Get started by adding your first vehicle'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => router.push('/dashboard/fleet/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Vehicle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCars.map((car) => (
              <div key={car.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {car.make_model || `${car.make || ''} ${car.model || ''}`.trim() || 'Unknown Vehicle'}
                    </h3>
                    <p className="text-sm text-gray-600">{car.license_plate || 'No plate'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    car.status === 'available' ? 'bg-green-100 text-green-800' :
                    car.status === 'rented' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {car.status || 'available'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {car.year && <p>Year: {car.year}</p>}
                  {car.color && <p>Color: {car.color}</p>}
                  {car.fuel_type && <p>Fuel: {car.fuel_type}</p>}
                  {car.transmission && <p>Transmission: {car.transmission}</p>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/fleet/${car.id}`)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/fleet/${car.id}/edit`)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

