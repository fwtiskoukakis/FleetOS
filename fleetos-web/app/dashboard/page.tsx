'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Car, 
  Calendar, 
  Users, 
  Globe, 
  BarChart3, 
  TrendingUp,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalCars: 0,
    activeRentals: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      // Get current user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        router.push('/login');
        return;
      }
      
      if (!authUser) {
        console.error('No authenticated user');
        router.push('/login');
        return;
      }

      console.log('Loading dashboard for user:', authUser.email);
      console.log('User ID:', authUser.id);

      // First, ensure user record exists (create if missing)
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking user:', checkError);
      }

      if (!existingUser) {
        // User doesn't exist in users table, create it
        console.log('User not found in users table, creating record...');
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (createError) {
          console.error('Error creating user record:', createError);
          // Try to continue anyway
        } else {
          console.log('User record created successfully');
        }
      }

      // Try to load user data - use simple select first
      let userData: any = null;
      let userError: any = null;

      // First try simple select
      const { data: simpleUserData, error: simpleError } = await supabase
        .from('users')
        .select('id, email, name, organization_id')
        .eq('id', authUser.id)
        .maybeSingle();

      if (simpleError) {
        console.error('Error loading user (simple):', simpleError);
        userError = simpleError;
      } else if (simpleUserData) {
        userData = simpleUserData;
        console.log('User loaded (simple):', userData);
      } else {
        // User doesn't exist, create it
        console.log('User not found, creating record...');
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          });

        if (createError) {
          console.error('Failed to create user record:', createError);
          // Try to continue anyway with minimal data
          userData = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            organization_id: null,
          };
        } else {
          // Retry loading
          const { data: retryData, error: retryError } = await supabase
            .from('users')
            .select('id, email, name, organization_id')
            .eq('id', authUser.id)
            .maybeSingle();

          if (retryError) {
            console.error('Error after creating user:', retryError);
            // Use minimal data
            userData = {
              id: authUser.id,
              email: authUser.email || '',
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
              organization_id: null,
            };
          } else {
            userData = retryData || {
              id: authUser.id,
              email: authUser.email || '',
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
              organization_id: null,
            };
          }
        }
      }

      // If we still don't have userData, use minimal data
      if (!userData) {
        console.log('Using minimal user data');
        userData = {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          organization_id: null,
        };
      }

      // Try to load organization if organization_id exists
      if (userData.organization_id) {
        try {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', userData.organization_id)
            .maybeSingle();
          
          if (orgData) {
            userData.organization = orgData;
          }
        } catch (orgError) {
          console.error('Error loading organization:', orgError);
          // Continue without organization
        }
      }

      console.log('User data loaded:', userData);
      setUser(userData);

      // Try to find organization_id from user data, or from their contracts/cars
      let orgId = userData?.organization_id;
      
      if (!orgId) {
        console.log('No organization_id in user record, trying to find from user data...');
        
        // Try to get organization from contracts (check any contract)
        const { data: contracts } = await supabase
          .from('contracts')
          .select('organization_id')
          .limit(10);
        
        if (contracts && contracts.length > 0) {
          // Find first contract with organization_id
          const contractWithOrg = contracts.find(c => c.organization_id);
          if (contractWithOrg?.organization_id) {
            orgId = contractWithOrg.organization_id;
            console.log('Found organization from contracts:', orgId);
            
            // Update user record with organization_id
            await supabase
              .from('users')
              .update({ organization_id: orgId })
              .eq('id', authUser.id);
          }
        }
        
        // If still not found, try cars
        if (!orgId) {
          const { data: cars } = await supabase
            .from('cars')
            .select('organization_id')
            .limit(10);
          
          if (cars && cars.length > 0) {
            const carWithOrg = cars.find(c => c.organization_id);
            if (carWithOrg?.organization_id) {
              orgId = carWithOrg.organization_id;
              console.log('Found organization from cars:', orgId);
              
              // Update user record with organization_id
              await supabase
                .from('users')
                .update({ organization_id: orgId })
                .eq('id', authUser.id);
            }
          }
        }
      }

      // If still no organization_id, load data without organization filter (like mobile app)
      // The data might not have organization_id or RLS will filter it
      if (!orgId) {
        console.log('No organization_id found - loading all data (will be filtered by RLS or show all)');
        
        // Load stats without organization filter - same as mobile app
        await Promise.all([
          loadCarCountAll(),
          loadActiveRentalsAll(),
          loadCustomerCountAll(),
          loadMonthlyRevenueAll(),
        ]);
        
        setUser(userData);
        return;
      }

      // Reload user data if we updated organization_id
      if (orgId && !userData.organization_id) {
        const { data: updatedUser } = await supabase
          .from('users')
          .select('*, organization:organizations(*)')
          .eq('id', authUser.id)
          .single();
        
        if (updatedUser) {
          setUser(updatedUser);
        }
      }

      // Load stats
      console.log('Loading stats for organization:', orgId);
      await Promise.all([
        loadCarCount(orgId),
        loadActiveRentals(orgId),
        loadCustomerCount(orgId),
        loadMonthlyRevenue(orgId),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      alert('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  async function loadCarCount(orgId: string) {
    try {
      const { count, error } = await supabase
        .from('cars')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);
      
      if (error) {
        console.error('Error loading car count:', error);
        return;
      }
      
      console.log('Car count for org', orgId, ':', count || 0);
      setStats(prev => ({ ...prev, totalCars: count || 0 }));
    } catch (error) {
      console.error('Exception loading car count:', error);
    }
  }

  async function loadCarCountAll() {
    try {
      // Load all cars (no organization filter) - same as mobile app
      const { count, error } = await supabase
        .from('cars')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error loading car count (all):', error);
        return;
      }
      
      console.log('Total car count (all):', count || 0);
      setStats(prev => ({ ...prev, totalCars: count || 0 }));
    } catch (error) {
      console.error('Exception loading car count (all):', error);
    }
  }

  async function loadActiveRentals(orgId: string) {
    try {
      const { count, error } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .in('status', ['active', 'pending']);
      
      if (error) {
        console.error('Error loading active rentals:', error);
        return;
      }
      
      console.log('Active rentals for org', orgId, ':', count || 0);
      setStats(prev => ({ ...prev, activeRentals: count || 0 }));
    } catch (error) {
      console.error('Exception loading active rentals:', error);
    }
  }

  async function loadActiveRentalsAll() {
    try {
      // Load all active rentals (no organization filter) - same as mobile app
      const { count, error } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'pending']);
      
      if (error) {
        console.error('Error loading active rentals (all):', error);
        return;
      }
      
      console.log('Active rentals (all):', count || 0);
      setStats(prev => ({ ...prev, activeRentals: count || 0 }));
    } catch (error) {
      console.error('Exception loading active rentals (all):', error);
    }
  }

  async function loadCustomerCount(orgId: string) {
    try {
      const { count, error } = await supabase
        .from('customer_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);
      
      if (error) {
        console.error('Error loading customer count:', error);
        return;
      }
      
      console.log('Customer count for org', orgId, ':', count || 0);
      setStats(prev => ({ ...prev, totalCustomers: count || 0 }));
    } catch (error) {
      console.error('Exception loading customer count:', error);
    }
  }

  async function loadCustomerCountAll() {
    try {
      // Load all customers (no organization filter) - same as mobile app
      const { count, error } = await supabase
        .from('customer_profiles')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error loading customer count (all):', error);
        return;
      }
      
      console.log('Customer count (all):', count || 0);
      setStats(prev => ({ ...prev, totalCustomers: count || 0 }));
    } catch (error) {
      console.error('Exception loading customer count (all):', error);
    }
  }

  async function loadMonthlyRevenue(orgId: string) {
    try {
      // Try total_price first, fallback to total_cost (mobile app uses total_cost)
      const { data, error } = await supabase
        .from('contracts')
        .select('total_price, total_cost')
        .eq('organization_id', orgId)
        .eq('status', 'completed')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if (error) {
        console.error('Error loading monthly revenue:', error);
        return;
      }

      const revenue = data?.reduce((sum, contract) => {
        const price = contract.total_price || contract.total_cost || 0;
        return sum + price;
      }, 0) || 0;
      
      console.log('Monthly revenue for org', orgId, ':', revenue);
      setStats(prev => ({ ...prev, monthlyRevenue: revenue }));
    } catch (error) {
      console.error('Exception loading monthly revenue:', error);
    }
  }

  async function loadMonthlyRevenueAll() {
    try {
      // Load all completed contracts for this month (no organization filter) - same as mobile app
      const { data, error } = await supabase
        .from('contracts')
        .select('total_price, total_cost')
        .eq('status', 'completed')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if (error) {
        console.error('Error loading monthly revenue (all):', error);
        return;
      }

      const revenue = data?.reduce((sum, contract) => {
        const price = contract.total_price || contract.total_cost || 0;
        return sum + price;
      }, 0) || 0;
      
      console.log('Monthly revenue (all):', revenue);
      setStats(prev => ({ ...prev, monthlyRevenue: revenue }));
    } catch (error) {
      console.error('Exception loading monthly revenue (all):', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">FleetOS</h1>
                <p className="text-sm text-gray-600">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.organization?.company_name || 'Loading...'}
              </span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/dashboard" className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600">
              Dashboard
            </Link>
            <Link href="/dashboard/fleet" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Cars */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Cars</h3>
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalCars}</p>
            <p className="text-sm text-gray-500 mt-1">In fleet</p>
          </div>

          {/* Active Rentals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Active Rentals</h3>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.activeRentals}</p>
            <p className="text-sm text-gray-500 mt-1">Currently rented</p>
          </div>

          {/* Total Customers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Customers</h3>
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</p>
            <p className="text-sm text-gray-500 mt-1">Total customers</p>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Monthly Revenue</h3>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">€{stats.monthlyRevenue.toFixed(0)}</p>
            <p className="text-sm text-gray-500 mt-1">This month</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard/fleet" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Fleet</h3>
                <p className="text-sm text-gray-600">View and edit vehicles</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/rentals" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Rentals</h3>
                <p className="text-sm text-gray-600">Manage contracts</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/book-online" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Online Booking</h3>
                <p className="text-sm text-gray-600">Manage booking settings</p>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/customers" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Customers</h3>
                <p className="text-sm text-gray-600">View customer list</p>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

