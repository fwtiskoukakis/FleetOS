import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendBookingConfirmationEmail } from '@/lib/email-booking.service';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST /api/v1/bookings/[bookingId]/verify-viva-payment
 * Verify Viva Wallet payment and update booking status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { bookingId } = await params;
    const body = await request.json();
    const { transaction_id, order_code } = body;

    // Get booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from('online_bookings')
      .select(`
        *,
        organization:organizations(*),
        car:booking_cars(
          id,
          make,
          model,
          year,
          license_plate,
          color
        ),
        pickup_location:locations!online_bookings_pickup_location_id_fkey(
          id,
          name_el,
          address
        ),
        dropoff_location:locations!online_bookings_dropoff_location_id_fkey(
          id,
          name_el,
          address
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if payment is already verified
    if (booking.payment_status === 'fully_paid') {
      console.log('Payment already verified for booking:', bookingId);
      return NextResponse.json({
        success: true,
        booking_id: bookingId,
        payment_status: 'fully_paid',
        already_verified: true,
      });
    }

    // Get payment method to get credentials for Viva Wallet API verification
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('organization_id', booking.organization_id)
      .eq('provider', 'viva_wallet')
      .eq('is_active', true)
      .single();

    // TODO: Verify payment with Viva Wallet API using transaction_id and order_code
    // For now, we'll trust the redirect and mark as paid
    // In production, you should call Viva Wallet API to verify the transaction
    // GET /checkout/v2/transactions/{transactionId}
    
    const amountPaid = booking.total_price; // Use total price
    const isFullPayment = true;

    // Update booking payment status
    const { error: updateError } = await supabase
      .from('online_bookings')
      .update({
        payment_status: isFullPayment ? 'fully_paid' : 'deposit_paid',
        amount_paid: amountPaid,
        amount_remaining: 0,
        booking_status: isFullPayment ? 'confirmed' : booking.booking_status,
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking', details: updateError.message },
        { status: 500 }
      );
    }

    // Create or update payment transaction record
    const transactionId = transaction_id || `vw_${order_code || Date.now()}`;
    
    await supabase
      .from('payment_transactions')
      .upsert({
        booking_id: bookingId,
        transaction_id: transactionId,
        amount: amountPaid,
        currency: 'EUR',
        transaction_type: 'full_payment',
        status: 'completed',
        payment_provider: 'viva_wallet',
        completed_at: new Date().toISOString(),
        provider_response: {
          transaction_id,
          order_code,
        },
      }, {
        onConflict: 'transaction_id',
      });

    // Send booking confirmation email
    if (isFullPayment) {
      try {
        // Handle car data - can be array or single object
        const carInfo = Array.isArray(booking.car) && booking.car.length > 0
          ? booking.car[0]
          : (booking.car || null);

        const carMakeModel = carInfo
          ? `${carInfo.make || ''} ${carInfo.model || ''}${carInfo.year ? ` (${carInfo.year})` : ''}`.trim()
          : '';

        await sendBookingConfirmationEmail({
          bookingId: booking.id,
          bookingNumber: booking.booking_number || `BK-${booking.id.substring(0, 8)}`,
          customerName: booking.customer_full_name,
          customerEmail: booking.customer_email,
          organizationName: booking.organization?.company_name || '',
          pickupDate: booking.pickup_date,
          pickupTime: booking.pickup_time || '10:00',
          pickupLocation: booking.pickup_location?.name_el || booking.pickup_location?.address || '',
          dropoffDate: booking.dropoff_date,
          dropoffTime: booking.dropoff_time || '10:00',
          dropoffLocation: booking.dropoff_location?.name_el || booking.dropoff_location?.address || '',
          carMakeModel,
          totalPrice: amountPaid,
          paymentStatus: 'fully_paid',
          bookingStatus: 'confirmed',
        });
        console.log('Booking confirmation email sent to:', booking.customer_email);
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      payment_status: isFullPayment ? 'fully_paid' : 'deposit_paid',
      amount_paid: amountPaid,
      transaction_id: transactionId,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to verify payment', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

