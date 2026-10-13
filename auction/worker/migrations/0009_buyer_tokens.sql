-- Buyer tokens: the id is made by the Worker, a token is the only proof of it until
-- a Whop-verified email or phone exists (Phase 2).
-- The epoch is signed into every token minted after 0; a rotation (POST /me/rotate)
-- or an admin bump (POST /admin/buyers/:id/bump) adds one and every older token stops working.
-- Existing rows start at 0, where the token format is unchanged, so no live token breaks.
ALTER TABLE buyers ADD COLUMN token_epoch INTEGER NOT NULL DEFAULT 0;
-- Every POST /me refused for an id the caller could not prove (401 not_yours).
-- Kept apart from bid_refusals: there is no lot. The admin reads it in /admin/exposure.
CREATE TABLE IF NOT EXISTS token_refusals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claimed TEXT NOT NULL,        -- the buyer id asked for
  reason TEXT NOT NULL,         -- not_yours
  presented TEXT NOT NULL,      -- none (no token) | forged (bad signature) | other (another buyer's token) | stale (an epoch rotated away)
  known INTEGER NOT NULL,       -- 1 when the id exists: someone tried to take a real buyer
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS token_refusals_at ON token_refusals (at);
