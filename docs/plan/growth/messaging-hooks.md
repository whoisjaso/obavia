# Messaging hooks and the 15-second ads

Written October 12, 2026 by marketing, with creative-edge. This file covers messaging before pixel (plan AD5, AD6, AD7; marketing mandate).

**Read this first.** Two points in the brief differ from the plan.
1. The brief asks for dealer variants "for the week-5 ads". Plan §1.1, CF2 says: "Tolerance is set by F, the flat seller fee per started car, which is $0 until the GDN. So dealer paid acquisition does not run before Phase 3." Plan §2, week 10: "dealer ads live on `Lead` with G capped." So the dealer variants are written now and run from **week 10 (Dec 14, 2026)**. Running them in week 5 would need a dated line in plan §5 first. Only the buyer variants run from Mon Nov 9.
2. Phases Phase 2 says "The 15-second ad (built)". The built ad in `films/src/ad/` (`timeline.ts`: "You buy the car… You close the deal") is a Desk ad for dealers. It is not a lane ad for buyers. The five buyer cuts below are new work for creative-edge, due cut by **Fri Nov 6, 2026** so they can go live Mon Nov 9.

---

## 1. The majority hooks

Obavia is a new category: **the public lane behind the dealer's desk.** It is never "an auction app" (marketing mandate; CF psych 16, 17).

**Dealers.** One sentence about a losing car and a Thursday:

> Name the least you'll take on the car you're losing money on, and its bidding closes Thursday at 3.

Every part of the sentence describes something the product does, and none of it is a forecast. The dealer sets the floor on the Floor screen. A car listed on Monday with How Long set to 3 closes on Thursday, and the close defaults to a weekday afternoon (`decisions.md` §3.2). A car that doesn't reach the floor doesn't sell. The sentence promises no buyer, no hammer and no saving.

**Buyers.** A price, a time and a name:

> $4,900 on a 2014 Altima, closing Thursday at 3:00 pm, at [dealer legal name] in [city].

The price is the live bid on a real lot, timestamped on the frame. The time is the server's close. The name is the dealer's legal name, with the GDN on the end card (`decisions.md` §2 row 12). The car, price and time here are examples. Each cut is rendered from a lot that is live while the ad runs.

Words no ad uses: "deal", "dealer price", "wholesale price", "below retail", "save", "cheaper", "guaranteed", "you will", any hammer from a past lot, any testimonial, any vendor's name. The reasons are plan §4, `decisions.md` §0 (§215.85(b)(6)) and `dealer-pain-ads.md` rules.

---

## 2. Rules for every 15-second ad

- 9:16, 1080 × 1920, 15.0 s. No voice. Captions are the on-screen words, so the ad reads with the sound off.
- Real material only: Show It photos from the lot (watermarked with the lot code), screen captures of the lane and the Desk as built. Anything dramatized is named on the end card: "Example car. Dramatized."
- Any number on screen carries a source in `content.md` §4. A number with no source is cut from the frame.
- One verb per ad: **Bid** for buyers, **Apply** for dealers.
- Buyers' end card: the Obavia mark · **Bid in the app.** · [Dealer legal name] · GDN [number] · [City], TX · Texas driver's license required. The last line steers who arrives (AD6: Texas-license deposits ÷ deposits ≥ 95%).
- Dealers' end card: the Obavia mark · **Apply.** · The public lane behind your desk. · For licensed Texas dealers. The last line steers who arrives (AD6: valid-GDN applications ÷ applications ≥ 80%).
- Dealer ads are slow, with every beat held long enough to read twice, and one sound only: the notification (`dealer-pain-ads.md`). Buyer ads use the brand's sound: the tick per increment and the thump on the server's acknowledgment (creative-edge mandate).
- Reduced motion: a still-frame version of each ad is exported for placements that need it.

Before the first dollar (plan §4, deviations):
- The four standard events are verified firing in Events Manager (AD1), by Mon Nov 9, 2026.
- G for buyer ads is written in `model.md` §1 (owner, Fri Oct 30, 2026).
- Optimization is on `AddPaymentInfo` for buyers and `Lead` for dealers, and stays there until 50 conversions per week per ad set (AD2).
- The 3-second-viewer audience is created on the day spend starts and logged in `content.md` §5. It is not served (AD9).

---

## 3. Buyers: five variants, live Mon Nov 9, 2026

All five share the hook's formula: price, time, name. Each variant changes only which of the three leads, plus V4's second number and V5's deposit line. All five launch together in one campaign, one zip code, one ad each. The launch is week 5's one message change.

| V | One sentence (the hook as this variant leads it) |
| --- | --- |
| BV1 | **$4,900.** 2014 Altima, closing Thursday at 3:00 pm, at [dealer]. |
| BV2 | **Closes Thursday at 3:00 pm:** a 2014 Altima at $4,900, at [dealer]. |
| BV3 | **[Dealer], [city]:** a 2014 Altima at $4,900, closing Thursday at 3:00 pm. |
| BV4 | **$4,900 bid, $5,520 out the door.** 2014 Altima, closing Thursday at 3:00 pm, at [dealer]. |
| BV5 | **$250 to bid, refunded if you lose.** 2014 Altima at $4,900, closing Thursday at 3:00 pm, at [dealer]. |

### BV1 · price first

| Time | Shot | On-screen words |
| --- | --- | --- |
| 0.0–2.5 | Full-bleed Show It photo of the car on the lot at noon, front three-quarter | **$4,900** (large), "bid at 2:10 pm Mon" (small, timestamp) |
| 2.5–6.0 | Screen capture of the lane: a thumb drags the price up, one tick per $100, release, tap Bid; the price punches on the acknowledgment | $4,900 → $5,000 |
| 6.0–9.0 | The time ring, slowly closing | **Closes Thu 3:00 pm** |
| 9.0–12.0 | Wide photo of the lot with the dealer's sign | **[Dealer legal name]** · [City] |
| 12.0–15.0 | End card | Bid in the app. · GDN [number] · Texas driver's license required. |

Sound: a tick per increment and one thump on the acknowledgment at about 5.5 s. Nothing else.

### BV2 · time first

| Time | Shot | On-screen words |
| --- | --- | --- |
| 0.0–3.0 | The ring alone on black, turning blue for the last two minutes | **Closes Thu 3:00 pm** |
| 3.0–6.0 | Show It photo, rear three-quarter | 2014 Altima · **$4,900** |
| 6.0–9.5 | Lane capture: a bid lands in the last two minutes, and 2:00 comes back with one refill motion | 2:00 |
| 9.5–12.0 | Dealer's sign | **[Dealer legal name]** · [City] |
| 12.0–15.0 | End card | Bid in the app. · GDN [number] · Texas driver's license required. |

Sound: one thump at about 9 s.

### BV3 · name first

| Time | Shot | On-screen words |
| --- | --- | --- |
| 0.0–3.0 | The dealer's sign and front lot, real, daylight | **[Dealer legal name]**, [City] |
| 3.0–6.0 | Show It photo of the car | 2014 Altima |
| 6.0–9.0 | Lane capture: the price and the ring | **$4,900** · Closes Thu 3:00 pm |
| 9.0–12.0 | The VIN plate photo (a mandatory Show It angle), last six of the VIN legible | VIN …[last six] |
| 12.0–15.0 | End card | Bid in the app. · GDN [number] · Texas driver's license required. |

Sound: silence until one tick at 6 s.

### BV4 · two numbers

| Time | Shot | On-screen words |
| --- | --- | --- |
| 0.0–3.5 | Lane capture: bid and total stacked 2:1, the way the glass shows them | **$4,900** / $5,520 |
| 3.5–6.5 | The total's small number highlighted, then the words | Tax, title and fees already in. |
| 6.5–9.5 | Show It photo of the car | 2014 Altima · Closes Thu 3:00 pm |
| 9.5–12.0 | Dealer's sign | **[Dealer legal name]** · [City] |
| 12.0–15.0 | End card | Bid in the app. · GDN [number] · Texas driver's license required. |

Sound: one tick at 3.5 s. Source: the total is computed by the Desk's `money.ts` (`decisions.md` §2 row 2; `content.md` S07). The tax-rate citation is UNVERIFIED, so no percentage goes on screen.

### BV5 · the deposit line

| Time | Shot | On-screen words |
| --- | --- | --- |
| 0.0–3.0 | The deposit sheet as it appears on the first bid (Whop hosted checkout, phases "Whop, exactly where it sits") | **$250 · refunded if you lose** |
| 3.0–6.0 | The hollow chip landing on the lane | Held, not spent. |
| 6.0–9.0 | Show It photo of the car | 2014 Altima · **$4,900** · Closes Thu 3:00 pm |
| 9.0–12.0 | Dealer's sign | **[Dealer legal name]** · [City] |
| 12.0–15.0 | End card | Bid in the app. · GDN [number] · Texas driver's license required. |

Sound: the thump when the chip lands at about 4 s. Source: `content.md` S02, S06. The refund timing is not printed (S06 conflict).

Per-variant floors, read every Monday from Mon Nov 16 (model §3.1, worst defensible): CPM ≤ $80; link CTR ≥ 2%; click → deposit ≥ 2%; cost per deposit ≤ $200; Texas-license deposits ≥ 95%.

Lot swaps. Each cut runs only while its lot is live. When that lot closes, the same formula is re-rendered from the next live lot. A swap keeps the words, shot order, audience, event and budget, so it is not a change under §5. If no lot is live, the ad set pauses. It never shows a closed lot.

---

## 4. Dealers: five variants, live week 10 (Mon Dec 14, 2026)

These are written now and filmed with the Let It Go dealer film on Fri Dec 4, 2026 (plan §2.1). They link to the dealer page: headline, the film, then the embedded application (`application.md`).

| V | One sentence |
| --- | --- |
| DV1 | Name the least you'll take on the car you're losing money on, and its bidding closes Thursday at 3. |
| DV2 | That car has been on your lot 74 days; name your floor tonight, and its bidding closes Thursday at 3. |
| DV3 | Every week it sits costs you floorplan, insurance and space; name your floor, and its bidding closes Thursday at 3. |
| DV4 | Its bidding closes Thursday at 3, and if it reaches your floor, the Desk fills the 130-U from the sale. |
| DV5 | Its bidding closes Thursday at 3, and if the winner doesn't pay in 48 hours, their $250 is yours and the car relists in one tap. |

Every dealer ad holds each beat about five seconds and uses one sound: the notification.

### DV1 · the floor

| Time | Shot | On-screen words |
| --- | --- | --- |
| 0.0–5.0 | Dusk on a lot. One car, held still. | The car you're losing money on. |
| 5.0–10.0 | Desk capture, Floor page: "The least you'll walk away with". The dealer types 3,400. | Name the least you'll take. |
| 10.0–15.0 | Desk Go, then the notification sound; end card | **Bidding closes Thursday at 3.** · Apply. · The public lane behind your desk. · For licensed Texas dealers. |

### DV2 · the days

| Time | Shot | On-screen words |
| --- | --- | --- |
| 0.0–5.0 | Desk capture: the Let It Go days ring, amber, reading 74 | 74 days on your lot. |
| 5.0–10.0 | The same car on the lot at night | Name your floor tonight. |
| 10.0–15.0 | Notification sound; end card | **Bidding closes Thursday at 3.** · Apply. · The public lane behind your desk. · Example car. Dramatized. |

### DV3 · the holding cost

| Time | Shot | On-screen words |
| --- | --- | --- |
| 0.0–5.0 | A wall calendar on the lot office, one week turning | Every week it sits. |
| 5.0–10.0 | Desk capture, Floor page, the holding line, **with no dollar figure** (S09 is UNVERIFIED, so the line is blurred to a shape) | Floorplan. Insurance. The space. |
| 10.0–15.0 | Notification sound; end card | **Bidding closes Thursday at 3.** · Apply. · The public lane behind your desk. |

### DV4 · the paperwork

| Time | Shot | On-screen words |
| --- | --- | --- |
| 0.0–5.0 | Desk capture, Live: the ring closing | Bidding closes Thursday at 3. |
| 5.0–10.0 | Desk capture, Sold, then Open the sale | If it reaches your floor, |
| 10.0–15.0 | Desk capture: the 130-U filled from the sale; notification sound; end card | the Desk fills the 130-U. · Apply. · The public lane behind your desk. |

Source: the Desk fills the 130-U from the sale, already built (`dealer-pain-ads.md` pain 3; phases "What is already built").

### DV5 · the worst case

| Time | Shot | On-screen words |
| --- | --- | --- |
| 0.0–5.0 | Desk capture, Sold: the buyer's deadline in big type | They have 48 hours to pay. |
| 5.0–10.0 | Desk capture, at expiry: Relist | If they don't, their $250 is yours. |
| 10.0–15.0 | One tap on Relist; notification sound; end card | Relist in one tap. · Apply. · The public lane behind your desk. |

Sources: `content.md` S03 (48 vs 72 hours: owner resolves by Fri Oct 16) and S04. If the owner picks 72, DV5's words change before the film day.

Per-variant floors, read from Mon Dec 21 (model §4.1, worst defensible): CPM ≤ $80; link CTR ≥ 2%; click → application ≥ 3%; cost per application ≤ $133; valid-GDN applications ≥ 80%; cost per first lot ≤ $533.

---

## 5. One change per week per funnel, logged in the scorecard

Plan AD5: "No audience or pixel change is made in the same week as a message change." Number: "One change per week per funnel; logged in the scorecard."

- **A change** is any edit to an ad's words, shot order, hook, end card, audience, optimization event, placement, or a budget step outside model §7's +10% rule. Lot swaps (§3) and +10% scaling steps inside model §7 are not changes.
- **One per funnel per week.** The buyer funnel and the dealer funnel each get at most one change between one Monday and the next. A message change and an audience or pixel change never share a week.
- **What decides it.** The Monday bottleneck (plan §3). If CPM is outside $30–80 or link CTR is under 2%, the change is to the ad. If click → deposit or click → application is under its floor while CPM and CTR are in range, the change is to the page or the application, not the ad. If the wrong people arrive (AD6 ratios under their floors), the ad copy is rewritten and the pixel is left alone.
- **Where it is logged.** In `scorecard.md`, in that week's row, under "One action · owner · date", one line per funnel in this form:

  `Buyer · change: BV2 end card "Texas driver's license required" moved to 0.0 s · because Texas-license deposits 88% < 95% · marketing · Mon Nov 23`

  The next Monday's second line reports what that change did to the number it targeted. If a week makes no change, the line reads `Buyer · no change · [the number that held]`.
- A change that is not logged is a deviation (plan §4: "A build, screen, message, channel or spend that is not in this file").

Next action: creative-edge cuts BV1 to BV5 from the first live pilot lot by Fri Nov 6, 2026, for launch Mon Nov 9.
