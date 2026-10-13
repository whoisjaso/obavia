# Whop: fees, refunds, transfers and holds for the $250 deposit and the seller fee

Researcher-architect, checked 2026-10-12. This file answers `growth/model.md` (Whop invoice fee, marked UNVERIFIED) and supports register rows S02, S04, S06 and S21.

## Question

What does Whop charge on a one-time payment and on a refund? How fast does money move to a connected account? Can a deposit held for 30 days or more still be refunded in full?

## Answer

Whop's own fee page gives **2.7% + $0.30 per successful domestic card transaction**. That confirms model.md's $5.67 on a $199 fee. International cards add 1.5% and currency conversion adds 1%. ACH debit costs 1.5% with a $5 cap. The fraud tools are listed per transaction: 3DS $0.03 and Radar $0.07. A dispute costs $15. **A refund costs nothing extra, but the original fee is not returned.** Whop's refund page says you refund the full amount "even though fees reduced the amount you received". So each $250 deposit costs Obavia **$7.05 at capture** ($7.15 if 3DS and Radar both apply), and that cost is not recovered when the deposit is refunded. Transfers between accounts on a Whop platform are described as instant. Under the transfer model the **platform is merchant of record and carries fees, disputes and refunds**. A connected account's withdrawal to a bank costs $2.50 by next-day ACH or $23 by wire. A customer payment takes "a couple of days" to become available. Whop may place a **rolling or fixed reserve** on a new account, or on one that "deliver[s] long after the customer pays". A standing deposit fits both descriptions. **No Whop page states an age limit on refunding a payment.** Whether a deposit can be refunded in full to the original card after 30, 90 or 180 days is **UNVERIFIED** and must be proven in Whop's sandbox.

## Evidence

| Claim | Source URL | Date checked | Quote |
| --- | --- | --- | --- |
| Card fee | https://docs.whop.com/fees | 2026-10-12 | "2.7% + $0.30 per successful transaction for domestic cards + 1.5% for international cards + 1% if currency conversion applies" |
| ACH debit fee | same | 2026-10-12 | "Accept ACH direct debit payments from US bank accounts. 1.5% (Maximum fee of $5) per successful ACH debit transaction" |
| Fraud and dispute fees | same | 2026-10-12 | "3DS … $0.03 per transaction"; "Radar … $0.07 per transaction"; "Dispute … Flat fee applied when a chargeback or dispute occurs. $15.00 per dispute"; "Early dispute alert (RDR) … $29.00 per alert" |
| Optional add-ons stack | same | 2026-10-12 | "Billing … 0.5% per transaction (when enabled)"; "Everything enabled, tax collected 6% + $0.30" |
| Payout fees | same | 2026-10-12 | "Withdraw via next day ACH … $2.50 per successful payout"; "Instant Bank Deposit (RTP) … 4% + $2.50"; "Bank wire … $23.00 per successful payout" |
| A refund returns the full amount, the fee is lost, and no refund fee | https://docs.whop.com/manage-your-business/manage-payments/issuing-refunds | 2026-10-12 | "When you refund someone, you pay back the full amount they originally paid, even though fees reduced the amount you received. … There are no additional fees to process a refund." |
| Refund speed | same | 2026-10-12 | "Whop processes refunds immediately" … "Customers can typically expect to see refunds in their account within 3–7 business days after Whop processes them." |
| A refund needs balance | same | 2026-10-12 | "If your Whop account doesn't have sufficient funds for a refund, you'll need to add money to your account first." |
| Refund API | https://docs.whop.com/api-reference/payments/refund-payment (OpenAPI `x-api-version-date: 2026-10-09-2`) | 2026-10-12 | "Issue a full or partial refund for a payment. The refund is processed through the original payment processor" — `POST /payments/{id}/refund`. No age limit stated. |
| Refund age limit | Searched Whop's refund, dispute, API and reserves pages | 2026-10-12 | **UNVERIFIED.** No limit is published. Card-network limits on refunding to the original card are not stated by Whop. |
| Transfers: the platform is merchant of record | https://docs.whop.com/developer/platforms/collect-payments-for-connected-accounts | 2026-10-12 | "with transfers, your platform is the merchant of record for the original payment. Your platform handles fees, disputes, and refunds on that payment." The origin account must "have enough balance for the transfer". |
| Direct charges: the connected account is merchant of record | same | 2026-10-12 | "Create a checkout configuration with a connected account's ID to charge customers directly on the connected account. The connected account is responsible for Whop fees, refunds, and disputes." |
| Transfer speed | https://docs.whop.com/manage-your-business/manage-payouts/connected-accounts | 2026-10-12 | "Transfer funds: Move money between accounts on your platform instantly"; "Flexible transfers: Move money between accounts instantly via API" |
| Pending period after a payment | https://docs.whop.com/manage-your-business/manage-payouts/set-up-payouts | 2026-10-12 | "when a customer pays, it can take a couple of days for the money to reach your account" |
| Reserves | https://docs.whop.com/trust-and-safety/account-health/reserves | 2026-10-12 | "Whop may place or increase a reserve when: Your account is new, or doesn't have much sales history yet … You deliver long after the customer pays, such as pre-orders, bookings, or multi-month services, so payments stay disputable long after the sale" |

## The math

```
deposit fee        = 0.027 × 250 + 0.30          = $7.05   (+$0.10 if 3DS and Radar apply = $7.15)
net into balance   = 250 − 7.05                  = $242.95
refund owed        = $250.00
shortfall per refunded deposit                   = $7.05   (Obavia's own money)
seller fee F=$199  = 0.027 × 199 + 0.30          = $5.67   (model.md's figure, now sourced)
```

At the model's floors (121 cumulative deposits by week 12, `model.md` §2.2), refunding every one of them costs **$853** that no buyer pays. Refunding half costs **$427**.

## The decisions it forces

1. **The reserve ratio of 1.00 is not automatic.** A captured $250 lands as $242.95. "Held 1:1, never spent" (`collateral.md` §1, §4) is true only if Obavia tops up $7.05 per deposit from its own funds when it is captured. `GET /admin/exposure` reports deposits owed against the Whop balance **net of any Whop reserve hold**. This is written into `obavia-auction-decisions.md` §8.
2. The deposit's cost to Obavia is $7.05 per capture, whether it is refunded, forfeited or applied. The model adds a line: "Whop fee on deposits: $7.05 × deposits captured" under costs. The cost is incurred once per standing deposit, not per lot, which is one more reason the deposit is standing (decisions §1).
3. Phase 3 money movement uses **transfers** (Obavia as merchant of record) for the deposit and **direct charges with an application fee** only if counsel prefers the dealer as payee (counsel q3). The transfer is instant inside Whop. The dealer's bank receives it next business day ($2.50) or by wire ($23).
4. Before a standing deposit's age is allowed past 30 days in production, the payments owner proves in the Whop sandbox (`https://sandbox-api.whop.com/api/v1`) that `POST /payments/{id}/refund` succeeds on a payment older than 30 days. Until that is proven, the automatic release after seven days with no live bid (decisions §1) is the safe path, and no copy promises a refund at any later age.
5. model.md's "Whop invoice fee on F" moves from UNVERIFIED to **sourced: 2.7% + $0.30 domestic card**. Billing (+0.5%) applies if Whop invoicing is used for F, so the invoice fee is $6.67 at F = $199 with Billing enabled. Whether invoices count as "Billing" is **UNVERIFIED**.
