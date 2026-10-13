-- Wave 3-B (gap table §4, W3-B systems): every column the Worker's Wave 3 routes add. The invoices and the platform
-- row are W3-A's (0016); the evidence packs are W3-F's (0018). Nothing here carries a fee or a date on the glass.

-- account.updated from Whop: when Whop finished verifying the dealer's connected account (dealers.whop_account).
-- Null until the webhook says so; the owed-payout retry runs when it lands. The Desk's lane settings row reads it.
ALTER TABLE dealers ADD COLUMN whop_account_verified_at INTEGER;

-- The alarm audit (gap table deviation 7, the proposed definition until amended): counted on every nightly run, from
-- each lot's object without dropping the hammer (the object's POST /audit). lots_past_close: lots past closesAt by
-- more than the grace (src/reconcile.ts ALARM_GRACE_MS) and not closed. sales_past_deadline: sales past deadlineAt by
-- more than the grace and neither paid, started, forfeited nor voided. Either non-zero makes the night not equal, and
-- each lot is named in `differences` with field 'alarm.close' or 'alarm.deadline'.
ALTER TABLE reconciliations ADD COLUMN lots_past_close INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reconciliations ADD COLUMN sales_past_deadline INTEGER NOT NULL DEFAULT 0;

-- Recovery by phone (POST /me/recover, /me/recover/verify): a number proved again on a new install moves the buyer
-- to a fresh token and bumps the epoch. One row per recovery, for the admin's exposure: no number, no code.
CREATE TABLE IF NOT EXISTS recoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer TEXT NOT NULL,
  from_epoch INTEGER NOT NULL,
  to_epoch INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS recoveries_at ON recoveries (at);
