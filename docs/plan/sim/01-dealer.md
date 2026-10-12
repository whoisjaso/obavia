# Simulation 01: the dealer

Persona (fictional): **Ray Delgado, Delgado Motors, Pasadena TX (Harris County)**. Independent GDN, buy-here-pay-here, 38 cars. One office person, **Marisol Treviño**, part time, does the 130-Us in webDEALER. Mechanic **Beto** has a two-bay shop across Spencer Highway. A $180,000 floorplan line ("the line"), curtailments at 30/60/90 days, lender holds the titles. A local bank line, also title-secured, from a batch of repos last year. Ray thinks in **down payments and notes**: a loser is a car he can't put a note on, or one that has eaten his cash.

Everything below is Ray using "Let It Go" as the blueprint's §5.2 describes it, under Structure A unless stated. Numbers are fictional. Where I am guessing at law I say so at the end.

---

## Scenario 1 (ugly): the 2014 Altima with the CVT he never fixed

**The car.** 2014 Nissan Altima 2.5 S, 131k, bought at Manheim Houston for $4,100 hammer, $335 buy fee, $140 transport, $420 of Beto's time before Beto said "it's the CVT, $1,900 with a used unit, no warranty". Ray stopped. Cost basis **$4,995**. It has been on the line for 71 days; the 60-day curtailment ($615 principal plus fees) already came out of his account. The line still holds the title. It does not drive onto a trailer; it lurches.

**What Ray sees.** Days ring at 71, amber. Let It Go. "What's the least you'll take?" with cost basis $4,995 and an MMR band of $3,600 to $4,200 beside the field. Ray laughs: that is MMR for an Altima that drives. A CVT car is a $1,600 to $2,100 red-light car. **The band is the wrong band**, because nothing asked about condition before the floor. He types $2,800 and stops: he owes **$3,485** on it to the line. A $2,800 hammer means he brings $685 to the lender to get the title released before he can file anything.

**What goes wrong.** The screen doesn't tell him that. In Show It the six-tap pass has "starts/drives" as one binary tap; he taps it and the badge assembles a cheerful B-minus. Under Structure A that is his misrepresentation on a Buyers Guide with his name on it. He backs out and texts, 9:04 pm: *"the number next to the floor is for a car that runs. mine dont. and it doesnt tell me I'm upside down on the line. where do I put 'needs trans'?"*

**What we must change.** (1) The condition pass comes **before** the floor, and the band shifts with it; a car that fails "drives" gets a red-light band and a mandatory one-line known-defect field (the Buyers Guide has a box for it; the blueprint's "no text" rule breaks here and should). (2) Beside the floor: **"You owe $3,485 on this car (the line, due Nov 2)"** and **"You'd get $X / bring $Y"** recomputed as he types. (3) The condition pass needs three states for drive: drives, drives with a problem (say it), does not drive.

---

## Scenario 2 (ugly): the repo with the lien still on the floorplan line

**The car.** 2012 Silverado 1500, sold on a Delgado note 14 months ago, title filed in the customer's name with Delgado Motors as lienholder; customer stopped paying; Ray repo'd it in August. Twist: Ray **never paid the line off when he put it on a note**; the lender thinks it is still floored, with a stale title in its vault two owners out of date. This happens at small lots, and it is a floorplan default if the auditor walks the lot.

**What Ray does.** Let It Go. Floor $6,500. Cost basis on screen is the Manheim price from 18 months ago, meaningless now; the real cost is the written-off note balance. Band $7,900 to $8,800. He feels good. Show It, How Long, Go.

**What goes wrong.** It sells Tuesday for $7,250 to **Danielle Okafor** in Deer Park. The Desk opens the sale, funding "paid in full". Marisol opens the 130-U and the title step asks for the evidence of ownership. Ray has: the old title (at the lender), the customer's title (the customer has it, or lost it; the lien was recorded in Delgado's name), and the repossession affidavit he has not done. Texas lets a lienholder transfer a repossessed vehicle with the affidavit of repossession plus the title or a certified copy, but every piece of that is a county trip or a mailed form, not a same-day webDEALER filing. Danielle's app shows "Plates" grey for 16 days. She texts the dealer at 9 pm: *"it said plates mailed to you. where is my title."* Ray texts us: *"why did you let me list it."*

**What we must change.** Before the floor, a hard question with four chips: **Where is the title right now?** *In my hand / On my floorplan / At a bank / Repo, not re-titled yet.* "Repo" routes to a checklist (affidavit, lien release, certified copy) and the listing is locked until it is done. "In my hand" is the only answer that lets Go be a one-tap.

---

## Scenario 3 (edge): the title is in the bank's hands

**The car.** 2016 Fusion, bought with the local bank line, the bank holds the title. The bank releases titles on payoff, by hand, from a branch on Fairmont Parkway, **Monday to Friday 9 to 4**, and needs 24 hours notice. Hammer closes **Sunday 7:50 pm** (7-day auction started Sunday). Buyer, **Trevor Lusk**, wants to pick up Monday morning before his shift at the refinery.

**What happens.** Ray won't release the car unpaid; Trevor won't pay the balance while the title tile is grey; Obavia pays Ray "at title filing"; Ray can't file until the bank hands him the title Tuesday at the earliest. Three parties waiting on each other. Monday 9 pm, Trevor: *"is this a scam."*

**What we must change.** (1) Default the end time to a **weekday afternoon**, and have the dealer set a "title release lead time" chip once per lender. (2) Payout must not wait for the filing (scenario 8). (3) The Won screen says a date, "Pickup window opens Tuesday 2 pm", computed from that lead time, instead of a tile that goes grey without a reason.

---

## Scenario 4 (failure): 94 days, Marketplace still up, sells Thursday, walk-in Friday

**The car.** 2015 Kia Soul, 94 days, listed on Marketplace at $8,995 since July; the Reach post from Let It Go put "Auction ends Thursday" on the Page, but the old Marketplace listing is a separate item Ray posted himself from his phone, and it is still up. Floor $5,200. Hammer **Thursday 8:14 pm, $6,150**, winner **Jasmine Reyes**, deposit held.

**Friday 10:30 am.** A walk-in from the Marketplace listing, **$6,000 cash today**. Jasmine hasn't paid the balance; she messaged "can I pay Saturday when I get paid". Twenty years of Marketplace say cash on the counter beats a promise on a phone. Ray takes the $6,000, Marisol does the sale by hand, and the app still says Jasmine won.

**What goes wrong.** Jasmine's deposit becomes a refund and a one-star review; under Structure A **Ray** sold a car twice, DTPA exposure is his, and Obavia's name is on the screenshot. If our terms make the hammer binding on the seller, Ray broke them and will say nobody told him when the money had to arrive.

**What we must change.** The Sold screen needs one line in big type: **"Jasmine has until Saturday 8:14 pm to pay. Until then the car is hers. After that it's yours again."** That deadline is a product decision we have not made (24 h or 48 h after close). And Let It Go must offer to **pull the dealer's own Marketplace listing** or at least show it: "You still have this car listed on Marketplace at $8,995" with a tap to end it. The blueprint's Reach integration posts; it does not retract.

---

## Scenario 5 (failure): below his floor because he set the floor wrong

**The car.** 2013 Accord, cost basis $5,900, owes $4,250 on the line. Ray reads "the least you'll take" as **what lands in his account**, types $4,400, and in his head that clears the line with $150 over. Fee structure in this run: zero buyer's premium, 5% dealer-side success fee. Hammer $4,400 exactly (the floor met, one bidder, a proxy). Payout: $4,400 minus $220 = **$4,180**. He is $70 short of the payoff, and that is before the $85 the line charges for a title release and the $48 for Marisol's time he doesn't count.

**What he does.** Refuses to sign the 130-U. Texts us at 9 pm: *"it says I get 4180. I said 4400. which one of us is lying."* The buyer has a binding win and a deposit. Obavia is now mediating a sale it is contractually not party to under Structure A.

**What we must change.** The floor field must be labelled by what it is, and the other number drawn live beside it. If the floor is the hammer, the line reads "**Hammer $4,400 → you get $4,180**". If the floor is net, the reverse. Ray will pick "net"; buyers see hammer; the engine does the arithmetic. And a floor whose net is below the payoff needs a confirm with the shortfall in dollars: "You'll bring $70 to close. OK?"

---

## Scenario 6 (repeat use, happy path with the usual pettiness): the Tacoma, the second time round

**The car.** 2009 Tacoma, 198k, title in Ray's safe, cost basis $6,100, 52 days, no lender. Ray sets floor $7,400 net, meaning hammer $7,790 with the 5% dealer fee, 7 days, ends Wednesday 3 pm. Condition pass: drives, A/C cold, one warning light (ABS), tyres 5/32. Show It takes him 14 minutes, most of it moving the truck so the rear three-quarter silhouette lines up. Reach posts it.

**Live.** 31 watchers. Hammer **$8,650**, winner **Luis Carranza**, Baytown. Luis does ID, signs the Buyers Guide (as-is, ABS light in the defect box), the bill of sale, the 130-U. Marisol opens the sale: cash, $8,650, odometer 198,412 read into every document. The 130-U seller line prints **"Delgado Motors LLC (Marisol Treviño)"** because she is the staff member at filing, entered by full legal name. She files Thursday: $540.63 motor vehicle sales tax at 6.25%, Harris County title and registration fees, plates. Her question, which the Desk should answer and doesn't: "does it count for the VIT statement?" Yes: a retail sale by Delgado Motors goes on the monthly inventory tax statement at the sale price, unit tax due by the 10th. A dealer-to-dealer sale would not; this is not that.

**The petty parts.** Beto, Wednesday noon, truck on his lift for a brake job Ray asked for last week: *"is it still mine to fix?"* Nobody told Beto the truck was in an auction with its tyre depth written down. Rule: once listed, recon is **frozen**; a "listed, don't touch" flag per car, and if Beto must finish something the listing shows "being worked on: brakes" with no change to the grade. Saturday pickup, QR works, payout Monday. Ray lists two more, which is the whole point.

---

## Scenario 7 (ugly): the winner goes silent

**The car.** 2012 Impala, floor $3,100, hammer $3,650, winner **"K. Pham"**, deposit held by Apple Pay. No ID scan, no signature, no reply for 36 hours. Under-bidder was at $3,600.

**What Ray sees.** "Sold $3,650" with a coin sound he now resents. Nothing says when he gets the car back. Reach already posted "sold".

**What we must change.** A forfeit clock the dealer can see; at expiry the deposit goes to the dealer (under A it is his sale), the under-bidder gets a 12-hour second-chance offer at $3,600, Reach re-posts "back on", and Ray taps nothing. Print whose the forfeited deposit is; if it is ours, Ray will decide we built the silence in on purpose.

---

## Scenario 8 (edge): payout timing against the floorplan due date

**The car.** Any car on the line. The line's 90-day curtailment on the Altima is **November 2**: full payoff or the lender takes it. Auction ends October 28. Buyer pays in full October 29. The blueprint pays Ray "at title filing". Ray cannot file the title until the lender releases it; the lender releases it on payoff; payoff needs the money. Ray's cash is in 37 other cars.

**What must change.** The floorplan payoff goes **direct from the hammer to the lender** the day the buyer pays, as the big auctions do; title release follows; Ray's net lands after the filing. That is a Stripe Connect question (split payouts) and a counsel question (who holds funds under A). Beside the floor: "**Line due Nov 2.** Ends Oct 28; payoff reaches the lender by Oct 30 if the buyer pays on time." If the dates don't fit, refuse 7 days and offer 3.

---

## The Floor screen, stressed

**What number does Ray type?** Net to him, always. He will never think in hammer. Label it "**The least you'll walk away with**", show the hammer the buyer must reach beside it, and show the buyer the hammer only.

**What must be beside it, in this order:** (1) **What you owe on it**, to whom, next due date; (2) **Cost basis**, one number, tap for the parts (buy, fees, transport, recon done, recon not done); (3) **The band**, after the condition pass, labelled "what the lane would pay" for *this* condition ("MMR" is a brand he has no login to); (4) **Days on lot** with holding cost at his rate, set once ($35/day; 94 days is $3,290, which moves him more than any band); (5) **Your retail ask** and the last real offer; (6) for a BHPH man, **what a note would have grossed** against cash today; (7) **You get / you bring**, live.

**What makes him refuse, and the screen should refuse first:** title not in hand and no lender lead time; net below payoff without a confirmed "I'll bring $Y"; a deposit or signed contract already on the car in the Desk; the car physically at Beto's when the Buyers Guide and pickup pin say the lot; a binary condition pass he'd have to lie on; a weekend close on a title a bank releases on weekdays.

---

## The four questions, from the lot

**1. A to launch, B as target, or straight to B?** A to launch, told straight: under A **he** is the seller, and every DTPA, Buyers Guide and double-sale consequence lands on his GDN. Ray accepts that; it is his car. But B is where his benefit is: his sale to Obavia becomes dealer-to-dealer, off his VIT statement, no sales tax at his end, the public-sale paperwork and complaints ours. Dealers who grasp that will push us to B faster than counsel. Launch on A because it exists; give dealers B's date.

**2. Buyer's premium or dealer-side fee?** Dealer-side fee, deducted, shown as "you get" beside the floor. Ray does not care who nominally pays; he cares that the number he typed is the number that lands. A buyer's premium makes the public's hammer lower (they net it out, the good ones) and makes the sales tax question worse. Single digits either way; at 13% Peak is pricing the dealer's cheap exit, not a retail one.

**3. As-is only, or a 48-hour starts-and-drives above a price?** As-is only at launch, with a **three-state** drive question and a mandatory defect line. A 48-hour guarantee on a BHPH dealer's losers is a return policy on the cars he is dumping because they have problems; the first "it threw a code on I-45" and he pulls every listing. Offer it later, only on cars that pass a check Beto signs.

**4. Deposit; refundable on a loss?** Held, not charged; released on a loss within a day (the Apple Pay hold does this). Amount: **$250 under $5,000 hammer, $500 above, $1,000 over $15,000**; Peak's $50 does not stop a flake. On a silent winner it is forfeited to the dealer under A, within a stated clock.

## Three changes to the blueprint I'd fight for

1. **Title location and lender lead time are asked before the floor, and they gate the listing.** The blueprint assumes the dealer has the title. Half of a BHPH lot's cars are on a line, at a bank, or mid-repo.
2. **Payout pays the lender first, direct, the day the buyer pays; the dealer's net follows the filing.** "Payout at title filing" is circular for any floored car and will kill the first pilot that is not a cash lot.
3. **The condition pass precedes the floor, has a third drive state and a defect line, and freezes recon.** The band is meaningless before condition, and "the least you'll take" is net to the dealer, with hammer, fee, payoff, holding cost and the buyer's deadline shown live beside it.

## Three facts I am not sure of (for counsel / owner)

1. **Whether a buyer's premium or auction fee is part of "total consideration" for Texas motor vehicle sales tax**, and whether a dealer-side fee changes that. I believe the Comptroller treats a required buyer's fee as part of the taxable price; not verified.
2. **The repossession paperwork for a lienholder-dealer reselling a repo** (the affidavit of repossession form number, whether a certified title copy is accepted, and whether a BHPH dealer can run it entirely in webDEALER). I have called it "the affidavit of repossession"; the form number and the county-trip requirement need checking.
3. **VIT treatment under Structure B**: that a dealer's sale to an Obavia GDN is excluded from the dealer's monthly inventory tax statement as a dealer-to-dealer sale, and that the public sale then goes on Obavia's statement. I am fairly sure of the first, less sure how a consignment (title never passing to Obavia) is treated; if title never passes, it may still be Ray's retail sale for VIT.
