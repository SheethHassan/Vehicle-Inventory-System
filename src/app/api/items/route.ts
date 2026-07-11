import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { CreateItemBody, Item, ApiError } from '@/types';

// GET /api/items — list all items with current stock levels
export async function GET(): Promise<NextResponse<Item[] | ApiError>> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }

  return NextResponse.json(data as Item[]);
}

// POST /api/items — create a new item
export async function POST(
  req: NextRequest
): Promise<NextResponse<Item | ApiError>> {
  let body: CreateItemBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sku, name, unit, quantity_on_hand, reorder_threshold } = body;

  // Validate required fields
  if (!sku || !name || !unit) {
    return NextResponse.json(
      { error: 'sku, name, and unit are required' },
      { status: 400 }
    );
  }
  if (typeof quantity_on_hand !== 'number' || quantity_on_hand < 0) {
    return NextResponse.json(
      { error: 'quantity_on_hand must be a non-negative integer' },
      { status: 400 }
    );
  }
  if (reorder_threshold !== undefined && (typeof reorder_threshold !== 'number' || reorder_threshold < 0)) {
    return NextResponse.json(
      { error: 'reorder_threshold must be a non-negative integer' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      sku: sku.trim(),
      name: name.trim(),
      unit: unit.trim(),
      quantity_on_hand: Math.floor(quantity_on_hand),
      reorder_threshold: reorder_threshold !== undefined ? Math.floor(reorder_threshold) : 5,
    })
    .select()
    .single();

  if (error) {
    // Detect unique constraint violation on SKU (Postgres error code 23505)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `An item with SKU "${sku}" already exists` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }

  return NextResponse.json(data as Item, { status: 201 });
}
