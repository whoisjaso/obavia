-- Obavia messaging, Cloudflare D1 (SQLite). Apply with:
--   npx wrangler d1 execute obavia-desk --remote --file server/schema.sql
-- suppression, suppression_log and consent are the compliance record. Never delete from them in cleanup.

CREATE TABLE IF NOT EXISTS dealer_line (
  number       TEXT PRIMARY KEY,          -- E.164, registered to the dealer's 10DLC campaign
  dealer_id    TEXT NOT NULL,             -- TxDMV licence, e.g. P171632
  display_name TEXT NOT NULL,             -- what texts are signed with
  help_phone   TEXT NOT NULL,             -- the number HELP replies give
  time_zone    TEXT NOT NULL DEFAULT 'America/Chicago',
  brand_id     TEXT,
  campaign_id  TEXT
);

CREATE TABLE IF NOT EXISTS suppression (
  dealer_id TEXT NOT NULL,
  phone     TEXT NOT NULL,
  at        TEXT NOT NULL,
  source    TEXT NOT NULL,                -- 'keyword' (they texted STOP), 'dealer', 'carrier'
  PRIMARY KEY (dealer_id, phone)
);

CREATE TABLE IF NOT EXISTS suppression_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id TEXT NOT NULL, phone TEXT NOT NULL,
  action    TEXT NOT NULL,                -- 'stop' | 'start'
  at        TEXT NOT NULL, source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consent (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id TEXT NOT NULL, phone TEXT NOT NULL,
  kind      TEXT NOT NULL,                -- 'marketing'
  wording   TEXT NOT NULL,                -- the exact words the buyer agreed to
  method    TEXT NOT NULL,                -- 'desk-signature', 'web-form', 'keyword'
  at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS consent_by_phone ON consent (dealer_id, phone, kind);

CREATE TABLE IF NOT EXISTS message (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id   TEXT NOT NULL,
  direction   TEXT NOT NULL,              -- 'out' | 'in'
  provider_id TEXT,
  from_number TEXT NOT NULL, to_number TEXT NOT NULL,
  kind        TEXT NOT NULL,              -- 'otp' | 'care' | 'marketing' | 'inbound' | 'keyword-reply'
  body        TEXT NOT NULL,
  parts       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL,
  error       TEXT,
  at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS message_by_provider ON message (provider_id);
CREATE INDEX IF NOT EXISTS message_by_dealer ON message (dealer_id, at);

CREATE TABLE IF NOT EXISTS rate_hit (
  key TEXT NOT NULL,
  at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_hit_by_key ON rate_hit (key, at);

-- In-house notes (buy here pay here). The body is the Loan from src/lib/loans.ts.
CREATE TABLE IF NOT EXISTS note (
  id         TEXT PRIMARY KEY,               -- also PayNearMe's site_customer_identifier
  dealer_id  TEXT NOT NULL,
  body       TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS note_by_dealer ON note (dealer_id);
CREATE TABLE IF NOT EXISTS receipt_counter (dealer_id TEXT PRIMARY KEY, last INTEGER NOT NULL);
-- Who at the dealership is texted when a payment comes in, comma-separated E.164.
ALTER TABLE dealer_line ADD COLUMN alert_to TEXT;
