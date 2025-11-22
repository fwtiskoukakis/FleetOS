'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, CheckCircle, AlertCircle, Loader, ArrowLeft } from 'lucide-react';

interface Booking {
  id: string;
  booking_number: string;
  total_price: number;
  amount_paid: number;
  amount_remaining: number;
  payment_status: string;
  booking_status: string;
  customer_full_name: string;
  customer_email: string;
  pickup_date: string;
  dropoff_date: string;
}

export default function PaymentPage({ 
  params 
}: { 
  params: Promise<{ slug: string; bookingId: string }> 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'viva' | 'bank' | 'cash'>('stripe');
  const [routeParams, setRouteParams] = useState<{ slug: string; bookingId: string } | null>(null);

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
      // For now, we'll use the bookingId from params
      setBooking({
        id: routeParams.bookingId,
        booking_number: `BK-${routeParams.bookingId.substring(0, 8).toUpperCase()}`,
        total_price: 0, // Will be loaded from API
        amount_paid: 0,
        amount_remaining: 0,
        payment_status: 'pending',
        booking_status: 'pending',
        customer_full_name: '',
        customer_email: '',
        pickup_date: '',
        dropoff_date: '',
      });
    } catch (err) {
      console.error('Error loading booking:', err);
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment() {
    if (!routeParams) {
      setError('Route parameters not loaded');
      return;
    }
    try {
      setProcessing(true);
      setError(null);

      // Process payment based on method
      if (paymentMethod === 'stripe' || paymentMethod === 'viva') {
        // Create payment intent
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId: routeParams.bookingId,
            amount: booking?.amount_remaining || booking?.total_price || 0,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create payment intent');
        }

        const data = await response.json();
        
        // In real implementation, redirect to Stripe/Viva Wallet checkout
        // For now, simulate payment success
        await processPaymentSuccess(data.paymentIntentId);
      } else if (paymentMethod === 'bank') {
        if (!routeParams) {
          throw new Error('Route parameters not loaded');
        }
        // Bank transfer - mark as pending
        await fetch(`/api/v1/bookings/${routeParams.bookingId}/payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment_method_id: 'bank',
            amount: booking?.amount_remaining || booking?.total_price || 0,
            transaction_id: `BANK-${Date.now()}`,
          }),
        });

        router.push(`/booking/${routeParams.slug}/confirmation/${routeParams.bookingId}?payment_method=bank`);
      } else if (paymentMethod === 'cash') {
        if (!routeParams) {
          throw new Error('Route parameters not loaded');
        }
        // Pay on arrival
        await fetch(`/api/v1/bookings/${routeParams.bookingId}/payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment_method_id: 'cash',
            amount: 0,
            transaction_id: `CASH-${Date.now()}`,
          }),
        });

        router.push(`/booking/${routeParams.slug}/confirmation/${routeParams.bookingId}?payment_method=cash`);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  }

  async function processPaymentSuccess(paymentIntentId: string) {
    if (!routeParams) {
      throw new Error('Route parameters not loaded');
    }
    // Update booking payment status
    const response = await fetch(`/api/v1/bookings/${routeParams.bookingId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_method_id: paymentMethod,
        amount: booking?.amount_remaining || booking?.total_price || 0,
        payment_intent_id: paymentIntentId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to process payment');
    }

    router.push(`/booking/${routeParams.slug}/confirmation/${routeParams.bookingId}`);
  }

  function formatPrice(amount: number): string {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist or has expired.</p>
          <Link
            href={routeParams ? `/booking/${routeParams.slug}` : '#'}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start New Booking
          </Link>
        </div>
      </div>
    );
  }

  const amountToPay = booking.amount_remaining || booking.total_price;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href={routeParams ? `/booking/${routeParams.slug}/book/${routeParams.bookingId}` : '#'}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Booking
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Booking Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Booking Number</span>
              <span className="font-semibold">{booking.booking_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Price</span>
              <span className="font-semibold">{formatPrice(booking.total_price)}</span>
            </div>
            {booking.amount_paid > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid</span>
                <span className="font-semibold text-green-600">{formatPrice(booking.amount_paid)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-lg font-semibold text-gray-900">Amount to Pay</span>
              <span className="text-lg font-bold text-blue-600">{formatPrice(amountToPay)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Select Payment Method
          </h2>
          <div className="space-y-3">
            <label className={`block border rounded-lg p-4 cursor-pointer transition-colors ${
              paymentMethod === 'stripe' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="payment_method"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={() => setPaymentMethod('stripe')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Credit/Debit Card</h3>
                  <p className="text-sm text-gray-600 mt-1">Pay securely with Stripe</p>
                </div>
              </div>
            </label>

            <label className={`block border rounded-lg p-4 cursor-pointer transition-colors ${
              paymentMethod === 'viva' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="payment_method"
                  value="viva"
                  checked={paymentMethod === 'viva'}
                  onChange={() => setPaymentMethod('viva')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Viva Wallet</h3>
                  <p className="text-sm text-gray-600 mt-1">Pay with Viva Wallet</p>
                </div>
              </div>
            </label>

            <label className={`block border rounded-lg p-4 cursor-pointer transition-colors ${
              paymentMethod === 'bank' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="payment_method"
                  value="bank"
                  checked={paymentMethod === 'bank'}
                  onChange={() => setPaymentMethod('bank')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Bank Transfer</h3>
                  <p className="text-sm text-gray-600 mt-1">Transfer funds directly to our bank account</p>
                </div>
              </div>
            </label>

            <label className={`block border rounded-lg p-4 cursor-pointer transition-colors ${
              paymentMethod === 'cash' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="payment_method"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Pay on Arrival</h3>
                  <p className="text-sm text-gray-600 mt-1">Pay in cash when you pick up the vehicle</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Secure Payment</h3>
              <p className="text-sm text-blue-800">
                Your payment information is encrypted and secure. We never store your full card details.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={processing || amountToPay <= 0}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pay {formatPrice(amountToPay)}
            </>
          )}
        </button>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center mt-4">
          By proceeding, you agree to our Terms & Conditions and Privacy Policy.
        </p>
      </main>
    </div>
  );
}

