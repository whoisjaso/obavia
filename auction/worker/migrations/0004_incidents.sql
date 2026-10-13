-- Counted against a dealer: a sale the dealer could not deliver. collateral.md §2.
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  dealer TEXT NOT NULL,
  lot_id TEXT NOT NULL,
  kind TEXT NOT NULL,           -- non_delivery | title_failure | no_start
  note TEXT,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS incidents_dealer ON incidents (dealer, at);
