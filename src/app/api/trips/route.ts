import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type {
  CreateTripBody,
  TripSummary,
  ApiError,
  CreateTripResponse,
} from '@/types';

// POST /api/trips — create a new trip with stock validation and atomic transaction via RPC
export async function POST(
  req: NextRequest
): Promise<NextResponse<CreateTripResponse | ApiError>> {
  let body: CreateTripBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { vehicle_id, lines } = body;

  if (!vehicle_id) {
    return NextResponse.json({ error: 'vehicle_id is required' }, { status: 400 });
  }
  if (!lines || lines.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
  }

  // Validate each line has a positive qty_taken
  for (const line of lines) {
    if (!line.item_id) {
      return NextResponse.json({ error: 'Each line must have an item_id' }, { status: 400 });
    }
    if (!Number.isInteger(line.qty_taken) || line.qty_taken <= 0) {
      return NextResponse.json(
        { error: `qty_taken must be a positive integer for item ${line.item_id}` },
        { status: 400 }
      );
    }
  }

  // Verify vehicle exists
  const { error: vehicleError } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', vehicle_id)
    .single();

  if (vehicleError?.code === 'PGRST116') {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  /**
   * Call the create_trip Postgres RPC function.
   * This runs the entire operation atomically — if any stock check fails,
   * nothing is inserted and stock levels remain unchanged.
   *
   * The RPC accepts a composite-type array for lines. Supabase passes
   * JS objects which Postgres maps to the trip_line_input composite type.
   */
  const { data, error } = await supabase.rpc('create_trip', {
    p_vehicle_id: vehicle_id,
    p_lines: lines.map((l) => ({ item_id: l.item_id, qty_taken: l.qty_taken })),
  });

  if (error) {
    // Detect our custom 'P0001' error code (insufficient stock)
    if (error.message?.includes('Insufficient stock')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message?.includes('Item not found')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
  }

  return NextResponse.json({ trip_id: data as string }, { status: 201 });
}

// GET /api/trips?status=out|returned — list trips filtered by status
export async function GET(
  req: NextRequest
): Promise<NextResponse<TripSummary[] | ApiError>> {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  if (status && status !== 'out' && status !== 'returned') {
    return NextResponse.json(
      { error: 'status must be "out" or "returned"' },
      { status: 400 }
    );
  }

  let query = supabase
    .from('trips')
    .select(`
      *,
      vehicle:vehicles(id, registration, type),
      line_count:trip_lines(count)
    `)
    .order('departed_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }

  // Normalize the count field from Supabase's aggregate format
  const trips = (data ?? []).map((t: any) => ({
    ...t,
    line_count: Array.isArray(t.line_count) ? t.line_count[0]?.count ?? 0 : t.line_count ?? 0,
  }));

  return NextResponse.json(trips as TripSummary[]);
}
