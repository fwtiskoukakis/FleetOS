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
 * GET /api/v1/organizations/[slug]/payment-methods
 * Get active payment methods for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { slug } = await params;

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get active payment methods (excluding cash/pay on arrival)
    const { data: paymentMethods, error: methodsError } = await supabase
      .from('payment_methods')
      .select('id, name, name_el, description, description_el, provider, is_active, display_order, logo_url')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .neq('provider', 'cash') // Exclude cash/pay on arrival
      .order('display_order', { ascending: true });

    if (methodsError) {
      console.error('Error fetching payment methods:', methodsError);
      return NextResponse.json(
        { error: 'Failed to fetch payment methods' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      payment_methods: paymentMethods || [],
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

