-- Buyer sign-in by phone, the first of the three Phase 2 pages (obavia-auction-phases.md, Onboarding (buyer)).
-- buyers.phone (0008) now holds the number the buyer proved with a code; phone_verified_at says when,
-- phone_verified_via which provider proved it ('telnyx', or 'fake' under MESSAGING_PROVIDER=fake, which
-- admits a bid only on a DEV=1 Worker). A bid with no verified phone is refused 409 phone_required, and the
-- shill check (D11) compares the verified phone only.
ALTER TABLE buyers ADD COLUMN phone_verified_at INTEGER;
ALTER TABLE buyers ADD COLUMN phone_verified_via TEXT;
-- One pending code per buyer: the number it went to, the send limits (one per 30 s, five an hour) and the
-- attempts on it (five, ten minutes). The number lives here only until it is verified or replaced.
CREATE TABLE IF NOT EXISTS phone_codes (
  buyer_id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,          -- E.164, +1 and ten digits
  sent_at INTEGER NOT NULL,
  window_start INTEGER NOT NULL,
  sends INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  via TEXT NOT NULL             -- telnyx | fake
);
-- Every code sent, by time only (no buyer, no number): the hourly ceiling across all buyers, so a stranger
-- making fresh buyers cannot turn the Worker into a paid SMS pump. Rows older than a day are pruned on send.
CREATE TABLE IF NOT EXISTS phone_sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS phone_sends_at ON phone_sends (at);
