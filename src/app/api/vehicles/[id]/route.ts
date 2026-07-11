import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Vehicle, UpdateVehicleBody, ApiError } from '@/types';

type Params = { params: Promise<{ id: string }> };

// PUT /api/vehicles/:id — update vehicle fields
export async function PUT(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse<Vehicle | ApiError>> {
  const { id } = await params;

  let body: UpdateVehicleBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('vehicles')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error?.code === 'PGRST116') {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }
  if (error?.code === '23505') {
    return NextResponse.json(
      { error: `A vehicle with registration "${body.registration}" already exists` },
      { status: 409 }
    );
  }
  if (error) {
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
  }

  return NextResponse.json(data as Vehicle);
}
