import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ReturnTripBody, ReturnTripResponse, ApiError } from '@/types';

type Params = { params: Promise<{ id: string }> };

// POST /api/trips/:id/return — process item returns for a trip
// Runs atomically via the return_trip Postgres RPC function.
// Partial returns are allowed — trip stays 'out' until all items are fully returned.
export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse<ReturnTripResponse | ApiError>> {
  const { id } = await params;

  let body: ReturnTripBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { lines } = body;

  if (!lines || lines.length === 0) {
    return NextResponse.json({ error: 'lines array is required' }, { status: 400 });
  }

  // Validate: qty_returned must be >= 0 for each line
  for (const line of lines) {
    if (!line.item_id) {
      return NextResponse.json({ error: 'Each line must have an item_id' }, { status: 400 });
    }
    if (!Number.isInteger(line.qty_returned) || line.qty_returned < 0) {
      return NextResponse.json(
        { error: `qty_returned must be a non-negative integer for item ${line.item_id}` },
        { status: 400 }
      );
    }
  }

  // Verify the trip exists before calling the RPC
  const { error: fetchError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchError?.code === 'PGRST116') {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  /**
   * Call the return_trip Postgres RPC.
   * The function atomically:
   *   1. Validates qty_returned <= (qty_taken - already_returned) per line
   *   2. Updates trip_lines.qty_returned
   *   3. Increments item.quantity_on_hand
   *   4. Flips trip.status to 'returned' if all lines are fully returned
   *
   * Returns the new trip status ('out' or 'returned').
   */
  const { data, error } = await supabase.rpc('return_trip', {
    p_trip_id: id,
    p_lines: lines.map((l) => ({
      item_id: l.item_id,
      qty_returned: l.qty_returned,
    })),
  });

  if (error) {
    if (error.message?.includes('Cannot return')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message?.includes('already returned')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to process return' }, { status: 500 });
  }

  return NextResponse.json({ status: data as 'out' | 'returned' });
}
