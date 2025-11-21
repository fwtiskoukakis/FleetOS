'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Lock, CheckCircle } from 'lucide-react';

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  const bookingId = searchParams.get('booking_id') || '';
  const amount = Number(searchParams.get('amount')) || 0;
  const paymentType = searchParams.get('type') || 'full';

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  async function loadBooking() {
    if (!bookingId) return;

    const { data } = await supabase
      .from('online_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (data) setBooking(data);
  }

  async function handlePayment(method: 'stripe' | 'viva' | 'bank' | 'cash') {
    setLoading(true);

    try {
      if (method === 'stripe') {
        // Create payment intent
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            bookingId,
            customerEmail: booking?.customer_email,
            customerName: booking?.customer_full_name,
          }),
        });

        const { clientSecret } = await response.json();

        // In a real implementation, you would redirect to Stripe Checkout
        // or use Stripe Elements to complete the payment
        // For now, we'll simulate success
        
        // Update booking payment status
        await supabase
          .from('online_bookings')
          .update({ 
            payment_status: 'paid',
            booking_status: 'confirmed',
          })
          .eq('id', bookingId);

        // Redirect to confirmation
        router.push(`/confirmation?booking_id=${bookingId}`);
      } else if (method === 'viva') {
        // TODO: Implement Viva Wallet
        alert('Viva Wallet integration coming soon!');
      } else if (method === 'bank') {
        // Bank transfer - update status to pending
        await supabase
          .from('online_bookings')
          .update({ 
            payment_status: 'pending',
            booking_status: 'pending_payment',
          })
          .eq('id', bookingId);

        router.push(`/confirmation?booking_id=${bookingId}&payment_method=bank`);
      } else if (method === 'cash') {
        // Pay on arrival
        await supabase
          .from('online_bookings')
          .update({ 
            payment_status: 'pending',
            booking_status: 'confirmed',
          })
          .eq('id', bookingId);

        router.push(`/confirmation?booking_id=${bookingId}&payment_method=cash`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Υπήρξε πρόβλημα με την πληρωμή. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Ολοκλήρωση Πληρωμής</h1>
          <p className="text-gray-600">Επιλέξτε τρόπο πληρωμής</p>
        </div>

        {/* Amount Card */}
        <div className="card mb-8 text-center">
          <p className="text-gray-600 mb-2">Ποσό προς πληρωμή</p>
          <p className="text-4xl font-bold text-primary mb-2">{formatCurrency(amount)}</p>
          {paymentType === 'deposit' && (
            <p className="text-sm text-gray-500">
              (Προκαταβολή 30% - Υπόλοιπο κατά την παραλαβή)
            </p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="space-y-4">
          {/* Stripe */}
          <button
            onClick={() => handlePayment('stripe')}
            disabled={loading}
            className="card w-full text-left hover:shadow-lg transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard size={32} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Πιστωτική / Χρεωστική Κάρτα</h3>
                <p className="text-sm text-gray-600">Ασφαλής πληρωμή μέσω Stripe</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Lock size={16} />
                <span>Ασφαλές</span>
              </div>
            </div>
          </button>

          {/* Viva Wallet */}
          <button
            onClick={() => handlePayment('viva')}
            disabled={loading}
            className="card w-full text-left hover:shadow-lg transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Viva Wallet</h3>
                <p className="text-sm text-gray-600">Πληρωμή με Viva Wallet</p>
              </div>
            </div>
          </button>

          {/* Bank Transfer */}
          <button
            onClick={() => handlePayment('bank')}
            disabled={loading}
            className="card w-full text-left hover:shadow-lg transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Τραπεζική Κατάθεση</h3>
                <p className="text-sm text-gray-600">Θα λάβετε οδηγίες μέσω email</p>
              </div>
            </div>
          </button>

          {/* Pay on Arrival */}
          {paymentType === 'full' && (
            <button
              onClick={() => handlePayment('cash')}
              disabled={loading}
              className="card w-full text-left hover:shadow-lg transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Πληρωμή κατά την Παραλαβή</h3>
                  <p className="text-sm text-gray-600">Μετρητά ή κάρτα στο κατάστημα</p>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg flex items-center gap-3">
          <Lock size={24} className="text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Όλες οι πληρωμές είναι ασφαλείς και προστατεύονται με κρυπτογράφηση SSL.
            Τα στοιχεία της κάρτας σας δεν αποθηκεύονται στους servers μας.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentPageContent />
    </Suspense>
  );
}

