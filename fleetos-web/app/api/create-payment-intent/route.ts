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
      // Try both field names in case they exist in different formats
      const apiKey = paymentMethod.api_key_encrypted || paymentMethod.api_key || null;
      const apiSecret = paymentMethod.api_secret_encrypted || paymentMethod.api_secret || null;
      const merchantId = paymentMethod.merchant_id || null;

      console.log('Viva Wallet credentials check:', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasMerchantId: !!merchantId,
        paymentMethodId: payment_method_id,
        provider: paymentMethod.provider,
      });

      if (!apiKey || !apiSecret || apiKey.trim() === '' || apiSecret.trim() === '') {
        console.error('Viva Wallet credentials missing or empty:', {
          apiKey: apiKey ? '***' + apiKey.slice(-4) : 'MISSING',
          apiSecret: apiSecret ? '***' + apiSecret.slice(-4) : 'MISSING',
        });
        return NextResponse.json(
          { error: 'Viva Wallet API credentials not configured. Please check your payment method settings and ensure Client ID and Client Secret are entered.' },
          { status: 400 }
        );
      }

      // Get origin for return URLs
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://fleetos.eu';
      const baseUrl = origin;
      
      // Get organization slug for URLs
      const { data: orgData } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', booking.organization_id)
        .single();
      
      const orgSlug = orgData?.slug || 'default';
      
      // Viva Wallet checkout session creation
      try {
        // Create Viva Wallet checkout session
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
          successUrl: `${baseUrl}/booking/${orgSlug}/confirmation/${bookingId}?payment_success=true`,
          cancelUrl: `${baseUrl}/booking/${orgSlug}/payment/${bookingId}?payment_cancelled=true`,
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
        const errorMessage = vivaError instanceof Error ? vivaError.message : 'Unknown error';
        const errorStack = vivaError instanceof Error ? vivaError.stack : undefined;
        
        // Always return error details to help with debugging
        return NextResponse.json(
          { 
            error: 'Failed to create Viva Wallet checkout. Please check your API credentials.',
            details: errorMessage,
            stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
          },
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
  // Viva Wallet uses OAuth2 for authentication
  // Step 1: Get access token
  // Check if we're in test mode (credentials starting with specific patterns indicate test)
  const isTestMode = params.apiKey.includes('test') || params.apiKey.includes('sandbox') || params.apiKey.startsWith('demo');
  
  // Viva Wallet API base URLs
  // OAuth token endpoint and Orders API both use the API subdomain
  // Demo: https://demo-api.vivapayments.com
  // Production: https://api.vivapayments.com
  const vivaApiBaseUrl = isTestMode 
    ? 'https://demo-api.vivapayments.com' // Test/sandbox environment API
    : 'https://api.vivapayments.com'; // Production environment API
  
  // OAuth token endpoint: /connect/token (or /oauth2/token)
  // Try /connect/token first (Viva Wallet standard)
  let tokenUrl = `${vivaApiBaseUrl}/connect/token`;
  
  // Create Basic Auth header (Buffer is available in Node.js runtime)
  const credentials = Buffer.from(`${params.apiKey}:${params.apiSecret}`).toString('base64');
  
  console.log('Attempting Viva Wallet authentication:', {
    isTestMode,
    vivaApiBaseUrl,
    tokenUrl,
    hasApiKey: !!params.apiKey,
    hasApiSecret: !!params.apiSecret,
  });
  
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
  });

  // Check content type before processing
  const tokenContentType = tokenResponse.headers.get('content-type');
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Viva Wallet token error:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      contentType: tokenContentType,
      error: errorText.substring(0, 500), // Limit error text length
      url: tokenUrl,
    });
    
    // If we got HTML, it's likely an error page
    if (tokenContentType?.includes('text/html')) {
      throw new Error(`Viva Wallet authentication failed with HTML response (${tokenResponse.status}). The endpoint may be incorrect or credentials are invalid. URL: ${tokenUrl}`);
    }
    
    throw new Error(`Failed to authenticate with Viva Wallet: ${tokenResponse.status} ${tokenResponse.statusText}. Please check your Client ID and Client Secret. Response: ${errorText.substring(0, 200)}`);
  }

  // Check if response is JSON before parsing
  if (!tokenContentType?.includes('application/json')) {
    const errorText = await tokenResponse.text();
    console.error('Viva Wallet token response is not JSON:', {
      contentType: tokenContentType,
      response: errorText.substring(0, 500),
    });
    throw new Error(`Viva Wallet returned non-JSON response. Content-Type: ${tokenContentType}. This may indicate an incorrect endpoint or authentication error.`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    console.error('Viva Wallet token response:', tokenData);
    throw new Error('Failed to obtain Viva Wallet access token. Invalid response from authentication endpoint.');
  }

  console.log('Viva Wallet authentication successful');

  // Step 2: Create payment order
  // Viva Wallet API endpoint for creating orders
  const orderUrl = `${vivaApiBaseUrl}/orders`;
  
  // Viva Wallet order creation payload
  // Note: Viva Wallet API format may vary - adjust based on actual API documentation
  const orderData: any = {
    amount: params.amount, // Amount in cents (e.g., 124 for €1.24)
    customerTrns: `Booking ${params.bookingNumber}`,
    paymentTimeout: 1800, // 30 minutes in seconds
    preauth: false,
    allowRecurring: false,
    maxInstallments: 0,
    merchantTrns: `Booking ID: ${params.bookingId}`,
    tags: [params.bookingId],
  };

  // Add customer info if available
  if (params.customerEmail) {
    orderData.customer = {
      email: params.customerEmail,
      fullName: params.customerName || '',
    };
  }

  // Add source code (merchant ID) if provided
  if (params.merchantId) {
    orderData.sourceCode = params.merchantId;
  }

  // Add redirect URLs
  if (params.successUrl) {
    orderData.successUrl = params.successUrl;
  }
  if (params.cancelUrl) {
    orderData.cancelUrl = params.cancelUrl;
  }

  console.log('Creating Viva Wallet order:', {
    orderUrl,
    amount: params.amount,
    currency: params.currency,
    bookingNumber: params.bookingNumber,
  });

  const orderResponse = await fetch(orderUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(orderData),
  });

  // Check content type before processing
  const orderContentType = orderResponse.headers.get('content-type');
  
  if (!orderResponse.ok) {
    const errorText = await orderResponse.text();
    console.error('Viva Wallet order creation error:', {
      status: orderResponse.status,
      statusText: orderResponse.statusText,
      contentType: orderContentType,
      error: errorText.substring(0, 500),
      orderData,
      url: orderUrl,
    });
    
    // If we got HTML, it's likely an error page
    if (orderContentType?.includes('text/html')) {
      throw new Error(`Viva Wallet order creation failed with HTML response (${orderResponse.status}). The endpoint may be incorrect. URL: ${orderUrl}`);
    }
    
    throw new Error(`Failed to create Viva Wallet order: ${orderResponse.status} ${orderResponse.statusText}. ${errorText.substring(0, 200)}`);
  }

  // Check if response is JSON before parsing
  if (!orderContentType?.includes('application/json')) {
    const errorText = await orderResponse.text();
    console.error('Viva Wallet order response is not JSON:', {
      contentType: orderContentType,
      response: errorText.substring(0, 500),
    });
    throw new Error(`Viva Wallet returned non-JSON response for order creation. Content-Type: ${orderContentType}.`);
  }

  const orderResult = await orderResponse.json();
  console.log('Viva Wallet order created:', orderResult);
  
  // Viva Wallet returns the checkout URL in different formats depending on the API version
  // Check for common response formats
  if (orderResult.checkoutUrl) {
    return orderResult.checkoutUrl;
  } else if (orderResult.url) {
    return orderResult.url;
  } else if (orderResult.orderCode) {
    // If only orderCode is returned, construct the checkout URL
    // Format: https://www.vivawallet.com/web/checkout?ref={orderCode}
    const checkoutBase = isTestMode 
      ? 'https://demo.vivapayments.com/web/checkout'
      : 'https://www.vivawallet.com/web/checkout';
    return `${checkoutBase}?ref=${orderResult.orderCode}`;
  } else if (orderResult.OrderCode) {
    // Some APIs return capitalized OrderCode
    const checkoutBase = isTestMode 
      ? 'https://demo.vivapayments.com/web/checkout'
      : 'https://www.vivawallet.com/web/checkout';
    return `${checkoutBase}?ref=${orderResult.OrderCode}`;
  } else {
    console.error('Unexpected Viva Wallet response:', orderResult);
    throw new Error(`Viva Wallet returned an unexpected response format. Response: ${JSON.stringify(orderResult)}`);
  }
}

