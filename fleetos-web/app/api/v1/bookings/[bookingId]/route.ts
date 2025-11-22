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

/**
 * GET /api/v1/bookings/[bookingId]
 * Get booking details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { bookingId } = await params;

    // Get booking with related data
    const { data: booking, error: bookingError } = await supabase
      .from('online_bookings')
      .select(`
        *,
        car:booking_cars(
          id,
          make,
          model,
          year,
          license_plate,
          color,
          category:car_categories(*)
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
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/bookings/[bookingId]
 * Cancel/delete a booking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { bookingId } = await params;

    // Get booking first to check status
    const { data: booking, error: bookingError } = await supabase
      .from('online_bookings')
      .select('booking_status, payment_status, car_id, pickup_date, dropoff_date')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Only allow cancellation if booking is not completed or in progress
    if (booking.booking_status === 'completed' || booking.booking_status === 'in_progress') {
      return NextResponse.json(
        { error: 'Cannot cancel a booking that is completed or in progress' },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabase
      .from('online_bookings')
      .update({
        booking_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error cancelling booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    // Remove car availability block
    await supabase
      .from('car_availability')
      .delete()
      .eq('booking_id', bookingId);

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

