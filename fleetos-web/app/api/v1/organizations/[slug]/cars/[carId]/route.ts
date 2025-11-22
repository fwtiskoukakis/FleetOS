import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/v1/organizations/[slug]/cars/[carId]
 * Get car details with pricing breakdown for booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; carId: string }> }
) {
  try {
    const { slug, carId } = await params;
    const { searchParams } = new URL(request.url);
    const pickupDate = searchParams.get('pickup_date');
    const dropoffDate = searchParams.get('dropoff_date');

    if (!pickupDate || !dropoffDate) {
      return NextResponse.json(
        { error: 'pickup_date and dropoff_date are required' },
        { status: 400 }
      );
    }

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, subscription_status, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get car details
    const { data: car, error: carError } = await supabase
      .from('booking_cars')
      .select(`
        *,
        category:car_categories(*),
        photos:car_photos(*)
      `)
      .eq('id', carId)
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .single();

    if (carError || !car) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }

    // Calculate rental days
    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    const rentalDays = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));

    // Get pricing
    const pricing = await calculatePricing(
      car.id,
      car.category_id,
      pickupDate,
      dropoffDate,
      rentalDays,
      org.id
    );

    // Get extras
    const { data: extras } = await supabase
      .from('extra_options')
      .select('*')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // Get insurance types
    const { data: insuranceTypes } = await supabase
      .from('insurance_types')
      .select('*')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    return NextResponse.json({
      car: {
        id: car.id,
        make: car.make,
        model: car.model,
        year: car.year,
        license_plate: car.license_plate,
        color: car.color,
        category: car.category,
        main_photo_url: car.main_photo_url,
        photos: car.photos || [],
        min_age_requirement: car.min_age_requirement,
        min_license_years: car.min_license_years,
      },
      extras: extras || [],
      insurance_types: insuranceTypes || [],
      pricing_breakdown: {
        base_price: pricing?.basePrice || 0,
        rental_days: rentalDays,
        daily_rate: pricing?.pricePerDay || 0,
        location_fees: 0, // Will be calculated on booking page
        subtotal: pricing?.basePrice || 0,
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

async function calculatePricing(
  carId: string,
  categoryId: string,
  startDate: string,
  endDate: string,
  rentalDays: number,
  organizationId: string
): Promise<{ basePrice: number; pricePerDay: number } | null> {
  try {
    const { data: pricingRules } = await supabase
      .from('car_pricing')
      .select('*')
      .or(`car_id.eq.${carId},category_id.eq.${categoryId}`)
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .order('priority', { ascending: false });

    if (!pricingRules || pricingRules.length === 0) {
      return {
        basePrice: 50 * rentalDays,
        pricePerDay: 50,
      };
    }

    const pricingRule = pricingRules[0];
    let totalPrice = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const ruleForDate = pricingRules.find(
        rule => rule.start_date <= dateStr && rule.end_date >= dateStr
      );
      totalPrice += parseFloat((ruleForDate || pricingRule).price_per_day.toString());
    }

    if (rentalDays >= 7 && pricingRule.weekly_discount_percent) {
      totalPrice -= totalPrice * (parseFloat(pricingRule.weekly_discount_percent.toString()) / 100);
    } else if (rentalDays >= 30 && pricingRule.monthly_discount_percent) {
      totalPrice -= totalPrice * (parseFloat(pricingRule.monthly_discount_percent.toString()) / 100);
    }

    return {
      basePrice: totalPrice,
      pricePerDay: parseFloat(pricingRule.price_per_day.toString()),
    };
  } catch (error) {
    console.error('Error calculating pricing:', error);
    return null;
  }
}

