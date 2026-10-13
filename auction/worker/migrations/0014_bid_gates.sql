-- Wave 2-E (phases.md Phase 2, Server row): the bids-per-buyer rate limit, the one-open-bid gate (sim 03), and the
-- nightly report's field-level differences.

-- Every bid attempt a signed-in buyer with a deposit makes, by buyer and time, across every lot. The conditional insert
-- in src/index.ts is the lock: a row lands only while the buyer has fewer than BIDS_PER_MINUTE (src/bidders.ts) rows in
-- the last minute, so a burst of parallel requests cannot all pass. key is the Worker's idempotency key
-- (<buyer>:<client key>): a retried request finds its row and is forwarded, never counted twice. Rows older than ten
-- minutes are pruned on the next attempt. No amount, no ceiling: the bids table is the record of what was bid.
CREATE TABLE IF NOT EXISTS bid_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer TEXT NOT NULL,
  lot_id TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS bid_attempts_buyer ON bid_attempts (buyer, at);

-- The one-open-bid gate writes bid_refusals rows with reason 'one_open_bid' (matched: the lots led plus the sales owed)
-- and the rate limit writes 'too_many_bids' (matched: the seconds to wait). No schema change: reason is free text.

-- The nightly reconciliation keeps which field of which lot differed between the D1 copy and the object, as a JSON
-- array of { lot, field, copy, object }, beside the ids in `differing`. '[]' on every row before this migration.
ALTER TABLE reconciliations ADD COLUMN differences TEXT NOT NULL DEFAULT '[]';
