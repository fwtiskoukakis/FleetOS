'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  List, Search, Filter, CheckCircle2, Clock, XCircle,
  Calendar, Car, MapPin, DollarSign, User, Phone, Mail
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

interface OnlineBooking {
  id: string;
  booking_number: string;
  customer_full_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_date: string;
  dropoff_date: string;
  rental_days: number;
  total_price: number;
  amount_paid: number;
  amount_remaining: number;
  booking_status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'deposit_paid' | 'fully_paid' | 'refunded' | 'cancelled';
  created_at: string;
  car?: {
    make: string;
    model: string;
    license_plate: string;
  };
  pickup_location?: {
    name_el: string;
  };
  dropoff_location?: {
    name_el: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  in_progress: '#3b82f6',
  completed: '#6b7280',
  cancelled: '#ef4444',
  no_show: '#ef4444',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  deposit_paid: '#3b82f6',
  fully_paid: '#10b981',
  refunded: '#ef4444',
  cancelled: '#ef4444',
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<OnlineBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<OnlineBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | OnlineBooking['booking_status']>('all');

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [searchQuery, filterStatus, bookings]);

  async function loadBookings() {
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
        .select(`
          *,
          car:booking_cars(make, model, license_plate),
          pickup_location:locations!pickup_location_id(name_el),
          dropoff_location:locations!dropoff_location_id(name_el)
        `)
        .order('created_at', { ascending: false });

      if (organizationId) {
        bookingsQuery = bookingsQuery.eq('organization_id', organizationId);
      }

      const { data, error } = await bookingsQuery;

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadBookings();
  }

  function filterBookings() {
    let filtered = bookings;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(b => b.booking_status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.booking_number.toLowerCase().includes(query) ||
        b.customer_full_name.toLowerCase().includes(query) ||
        b.customer_email.toLowerCase().includes(query) ||
        b.customer_phone.includes(query) ||
        (b.car && `${b.car.make} ${b.car.model}`.toLowerCase().includes(query))
      );
    }

    setFilteredBookings(filtered);
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'no_show': return 'No Show';
      default: return status;
    }
  }

  function getPaymentStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'deposit_paid': return 'Deposit Paid';
      case 'fully_paid': return 'Fully Paid';
      case 'refunded': return 'Refunded';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by booking number, customer name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {Object.keys(STATUS_COLORS).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as OnlineBooking['booking_status'])}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <List className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No bookings found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        #{booking.booking_number}
                      </h3>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${STATUS_COLORS[booking.booking_status] || '#6b7280'}15`,
                          color: STATUS_COLORS[booking.booking_status] || '#6b7280',
                        }}
                      >
                        {getStatusLabel(booking.booking_status)}
                      </span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${PAYMENT_STATUS_COLORS[booking.payment_status] || '#6b7280'}15`,
                          color: PAYMENT_STATUS_COLORS[booking.payment_status] || '#6b7280',
                        }}
                      >
                        {getPaymentStatusLabel(booking.payment_status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {format(parseISO(booking.created_at), 'dd MMM yyyy HH:mm', { locale: el })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      €{booking.total_price.toFixed(2)}
                    </p>
                    {booking.amount_paid > 0 && (
                      <p className="text-sm text-gray-600">
                        Paid: €{booking.amount_paid.toFixed(2)}
                      </p>
                    )}
                    {booking.amount_remaining > 0 && (
                      <p className="text-sm text-orange-600">
                        Remaining: €{booking.amount_remaining.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Customer Info */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Customer
                    </h4>
                    <p className="text-sm text-gray-700">{booking.customer_full_name}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{booking.customer_email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{booking.customer_phone}</span>
                    </div>
                  </div>

                  {/* Rental Info */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Rental Period
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span>Pickup:</span>
                      <span className="font-medium">
                        {format(parseISO(booking.pickup_date), 'dd MMM yyyy', { locale: el })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span>Dropoff:</span>
                      <span className="font-medium">
                        {format(parseISO(booking.dropoff_date), 'dd MMM yyyy', { locale: el })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {booking.rental_days} day{booking.rental_days !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Car and Locations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  {booking.car && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Car className="w-4 h-4 text-gray-400" />
                      <span>
                        {booking.car.make} {booking.car.model} ({booking.car.license_plate})
                      </span>
                    </div>
                  )}
                  {booking.pickup_location && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>Pickup: {booking.pickup_location.name_el}</span>
                    </div>
                  )}
                  {booking.dropoff_location && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>Dropoff: {booking.dropoff_location.name_el}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

