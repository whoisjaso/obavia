# Collateral: who holds what, who loses what, and what the system refuses

Written from the owner's chair. A billion-dollar marketplace is a machine that never carries a risk it is not paid for and never lets a counterparty carry one it cannot see. Every state below names the asset, the holder, the party bearing the loss, and the rule in code. Nothing here is left to goodwill.

## 1. The assets

| Asset | What it is | Who holds it at each state |
| --- | --- | --- |
| **The car** | The dealer's inventory, on the dealer's licensed lot, under the dealer's insurance | Dealer, from Let It Go through pickup. Never moves before the pass turns green. |
| **The title** | The paper that makes a sale a sale | Dealer's hand, or the lender's until payoff. The lane does not open on a title that is neither. |
| **The keys** | Custody of the car at the handover | Dealer until the VIN scan and the engine start; buyer after. |
| **The buyer's deposit** | $250, captured once on Whop, standing while the buyer bids | Obavia's Whop balance, as a liability to the buyer until released, forfeited to the dealer, or applied. |
| **The balance** | Hammer plus tax and fees, minus the deposit | Buyer until paid; Whop invoice to the dealer's benefit (Phase 3) or paid at the lot (Phase 1). |
| **The payoff** | What the dealer owes a lender on the car | Lender's lien; paid first from the proceeds. |
| **Obavia's fee** | None until the GDN issues; then the flat seller-side fee | Invoiced to the dealer on Whop. |

## 2. Who bears the loss, state by state

| State | Failure | Who loses | How much | The rule in code |
| --- | --- | --- | --- | --- |
| Before the lane opens | Title not in hand and no lender lead time | Nobody: the lane refuses | 0 | `CarMeta.collateral.title.status ∈ {hand, lender}` required by `/open`; `repo` and `unknown` are refused |
| Before the lane opens | Floor below the payoff | Dealer, knowingly | the shortfall | Floor screen shows **you bring $X** and requires the dealer's OK; the Worker stores `collateral.payoffAcknowledged` |
| Live | Dealer withdraws a car with bids on it | Dealer's reputation; buyers' time | 0 money | `/close` never earlier than the refill; a close with bids is a sale |
| Hammer | Buyer never pays (48 h) | Dealer's holding cost and relist | the deposit | Deadline alarm forfeits: deposit disposition `to_dealer`, recorded in `money_events`, transferred on Whop (Phase 3); dealer relists from the Desk |
| Hammer | Dealer cannot deliver (car gone, title bad) | Buyer's time; Obavia's reputation | the deposit back in full | `/lots/:id/void` (dealer or admin): deposit released, buyer notified, incident logged against the dealer |
| Paid, before pickup | Car damaged on the lot | Dealer (insured) | repair or refund | Sale completes only at the engine start; `startedAt` is the moment of sale |
| Pickup | Car does not start | Nobody: no sale | 0 | The pass stays amber; the dealer voids; balance refunded by the dealer through Whop |
| After pickup | Buyer disputes the deposit charge with the card issuer | Obavia (merchant of record for the deposit) | $250 + dispute fee | Whop `dispute.created`: evidence pack auto-assembled (deposit terms line, signed Buyers Guide, bill of sale, the pass scan with VIN and time); Phase 1 admin page |
| After pickup | Title does not transfer (lender slow, county kickback) | Buyer waits; dealer owes the 130-U within 30 days | 0 money, statutory exposure on the dealer | Plates ring amber on kickback; the Desk's title watch (already built) |
| Any | Obavia insolvent while holding deposits | Buyers | up to $250 each | Deposits never fund operations: Whop balance held, released on request when the buyer leads nothing (`/me/deposit/release`); reserve ratio reported |

## 3. The dealer's position

The dealer carries the car, the title, the insurance and the statutory duty, as today. What the auction changes is the pay-off order and the proof: the floor is the net, the payoff is paid first from proceeds, the buyer's balance arrives on a rail that settles, and the moment of sale is a scan with a timestamp. The dealer's collateral for the buyer is the title in hand or the lender's release time, shown on the glass before the first bid. The dealer's collateral against the buyer is the deposit, which the dealer receives on a no-pay.

## 4. Obavia's position (the owner's)

| Exposure | Pilot (no GDN, no fee) | Phase 3 (own GDN, fees) |
| --- | --- | --- |
| Deposits held | A liability matched 1:1 by the Whop balance; released on request; never spent | Same, with a published reserve ratio |
| Chargebacks on deposits | Obavia's, mitigated by the evidence pack | Same, priced into the seller fee |
| Dealer non-delivery | Reputation; deposit returned; dealer suspended after one | Same, plus the dealer's bond on file (the GDN's $50,000 surety) as recourse |
| Buyer no-pay | None (the deposit goes to the dealer) | None |
| Title failure | None (dealer's statutory duty) | Obavia as seller of record on its own lane: the full duty, hence the bond and the title gate |
| Regulatory | 43 TAC §215.85: no fee of any kind | GDN, bond, premises; the fee is lawful |

The rule that makes this a company and not a liability: **every dollar Obavia touches is either a deposit it can return on demand or a fee it earned after the car started.** No float, no premium, no holding a buyer's balance.

## 5. What the system enforces, by endpoint

| Endpoint | Collateral rule |
| --- | --- |
| `POST /lots/:id/open` | refused unless `car.collateral.title.status` is `hand` or `lender` (with `releaseDays`), and the floor covers the payoff or `payoffAcknowledged` is true |
| `POST /lots/:id/bids` | refused without a captured deposit (402) |
| alarm (deadline) | forfeit: `sale.deposit = 'to_dealer'`, buyer `forfeited`, money event written |
| `POST /lots/:id/void` | dealer or admin ends a sale the dealer cannot deliver: deposit released, incident counted on the dealer |
| `POST /lots/:id/pickup` | VIN must match; `startedAt` is the sale |
| `GET /admin/exposure` | deposits held, released, forfeited; open sales by state; lots at lender; incidents by dealer; the reserve ratio |

## 6. What the owner still decides

- The deposit on a no-pay: all to the dealer (this plan), or split once Obavia has a licence.
- Whether a dealer's second non-delivery is a suspension or an end.
- The reserve ratio to publish (this plan: 100% of deposits held in the Whop balance at all times).
