import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { TripDetail, TripLineDetail, ApiError } from '@/types';

type Params = { params: Promise<{ id: string }> };

// GET /api/trips/:id — full trip detail with all lines, item info, and computed qty_used
export async function GET(
  _req: NextRequest,
  { params }: Params
): Promise<NextResponse<TripDetail | ApiError>> {
  const { id } = await params;

  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      vehicle:vehicles(id, registration, type),
      lines:trip_lines(
        id,
        trip_id,
        item_id,
        qty_taken,
        qty_returned,
        created_at,
        item:items(name, sku, unit)
      )
    `)
    .eq('id', id)
    .single();

  if (error?.code === 'PGRST116') {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 });
  }

  // Shape the response: flatten item fields and add computed qty_used
  const trip: TripDetail = {
    ...data,
    vehicle: data.vehicle,
    lines: (data.lines ?? []).map((l: any): TripLineDetail => ({
      id: l.id,
      trip_id: l.trip_id,
      item_id: l.item_id,
      qty_taken: l.qty_taken,
      qty_returned: l.qty_returned,
      created_at: l.created_at,
      item_name: l.item?.name ?? '',
      item_sku: l.item?.sku ?? '',
      item_unit: l.item?.unit ?? '',
      qty_used: l.qty_taken - l.qty_returned,
    })),
  };

  return NextResponse.json(trip);
}
