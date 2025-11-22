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
 * POST /api/v1/organizations/[slug]/cars/search
 * Search for available cars based on dates and locations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabaseClient = getSupabaseClient();
    const { slug } = await params;
    const body = await request.json();
    const {
      pickup_date,
      pickup_time,
      pickup_location_id,
      dropoff_date,
      dropoff_time,
      dropoff_location_id,
      vehicle_type, // optional: 'car' | 'atv' | 'moto'
    } = body;

    // Validate required fields
    if (!pickup_date || !dropoff_date || !pickup_location_id || !dropoff_location_id) {
      return NextResponse.json(
        { error: 'Missing required fields: pickup_date, dropoff_date, pickup_location_id, dropoff_location_id' },
        { status: 400 }
      );
    }

    // Get organization by slug
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id, subscription_status, is_active')
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

    // Parse dates
    const pickupDate = new Date(pickup_date);
    const dropoffDate = new Date(dropoff_date);
    const rentalDays = Math.ceil((dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));

    if (rentalDays <= 0) {
      return NextResponse.json(
        { error: 'Dropoff date must be after pickup date' },
        { status: 400 }
      );
    }

    // Get all active booking cars for this organization
    let carsQuery = supabaseClient
      .from('booking_cars')
      .select(`
        *,
        category:car_categories(*),
        photos:car_photos(*)
      `)
      .eq('organization_id', org.id)
      .eq('is_available_for_booking', true)
      .eq('is_active', true);

    // Filter by vehicle type if provided (would need category mapping)
    // For now, we'll get all cars and filter in application logic if needed

    const { data: allCars, error: carsError } = await carsQuery;

    if (carsError) {
      console.error('Error fetching cars:', carsError);
      return NextResponse.json(
        { error: 'Failed to fetch cars' },
        { status: 500 }
      );
    }

    // Check availability for each car
    const availableCars = [];
    
    for (const car of allCars || []) {
      // Check if car is available for these dates
      const { data: availabilityCheck } = await supabaseClient.rpc('is_car_available', {
        p_car_id: car.id,
        p_start_date: pickup_date,
        p_end_date: dropoff_date,
      });

      if (!availabilityCheck) continue; // Car is not available

      // Calculate pricing
      const pricing = await calculatePricing(
        car.id,
        car.category_id,
        pickup_date,
        dropoff_date,
        rentalDays,
        pickup_location_id,
        dropoff_location_id,
        org.id
      );

      if (!pricing) continue; // Could not calculate pricing

      // Get location fees
      const { data: pickupLocation } = await supabaseClient
        .from('locations')
        .select('extra_pickup_fee')
        .eq('id', pickup_location_id)
        .single();

      const { data: dropoffLocation } = await supabaseClient
        .from('locations')
        .select('extra_delivery_fee')
        .eq('id', dropoff_location_id)
        .single();

      const locationFees = (pickupLocation?.extra_pickup_fee || 0) + (dropoffLocation?.extra_delivery_fee || 0);
      const totalPrice = pricing.basePrice + locationFees;

      availableCars.push({
        id: car.id,
        make: car.make,
        model: car.model,
        year: car.year,
        license_plate: car.license_plate,
        color: car.color,
        category: car.category,
        main_photo_url: car.main_photo_url,
        photos: car.photos || [],
        pricing: {
          base_price: pricing.basePrice,
          price_per_day: pricing.pricePerDay,
          rental_days: rentalDays,
          location_fees: locationFees,
          total_price: totalPrice,
        },
        availability: {
          is_available: true,
          blocked_dates: [],
        },
      });
    }

    return NextResponse.json({
      cars: availableCars,
      search_params: {
        pickup_date,
        pickup_time,
        pickup_location_id,
        dropoff_date,
        dropoff_time,
        dropoff_location_id,
        rental_days: rentalDays,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate pricing for a car based on date range
 */
async function calculatePricing(
  carId: string,
  categoryId: string,
  startDate: string,
  endDate: string,
  rentalDays: number,
  pickupLocationId: string,
  dropoffLocationId: string,
  organizationId: string
): Promise<{ basePrice: number; pricePerDay: number } | null> {
  try {
    // Get pricing rules for this date range
    // Priority: car-specific pricing > category pricing
    const { data: pricingRules, error } = await supabaseClient
      .from('car_pricing')
      .select('*')
      .or(`car_id.eq.${carId},category_id.eq.${categoryId}`)
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching pricing:', error);
      return null;
    }

    if (!pricingRules || pricingRules.length === 0) {
      // No specific pricing, use default from category or car
      // For now, return a default price
      return {
        basePrice: 50 * rentalDays, // Default €50/day
        pricePerDay: 50,
      };
    }

    // Use the highest priority pricing rule
    const pricingRule = pricingRules[0];
    let totalPrice = 0;
    let dailyRate = pricingRule.price_per_day;

    // Calculate price for each day
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      // Find pricing rule for this specific date
      const ruleForDate = pricingRules.find(
        rule => rule.start_date <= dateStr && rule.end_date >= dateStr
      );
      
      if (ruleForDate) {
        totalPrice += parseFloat(ruleForDate.price_per_day.toString());
        dailyRate = parseFloat(ruleForDate.price_per_day.toString());
      } else {
        totalPrice += parseFloat(pricingRule.price_per_day.toString());
      }
    }

    // Apply weekly/monthly discounts if applicable
    if (rentalDays >= 7 && pricingRule.weekly_discount_percent) {
      const discount = totalPrice * (parseFloat(pricingRule.weekly_discount_percent.toString()) / 100);
      totalPrice -= discount;
    } else if (rentalDays >= 30 && pricingRule.monthly_discount_percent) {
      const discount = totalPrice * (parseFloat(pricingRule.monthly_discount_percent.toString()) / 100);
      totalPrice -= discount;
    }

    return {
      basePrice: totalPrice,
      pricePerDay: dailyRate,
    };
  } catch (error) {
    console.error('Error calculating pricing:', error);
    return null;
  }
}

