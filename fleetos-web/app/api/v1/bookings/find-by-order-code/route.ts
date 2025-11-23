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
 * POST /api/v1/bookings/find-by-order-code
 * Find booking by Viva Wallet order code or transaction ID
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { order_code, transaction_id } = body;

    if (!order_code && !transaction_id) {
      return NextResponse.json(
        { error: 'Order code or transaction ID is required' },
        { status: 400 }
      );
    }

    console.log('Finding booking by order code/transaction ID:', {
      order_code,
      transaction_id,
    });

    // Search for payment transaction by transaction_id or order code
    // We store order_code in provider_response or we can search by transaction_id
    let transactionQuery = supabase
      .from('payment_transactions')
      .select('booking_id, transaction_id, provider_response')
      .eq('payment_provider', 'viva_wallet');

    if (transaction_id) {
      transactionQuery = transactionQuery.eq('transaction_id', transaction_id);
    }

    const { data: transactions, error: transactionError } = await transactionQuery;

    if (transactionError) {
      console.error('Error querying transactions:', transactionError);
    }

    // Try to match order code in provider_response or transaction_id
    let matchedTransaction = transactions?.find((t: any) => {
      // Match by transaction ID (exact or partial)
      if (transaction_id) {
        if (t.transaction_id === transaction_id) return true;
        if (t.transaction_id?.includes(transaction_id)) return true;
      }
      // Match by order code in provider_response
      if (order_code) {
        const providerResponse = t.provider_response;
        if (providerResponse) {
          if (providerResponse.order_code === order_code) return true;
          if (providerResponse.orderCode === order_code) return true;
          if (providerResponse.order_code?.toString() === order_code.toString()) return true;
          if (providerResponse.orderCode?.toString() === order_code.toString()) return true;
        }
      }
      return false;
    });

    // If not found in pending transactions, search all transactions
    if (!matchedTransaction) {
      console.log('Transaction not found in initial search, searching all transactions...');
      const { data: allTransactions, error: allError } = await supabase
        .from('payment_transactions')
        .select('booking_id, transaction_id, provider_response')
        .eq('payment_provider', 'viva_wallet');

      if (allTransactions) {
        matchedTransaction = allTransactions.find((t: any) => {
          // Match by transaction ID (exact or partial)
          if (transaction_id) {
            if (t.transaction_id === transaction_id) return true;
            if (t.transaction_id?.includes(transaction_id)) return true;
          }
          // Match by order code in provider_response
          if (order_code) {
            const providerResponse = t.provider_response;
            if (providerResponse) {
              if (providerResponse.order_code === order_code) return true;
              if (providerResponse.orderCode === order_code) return true;
              if (providerResponse.order_code?.toString() === order_code.toString()) return true;
              if (providerResponse.orderCode?.toString() === order_code.toString()) return true;
            }
          }
          return false;
        });
      }
    }

    // If still not found, try searching by merchantTrns or tags in the order
    // We stored booking ID in merchantTrns as "Booking ID: {bookingId}"
    if (!matchedTransaction && order_code) {
      console.log('Trying alternative search methods...');
      // We could search bookings directly, but we don't have a direct link to order code
      // The order code is only in Viva Wallet, so we need to store it in our database
    }

    if (!matchedTransaction || !matchedTransaction.booking_id) {
      console.error('Transaction not found:', { order_code, transaction_id });
      return NextResponse.json(
        { error: 'Booking not found for this order code. Please contact support with order code: ' + order_code },
        { status: 404 }
      );
    }

    console.log('Transaction found:', matchedTransaction);

    // Get booking to get organization slug
    const { data: booking, error: bookingError } = await supabase
      .from('online_bookings')
      .select(`
        id,
        organization_id,
        organization:organizations(slug)
      `)
      .eq('id', matchedTransaction.booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Extract organization slug
    const orgSlug = booking.organization?.slug || 
                    (Array.isArray(booking.organization) ? booking.organization[0]?.slug : null);

    if (!orgSlug) {
      console.error('Organization slug not found for booking:', booking.id);
      return NextResponse.json(
        { error: 'Organization slug not found' },
        { status: 404 }
      );
    }

    console.log('Booking found successfully:', {
      booking_id: booking.id,
      org_slug: orgSlug,
      transaction_id: matchedTransaction.transaction_id,
    });

    return NextResponse.json({
      booking_id: booking.id,
      org_slug: orgSlug,
      transaction_id: matchedTransaction.transaction_id,
    });
  } catch (error) {
    console.error('Error finding booking by order code:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

