-- The copy. Each Auction object writes its lot here on every change; a nightly
-- job compares the two. Buyers are admitted here before any bid reaches an object.
CREATE TABLE IF NOT EXISTS lots (
  id TEXT PRIMARY KEY,
  dealer TEXT NOT NULL,
  lot TEXT NOT NULL,            -- JSON, the Lot as the object holds it
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lots_updated ON lots (updated_at);

CREATE TABLE IF NOT EXISTS buyers (
  id TEXT PRIMARY KEY,
  name TEXT,
  state TEXT,                   -- licence state; TX only until the out-of-state packet exists
  deposit_status TEXT NOT NULL DEFAULT 'none',   -- none | captured | forfeited | refunded
  deposit_ref TEXT,             -- the Stripe PaymentIntent
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bids (
  key TEXT PRIMARY KEY,         -- the idempotency key
  lot_id TEXT NOT NULL,
  bidder TEXT NOT NULL,
  amount INTEGER NOT NULL,
  max INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  reason TEXT,
  stamped_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS bids_lot ON bids (lot_id, stamped_at);
