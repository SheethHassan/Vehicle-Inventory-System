-- =============================================================================
-- Migration 003: Transactional RPC Functions
-- =============================================================================
-- These Postgres functions are called via Supabase rpc() from the Next.js
-- API route handlers. Running logic inside a single function guarantees
-- atomicity — either the entire operation succeeds or nothing is changed.
-- This prevents partial failures that would leave stock counts inconsistent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TYPE: trip_line_input
-- Reusable composite type for passing line arrays into RPCs.
-- ---------------------------------------------------------------------------
CREATE TYPE trip_line_input AS (
  item_id    UUID,
  qty_taken  INTEGER
);

CREATE TYPE return_line_input AS (
  item_id       UUID,
  qty_returned  INTEGER
);

-- ---------------------------------------------------------------------------
-- FUNCTION: create_trip
--
-- Creates a new trip with its lines in one atomic transaction.
-- Steps:
--   1. For each line, verify qty_taken <= current quantity_on_hand.
--      If any line fails, raise an exception (rolls back everything).
--   2. Insert the trip record.
--   3. Insert all trip_lines.
--   4. Decrement quantity_on_hand for each item.
--
-- Returns the new trip id on success.
-- Raises: 'ITEM_INSUFFICIENT_STOCK' with item id in the detail if stock is low.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_trip(
  p_vehicle_id  UUID,
  p_lines       trip_line_input[]
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_trip_id     UUID;
  v_line        trip_line_input;
  v_stock       INTEGER;
  v_item_name   TEXT;
BEGIN
  -- Step 1: Validate stock for every line BEFORE making any changes
  FOREACH v_line IN ARRAY p_lines LOOP
    SELECT quantity_on_hand, name
      INTO v_stock, v_item_name
      FROM items
     WHERE id = v_line.item_id
       FOR UPDATE;  -- lock row to prevent concurrent over-allocation

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item not found: %', v_line.item_id
        USING ERRCODE = 'P0002';
    END IF;

    IF v_line.qty_taken > v_stock THEN
      -- Custom error code so the API layer can detect this specifically
      RAISE EXCEPTION 'Insufficient stock for item "%" (id: %). Requested: %, Available: %',
        v_item_name, v_line.item_id, v_line.qty_taken, v_stock
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  -- Step 2: Insert the trip
  INSERT INTO trips (vehicle_id, status, departed_at)
    VALUES (p_vehicle_id, 'out', now())
    RETURNING id INTO v_trip_id;

  -- Step 3 & 4: Insert lines and decrement stock atomically
  FOREACH v_line IN ARRAY p_lines LOOP
    INSERT INTO trip_lines (trip_id, item_id, qty_taken, qty_returned)
      VALUES (v_trip_id, v_line.item_id, v_line.qty_taken, 0);

    UPDATE items
       SET quantity_on_hand = quantity_on_hand - v_line.qty_taken
     WHERE id = v_line.item_id;
  END LOOP;

  RETURN v_trip_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- FUNCTION: return_trip
--
-- Processes item returns for an open trip in one atomic transaction.
-- Steps:
--   1. Verify the trip exists and is still 'out'.
--   2. For each return line, validate qty_returned <=
--      (qty_taken - already_returned) for that line.
--   3. Update trip_lines.qty_returned (increment by the new return amount).
--   4. Increment item.quantity_on_hand by the newly returned amount.
--   5. After updating all lines, check if ALL lines are now fully returned
--      (qty_returned == qty_taken). If so, set trip.status = 'returned'
--      and trip.returned_at = now(). Otherwise, leave as 'out' (partial return).
--
-- Returns the updated trip status ('out' or 'returned').
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION return_trip(
  p_trip_id  UUID,
  p_lines    return_line_input[]
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_line             return_line_input;
  v_trip_status      TEXT;
  v_qty_taken        INTEGER;
  v_qty_already_ret  INTEGER;
  v_available        INTEGER;
  v_all_returned     BOOLEAN;
  v_trip_line_id     UUID;
BEGIN
  -- Step 1: Verify trip exists and is currently 'out'
  SELECT status INTO v_trip_status
    FROM trips
   WHERE id = p_trip_id
     FOR UPDATE;  -- lock to prevent concurrent returns

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found: %', p_trip_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_trip_status <> 'out' THEN
    RAISE EXCEPTION 'Trip % is already returned', p_trip_id
      USING ERRCODE = 'P0003';
  END IF;

  -- Step 2: Validate and apply each return line
  FOREACH v_line IN ARRAY p_lines LOOP
    -- Skip lines with zero return (no-ops are fine)
    IF v_line.qty_returned = 0 THEN
      CONTINUE;
    END IF;

    SELECT id, qty_taken, qty_returned
      INTO v_trip_line_id, v_qty_taken, v_qty_already_ret
      FROM trip_lines
     WHERE trip_id = p_trip_id AND item_id = v_line.item_id
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Trip line not found for item % on trip %',
        v_line.item_id, p_trip_id
        USING ERRCODE = 'P0002';
    END IF;

    v_available := v_qty_taken - v_qty_already_ret;

    IF v_line.qty_returned > v_available THEN
      RAISE EXCEPTION 'Cannot return % units for item % — only % available to return',
        v_line.qty_returned, v_line.item_id, v_available
        USING ERRCODE = 'P0001';
    END IF;

    -- Step 3: Update the trip_line's cumulative returned quantity
    UPDATE trip_lines
       SET qty_returned = qty_returned + v_line.qty_returned
     WHERE id = v_trip_line_id;

    -- Step 4: Add the returned stock back to inventory
    UPDATE items
       SET quantity_on_hand = quantity_on_hand + v_line.qty_returned
     WHERE id = v_line.item_id;
  END LOOP;

  -- Step 5: Check if ALL lines in this trip are now fully returned
  SELECT NOT EXISTS (
    SELECT 1 FROM trip_lines
     WHERE trip_id = p_trip_id
       AND qty_returned < qty_taken
  ) INTO v_all_returned;

  IF v_all_returned THEN
    UPDATE trips
       SET status      = 'returned',
           returned_at = now()
     WHERE id = p_trip_id;
    RETURN 'returned';
  ELSE
    RETURN 'out';
  END IF;
END;
$$;
