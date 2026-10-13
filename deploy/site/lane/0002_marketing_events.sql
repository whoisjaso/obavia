-- The standard Meta events the obavia-waitlist worker records (deploy/site/lane/events.mjs): Lead, when the
-- dealer application is accepted. Apply to the obavia-waitlist Worker's D1 (binding WAITLIST_DB) BEFORE the
-- worker that writes it is deployed:
--   npx wrangler@4 d1 execute <waitlist database> --remote --file deploy/site/lane/0002_marketing_events.sql
-- Additive only. The same shape as auction/worker/migrations/0015_marketing_events.sql.
-- One row each time the event happens, whether or not it was sent: with no META keys the row still lands with
-- sent = 0, so the count is readable before any key exists. No name, no licence number, no address, no email
-- is stored here: source_id for Lead is em:<SHA-256 of the email>, and the hashed email goes to Meta, not to D1.
CREATE TABLE IF NOT EXISTS marketing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,            -- Lead | CompleteRegistration | AddPaymentInfo | Purchase
  source_id TEXT NOT NULL,        -- the row it came from
  event_id TEXT NOT NULL,         -- what Meta deduplicates on: <event>:<SHA-256 of source_id, first 32>
  at INTEGER NOT NULL,            -- when it happened (ms)
  value INTEGER,                  -- whole dollars; null for Lead
  currency TEXT,                  -- USD
  sent INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER,
  error TEXT,                     -- Meta's refusal or the network error, at most 240 characters
  UNIQUE (event, source_id)
);
CREATE INDEX IF NOT EXISTS marketing_events_at ON marketing_events (at);
