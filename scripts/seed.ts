/**
 * Seed script for Vehicle Inventory Management System.
 * Run with: npm run seed
 *
 * Populates:
 *   - 8 items (2 below reorder threshold)
 *   - 3 vehicles
 *   - 1 open trip (3 lines, via create_trip RPC)
 *   - 2 returned trips (one fully used, one partial return)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Load .env.local (no dotenv dependency — simple parser)
// ---------------------------------------------------------------------------
function loadEnv(): void {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('Missing .env.local — copy .env.local.example and fill in your Supabase credentials.');
    process.exit(1);
  }
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------
const ITEMS = [
  { sku: 'SKU-001', name: 'Safety Helmets', unit: 'pcs', quantity_on_hand: 50, reorder_threshold: 10 },
  { sku: 'SKU-002', name: 'Work Gloves', unit: 'pairs', quantity_on_hand: 3, reorder_threshold: 5 },
  { sku: 'SKU-003', name: 'Cable Ties (100pk)', unit: 'box', quantity_on_hand: 40, reorder_threshold: 10 },
  { sku: 'SKU-004', name: 'Drill Bits Set', unit: 'set', quantity_on_hand: 2, reorder_threshold: 8 },
  { sku: 'SKU-005', name: 'Extension Cords', unit: 'pcs', quantity_on_hand: 18, reorder_threshold: 5 },
  { sku: 'SKU-006', name: 'First Aid Kits', unit: 'kit', quantity_on_hand: 12, reorder_threshold: 5 },
  { sku: 'SKU-007', name: 'Ratchet Straps', unit: 'pcs', quantity_on_hand: 30, reorder_threshold: 10 },
  { sku: 'SKU-008', name: 'LED Work Lights', unit: 'pcs', quantity_on_hand: 15, reorder_threshold: 8 },
];

const VEHICLES = [
  { registration: 'A 12345', type: 'Truck' },
  { registration: 'B 67890', type: 'Van' },
  { registration: 'C 11111', type: 'Pickup' },
];

async function clearTables(): Promise<void> {
  console.log('Clearing existing data…');
  // trip_lines cascade from trips; delete trips first, then items/vehicles
  const { error: tripsErr } = await supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (tripsErr) throw new Error(`Failed to clear trips: ${tripsErr.message}`);

  const { error: itemsErr } = await supabase.from('items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (itemsErr) throw new Error(`Failed to clear items: ${itemsErr.message}`);

  const { error: vehiclesErr } = await supabase.from('vehicles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (vehiclesErr) throw new Error(`Failed to clear vehicles: ${vehiclesErr.message}`);
}

async function seed(): Promise<void> {
  console.log('Starting seed…\n');

  await clearTables();

  // Insert items
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .insert(ITEMS)
    .select();
  if (itemsError) throw new Error(`Failed to insert items: ${itemsError.message}`);
  console.log(`✓ Inserted ${items!.length} items`);

  const itemBySku = Object.fromEntries(items!.map((i) => [i.sku, i]));

  // Insert vehicles
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .insert(VEHICLES)
    .select();
  if (vehiclesError) throw new Error(`Failed to insert vehicles: ${vehiclesError.message}`);
  console.log(`✓ Inserted ${vehicles!.length} vehicles`);

  const [truck, van, pickup] = vehicles!;

  // Open trip via create_trip RPC (3 lines)
  const { data: openTripId, error: openTripError } = await supabase.rpc('create_trip', {
    p_vehicle_id: truck.id,
    p_lines: [
      { item_id: itemBySku['SKU-001'].id, qty_taken: 5 },
      { item_id: itemBySku['SKU-005'].id, qty_taken: 2 },
      { item_id: itemBySku['SKU-007'].id, qty_taken: 4 },
    ],
  });
  if (openTripError) throw new Error(`Failed to create open trip: ${openTripError.message}`);
  console.log(`✓ Created open trip (${openTripId}) on ${truck.registration}`);

  // Returned trip 1 — fully used (nothing returned, trip closed manually)
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data: usedTrip, error: usedTripError } = await supabase
    .from('trips')
    .insert({
      vehicle_id: van.id,
      status: 'returned',
      departed_at: twoDaysAgo,
      returned_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();
  if (usedTripError) throw new Error(`Failed to insert fully-used trip: ${usedTripError.message}`);

  const usedLines = [
    { trip_id: usedTrip.id, item_id: itemBySku['SKU-003'].id, qty_taken: 10, qty_returned: 0 },
    { trip_id: usedTrip.id, item_id: itemBySku['SKU-006'].id, qty_taken: 3, qty_returned: 0 },
  ];
  const { error: usedLinesError } = await supabase.from('trip_lines').insert(usedLines);
  if (usedLinesError) throw new Error(`Failed to insert used trip lines: ${usedLinesError.message}`);

  // Decrement stock for consumed items
  await supabase.from('items').update({ quantity_on_hand: 30 }).eq('id', itemBySku['SKU-003'].id); // 40 - 10
  await supabase.from('items').update({ quantity_on_hand: 9 }).eq('id', itemBySku['SKU-006'].id);  // 12 - 3
  console.log(`✓ Created fully-used returned trip on ${van.registration}`);

  // Returned trip 2 — partial return (some items brought back)
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const { data: partialTrip, error: partialTripError } = await supabase
    .from('trips')
    .insert({
      vehicle_id: pickup.id,
      status: 'returned',
      departed_at: fiveDaysAgo,
      returned_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();
  if (partialTripError) throw new Error(`Failed to insert partial-return trip: ${partialTripError.message}`);

  const partialLines = [
    { trip_id: partialTrip.id, item_id: itemBySku['SKU-002'].id, qty_taken: 10, qty_returned: 7 },
    { trip_id: partialTrip.id, item_id: itemBySku['SKU-008'].id, qty_taken: 6, qty_returned: 4 },
  ];
  const { error: partialLinesError } = await supabase.from('trip_lines').insert(partialLines);
  if (partialLinesError) throw new Error(`Failed to insert partial trip lines: ${partialLinesError.message}`);

  // Net stock change: gloves -3 (10 taken, 7 returned), lights -2 (6 taken, 4 returned)
  await supabase.from('items').update({ quantity_on_hand: 0 }).eq('id', itemBySku['SKU-002'].id);  // 3 - 3
  await supabase.from('items').update({ quantity_on_hand: 13 }).eq('id', itemBySku['SKU-008'].id); // 15 - 2
  console.log(`✓ Created partial-return trip on ${pickup.registration}`);

  console.log('\nSeed complete!');
  console.log('  • 8 items (Work Gloves & Drill Bits Set are low stock)');
  console.log('  • 3 vehicles');
  console.log('  • 1 open trip, 2 returned trips');
}

seed().catch((err) => {
  console.error('\nSeed failed:', err.message ?? err);
  process.exit(1);
});
