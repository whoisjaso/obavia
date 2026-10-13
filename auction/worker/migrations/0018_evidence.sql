-- The evidence pack (gap table W3-F; collateral.md §2 "After pickup: buyer disputes the deposit charge": the pack is
-- assembled, dated, hashed). One row per pack src/sign.ts evidencePack writes on a lot: the PDF in R2 under
-- evidence/<lot>/<at>.pdf (key) and its SHA-256, the buyer of the sale, and what the pack carries: the terms version
-- stamped on the buyer at the first bid (buyers.terms_version), the signed Buyers Guide's and bill of sale's hashes
-- (signatures.signed_sha256, null when not signed), and the engine start (lot.sale.startedAt, null when not started).
-- W3-B (index.ts, on dispute.created) fills dispute_id and, after W3-A's upload to Whop, uploaded_at and upload_ref,
-- or upload_error (at most 240 characters; never a key). The Desk's admin reads these names (desk/src/lib/admin-api.ts
-- readPack: lot_id, buyer, dispute_id, sha256, uploaded_at, upload_error, at). The signed drawings are never here:
-- the pack carries the signed PDFs' bytes, the row their hashes.
CREATE TABLE IF NOT EXISTS evidence_packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id TEXT NOT NULL,
  buyer TEXT,                     -- the sale's buyer; null on a lot with no sale
  dispute_id TEXT,                -- Whop's dispute id, set by the webhook that asked for the pack
  key TEXT NOT NULL,              -- evidence/<lot>/<at>.pdf in R2
  sha256 TEXT NOT NULL,           -- of the pack's bytes
  bytes INTEGER NOT NULL,
  at INTEGER NOT NULL,            -- when assembled (ms)
  terms_version TEXT,             -- buyers.terms_version at assembly
  guide_sha256 TEXT,              -- signatures.signed_sha256 for the guide, null when unsigned
  bill_sha256 TEXT,               -- signatures.signed_sha256 for the bill, null when unsigned
  started_at INTEGER,             -- lot.sale.startedAt, null when not started
  uploaded_at INTEGER,
  upload_ref TEXT,                -- what Whop answered with (an evidence id), never a key
  upload_error TEXT
);
CREATE INDEX IF NOT EXISTS evidence_packs_lot ON evidence_packs (lot_id, at);
CREATE INDEX IF NOT EXISTS evidence_packs_dispute ON evidence_packs (dispute_id);
