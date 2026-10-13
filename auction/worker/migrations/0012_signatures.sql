-- Signing on the lane (src/sign.ts; gap table W2-A; decisions §9 D8: the drawn signature is for the bill of sale
-- and the Buyers Guide acknowledgement). One row per document signed: the sale (the lot), which document, the
-- buyer, when, a salted hash of the address the request came from (SHA-256 of BUYER_SECRET and the address, never
-- the address), the consent text version, and whether the buyer reused the first signature. The drawing itself is
-- never stored here: svg_sha256 is its hash, the drawing lives only in the signed PDF in R2 (signed_key). The two
-- PDF hashes tie the row to the exact bytes the Desk uploaded and the exact bytes signed (the evidence pack).
-- UNIQUE (lot_id, doc): the insert is the lock, so a second signature on the same document is refused (409).
CREATE TABLE IF NOT EXISTS signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id TEXT NOT NULL,
  doc TEXT NOT NULL,              -- guide | bill
  buyer TEXT NOT NULL,
  at INTEGER NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,                -- at most 200 characters
  consent_version TEXT NOT NULL,
  reuse INTEGER NOT NULL DEFAULT 0,
  svg_sha256 TEXT NOT NULL,
  original_sha256 TEXT,           -- null only while the stamp is being written
  signed_sha256 TEXT,
  signed_key TEXT,                -- signed/<lot>/<doc>.pdf
  UNIQUE (lot_id, doc)
);
CREATE INDEX IF NOT EXISTS signatures_buyer ON signatures (buyer, at);
