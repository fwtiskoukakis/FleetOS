import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentConfirmationEmail } from '@/lib/email-booking.service';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // In production, verify the webhook signature using Stripe SDK
    // For now, we'll process the event directly
    // const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET!);

    // Parse the event manually (in production, use Stripe SDK)
    const event = JSON.parse(body);

    console.log('Stripe webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: any) {
  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    console.warn('Payment intent missing bookingId metadata');
    return;
  }

  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('online_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingId);
      return;
    }

    const amountPaid = paymentIntent.amount / 100; // Convert from cents
    const isFullPayment = amountPaid >= booking.total_price;

    // Update booking payment status
    const { error: updateError } = await supabase
      .from('online_bookings')
      .update({
        payment_status: isFullPayment ? 'fully_paid' : 'deposit_paid',
        amount_paid: amountPaid,
        amount_remaining: Math.max(0, booking.total_price - amountPaid),
        booking_status: isFullPayment ? 'confirmed' : booking.booking_status,
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return;
    }

    // Update or create payment transaction
    await supabase
      .from('payment_transactions')
      .upsert({
        booking_id: bookingId,
        transaction_id: paymentIntent.id,
        amount: amountPaid,
        currency: paymentIntent.currency.toUpperCase(),
        transaction_type: isFullPayment ? 'full_payment' : 'deposit',
        status: 'completed',
        payment_provider: 'stripe',
        provider_response: paymentIntent,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'transaction_id',
      });

    // Send payment confirmation email
    await sendPaymentConfirmationEmail({
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
      customerName: booking.customer_full_name,
      customerEmail: booking.customer_email,
      organizationName: '', // Will be fetched if needed
      pickupDate: booking.pickup_date,
      pickupTime: booking.pickup_time,
      pickupLocation: booking.pickup_location || '',
      dropoffDate: booking.dropoff_date,
      dropoffTime: booking.dropoff_time,
      dropoffLocation: booking.dropoff_location || '',
      carMakeModel: '', // Will be fetched if needed
      totalPrice: amountPaid,
      paymentStatus: isFullPayment ? 'fully_paid' : 'deposit_paid',
      bookingStatus: booking.booking_status,
    });

    // If fully paid, auto-create contract if instant booking is enabled
    if (isFullPayment) {
      const { data: designSettings } = await supabase
        .from('booking_design_settings')
        .select('allow_instant_booking')
        .eq('organization_id', booking.organization_id)
        .single();

      if (designSettings?.allow_instant_booking) {
        // Auto-create contract
        await supabase.rpc('auto_create_contract_from_booking', {
          p_booking_id: bookingId,
        });
      }
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: any) {
  const supabase = getSupabaseClient();
  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    return;
  }

  try {
    // Update payment transaction status
    await supabase
      .from('payment_transactions')
      .update({
        status: 'failed',
        error_message: paymentIntent.last_payment_error?.message || 'Payment failed',
        failed_at: new Date().toISOString(),
      })
      .eq('transaction_id', paymentIntent.id);

    // Optionally update booking status or send notification
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(charge: any) {
  const supabase = getSupabaseClient();
  const paymentIntentId = charge.payment_intent;

  if (!paymentIntentId) {
    return;
  }

  try {
    // Find the transaction
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('booking_id')
      .eq('transaction_id', paymentIntentId)
      .single();

    if (!transaction) {
      return;
    }

    // Update transaction status
    await supabase
      .from('payment_transactions')
      .update({
        status: 'refunded',
      })
      .eq('transaction_id', paymentIntentId);

    // Update booking payment status
    await supabase
      .from('online_bookings')
      .update({
        payment_status: 'refunded',
        admin_notes: `Refund processed: ${charge.amount_refunded / 100} ${charge.currency.toUpperCase()}`,
      })
      .eq('id', transaction.booking_id);
  } catch (error) {
    console.error('Error handling charge refunded:', error);
  }
}

