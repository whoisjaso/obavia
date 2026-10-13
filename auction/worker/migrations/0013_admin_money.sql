-- Wave 1-B: the admin's money routes, payouts paid by hand, the reconciliation's liabilities, one proved phone per buyer.

-- A payout the admin paid outside Whop (POST /admin/payouts/:id/paid): state becomes 'paid', sent_at is when,
-- method is wire | check | cash, paid_note the admin's words (at most 200 characters). A Whop transfer leaves
-- method null and state 'sent'.
ALTER TABLE dealer_payouts ADD COLUMN method TEXT;
ALTER TABLE dealer_payouts ADD COLUMN paid_note TEXT;

-- The nightly reconciliation counts payouts owed (held, not yet sent or paid) as liabilities beside the deposits held:
-- equal needs the Whop balance to cover both. The reserve ratio on /admin/exposure is read from the last row.
ALTER TABLE reconciliations ADD COLUMN payouts_owed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reconciliations ADD COLUMN payouts_owed_cents INTEGER NOT NULL DEFAULT 0;

-- buyers.deposit_status gains 'disputed' (a dispute.created webhook on a captured deposit); refunds and disputes
-- are matched to the buyer by the payment id, so the lookup is indexed.
CREATE INDEX IF NOT EXISTS buyers_deposit_ref ON buyers (deposit_ref);

-- A verified phone proves one buyer. Only Telnyx proofs are held to it: a 'fake' proof (MESSAGING_PROVIDER=fake)
-- is a test number on a DEV=1 Worker and proves nothing for real. Applying this on a database where two buyers
-- already proved the same number by Telnyx fails; find them first with
--   SELECT phone, COUNT(*) FROM buyers WHERE phone_verified_via = 'telnyx' GROUP BY phone HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS buyers_phone_proved ON buyers (phone) WHERE phone_verified_via = 'telnyx';
