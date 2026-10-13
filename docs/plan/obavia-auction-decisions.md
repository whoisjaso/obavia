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
   - **Amended 2026-10-13 by D1 and D2 (§9).** Another dealer's car reaches an Obavia-GDN lane only as a title-assigned purchase: the dealer assigns title to Obavia (dealer-to-dealer, no tax under Tax Code §152.001(2)(B)) and Obavia resells. Consignment is off: title must pass to the selling dealer before the buyer (Transp. Code §503.039(a), read 2026-10-13), a GDN holder may not sell another GDN holder's car at a public auction (43 TAC §215.144(i)(3), read 2026-10-12), and a consignment location needs its own GDN (43 TAC §215.133(a), read 2026-10-13). When Obavia is the seller, title reaches the buyer before the 21st day after the sale (§503.039(b), read 2026-10-13). Still held for counsel question 11.
   - **Amended 2026-10-13 by D3 (§9).** Counsel question 12 (the licensed-auctioneer path, §503.024(d), read 2026-10-13) decides whether Phase 3 files for this GDN or for a TDLR auctioneer licence. Nothing is built on the auctioneer path until counsel answers.
3. Never ship "software with a success fee" for a day. Counsel question 1 (below) is whether even a flat subscription is safe for a live bidding platform; we do not depend on the answer.

---

## 1. The four answers

| Question | Answer | Why, from the collisions |
| --- | --- | --- |
| **Structure** | Pilot on Triple J's GDN, fee-free; file for Obavia's own GDN now; ~~other dealers join under it~~ (superseded 2026-10-13 by D1, Transp. Code §503.039(a) and 43 TAC §215.144(i)(3): other dealers' cars sell only by title assignment to Obavia, held for counsel question 11). | Counsel's §215.85 reading removes "A with any per-car money". The buyer run showed A is also a worse product (the buyer's remedy is a one-man lot at 2am; "Obavia took my money" with no Obavia refund). The dealer run showed B is where the dealer's own benefit is (a sale to Obavia is dealer-to-dealer, off his VIT statement, the public-sale complaints ours). Money and fraud preferred A only for liability placement, which the pilot already gives us because the pilot dealer is us. |
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
| 5 | Win → ID, Sign, Plates. | Texas registration needs proof of insurance (the Desk already asks the dealer; the buyer side had nothing); the payer and the buyer are often different people (Mr Tran, Dani's mother); an out-of-state licence cannot get Texas plates; "Plates" is false when the title is at a lender. | **Who is the car for?** before ID; then **ID · Insure · Sign · Plates**; Plates stays grey until ID passes and the title chip is "in hand"; a non-Texas licence turns the tile into **Title** ("handed to you at pickup"). Launch Texas-licence buyers only, said on the first bid. **2026-10-13, D8 and D9 (§9):** a Texas buyer signs the 130-U and the odometer disclosure through the webDEALER Buyer Acknowledgment (Texas DL/ID, last four of the SSN, audit number), not a drawn signature; the drawn signature stays on the bill of sale and the Buyers Guide (Bus. & Com. Code §322.007). An out-of-state buyer signs paper: assigned title handed over or filed within 30 days (43 TAC §215.144(g)), Form 14-312 at sale (Tax Code §152.092), the green 60-day out-of-state plate. |
| 6 | Money, once (Apple Pay). | Issuer debit limits ($2,000 to $3,000 a day) decline any balance over that; a card paid in the app and disputed after pickup is a lost chargeback. | Apple Pay is for the deposit only. The balance is **ACH, wire, or cash/cashier's check at the dealer's counter**, chosen on Won with its settle date shown; the pickup QR turns green on settlement, never on the tap. Over $10,000 cash the Desk files Form 8300. |
| 7 | Outbid = silence, everywhere. | Silence in the app at close means a rejected bid, a declined deposit or a county kickback look like theft; a push outage at soft close with nothing in-app is a refund fight. | Silence is the **push** rule only. In the app the lot streams from the Durable Object; the last ten minutes show inline; the thump fires on the server ack. The only sentences in the app are **failure stamps on the object**, server-timed: "Closed 0.4 s before your bid." |
| 8 | Soft close, two minutes. | A ring that refills reads as the dealer cheating. | Fixed two minutes, identical every time; the ring changes to blue with one refill motion; a one-time animated overlay the first time a user sees it; push copy carries "2:00 left". |
| 9 | Sold → open the sale. | The winner goes silent; the dealer sells it to a Friday walk-in; his own Marketplace listing is still up; Reach posts but cannot retract. | The Sold screen prints the buyer's deadline in big type ("Jasmine has until Sat 8:14 pm to pay; until then the car is hers"). At expiry: deposit forfeits to the dealer, the under-bidder gets a 12-hour second-chance offer at their max, Reach re-posts. Let It Go shows the dealer's own live Marketplace listing with a tap to end it. Opening Handle A Sale on a VIN in a live auction blocks until the lot is pulled; a pull at or above floor costs the dealer a fee on the lane's scale, paid to the winner. **2026-10-13, D14 (§9):** Reach posts to Marketplace as a person or as an Automotive Inventory Ad, never from a business Page. |
| 10 | Nothing for fraud. | Shills, serial winners, stolen cards, washed titles, rollbacks, wrong-car photos, curbstoners, cloned listings, minors. | **ID and DOB scan before the first bid** (two screens, once); a first account leads at most two lots; NMVTIS and TxDMV title check at Go; odometer compared with every prior reading, a lower number blocks; VIN-plate photo OCR must match; in-app capture only, geotagged to the licensed lot; the buyer scans the VIN at pickup; sellers only from the TxDMV list, verified by the licence's phone on file, rechecked monthly; photos watermarked with the lot code; every post says the only place to bid is the app. **2026-10-13, D11 and D15 (§9):** a bidder who shares the seller's phone, address, payment instrument or device is blocked and the check is logged (Bus. & Com. Code §2.328(d)); a buyer wins at most four cars in a calendar year (Transp. Code §503.024(a)(1)). |
| 11 | Nothing for the 9pm call. | The car dies on I-35 at 8:50 pm and the number in the app is ours. | A named after-hours line on the pickup screen (the dealer's for his car, ours for the app) and a roadside partner ($69 tow to the lot within 50 miles). |
| 12 | Dealer name hidden until the win. | TxDMV advertising rules and the brokering file both turn on who is selling. | The dealer's legal name and GDN on every lot screen and every Reach post; one sales price on every document; the Buyers Guide photographed on the glass before Go; pickup locked to an address on the dealer's licence record. **2026-10-13, D12 (§9):** every lot screen and post also says "used", names the Retail bar's source, uses "auction" only for the bona fide auction, and never says "price reduction" (43 TAC §215.242, .244, .250, .254, .271). |

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
- Out-of-state: Texas-licence buyers only until the out-of-state packet (Form 14-312, ~~buyer's tag~~ (superseded 2026-10-13 by D9, Transp. Code §503.063 as amended by HB 718, eff. 7/1/2025: paper tags ended; the dealer issues the green out-of-state plate, 60 days, no fee), title assignment) exists. The packet is paper: no webDEALER Buyer Acknowledgment without a Texas DL/ID (D9).
- Sign (D8): the Texas buyer's Sign tile hands the buyer to the webDEALER Buyer Acknowledgment for the 130-U and the odometer disclosure; the drawn signature is kept for the bill of sale and the Buyers Guide only.
- Auction terms (D10), stated once inside the first-bid terms read that already exists (§3), no new read: "with reserve unless marked no reserve"; "neither the seller nor Obavia bids"; "bids are irrevocable"; "the sale completes at the VIN scan and engine start" (Bus. & Com. Code §2.328(b), (c), (d); Transp. Code §501.0234(f)). Wording to counsel with question 4.
- Shill block (D11): the Worker refuses a bid from a buyer whose phone, address, payment instrument or device matches the seller's, and logs the check per lot.
- Win cap (D15): the Worker refuses a fifth win in a calendar year for one buyer.
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
11. (raised in §8.1; restated 2026-10-13) Is the lane a "public motor vehicle auction"; does a title-assigned purchase (b') satisfy 43 TAC §215.144(i)(3) and Transp. Code §503.039(a); is the 21-day clock in §503.039(b) the one that binds, for Obavia's GDN and for Triple J selling its own cars on the lane. (`research/public-auction-model.md` §1, §7.)
12. The licensed-auctioneer path: §503.024(d) for an online lane whose car is at the dealer's GDN location; the internet exemption in Occ. Code §1802.002(a)(14) versus "licensed auctioneer"; whether §215.85 reaches a TDLR auctioneer's commission; §503.024(b)(1)(B) for the individuals' lane; which Obavia person would hold the licence. The answer decides whether Phase 3 files for a GDN or a TDLR licence.
13. §215.133(a) consignment-location GDN for cars that stay on a partner dealer's lot under (b) or (b'); §503.038(a)(5) and (11) as cancellation risk.
14. Arbitration: FAA versus Civ. Prac. & Rem. Code §171.002(a)(2), (b) for a sub-$50,000 consumer purchase; DTPA §17.42; the clause's reach to the dealer; whether a Texas car sold to a Texas buyer and paid on Whop is "interstate commerce".
15. Copart's Texas clean-title broker rule: is there a TxDMV position that an online auction may not sell clean-title cars to the public (Occ. Code ch. 2302 text not retrieved, UNVERIFIED).

Questions 11 to 15 go with the Phase 1 engagement; sent by Fri Oct 16, 2026 (growth plan §2.1). Sub-question to 4, added 2026-10-13 (D10): does "bids are irrevocable" survive Bus. & Com. Code §2.328(c) as a term of the auction.

## 6. Facts the simulations flagged as unverified
Stripe's authorisation lifetime and extended-auth eligibility (decides hold vs capture); issuer daily debit limits; Harris County's emissions window at dealer registration; the repossession affidavit path inside webDEALER; current Manheim fee sheet and floorplan payoff terms; Copart's deposit rule and the BaT / Cars & Bids fee caps; the federal odometer penalty; ~~whether a typed-name signature satisfies TxDMV on the 130-U for VoiceOver users~~ (answered 2026-10-13 by D8: inside webDEALER the Buyer Acknowledgment replaces the buyer's signature; webDEALER Dealer User Guide, July 2026, pp. 8-9, Appendix 2); whether a county accepts a drawn electronic signature on an uploaded 130-U outside the Buyer Acknowledgment (UNVERIFIED); the hammer distribution (assumed 1.20×MMR centre; the first ten pilot cars will measure it).

## 7. What the owner still decides
Nothing in the four questions. Two things remain his: the ten Triple J cars and their floors for the pilot, and the new repository name.

Added 2026-10-13: the pay window stays open for the owner until Fri Oct 30, 2026. §1 Deposit says forfeiture at 72 hours after close; the Worker (`auction/worker/src/auction.ts` line 18, `PAY_WINDOW_MS = 48 * 3_600_000`), phases Phase 1 and `collateral.md` §2 say 48 hours. Neither line is struck: no statute decides it. Growth plan §5 (2026-10-12 row) still reads "The owner resolves it by Fri Oct 16 or 48 hours stands"; until that row is amended, 48 hours is what runs.

---

## 8. Decisions forced by sourced facts (researcher-architect, 2026-10-12)

Each line below names the fact, its source and the research file that holds the quote. None of them changes the four answers in §1. They change how those answers are carried out.

1. **Other dealers cannot simply "join under" Obavia's GDN on a public lane.** 43 TAC §215.144(i)(3), effective 7/1/2025: "A GDN holder may not sell another GDN holder's vehicle at a public motor vehicle auction." (https://www.law.cornell.edu/regulations/texas/43-Tex-Admin-Code-SS-215.144, checked 2026-10-12; `research/texas-rules.md`.) §0 step 2 ("Open to other dealers only when it is granted") is held until counsel answers a new question 11: is the lane a "public motor vehicle auction", ~~and does a title-assigned consignment under §215.144(h) or a Wholesale Motor Vehicle Auction GDN change the answer?~~ (superseded 2026-10-13 by D1: consignment is off under Transp. Code §503.039(a) and 43 TAC §215.133(a); the Wholesale Motor Vehicle Auction GDN sells to dealers only, §503.001(16) and §503.022; question 11 in §5 now asks whether a title-assigned purchase (b') cures it) The pilot (Triple J's own cars) is unaffected.
2. **The deposit reserve is topped up, not assumed.** Whop charges 2.7% + $0.30 on capture and keeps it on refund ("you pay back the full amount they originally paid, even though fees reduced the amount you received", https://docs.whop.com/manage-your-business/manage-payments/issuing-refunds, checked 2026-10-12; `research/whop.md`). A $250 deposit lands as $242.95. Obavia adds $7.05 from its own funds at capture so the reserve ratio is 1.00. `GET /admin/exposure` reports the balance net of any Whop reserve hold (https://docs.whop.com/trust-and-safety/account-health/reserves).
3. **No refund promise past seven days until it is proven.** Whop publishes no age limit for `POST /payments/{id}/refund`. The automatic release after seven days with no live bid (§1) stays the default. No copy promises a refund at a later age until a sandbox refund of a payment older than 30 days succeeds (`research/whop.md`).
4. **The Floor screen shows no wholesale band until the lane has ten started cars.** No public wholesale-to-retail spread source exists, and §215.85(b)(5) treats a suggested price as broker conduct (`research/wholesale-band.md`). After ten cars, the band is the lane's own observed range, with the count and the dates. This amends §2 row 3 and §3.2 Floor.
5. **The holding line uses the car's value, not $35.** The defensible marginal cost is floorplan cost plus value loss, about 0.1% of the car's value per day (AFC all-in floorplan yield 18.1% in 2025, OPENLANE 10-K; Manheim non-adjusted −1.3% Aug→Sep 2026, Cox Automotive; `research/holding-cost.md`). On the §3.4 Lupe car that is about $3 a day, not $35. The dealer's own figure still replaces it. This amends §2 row 3 and §3.4.
6. **Fees in the out-the-door total follow the buyer's county.** Title is $33 in nonattainment or affected counties and $28 elsewhere (Transp. Code §501.138). Registration is $64.00–$98.25 by county (TxDMV), not $75. Until per-county values exist, the total uses $98.25 for registration and labels it "estimate" (`research/texas-rules.md`). **Amended 2026-10-13 by D6 (§9):** the total also carries the $10 dealer-issued metal plate fee, labelled ("You cannot charge more than $10", TxDMV HB 718 Dealer FAQ, March 2025, read 2026-10-13); the $20 database fee (Transp. Code §503.0631(f)) appears only if the dealer charges it.
7. **The title deadline is cited to the rule.** The 30 days (45 days dealer-financed) comes from 43 TAC §215.144(f)(3) under Transp. Code §501.0234(f). The statute itself states no day count (`research/texas-rules.md`). **Amended 2026-10-13 by D2 (§9):** when a GDN holder sells at a public auction, Transp. Code §503.039(b) does state one: title to the buyer "before the 21st day after the date of the sale" (read 2026-10-13). On an Obavia-GDN lane 21 days binds. Mirror reading, conservative: the statute's words reach any GDN holder selling at a public auction, so the Desk and the app use 21 days on every lane sale, the pilot included, until counsel answers question 11. The 30 days stays for Triple J's sales off the lane.
9. **Tax remittance date (D7, §9).** The Desk uses the earlier of 20 working days after delivery (Tax Code §152.041(c), read 2026-10-13) and 30 calendar days (Comptroller 96-254, dealers page, 3/2026, read 2026-10-13) and flags at day 15. Which date the county enforces is UNVERIFIED.
8. **Form 8300 counts cashier's checks.** In a car sale, cashier's checks and money orders of $10,000 or less count as cash (IRS Form 8300 reference guide). The Desk's trigger in §2 row 6 includes them (`research/texas-rules.md`).

---

## 9. Decisions from the public-auction research (mirror, 2026-10-13)

Lifted from `research/public-auction-model.md` §7 (researcher-architect, read 2026-10-12 and 2026-10-13). Nothing in §0 to §8 is reopened. A line the research supersedes with a statute is struck in place with the date and the section; every other line stands and carries a pointer here. Three statutes box the plan: Transp. Code §503.039(a), 43 TAC §215.144(i)(3), 43 TAC §215.133(a).

| # | Decision | Lands in | Source, date read | Counsel |
| --- | --- | --- | --- | --- |
| D1 | Another dealer's car sells on an Obavia-GDN lane only as a title-assigned purchase (b'): the dealer assigns title to Obavia (dealer-to-dealer, no tax), Obavia resells. Consignment (b) is off. | §0 step 2; §1 Structure (struck); §8.1 (struck) | Transp. Code §503.039(a), 2026-10-13; 43 TAC §215.144(i)(3), 2026-10-12; Tax Code §152.001(2)(B), 2026-10-13 | Q11 |
| D2 | When Obavia is the seller, title reaches the buyer before the 21st day after the sale, not 30. | §0 step 2; §8.7 | Transp. Code §503.039(b), 2026-10-13 | Q11 |
| D3 | The licensed-auctioneer path goes to counsel now; nothing is built on it. If it holds, Obavia's fee is an auctioneer's commission, the dealer stays seller of record, no VIT, no title duty. | §0 step 2 | Transp. Code §503.024(d), 2026-10-13; Occ. Code §1802.002(a)(14), 2026-10-12; 43 TAC §215.85, 2026-10-12 | Q12 |
| D4 | No (b) or (b') car sits on a lot other than Obavia's licensed premises until counsel answers. | §0 step 2 | 43 TAC §215.133(a), 2026-10-13; Transp. Code §503.038(a)(5), (11), 2026-10-13 | Q13 |
| D5 | In the pilot and under structure (a) the dealer is payee of price and tax; Obavia touches only the refundable deposit. | §1 Fee and Deposit (unchanged, confirmed) | Tax Code §152.0411, 2026-10-13; §152.063(g), 2026-10-13; 43 TAC §215.85(a), 2026-10-12 | Q3 |
| D6 | The out-the-door total carries the $10 dealer-issued metal plate fee, labelled; the $20 database fee only if the dealer charges it. | §8.6 | TxDMV HB 718 Dealer FAQ (March 2025), 2026-10-13; Transp. Code §503.0631(f), 2026-10-13 | none |
| D7 | Tax remittance in the Desk: earlier of 20 working days and 30 calendar days; flag at day 15. | §8 item 9 | Tax Code §152.041(c), 2026-10-13; Comptroller 96-254 dealers page (3/2026), 2026-10-13 | none |
| D8 | A Texas buyer's 130-U and odometer signature is the webDEALER Buyer Acknowledgment; the drawn signature stays on the bill of sale and the Buyers Guide acknowledgement. | §2 row 5; §4; §6 | webDEALER Dealer User Guide (July 2026) pp. 8-9, App. 2, 2026-10-13; Bus. & Com. Code §322.007, §322.009, 2026-10-12/13; 49 CFR 580.5, 580.6, 2026-10-12/13 | none (county acceptance of e-signed uploads UNVERIFIED) |
| D9 | Out-of-state buyers: paper packet (assigned title or filing within 30 days, Form 14-312 at sale, green 60-day plate with no fee, §503.063(i) inspection exemption); no Buyer Acknowledgment; launch stays Texas-licence only. | §2 row 5; §4 (buyer's tag struck) | 43 TAC §215.144(g), 2026-10-13; Tax Code §152.092, 2026-10-13; Transp. Code §503.063, 2026-10-13; TxDMV Dealer Reference Brochure and Plate Issuance Guidelines, 2026-10-13 | Q9 |
| D10 | The app states four auction terms once: with reserve unless marked; neither the seller nor Obavia bids; bids are irrevocable; the sale completes at the VIN scan and engine start. | §4 | Bus. & Com. Code §2.328(b), (c), (d), 2026-10-13; Transp. Code §501.0234(f), 2026-10-13 | Q4, with the "no retraction" sub-question |
| D11 | Shill block: a bidder sharing the seller's phone, address, payment instrument or device is refused; the check is logged. | §2 row 10; §4 | Bus. & Com. Code §2.328(d), 2026-10-13; DTPA §17.46(b)(5), 2026-10-13 | none |
| D12 | Advertising lines: "used", the dealer's legal name and GDN, the Retail bar's source, "auction" only for the bona fide auction, no "price reduction". | §2 row 12 | 43 TAC §215.242, .244, .250, .254, .271, 2026-10-13; DTPA §17.46(b)(11), 2026-10-13 | Q7 |
| D13 | Arbitration: FAA-governed clause naming Obavia and the dealer; no DTPA waiver; small-claims carve-out; shown once, scroll-to-end. | §5 Q14; phases Phase 1 Legal ("arbitration terms drafted") | In re FirstMerit Bank (Tex. 2001), 2026-10-13; Civ. Prac. & Rem. Code §171.002(a)(2), (b), 2026-10-13; DTPA §17.42, 2026-10-13 | Q14 |
| D14 | Reach posts to Marketplace as a person or as an Automotive Inventory Ad, never from a business Page. | §2 row 9 | Meta change of 2023-01-30, third-party reporting, 2026-10-13 (UNVERIFIED on Meta's own page) | none |
| D15 | A buyer wins at most four cars in a calendar year on the lane. | §2 row 10; §4 | Transp. Code §503.024(a)(1), 2026-10-13 | none |

Open for the owner, not decided here: the pay window (48 h or 72 h), until Fri Oct 30, 2026 (§7).
