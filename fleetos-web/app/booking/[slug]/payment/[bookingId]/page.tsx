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
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; name: string; name_el: string; provider: string; is_active: boolean }>>([]);
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
      loadPaymentMethods();
    }
  }, [routeParams]);

  async function loadPaymentMethods() {
    if (!routeParams) return;
    try {
      // Get organization ID from slug
      const orgResponse = await fetch(`/api/v1/organizations/${routeParams.slug}/validate`);
      if (!orgResponse.ok) return;
      
      const orgData = await orgResponse.json();
      if (!orgData.organization_id) return;

      // Fetch active payment methods for this organization
      // Note: This would need an API endpoint, for now using direct Supabase call
      // In production, create: /api/v1/organizations/[slug]/payment-methods
      const response = await fetch(`/api/v1/organizations/${routeParams.slug}/payment-methods`);
      
      if (response.ok) {
        const data = await response.json();
        const activeMethods = (data.payment_methods || []).filter((pm: any) => pm.is_active && pm.provider !== 'cash');
        setPaymentMethods(activeMethods);
        if (activeMethods.length > 0) {
          setPaymentMethod(activeMethods[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
    }
  }

  async function loadBooking() {
    if (!routeParams) return;
    try {
      setLoading(true);
      setError(null);
      
      // Fetch booking from API
      const response = await fetch(`/api/v1/bookings/${routeParams.bookingId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load booking');
      }

      const data = await response.json();
      const bookingData = data.booking;

      setBooking({
        id: bookingData.id,
        booking_number: bookingData.booking_number || `BK-${bookingData.id.substring(0, 8).toUpperCase()}`,
        total_price: parseFloat(bookingData.total_price?.toString() || '0'),
        amount_paid: parseFloat(bookingData.amount_paid?.toString() || '0'),
        amount_remaining: parseFloat(bookingData.amount_remaining?.toString() || bookingData.total_price?.toString() || '0'),
        payment_status: bookingData.payment_status || 'pending',
        booking_status: bookingData.booking_status || 'pending',
        customer_full_name: bookingData.customer_full_name || '',
        customer_email: bookingData.customer_email || '',
        pickup_date: bookingData.pickup_date || '',
        dropoff_date: bookingData.dropoff_date || '',
      });
    } catch (err) {
      console.error('Error loading booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to load booking details');
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

      if (!paymentMethod) {
        throw new Error('Please select a payment method');
      }

      // Get selected payment method details
      const selectedMethod = paymentMethods.find(pm => pm.id === paymentMethod);
      if (!selectedMethod) {
        throw new Error('Invalid payment method selected');
      }

      // Process payment based on provider
      if (selectedMethod.provider === 'viva_wallet') {
        // Create Viva Wallet checkout session
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId: routeParams.bookingId,
            amount: booking?.amount_remaining || booking?.total_price || 0,
            payment_method_id: paymentMethod,
            provider: selectedMethod.provider,
          }),
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            const text = await response.text();
            errorData = { error: text || 'Failed to create payment intent' };
          }
          console.error('Payment intent creation failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
          const errorMsg = errorData.error || 'Failed to create Viva Wallet checkout';
          const details = errorData.details ? ` Details: ${errorData.details}` : '';
          throw new Error(`${errorMsg}${details}`);
        }

        const data = await response.json();
        console.log('Payment intent created:', data);
        
        // Redirect to Viva Wallet checkout URL
        if (data.checkout_url) {
          console.log('Redirecting to checkout URL:', data.checkout_url);
          window.location.href = data.checkout_url;
        } else if (data.clientSecret) {
          // If we get a client secret, redirect to Viva Wallet with it
          // Viva Wallet typically uses a checkout URL format
          throw new Error('Viva Wallet checkout URL not returned. Please check your API configuration.');
        } else {
          console.error('Invalid response from payment API:', data);
          throw new Error('Invalid response from payment API. No checkout URL returned.');
        }
      } else if (selectedMethod.provider === 'stripe') {
        // Create Stripe payment intent
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId: routeParams.bookingId,
            amount: booking?.amount_remaining || booking?.total_price || 0,
            payment_method_id: paymentMethod,
            provider: selectedMethod.provider,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create payment intent');
        }

        const data = await response.json();
        
        // Redirect to Stripe checkout or use Stripe Elements
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else if (data.clientSecret) {
          // For Stripe, we would use Stripe Elements to process payment
          // For now, show error that Stripe Elements integration is needed
          throw new Error('Stripe Elements integration needed. Please implement Stripe Elements or use Stripe Checkout.');
        } else {
          throw new Error('Invalid response from payment API');
        }
      } else if (selectedMethod.provider === 'bank_transfer') {
        // Bank transfer - mark as pending
        await fetch(`/api/v1/bookings/${routeParams.bookingId}/payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment_method_id: paymentMethod,
            amount: booking?.amount_remaining || booking?.total_price || 0,
            transaction_id: `BANK-${Date.now()}`,
          }),
        });

        router.push(`/booking/${routeParams.slug}/confirmation/${routeParams.bookingId}?payment_method=bank`);
      } else {
        throw new Error('Unsupported payment method');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  }

  async function processPaymentSuccess(paymentIntentId: string) {
    if (!routeParams || !paymentMethod) {
      throw new Error('Route parameters or payment method not loaded');
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
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No payment methods available. Please contact support.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`block border rounded-lg p-4 cursor-pointer transition-colors ${
                    paymentMethod === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{method.name_el || method.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {method.provider === 'stripe' && 'Pay securely with Stripe'}
                        {method.provider === 'viva_wallet' && 'Pay with Viva Wallet'}
                        {method.provider === 'bank_transfer' && 'Transfer funds directly to our bank account'}
                        {method.provider === 'paypal' && 'Pay with PayPal'}
                        {method.provider === 'revolut' && 'Pay with Revolut'}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
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
          disabled={processing || amountToPay <= 0 || !paymentMethod || paymentMethods.length === 0}
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

