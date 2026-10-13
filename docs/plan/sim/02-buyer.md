# 02 · The buyer, no dealer licence

Four fictional buyers in Harris County walking the blueprint end to end. Dealers are fictional ("Lone Pine Motors", GDN holder). Tax at 6.25% per `desk/src/lib/tax.ts`. Texas rules not in the blueprint's §4 are flagged under "Not sure".

The people:
- **Keisha, 24**, Houston (Third Ward), $4,200 in a Chime account, starts a CNA-to-RN bridge job at Memorial Hermann in 14 days, rides the 54 bus.
- **Marcus, 41**, Pearland, flips two cars a year on Marketplace, follows MMR through a cousin with a Manheim login.
- **Mr. Tran, 63**, Alief, buying for his grandson Kevin (20), uses the phone for Zalo and the bank app only.
- **Dani, 19**, Cypress, first car, mother's Chase debit card saved in her Apple Wallet with Mom's permission "for the deposit only".

---

## Scenario 1 · Keisha, the happy path that is actually 14 days long

**Finding it.** A TikTok: one car, two bars, "No dealer licence. Ends Friday." App Store, open, she is in the lane with no sign-up. First car: 2013 Altima, hammer **$2,100**, ring at 5 days.

**Floor vs Retail with no text.** Short bar, long bar. She reads them as "what it's worth" and "what they want"; the word *floor* means nothing to her, and she can't tell whether $2,100 is the current bid or the floor. Screenshot, text to her cousin: *"what does floor mean, is 2100 the price or no"*. **Stop #1.**

**Her real budget.** $4,200 minus tax, title $33, registration about $75 plus local fees, the $7.50 inspection-replacement fee, Lone Pine's $150 doc fee, and an insurance down payment (24, 77004, liability only: $140 to $190). Honest ceiling: a **$3,400 hammer**. Nothing in the app does that subtraction. "The buyer does the maths" works for floor vs retail; it fails for "what will this cost me", which is the number she decides on. **Change: an out-the-door line under the price (hammer + 6.25% + the dealer's filed fees) is the one sentence I'd allow.**

**First bid.** Drag to $2,200, ticks, release. Apple Pay sheet: deposit $250, Face ID. She didn't expect money to move now: *"it charged me 250 is that the car or a fee"*. **Stop #2.** A debit hold on Chime shows as pending and cuts her available balance at once.

**Outbid at 11:58pm, Thursday.** Push: "Outbid. Altima." Silence in the app, ring blue. $2,600, soft close, outbid at 12:03, she stops at $3,300, loses at $3,400. The deposit "releases" but a debit hold takes **3 to 7 business days** to fall off at Chime. Twelve days to the job and $250 she can't see.

**Second car, won at 2:07am Sunday.** 2012 Corolla, **$3,250**. Flash, chime, confetti, three tiles: ID, Sign, Plates. ID scans. She stops at Sign: a two-page FTC PDF on a 6.1-inch screen with AS IS ticked. *"it says AS IS NO DEALER WARRANTY does that mean they can sell me a broke car"*. **Stop #3**, the biggest. Nothing in the flow answers it. She signs at 9am after her cousin says "that's every used car".

**Insurance before plates.** Plates stays grey. The Desk asks the dealer "Did They Show Proof Of Insurance?" (`desk/src/lib/plan.ts`); the buyer side has nothing. She learns Monday at 4pm by text: "need your insurance card before I can file." Progressive on her phone, $162 down, screenshot. Change: **a fourth tile, Insure, between ID and Sign, VIN pre-filled; Texas registration needs proof of financial responsibility and the dealer can't file without it.**

**Paying.** $3,250 + $203.13 tax + $33 + about $82 registration + $150 doc fee = **$3,718**, less the deposit. Apple Pay. Her Chime debit has a **$2,000-a-day** limit (issuer-set; Apple Pay has none of its own). Declined. 9:14pm: *"it keeps saying card declined i have the money"*. **Stop #4.** She pays $2,000 Monday and $1,468 Tuesday, which "money, once" does not model. Interchange on $3,718 is about $108; somebody eats it (Q2).

**Pickup.** The lot is a 54-minute bus ride plus a 12-minute walk with no sidewalk; window "Tue 10–4"; she's at work; Saturday. Metal plate already on (filed in webDEALER under HB 718), registered on a 90-day-old passing emissions test in the state system; nobody tells her the next Harris County test is hers. Day 12, 9pm: *"do i have the title or do you"*. The answer (county mails it in 2 to 4 weeks) is nowhere in the app.

---

## Scenario 2 · Marcus, the soft-close war and the $9,400 payment

**Reading the bars.** 2018 Silverado, hammer $7,900. Marcus reads floor as reserve, measures the bar with a ruler app, texts his cousin: *"what's MMR on a 18 silverado LT 112k, this floor bar looks like 8k"*. **Stop.** If the floor is visible as a proportion, anyone who knows retail solves for it within a few hundred dollars; every serious bidder anchors on it and the hammer sits at floor plus one increment. §3's "anywhere inside the spread" collapses to the dealer's minimum. Hide the floor until met (Peak's "Reserve not met"), or show it and accept the floor *is* the price. Don't pretend the bars are neutral.

**Proxy bid.** Max $9,100; $250 hold on his Amex. On day 7 an **uncaptured card authorization is at Stripe's 7-day hold limit**: it lapses silently or we re-authorize at 11:50pm against whatever limit the card has that night. **Change: a captured deposit (real charge, refunded on loss), not a hold, for any auction over 5 days.**

**11:58pm.** Three bidders, six extensions, ends 12:14am, he wins at **$9,400**, above his max because he bid by hand at the end. The audit log lives on the Durable Object; the buyer sees only the price. 12:20am: *"was there shill bidding on this, I want the bid log"*. He believes it only with timestamps and anonymised bidder IDs, like BaT.

**Paying $9,400 + $587.50 tax + fees ≈ $10,250.** Apple Pay on Amex: about $300 in fees for the dealer or us. ACH via Stripe: up to **4 business days** to settle and **60 days** of dispute rights (our own `bhph-payments.md`), so no truck until Friday. Wire: $25 to $30, same day, no dispute. **Cash at the lot** over $10,000 obliges the dealer to file **IRS Form 8300** within 15 days. He picks wire; the app has no wire instructions; the dealer texts a photo of a voided check. Change: **a payment matrix on Won: card to $X, ACH (release on settlement), wire, cash at lot (ID and 8300 done by the Desk).**

**Pickup, no title in hand.** The title is at Lone Pine's floorplan lender; the dealer has 30 days to file the 130-U; the lender releases 10 days after payoff. Marcus gets a QR, a truck, plates, and an amber title step for 19 days. Day 20: *"this is exactly what happened to me at Peak."* "Plates mailed to you" is only true if the dealer holds the title. **Change: title status declared at listing (in hand / at lender / lost, VTR-34 pending), shown as a chip on the car; no "Plates" promise on the win screen without it.**

---

## Scenario 3 · Mr. Tran, who does not trust apps

Kevin found a 2015 Civic at $5,100; Mr. Tran pays and wants to see it first. He drives to Lone Pine Wednesday; the salesman says "it's online, I can't sell it to you here." True under both structures, a lost sale under both.

**Whose name.** If Mr. Tran wins, the ID tile wants *his* licence and puts *him* on the 130-U. Kevin then needs a second transfer (a $10 family gift, but a second 130-U and the county trip we promised never happens). Change: **"Who is the car for?" before ID, taking a second person's ID onto the paperwork, with the payer as payer only.** The Desk has a co-buyer slot; the app needs it.

**Signing on a phone.** He won't sign a Buyers Guide on a 6-inch screen. The FTC rule wants the Guide **on the vehicle** and a copy at the sale anyway; the in-app signature is a preview of what he signs at pickup, and the Desk already has "Print For Ink". The app should say so in one line. To Kevin: *"tell them I sign in person with a pen, I don't sign on the telephone."*

**Paying.** Cash, about $5,600, under $10,000, no 8300. The dealer marks it paid in the Desk; the app has no "paid at lot" state unless the Desk pushes one. Kevin placed the deposit on Kevin's card; the car is in Mr. Tran's name; the refund goes to someone who isn't the buyer. Real, and the kind of thing a dispute reviewer notices.

**The car that won't start.** Saturday, the Civic clicks. Dead battery; the salesman jumps it. Had it been the starter, Mr. Tran walks, forfeits the deposit under as-is, probably eats a relist fee; Texas has **no cooling-off period** on a dealer-lot purchase and the as-is Guide is part of the contract. He tells every dealer in Alief. This scenario decides Q3.

---

## Scenario 4 · Dani, Mom's card, remorse, and the chargeback

**Deposit.** $3,000 on a 2014 Fiesta; Apple Pay pulls *Mom's* Chase debit. Card name ≠ ID name; nothing checks. Screenshot to Mom: *"it took 250, you said that's fine right".*

**Winning at 2am Sunday, $3,450.** Scans her ID, finger-signs the Buyers Guide, bill of sale and 130-U at 2:11am without reading (the pad unlocks after scrolling to the end; she scrolls fast). Pays ≈ **$3,900** Monday with Mom's card: Chase debit $3,000 daily limit, declined; Mom pays Tuesday after an argument. The payer is a third party on the sale; the Desk records the payment, not *who* paid.

**Twenty-four hours later.** PowerShift dual-clutch, shudders at 15 mph, a TikTok says "worst transmission ever made". No cancel, no "talk to someone". 9:40pm: *"i changed my mind can i get my money back i didn't even pick it up yet"*. The blueprint has no rule for **a winner who never picks up**; the lane does (Manheim's $100 to $500). We need one, printed before the first bid.

**Chargeback.** Mom disputes $3,900 as "not as described"; networks allow up to **120 days**. The evidence bundle: signed as-is Guide, bill of sale, ID scan, bid log, pickup QR time, condition photos. The Desk freezes documents at filing (`lib/filed.ts`); the bid log and deposit consent must sit in the same bundle. If she never picked up, the dealer still has the car and the merchant usually loses. **Change: card payment only at pickup (QR scan), ACH/wire/cash before; no card in a name that doesn't match the 130-U buyer without a co-signer line.**

---

## Scenario 5 · Edge: Keisha's $250 across three cars, and Harris County inspection

Keisha bids on three cars in one evening because the feed makes it easy: three $250 holds, $750 of $4,200 pending, wins none, holds fall off over a week. There is no support in the app: *"why is my money gone three times"*. **One deposit per buyer, not per car**, reused across auctions, one chip in "Me". Peak's $50 per auction is the wrong model for a bus pass and $4,200.

Inspection. Since 2025 Texas has no safety inspection for passenger cars; Harris County still needs an **emissions test** before registration, and the dealer registers on the inspection in the state database. Older than 90 days: a $25 test and a day at a station before filing, or webDEALER rejects. A dealer listing a loser has usually not inspected it. Let It Go needs the inspection date, the way the Desk asks "Where Does The Inspection Stand?" (`sale.ts`).

---

## Scenario 6 · Failure: won at 2am, the dealer never answers

Marcus wins a 2016 F-150 at 2:03am Saturday from "Bayou Auto", a one-man lot. Wires Monday. Tuesday: no pickup window, Plates grey, no answer to texts. Under A the money went to the dealer and his remedy is the dealer or the TxDMV complaint line. 9pm, to us: *"you took my ten grand and nobody answers"*. We didn't; it feels like we did, because the app carries our name and our chime. Under B we hold the money until pickup and can refund. From the buyer's seat, A is a worse product with B's brand risk. Minimum for A: **hammer money held by Obavia's processor until the pickup QR scan, then paid out** (Stripe Connect separate charges and transfers), which counsel must test against brokering.

---

## Scenario 7 · Repeat: Marcus, a year later

Eleven months on, the watched car's ring spins in with a heartbeat. He trusts the bid log, the title chip and the wire instructions now. Max on two trucks, wins one at $8,200, wires Tuesday, picks up Thursday with plates on, title in 3 weeks. Screenshot of the title chip to his cousin: *"this is why I stopped using Peak"*. His repeat depends on scenarios 2 and 6 being fixed; Keisha's (an RN salary, a bigger car) on one deposit, an out-the-door number and the Insure tile.

---

## The four questions, from the buyer's seat

**1. A to launch, B as target, or straight to B?** Launch on **A only if the money is held by us until pickup**; otherwise the buyer's experience is "Obavia took my money" with no Obavia remedy (Scenario 6). If counsel says holding the hammer under A reads as brokering, go **straight to B**: a buyer sending $10,000 to a one-man lot on a 2am win will not do it twice. The buyer does not care who the seller of record is; they care who refunds.

**2. Premium single digits, or zero premium and a dealer fee?** **Zero buyer's premium, dealer-side fee.** Reasons: the buyer's premium is a line the buyer screenshots and texts "what is this"; it is taxable consideration in Texas if it is part of the price (counsel item in the blueprint); it is the thing Peak is hated for; and the card fee already needs a home. A single line, "Dealer fees $150", filed by the dealer and shown in the out-the-door number, is honest and already exists in the Desk.

**3. As-is only, or a 48-hour starts-and-drives guarantee?** **Starts-and-drives, 48 hours from pickup, on every car over $2,500**, funded by a dealer-side relist fee if the buyer walks for any other reason. Mr. Tran's Civic and Dani's Fiesta are both lost customers under pure as-is; a dead car at pickup under as-is produces a complaint, a chargeback and a TikTok. The Buyers Guide stays as-is (it is a federal form about warranty); the guarantee is an Obavia term, not a dealer warranty. Odometer and title arbitration regardless of price.

**4. Deposit amount; refundable on a loss?** **$200, one per buyer not per car, a real charge not a hold, refunded within 24 hours of a loss or held for the next bid at the buyer's choice.** Forfeited only if the winner does not pay within 3 business days or does not pick up within 7 days of plates filed. A hold expires before a 7-day auction ends (Scenario 2); a per-car hold strands a low-balance buyer (Scenario 5).

## Three changes I'd fight for

1. **An out-the-door number on the car screen** (hammer + 6.25% + the dealer's filed fees) and a **payment matrix** on Won (card limits, ACH timing, wire, cash with 8300), replacing "money, once".
2. **Title-in-hand declared at listing and shown as a chip**; no "Plates" tile promise on a car whose title is at a lender; hammer money held until pickup QR scan.
3. **Insure as a fourth tile and "Who is the car for?" before ID**, so the 130-U carries the right person and the dealer can actually file.

## Three facts I am not sure of

1. **Harris County emissions and the 90-day window:** whether a dealer can register in webDEALER on an inspection older than 90 days, and whether the buyer must redo it at first renewal. Also whether the $7.50 inspection-replacement fee applies at a dealer sale.
2. **Card hold life:** that a Stripe uncaptured authorization lapses at 7 days (Visa/Mastercard) and cannot cover a 7-day soft-closed auction without re-authorization; and the issuer-set daily debit limits quoted (Chime $2,000, Chase $3,000) as of today.
3. **Whether a dealer may list a car it does not hold the title to** (floorplan or lien payoff pending) for public auction, and what the 30-day 130-U clock does when the lender releases late; plus whether a third-party payer (Mom, Mr. Tran) on a sale creates any TxDMV or Comptroller issue beyond the processor's chargeback exposure.
