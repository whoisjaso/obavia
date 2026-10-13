-- Wave 3-A (payments): the platform row, the invoices, the cleared transfer, the dealer's billing address for the fee.
-- docs/plan/gap-table.md §4 W3-A; growth plan line 88 (fee code behind a flag that reads gdn_issued_at); 43 TAC §215.85.

-- One row, id 1. Null until the owner sets it through W3-B's POST /admin/gdn (src/fees.ts setPlatform). While gdn_issued_at
-- is null, src/fees.ts feeFor returns null and writes nothing: money_events carries zero fee rows (growth plan line 88).
-- fee_per_car_cents and fee_monthly_cents are typed by the owner, never written in code (gap table deviation 9); the model's
-- $199 and $299 are ASSUMPTIONS (growth plan line 5). fee_monthly_cents is stored and not yet applied: the monthly plan at
-- volume is a model line, not a Worker rule, until phases.md says how it switches.
-- balance_payee: who the buyer's balance invoice is created for. Null until the owner's line for gap table deviation 2
-- (phases.md:76 "a Whop invoice to the buyer" against decisions §9 D5 "the dealer is payee of price and tax; Obavia touches
-- only the refundable deposit" and collateral.md:47 "no holding a buyer's balance"). The only value the code accepts is
-- 'dealer' (the invoice on the dealer's connected account, account_id = dealers.whop_account); any other value holds.
CREATE TABLE IF NOT EXISTS platform (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  gdn_issued_at INTEGER,          -- ms; the day Obavia's own GDN issued; null is "not issued"
  fee_per_car_cents INTEGER,      -- the flat seller-side fee per started car, in cents
  fee_monthly_cents INTEGER,      -- the monthly plan at volume, in cents; stored, not applied
  balance_payee TEXT,             -- null | 'dealer' (deviation 2)
  updated_at INTEGER NOT NULL
);

-- One row per invoice the lane keeps, balance or fee. The id is the idempotency key (balance:<lot> or fee:<lot>), so each
-- is written once. whop_id is only ever Whop's own answer (an inv_ id); a bad answer stores nothing (the row stays held
-- with its error). state: held (the row exists, nothing created on Whop: the gate is shut, Whop is not configured, or no
-- address is known), open (created on Whop, unpaid), paid (Whop's invoice.paid), paid_at_lot (cash at the lot; the open
-- Whop invoice is voided so it cannot be paid twice), void.
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL,
  kind TEXT NOT NULL,             -- balance | fee
  payer TEXT NOT NULL,            -- balance: the buyer id; fee: the dealer's GDN
  payee TEXT,                     -- the Whop account the invoice was created on (biz_...): the dealer's for a balance, Obavia's for a fee; null while held
  whop_id TEXT,                   -- inv_... from Whop's own answer; null while held
  state TEXT NOT NULL,            -- held | open | paid | paid_at_lot | void
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  pay_url TEXT,                   -- Whop's pay_online_url, for the phone's ACH and card chips
  payment_ref TEXT,               -- the pay_... that settled it, from invoice.paid
  error TEXT,                     -- why it is held, or Whop's last refusal, at most 240 characters; never a key
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS invoices_lot ON invoices (lot_id, kind);
CREATE INDEX IF NOT EXISTS invoices_whop ON invoices (whop_id);
CREATE INDEX IF NOT EXISTS invoices_state ON invoices (kind, state);

-- transfer.completed: Whop says the dealer's transfer landed. The row keeps when; the money event is payout.cleared.
ALTER TABLE dealer_payouts ADD COLUMN cleared_at INTEGER;

-- The address Obavia's fee invoice goes to. Null until the admin sets it (the email a dealer gives
-- POST /dealers/account/start is passed to Whop and kept nowhere, README "Not yet"; this one is kept, by the admin's hand,
-- for the invoice only). Without it the fee row is written and held with error billing_email_unknown.
ALTER TABLE dealers ADD COLUMN billing_email TEXT;
