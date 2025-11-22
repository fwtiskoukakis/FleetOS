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
 * GET /api/v1/organizations/[slug]/validate
 * Validate organization access for WordPress plugin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        {
          is_valid: false,
          error_message: 'Organization slug is required',
        },
        { status: 400 }
      );
    }

    // Try to use database function first, fallback to direct query if function doesn't exist
    let result: any = null;
    let error: any = null;

    try {
      const { data, error: rpcError } = await supabase.rpc('validate_organization_access', {
        p_slug: slug,
      });

      if (rpcError) {
        // If function doesn't exist, fall back to direct query
        if (rpcError.code === '42883' || rpcError.message?.includes('does not exist')) {
          console.warn('validate_organization_access function not found, using direct query');
          
          // Direct query fallback
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, slug, subscription_status, is_active, trial_ends_at')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

          if (orgError || !org) {
            return NextResponse.json(
              {
                is_valid: false,
                error_message: 'Organization not found',
              },
              { status: 404 }
            );
          }

          // Check subscription status
          if (org.subscription_status !== 'active' && org.subscription_status !== 'trial') {
            return NextResponse.json({
              is_valid: false,
              organization_id: org.id,
              subscription_status: org.subscription_status,
              is_active: org.is_active,
              error_message: 'Subscription is not active',
            });
          }

          // Check trial expiry
          if (org.subscription_status === 'trial' && org.trial_ends_at) {
            const trialEndsAt = new Date(org.trial_ends_at);
            if (trialEndsAt < new Date()) {
              return NextResponse.json({
                is_valid: false,
                organization_id: org.id,
                subscription_status: org.subscription_status,
                is_active: org.is_active,
                error_message: 'Trial period has expired',
              });
            }
          }

          return NextResponse.json({
            is_valid: true,
            organization_id: org.id,
            subscription_status: org.subscription_status,
            is_active: org.is_active,
            error_message: null,
          });
        } else {
          error = rpcError;
        }
      } else {
        result = data;
      }
    } catch (rpcException) {
      console.error('RPC exception:', rpcException);
      error = rpcException;
    }

    // If we got an error from RPC and it's not a "function doesn't exist" error
    if (error) {
      console.error('Error validating organization:', error);
      return NextResponse.json(
        { 
          is_valid: false,
          error_message: `Failed to validate organization: ${error.message || 'Unknown error'}`,
        },
        { status: 500 }
      );
    }

    // Process RPC result
    if (!result || result.length === 0) {
      return NextResponse.json(
        {
          is_valid: false,
          error_message: 'Organization not found',
        },
        { status: 404 }
      );
    }

    const rpcResult = result[0];

    return NextResponse.json({
      is_valid: rpcResult.is_valid,
      organization_id: rpcResult.organization_id,
      subscription_status: rpcResult.subscription_status,
      is_active: rpcResult.is_active,
      error_message: rpcResult.error_message,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        is_valid: false,
        error_message: `Internal server error: ${error.message || 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

