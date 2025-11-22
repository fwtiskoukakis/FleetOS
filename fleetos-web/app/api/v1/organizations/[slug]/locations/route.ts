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
 * GET /api/v1/organizations/[slug]/locations
 * Get all active locations for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { slug } = await params;
    // Get organization by slug
    const { data: org, error: orgError } = await supabase
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

    // Get locations for this organization
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (locationsError) {
      console.error('Error fetching locations:', locationsError);
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      locations: locations || [],
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

