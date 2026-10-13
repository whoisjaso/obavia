-- The dealer application on obavia.co (POST /api/waitlist with a "step").
-- Apply to the obavia-waitlist Worker's D1 (binding WAITLIST_DB) BEFORE the
-- worker that reads it is deployed:
--   npx wrangler@4 d1 execute <waitlist database> --remote --file deploy/site/lane/0001_lane_application.sql
-- Additive only: the legacy {fullName, email, website} path never reads these.

-- The answers ride on the same waitlist entry (JSON, server-checked fields included).
ALTER TABLE waitlist_entries ADD COLUMN application TEXT;
ALTER TABLE waitlist_entries ADD COLUMN application_at INTEGER;

-- One row per GDN: when a code last went out, the hourly send window, the
-- attempts on the live code, and who verified it. No phone, no code is stored:
-- Telnyx Verify holds the code.
CREATE TABLE IF NOT EXISTS lane_codes (
  gdn TEXT PRIMARY KEY,
  sent_at INTEGER NOT NULL,
  window_start INTEGER NOT NULL,
  sends INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  via TEXT NOT NULL,
  verified_at INTEGER,
  verified_client TEXT,
  consumed_at INTEGER
);

-- Per-client (HMAC of the IP, never the IP) and global hourly limits for lookup, code and verify.
CREATE TABLE IF NOT EXISTS lane_limits (
  bucket TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  hits INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lane_limits_window ON lane_limits(window_start);
