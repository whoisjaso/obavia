-- Phase 1: the pilot. Push tokens for buyers; dealers with their own tokens.
ALTER TABLE buyers ADD COLUMN push_token TEXT;

CREATE TABLE IF NOT EXISTS dealers (
  gdn TEXT PRIMARY KEY,         -- the Texas GDN, e.g. P000000
  name TEXT NOT NULL,
  whop_account TEXT,            -- biz_… connected account, for transfers (Phase 3)
  created_at INTEGER NOT NULL
);
