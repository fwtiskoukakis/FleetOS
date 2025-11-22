'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  FileText, CheckCircle2, Clock, CheckCircle, 
  TrendingUp, Calendar, Calculator
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    upcoming: 0,
    revenue: 0,
    monthRevenue: 0,
    avgValue: 0,
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

      // Load contracts
      let contractsQuery = supabase
        .from('contracts')
        .select('id, status, total_cost, pickup_date, dropoff_date');

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

      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();

      const contractsList = contracts || [];
      const totalRevenue = contractsList.reduce((sum, c) => sum + (parseFloat(c.total_cost) || 0), 0);
      
      const monthRevenue = contractsList.filter(c => {
        if (!c.pickup_date) return false;
        const d = new Date(c.pickup_date);
        return d.getMonth() === month && d.getFullYear() === year;
      }).reduce((sum, c) => sum + (parseFloat(c.total_cost) || 0), 0);

      // Determine contract status
      const activeContracts = contractsList.filter(c => {
        if (!c.pickup_date || !c.dropoff_date) return false;
        const pickup = new Date(c.pickup_date);
        const dropoff = new Date(c.dropoff_date);
        return pickup <= now && dropoff >= now;
      });

      const upcomingContracts = contractsList.filter(c => {
        if (!c.pickup_date) return false;
        const pickup = new Date(c.pickup_date);
        return pickup > now;
      });

      const completedContracts = contractsList.filter(c => {
        if (!c.dropoff_date) return false;
        const dropoff = new Date(c.dropoff_date);
        return dropoff < now;
      });

      setStats({
        total: contractsList.length,
        active: activeContracts.length,
        completed: completedContracts.length,
        upcoming: upcomingContracts.length,
        revenue: totalRevenue,
        monthRevenue,
        avgValue: contractsList.length ? totalRevenue / contractsList.length : 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
  };

  function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
    return (
      <div className="flex-1 min-w-[47%] bg-white rounded-lg border-l-4 p-3 flex items-center gap-2" style={{ borderLeftColor: color }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-600 font-medium">{label}</p>
        </div>
      </div>
    );
  }

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
              <Link href="/dashboard">
                <FleetOSLogo variant="icon" size={40} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-600">View your business statistics</p>
              </div>
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Section */}
        <div className="mb-6">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 ml-1">Overview</h2>
          <div className="flex flex-wrap gap-2">
            <StatCard icon={FileText} label="Total" value={stats.total} color="#3b82f6" />
            <StatCard icon={CheckCircle2} label="Active" value={stats.active} color="#10b981" />
            <StatCard icon={Clock} label="Upcoming" value={stats.upcoming} color="#06b6d4" />
            <StatCard icon={CheckCircle} label="Completed" value={stats.completed} color="#6b7280" />
          </div>
        </div>

        {/* Revenue Section */}
        <div className="mb-6">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 ml-1">Revenue</h2>
          <div className="space-y-2">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium mb-1">Total</p>
                    <p className="text-base font-bold text-gray-900">€{stats.revenue.toLocaleString()}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex-1 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium mb-1">This Month</p>
                    <p className="text-base font-bold text-gray-900">€{stats.monthRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-cyan-600" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 font-medium mb-1">Average Contract Value</p>
                  <p className="text-base font-bold text-gray-900">€{Math.round(stats.avgValue)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

