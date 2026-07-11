// =============================================================================
// Shared TypeScript types for Vehicle Inventory Management System.
// Used by both Next.js API route handlers and frontend components.
// =============================================================================

// ---------------------------------------------------------------------------
// Database entity types (mirrors DB schema exactly)
// ---------------------------------------------------------------------------

export interface Item {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
  reorder_threshold: number;
  created_at: string;
}

export interface Vehicle {
  id: string;
  registration: string;
  type: string;
  created_at: string;
}

export interface Trip {
  id: string;
  vehicle_id: string;
  status: 'out' | 'returned';
  departed_at: string;
  returned_at: string | null;
  created_at: string;
}

export interface TripLine {
  id: string;
  trip_id: string;
  item_id: string;
  qty_taken: number;
  qty_returned: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Extended / joined types returned by API endpoints
// ---------------------------------------------------------------------------

/** Full trip detail with vehicle info and all lines enriched with item names */
export interface TripDetail extends Trip {
  vehicle: Pick<Vehicle, 'id' | 'registration' | 'type'>;
  lines: TripLineDetail[];
}

/** A trip_line joined with its item's name and computed qty_used */
export interface TripLineDetail extends TripLine {
  item_name: string;
  item_sku: string;
  item_unit: string;
  qty_used: number; // computed: qty_taken - qty_returned
}

/** Trip summary used in list views (includes vehicle info, no line details) */
export interface TripSummary extends Trip {
  vehicle: Pick<Vehicle, 'id' | 'registration' | 'type'>;
  line_count: number;
}

// ---------------------------------------------------------------------------
// API request body shapes
// ---------------------------------------------------------------------------

export interface CreateItemBody {
  sku: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
  reorder_threshold: number;
}

export interface UpdateItemBody {
  sku?: string;
  name?: string;
  unit?: string;
  quantity_on_hand?: number;
  reorder_threshold?: number;
}

export interface CreateVehicleBody {
  registration: string;
  type: string;
}

export interface UpdateVehicleBody {
  registration?: string;
  type?: string;
}

export interface CreateTripLineInput {
  item_id: string;
  qty_taken: number;
}

export interface CreateTripBody {
  vehicle_id: string;
  lines: CreateTripLineInput[];
}

export interface ReturnLineInput {
  item_id: string;
  qty_returned: number;
}

export interface ReturnTripBody {
  lines: ReturnLineInput[];
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

export interface ApiError {
  error: string;
}

export interface CreateTripResponse {
  trip_id: string;
}

export interface ReturnTripResponse {
  status: 'out' | 'returned';
}
