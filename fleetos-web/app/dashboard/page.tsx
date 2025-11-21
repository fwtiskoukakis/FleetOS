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

      // First, ensure user record exists (create if missing)
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // User doesn't exist in users table, create it
        console.log('User not found in users table, creating record...');
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email || 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (createError) {
          console.error('Error creating user record:', createError);
        } else {
          console.log('User record created successfully');
        }
      }

      // Get user data with organization - same as mobile app
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, organization:organizations(*)')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        console.error('Error loading user data:', userError);
        console.error('User ID:', authUser.id);
        alert('Failed to load user data. Please refresh the page.');
        return;
      }

      console.log('User data loaded:', userData);
      setUser(userData);

      // Try to find organization_id from user data, or from their contracts/cars
      let orgId = userData?.organization_id;
      
      if (!orgId) {
        console.log('No organization_id in user record, trying to find from user data...');
        
        // Try to get organization from contracts created by this user
        const { data: contract } = await supabase
          .from('contracts')
          .select('organization_id')
          .eq('created_by', authUser.id)
          .limit(1)
          .single();
        
        if (contract?.organization_id) {
          orgId = contract.organization_id;
          console.log('Found organization from contracts:', orgId);
          
          // Update user record with organization_id
          await supabase
            .from('users')
            .update({ organization_id: orgId })
            .eq('id', authUser.id);
        } else {
          // Try to get organization from cars
          const { data: car } = await supabase
            .from('cars')
            .select('organization_id')
            .eq('created_by', authUser.id)
            .limit(1)
            .single();
          
          if (car?.organization_id) {
            orgId = car.organization_id;
            console.log('Found organization from cars:', orgId);
            
            // Update user record with organization_id
            await supabase
              .from('users')
              .update({ organization_id: orgId })
              .eq('id', authUser.id);
          }
        }
      }

      if (!orgId) {
        console.error('User has no organization_id and could not find it from data');
        // Don't show alert, just show 0 stats - user can still access dashboard
        console.log('Showing dashboard with no organization (stats will be 0)');
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

