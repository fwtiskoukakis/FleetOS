'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  Globe, MapPin, Tag, Shield, CreditCard, Settings, Plus, 
  Car, Calendar, Palette, BarChart3, Eye, ArrowRight 
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';

export default function BookOnlinePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    locations: 0,
    categories: 0,
    extras: 0,
    insuranceTypes: 0,
    paymentMethods: 0,
    bookings: 0,
    activeBookings: 0,
    availableCars: 0,
    monthlyRevenue: 0,
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
      
      // Build queries with organization filter
      const locationsQuery = supabase.from('locations').select('id', { count: 'exact', head: true });
      const categoriesQuery = supabase.from('car_categories').select('id', { count: 'exact', head: true });
      const extrasQuery = supabase.from('extra_options').select('id', { count: 'exact', head: true });
      const insuranceQuery = supabase.from('insurance_types').select('id', { count: 'exact', head: true });
      const paymentsQuery = supabase.from('payment_methods').select('id', { count: 'exact', head: true });

      // Bookings query with organization filter
      const bookingsQueryBuilder = supabase.from('online_bookings').select('id, total_cost, pickup_date, dropoff_date', { count: 'exact' });
      const bookingsQuery = organizationId 
        ? bookingsQueryBuilder.eq('organization_id', organizationId)
        : bookingsQueryBuilder;

      // Available cars query with organization filter
      const carsQueryBuilder = supabase.from('booking_cars').select('id', { count: 'exact', head: true }).eq('is_available_for_booking', true).eq('is_active', true);
      const carsQuery = organizationId 
        ? carsQueryBuilder.eq('organization_id', organizationId)
        : carsQueryBuilder;

      const [
        locationsRes, categoriesRes, extrasRes, insuranceRes, paymentsRes, 
        bookingsRes, carsRes
      ] = await Promise.all([
        locationsQuery,
        categoriesQuery,
        extrasQuery,
        insuranceQuery,
        paymentsQuery,
        bookingsQuery,
        carsQuery,
      ]);

      // Calculate active bookings and monthly revenue
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const activeBookings = bookingsRes.data?.filter((b: any) => {
        const pickup = new Date(b.pickup_date);
        const dropoff = new Date(b.dropoff_date);
        return pickup <= now && dropoff >= now;
      }).length || 0;

      const monthlyRevenue = bookingsRes.data?.reduce((sum: number, b: any) => {
        const bookingDate = new Date(b.pickup_date || b.created_at);
        if (bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear) {
          return sum + (parseFloat(b.total_cost) || 0);
        }
        return sum;
      }, 0) || 0;

      setStats({
        locations: locationsRes.count || 0,
        categories: categoriesRes.count || 0,
        extras: extrasRes.count || 0,
        insuranceTypes: insuranceRes.count || 0,
        paymentMethods: paymentsRes.count || 0,
        bookings: bookingsRes.count || 0,
        activeBookings,
        availableCars: carsRes.count || 0,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const menuItems = [
    {
      title: 'Τοποθεσίες',
      subtitle: 'Διαχείριση σημείων παραλαβής/παράδοσης',
      icon: MapPin,
      href: '/dashboard/book-online/locations',
      color: '#3b82f6',
    },
    {
      title: 'Κατηγορίες Οχημάτων',
      subtitle: 'Δημιουργία και επεξεργασία κατηγοριών',
      icon: Tag,
      href: '/dashboard/book-online/categories',
      color: '#8b5cf6',
    },
    {
      title: 'Αυτοκίνητα',
      subtitle: 'Διαχείριση οχημάτων και φωτογραφιών',
      icon: Car,
      href: '/dashboard/book-online/cars',
      color: '#10b981',
    },
    {
      title: 'Τιμολόγηση',
      subtitle: 'Calendar τιμών με drag-to-select',
      icon: Calendar,
      href: '/dashboard/book-online/pricing',
      color: '#f59e0b',
    },
    {
      title: 'Πρόσθετα',
      subtitle: 'GPS, παιδικό κάθισμα, επιπλέον οδηγός',
      icon: Plus,
      href: '/dashboard/book-online/extras',
      color: '#06b6d4',
    },
    {
      title: 'Ασφάλειες',
      subtitle: 'Τύποι ασφάλειας και κάλυψη',
      icon: Shield,
      href: '/dashboard/book-online/insurance',
      color: '#ec4899',
    },
    {
      title: 'Μέθοδοι Πληρωμής',
      subtitle: 'Stripe, Viva Wallet, PayPal',
      icon: CreditCard,
      href: '/dashboard/book-online/payment-methods',
      color: '#6366f1',
    },
    {
      title: 'Κρατήσεις',
      subtitle: 'Προβολή και διαχείριση κρατήσεων',
      icon: Globe,
      href: '/dashboard/book-online/bookings',
      color: '#14b8a6',
    },
    {
      title: 'Εμφάνιση',
      subtitle: 'Χρώματα, λογότυπο, brand settings',
      icon: Palette,
      href: '/dashboard/book-online/design',
      color: '#f43f5e',
    },
    {
      title: 'Αναλυτικά',
      subtitle: 'Στατιστικά και αναφορές κρατήσεων',
      icon: BarChart3,
      href: '/dashboard/book-online/analytics',
      color: '#8b5cf6',
    },
  ];

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
                <h1 className="text-xl font-bold text-gray-900">Book Online</h1>
                <p className="text-sm text-gray-600">Manage your online booking system</p>
              </div>
            </div>
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
            <Link href="/dashboard/customers" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Customers
            </Link>
            <Link href="/dashboard/book-online" className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600">
              Book Online
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Header Section */}
            <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <Globe className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Online Booking System</h2>
                  <p className="text-sm text-gray-600 mt-1">Διαχείριση συστήματος online κρατήσεων</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 mb-1">{stats.activeBookings}</p>
                <p className="text-xs text-gray-600">Ενεργές Κρατήσεις</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-green-600 mb-1">{stats.availableCars}</p>
                <p className="text-xs text-gray-600">Διαθέσιμα Αυτ/τα</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <p className="text-2xl font-bold text-orange-600 mb-1">€{stats.monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-600">Μηνιαία Έσοδα</p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Διαχείριση</h3>
              <div className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${item.color}15` }}
                          >
                            <Icon className="w-6 h-6" style={{ color: item.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold text-gray-900 mb-1">{item.title}</h4>
                            <p className="text-sm text-gray-600 truncate">{item.subtitle}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Website Preview Button */}
            <div className="mt-6">
              <button
                onClick={() => {
                  // TODO: Open booking website preview
                  window.open('/booking', '_blank');
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4 flex items-center justify-center gap-3 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
              >
                <Eye className="w-6 h-6" />
                <span className="font-semibold text-lg">Προεπισκόπηση Website</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

