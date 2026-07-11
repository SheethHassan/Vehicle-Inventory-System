import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Item, UpdateItemBody, ApiError } from '@/types';

type Params = { params: Promise<{ id: string }> };

// GET /api/items/:id — fetch a single item
export async function GET(
  _req: NextRequest,
  { params }: Params
): Promise<NextResponse<Item | ApiError>> {
  const { id } = await params;

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single();

  if (error?.code === 'PGRST116') {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }

  return NextResponse.json(data as Item);
}

// PUT /api/items/:id — update an item's fields
export async function PUT(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse<Item | ApiError>> {
  const { id } = await params;

  let body: UpdateItemBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate numeric fields if provided
  if (body.quantity_on_hand !== undefined) {
    if (typeof body.quantity_on_hand !== 'number' || body.quantity_on_hand < 0) {
      return NextResponse.json(
        { error: 'quantity_on_hand must be a non-negative integer' },
        { status: 400 }
      );
    }
    body.quantity_on_hand = Math.floor(body.quantity_on_hand);
  }
  if (body.reorder_threshold !== undefined) {
    if (typeof body.reorder_threshold !== 'number' || body.reorder_threshold < 0) {
      return NextResponse.json(
        { error: 'reorder_threshold must be a non-negative integer' },
        { status: 400 }
      );
    }
    body.reorder_threshold = Math.floor(body.reorder_threshold);
  }

  const { data, error } = await supabase
    .from('items')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error?.code === 'PGRST116') {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  if (error?.code === '23505') {
    return NextResponse.json(
      { error: `An item with SKU "${body.sku}" already exists` },
      { status: 409 }
    );
  }
  if (error) {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }

  return NextResponse.json(data as Item);
}

// DELETE /api/items/:id — delete an item
// Rejects with 400 if the item is referenced by any open trip (status = 'out')
export async function DELETE(
  _req: NextRequest,
  { params }: Params
): Promise<NextResponse<{ success: true } | ApiError>> {
  const { id } = await params;

  // Check if item exists
  const { data: item, error: fetchError } = await supabase
    .from('items')
    .select('id, name')
    .eq('id', id)
    .single();

  if (fetchError?.code === 'PGRST116') {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }

  // Guard: reject if item is on any currently open trip (status = 'out')
  const { count, error: checkError } = await supabase
    .from('trip_lines')
    .select('trip_lines.id', { count: 'exact', head: true })
    .eq('item_id', id)
    .eq('trips.status', 'out')
    .join('trips', { foreignTable: 'trips', primaryColumn: 'trip_id', foreignColumn: 'id' });

  // Fallback join approach via manual query if the above doesn't work
  if (checkError) {
    // Use a direct query approach
    const { data: openTripLines, error: openCheckError } = await supabase
      .from('trip_lines')
      .select('id, trips!inner(status)')
      .eq('item_id', id)
      .eq('trips.status', 'out');

    if (openCheckError) {
      return NextResponse.json({ error: 'Failed to check item usage' }, { status: 500 });
    }

    if (openTripLines && openTripLines.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${item.name}" — it is currently checked out on an open trip`,
        },
        { status: 400 }
      );
    }
  } else if (count && count > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete "${item.name}" — it is currently checked out on an open trip`,
      },
      { status: 400 }
    );
  }

  const { error: deleteError } = await supabase.from('items').delete().eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
