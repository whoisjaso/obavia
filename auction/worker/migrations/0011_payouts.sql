-- The dealer's money, one row per payout the lane owes a dealer (collateral.md §2; decisions §1 Deposit).
-- reason: applied (the buyer's $250 counts toward the price at the engine start, so the dealer is owed it),
--         forfeit (the dealer or the admin forfeited a no-pay), no_pay (the 48 h deadline alarm forfeited it).
-- state: owed until a Whop transfer to dealers.whop_account lands, then sent with its transfer id.
-- The id is the Whop idempotency key: applied:<lot> or forfeit:<lot>, so a payout is written and sent once.
CREATE TABLE IF NOT EXISTS dealer_payouts (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL,
  dealer TEXT NOT NULL,
  buyer TEXT NOT NULL,
  amount INTEGER NOT NULL,      -- whole dollars; 250
  reason TEXT NOT NULL,         -- applied | forfeit | no_pay
  note TEXT,                    -- the forfeiting party's words, at most 240 characters
  held INTEGER NOT NULL DEFAULT 1,   -- 0 when the buyer's deposit was not captured at that moment: nothing is sent
  state TEXT NOT NULL,          -- owed | sent
  transfer_id TEXT,
  error TEXT,                   -- the last transfer failure, at most 240 characters; never a key
  created_at INTEGER NOT NULL,
  sent_at INTEGER
);
CREATE INDEX IF NOT EXISTS dealer_payouts_dealer ON dealer_payouts (dealer, state);
CREATE INDEX IF NOT EXISTS dealer_payouts_lot ON dealer_payouts (lot_id);

-- A pickup scan the lot refused (wrong car, no payment, no VIN, a voided or forfeited sale), for the admin.
CREATE TABLE IF NOT EXISTS pickup_refusals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_id TEXT NOT NULL,
  dealer TEXT NOT NULL,
  reason TEXT NOT NULL,         -- wrong car | not_paid | vin_required | vin_unknown | sale_voided | sale_forfeited | already_started | no sale
  presented TEXT,               -- the last six characters scanned, upper case; null when none
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pickup_refusals_at ON pickup_refusals (at);

-- The Desk's push token, so a forfeiture reaches the dealer as well as the buyer. Registered by a Worker route (not yet built).
ALTER TABLE dealers ADD COLUMN push_token TEXT;
