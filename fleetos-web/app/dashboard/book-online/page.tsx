'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Globe, MapPin, Tag, Shield, CreditCard, Settings, Plus } from 'lucide-react';
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
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      
      const [locationsRes, categoriesRes, extrasRes, insuranceRes, paymentsRes, bookingsRes] = await Promise.all([
        supabase.from('locations').select('id', { count: 'exact', head: true }),
        supabase.from('car_categories').select('id', { count: 'exact', head: true }),
        supabase.from('extra_options').select('id', { count: 'exact', head: true }),
        supabase.from('insurance_types').select('id', { count: 'exact', head: true }),
        supabase.from('payment_methods').select('id', { count: 'exact', head: true }),
        supabase.from('online_bookings').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        locations: locationsRes.count || 0,
        categories: categoriesRes.count || 0,
        extras: extrasRes.count || 0,
        insuranceTypes: insuranceRes.count || 0,
        paymentMethods: paymentsRes.count || 0,
        bookings: bookingsRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const menuItems = [
    {
      title: 'Locations',
      description: 'Manage pickup and dropoff locations',
      icon: MapPin,
      count: stats.locations,
      href: '/dashboard/book-online/locations',
      color: 'blue',
    },
    {
      title: 'Car Categories',
      description: 'Manage vehicle categories and pricing',
      icon: Tag,
      count: stats.categories,
      href: '/dashboard/book-online/categories',
      color: 'green',
    },
    {
      title: 'Extra Options',
      description: 'Manage add-ons and extras',
      icon: Plus,
      count: stats.extras,
      href: '/dashboard/book-online/extras',
      color: 'purple',
    },
    {
      title: 'Insurance Types',
      description: 'Manage insurance options',
      icon: Shield,
      count: stats.insuranceTypes,
      href: '/dashboard/book-online/insurance',
      color: 'orange',
    },
    {
      title: 'Payment Methods',
      description: 'Configure payment options',
      icon: CreditCard,
      count: stats.paymentMethods,
      href: '/dashboard/book-online/payment-methods',
      color: 'indigo',
    },
    {
      title: 'Bookings',
      description: 'View and manage online bookings',
      icon: Globe,
      count: stats.bookings,
      href: '/dashboard/book-online/bookings',
      color: 'pink',
    },
    {
      title: 'Design Settings',
      description: 'Customize booking page appearance',
      icon: Settings,
      href: '/dashboard/book-online/design',
      color: 'gray',
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
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const colorClasses = {
                blue: 'bg-blue-100 text-blue-600',
                green: 'bg-green-100 text-green-600',
                purple: 'bg-purple-100 text-purple-600',
                orange: 'bg-orange-100 text-orange-600',
                indigo: 'bg-indigo-100 text-indigo-600',
                pink: 'bg-pink-100 text-pink-600',
                gray: 'bg-gray-100 text-gray-600',
              };
              
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {item.count !== undefined && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {item.count}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

