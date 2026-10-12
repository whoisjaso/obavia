# Obavia auction: the build in phases

Every workstream, phased end to end: Onboarding, Marketing, Payments (Whop), Admin, Customers (buyers), Dealers, Individuals (the public seller), Paperwork, Logistics, Frontend, Server, Legal, Ops. A phase ends when its exit test passes, not when its list is done. Nothing in a later phase starts until the earlier phase's exit test is green, except research, which runs ahead.

Decisions already made and not reopened here: `obavia-auction-decisions.md` (no success fee without a GDN under 43 TAC §215.85; pilot on Triple J's GDN; zero buyer premium; as-is plus "starts at pickup or no sale"; $250 standing captured deposit; the hammer is the sale). Copart's processes and the SOPs drawn from them: `copart-decoded.md`.

What is already built (as of this plan): the buyer app's Lane, Bid sheet, Car, Won through Plates, Watching, Me, the sensory layer, the type system; the Worker with one Durable Object per lot, signed buyer tokens, the deposit gate, Whop as the payment rail (deposit checkout, verification, signed webhooks), D1 copies; the Desk's Handle A Sale, 130-U, Buyers Guide and every dealer document. Marked ✔ below.

---

## Phase 0 · Foundation (now → pilot-ready code)

**Goal:** one dealer, ten cars, one lane, real money in a sandbox, nobody reads.

| Workstream | Scope | Status |
| --- | --- | --- |
| Frontend | Lane, Bid sheet, Car (three pages), Won → ID · Insure · Sign · Plates, Pay, Pickup, Plates ring, Watching, Me; Bodoni + platform face; spaced-capitals register; haptics and sound | ✔ |
| Server | Worker + Durable Object per lot; idempotent bids; alarm close; WebSockets; D1 copy; buyer tokens; dealer secret | ✔ |
| Payments (Whop) | `src/whop.ts`: deposit checkout configuration, payment verification, Standard-Webhooks signature, refund, transfer, connected account; `/me/deposit/checkout`, `/me/deposit`, `/webhooks/whop`; `money_events` ledger | ✔ code; sandbox keys to set |
| Paperwork | Desk: 130-U, VTR-271, Buyers Guide, bill of sale, title assignment, all dealer documents render like production | ✔ (Desk) |
| Dealers | The Desk exists; Let It Go, Floor, Show It, How Long, Live, Sold screens | built (commit 96cf22c), walked end to end against a local Worker; checked on Mon Oct 19 per the growth plan |
| Legal | §215.85 reading; counsel list in decisions §5 | written, not sent |

**Exit test:** `npm test` green in both packages; the web walkthrough (`?win=1`) runs Lane → Won → Plates without a page that needs reading beyond the four kept reads.

---

## Phase 1 · Pilot wiring (weeks 1–3)

> Collateral gate (added 2026-10-12): the Worker refuses `/open` on collateral it cannot see; the Desk refuses earlier. The rules and the loss table are in `docs/plan/collateral.md`. Phase 1b (the Desk's Let It Go, Live, Sold, pickup) is built; 1c (the phone over the Worker) is next.


**Goal:** Triple J lists ten real cars; ten real neighbours bid with real deposits in Whop sandbox, then live.

| Workstream | Scope | Exit |
| --- | --- | --- |
| Dealers | Desk: **Let It Go** (title gate first: in hand / lender lead time / repo lock), **Show It** (twelve photos, three mandatory angles, Buyers Guide photographed, six condition rows, defect line, dusk-light pulse), **Floor** (net, you get / you bring, holding cost, wholesale band, no cost basis), **How Long** (3·7·10), **Go** → `POST /lots/:id/open` with the dealer secret | a car goes from the Desk to the Lane in under four minutes |
| Dealers | Desk: **Live** (ring, high bid, bid count, watching, floor as a faint line, long-press to lower), **Sold** (buyer name, deadline in big type, payout chip with settle date, Open the sale) | the dealer sees a bid land within a second of the phone |
| Payments (Whop) | Whop sandbox account; `WHOP_ACCOUNT_ID`, `WHOP_API_KEY`, webhook registered with `WHOP_EVENTS`; the app opens the hosted checkout in an in-app browser (`expo-web-browser`) and returns on `obavia://deposit`; deposit refund on a loss from the object's close event; forfeiture on no-pay at 48 h | a sandbox deposit captures, a lost auction refunds within a minute, a no-pay forfeits at the deadline |
| Customers | ID before the first bid: `expo-camera` frame + an ID read (ML Kit on Android, Vision on iOS, or a vendor like Persona if the read is unreliable); Texas licences only; the state chip from the read | a licence reads in one shot nine times in ten |
| Frontend | Push notifications (`expo-notifications`): outbid with the time left ("Outbid · $5,200 · 2:00 left"), won, pay-by reminder at 24 h and 6 h, filed/approved/mailed; the app opens on the right screen | every push opens the screen it names |
| Paperwork | The Desk's real document renders inside `Paper` (Buyers Guide, bill of sale, title assignment) with the buyer's fields highlighted; one signature reused with consent logged; the signed PDFs stored with the sale | the three documents the buyer signs are the same bytes the Desk prints |
| Logistics | Pickup windows from the dealer's hours; the pass as a QR; the dealer's Desk scans it, records "started", and the pass turns green over the socket; after-hours line | a handover completes on the Desk side and the phone side within two seconds |
| Legal | Counsel engaged on the priority list (decisions §5); Buyers Guide physical at pickup; deposit terms line approved; arbitration terms drafted | counsel sign-off on fee structure, deposit terms, as-is language |
| Admin | A plain admin page in the Desk: lots, bids, buyers, money events, a "release deposit" and "forfeit" button with a reason | every money movement traceable to a row |
| Ops | Runbook: the 9 pm texts (sim 06), a late bid, a county kickback, a no-show; one phone number | the runbook covers every failure the simulations found |

**Exit test:** ten pilot cars sold or relisted; every deposit accounted for in `money_events`; zero reads added to the glass.

---

## Phase 2 · Onboarding and the first fifty buyers (weeks 3–6)

| Workstream | Scope | Exit |
| --- | --- | --- |
| Onboarding (buyer) | Sign-in: phone number + code (Telnyx, already in the Desk), the licence read, the deposit; three pages, one verb each; Watching after 24 h gets the heartbeat; Me shows the standing deposit | a new buyer bids within three minutes of the TikTok link |
| Onboarding (dealer) | Desk onboarding already exists (state, licence lookup, systems); add the auction toggle, dealer hours, pickup address, after-hours line, the Whop connected account (`POST /accounts`) with Whop's identity checks | a second dealer lists a car without a call |
| Marketing | The 15-second ad (built) placed on TikTok and Instagram for one zip code; Reach posts each car to Marketplace with the lane link; the Lane's share sheet | cost per first bid known |
| Customers | Buyer protection stated once: the Buyers Guide, "starts at pickup or no sale", the deposit line; the after-hours line | the 9 pm texts drop by half |
| Individuals | Research only: the public seller lane ("Sell it back here") needs a licensed seller of record; decide between dealer consignment through Triple J and Obavia's own GDN | a one-page decision |
| Admin | Dashboard numbers: watchers, bids per car, hammer vs floor, days to pickup, deposits held | the owner reads the week in one screen |
| Frontend | Android pass (Google Wallet), accessibility pass (VoiceOver adjustable price, three-finger paging), sun test on a lot at noon | VoiceOver completes a bid |
| Server | Nightly D1 vs object comparison; alarm audit; rate limits on bids per buyer; fraud gates from sim 03 (one open bid per buyer until the first car is paid) | the nightly report says "equal" seven nights running |

**Exit test:** fifty buyers with a captured deposit; two dealers listing; one week with no manual money fix.

---

## Phase 3 · Obavia's own licence and the money model (weeks 6–14)

| Workstream | Scope | Exit |
| --- | --- | --- |
| Legal | File for Obavia's Independent GDN (bond, premises, compliance); until it issues, no fee of any kind | GDN issued |
| Payments (Whop) | The flat seller-side fee (~$199 per sold car, then $299 per month at six cars) as a Whop invoice to the dealer; the balance as a Whop invoice to the buyer (ACH, card, cash at the lot marked paid); payout to the dealer by transfer on cleared funds, lender first; remittance PDF | money moves without a human after the hammer |
| Dealers | Payout screen in the Desk: cleared, pending, lender split; relist, forfeit, second-chance offer on expiry; Marketplace retraction on sale | a dealer runs a week without calling |
| Paperwork | The 130-U filed from the Desk at pickup; the plates ring driven by webDEALER events (filed, approved, mailed, kickback); out-of-state packet (Form 14-312, buyer's tag) | a Texas buyer's plates ring reaches Mailed with no manual step |
| Admin | Refunds, forfeitures, disputes (Whop `dispute.*`), evidence upload; audit log per lot | every dispute answered from the log |
| Marketing | The dealer film for Let It Go; the "your car drives home" line; one more zip code | second zip code hits the first's cost per bid |

**Exit test:** one month of fees invoiced and paid on Whop; zero fee charged before the GDN issued.

---

## Phase 4 · Individuals and the second lane (weeks 14–22)

| Workstream | Scope | Exit |
| --- | --- | --- |
| Individuals | "Sell it back here": the buyer's own car consigned to a licensed dealer of record (Triple J or Obavia's GDN); Show It on the phone; the same Floor; payout on clearance; title with lien release | ten individuals list and sell |
| Logistics | Drop-off at the lot or pickup by the dealer; a photo at intake; keys and title custody logged | every consigned car has an intake record |
| Customers | Buyers can be sellers: Me gains a Selling page with its own rings | one buyer sells and buys in the same month |
| Payments (Whop) | Seller payouts to individuals (user transfers), 1099 thresholds tracked | payouts reconcile monthly |
| Server | Dealer-to-dealer lane (after the Wholesale Motor Vehicle Auction GDN): closed lane, no Buyers Guide, dealer licences on both sides | first wholesale lot runs |

**Exit test:** a car sold by an individual, bought by an individual, with the dealer of record on every document.

---

## Phase 5 · Scale and polish (weeks 22–34)

| Workstream | Scope | Exit |
| --- | --- | --- |
| Frontend | Engine idle recordings (hold to hear), the walkaround video, the Car's grade from photos, Dynamic Island / Live Activity for the last two minutes, Wallet passes | the last two minutes live on the lock screen |
| Marketing | Referral: a buyer's share link that waives nothing (no premium exists) but lifts their place in Watching; dealer referrals | referral share of first bids known |
| Admin | Roles (owner, manager, lot), per-dealer settings, exports | a manager runs a dealer without the owner |
| Ops | Second city; after-hours line staffed; the runbook as the Desk's own checklist | a second city opens without a new process |
| Legal | Out-of-state buyers; the FTC Rule's physical Guide at the lot during the auction (counsel question); arbitration live | out-of-state buyers admitted |

**Exit test:** two cities, five dealers, five hundred deposits, no reads added.

---

## Phase 6 · The platform (month 9+)

Obavia's own Wholesale GDN; dealer-to-dealer at scale; financing partners at Pay (a fourth word: "Finance"); the Reach engine selling the lane itself; the dealer's Desk sold on the $3,000 offer with the auction as its reason. Everything the earlier phases proved, multiplied.

---

## Whop, exactly where it sits

| Moment | Whop object | Endpoint | Event we act on |
| --- | --- | --- | --- |
| First bid | the deposit | `POST /checkout_configurations` (mode `payment`, our metadata) → hosted checkout → `GET /payments/{id}` | `payment.succeeded` |
| Lost the auction | the deposit back | `POST /payments/{id}/refund` | `refund.created` |
| No-pay at 48 h | the deposit kept | nothing moves; status `forfeited` in `buyers` | — |
| Won | the balance | `POST /invoices` (send_invoice; ACH, card; cash at the lot → `mark_paid`) | `invoice.paid` |
| Pickup done, funds cleared | the dealer's money | `POST /transfers` to the dealer's `biz_` account with an idempotence key; lender first by a second transfer | `transfer.completed` |
| Dealer onboarding | the dealer | `POST /accounts` (connected account, Whop runs identity) | `account.updated` |
| A chargeback | the fight | `dispute.*`, `POST /disputes/{id}/upload_evidence` with the signed documents and the pass scan | `dispute.created` |
| Our fee (Phase 3) | the invoice to the dealer | `POST /invoices` | `invoice.paid` |

Whop's iOS checkout SDK is Swift only; the app opens Whop's hosted checkout in an in-app browser and returns by deep link, which keeps one path for iPhone and Android. Fees to confirm on Whop's own schedule before Phase 3 pricing (third-party figures: 2.7% + $0.30 domestic cards; payout fees by method).

## Who decides what

| Owner | By |
| --- | --- |
| Repo name | Phase 0 |
| Ten pilot cars and floors | Phase 1 |
| Whop account and sandbox keys | Phase 1 |
| Counsel engaged | Phase 1 |
| GDN application filed | Phase 3 start |
| Second city | Phase 5 |
