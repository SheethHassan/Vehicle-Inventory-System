-- =============================================================================
-- Migration 001: Core Schema
-- Vehicle Inventory Management System
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ITEMS
-- Represents physical stock items tracked by SKU (barcode).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                 TEXT        NOT NULL UNIQUE,
  name                TEXT        NOT NULL,
  unit                TEXT        NOT NULL,                      -- e.g. "pcs", "box", "liter"
  quantity_on_hand    INTEGER     NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reorder_threshold   INTEGER     NOT NULL DEFAULT 5,            -- flag as low-stock when below this
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- VEHICLES
-- Fleet vehicles that carry stock on trips.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  registration  TEXT        NOT NULL UNIQUE,                     -- e.g. "A 12345"
  type          TEXT        NOT NULL,                            -- e.g. "Truck", "Van"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- TRIPS
-- A trip is one vehicle departure event. Status transitions: out -> returned.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    UUID        NOT NULL REFERENCES vehicles(id),
  status        TEXT        NOT NULL DEFAULT 'out'
                            CHECK (status IN ('out', 'returned')),
  departed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_at   TIMESTAMPTZ,                                     -- NULL until fully returned
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- TRIP_LINES
-- Each line records one item loaded onto a trip and how much was returned.
-- qty_returned tracks cumulative returns; partial returns keep the trip open.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_lines (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  item_id       UUID        NOT NULL REFERENCES items(id),
  qty_taken     INTEGER     NOT NULL CHECK (qty_taken > 0),
  qty_returned  INTEGER     NOT NULL DEFAULT 0 CHECK (qty_returned >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Cannot return more than was taken
  CONSTRAINT check_qty_returned_lte_taken CHECK (qty_returned <= qty_taken)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_trips_status        ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id    ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trip_lines_trip_id  ON trip_lines(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_lines_item_id  ON trip_lines(item_id);
