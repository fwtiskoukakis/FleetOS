'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  BarChart3, FileText, CheckCircle2, Clock, PlayCircle, 
  CheckCircle, XCircle, TrendingUp, Calendar, Calculator, CalendarDays, RefreshCw
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  monthRevenue: number;
  avgBookingValue: number;
  avgRentalDays: number;
}

export default function BookOnlineAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    avgBookingValue: 0,
    avgRentalDays: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      let bookingsQuery = supabase
        .from('online_bookings')
        .select('*');

      if (organizationId) {
        bookingsQuery = bookingsQuery.eq('organization_id', organizationId);
      }

      const { data, error } = await bookingsQuery;

      if (error) throw error;

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const totalRevenue = (data || []).reduce((sum, b) => sum + (b.total_price || 0), 0);
      
      const monthRevenue = (data || [])
        .filter(b => {
          const bookingDate = parseISO(b.created_at);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        })
        .reduce((sum, b) => sum + (b.total_price || 0), 0);

      const completedBookings = (data || []).filter(b => b.booking_status === 'completed');
      const avgBookingValue = completedBookings.length > 0
        ? completedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0) / completedBookings.length
        : 0;

      const avgRentalDays = (data || []).length > 0
        ? (data || []).reduce((sum, b) => sum + (b.rental_days || 0), 0) / (data || []).length
        : 0;

      setStats({
        total: (data || []).length,
        pending: (data || []).filter(b => b.booking_status === 'pending').length,
        confirmed: (data || []).filter(b => b.booking_status === 'confirmed').length,
        in_progress: (data || []).filter(b => b.booking_status === 'in_progress').length,
        completed: (data || []).filter(b => b.booking_status === 'completed').length,
        cancelled: (data || []).filter(b => b.booking_status === 'cancelled').length,
        totalRevenue,
        monthRevenue,
        avgBookingValue,
        avgRentalDays,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadStats();
  }

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className={`bg-white rounded-lg border-l-4 ${color} p-4 flex items-center gap-4 shadow-sm`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color} bg-opacity-10`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
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
              <Link href="/dashboard/book-online">
                <FleetOSLogo variant="icon" size={40} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-600">Statistics and booking reports</p>
              </div>
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Section */}
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={FileText} label="Total Bookings" value={stats.total} color="text-blue-600 border-blue-600" />
          <StatCard icon={CheckCircle2} label="Confirmed" value={stats.confirmed} color="text-green-600 border-green-600" />
          <StatCard icon={Clock} label="Pending" value={stats.pending} color="text-yellow-600 border-yellow-600" />
          <StatCard icon={PlayCircle} label="In Progress" value={stats.in_progress} color="text-indigo-600 border-indigo-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="text-gray-600 border-gray-600" />
          <StatCard icon={XCircle} label="Cancelled" value={stats.cancelled} color="text-red-600 border-red-600" />
        </div>

        {/* Revenue Section */}
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4 mt-8">Revenue</h2>
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-gray-900">
                    €{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="border-l border-gray-200 pl-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">This Month</p>
                  <p className="text-xl font-bold text-gray-900">
                    €{stats.monthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100">
                <Calculator className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Booking Value</p>
                <p className="text-xl font-bold text-gray-900">
                  €{stats.avgBookingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100">
                <CalendarDays className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Rental Days</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.avgRentalDays.toFixed(1)} days
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

