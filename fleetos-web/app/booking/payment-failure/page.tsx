'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Home, CreditCard } from 'lucide-react';

function PaymentFailureContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const orderCode = searchParams.get('s'); // Order code
    const eventId = searchParams.get('eventId'); // Error code
    const lang = searchParams.get('lang'); // Language

    console.log('Payment failure page loaded with params:', {
      orderCode,
      eventId,
      lang,
    });
  }, [searchParams]);

  const orderCode = searchParams.get('s');
  const eventId = searchParams.get('eventId');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
        <p className="text-gray-600 mb-4">
          Unfortunately, your payment could not be processed. Please try again or contact support.
        </p>
        
        {orderCode && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Order Code:</span> {orderCode}
            </p>
            {eventId && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-semibold">Error Code:</span> {eventId}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <Home className="w-5 h-5" />
            Go to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
          >
            <CreditCard className="w-5 h-5" />
            Try Again
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Need help? Contact us at{' '}
          <a href="mailto:support@fleetos.eu" className="text-blue-600 hover:underline">
            support@fleetos.eu
          </a>
        </p>
      </div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentFailureContent />
    </Suspense>
  );
}