'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Mail, Calendar, MapPin, Car, FileText, Download, Home } from 'lucide-react';

interface Booking {
  id: string;
  booking_number: string;
  total_price: number;
  amount_paid: number;
  payment_status: string;
  booking_status: string;
  customer_full_name: string;
  customer_email: string;
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_date: string;
  dropoff_time: string;
  dropoff_location: string;
  car_make_model: string;
}

export default function ConfirmationPage({ 
  params 
}: { 
  params: Promise<{ slug: string; bookingId: string }> 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeParams, setRouteParams] = useState<{ slug: string; bookingId: string } | null>(null);

  const paymentMethod = searchParams.get('payment_method') || 'card';

  // Resolve params
  useEffect(() => {
    params.then(resolved => {
      setRouteParams(resolved);
    });
  }, [params]);

  useEffect(() => {
    if (routeParams) {
      loadBooking();
    }
  }, [routeParams]);

  async function loadBooking() {
    if (!routeParams) return;
    try {
      setLoading(true);
      // In a real implementation, fetch booking from API
      // For now, we'll use mock data
      setBooking({
        id: routeParams.bookingId,
        booking_number: `BK-${routeParams.bookingId.substring(0, 8).toUpperCase()}`,
        total_price: 450.00,
        amount_paid: 450.00,
        payment_status: paymentMethod === 'cash' ? 'pending' : 'fully_paid',
        booking_status: 'confirmed',
        customer_full_name: 'John Doe',
        customer_email: 'john@example.com',
        pickup_date: new Date().toISOString().split('T')[0],
        pickup_time: '10:00',
        pickup_location: 'Athens Airport',
        dropoff_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dropoff_time: '10:00',
        dropoff_location: 'Athens Airport',
        car_make_model: 'Toyota Corolla',
      });
    } catch (err) {
      console.error('Error loading booking:', err);
      setError('Failed to load booking confirmation');
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(amount: number): string {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('el-GR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading confirmation...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Booking not found'}</p>
          <Link
            href={routeParams ? `/booking/${routeParams.slug}` : '#'}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-3xl">
        {/* Success Message */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-lg text-gray-600 mb-4">
            Thank you, {booking.customer_full_name}! Your booking has been confirmed.
          </p>
          <p className="text-sm text-gray-500">
            Booking Number: <span className="font-semibold text-gray-900">{booking.booking_number}</span>
          </p>
        </div>

        {/* Booking Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Details</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Car className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Vehicle</p>
                <p className="font-semibold text-gray-900">{booking.car_make_model}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Pickup</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(booking.pickup_date)} at {booking.pickup_time}
                </p>
                <p className="text-sm text-gray-600">{booking.pickup_location}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Dropoff</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(booking.dropoff_date)} at {booking.dropoff_time}
                </p>
                <p className="text-sm text-gray-600">{booking.dropoff_location}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Price</span>
                <span className="text-2xl font-bold text-gray-900">{formatPrice(booking.total_price)}</span>
              </div>
              {paymentMethod === 'cash' && (
                <p className="text-sm text-gray-500 mt-2">Payment will be collected on arrival</p>
              )}
              {paymentMethod === 'bank' && (
                <p className="text-sm text-gray-500 mt-2">Please complete bank transfer within 24 hours</p>
              )}
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>A confirmation email has been sent to {booking.customer_email}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Please arrive at the pickup location 15 minutes before your scheduled time</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Bring a valid driver's license and the credit card used for booking</span>
            </li>
            {paymentMethod === 'bank' && (
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Complete the bank transfer and send proof of payment to our email</span>
              </li>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold flex items-center justify-center gap-2">
            <Download className="w-5 h-5" />
            Download Receipt
          </button>
          <Link
            href={routeParams ? `/booking/${routeParams.slug}` : '#'}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Need help? Contact us at support@fleetos.eu</p>
        </div>
      </main>
    </div>
  );
}

