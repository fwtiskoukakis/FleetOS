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
        // Map country name to ISO 3166-1 alpha-2 country code for Viva Wallet
        const getCountryCode = (country: string | null | undefined): string => {
          if (!country) return 'GR'; // Default to Greece
          const countryMap: Record<string, string> = {
            'Greece': 'GR', 'Greek': 'GR', 'Ελλάδα': 'GR',
            'United Kingdom': 'GB', 'UK': 'GB', 'Britain': 'GB',
            'United States': 'US', 'USA': 'US', 'America': 'US',
            'Germany': 'DE', 'Deutschland': 'DE',
            'France': 'FR',
            'Italy': 'IT', 'Italia': 'IT',
            'Spain': 'ES', 'España': 'ES',
            // Add more mappings as needed
          };
          return countryMap[country] || country.substring(0, 2).toUpperCase() || 'GR';
        };

        const { checkoutUrl, orderCode } = await createVivaWalletCheckout({
          apiKey,
          apiSecret,
          merchantId,
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'EUR',
          bookingId: bookingId,
          bookingNumber: booking.booking_number || `BK-${bookingId.substring(0, 8)}`,
          customerEmail: booking.customer_email,
          customerName: booking.customer_full_name,
          customerPhone: booking.customer_phone || undefined,
          countryCode: getCountryCode(booking.customer_country),
          requestLang: 'el-GR', // Default to Greek, can be made dynamic based on organization settings
          successUrl: `${baseUrl}/booking/payment-success`,
          cancelUrl: `${baseUrl}/booking/payment-failure`,
        });

        // Store pending transaction with order code
        await supabase.from('payment_transactions').insert({
          booking_id: bookingId,
          transaction_id: `vw_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          amount,
          currency: 'EUR',
          transaction_type: amount >= booking.total_price ? 'full_payment' : 'deposit',
          status: 'pending',
          payment_provider: 'viva_wallet',
          provider_response: orderCode ? {
            order_code: orderCode.toString(),
            orderCode: orderCode.toString(), // Store both formats
          } : null,
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
  customerPhone?: string;
  countryCode?: string;
  requestLang?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string; orderCode?: string | number }> {
  // Viva Wallet uses OAuth2 for authentication
  // Step 1: Get access token
  // Check if we're in test mode (credentials starting with specific patterns indicate test)
  const isTestMode = params.apiKey.includes('test') || params.apiKey.includes('sandbox') || params.apiKey.startsWith('demo');
  
  // Viva Wallet API base URLs
  // OAuth token endpoint uses the "accounts" subdomain (not "api")
  // According to official Viva Wallet documentation:
  // Demo: https://demo-accounts.vivapayments.com/connect/token
  // Production: https://accounts.vivapayments.com/connect/token
  const vivaOAuthBaseUrl = isTestMode 
    ? 'https://demo-accounts.vivapayments.com' // Test/sandbox environment OAuth
    : 'https://accounts.vivapayments.com'; // Production environment OAuth
  
  // Orders API uses the "api" subdomain
  const vivaApiBaseUrl = isTestMode 
    ? 'https://demo-api.vivapayments.com' // Test/sandbox environment API
    : 'https://api.vivapayments.com'; // Production environment API
  
  // OAuth token endpoint (correct endpoint from official documentation)
  const tokenUrl = `${vivaOAuthBaseUrl}/connect/token`;
  
  // Use the correct OAuth endpoint from official Viva Wallet documentation
  // Primary endpoint is accounts subdomain, fallback to others if needed
  const vivaMainBaseUrl = isTestMode 
    ? 'https://demo.vivapayments.com' // Test/sandbox environment main domain (fallback)
    : 'https://www.vivapayments.com'; // Production environment main domain (fallback)
  
  const tokenEndpoints = [
    tokenUrl, // Primary: accounts subdomain (official endpoint)
    `${vivaMainBaseUrl}/connect/token`, // Fallback: main domain
    `${vivaApiBaseUrl}/connect/token`,  // Fallback: API subdomain
  ];
  
  // Create Basic Auth header (Buffer is available in Node.js runtime)
  const credentials = Buffer.from(`${params.apiKey}:${params.apiSecret}`).toString('base64');
  
  console.log('Attempting Viva Wallet authentication:', {
    isTestMode,
    vivaOAuthBaseUrl,
    vivaApiBaseUrl,
    tokenUrl,
    tokenEndpoints,
    hasApiKey: !!params.apiKey,
    hasApiSecret: !!params.apiSecret,
  });
  
  // Try each endpoint with different authentication methods
  let tokenResponse: Response | null = null;
  let currentTokenUrl = '';
  let lastError: string = '';
  let usedAuthMethod = '';
  
  // Try both authentication methods: Basic Auth header and credentials in body
  const authMethods = [
    { 
      name: 'Basic Auth Header',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    },
    {
      name: 'Credentials in Body',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: params.apiKey,
        client_secret: params.apiSecret,
      }),
    },
  ];
  
  for (const endpoint of tokenEndpoints) {
    for (const authMethod of authMethods) {
      try {
        currentTokenUrl = endpoint;
        usedAuthMethod = authMethod.name;
        console.log(`Trying Viva Wallet OAuth endpoint: ${currentTokenUrl} with ${authMethod.name}`);
        
        tokenResponse = await fetch(currentTokenUrl, {
          method: 'POST',
          headers: authMethod.headers as HeadersInit,
          body: authMethod.body,
        });
        
        // If we got a successful response or a clear error (not 404), stop trying
        if (tokenResponse.ok || (tokenResponse.status !== 404 && tokenResponse.status !== 0)) {
          console.log(`Endpoint ${tokenUrl} with ${authMethod.name} returned status ${tokenResponse.status}`);
          break;
        }
        
        // If 404, try next endpoint/auth method
        if (tokenResponse.status === 404) {
          console.log(`Endpoint ${currentTokenUrl} with ${authMethod.name} returned 404, trying next...`);
          lastError = `404 Not Found: ${currentTokenUrl} (${authMethod.name})`;
          tokenResponse = null;
          continue;
        }
        
        break; // Got a response (even if error), stop trying
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.log(`Error trying ${currentTokenUrl} with ${authMethod.name}: ${lastError}`);
        tokenResponse = null;
        continue;
      }
    }
    
    // If we got a valid response, break out of endpoint loop too
    if (tokenResponse && (tokenResponse.ok || tokenResponse.status !== 404)) {
      break;
    }
  }
  
  if (!tokenResponse) {
    throw new Error(`Failed to reach any Viva Wallet OAuth endpoint. Tried: ${tokenEndpoints.join(', ')}. Last error: ${lastError}`);
  }

  // Check content type before processing
  const tokenContentType = tokenResponse.headers.get('content-type');
  
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Viva Wallet token error:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      contentType: tokenContentType,
      error: errorText.substring(0, 500), // Limit error text length
      url: currentTokenUrl || tokenUrl,
    });
    
    // If we got HTML, it's likely an error page
    if (tokenContentType?.includes('text/html')) {
      throw new Error(`Viva Wallet authentication failed with HTML response (${tokenResponse.status}). The endpoint may be incorrect or credentials are invalid. URL: ${currentTokenUrl || tokenUrl}`);
    }
    
    throw new Error(`Failed to authenticate with Viva Wallet: ${tokenResponse.status} ${tokenResponse.statusText}. Please check your Client ID and Client Secret. Response: ${errorText.substring(0, 200)}`);
  }

  // Check if response is JSON before parsing
  if (!tokenContentType?.includes('application/json')) {
    const errorText = await tokenResponse.text();
    console.error('Viva Wallet token response is not JSON:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      contentType: tokenContentType,
      url: currentTokenUrl || tokenUrl,
      response: errorText.substring(0, 1000), // Get more of the HTML to see what's wrong
    });
    
    // Extract any useful info from HTML response
    const htmlTitleMatch = errorText.match(/<title>(.*?)<\/title>/i);
    // Use [\s\S] instead of . with 's' flag for better compatibility
    const htmlBodyMatch = errorText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const title = htmlTitleMatch ? htmlTitleMatch[1] : 'Unknown';
    const body = htmlBodyMatch ? htmlBodyMatch[1].replace(/<[^>]+>/g, ' ').substring(0, 200) : '';
    
    throw new Error(`Viva Wallet returned HTML response (not JSON) from ${currentTokenUrl || tokenUrl}. Status: ${tokenResponse.status}. This usually means the endpoint doesn't exist or credentials are invalid. Page title: "${title}". Error: ${body || errorText.substring(0, 200)}`);
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
  // According to Smart Checkout documentation: /checkout/v2/orders
  const orderUrl = `${vivaApiBaseUrl}/checkout/v2/orders`;
  
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

  // Add customer info if available (recommended for better conversion)
  if (params.customerEmail) {
    orderData.customer = {
      email: params.customerEmail,
      fullName: params.customerName || '',
    };
    // Add phone if available (optional but recommended)
    if (params.customerPhone) {
      orderData.customer.phone = params.customerPhone;
    }
    // Add country code if available (affects payment methods offered)
    if (params.countryCode) {
      orderData.customer.countryCode = params.countryCode;
    }
    // Add request language if available (payment page language)
    if (params.requestLang) {
      orderData.customer.requestLang = params.requestLang;
    }
  }
  
  // Enable payment notification (Viva sends email to customer)
  orderData.paymentNotification = true;

  // Add source code (REQUIRED - 4-digit code from payment source)
  // According to Viva Wallet documentation: "Keep in mind that you need to define the sourceCode parameter when creating the payment order"
  if (!params.merchantId || params.merchantId.trim() === '') {
    throw new Error('Source Code is required for Viva Wallet orders. Please configure it in your payment method settings (4-digit code from your payment source).');
  }
  orderData.sourceCode = params.merchantId.trim();

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
  
  // Extract order code from response
  const orderCode = orderResult.orderCode || orderResult.OrderCode;
  
  // Viva Wallet returns the checkout URL in different formats depending on the API version
  // Check for common response formats
  let checkoutUrl: string;
  
  if (orderResult.checkoutUrl) {
    checkoutUrl = orderResult.checkoutUrl;
  } else if (orderResult.url) {
    checkoutUrl = orderResult.url;
  } else if (orderCode) {
    // If only orderCode is returned, construct the checkout URL
    // Format: https://www.vivapayments.com/web/checkout?ref={orderCode} (per official documentation)
    const checkoutBase = isTestMode 
      ? 'https://demo.vivapayments.com/web/checkout'
      : 'https://www.vivapayments.com/web/checkout'; // Fixed: vivapayments.com not vivawallet.com
    checkoutUrl = `${checkoutBase}?ref=${orderCode}`;
  } else {
    console.error('Unexpected Viva Wallet response:', orderResult);
    throw new Error(`Viva Wallet returned an unexpected response format. Response: ${JSON.stringify(orderResult)}`);
  }
  
  // Return both checkout URL and order code
  return {
    checkoutUrl,
    orderCode: orderCode || undefined,
  };
}

