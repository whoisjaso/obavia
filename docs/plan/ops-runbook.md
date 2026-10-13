# The ops runbook: the ten-car pilot

Written October 13, 2026 by logistics, for Phase 1 Ops (`obavia-auction-phases.md`: "Runbook: the 9 pm texts (sim 06), a late bid, a county kickback, a no-show; one phone number; exit: the runbook covers every failure the simulations found"). It is for the desk person at Triple J. You do not need to know how the app is built. Every step is one thing to do. Where you speak, the words are written out; say them as written.

Nothing here changes a decision in `obavia-auction-decisions.md`, `collateral.md` or the growth plan. Where the code does not do what a step needs, the step says **Not built** and the item is in the "To build" list at the end with the agent who owns it. Nothing in this file promises a buyer or a dealer anything the code does not do today.

Checked against the code on October 13, 2026: `auction/worker/src/` (the lane), `desk/src/Auction.tsx` and `desk/src/AuctionAdmin.tsx` (the Desk), `auction/src/` (the buyer's app). Some lane work was in progress and not committed that day (sign-in by phone: `auction/worker/src/phone.ts`, migration `0010_buyer_phone.sql`); where a step depends on it, it says so.

---

## 0. Before anything: the five rules

**Rule 1. One phone number.** Every buyer and every text reaches one number: **Triple J's phone as it is set in the Desk** (Desk onboarding, the dealership's phone). The Desk sends that number to the buyer's Pickup screen as the "After hours" line (`desk/src/Auction.tsx`, the call to `carMeta(..., dealer.phone, [])`). A person answers it every hour a lot is live or a sale is open, 9 pm included. Write the names here before Thu Oct 22, the day the first five cars go live:

| | Name | Hours |
| --- | --- | --- |
| Desk person (the owner names them by Fri Oct 16, growth plan §2.1) | | |
| After the desk person's hours | | |
| The owner (money, refunds, counsel) | | |
| Triple J pickup hours (said on every call) | | |
| Callback time for anything passed to the owner | 10 am the next day, unless the owner writes another time here | |

**Rule 2. The same deadline, in the same words, everywhere (CP9).** Read the deadline from the Desk's Sold page, the row **Pay by**. Say it exactly as the Desk prints it, day and time with the minutes: "Saturday at 8:14 pm". Never round it, never say "about two days", never give more time. The pay window is 48 hours from the hammer (`PAY_WINDOW_MS` in `auction/worker/src/auction.ts`). The owner can still change it to 72 hours until Fri Oct 30 (decisions §7); if he does, the Desk will print the new time and you read that.
Known gap: the buyer's app prints the hour without the minutes ("by Sat 8 pm", `auction/src/screens/won/Pay.tsx`), and the "Yours" push carries no deadline at all. Until both are fixed, your words and the Desk's are the true ones. (To build, items 1 and 2.)

**Rule 3. One verb per message.** A text or a call asks for one thing. If there are two things, it is two messages, the second sent after the first is done.

**Rule 4. Never say these, to anyone, ever:**
- "We guarantee", "we'll make it right", "we'll fix it", "it's covered". (No warranty exists. The Buyers Guide says as-is. A promise like this becomes one.)
- "As-is means you have no rights" or "you waived that". (False. A consumer cannot waive the DTPA without their own lawyer, Bus. & Com. Code §17.42.)
- "Obavia inspected it", "the app graded it". (The condition words are the dealer's own statement.)
- "Don't file a complaint" or anything that sounds like it.
- Any refund amount, discount or offer the owner has not written down.
- Anything about what the dealer knew or did not know about the car.
- Any number of days for a refund to reach a card. (The bank decides. Say "your bank decides how fast it shows".)

**Rule 5. Write it down, the same hour.** Two places:
- **The lane's own rows** (the system writes these; you never type them): `money_events` (every Whop payment, refund and dispute, and every forfeited deposit), `bids` (every bid with its time, accepted or not), `bid_refusals` (a bid the lane refused: a seller bidding, a fifth win, a Desk key), `token_refusals` (a sign-in the lane refused), `incidents` (a sale the dealer could not deliver), `reconciliations` (the nightly check).
- **The desk log**: a paper book at the desk until the admin page has a log (To build, item 14). One line per event, these columns: date, time, lot (the car and the Desk's lot page), who called or texted (with the number they called from), what they said in their words, what you said, the one action, the row it made (or "no row"). The number a buyer calls from is the only phone number you may have for them until the Desk shows the winner's number (To build, item 3). Write it down every time.

---

## 1. Every failure the simulations found, and where this runbook answers it

The six simulations are in `docs/plan/sim/` (01 dealer, 02 buyer, 03 fraud, 04 counsel, 05 ops, 06 frontend). "Built" means the code already prevents it and there is nothing for the desk to do beyond the section named.

| Sim | Failure | Answered in |
| --- | --- | --- |
| 05 §2.1, 02 S1 | "do yall take card"; "card declined i have the money" | §2 (texts 5, 6) |
| 05 §2.2, 02 S2 | The deposit hold expires before a 7-day close | Built: the deposit is captured once and stands (decisions §1). Nothing to do |
| 05 §2.3 | The car dies on I-35 two hours after pickup; the 9 pm text | §9 |
| 05 §2.4, 03 §11, 06 §3.3, 04 S6 | An out-of-state winner; "it says plates but im in OK??" | §17 |
| 05 §2.5, 01 S7 | The winner goes silent; the no-pay | §7 |
| 05 §2.6 | The lender asks for a remittance letter | Not in the pilot (Triple J is paid at the lot). Phase 3, payments |
| 05 week 2 | "cash only, and the title isn't in my name for 3 weeks" | §2 (texts 5, 8), §16 |
| 05 week 3 | A 130-U kicked back | §5 |
| 02 S1 | "what does floor mean"; "is that the car or a fee"; "AS IS NO DEALER WARRANTY" | §2 (texts 1, 2, 7) |
| 02 S1 | Insurance card asked for on Monday at 4 pm | §2 (text 9) |
| 02 S1, S5 | The deposit back takes days; "why is my money gone three times" | §2 (text 2). One deposit per buyer is built |
| 02 S2 | "was there shill bidding, I want the bid log" | §4 |
| 02 S2, 01 S3 | The title at a lender or bank; "is this a scam" | §16 |
| 02 S3 | The payer is not the buyer (Mr Tran) | Built: Won asks "Who is it for?" (`auction/src/screens/won/Won.tsx`). §2 (text 2) for the deposit |
| 02 S3, 05 §2.3 | The car will not start at the lot | §8 |
| 02 S4 | "i changed my mind" before pickup | §2 (text 11), §7 |
| 02 S4 | The card is disputed (chargeback) | §18 |
| 02 S5 | Harris County emissions older than 90 days | Paperwork. UNVERIFIED (decisions §6). Not a desk step |
| 02 S6 | Won at 2 am, the dealer never answers | Rule 1. In the pilot the dealer is Triple J and the desk answers |
| 01 S1, S5 | The floor band is for a car that runs; "I said 4400" | Built on Let It Go (title first, condition, "You'll bring $X. OK?"). No fee in the pilot, so the dealer's number is the number |
| 01 S2 | The repo with a stale title | Built: `/open` refuses a title that is not in hand or at a lender (`collateral.md` §2) |
| 01 S4, 03 §12 | The dealer sells the car on the lot mid-auction | §11 |
| 01 S6 | The mechanic works on a listed car | §20 (morning, line 7) |
| 01 S8 | Payout against the floorplan due date | Not in the pilot (paid at the lot). Phase 3, payments |
| 03 §1 | Shill bidding | §11 |
| 03 §2 | The serial winner | Built in part: four wins a year (`WINS_PER_YEAR`, `auction/worker/src/bidders.ts`). The two-lot lead limit for a new account is not built (To build, item 20) |
| 03 §3 | Stolen card, balance chargeback | Built: no card for the balance (Pay offers bank, wire, cash). §18 for a deposit dispute |
| 03 §4, §5 | Washed title; odometer rollback | Not built (NMVTIS, odometer history). Dealers workstream. Not a desk step in the pilot (Triple J's own cars) |
| 03 §6 | The wrong car in the photos; VIN mismatch at pickup | §15 |
| 03 §7 | The part-swapper | Does not arise: there is no 48-hour guarantee (decisions §1) |
| 03 §8 | The unlicensed "dealer" | Does not arise in the pilot (one dealer, Triple J) |
| 03 §9 | The cloned listing on Marketplace | §19 |
| 03 §10 | A buyer under 18 | Built in the app: the licence is read before the first bid |
| 03 §13 | Push outage at the close | §14 |
| 03 §14 | Object and copy disagree | §13 |
| 04 S1 | A letter from TxDMV | §10 |
| 04 S2 | The transmission fails in three days; the DTPA letter | §9 |
| 04 S4 | The car is not on the licensed lot | Rule: the car stays on Triple J's licensed lot until the pass turns green (`collateral.md` §1). §20 (morning, line 7) |
| 04 S6 | The Buyers Guide must be on the car | §20 (morning, line 6) |
| 06 §3.1 | The total under the fold on a small phone | Frontend. Not a desk step |
| 06 §3.2 | "do you guys reset the timer every time" | §2 (text 3), §4 |
| 06 §3.4 | "the app talks but I can't make it go to the next car" (VoiceOver) | §2 (text 12) |
| 06 §3.5 | "my bid went in and you sold it to someone else" | §4 |
| 06 §3.6 | "is it that colour" (dusk photos) | §2 (text 10) |
| Brief | A no-show at pickup | §6 |
| Brief | A lost phone sign-in | §10a |
| Brief | A Whop refund that lands short | §12 |
| Brief | The nightly reconciliation reports a difference | §13 |
| Brief | A county holiday on the tax day | §16a |
| CF9 | The winner call within one hour of Sold | §3 |

---

## 2. The 9 pm texts

**Who notices:** you, on the one number.
**The one number:** Rule 1.
**What the Desk shows:** the car's lot page (`#/auction/<lot id>`, opened from the Desk's Lane list at `#/auction`). The Lane list lives in the browser that let the car go (`lotLinks` in `desk/src/lib/auction.ts`): use that one device for the whole pilot.
**The one action:** answer each text with the one reply below, then write the line in the desk log.
**Where:** your phone. No Desk button.
**Write it down:** desk log. No lane row.

| # | They text (from the simulations) | You reply, word for word |
| --- | --- | --- |
| 1 | "is the price with tax" / "what does floor mean, is 2100 the price or no" | "The big number is the bid. The small number under it is what you pay in total: tax, title, plate and the dealer's fee included." |
| 2 | "it charged me 250 is that the car or a fee" / "why is my money gone three times" | "That is your one $250 deposit. It lets you bid on any car. If you don't win, open Me and tap Get It Back. Your bank decides how fast it shows." |
| 3 | "do you guys reset the timer every time" | "Yes. Every bid in the last two minutes puts the clock back to two minutes, the same for everyone, every time. It ends when two minutes pass with no bid." |
| 4 | "my bid went in and you sold it to someone else" | Go to §4. |
| 5 | "do yall take card" | "The $250 deposit is the only card payment. The rest is cash or a cashier's check at the lot, or a bank transfer or wire that lands before [Pay by]." |
| 6 | "it keeps saying card declined i have the money" | Same as 5. |
| 7 | "it says AS IS NO DEALER WARRANTY does that mean they can sell me a broke car" | "As-is means no warranty after you drive away. Before that, the car has to start at pickup, or there is no sale and your deposit comes back." |
| 8 | "do i have the title or do you" | "The dealer files your title with the county before [the date on the Desk's row Title to the buyer before day 21]. The state mails it to you." |
| 9 | "need your insurance card?" | "Yes. Texas needs proof of insurance to register the car. Bring your insurance card to pickup." (The app's Insure tile does not send the card to the Desk: To build, item 11.) |
| 10 | "is it that colour" | "Come and see it at the lot during [pickup hours]. What the dealer wrote about it is on the car page." |
| 11 | "i changed my mind can i get my money back i didn't even pick it up yet" | "You can choose not to pay. If the balance is not paid by [Pay by], the car goes back to the dealer and the $250 deposit goes to the dealer." |
| 12 | "the app talks but I can't make it go to the next car" | "Thank you for telling us. I've written down which car you want. The owner will call you by [callback time]." (VoiceOver paging is not built: To build, item 18.) |
| 13 | "can I pay Saturday when I get paid" | "You have until [Pay by] to pay. Until then the car is yours." Nothing more. There is no extension. |
| 14 | "yall sold me a car that died in 2 hours, im calling the DMV tomorrow" | Go to §9. |
| 15 | "I sent Marcus the $500 like you said" | Go to §19. |
| 16 | "you took my ten grand and nobody answers" | "This is Triple J. I'm here. Your payment is recorded against the [year make model]. The owner will call you by [callback time]." Then tell the owner tonight. |
| 17 | "I was never told" (outbid at the close, no push) | Go to §14. |
| 18 | "where are my plates" from a buyer with an out-of-state licence | Go to §17. |
| 19 | "This phone lost its sign-in. This phone lost its sign-in. Call (the Desk number)." (the app's line in Me) | Go to §10a. |

---

## 3. The winner call, within one hour of Sold (CF9 setter half)

**Who notices:** you, when a lot's ring closes with bids (the Desk's Live page turns to Sold).
**The one number:** you call from Rule 1's number, so the winner can call back on it.
**What the Desk shows:** Sold page: the hammer, **Pay by**, the ring counting down, the deposit row "Held by Obavia for the buyer".
**The one action:** call the winner within one hour and say the deadline and the pickup hours. Nothing else.
**Where:** your phone. **Not built: the Desk does not show the winner's name or phone.** The lane is adding a phone proved by a code at the first bid (in progress, `auction/worker/src/phone.ts`), but neither `/admin/exposure` nor the Sold page returns it (To build, item 3). Until it does, this call cannot be made. Write "not called: no number" in the desk log for every Sold, and the owner reports CF9 as 0 percent on Monday, plainly. If the winner calls you first, say the words below on that call.
**Say to the buyer:** "Hi, this is [your name] at Triple J. You won the [year make model]. You have until [Pay by] to pay. Until then the car is yours. Pickup is at [street], during [pickup hours]."
**Say to the dealer:** nothing; in the pilot you are the dealer's desk.
**Write it down:** desk log: lot, the time Sold, the time called (or "not called: no number"), the minutes between.

Conflict to report, not to fix here: the growth plan puts the call in Phase 1 with a floor of 100 percent (§1.3, CF9); the phases put buyer sign-in by phone in Phase 2 Onboarding. Until the Desk shows the winner's number, the pilot cannot meet that floor.

---

## 4. A late bid, and the soft close

**Who notices:** the buyer (the bid sheet stamps "Closed 0.4 s before your bid", `auction/src/screens/BidSheet.tsx`), then you, when they text.
**The one number:** Rule 1.
**What the Desk shows:** Live page: the ring and the high bid. In the last two minutes, every accepted bid sets the close to two minutes after that bid (`SOFT_CLOSE_MS = 120_000`, `auction/src/engine/auction.ts`). A bid that reaches the lane after the close is refused with the milliseconds it was late (`lateByMs`).
**The one action:** nothing changes. The result stands. A bid after the close does not count.
**Where:** no button. The refused bid is already a row: `bids`, with `ok = 0`, `reason = 'closed'` and its `stamped_at` time. The owner can read the lot's bids with their times; the Desk cannot show them (To build, item 13).
**Never** press **Sell It Now** on the Live page while the ring is blue (the last two minutes). It ends the lot at once: the Worker sets the close to now even inside a soft close (`POST /lots/:id/close` in `auction/worker/src/auction.ts` takes the earlier of the close and now). That is the "the dealer ended it on me" story. (To build, item 7.)
**Say to the buyer:** "Your bid reached the lane [0.4] seconds after it closed. The lane records every bid with its time, and a bid after the close does not count. The car went to the high bid at the close." If they ask for the bid log: "Every bid is recorded with its time. I'll ask the owner to read you the times for this car." If they did not win and want the deposit back: reply 2 in §2.
**Say to the dealer:** "One bid came in after the close. It does not count. The sale stands at [hammer]."
**Write it down:** the `bids` row exists. Desk log: lot, buyer's number, the seconds late from their screen.

---

## 5. A county kickback (the 130-U rejected)

**Who notices:** Triple J's title clerk, when webDEALER or the county sends the 130-U back.
**The one number:** Rule 1, if the buyer calls.
**What the Desk shows:** Sold page, row **Title to the buyer before day 21.** with its date and a dot: amber from day 15, red past the date (`laneTitleWatch`, `desk/src/lib/tax.ts`; 21 days on every lane sale, decisions §8.7 and §9 D2). The kickback itself is not on the Desk.
**The one action:** fix the rejected line and file again the same day. The day-21 date does not move.
**Where:** webDEALER (outside the Desk). The Desk's paperwork for the sale opens from **Open The Paperwork** on the Sold page after the start. When the buyer has the title, press **The Buyer Has The Title** on the Sold page.
**Not built:** the buyer's Plates ring cannot show the kickback. On a live sale it stays at "Filing"; the Filed, Approved, Mailed and "Dealer fixing" steps only run in the demo (`auction/src/sale.ts`, `runPlates`). Webdealer events driving the ring are Phase 3 (Paperwork). So you tell the buyer yourself.
**Say to the buyer:** "The county sent your title paperwork back for a correction. We're fixing it and filing again today. Nothing for you to do."
**Say to the dealer:** "The 130-U for the [car] came back. It must be refiled today; the title is due to the buyer before [date]."
**Write it down:** desk log: lot, the county's reason as written, the refile date. No lane row.

---

## 6. A no-show at pickup

There are two different cases. Find out which one first.

**Case A: the buyer has not paid.** In the pilot, paying and picking up are usually one visit (cash or cashier's check at the lot). A no-show before paying is a no-pay. Go to §7. Do nothing early: the deadline alarm does the forfeiture by itself.

**Case B: the buyer has paid** (the Sold page says "Paid. Scan their pass when the buyer is here.") and has not come.
**Who notices:** you, when the agreed time passes.
**The one number:** Rule 1.
**What the Desk shows:** Sold page in the Paid state, the button **Scan The Pass** (or **Type The Pass**).
**The one action:** wait, and log it. No rule exists for a paid buyer who never comes: nothing forfeits after payment (the deadline alarm only acts on an unpaid sale, `auction/worker/src/auction.ts`). Do not relist, do not void, do not move the car off the lot. Tell the owner the same day. The owner writes the rule into `obavia-auction-decisions.md` before a second case happens.
**Where:** no button.
**Not built:** the Desk does not know which pickup window the buyer chose. The buyer picks a slot in the app, the slot stays on the buyer's phone, and the slots are the app's placeholders, not Triple J's hours (`auction/src/screens/won/Pickup.tsx`; the Desk sends no hours, `carMeta(..., [])`). (To build, item 4.) So "no-show" means: past the time you agreed on the phone.
**Say to the buyer** (if they call): "Your car is paid and waiting. Pickup is at [street], during [pickup hours]. Bring your licence and your pass."
**Say to the dealer:** "The [car] is paid and not collected. It stays on the lot. The owner decides what happens next."
**Write it down:** desk log: lot, the agreed time, "no-show, paid". This is a logistics measure (no-shows at pickup); it lives in the desk log, not on the scorecard.

---

## 7. A no-pay at the deadline (the forfeiture, and what the dealer sees)

**Who notices:** the lane, by itself, at the **Pay by** time. Then you, in the morning or 9 pm check.
**The one number:** Rule 1.
**What the Desk shows** after the deadline: the hammer, then "The buyer walked. Their deposit is yours; the car is still yours." The deposit row reads "Forfeited to you", $250. One button: **Let It Go Again**. The admin page (`#/auction/admin`) moves one sale from Owed to Forfeited and one deposit out of Deposits held.
**The one action:** before the deadline, if the money has landed, press **Paid At The Lot**. The forfeiture is automatic at the deadline and has no undo; a payment that landed and was not marked will forfeit. After the deadline, press **Let It Go Again** when the dealer wants to relist.
**Where:** **Paid At The Lot** and **Let It Go Again**, Sold page (`desk/src/Auction.tsx`, `Sold`); routes `POST /lots/:id/paid` and, at the deadline, the lot's alarm (`alarm()` in `auction/worker/src/auction.ts`).
**What the system writes:** the sale gets `forfeitedAt` and `deposit = 'to_dealer'`; the buyer's `deposit_status` becomes `forfeited`; one `money_events` row, id `forfeit:<lot id>`, type `deposit.forfeited`, body `{ lotId, buyer, dealer, amount: 250, to: 'dealer' }`.
**Not built:** the $250 does not move to the dealer yet. The Whop transfer on forfeiture is "Not yet" in `auction/worker/README.md`. The forfeited money stays in Obavia's Whop balance, recorded as owed to the dealer. No push tells the buyer the deadline passed, no reminder went at 24 hours or 6 hours (To build, item 2). The under-bidder's 12-hour second-chance offer and the Reach re-post (decisions §2 row 9) are not built (To build, item 8).
**Say to the buyer** (if they call after): "The deadline was [Pay by]. The balance did not arrive, so the car went back to the dealer and the $250 deposit went to the dealer, as the deposit line said."
**Say to the dealer:** "The buyer did not pay by [Pay by]. The car is yours again and the $250 deposit is yours. It is recorded today; the money moves to you when the transfer is built. Let It Go Again relists it."
**Write it down:** the `money_events` row exists. Desk log: lot, "no-pay", whether the dealer relisted.

---

## 8. A car that does not start (no sale, the deposit back)

**Who notices:** the dealer, at pickup, with the buyer standing there.
**The one number:** Rule 1.
**What the Desk shows:** Sold page, Paid state, **Scan The Pass**; after the scan, **It Started**.
**The one action:** do not press **It Started**. End the sale.
House reading, conservative, until the owner writes otherwise in the decisions: "starts at pickup" means it starts with its key on the buyer's visit. If it needs a jump or a part, it did not start. Do not argue, do not offer a repair, a discount or another day (any of these is a new promise).
**Where:** Sold page, the faint line **I can't deliver this car**, then **Something else**, then **End The Sale** (`desk/src/Auction.tsx`, `WHY` list; route `POST /lots/:id/void`). There is no "It did not start" reason yet (To build, item 6), so the log line carries it.
**What the system does:** the sale gets `voidedAt` and `deposit = 'released'`; an `incidents` row (`kind = 'non_delivery'`, note "Something else") is counted against the dealer; the buyer gets the push "The dealer could not deliver. Your deposit is yours again." and the app clears the sale.
**The balance:** the dealer hands it back the way it came, the same visit: cash back in hand, a cashier's check returned, a transfer sent back. No lane row records this (To build, item 9).
**Not built, and it matters:** after a void, the buyer's **Get It Back** in Me is refused. The lane's release check counts a voided sale as still owed (`POST /me/deposit/release` in `auction/worker/src/index.ts` checks `startedAt` and `forfeitedAt`, not `voidedAt`), so the buyer sees "you lead a car or owe one". (To build, item 5, systems, before Thu Oct 22.) Until it is fixed, the owner refunds the $250 by hand in the Whop dashboard and checks that the buyer's deposit shows as refunded.
**Say to the buyer:** "It didn't start, so there is no sale. Here is your [cash / check]. Your $250 deposit comes back to your card; the owner sends it today. Your bank decides how fast it shows."
**Say to the dealer:** "No start, no sale. End the sale on the Desk: I can't deliver this car, Something else."
**Write it down:** the `incidents` row exists. Desk log: lot, "did not start", how the balance went back and when, when the owner refunded the deposit.
The Desk tells the dealer "A second one closes the lane to you." That does not happen by itself: suspension is the owner's button on the admin page, and whether a second non-delivery is a suspension or an end is the owner's decision due Fri Nov 6 (`collateral.md` §6). (To build, item 10.)

---

## 9. A buyer who says the car was misrepresented (the DTPA path)

**Who notices:** you, on the one number; or a letter or email arrives; or TxDMV writes (then §10).
**The one number:** Rule 1.
**What the Desk shows:** nothing about the complaint. The sale's documents: the Buyers Guide uploaded at Go (`PUT /lots/:id/documents/:name`), the Desk's paperwork from **Open The Paperwork**, the dealer's condition words with their date, the pickup time (`startedAt`).
**The one action:** write down exactly what they say, and hand it to the owner the same day. You decide nothing.
**Where:** no button.
**If anything arrives in writing** (a letter, an email, a text that says "notice" or "lawyer"): this may be the 60-day notice. A consumer must give written notice "at least 60 days before filing the suit" (Bus. & Com. Code §17.505, read 2026-10-13, `research/public-auction-model.md` §4). Photograph it, write the date it arrived on it, and give it to the owner today. The owner sends it to counsel the same day. Write day 60 in the desk log. If counsel is not engaged by then, that is the owner's missed action (growth plan §2.1, due Fri Oct 16).
**If they ask where to complain:** "You can file with the Texas DMV online, at txdmv.gov/complaints." (TxDMV's own page, read 2026-10-13: the Motor Vehicle Dealer Online Complaint System; TxDMV "cannot pursue a private claim for damages on your behalf".) Never discourage it.
**Say to the buyer:** "Thank you for telling us. I'm writing down exactly what you said. The owner will call you by [callback time]." Then read back what you wrote. Nothing more. Rule 4 applies to every word.
**Never offer** a tow, a repair or a roadside service. The $69 roadside partner in the decisions (§2 row 11) is not contracted.
**Say to the dealer:** "A buyer says the [car] was not as described. I've written it down word for word. The owner has it."
**Write it down:** desk log: their words, the date and time, any written notice and its arrival date, day 60.

---

## 10. A letter from TxDMV (a complaint or a records request)

**Who notices:** whoever opens the mail or the email.
**The one action:** give it to the owner the same day, unopened if it is addressed to him. The owner answers it with counsel. You do not call the investigator.
**What the owner will need** (sim 04 S1; 43 TAC §215.144): the deal jacket for the sale: 130-U, Buyers Guide with the buyer's acknowledgment, bill of sale, odometer disclosure, title copy, the lot as it ran, and the money trail (deposit in `money_events`, the balance paid at the lot, the date the car started).
**Write it down:** desk log: date received, the deadline the letter states.

## 10a. A lost phone sign-in (the admin bump and re-mint)

**Who notices:** the buyer. The app says "This phone lost its sign-in. This phone lost its sign-in. Call (the Desk number)." in Me (`auction/src/screens/Me.tsx`), or the buyer calls to say the phone is lost or stolen.
**The one number:** Rule 1. (The app's "write to us" names no address: To build, item 12.)
**What the Desk shows:** nothing. Refused sign-ins are rows in `token_refusals` (`presented`: `none`, `forged`, `other`, `stale`), readable by the owner in `GET /admin/exposure` under `tokenRefusals`; the admin page does not show them (To build, item 13).
**The one action, if the phone is lost or stolen:** the owner bumps the buyer, so whoever holds the phone can no longer bid or sign in as them.
**Where:** route `POST /admin/buyers/:id/bump` with the admin key. **No Desk button**; the owner runs it (To build, item 13). The owner finds the buyer's id from the name; the buyer cannot see their own id.
**Re-mint: not built.** After a bump the buyer cannot sign back in to the same account until sign-in by a proved phone can re-issue a token (`auction/worker/README.md`, Buyer tokens: "a suspension"). (To build, item 12.)
**The deposit:** it stays recorded and safe in the Whop balance, but the buyer cannot press **Get It Back** without a sign-in. The owner refunds it by hand in Whop if the buyer asks.
**If the buyer has won and not yet picked up:** the pickup can still finish. The six the dealer types are the VIN's last six (`auction/src/pass.ts`), read off the car. But the Desk cannot show who the winner is (To build, item 3). Do not hand over keys to someone without the pass until the owner has matched their licence to the winner's name.
**Say to the buyer:** "Your sign-in can't move to a new phone yet. Your $250 is recorded and safe. The owner will call you by [callback time] about sending it back to your card."
**Say to the dealer:** "The winner of the [car] lost their phone. Nobody collects it without the owner's OK."
**Write it down:** the `token_refusals` rows exist if they tried. Desk log: name, the number they called from, lost or stolen, the time the owner bumped them, any refund.

---

## 11. A dealer who wants to pull a car after bids (the shill and retraction rules)

**Who notices:** the dealer (a walk-in offers cash; the car got damaged; the title will not release).
**The one number:** Rule 1.
**What the Desk shows:** Live page. With bids on the car the buttons are **Sell It Now** and the faint **Lower the floor**.
**The rule:** once a bid is on the car, the car is committed. A bid is never below the floor (bidding opens at the floor), and "a close with bids is a sale" (`collateral.md` §2). There is no pull. **Sell It Now** is not a pull: it sells the car now to the high bidder.
**The one action:** let the lot close as set. If after the hammer the dealer truly cannot deliver, end the sale on the Sold page with the true reason.
**Where:** Sold page, **I can't deliver this car**, then the reason (**The car sold on the lot first**, **The title will not release in time**, **The car was damaged**), then **End The Sale**. Route `POST /lots/:id/void`. The deposit is released and an `incidents` row is counted against the dealer. (The deposit's Get It Back is blocked after a void until item 5 is fixed: the owner refunds by hand, as in §8.)
**Do not:** sell a car to a walk-in while it is on the lane. The Desk does not stop Handle A Sale on a car that is in a live lot (To build, item 15), so you check the Desk's Lane list before any walk-in sale. **Lower the floor** after a bid does nothing: the lane refuses it ("bids placed") and the Desk says nothing (To build, item 7).
The pull fee paid to the winner (decisions §2 row 9) is not built and is not charged.
**The shill rule** (decisions §9 D11; Bus. & Com. Code §2.328(d)): nobody at Triple J, no family, no staff, bids on a Triple J car, on any phone. The lane refuses a bid from a Desk key (`not_a_buyer`) and from a buyer whose proved phone, street or name matches the dealer's (`seller_cannot_bid`); each is a row in `bid_refusals`. It cannot see a shill using a stranger's name. If you see a bidder who bids only on Triple J cars and never completes, tell the owner; the owner can bump them (§10a).
**Retraction:** a buyer agreed at their first bid that "bids are irrevocable" (`TERMS`, version 2026-10-13, `auction/worker/src/bidders.ts`). There is no way to take a bid back in the app. Whether that term holds against Bus. & Com. Code §2.328(c) is counsel's open sub-question to question 4 (decisions §5). If a buyer asks in writing to retract before the close, write it down and give it to the owner the same day; do not answer the legal question.
**Say to the buyer** (retraction): "Bids can't be taken back in the app. If you win and don't pay by the deadline, the $250 deposit goes to the dealer. I've written down your message for the owner."
**Say to the buyer** (after a void): "The dealer can't deliver this car, so there is no sale. Your $250 deposit comes back to your card; the owner sends it today. Your bank decides how fast it shows."
**Say to the dealer:** "There are bids on it, so it can't come off. It closes [Closes time]. If you can't deliver after that, we end the sale and it counts against the lane standing."
**Write it down:** `incidents` (void), `bid_refusals` (shill attempts). Desk log: what the dealer asked, the reason.

---

## 12. A Whop refund that lands short (the $7.05 top-up)

**What happens:** Whop keeps its fee on every deposit: a $250 deposit lands as $242.95 (2.7 percent plus $0.30, $7.05). When the deposit goes back, Whop refunds the buyer the full $250 from Obavia's balance (docs.whop.com, issuing refunds, read 2026-10-12; `research/whop.md`; decisions §8.2). The buyer is never short. Obavia's balance is, by $7.05 per deposit, unless the owner puts it in at capture.
**Who notices:** the owner, in the nightly reconciliation (§13): `equal = 0` with the note "balance below deposits held: reserve ratio under 1".
**The one number:** not a buyer matter.
**What the Desk shows:** the admin page row **Reserve ratio** always reads 1.00. It is written as 1, not computed (`reserveRatio: 1` in `GET /admin/exposure`, `auction/worker/src/index.ts`), so its red warning can never show. Do not trust that row. Read the reconciliation (To build, item 13).
**The one action:** the owner adds $7.05 of Obavia's own money to the Whop balance for each deposit captured, on the day it is captured.
**Where:** no route, no button. How to add funds to a Whop balance is UNVERIFIED (no Whop page read on it). (To build, item 16, payments.)
**If a buyer says they got less than $250 back:** "Whop sends back the full $250. I'll ask the owner to check the refund today." Then the owner checks the payment in Whop.
**Write it down:** no `money_events` row type exists for a top-up. Until one exists, the owner keeps a money book line per top-up: date, the deposit's payment id, $7.05.

---

## 13. The nightly reconciliation reports a difference

**What runs:** every night at 08:00 UTC (3 am Central until Sun Nov 1, then 2 am; cron `0 8 * * *`), `auction/worker/src/reconcile.ts` compares every lot's copy in D1 with the lot itself, and the Whop balance with the deposits held. One row in `reconciliations`.
**Who notices:** the owner, in the morning. The row is in `GET /admin/exposure` under `reconciliations` (the last seven); the admin page does not show it (To build, item 13). The desk person asks the owner one question each morning: "Was last night equal?"
**The one action**, by what the row says:
- `equal = 1`: nothing.
- `lots_differing` above 0 and the note says they were repaired from the object: the lot itself is the record, and the copy was rewritten from it. The owner reruns the check, `POST /admin/reconcile`. If it comes back `equal = 1`, done.
- A lot "not repaired": the systems agent looks at it the same day. Do not void or relist that lot until they have.
- "balance below deposits held": stop. **No new lot goes live** (no **Go** on Let It Go) until the owner has topped up the balance (§12) and a rerun says `equal = 1`. This is the admin page's own rule: "The reserve is not 1.00. Stop opening lots and reconcile the Whop balance today." (`desk/src/AuctionAdmin.tsx`).
- "Whop not configured" or "balance not read": the owner sets `WHOP_ACCOUNT_ID` and the Whop key (growth plan §2.1, due Wed Oct 14). Until then the check cannot see the money, and `equal` can be 1 without proving anything.
**Where:** routes `GET /admin/exposure` and `POST /admin/reconcile`, admin key. No Desk button.
**Say to the dealer** (only if lots stop): "No new car goes live today until the deposit balance is checked. Cars already live keep running."
**Write it down:** the `reconciliations` row exists. Desk log: "equal yes / no" every morning. Seven equal nights in a row is the Phase 2 Server gate.

---

## 14. A push outage at the close

**Who notices:** a buyer ("I was never told"), or nobody.
**What is true:** pushes are best effort (`auction/worker/src/push.ts` sends and does not check delivery). With the app open, the lot streams live from the lane whether or not a push arrives. The lane's clock and its `bids` rows are the record. A result is never reopened because a push was late (sim 03 §13).
**The one action:** none on the sale. Write down the time the buyer says pushes stopped, and tell the owner.
**Not built:** nobody watches push delivery (To build, item 17).
**Say to the buyer:** "The lane's clock is the record, and every bid is on it with its time. The result stands. I've written down when your notifications stopped and passed it to the owner."
**Write it down:** desk log.

## 15. The wrong car at pickup (the VIN does not match)

**Who notices:** the Desk, at the scan.
**What the Desk shows:** "That pass is not this car." (The lane refuses `POST /lots/:id/pickup` with `wrong car` when the six do not match the lot's VIN.)
**The one action:** stop. Keys stay with the dealer. Walk to the car the buyer is buying and read the last six of its VIN plate. If the buyer opened another car's pass, open that lot instead. If the car on the lot does not match the lot's VIN (the photos were of another car), there is no sale: end it as in §11, reason **Something else**, and write "wrong car" in the log.
**Not built:** a refused scan is not recorded anywhere (To build, item 6). Wrong-car scans are a logistics measure; they live in the desk log.
**Say to the buyer:** "The pass doesn't match this car. Let me check the VIN plate with you." Nothing else until you know which it is.
**Write it down:** desk log: lot, the six typed, what you found.

## 16. The title is still at the lender after the sale

**Who notices:** the Desk: the Live page shows "Title at [lender]" with the release days; after the sale, the title row on the Sold page turns amber at day 15.
**The rule:** Go already refused any lender release longer than the lane allows (`collateralRefusal`, `collateral.md` §2). The title is due to the buyer before day 21 on every lane sale.
**The one action:** on the day the balance is paid, the payoff goes to the lender; you call the lender for the release that day.
**Say to the buyer:** "Your title is with the bank until the payoff clears. The dealer files it before [date on the title row]. The state mails it to you."
**Write it down:** desk log: the payoff date, the release date. Press **The Buyer Has The Title** when it is done.

## 16a. A county holiday on the tax remittance day

**Who notices:** you, on the Sold page row **Tax to the county.**, which shows a date.
**How the date is made:** the earlier of 20 working days after the sale and 30 calendar days (Tax Code §152.041(c); Comptroller 96-254; decisions §8 item 9 and §9 D7), flagged amber from day 15. The Desk counts Monday to Friday and has no holiday table on purpose: leaving holidays out can only make the date earlier, never later (`addWorkingDays`, `desk/src/lib/tax.ts`). The 30-day date can still land on a weekend or a holiday.
**The one action:** if the date shown is a day the county tax office is closed, remit on the last open day **before** it. Never after. Whether a county accepts the next open day is UNVERIFIED and we do not rely on it.
**The pilot's own case:** a car sold Fri Oct 30 is due Fri Nov 27 (20 working days; 30 calendar days is Sun Nov 29). Thanksgiving is Thu Nov 26; Fri Nov 27 is likely a county holiday too (each county's calendar UNVERIFIED). Remit by Wed Nov 25. Read the county tax office's holiday list on its own site in the week of Nov 16 and write it in the desk log.
**Where:** remit outside the Desk. Then press **The Tax Went To The County** on the Sold page. That line only appears once **The Buyer Has The Title** is pressed (To build, item 19); if the tax goes first, write the date in the desk log and press it after.
**Say to the dealer:** "The tax for the [car] goes to the county on [the open day before the date]."
**Write it down:** desk log: the date remitted, the receipt number.

## 17. An out-of-state licence wins

**What is true:** the pilot is Texas licences only, said at the first bid (decisions §2 row 5, §9 D9). The out-of-state packet (Form 14-312, the assigned title, the green 60-day plate) is "Not yet" in `auction/worker/README.md`. The lane does not refuse a bid from a non-Texas licence (To build, item 20). The app turns the Plates tile into Title for a non-Texas licence.
**The one action:** do not file a 130-U and do not hand over the car. Tell the owner the same day.
**Say to the buyer:** "The lane is for Texas licences for now, so this sale needs the owner. I've written it down. The owner will call you by [callback time]."
**Write it down:** desk log: lot, the licence state.

## 18. A deposit chargeback

**Who notices:** the owner. Whop sends `dispute.created`; the lane keeps it as a `money_events` row (`WHOP_EVENTS` in `auction/worker/src/whop.ts`).
**The one action:** the owner answers the dispute in Whop with what exists: the deposit terms line, the buyer's terms stamp (`terms_version`, `terms_at`), the buyer's `bids` rows, and the sale (hammer, deadline, forfeiture or pickup time).
**Not built:** the evidence pack is Phase 3 Admin (`dispute.*`, upload evidence).
**Say to the buyer:** nothing beyond facts, and only if they call: "I've written down your call for the owner." No threats, no comment on the dispute.
**Write it down:** the `money_events` row exists. Desk log: date, lot.

## 19. A cloned listing on Marketplace (the scam)

**Who notices:** a stranger texts the number asking about money they sent someone.
**The one action:** reply within the hour, then report the post to Facebook.
**Say to them:** "That was not us. Obavia never takes money outside the app. The only payment before you win is the $250 deposit, inside the app. Please report it to your bank today."
**Write it down:** desk log: the post's link, the name the scammer used.

---

## 20. The daily checklist (one page)

### Morning, before 10 am

1. Ask the owner: "Was last night equal?" Write yes or no. If no, §13. If "balance below deposits held", no car goes live today.
2. Open the Desk's Lane list (`#/auction`) on the pilot's device. Open every car in **Sold**.
3. For each sale still Owed: has the money landed (cash in the safe, the transfer or wire in the bank)? Yes: press **Paid At The Lot** now. A deadline that passes unmarked forfeits, with no undo.
4. For each sale with a deadline before tonight: write its **Pay by** in the desk log for the 9 pm check.
5. The title and tax dots on every Sold page: amber means act this week (§5, §16, §16a); red means today, and tell the owner.
6. Every live car has its Buyers Guide on the window (16 CFR 455.2; phases Phase 1 Legal). Every car being picked up today has its Buyers Guide on it.
7. No live car is at the mechanic or off the licensed lot. Nobody works on a car while it is on the lane.
8. The one number: every text and voicemail since last night has its reply (§2) and its desk log line.
9. Before any walk-in sale today: check the car is not on the Lane list.

### 9 pm

1. The one number: answer every text from today with its reply (§2). Anything for the owner goes to the owner tonight, with the callback time.
2. Lots closing tonight: the Live page open. Do not press **Sell It Now** while the ring is blue.
3. Every hammer since the morning: the winner call (§3), or "not called: no number" in the log.
4. Every deadline before tomorrow morning: if the money is in, **Paid At The Lot** now.
5. Every pickup today: **It Started** pressed, or the reason it was not (§8, §15) in the log.
6. Write the day's counts in the desk log: Sold, called within the hour, started, no-shows, wrong-car scans, voids.

---

## 21. The Monday scorecard: the five numbers and where each is read

Filled by admin with the owner before 10:00 every Monday into `docs/plan/growth/scorecard.md` (growth plan §3). Never from memory and never from the desk log. Each is read from the lane's D1 database (`obavia-auction`), from `auction/worker`, with `npx wrangler d1 execute obavia-auction --remote --command "<the query>"`. MON and NEXTMON are Monday 00:00 Central of the week and of the week after, in milliseconds.

| # | Number | Where it is read |
| --- | --- | --- |
| L | Lots opened | `SELECT COUNT(*) FROM lots WHERE json_extract(lot,'$.opensAt') >= MON AND json_extract(lot,'$.opensAt') < NEXTMON` (each Let It Go makes a new lot id, `lotId` in `desk/src/lib/auction.ts`, so a relist counts once) |
| D | Deposits captured | `SELECT COUNT(*) FROM money_events WHERE type = 'payment.succeeded' AND json_extract(body,'$.data.metadata.kind') = 'deposit' AND received_at >= MON AND received_at < NEXTMON`; cumulative without the date bounds |
| B | Bidders per closed lot (median) | `SELECT l.id, (SELECT COUNT(DISTINCT bidder) FROM bids WHERE lot_id = l.id AND ok = 1) AS n FROM lots l WHERE json_extract(l.lot,'$.closed.at') >= MON AND json_extract(l.lot,'$.closed.at') < NEXTMON`; the median of `n`, lots with no bids counted as 0 |
| S | Sold rate | `SELECT SUM(json_extract(lot,'$.closed.sold')), COUNT(*) FROM lots WHERE json_extract(lot,'$.closed.at') >= MON AND json_extract(lot,'$.closed.at') < NEXTMON`; the first over the second |
| T | Started rate | `SELECT SUM(json_extract(lot,'$.sale.startedAt') IS NOT NULL), COUNT(*) FROM lots WHERE json_extract(lot,'$.sale.wonAt') >= MON AND json_extract(lot,'$.sale.wonAt') < NEXTMON`; the first over the second. The pickup window is not stored on the lane (To build, item 4), so "inside the deadline plus pickup window" cannot be checked yet; the scorecard row says so |

The standing gates beside them: fee rows in `money_events` = 0; the reserve ratio from the last reconciliation (`equal`), not from the admin page's 1.00 (§12); deposits held = the Whop balance (the reconciliation's note).
The desk log's counts (called within the hour, no-shows, wrong-car scans, paid to started in hours) are logistics' own measures. They are not a sixth number and do not go on the scorecard unless the growth plan is amended.

---

## 22. To build

Each item is something a step above needs and the code does not do. Owner agent in brackets. Items 1 to 7 are needed before the first lot goes live on Thu Oct 22, 2026.

1. The app's Pay screen prints the deadline with its minutes, from the lane's `deadlineAt`, in the same words as the Desk's Pay by (`auction/src/screens/won/Pay.tsx`). [frontend]
2. The "Yours" push carries the deadline ("Pay by Sat 8:14 pm"); pay-by pushes at 24 hours and 6 hours; a push to the buyer and the dealer at forfeiture. Phases Phase 1 Frontend row. [systems]
3. The winner's name and proved phone on the Desk's Sold page (and in `/admin/exposure` sales), so the CF9 call can be made. Depends on the phone sign-in in progress (`auction/worker/src/phone.ts`). [systems, dealers]
4. Pickup windows from Triple J's hours on the lot (the Desk passes `[]` today), and the buyer's chosen slot sent to the lane and shown on the Sold page. Phases Phase 1 Logistics row. [logistics]
5. `POST /me/deposit/release` admits a buyer whose only sale is voided (it checks `startedAt` and `forfeitedAt`, not `voidedAt`), so Get It Back works after a no-start or a dealer void. [systems]
6. An "It did not start" reason on the void (the `incidents` table already has `no_start`), and a refused pickup scan (`wrong car`) written as a row. [dealers, systems]
7. `POST /lots/:id/close` refuses inside the last two minutes (the collateral rule "never earlier than the refill"); the Desk hides Lower the floor once a bid exists (the lane refuses it with `bids placed` and the Desk is silent). [systems, dealers]
8. Second-chance offer to the under-bidder at expiry; the Reach re-post. Decisions §2 row 9. [dealers, systems]
9. A `money_events` row for Paid At The Lot, for a void's deposit release, and for a balance handed back. Phases Phase 1 Admin exit: "every money movement traceable to a row". [payments]
10. Suspension after a second non-delivery, once the owner decides it (due Fri Nov 6, `collateral.md` §6); until then the Desk's line "A second one closes the lane to you" is not true and should not be shown. [admin, dealers]
11. The Insure tile stores the buyer's insurance card where the Desk can see it (today it only marks the step done on the phone). [frontend, paperwork]
12. Re-mint after a lost phone by the proved phone; the app's lost line, "This phone lost its sign-in.", gives the one number to call. [systems, onboarding]
13. On the admin page: the last seven reconciliations, the reserve ratio computed from the last one (not the fixed 1.00), `bidRefusals`, `tokenRefusals`, a lot's bid log with times, and buttons for Bump, Release deposit and Forfeit with a reason (phases Phase 1 Admin row) and a desk log. [admin]
14. The desk log on the admin page, one line per event, replacing the paper book. [admin]
15. Handle A Sale refuses a VIN that is in a live lot (decisions §4). [dealers]
16. The $7.05 top-up: how money is added to the Whop balance (UNVERIFIED), and a `money_events` row type for it. [payments]
17. A push delivery check (Expo receipts, a canary phone) so an outage is seen at the time. [systems]
18. VoiceOver paging and the accessibility pass. Phases Phase 2 Frontend row. [frontend]
19. The Tax Went To The County shown independently of the title line. [paperwork]
20. The lane refuses a bid from a non-Texas licence until the out-of-state packet exists; a first account leads at most two lots (decisions §2 row 10). [systems]

## 23. Changelog

| Date | Change |
| --- | --- |
| 2026-10-13 | File created by logistics from phases Phase 1 Ops, the six simulations, decisions, `collateral.md`, the growth plan §1.3 and §3, `auction/worker/README.md`, `desk/src/AuctionAdmin.tsx`, `desk/src/Auction.tsx` and `research/public-auction-model.md` §4, checked against the code that day. |
