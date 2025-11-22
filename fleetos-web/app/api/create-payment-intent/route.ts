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
    const { bookingId, amount, payment_method_id, provider } = await request.json();

    if (!bookingId || !amount || !payment_method_id) {
      return NextResponse.json(
        { error: 'bookingId, amount, and payment_method_id are required' },
        { status: 400 }
      );
    }

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('online_bookings')
      .select('*, organization:organizations(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get payment method details
    const { data: paymentMethod, error: pmError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', payment_method_id)
      .eq('is_active', true)
      .single();

    if (pmError || !paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found or inactive' },
        { status: 404 }
      );
    }

    // Process based on provider
    if (provider === 'viva_wallet') {
      // Viva Wallet integration
      const apiKey = paymentMethod.api_key_encrypted || paymentMethod.api_key;
      const apiSecret = paymentMethod.api_secret_encrypted || paymentMethod.api_secret;
      const merchantId = paymentMethod.merchant_id;

      if (!apiKey || !apiSecret) {
        return NextResponse.json(
          { error: 'Viva Wallet API credentials not configured' },
          { status: 400 }
        );
      }

      // Get origin for return URLs
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://fleetos.eu';
      const baseUrl = origin;
      
      // Viva Wallet checkout session creation
      // Note: This is a simplified implementation. Actual Viva Wallet API may differ.
      // You'll need to implement the actual Viva Wallet API call here.
      try {
        // Create Viva Wallet checkout session
        // This is a placeholder - you need to implement actual Viva Wallet API integration
        const checkoutUrl = await createVivaWalletCheckout({
          apiKey,
          apiSecret,
          merchantId,
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'EUR',
          bookingId: bookingId,
          bookingNumber: booking.booking_number || `BK-${bookingId.substring(0, 8)}`,
          customerEmail: booking.customer_email,
          customerName: booking.customer_full_name,
          successUrl: `${baseUrl}/booking/${booking.organization?.slug || 'default'}/confirmation/${bookingId}?payment_success=true`,
          cancelUrl: `${baseUrl}/booking/${booking.organization?.slug || 'default'}/payment/${bookingId}?payment_cancelled=true`,
        });

        // Store pending transaction
        await supabase.from('payment_transactions').insert({
          booking_id: bookingId,
          transaction_id: `vw_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          amount,
          currency: 'EUR',
          transaction_type: amount >= booking.total_price ? 'full_payment' : 'deposit',
          status: 'pending',
          payment_provider: 'viva_wallet',
        });

        return NextResponse.json({
          checkout_url: checkoutUrl,
          provider: 'viva_wallet',
        });
      } catch (vivaError) {
        console.error('Viva Wallet checkout creation failed:', vivaError);
        return NextResponse.json(
          { error: 'Failed to create Viva Wallet checkout. Please check your API credentials.' },
          { status: 500 }
        );
      }
    } else if (provider === 'stripe') {
      // Stripe integration (placeholder)
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
    } else {
      return NextResponse.json(
        { error: 'Unsupported payment provider' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to create Viva Wallet checkout
// This is a placeholder - implement actual Viva Wallet API integration
async function createVivaWalletCheckout(params: {
  apiKey: string;
  apiSecret: string;
  merchantId?: string;
  amount: number;
  currency: string;
  bookingId: string;
  bookingNumber: string;
  customerEmail: string;
  customerName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  // TODO: Implement actual Viva Wallet API integration
  // For now, return an error that implementation is needed
  
  // Viva Wallet API typically uses OAuth2 authentication
  // Steps:
  // 1. Get access token using client_id and client_secret
  // 2. Create a checkout session with the access token
  // 3. Return the checkout URL
  
  // This is a placeholder implementation
  // You'll need to:
  // - Get Viva Wallet access token from their OAuth2 endpoint
  // - Call Viva Wallet Checkout API to create a payment order
  // - Return the checkout URL
  
  throw new Error('Viva Wallet API integration not yet implemented. Please implement the createVivaWalletCheckout function with actual Viva Wallet API calls.');
}

