# 05. Operations and money: one car, one month, one pilot

Angle: unit economics and operations. Every dealer and person here is fictional. Numbers are stated with their basis; anything I could not verify is in the "not sure" list at the end. Model script: `sim/work/model.py` (2,000-run Monte Carlo per floor; the hammer distribution is my assumption, not data).

## 1. The car

**Lot 1, Delgado Motors, Irving (fictional).** 2016 Nissan Altima 2.5 S, 118k, clean title, A/C blows warm. Bought at the lane 74 days ago for $4,900, $600 recon, **basis $5,500**. MMR today **$5,200**. Asking $8,995 on Marketplace since day 9; eleven "is this available", one no-show. Holding cost $35/day (blueprint §3 low end): **$2,590 burnt so far, $245 a week from here.** Floorplanned with a NextGear-style line: interest about 10.5% APR plus a $45 fee per curtailment; the lender wants payoff within two business days of sale.

Rafael Delgado's floor: $5,200 (he says "I'm not going under MMR"). Marisol, his office manager, says $4,800 "because it's October and the A/C is warm".

### 1.1 What one sale costs under each structure (hammer $6,070, the model mean at a $5,200 floor)

| Line | A: dealer sells, flat fee | B: Obavia auction of record, 5% premium | B at 13% (Peak) |
| --- | --- | --- | --- |
| Hammer | $6,070 | $6,070 | $6,070 |
| Buyer's premium | 0 | $304 | $789 |
| Buyer's all-in before tax | $6,070 | $6,374 | $6,859 |
| Deposit: $250 Apple Pay, captured then applied/refunded (Stripe keeps 2.9%+30c on refunds) | $7.55 | $7.55 | $7.55 |
| Hammer payment. A: buyer pays dealer at pickup (cashier's check or dealer's own terminal), no Obavia processing. B: 55% card at 2.9%+30c, 45% ACH at 0.8% capped $5 | 0 | $104 (card $185 / ACH $5, blended) | $112 |
| Connect payout to dealer (0.25% + 25c) | 0 | $15 | $15 |
| Chargeback reserve, 1% of GMV collected by Obavia, plus $15 per dispute at an assumed 2% dispute rate | 0 | $64 + 0.30 | $69 + 0.30 |
| Push (APNs) free; SMS, about 30 segments per car at $0.0075 incl. carrier fees | $0.25 | $0.25 | $0.25 |
| Support: 2.5 contacts, 10 min each, $22/hr loaded | $9 | $9 | $9 |
| Media: 12 photos, 20 s walkaround, 10 s audio, about 60 MB on R2 ($0.015/GB-mo, no egress); 2,000 feed views | <$0.01 | <$0.01 | <$0.01 |
| Transport: partner quote ~$150 for 50 miles, Obavia keeps 10% | +$15 (if taken, 30% take rate) | +$15 | +$15 |
| **Obavia revenue** | **$99 or $199 flat** | **$304** | **$789** |
| **Obavia variable cost** | **$17** | **$200** | **$213** |
| **Obavia contribution per sold car** | **$82 / $182** | **$104** | **$576** |
| Dealer net (hammer, minus Obavia fee, minus nothing else) | $5,971 / $5,871 | $6,070 | $6,070 (but see 1.2) |

Two things the table hides. First, under B, Stripe fees eat a third of a 5% premium; a 5% premium with card payment is barely a business until volume gives us a negotiated rate. Second, the dealer's net under B looks best only if buyers do not net the premium out of their bids. Everywhere a premium exists (Peak, Copart, BaT), buyers bid "all-in"; a 13% premium pushes the hammer down roughly 8 to 10%. On this car that is $500 to $600 out of Rafael's pocket, not ours. The blueprint's §2 claim "a premium low enough that the dealer's hammer price can be higher" is true and is the whole reason to stay in single digits.

### 1.2 The dealer against his alternatives, same car

| Exit | Price | Fees | Transport | Time (holding) | Risk | **Net to Rafael** |
| --- | --- | --- | --- | --- | --- | --- |
| Manheim Dallas, red light | $5,100 (0.98×MMR) | sell fee $225, CR $75 | $120 to the lane | 7 days to sale day, $245 | 5% arbitration at $400 = $20 expected; unfulfilled-sale penalty if he pulls it | **$4,415** |
| Marketplace, keep grinding | $7,900 eventually (asking −12%) | 0 | 0 | 35 more days, $1,225 | no-shows, a cash buyer who wants the title "now", 130-U by hand | **$6,675** on paper, but 35 days of Rafael's time and a 30% chance it is still there in December |
| Obavia A, $199 flat | $6,070 | $199 | 0 (buyer picks up) | 7 days + 3 to pickup, $350 | title filing is his own job (already is) | **$5,521** |
| Obavia B, 5% | $6,070 | 0 | 0 | 10 days, $350 | payout timing (below) | **$5,720** |
| Obavia B, 13% | ~$5,520 (hammer depressed) | 0 | 0 | 10 days, $350 | same | **$5,170** |

Obavia beats the lane by $1,100 to $1,300 on a $5,200 car. It does not beat Rafael's fantasy Marketplace number, and he will quote that number back at us. The sentence that wins him is: "Marketplace pays $6,675 in December if it pays at all; we pay $5,700 on the 22nd." That is the two-bar screen with dates on it.

### 1.3 The month at Delgado (8 cars, model, 2,000 runs)

| Floor | Sold of 8 (after one relist at −5%) | First-run no-sale rate | Mean hammer | Hammer ÷ MMR | p10 / p90 |
| --- | --- | --- | --- | --- | --- |
| $4,800 (Marisol) | 7.99 | 7% | $5,911 | 1.14 | $4,910 / $6,980 |
| $5,200 (Rafael) | 7.83 | 19% | $6,068 | 1.17 | $5,200 / $7,070 |
| $5,600 | 7.36 | 34% | $6,261 | 1.20 | $5,600 / $7,170 |
| $6,000 | 6.48 | 50% | $6,460 | 1.24 | $5,850 / $7,260 |

The lesson a dealer will not want to hear: the floor barely moves the mean hammer ($5,911 vs $6,068) but moves the no-sale rate from 7% to 19%, and every no-sale is seven more days at $35. A floor at MMR is fine; a floor $400 over MMR costs him more in holding than it earns in hammer. The Floor page should draw the holding line next to the number pad, not just the wholesale band.

Obavia's month on these 8 cars: A at $99: $776 revenue, $59 Stripe. A at $199: $1,558. B at 5%: $2,375 revenue against $935 Stripe. B at 8%: $3,810 / $960. B at 13%: $6,189 / $998, with the hammer depression not modelled. Subscription $299: $299 regardless of whether 8 or 3 sell, which a dealer will cancel the first month 3 sell.

**Payout timing against the floorplan.** Blueprint §5.2: "Payout at title filing." Under B that is: auction closes Friday night; buyer pays by card Saturday (funds available to Obavia Tuesday, T+2) or by ACH (confirms in up to 4 business days, Thursday); Rafael files the 130-U in webDEALER when the buyer signs at pickup, Sunday or Monday; Connect payout T+2 after we release: **Wednesday to Friday of the following week.** NextGear wants the unit paid off within two business days of sale and starts a $45 fee and a default clock after that. Rafael either fronts $5,500 himself for a week per car, or his line flags him. On 8 cars a month that is $44,000 of float. Under A none of this exists: the buyer pays Rafael at the lot. **Under B the release rule has to be "payout on buyer's cleared funds", not "on title filing", and ACH must be the buyer's option only if they accept pickup after it clears.**

## 2. Six scenarios

### 2.1 Happy path: the Altima, week one

Tuesday 10:14, Rafael taps Let It Go, types 5200, shoots twelve photos (the silhouettes make him retake the odometer twice because of glare), 20 seconds of walkaround, 10 seconds of engine. The Buyers Guide generates as-is. Reach posts "Auction ends Tuesday" to the Page and Marketplace. By Friday 41 watchers, 6 bidders, 2 Apple Pay deposits of $250 held. Monday evening the price sits at $5,650. Tuesday 9:58 pm, Keisha Barnes (nurse, Grand Prairie, no dealer licence, the daughter needs a car for UTA) drags to $6,100; 9:59 Dion counter-bids to $6,150; soft close adds two minutes four times; Keisha wins at $6,350. Chest, confetti. ID scan works. She signs the Buyers Guide, bill of sale, 130-U on her phone. The sheet says "Pay $6,350 at pickup, Delgado Motors, Thursday 2 to 5 pm." She asks, by text at 10:40 pm, "do yall take card". Rafael's terminal charges 3%, so he says cashier's check. Thursday she brings one. Marisol files the 130-U in webDEALER Friday; plates mailed the week after. Nothing broke. What we must change: the "how you pay" question has to be answered before the win screen, by the dealer's settings, not by a 10:40 pm text.

### 2.2 Ugly: the deposit hold expires

The deposit is an Apple Pay **hold**, placed at first bid. Card authorisations expire in 7 days (Visa, Mastercard; extended auth to 30 days only on some brands and merchant categories, and Apple Pay with a hold is iffy). Keisha bid on day 1 of a 7-day auction; the hold dies on day 7 at 10:14 am, twelve hours before the close. She wins at 9:59 pm with no deposit on file. She is honest. Dion, the underbidder, was the problem case the night before: bid on day 1, hold lapsed, outbid, nothing to forfeit, nothing to lose, and he bid up to $6,150 "to see". Capture the deposit instead of holding it and we pay $7.55 per bidder on every refund and get a "they CHARGED me $250 to lose" one-star review. What we must change: capture the deposit (not hold), refund losers automatically within an hour of close, and say so on the chip: "$250, back within the hour if you don't win." Budget the fee. At 6 bidders a car that is $45 a car in dead Stripe fees, $7 if we only take the deposit from bidders inside the last 24 hours (the only ones whose bid can win).

### 2.3 Ugly: 9 pm, the car won't start

Pilot week 2, Triple J-style lot. Winner Tomás Ruiz, 24, drove from Waco, pays cash, car (a 2012 Camry, $4,100 hammer) starts, drives 30 miles, dies on I-35 at 8:50 pm. He texts the number in the app, which is Obavia's number, because the blueprint has no "who answers" line. The dealer's phone is off; the owner's phone (us) is on. What Tomás sees: an as-is Buyers Guide he signed on a 6-inch screen. What he does: Google "Obavia reviews". What he texts the dealer at 9 pm: "yall sold me a car that died in 2 hours, im calling the DMV tomorrow". Under A, the law says the dealer is seller and as-is holds, if the Buyers Guide was also physically on the car at pickup (blueprint §4). Under B, it is our name on the review. What we must change: an after-hours line that is a person (Rafael's cell for his cars, ours for the app), a roadside partner on the pickup screen ($69 tow to the lot within 50 miles, paid by whoever the 48-hour rule says), and "it starts and drives for 48 hours" above $3,000 so this is a $300 repair, not a review.

### 2.4 Edge: the out-of-state winner

Lot 4, a 2015 F-150 with a $9,400 hammer, won by Brent in Shreveport. Texas sales tax is collected on a Texas title application only; a Louisiana registrant pays Louisiana at his parish, so the dealer must not collect the 6.25% and must not file a Texas 130-U. The Desk's sale flow assumes a Texas buyer and a Texas county. Brent needs a Texas temp tag (a buyer's tag, which the dealer issues through webDEALER) to drive it home, and the title signed over, not filed. Transport quote: 220 miles at $1.90 a mile, $420, our 10% is $42. What we must change: a "registering outside Texas" branch at ID scan that drops tax, drops the 130-U, keeps the bill of sale and the title assignment, and issues the tag. Until it exists: Texas-licence buyers only, stated on the first bid.

### 2.5 Failure: the no-pay

Lot 6, a 2013 Impala, floor $2,800, hammer $3,350, winner "Jay" with a $250 deposit. Pickup window passes. Texts unanswered. Day 3, the dealer relists; the deposit is forfeit, which pays for 7 days of holding and nothing else. The second auction's buyers can see "relisted", and bid lower; the model says a relist at −5% sells, but the reality is the first auction's top bidders moved on. The dealer's trust goes: "your buyers don't show up either." In the pilot, one no-pay in 5 is 20%; Peak's rhythm (deposit $50, premium 13%) suggests they carry a no-pay rate they absorb with the premium. What we must change: an auto-offer to the underbidder at their max within 24 hours (eBay's second-chance), the deposit scaled to the car ($250 under $5,000, $500 to $10,000, 5% above), and a no-pay count on the buyer that bars a second one.

### 2.6 Repeat use: Delgado, month three

Rafael now lists on a rhythm: Tuesday close, two cars a week, floor at MMR because he watched the no-sale table. Marisol handles pickup Thursdays. He has stopped reading the lane's run list for his losers. The 16 cars in month three: 14 sold, mean 1.16×MMR, two relists. On B at 5% that is $4,700 to Obavia and $1,800 to Stripe; on A at $199 it is $2,800 and $120. He asks for a monthly invoice instead of a per-car fee, because his bookkeeper hates 14 lines; the $299 subscription that looked unattractive in month one looks fine at 14 cars. What breaks: his floorplan rep has noticed that Obavia payouts arrive by Connect and not by cashier's check, and asks for a "title release letter" per unit. What we must change: a per-car remittance PDF for the lender, and a fee switch that moves a dealer from per-car to subscription once they cross 6 cars a month.

## 3. The Triple J-style pilot, week by week

Five cars, fictional dealer "Triple J-style" (no real facts used). Floors set by the owner.

**Week 1 (listing).** Day 1 breaks on the dealer side, not the buyer side: photos. Twelve guided photos and a walkaround take 25 minutes per car in the heat; the lot hand does three and stops. Engine audio captured in the wind is noise. Reach posts, but Marketplace's hand-off is manual, so the listings go up a day late. Buyer registrations: 60 to 90 from TikTok, 9 deposits. Support: 14 contacts, mostly "is the price with tax" and "can I come see it". Cost of week: $110 of staff time, $6 of SMS.

**Week 2 (first closes).** Three cars close Tuesday. Two sell at 1.12× and 1.19× MMR; one no-sale (floor $1,100 over MMR). The 9 pm call happens on the Camry (2.3). The first negative review, Thursday, Google: "Won the car, then they told me cash only and the title isn't in my name for 3 weeks. App is slick, the dealer is not." Three stars. The no-pay (2.5) happens on car 4 the following Tuesday.

**Week 3 (titles).** The 130-Us file. One is kicked back by webDEALER (the lot already had a seller-line rejection on September 30 per `dealer-pain-ads.md`), fixed in a day. The relisted no-sale car sells at the −5% floor. Pilot net: 4 of 5 sold inside 16 days, mean 1.15×MMR, one no-pay, one tow, one review.

**What the no-pay does to trust:** the dealer stops answering our calls for two days. One no-pay in five reads as "one in five" to a dealer, whatever the sample size. The pilot needs ten cars, not five, so a single no-pay reads as 10%.

## 4. The four questions, from the money

**1. A first, B as target.** B at 5% nets us $104 a car after Stripe and reserves; A at $199 nets $182 with no float, no chargeback exposure and no floorplan collision. A is more profitable per car at launch and the dealer's net is within $200 either way. B earns only when the premium is 8% or more, and 8% starts to depress hammers. Go B when (a) we have a negotiated card rate, (b) we want the dealer-to-dealer lane, (c) we have the GDN cost ($300k bond ceiling is not it; the premises and compliance are). Counsel's answer on whether a per-car success fee under A reads as brokering decides whether A is $199 per sold car or $299 a month.

**2. Zero premium and a dealer-side fee.** Per-car $199 at launch, flipping to $299 a month at six cars. The reasons: the premium is paid by the buyer and comes out of the hammer anyway, so it is the dealer's money with a worse label; the two-bar screen ("floor, retail") lies if the buyer's price is hammer plus 13%; and under A the premium is the exact thing counsel is nervous about. If B happens, 5% capped at $500, and the cap is the marketing line.

**3. 48-hour starts-and-drives above $3,000.** Cost: the model says 1 in 12 cars will trigger a claim averaging $350 (tow plus a battery, starter or sensor); that is $29 a car, charged to the dealer as a $35 line or built into the $199. The return is the review in 3 and the 9 pm call being a tow, not a lawsuit. Below $3,000, as-is, red-light rules, title and odometer arbitration only.

**4. Deposit $250 under $5,000, $500 under $10,000, 5% above; captured, not held; refunded to losers within an hour of close, automatically.** Forfeit on no-pay, paid to the dealer less our $7.55. Not a hold: a 7-day auction outlives a card authorisation.

## 5. Three changes I would fight for

1. **Payout on cleared funds, not on title filing**, and under A the buyer pays the dealer at the lot. "Payout at title filing" puts $5,500 of float per car on a floorplanned dealer for a week.
2. **A floor page that draws the holding line**, not just the wholesale band. The no-sale table is the whole economics: floor at MMR sells 7.8 of 8; floor at MMR+$800 sells 6.5 and burns $245 a week on each miss.
3. **A named after-hours phone and a roadside partner on the pickup screen.** Nothing in the blueprint says who picks up at 9 pm. Until someone does, every as-is sale is a review waiting to happen.

## 6. Three facts I am not sure of

1. **The hammer distribution.** I assumed public buyers' max bids centre on 1.20×MMR with 13% dispersion and a 20% thin-market case. Nothing in the repo or the blueprint measures this; the pilot's first ten cars will.
2. **Card authorisation lifetimes for Apple Pay holds through Stripe**, and whether extended authorisation (up to 30 days) is available to our merchant category. If it is, holds may be viable after all and the deposit cost falls to zero.
3. **Floorplan payoff terms** (two business days after sale, $45 curtailment fee, 10.5% APR) are from memory of NextGear-style lines, not a current contract; and the Manheim Dallas seller fee ($225) and CR fee ($75) are 2025-era estimates. Both need a current fee sheet.
