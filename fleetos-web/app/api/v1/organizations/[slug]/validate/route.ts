import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/v1/organizations/[slug]/validate
 * Validate organization access for WordPress plugin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Use database function to validate
    const { data, error } = await supabase.rpc('validate_organization_access', {
      p_slug: params.slug,
    });

    if (error) {
      console.error('Error validating organization:', error);
      return NextResponse.json(
        { 
          is_valid: false,
          error_message: 'Failed to validate organization',
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          is_valid: false,
          error_message: 'Organization not found',
        },
        { status: 404 }
      );
    }

    const result = data[0];

    return NextResponse.json({
      is_valid: result.is_valid,
      organization_id: result.organization_id,
      subscription_status: result.subscription_status,
      is_active: result.is_active,
      error_message: result.error_message,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        is_valid: false,
        error_message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

