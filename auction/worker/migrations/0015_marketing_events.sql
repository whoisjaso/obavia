-- The four standard Meta events (growth plan AD1 and AD3; docs/DOCTRINE.md AD 1 and 3), one row each time one of them
-- happens, whether or not it was sent. src/marketing.ts writes the row first and sends only when META_PIXEL_ID and
-- META_CAPI_TOKEN are set, so with no keys the lane still keeps the count. AD3's measure, started events sent over
-- started rows, is read from here by GET /admin/marketing.
--   Lead                  the dealer application accepted (the obavia-waitlist worker keeps its own copy; see deploy/site/lane)
--   CompleteRegistration  the dealer's key kept in the Desk: its first GET /dealers/me; source_id is the GDN, once ever
--   AddPaymentInfo        the buyer's deposit captured; source_id is the money_events id (capture:<payment>); never Purchase, it is refundable
--   Purchase              the car started at pickup (sale.startedAt); source_id is the lot id; value is the hammer in USD
-- No name, no licence number, no address and no phone is stored here: the row carries the event, where it came from,
-- when, the value and whether Meta accepted it. The phone or email goes to Meta hashed (SHA-256) and is not kept.
CREATE TABLE IF NOT EXISTS marketing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,            -- Lead | CompleteRegistration | AddPaymentInfo | Purchase
  source_id TEXT NOT NULL,        -- the row it came from (above)
  event_id TEXT NOT NULL,         -- what Meta deduplicates on: <event>:<source_id>
  at INTEGER NOT NULL,            -- when it happened (ms)
  value INTEGER,                  -- Purchase: the hammer; AddPaymentInfo: the deposit; whole dollars
  currency TEXT,                  -- USD
  sent INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER,
  error TEXT,                     -- Meta's refusal or the network error, at most 240 characters; null when sent or never tried
  UNIQUE (event, source_id)
);
CREATE INDEX IF NOT EXISTS marketing_events_at ON marketing_events (at);
