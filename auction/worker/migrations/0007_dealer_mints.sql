-- POST /dealers/mint: every key minted by a caller other than the admin, with who asked.
-- Read for the 30-minute idempotency per GDN and the 20-per-hour ceiling; never listed by the route.
CREATE TABLE IF NOT EXISTS dealer_mints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gdn TEXT NOT NULL,
  name TEXT NOT NULL,           -- the legal name on the TxDMV licence
  city TEXT NOT NULL,
  source TEXT NOT NULL,         -- "lane": the dealer application on obavia.co
  minted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS dealer_mints_gdn ON dealer_mints (gdn, minted_at);
CREATE INDEX IF NOT EXISTS dealer_mints_at ON dealer_mints (source, minted_at);
