import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/v1/bookings/[bookingId]/payment
 * Process payment for a booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const body = await request.json();
    const {
      payment_method_id,
      amount,
      payment_intent_id,
      transaction_id,
    } = body;

    if (!payment_intent_id && !transaction_id) {
      return NextResponse.json(
        { error: 'payment_intent_id or transaction_id is required' },
        { status: 400 }
      );
    }

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('online_bookings')
      .select('*')
      .eq('id', params.bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if booking is expired
    if (booking.expires_at && new Date(booking.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Booking has expired' },
        { status: 410 }
      );
    }

    // Determine payment type
    const isFullPayment = amount >= booking.total_price;
    const paymentType = isFullPayment ? 'full_payment' : 
                       (booking.amount_paid > 0 ? 'remaining_payment' : 'deposit');

    // Update booking payment status
    const newAmountPaid = (parseFloat(booking.amount_paid?.toString() || '0')) + amount;
    const newAmountRemaining = booking.total_price - newAmountPaid;

    const { error: updateError } = await supabase
      .from('online_bookings')
      .update({
        payment_status: isFullPayment ? 'fully_paid' : 'deposit_paid',
        amount_paid: newAmountPaid,
        amount_remaining: Math.max(0, newAmountRemaining),
        booking_status: isFullPayment ? 'confirmed' : booking.booking_status,
      })
      .eq('id', params.bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    // Create payment transaction
    const { error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        booking_id: params.bookingId,
        transaction_id: payment_intent_id || transaction_id,
        amount,
        currency: 'EUR',
        transaction_type: paymentType,
        status: 'completed',
        payment_provider: payment_intent_id?.startsWith('pi_') ? 'stripe' : 'viva_wallet',
        completed_at: new Date().toISOString(),
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      // Don't fail the request, transaction record is secondary
    }

    // If fully paid, send confirmation email and auto-create contract if enabled
    if (isFullPayment) {
      // Send confirmation email (will be implemented in email service)
      // Auto-create contract if instant booking is enabled
      const { data: designSettings } = await supabase
        .from('booking_design_settings')
        .select('allow_instant_booking')
        .eq('organization_id', booking.organization_id)
        .single();

      if (designSettings?.allow_instant_booking) {
        // Trigger contract creation (will be implemented)
        // await autoCreateContractFromBooking(params.bookingId);
      }
    }

    return NextResponse.json({
      success: true,
      transaction_id: payment_intent_id || transaction_id,
      payment_status: isFullPayment ? 'fully_paid' : 'deposit_paid',
      amount_paid: newAmountPaid,
      amount_remaining: Math.max(0, newAmountRemaining),
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

