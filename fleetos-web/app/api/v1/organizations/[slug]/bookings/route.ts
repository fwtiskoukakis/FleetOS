import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are not configured');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST /api/v1/organizations/[slug]/bookings
 * Create a new booking with complete contract information
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { slug } = await params;
    const body = await request.json();
    const {
      car_id,
      pickup_date,
      pickup_time,
      pickup_location_id,
      dropoff_date,
      dropoff_time,
      dropoff_location_id,
      // Customer Information (Complete Contract Data)
      customer_full_name,
      customer_email,
      customer_phone,
      customer_id_number,
      customer_driver_license,
      customer_age,
      customer_address,
      customer_city,
      customer_country = 'Greece',
      customer_date_of_birth,
      customer_driver_license_issue_date,
      customer_driver_license_expiry_date,
      customer_tax_id, // ΑΦΜ
      // Extras & Insurance
      selected_extras = [],
      selected_insurance_id,
      // Payment
      payment_method_id,
      payment_intent_id,
      // Special Requirements
      flight_number,
      special_requests,
      customer_notes,
      // Discount
      discount_code,
    } = body;

    // Validate required fields
    if (!car_id || !pickup_date || !dropoff_date || !customer_full_name || !customer_email || !customer_phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, subscription_status, is_active, max_contracts_per_month')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found or inactive' },
        { status: 404 }
      );
    }

    // Check subscription status
    if (org.subscription_status !== 'active' && org.subscription_status !== 'trial') {
      return NextResponse.json(
        { error: 'Organization subscription is not active' },
        { status: 403 }
      );
    }

    // Check monthly contract limit
    const { data: currentMonthContracts } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    if (currentMonthContracts && org.max_contracts_per_month && 
        currentMonthContracts.length >= org.max_contracts_per_month) {
      return NextResponse.json(
        { error: 'Monthly contract limit reached' },
        { status: 403 }
      );
    }

    // Check for duplicate booking
    const { data: duplicateCheck } = await supabase
      .from('online_bookings')
      .select('id')
      .eq('customer_email', customer_email.toLowerCase())
      .eq('car_id', car_id)
      .eq('organization_id', org.id)
      .in('booking_status', ['pending', 'confirmed', 'in_progress'])
      .or(`and(pickup_date.lte.${dropoff_date},dropoff_date.gte.${pickup_date})`);

    if (duplicateCheck && duplicateCheck.length > 0) {
      return NextResponse.json(
        { error: 'A booking already exists for this customer, car, and date range' },
        { status: 409 }
      );
    }

    // Get car details
    const { data: car, error: carError } = await supabase
      .from('booking_cars')
      .select('*, category:car_categories(*)')
      .eq('id', car_id)
      .eq('organization_id', org.id)
      .single();

    if (carError || !car) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }

    // Calculate rental days (ensure dates are parsed correctly without timezone issues)
    // Parse dates as local dates to avoid timezone shifts
    const pickupDateParts = pickup_date.split('-');
    const dropoffDateParts = dropoff_date.split('-');
    const pickup = new Date(
      parseInt(pickupDateParts[0]),
      parseInt(pickupDateParts[1]) - 1,
      parseInt(pickupDateParts[2])
    );
    const dropoff = new Date(
      parseInt(dropoffDateParts[0]),
      parseInt(dropoffDateParts[1]) - 1,
      parseInt(dropoffDateParts[2])
    );
    const rentalDays = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate pricing
    const pricing = await calculateTotalPrice(
      car_id,
      car.category_id,
      pickup_date,
      dropoff_date,
      rentalDays,
      pickup_location_id,
      dropoff_location_id,
      selected_extras,
      selected_insurance_id,
      discount_code,
      org.id
    );

    // Get organization settings for tax rate
    const { data: orgSettings } = await supabase
      .from('organization_settings')
      .select('tax_rate')
      .eq('organization_id', org.id)
      .single();

    const taxRate = parseFloat(orgSettings?.tax_rate?.toString() || '0.24');
    const subtotal = pricing.totalPrice;
    const vat = subtotal * taxRate;
    const totalWithVat = subtotal + vat;

    // Get payment method to determine deposit
    let depositAmount = totalWithVat;
    if (payment_method_id) {
      const { data: paymentMethod } = await supabase
        .from('payment_methods')
        .select('deposit_percentage, minimum_deposit_amount')
        .eq('id', payment_method_id)
        .single();

      if (paymentMethod) {
        if (paymentMethod.deposit_percentage) {
          depositAmount = totalWithVat * (parseFloat(paymentMethod.deposit_percentage.toString()) / 100);
        }
        if (paymentMethod.minimum_deposit_amount && depositAmount < parseFloat(paymentMethod.minimum_deposit_amount.toString())) {
          depositAmount = parseFloat(paymentMethod.minimum_deposit_amount.toString());
        }
      }
    }

    // Get IP address and user agent for fraud detection
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create booking
    const bookingData = {
      organization_id: org.id,
      car_id: car_id,
      category_id: car.category_id,
      // Customer information
      customer_full_name,
      customer_email: customer_email.toLowerCase(),
      customer_phone,
      customer_id_number: customer_id_number || null,
      customer_driver_license: customer_driver_license || null,
      customer_age: customer_age || null,
      customer_address: customer_address || null,
      customer_city: customer_city || null,
      customer_country: customer_country || 'Greece',
      customer_date_of_birth: customer_date_of_birth || null,
      customer_driver_license_issue_date: customer_driver_license_issue_date || null,
      customer_driver_license_expiry_date: customer_driver_license_expiry_date || null,
      customer_tax_id: customer_tax_id || null,
      // Rental details
      pickup_date,
      pickup_time,
      pickup_location_id,
      dropoff_date,
      dropoff_time,
      dropoff_location_id,
      // Pricing
      base_price: pricing.basePrice,
      extras_price: pricing.extrasPrice,
      insurance_price: pricing.insurancePrice,
      location_fees: pricing.locationFees,
      discount_amount: pricing.discountAmount,
      total_price: totalWithVat,
      // Payment
      payment_method_id: payment_method_id || null,
      payment_status: payment_intent_id ? 'deposit_paid' : 'pending',
      amount_paid: payment_intent_id ? depositAmount : 0,
      amount_remaining: payment_intent_id ? totalWithVat - depositAmount : totalWithVat,
      // Status
      booking_status: 'pending',
      // Insurance
      selected_insurance_id: selected_insurance_id || null,
      // Notes
      customer_notes: customer_notes || null,
      special_requests: special_requests || null,
      flight_number: flight_number || null,
      // Source tracking
      source: 'wordpress',
      ip_address: ipAddress,
      user_agent: userAgent,
      // Expiration (24 hours from now)
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const { data: booking, error: bookingError } = await supabase
      .from('online_bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking', details: bookingError.message },
        { status: 500 }
      );
    }

    // Save booking extras
    if (selected_extras && selected_extras.length > 0) {
      const extrasData = [];
      for (const extra of selected_extras) {
        const { data: extraOption } = await supabase
          .from('extra_options')
          .select('price_per_day, is_one_time_fee')
          .eq('id', extra.extra_id)
          .single();

        if (extraOption) {
          const unitPrice = parseFloat(extraOption.price_per_day.toString());
          const quantity = extra.quantity || 1;
          const totalPrice = extraOption.is_one_time_fee 
            ? unitPrice 
            : unitPrice * rentalDays * quantity;

          extrasData.push({
            booking_id: booking.id,
            extra_option_id: extra.extra_id,
            quantity,
            price_per_unit: unitPrice,
            total_price: totalPrice,
            is_per_day: !extraOption.is_one_time_fee,
          });
        }
      }

      if (extrasData.length > 0) {
        await supabase.from('booking_extras').insert(extrasData);
      }
    }

    // Create payment transaction if payment_intent_id provided
    if (payment_intent_id) {
      await supabase.from('payment_transactions').insert({
        booking_id: booking.id,
        transaction_id: payment_intent_id,
        amount: depositAmount,
        currency: 'EUR',
        transaction_type: depositAmount < totalWithVat ? 'deposit' : 'full_payment',
        status: 'completed',
        payment_provider: 'stripe', // or 'viva_wallet'
        completed_at: new Date().toISOString(),
      });
    }

    // Block car dates immediately
    await supabase.from('car_availability').insert({
      car_id: car_id,
      blocked_from: pickup_date,
      blocked_until: dropoff_date,
      reason: 'booked',
      booking_id: booking.id,
    });

    return NextResponse.json({
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        total_price: booking.total_price,
        payment_status: booking.payment_status,
        booking_status: booking.booking_status,
        amount_paid: booking.amount_paid,
        amount_remaining: booking.amount_remaining,
      },
      payment_url: depositAmount < totalWithVat 
        ? `/booking/${slug}/payment/${booking.id}`
        : null,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate total price including base, extras, insurance, location fees, and discounts
 */
async function calculateTotalPrice(
  carId: string,
  categoryId: string,
  startDate: string,
  endDate: string,
  rentalDays: number,
  pickupLocationId: string,
  dropoffLocationId: string,
  selectedExtras: any[],
  selectedInsuranceId: string | null,
  discountCode: string | null,
  organizationId: string
): Promise<{
  basePrice: number;
  extrasPrice: number;
  insurancePrice: number;
  locationFees: number;
  discountAmount: number;
  totalPrice: number;
}> {
  const supabaseClient = getSupabaseClient();
  // Calculate base price (same logic as search endpoint)
  const { data: pricingRules } = await supabaseClient
    .from('car_pricing')
    .select('*')
    .or(`car_id.eq.${carId},category_id.eq.${categoryId}`)
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .order('priority', { ascending: false });

  let basePrice = 50 * rentalDays; // Default
  if (pricingRules && pricingRules.length > 0) {
    const pricingRule = pricingRules[0];
    const start = new Date(startDate);
    const end = new Date(endDate);
    basePrice = 0;

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const ruleForDate = pricingRules.find(
        rule => rule.start_date <= dateStr && rule.end_date >= dateStr
      );
      basePrice += parseFloat((ruleForDate || pricingRule).price_per_day.toString());
    }

    if (rentalDays >= 7 && pricingRule.weekly_discount_percent) {
      basePrice -= basePrice * (parseFloat(pricingRule.weekly_discount_percent.toString()) / 100);
    } else if (rentalDays >= 30 && pricingRule.monthly_discount_percent) {
      basePrice -= basePrice * (parseFloat(pricingRule.monthly_discount_percent.toString()) / 100);
    }
  }

  // Calculate location fees
  const { data: pickupLocation } = await supabaseClient
    .from('locations')
    .select('extra_pickup_fee')
    .eq('id', pickupLocationId)
    .single();

  const { data: dropoffLocation } = await supabaseClient
    .from('locations')
    .select('extra_delivery_fee')
    .eq('id', dropoffLocationId)
    .single();

  const locationFees = (parseFloat(pickupLocation?.extra_pickup_fee?.toString() || '0')) +
                       (parseFloat(dropoffLocation?.extra_delivery_fee?.toString() || '0'));

  // Calculate extras price
  let extrasPrice = 0;
  if (selectedExtras && selectedExtras.length > 0) {
    for (const extra of selectedExtras) {
      const { data: extraOption } = await supabaseClient
        .from('extra_options')
        .select('price_per_day, is_one_time_fee')
        .eq('id', extra.extra_id)
        .single();

      if (extraOption) {
        const unitPrice = parseFloat(extraOption.price_per_day.toString());
        const quantity = extra.quantity || 1;
        if (extraOption.is_one_time_fee) {
          extrasPrice += unitPrice * quantity;
        } else {
          extrasPrice += unitPrice * rentalDays * quantity;
        }
      }
    }
  }

  // Calculate insurance price
  let insurancePrice = 0;
  if (selectedInsuranceId) {
    const { data: insurance } = await supabaseClient
      .from('insurance_types')
      .select('price_per_day')
      .eq('id', selectedInsuranceId)
      .single();

    if (insurance) {
      insurancePrice = parseFloat(insurance.price_per_day.toString()) * rentalDays;
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (discountCode) {
    const { data: discount } = await supabaseClient
      .from('discount_codes')
      .select('*')
      .eq('code', discountCode.toUpperCase())
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (discount) {
      const now = new Date();
      const validFrom = discount.valid_from ? new Date(discount.valid_from) : null;
      const validUntil = discount.valid_until ? new Date(discount.valid_until) : null;

      if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
        if (discount.times_used < (discount.max_uses || 999999)) {
          const subtotal = basePrice + extrasPrice + insurancePrice + locationFees;
          
          if (discount.discount_type === 'percentage') {
            discountAmount = subtotal * (parseFloat(discount.discount_value.toString()) / 100);
          } else {
            discountAmount = parseFloat(discount.discount_value.toString());
          }

          // Update discount usage
          await supabaseClient
            .from('discount_codes')
            .update({ times_used: discount.times_used + 1 })
            .eq('id', discount.id);
        }
      }
    }
  }

  const totalPrice = basePrice + extrasPrice + insurancePrice + locationFees - discountAmount;

  return {
    basePrice,
    extrasPrice,
    insurancePrice,
    locationFees,
    discountAmount,
    totalPrice: Math.max(0, totalPrice), // Ensure non-negative
  };
}

