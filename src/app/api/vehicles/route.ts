import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Vehicle, CreateVehicleBody, ApiError } from '@/types';

// GET /api/vehicles — list all vehicles
export async function GET(): Promise<NextResponse<Vehicle[] | ApiError>> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('registration');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
  }

  return NextResponse.json(data as Vehicle[]);
}

// POST /api/vehicles — create a new vehicle
export async function POST(
  req: NextRequest
): Promise<NextResponse<Vehicle | ApiError>> {
  let body: CreateVehicleBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { registration, type } = body;

  if (!registration || !type) {
    return NextResponse.json(
      { error: 'registration and type are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('vehicles')
    .insert({ registration: registration.trim(), type: type.trim() })
    .select()
    .single();

  if (error?.code === '23505') {
    return NextResponse.json(
      { error: `A vehicle with registration "${registration}" already exists` },
      { status: 409 }
    );
  }
  if (error) {
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
  }

  return NextResponse.json(data as Vehicle, { status: 201 });
}
