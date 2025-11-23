'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader, AlertCircle } from 'lucide-react';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  useEffect(() => {
    // Get Viva Wallet redirect parameters
    const transactionId = searchParams.get('t'); // Transaction ID
    const orderCode = searchParams.get('s'); // Order code (16-digit)
    const eventId = searchParams.get('eventId'); // Error code (if failure)
    const lang = searchParams.get('lang'); // Language

    console.log('Payment success page loaded with params:', {
      transactionId,
      orderCode,
      eventId,
      lang,
    });

    // If eventId is present, it's a failure
    if (eventId) {
      setError(`Payment failed. Error code: ${eventId}`);
      setLoading(false);
      return;
    }

    // If order code is present, look up the booking
    if (orderCode) {
      lookupBookingByOrderCode(orderCode, transactionId || '');
    } else {
      setError('No order code provided. Please contact support.');
      setLoading(false);
    }
  }, [searchParams]);

  async function lookupBookingByOrderCode(orderCode: string, transactionId: string) {
    try {
      console.log('Looking up booking by order code:', orderCode);
      
      // Call API to find booking by order code
      // The order code is stored in payment_transactions or we can search by transaction_id
      const response = await fetch(`/api/v1/bookings/find-by-order-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_code: orderCode,
          transaction_id: transactionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to find booking');
      }

      const data = await response.json();
      console.log('Booking found:', data);

      if (data.booking_id && data.org_slug) {
        setBookingId(data.booking_id);
        setOrgSlug(data.org_slug);
        
        // Redirect to confirmation page with transaction parameters
        const confirmationUrl = `/booking/${data.org_slug}/confirmation/${data.booking_id}?t=${transactionId}&s=${orderCode}`;
        console.log('Redirecting to confirmation page:', confirmationUrl);
        
        // Small delay to show success message
        setTimeout(() => {
          router.push(confirmationUrl);
        }, 1500);
      } else {
        throw new Error('Booking ID or organization slug not found');
      }
    } catch (err) {
      console.error('Error looking up booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment. Please contact support with order code: ' + orderCode);
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4 animate-pulse" />
        <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-600">Processing your booking...</p>
        {bookingId && orgSlug && (
          <p className="text-sm text-gray-500 mt-2">Redirecting to confirmation...</p>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}