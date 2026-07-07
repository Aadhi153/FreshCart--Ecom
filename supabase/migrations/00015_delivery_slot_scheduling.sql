-- Delivery slot scheduling: customers pick a fixed calendar date + time-window at
-- checkout. delivery_slot_date/delivery_slot_window are the structured columns used
-- for cutoff/capacity validation; the pre-existing delivery_slot TEXT column keeps
-- being the human-readable label used everywhere orders are displayed — it is now
-- populated server-side (derived from date+window) instead of always being NULL.

BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot_window TEXT;

-- Speeds up the "how many non-cancelled orders already occupy this date+window"
-- capacity check that runs on every slot-listing request and every order placement.
CREATE INDEX IF NOT EXISTS orders_delivery_slot_idx
  ON orders (delivery_slot_date, delivery_slot_window)
  WHERE status <> 'cancelled';

COMMIT;
