# Obavia auction: the decisions, derived from six simulations

October 12, 2026. The owner asked for the open questions to be answered by simulation rather than by him. Six independent runs walked the blueprint (`obavia-auction.md`) from six seats: the dealer, the buyer, the adversary, the regulator and counsel, operations and money, and the front end tap by tap. The full reports are in `docs/plan/sim/`. Every person in them is fictional. This document is where the stories collide and what falls out.

---

## 0. The one finding that reorders everything

The blueprint's legal section cited the **new-vehicle** broker rule. The used-vehicle rule is **43 TAC §215.85**, read today from the regulation itself:

> "'directly or indirectly' includes the practice of arranging or offering to arrange a transaction involving the sale of a used motor vehicle for a fee, commission, or other valuable consideration. (b) A buyer referral service, program, plan, club, or **any other entity that accepts a fee for arranging a transaction involving the sale of a used motor vehicle is required to … obtain a GDN**, unless … (3) all participants pay the same weekly, monthly, or annual fee … (4) a person is not to be charged … any … transaction-related fee … (5) the program does not set or suggest to the dealer any price … (6) the program does not advertise … that the buyer … receives a special discounted price that cannot be obtained unless … referred through that program."

So "Structure A: Obavia is software and advertising, the dealer sells" survives only as a flat, equal subscription with **no per-car money, no price band beside the floor, and no "get the dealer price" advertising**. That is not the product. Every per-car fee, every buyer's premium, the wholesale band on the Floor screen and the buyer-side hook all require Obavia to hold a GDN.

**Decision: there is no Structure A.** The path is:

1. **Pilot on Triple J's own GDN, with no fee.** The owner's dealership selling its own cars on its own software is not "arranging a transaction for a fee" for anyone. Nothing is brokered. Ten cars, real buyers, real titles.
2. **File for Obavia's Independent GDN on day one** (the $50,000 surety bond under §503.033, a premises that satisfies §503.032, VIT filings, dealer-grade compliance). Open to other dealers only when it is granted. Later, a Wholesale Motor Vehicle Auction GDN for the dealer-to-dealer lane.
3. Never ship "software with a success fee" for a day. Counsel question 1 (below) is whether even a flat subscription is safe for a live bidding platform; we do not depend on the answer.

---

## 1. The four answers

| Question | Answer | Why, from the collisions |
| --- | --- | --- |
| **Structure** | Pilot on Triple J's GDN, fee-free; file for Obavia's own GDN now; other dealers join under it. | Counsel's §215.85 reading removes "A with any per-car money". The buyer run showed A is also a worse product (the buyer's remedy is a one-man lot at 2am; "Obavia took my money" with no Obavia refund). The dealer run showed B is where the dealer's own benefit is (a sale to Obavia is dealer-to-dealer, off his VIT statement, the public-sale complaints ours). Money and fraud preferred A only for liability placement, which the pilot already gives us because the pilot dealer is us. |
| **Fee** | **Zero buyer's premium.** Under Obavia's GDN: a flat **seller-side fee per sold car** (model: $199), switching to a monthly plan at volume (model: $299 at six cars). Pilot: $0. | All six runs chose zero premium independently: the premium is a number the buyer screenshots ("what is this"); buyers net it out so it comes from the hammer anyway (a 13% premium depresses the hammer 8 to 10%); it is taxable consideration in Texas (Tax Code §152.002 excludes no premium; Peak taxes it); under a 5% premium Stripe eats a third. A seller-side fee is the dealer's own cost, shown live as "you get". |
| **Guarantee** | **As-is on the Buyers Guide**, with title, odometer and VIN arbitration non-waivable. Plus one rule that is not a warranty: **the sale completes at pickup.** The buyer scans the VIN plate and starts the car before the balance is paid; the pickup QR turns green on both. If it does not start at pickup, the sale unwinds and the deposit returns. A dealer may later tick a 48-hour/100-mile "starts and drives" on his own Buyers Guide (his warranty, priced into his floor, administered by us, unwind only). | The dealer, counsel, fraud and front-end runs rejected a blanket 48-hour guarantee (it is an express warranty in the Buyers Guide box, brings Magnuson-Moss, invites the part-swapper, and makes a BHPH dealer pull every listing after the first "it threw a code on I-45"). The buyer and money runs showed the real loss is the car that will not start **at the lot** (Mr Tran's Civic, Dani's Fiesta): a complaint, a chargeback, a TikTok. "Starts at pickup, or no sale" closes that case with no warranty and no 48-hour window to game. |
| **Deposit** | **$250, one per buyer, captured (a real charge), kept as a standing credit** in Me; refunded within the hour on request after a loss, or automatically after seven days with no live bid; **forfeited on no-pay** (72 hours after close) as disclosed liquidated damages, to the dealer less processing. A bid that needs more than the standing amount ($500 over $5,000; 5% over $10,000; and a third simultaneous lead) asks for a top-up in the Apple Pay sheet. | A hold expires at about seven days, before a seven-day auction closes (money and buyer runs); a per-car hold strands a bus-rider with $4,200 (three holds, $750 pending); $50 is a ticket, not a bond (fraud run, Peak); $500 kills first bids (front-end run). Counsel: a non-refundable deposit on a loss is a transaction fee to the platform; forfeiture only on a winner who fails to sign. |

---

## 2. What the blueprint got wrong, and the fix (each one came from at least two seats)

| # | The blueprint said | What broke | The fix |
| --- | --- | --- | --- |
| 1 | Floor and Retail as two bars under the price. | Anyone who knows retail measures the floor bar and solves for the reserve; hammers collapse to floor plus one increment. First-timers read the floor as the price. | The floor is never drawn. The two bars are **Bid** and **Retail** (typical asking price, sourced). The gap the buyer "discovers" is bid-to-retail. "Reserve not met" is a hollow ring, not words. |
| 2 | "The price, big." | The hammer is not what the buyer pays: tax 6.25%, doc fee, title and registration add about $650 on a $5,000 car. The 9pm text and the DTPA letter both start here. | **Two numbers, stacked, 2:1:** the bid and the out-the-door total, computed by the Desk's `money.ts`, on every screen where money moves. The total is the number the bill of sale prints. |
| 3 | Floor screen: a number, with cost basis and the wholesale band beside it. | Cost basis anchors the floor at sunk cost (no bids); the band is meaningless before condition; the dealer types **net**, not hammer, and the fee makes him $70 short of his payoff; half a BHPH lot's titles are at a lender, a bank or mid-repo. | Order: **Where is the title right now?** (in my hand / on my floorplan / at a bank / repo not re-titled; only "in my hand" is one tap, the rest set a release lead time or lock the listing) → **condition pass** (three drive states, defect line, recon frozen) → **"The least you'll walk away with"** with, beside it: what you owe and when, the condition-adjusted band labelled "what the lane would pay", days-on-lot with the holding cost at his rate, and **you get / you bring**, live. No cost basis. The holding line is the thing that moves him: a floor at MMR sells 7.8 of 8; MMR+$800 sells 6.5 and burns $245 a week per miss. |
| 4 | Payout at title filing. | Circular for any floored car: the dealer can't file until the lender releases, the lender releases on payoff, payoff needs the money. A week of $5,500 float per car. | **Payout on cleared funds**, the day the buyer's money settles; the floorplan payoff goes **to the lender first, direct**; the dealer's net follows. A per-car remittance PDF for the lender. |
| 5 | Win → ID, Sign, Plates. | Texas registration needs proof of insurance (the Desk already asks the dealer; the buyer side had nothing); the payer and the buyer are often different people (Mr Tran, Dani's mother); an out-of-state licence cannot get Texas plates; "Plates" is false when the title is at a lender. | **Who is the car for?** before ID; then **ID · Insure · Sign · Plates**; Plates stays grey until ID passes and the title chip is "in hand"; a non-Texas licence turns the tile into **Title** ("handed to you at pickup"). Launch Texas-licence buyers only, said on the first bid. |
| 6 | Money, once (Apple Pay). | Issuer debit limits ($2,000 to $3,000 a day) decline any balance over that; a card paid in the app and disputed after pickup is a lost chargeback. | Apple Pay is for the deposit only. The balance is **ACH, wire, or cash/cashier's check at the dealer's counter**, chosen on Won with its settle date shown; the pickup QR turns green on settlement, never on the tap. Over $10,000 cash the Desk files Form 8300. |
| 7 | Outbid = silence, everywhere. | Silence in the app at close means a rejected bid, a declined deposit or a county kickback look like theft; a push outage at soft close with nothing in-app is a refund fight. | Silence is the **push** rule only. In the app the lot streams from the Durable Object; the last ten minutes show inline; the thump fires on the server ack. The only sentences in the app are **failure stamps on the object**, server-timed: "Closed 0.4 s before your bid." |
| 8 | Soft close, two minutes. | A ring that refills reads as the dealer cheating. | Fixed two minutes, identical every time; the ring changes to blue with one refill motion; a one-time animated overlay the first time a user sees it; push copy carries "2:00 left". |
| 9 | Sold → open the sale. | The winner goes silent; the dealer sells it to a Friday walk-in; his own Marketplace listing is still up; Reach posts but cannot retract. | The Sold screen prints the buyer's deadline in big type ("Jasmine has until Sat 8:14 pm to pay; until then the car is hers"). At expiry: deposit forfeits to the dealer, the under-bidder gets a 12-hour second-chance offer at their max, Reach re-posts. Let It Go shows the dealer's own live Marketplace listing with a tap to end it. Opening Handle A Sale on a VIN in a live auction blocks until the lot is pulled; a pull at or above floor costs the dealer a fee on the lane's scale, paid to the winner. |
| 10 | Nothing for fraud. | Shills, serial winners, stolen cards, washed titles, rollbacks, wrong-car photos, curbstoners, cloned listings, minors. | **ID and DOB scan before the first bid** (two screens, once); a first account leads at most two lots; NMVTIS and TxDMV title check at Go; odometer compared with every prior reading, a lower number blocks; VIN-plate photo OCR must match; in-app capture only, geotagged to the licensed lot; the buyer scans the VIN at pickup; sellers only from the TxDMV list, verified by the licence's phone on file, rechecked monthly; photos watermarked with the lot code; every post says the only place to bid is the app. |
| 11 | Nothing for the 9pm call. | The car dies on I-35 at 8:50 pm and the number in the app is ours. | A named after-hours line on the pickup screen (the dealer's for his car, ours for the app) and a roadside partner ($69 tow to the lot within 50 miles). |
| 12 | Dealer name hidden until the win. | TxDMV advertising rules and the brokering file both turn on who is selling. | The dealer's legal name and GDN on every lot screen and every Reach post; one sales price on every document; the Buyers Guide photographed on the glass before Go; pickup locked to an address on the dealer's licence record. |

Smaller, kept: the condition pass is the dealer's timestamped signed statement in the dealer's words ("the dealer says: starts and drives on Oct 12"), with the Desk's service notes shown at Let It Go and a forced "anything a buyer should know?"; a weekday-afternoon close by default; a lux check on dusk photos; the pilot is ten cars, not five, so one no-pay reads as 10%.

---

## 3. The front end, settled

This is the part the owner cares about. The doctrine holds: a price, a time, a name, one verb. The simulations found seven places where a user had to read, and kept four of them because the law or the money requires it: the three documents (gated by scroll-to-end, the buyer's own fields highlighted, one signature reused with consent), the deposit terms line inside the Apple Pay sheet, the plates mailing address, and failure stamps. Everything else is a number, a ring, a tile or a gesture.

### 3.1 The buyer's screens

| Screen | On the glass | Gesture | Borrowed from | Fires |
| --- | --- | --- | --- | --- |
| **Lane** | Full-bleed photo; **bid** and **total** stacked (2:1); the time ring; Bid and Retail bars; dealer name and city, small. | Swipe up: next car. Tap: next angle. Hold: engine audio. Drag the price up: arms a bid. Long-press the ring: time spoken. | TikTok paging; Stories tap-to-advance. | Snap: soft air + selection tick. Hold: haptic follows the recorded idle. |
| **Car** | Twelve photos, the walkaround, the six-dot grade, odometer, VIN last six, title chip (in hand / at lender), Buyers Guide chip. | Sheet drag (three detents). Tap the badge: six dots become six words. | Maps sheet; Photos grid. | Badge expand: six light impacts, 60 ms stagger. |
| **First bid** | Licence scan (silhouette, five confirm chips, "That's me") → Apple Pay sheet ($250, "refunded if you lose"). Two screens, once, ever. | Point. Tap. Face ID. | Wallet add-a-card; Apple Pay. | Each confirm: light impact. Apple's tick. |
| **Bid sheet** | The bid, the total, the increment, a second wheel labelled by its value ("up to $5,600"), one button: **Bid**; the deposit chip, hollow. | Drag to roll by increments; the drag only arms; the button bids; over 2× asks a 600 ms hold that fills the button. | Picker wheel; Apple Pay's single button. | Tick + light impact per increment; on server ack: price punches 1.06×, deep thud, one heavy impact. Rejected at close: price rolls back, warning haptic, one stamp. |
| **Last two minutes** | Ring blue; refills on each bid; inline state ("not yours") with no words. | Same. | Activity ring. | Medium impact per pulse. The first time, a 1.2 s animated overlay. |
| **Won** | Flash, confetti, then **Who is it for?** (me / someone else), then four tiles: **ID · Insure · Sign · Plates** (or **Title**). Bid and total above. | Tap tiles in order; the next lifts 4 pt. | Apple Pay success; Wallet card fan. | 200 ms hold, flash, chime (C–E), success notification, one heavy. Each tile: check draws on, ding, light. |
| **Pay** | Three chips with dates: **ACH (clears Thu) · Wire (today) · Cash at the lot**. | Tap one. | Settings list. | Selection tick. |
| **Pickup** | Map pin at the licensed lot, the window wheel, the after-hours line, the QR (a Wallet pass). At the lot: scan the VIN, start the car, the QR turns green. | Tap pin; pick a slot; scan. | Maps card; Calendar wheel; Wallet pass. | Slot: tick. Arrival geofence: heartbeat. Green: success. |
| **Plates** | One ring, three ticks: Filed · Approved · Mailed. | Pull to refresh. | Find My progress ring. | Each tick: ding + light; Mailed: heartbeat ×2. County kickback: ring amber, "Dealer fixing". |
| **Watching** | A column of rings, price under each. | Tap; swipe to unwatch. | Mail swipe; Activity rings. | Return after 24 h: the first ring spins in with heartbeat ×2 before anything loads. |
| **Me** | Name, the standing $250 chip, cars won as passes, "Sell it back here", sign out. | Tap. | Settings. | Nothing; the neutral screen. |

### 3.2 The dealer's screens (in the Desk)

| Screen | On the glass |
| --- | --- |
| **Let It Go** | The days-on-lot ring (amber past his day count) beside one button. Greyed with "Title first" when the record has no clear title. Shows his own live Marketplace listing with a tap to end it. |
| **Where is the title?** | Four chips. "In my hand" continues; a lender sets a release lead time once; "repo" opens the checklist and locks the listing. |
| **Show It** | Twelve silhouettes (odometer, VIN plate, undercarriage mandatory), the walkaround, engine audio, the Buyers Guide photographed on the glass; six condition rows, drive has three states, a defect line; the dealer's name on the statement. Dusk photos pulse for a morning reshoot. Recon freezes on Go. |
| **Floor** | "The least you'll walk away with." Beside it, in order: what you owe and when; the condition-adjusted band ("what the lane would pay"); days-on-lot with the holding cost; **you get / you bring**, live. Net below payoff asks "You'll bring $70. OK?" |
| **How Long** | 3 · 7 · 10, default 7; the close defaults to a weekday afternoon; a lender lead time that doesn't fit refuses 7 and offers 3. |
| **Live** | Ring, high bid, bid count, watching count, the floor as a faint line. Long-press the floor to lower it. No bids and many watchers means price; no watchers means reach. |
| **Sold** | The hammer lands; the buyer's name; **their deadline in big type**; the payout chip with its settle date; one button: Open the sale. At expiry: Relist, forfeit, second-chance offer, re-post. |

### 3.3 The Lego pieces, final list

| Decision | Piece A next to piece B | The move the user makes alone |
| --- | --- | --- |
| Is this a deal? | Bid bar · Retail bar | "I'm under retail." |
| What will I pay? | Bid · Total (2:1, stacked) | "The small number is mine." |
| Bid now? | Ring (ice) · Ring (blue, last two minutes) | "Blue means it's ending." |
| Is my money gone? | Hollow chip (held) · Filled chip (paid) | "Hollow is still mine." |
| What next after winning? | Four tiles, the next one lifted | "Do the lifted one." |
| Dealer: where to set the floor | Holding cost line · Wholesale band | "Every week I wait costs more than the floor earns." |
| Dealer: no bids on day 5 | Watching count · Floor line | "They're looking and not bidding: it's the price." |

### 3.4 The three scripts

**First bid (Marisol, iPhone SE, bus).** 0.0 s Lane, Altima, $4,900 / $5,520 stacked, ring 60%. 0.3 s thumb on the price; it lifts 2 pt. 0.5–1.4 s drag; +$100 per 28 pt; tick + light impact per step. 1.4 s release at $5,100; the Bid sheet springs to 40%; $5,747 rolls in under the bid. 1.8 s tap Bid. 1.85 s licence scan (first time only), then the Apple Pay sheet: "$250 · refunded if you lose". 3.2 s Touch ID; Apple's tick. 3.5 s on the server ack: the price punches, deep thud, one heavy; the hollow chip lands. 4.0 s the sheet drops to a peek; no toast, no text.

**Win to plates (Darnell, Pixel, Oklahoma licence).** 0.0 s ring closes. 0.2 s flash, chime, success haptic, confetti; the card flips, four tiles slide in with a 60 ms stagger. "Who is it for?" Me. ID: glare, the silhouette tilts; five chips; "That's me"; the state chip reads OK and the fourth tile relabels itself **Title** with a selection tick. Insure: VIN pre-filled, a photo of the card. Sign: Buyers Guide, bill of sale, title assignment; scroll-to-end unlocks the pad (medium impact); one signature reused twice with a tap. Pay: Wire (today). Pickup: pin, "Sat 10–2", QR in Google Wallet. At the lot: VIN scanned, engine started, QR green. Title handed over; "Plates come from Oklahoma" is the one sentence, on the Title tile.

**Let It Go (Lupe, 6:40 pm on the lot).** 0.2 s tap; the button sinks; the days ring unwinds in 0.6 s with a whoosh. Where is the title? In my hand. Show It: nine photos exist from the posting flow; three silhouettes pulse; the odometer shot is read and compared; six rows, drive = "drives", A/C = "fair"; the Buyers Guide hung on the glass and photographed; the statement signs with her name. Floor: "The least you'll walk away with": the band $3,100–$3,600, 74 days at $35 = $2,590 drawn as a line, she types 3,400; "you get $3,400, hammer $3,599". How Long: 7, closes Tuesday 3 pm. Go: `feel.done`; Reach's chips fill; nothing sells yet, so no coin.

### 3.5 The five hardest problems, solved
1. **The hammer is not the price** → two stacked numbers everywhere, same typeface, 2:1.
2. **The soft close looks like cheating** → fixed two minutes, one colour, one motion, one-time overlay, push says "2:00 left".
3. **Silence hides failure** → silence is push-only; in-app state streams; failures are server-stamped lines on the object, never modals.
4. **Drag-to-bid is dangerous and inaccessible** → drag arms, button bids; VoiceOver gets the adjustable trait and double-tap-and-hold; over 2× asks a 600 ms hold; three-finger paging with VoiceOver on.
5. **Legally required reads in a wordless app** → keep them, make them the one slow moment (like the Apple Pay sheet), highlight the buyer's fields, reuse the signature, hang the physical Buyers Guide at pickup.

---

## 4. The engine changes the simulations demand

- Auction Durable Object: idempotency keys per bid; bid and new close time written in one transaction before the ack; close is an alarm plus a read-time check; D1 is a copy compared nightly; the thump fires on the ack.
- Deposit: Stripe captured charge, standing per buyer; forfeiture and second-chance flows; Form 8300 trigger in the Desk.
- Title gate: title location, lender lead time, NMVTIS and TxDMV title check, odometer history comparison, VIN-plate OCR.
- Payout: cleared-funds release, lender-first split, remittance PDF.
- Out-of-state: Texas-licence buyers only until the out-of-state packet (Form 14-312, buyer's tag, title assignment) exists.
- Desk: Handle A Sale blocked on a VIN in a live lot; "Did they show proof of insurance?" and "Where does the inspection stand?" answered from the buyer's tiles; the 130-U seller line carries the agent at filing (already true).

---

## 5. Counsel, in priority order
1. Does 43 TAC §215.85 reach a live bidding platform at all; is a flat subscription with no per-car money inside §215.85(b)? (We do not depend on it, but the answer sets the public-launch date.)
2. Obavia's GDN: Independent, Wholesale Auction, or both; what premises satisfies §503.032 for an online operation; VIT treatment when title does not pass to Obavia on a consignment.
3. Deposit custody: Stripe Connect with the dealer as payee under Finance Code §152.004(2); a forfeited deposit as liquidated damages, not an unconscionable practice.
4. "Starts at pickup, or no sale" as a condition of completion, not a warranty; the dealer-elected 48-hour option's Buyers Guide wording and Magnuson-Moss.
5. The six-tap condition statement: wording and records that keep it the dealer's statement under DTPA §17.46(b).
6. The Used Car Rule online: who the "auction company" is, display before bidding, the Spanish Guide when the interface is Spanish.
7. Advertising under 43 TAC Subchapter F: dealer identification on lot screens and posts; the Retail bar as a price representation; "No dealer licence" as a claim.
8. Sales tax base if any buyer-side fee ever exists (none planned).
9. Out-of-state buyers: Form 14-312, the buyer's tag, title hand-over.
10. Apple App Review: merchant of record; guideline 3.1.3(e) for a captured deposit.

## 6. Facts the simulations flagged as unverified
Stripe's authorisation lifetime and extended-auth eligibility (decides hold vs capture); issuer daily debit limits; Harris County's emissions window at dealer registration; the repossession affidavit path inside webDEALER; current Manheim fee sheet and floorplan payoff terms; Copart's deposit rule and the BaT / Cars & Bids fee caps; the federal odometer penalty; whether a typed-name signature satisfies TxDMV on the 130-U for VoiceOver users; the hammer distribution (assumed 1.20×MMR centre; the first ten pilot cars will measure it).

## 7. What the owner still decides
Nothing in the four questions. Two things remain his: the ten Triple J cars and their floors for the pilot, and the new repository name.
