-- =============================================================================
-- Migration 002: Row Level Security
-- =============================================================================
-- INTENTIONAL DESIGN NOTE:
-- RLS is enabled on all tables as a best-practice baseline, but the policies
-- below are fully permissive (allow all). This is intentional for the assessment
-- scope — there is no auth requirement. In a production system these would be
-- replaced with user-scoped or role-scoped policies.
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_lines  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- ITEMS policies — fully open (assessment scope, no auth required)
-- ---------------------------------------------------------------------------
CREATE POLICY "items_select_all" ON items FOR SELECT USING (true);
CREATE POLICY "items_insert_all" ON items FOR INSERT WITH CHECK (true);
CREATE POLICY "items_update_all" ON items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "items_delete_all" ON items FOR DELETE USING (true);

-- ---------------------------------------------------------------------------
-- VEHICLES policies — fully open
-- ---------------------------------------------------------------------------
CREATE POLICY "vehicles_select_all" ON vehicles FOR SELECT USING (true);
CREATE POLICY "vehicles_insert_all" ON vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "vehicles_update_all" ON vehicles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "vehicles_delete_all" ON vehicles FOR DELETE USING (true);

-- ---------------------------------------------------------------------------
-- TRIPS policies — fully open
-- ---------------------------------------------------------------------------
CREATE POLICY "trips_select_all" ON trips FOR SELECT USING (true);
CREATE POLICY "trips_insert_all" ON trips FOR INSERT WITH CHECK (true);
CREATE POLICY "trips_update_all" ON trips FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "trips_delete_all" ON trips FOR DELETE USING (true);

-- ---------------------------------------------------------------------------
-- TRIP_LINES policies — fully open
-- ---------------------------------------------------------------------------
CREATE POLICY "trip_lines_select_all" ON trip_lines FOR SELECT USING (true);
CREATE POLICY "trip_lines_insert_all" ON trip_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "trip_lines_update_all" ON trip_lines FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "trip_lines_delete_all" ON trip_lines FOR DELETE USING (true);
