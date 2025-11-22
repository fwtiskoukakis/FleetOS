import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// For now, we'll create a simple payment intent structure
// Full Stripe integration will be added later
/**
 * POST /api/create-payment-intent
 * Create a payment intent for booking payment
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { bookingId, amount } = await request.json();

    if (!bookingId || !amount) {
      return NextResponse.json(
        { error: 'bookingId and amount are required' },
        { status: 400 }
      );
    }

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('online_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // For now, return a simple payment intent structure
    // Full Stripe integration will be implemented later
    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store payment intent in database
    await supabase.from('payment_transactions').insert({
      booking_id: bookingId,
      transaction_id: paymentIntentId,
      amount,
      currency: 'EUR',
      transaction_type: amount >= booking.total_price ? 'full_payment' : 'deposit',
      status: 'pending',
      payment_provider: 'stripe',
    });

    return NextResponse.json({
      clientSecret: paymentIntentId, // In real implementation, this would be from Stripe
      paymentIntentId,
    });
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

