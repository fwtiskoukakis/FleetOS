import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/v1/bookings/[bookingId]/convert-to-contract
 * Auto-create contract from booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Call the database function to auto-create contract
    const { data: contractId, error } = await supabase.rpc(
      'auto_create_contract_from_booking',
      { p_booking_id: params.bookingId }
    );

    if (error) {
      console.error('Error creating contract from booking:', error);
      return NextResponse.json(
        { error: 'Failed to create contract', details: error.message },
        { status: 500 }
      );
    }

    if (!contractId) {
      return NextResponse.json(
        { error: 'Contract creation returned no ID' },
        { status: 500 }
      );
    }

    // Get the created contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError) {
      console.error('Error fetching created contract:', contractError);
      return NextResponse.json(
        { error: 'Contract created but could not be retrieved' },
        { status: 500 }
      );
    }

    // Send real-time notification (if Supabase Realtime is enabled)
    await supabase
      .from('contracts')
      .select('id')
      .eq('id', contractId)
      .single();

    return NextResponse.json({
      success: true,
      contract_id: contractId,
      contract: contract,
      message: 'Contract created successfully from booking',
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

