-- Wave 4-A (gap table §4, W4-A systems; phases.md amendment of 2026-10-13): Phase 4 and Phase 5 code behind flags, no deploy,
-- no money, no keys. Every column and table the Wave 4 routes read. Nothing here moves a dollar.

-- The closed lane (phases.md Phase 4 Server: "Dealer-to-dealer lane (after the Wholesale Motor Vehicle Auction GDN)"). A dealer
-- opens a lot with car.lane = 'closed' only when this column carries the wholesale auction GDN the admin typed in
-- (POST /admin/dealers/:gdn/wholesale). Null until then: a closed lot is refused 403 wholesale_required.
ALTER TABLE dealers ADD COLUMN wholesale_gdn TEXT;

-- The dealer application's referral (phases.md Phase 5 Marketing: "dealer referrals"): a buyer's referral code or any plain
-- word the applicant typed, kept as typed. Waives nothing; no money moves on it.
ALTER TABLE dealers ADD COLUMN referral TEXT;

-- Per-dealer settings on the Worker (phases.md Phase 5 Admin: "per-dealer settings"): the Desk's shapes
-- (desk/src/lib/dealer-settings.ts) mirrored as opaque JSON. hours_json is the list of pickup windows the buyer's Pickup
-- reads; pickup_address_json the address as the Desk sends it; after_hours_phone the line under the hours; lane_on whether
-- cars go on the lane. One row per GDN, written by PUT /dealers/settings (owner or manager key).
CREATE TABLE IF NOT EXISTS dealer_settings (
  gdn TEXT PRIMARY KEY,
  hours_json TEXT NOT NULL DEFAULT '[]',
  pickup_address_json TEXT,
  after_hours_phone TEXT,
  lane_on INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

-- Referrals (phases.md Phase 5 Marketing: "a buyer's share link that waives nothing"). One code per buyer, made on the first
-- GET /me: eight characters, no vowels, no 0, O, 1 or I. referral_claims: one claim per referred buyer, never their own code.
-- The count of claims on a code is `referred` on GET /me. No money, no place in Watching here: the count only.
CREATE TABLE IF NOT EXISTS referrals (
  code TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS referrals_buyer ON referrals (buyer_id);
CREATE TABLE IF NOT EXISTS referral_claims (
  referred_id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS referral_claims_code ON referral_claims (code);

-- The arbitration clause (decisions §9 D13; phases.md Phase 5 Legal "arbitration live"), behind ARBITRATION=1. The version the
-- buyer scrolled to the end of and accepted (POST /me/clause) and when. The text is a draft until counsel answers Q14; the
-- version string names it a draft. With the flag on, a bid from a buyer with no clause_at is 409 clause_required.
ALTER TABLE buyers ADD COLUMN clause_version TEXT;
ALTER TABLE buyers ADD COLUMN clause_at INTEGER;
