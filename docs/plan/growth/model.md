# Obavia financial model, conservative

Written October 12, 2026 by the Mirror. Owned by marketing and payments. This is the money logic of the three dissections (`dissect-callfunnel.md` §2, `dissect-confirmation-page.md` §2, `dissect-ad-strategies.md` §2) mirrored onto Obavia, with every number traced to where it came from.

Reading rules:
- Every Obavia number is an **ASSUMPTION** until a Monday scorecard row (`scorecard.md`) replaces it. When it is replaced, the replacement is written here with the week number and the assumption is struck through, not deleted.
- Every stat is modelled at the worst defensible end of its range (CF law 1, CF §2.1: "at the upper end of the worst side of the range"). The hoped-for end is listed only so the owner can see the spread.
- Cash collected is the only revenue (CF §2.1 row 5). For Obavia that is F, the flat seller-side fee per started car, counted on `invoice.paid` for a lot with `startedAt`. The hammer is the dealer's money, never Obavia's. F = $0 until Obavia's GDN issues (43 TAC §215.85, `decisions.md` §0). F stays a variable in every formula. Any dollar beside F below is a worked example, not a promised number.
- Nothing in this file is a forecast of income. It is the arithmetic the owner is held to.

Sources used by short name: CF = `dissect-callfunnel.md`; CP = `dissect-confirmation-page.md`; AD = `dissect-ad-strategies.md`; decisions = `../obavia-auction-decisions.md`; phases = `../obavia-auction-phases.md`; collateral = `../collateral.md`; messaging = `../messaging.md`; gtm = `../dealer-gtm.md`.

---

## 1. The gambling budget

CF psychology row 21 and CF §2.4: the budget is set from (a) the amount that can be vaporised with nothing else changing, (b) the capacity to fill, (c) the conservative math. "You only technically lose when you run out of money to gamble with." The pilot and Phase 2 have an AOV of $0, so every dollar of ad spend in weeks 1–12 is (a) in full: it buys the real cost per deposit and nothing else.

| Variable | Meaning | Value | Source |
| --- | --- | --- | --- |
| G_buyer | Buyer-ad gambling budget, weeks 5–12 | **Owner writes this line by Fri Oct 30, 2026.** Worked example below uses $5,000 (ASSUMPTION, illustrative only) | CF §2.4 (b); plan §2.1 |
| G_dealer | Dealer-ad gambling budget, weeks 10–12 | **Owner writes this line by Fri Dec 4, 2026.** Worked example uses $2,000 (ASSUMPTION) | CF §2.4; plan §2.1 |
| Hard cap | No week's spend exceeds G ÷ remaining weeks × 1.3 | Rule | CF §2.12 (+10–30% daily ceiling) |

The dissection's own test budget was "$20 grand over 30 days" for a $4,000–10,000 AOV funnel (CF §2.4). Obavia's AOV is $0 in this window, so G is smaller by construction and is not compared to that figure.

---

## 2. Desk math (the mirror of closer math)

CF §2.5 and §2.6: 8 calls per closer per day, 22 calling days, 80% calendar load, hire 4–6 weeks before the ceiling. The closer is the dealer's desk person (Phase 1–2) and Obavia's own desk (Phase 3, `mirror.md`). A call is a lot.

### 2.1 Lots a desk can run per week

```
capacity_lots_per_week = H × load ÷ h
```

| Symbol | Meaning | Worst defensible | Hoped for | Source |
| --- | --- | --- | --- | --- |
| H | Hours the desk person gives the lane per week | 10 (two hours each weekday) ASSUMPTION | 15 | No dissection figure; owner names the desk person by Oct 16 |
| load | Usable share of those hours | 0.8 | 0.8 | CF §2.6 "never 100%", CF psych 22 |
| h | Desk hours per lot: Let It Go → Go ≤ 4 min (phases Phase 1 exit) + Show It 12 photos and walkaround ~20 min + the Sold call ~5 min + pickup handover (VIN scan, start, signatures in Paper) ~20 min | 1.0 h ASSUMPTION | 0.75 h | phases §1; decisions §3.2 |
| **capacity** | | **8 lots per desk per week** | 16 | derived |
| act-at | Add a desk when L ≥ 80% of capacity two Mondays running | **6 lots per week** | | CF psych 22 |
| lead time | From "need a second desk" to a second desk running | 4–6 weeks | 1–2 | CF §2.5 hiring lead time |

The second desk is a second dealer (phases Phase 2 exit: "two dealers listing") or Obavia's own desk (Phase 3). With a 4–6 week lead time, the first Monday showing L ≥ 6 starts the second-desk clock that day.

### 2.2 Buyers per lot and deposits per lot

The show rate becomes bidders per lot. CF §2.3 conservative show rate is 40–50%; CF ideal 60%. Mirrored:

| Symbol | Meaning | Worst defensible | Hoped for | Source |
| --- | --- | --- | --- | --- |
| B | Distinct bidders a closed lot needs for a live auction (median) | **3** ASSUMPTION | 6 | plan §3; the sim's hammer distribution is UNVERIFIED (decisions §6) |
| p | Deposit → first bid within 7 days | **0.5** ASSUMPTION | 0.7 | mirror of CF §2.3 conservative show 40–50% |
| a | Active share of the standing deposit pool in any week | **0.4** ASSUMPTION | 0.6 | mirror of CF psych 13 (interest decay); the standing $250 is the loyalty mechanism (decisions §1) |
| r | Lots an active bidder bids on per week | **1** | 2 | ASSUMPTION; worst case each active bidder picks one car |

```
new_deposits_needed_for_one_lot_with_no_pool = B ÷ p = 3 ÷ 0.5 = 6
lots_coverable_per_week_by_the_pool   = P × a × r ÷ B      (P = cumulative deposits)
new_deposits_per_week_to_add_ΔL_lots  = ΔL × B ÷ (a × r) = ΔL × 7.5
```

Worked against the plan's floors (plan §2):

| Week | P (cumulative D floor) | Lots coverable = P × 0.4 × 1 ÷ B | L floor | Covered? |
| --- | --- | --- | --- | --- |
| 3 | 13 | 13 × 0.4 ÷ 2 = 2.6 | 2 | yes |
| 4 | 18 | 18 × 0.4 ÷ 2 = 3.6 | 3 | yes |
| 5 | 33 | 33 × 0.4 ÷ 3 = 4.4 | 4 | yes |
| 6 | 50 | 6.7 | 5 | yes |
| 9 | 88 | 11.7 | 6 | yes, with room for a second desk |
| 12 | 121 | 16.1 | 4 | yes |

So the floors are consistent at the worst-defensible values. If B comes in under 2 on the week 3 scorecard, the bottleneck is reach (Marketplace posts, share sheet), not the ad, because there is no ad yet.

### 2.3 The 150-person floor

AD M13 and CF §2.9: a custom audience under about 150 people will not serve; ideal window 72 hours; under 150 in 72 hours, widen to 30 days.

| Audience | Reaches 150 at | Week | Can it serve inside 12 weeks? |
| --- | --- | --- | --- |
| Buyers with a captured deposit (the "booked" audience) | cumulative D ≥ 150 | after week 12 at floors (121 at week 12) | **No.** The deposit → bid window is carried by push and SMS only (plan AD10). |
| Won buyers (won → started window) | 150 wins | far outside | No. Push and the desk call carry it. |
| 3-second viewers of the 15-second ad | 150 viewers = 150 ÷ v impressions; at v = 0.10 (ASSUMPTION, UNVERIFIED; AD gives no view rate) that is 1,500 impressions = $120 at CPM $80 | week 5, within days of spend starting | **Yes**, but it is served only in Phase 3 (plan AD9) and only as direct response, never as content-first. |
| Dealers with a key | 150 keys | far outside | No. |

Rule in code: no retargeting ad set is created against an audience whose size Ads Manager reports under 150. Logged in `content.md` with the date and size.

---

## 3. The buyer cost chain

CF §2.2: cost per call = CPM ÷ 1000 ÷ link CTR ÷ (click → booked). Mirrored: the "call" is the deposit.

### 3.1 Cost per deposit

```
cost_per_impression = CPM ÷ 1000
cost_per_click      = cost_per_impression ÷ CTR
cost_per_deposit    = cost_per_click ÷ c_dep
cost_per_first_bid  = cost_per_deposit ÷ p
```

| Symbol | Meaning | Worst defensible | Hoped for | Source |
| --- | --- | --- | --- | --- |
| CPM | Cost per 1,000 impressions, TikTok and Instagram, one zip code | **$80** | $30 | CF §2.2 range $30–80; AD gives no CPM |
| CTR | Link click-through rate | **2%** | 2% | CF §2.2 "~2%" (one figure, so both ends are 2%) |
| c_dep | Click → captured deposit. CF's click → booked is 3–5% on a page with a video and an embedded form. Obavia's click lands on the Lane and the deposit sits behind an app install and a licence read (two more steps; CF law 5: friction costs volume). | **2%** ASSUMPTION | 5% | CF §2.2, CF law 5; phases Phase 2 exit "bids within three minutes of the TikTok link" |
| **cost per deposit** | $80 ÷ 1000 ÷ 0.02 ÷ 0.02 | **$200** | $30 | derived |
| **cost per first bid** | ÷ p (0.5) | **$400** | $43 | derived |

Ceiling written into the plan: cost per deposit ≤ $200. Above it, the bottleneck is upstream of D and the decision tree in plan §3 applies: CPM above $80 or CTR under 2% → the ad; c_dep under 2% with CPM and CTR in range → the Lane landing and the deposit sheet.

### 3.2 What a deposit is worth (Phase 3 only; $0 before)

A buyer with a standing deposit wins a lot when they are the top of B bidders on a lot that hammers at or above floor, and the car starts at pickup.

```
value_per_deposit = F × (bids_lifetime ÷ B) × S × T
```

| Symbol | Meaning | Worst defensible | Source |
| --- | --- | --- | --- |
| bids_lifetime | Accepted bids per deposit over its life | **3** ASSUMPTION | customers mandate: started → next bid within 30 days; no dissection figure |
| B | bidders per lot | 3 | §2.2 |
| S | sold rate (hammer ≥ floor) | **0.6** ASSUMPTION | the sim's 81–97% at MMR floors (decisions §2 row 3), discounted; CF close rate 20–25% does not transfer because an auction with a floor is not a sales call |
| T | started rate | **0.9** | decisions §2: "one no-pay reads as 10%" |
| **value per deposit** | F × 1 × 0.6 × 0.9 | **0.54 F** | derived |
| at F = $199 (decisions §1 model figure, not a promise) | | **$107** | |

**Max cost per deposit that pays back on F alone = 0.54 F.** At F = $199 that is $107. The worst-defensible cost per deposit is $200. So at the worst end, paid buyer acquisition does not pay back on the seller fee. It pays back only if one of these is true on the scorecard: cost per deposit ≤ $107 (CPM ≤ $43 at 2%/2%, or c_dep ≥ 3.7% at $80), or lifetime bids ≥ 6, or F is higher than the model figure (owner decision, Phase 3, counsel first). Until the scorecard says which, G_buyer is a gamble that buys one number: the real cost per deposit. That is the Phase 2 exit (phases: "cost per first bid known"), and it is the whole point of spending it.

### 3.3 Organic deposits

Reach posts each lot to Marketplace with the lane link (phases Phase 2 Marketing) at $0 cash plus desk time, and the Lane's share sheet costs nothing. Worst defensible: **1 organic deposit per lot opened** (ASSUMPTION; the pilot's ten neighbours on ten cars is the only data point and it was arranged by hand). The scorecard separates organic from paid by the deposit checkout's metadata source field, never by guess (icp-language §3: cold and warm blended is the blind spot that cost one owner half a million).

### 3.4 What G_buyer must be for the plan's floors

Paid deposits needed per week = D floor − L floor × 1 (organic). At $200 each:

| Week | D floor | L floor | Paid needed | Spend at $200 | Spend at $30 |
| --- | --- | --- | --- | --- | --- |
| 5 | 15 | 4 | 11 | $2,200 | $330 |
| 6 | 17 | 5 | 12 | $2,400 | $360 |
| 7 | 8 | 3 | 5 | $1,000 | $150 |
| 8 | 15 | 5 | 10 | $2,000 | $300 |
| 9 | 15 | 6 | 9 | $1,800 | $270 |
| 10 | 15 | 6 | 9 | $1,800 | $270 |
| 11 | 8 | 3 | 5 | $1,000 | $150 |
| 12 | 10 | 4 | 6 | $1,200 | $180 |
| **Total weeks 5–12** | | | **67** | **$13,400** | **$2,010** |
| Phase 2 exit alone (weeks 5–6) | | | 23 | $4,600 | $690 |

If G_buyer is under $4,600 and organic comes in at one per lot, the 50-deposit Phase 2 exit on Nov 22 is reachable only if cost per deposit is under G ÷ 23. That is arithmetic, not an opinion. The owner writes G knowing it. The floors do not move for G; the plan is amended, dated, or the floors stand and the miss is reported as a miss.

---

## 4. The dealer cost chain

Dealer paid acquisition is Phase 3 (plan CF2), because F = $0 before the GDN and a cost with no cash against it is not a chain. The dealer's "call" is the first lot.

### 4.1 Cost per application, key, first lot

```
cost_per_application = CPM ÷ 1000 ÷ CTR ÷ c_app
cost_per_key         = cost_per_application ÷ k
cost_per_first_lot   = cost_per_key ÷ f
```

| Symbol | Meaning | Worst defensible | Hoped for | Source |
| --- | --- | --- | --- | --- |
| CPM | Meta, Texas independent dealers | **$80** | $30 | CF §2.2 |
| CTR | Link CTR | **2%** | 2% | CF §2.2 |
| c_app | Click → application submitted. The page is headline, film, embedded application (CF law 6, 7). No app install. | **3%** | 5% | CF §2.2 bottom of 3–5% |
| k | Application → key pasted (GDN number valid, Desk installed) | **0.5** ASSUMPTION | 0.84 | plan CF7 mirror of 16% drop is the hoped-for; worst assumes half of applicants are not dealers (AD law 6) |
| f | Key → first lot opened within 14 days | **0.5** ASSUMPTION | 0.8 | no dissection figure; the Floor screen's holding-cost line is the lever (decisions §2 row 3) |
| **cost per application** | $80 ÷ 1000 ÷ 0.02 ÷ 0.03 | **$133** | $30 | derived; inside CF's $100–300 cost per call |
| **cost per key** | ÷ 0.5 | **$267** | $36 | derived |
| **cost per first lot** | ÷ 0.5 | **$533** | $45 | derived |

### 4.2 What a dealer is worth (Phase 3 only)

```
fee_per_dealer_per_month = m × S × T × F
payback_months           = cost_per_first_lot ÷ fee_per_dealer_per_month
```

| Symbol | Meaning | Worst defensible | Source |
| --- | --- | --- | --- |
| m | Lots a dealer opens per month once running | **4** ASSUMPTION | decisions §1 switches to the monthly plan at six cars, so six is the hoped-for, four the worst |
| S × T | started cars per lot | 0.54 | §3.2 |
| **started cars per dealer per month** | 4 × 0.54 | **2.16** | derived |
| **fee per dealer per month** | 2.16 F | at F = $199: **$430** | model figure, not a promise |
| **payback on cost per first lot** | $533 ÷ $430 | **1.24 months** at F = $199 | derived |
| Max cost per first lot for a 3-month payback | 3 × 2.16 F = 6.5 F | $1,290 at F = $199 | derived |

At the worst-defensible chain and F = $199, dealer paid acquisition pays back inside two months if the dealer runs four lots a month. The number that decides it is m, and m is set by the Floor screen's holding-cost line, not by the ad. The scorecard measures m from week 6 (second dealer).

### 4.3 Costs against F, per started car

| Cost | Value | Source |
| --- | --- | --- |
| Whop invoice fee on F | 2.7% + $0.30 = $5.67 at F = $199. Third-party figure, **UNVERIFIED** on Whop's own schedule; phases "Whop, exactly where it sits" says confirm before Phase 3 pricing | phases |
| Messaging per dealer per month | $25–35 on Telnyx (2,000 segments, number, campaigns); ÷ 2.16 started cars = $12–16 per started car | messaging.md |
| Texts per deal (signing links, receipts) | under $0.05 | messaging.md |
| Cloudflare (Worker, D1, R2) | near zero per dealer; **estimate** | gtm §8.6 |
| Deposit chargeback, when it happens | $250 + dispute fee, Obavia's as merchant of record for the deposit; mitigated by the evidence pack | collateral §2 |
| Counsel, bond premium on the $50,000 surety, premises | Owner's fixed costs; premium **UNVERIFIED** | decisions §0, §5 |
| **Net per started car at F = $199** | 199 − 5.67 − 16 ≈ **$177** before fixed costs | derived, ASSUMPTION |

---

## 5. The model rows (CF §2.1, mirrored)

CF's rows: spend, cost per call, show, (second booking, second show), close, AOV, gross ROAS, fixed, team, commissions, net. Obavia is a one-step funnel (deposit → bid → win → start), so the second-call rows are 100% by construction.

| Row | Pilot, weeks 1–3 | Phase 2, weeks 4–6 | Phase 3, weeks 7–12 (worked, F variable) |
| --- | --- | --- | --- |
| Ad spend | $0 | G_buyer share (plan: starts Mon Nov 9) | G_buyer remainder + G_dealer |
| Cost per deposit | n/a (ten neighbours by hand) | measured; ceiling $200 | measured |
| Deposit → bid (p) | measured | 0.5 floor | 0.5 floor |
| Bidders per lot (B) | 2 floor | 2 then 3 | 3 |
| Sold rate (S) | 0.6 | 0.6 | 0.6 |
| Started rate (T) | 0.9 | 0.9 | 0.9 |
| AOV = cash collected per started car | **$0** (no fee before GDN) | **$0** | **F**, only after `gdn_issued_at`; $0 until then |
| Gross "ROAS" = F × started ÷ spend | 0 | 0 | with week 9–10 floors, L = 6, started = 6 × 0.54 = 3.2 per week = 14 per month; at F = $199 → $2,790 per month gross (ASSUMPTION, not a forecast); at F = $0 (GDN not yet issued) → $0 |
| Fixed costs | counsel; Whop account; Telnyx | + ad accounts; hosting for video analytics | + bond premium; premises |
| Desk costs | the dealer's own desk person (not Obavia's cost) | same | + Obavia's own desk if a dealer does not call winners (plan CF9 setter half) |
| Commissions | none; there is no sales team | none | none |
| Net | negative by G and fixed costs; this is the gamble | negative; output is cost per deposit | F × started − Whop fees − messaging − spend − fixed; sign depends on F and the GDN date, neither of which this file promises |

The dissection's cash-cycle rule (CP M8: paid-ads processes must cash-cycle inside 30 days) maps to: F is invoiced on `startedAt` and counted on `invoice.paid`. The scorecard reports days from `startedAt` to `invoice.paid` from the first fee onward; ceiling 30 days. What happens to a dealer past 30 days is not decided in any house doc; it is logged in the plan's changelog as an owner decision for Phase 3, not assumed here.

---

## 6. Worst-defensible ranges, one table

| Stat | Dissection range | Obavia mirror | Worst defensible used | Label |
| --- | --- | --- | --- | --- |
| CPM | $30–80 (CF §2.2) | same | $80 | from CF |
| Link CTR | ~2% (CF §2.2) | same | 2% | from CF |
| Click → booked | 3–5% (CF §2.2) | click → deposit (buyer) | 2% | ASSUMPTION (extra steps) |
| Click → booked | 3–5% (CF §2.2) | click → application (dealer) | 3% | from CF |
| Cost per call | $100–300 (CF §2.2) | cost per deposit; cost per application | $200; $133 | derived |
| Show rate | 60% ideal, 40–50% conservative (CF §2.3) | deposit → first bid (p); bidders per lot (B) | 0.5; 3 | ASSUMPTION |
| Close rate | 20–25% one-call (CF §2.3) | sold rate (S) | 0.6 | ASSUMPTION; sim 81–97% discounted |
| AOV | cash collected (CF §2.1) | F per started car; $0 before GDN | F | variable |
| Second-call show | 70–75% (CF §2.3) | started rate (T) | 0.9 | decisions §2 |
| Application drop, integrated | 16% (CF §2.7) | submit → key | 50% worst, 84% hoped | ASSUMPTION |
| Play rate | 50%+ (CP M1) | main and breakout videos | 50% | from CP |
| Engagement | 80%+ (CP M2) | same | 80% | from CP |
| Email open floor | 40–60% (CP M7) | push open rate | 40% | ASSUMPTION |
| Retargeting floor | ~150 people (AD M13; CF §2.9) | any custom audience | 150 | from AD |
| Learning-phase floor | 50 conversions/week/ad set (AD M1) | same | 50 | from AD |
| Pixel memory | 180 days, last two weeks weighted (AD M4) | same | 180 | from AD |
| Scaling | +10–30% daily (CF §2.12) | spend step | +10% | from CF |
| Calendar load | 80% (CF §2.6) | desk load | 0.8 | from CF |
| Hiring lead time | 4–6 weeks (CF §2.5) | second desk lead time | 6 weeks | from CF |
| Cash cycle | ≤ 30 days (CP M8) | `startedAt` → `invoice.paid` | 30 days | from CP |

---

## 7. Scaling rule

CF §2.12, mirrored and capped by G:
- Raise a stable ad set by +10% per day only while cost per deposit ≤ $200 (or the scorecard's replacement) for seven consecutive days and D is at or above its floor.
- "Cost per X": extra deposits wanted tomorrow × cost per deposit = tomorrow's extra spend. Ten more deposits at $200 is $2,000; it comes out of G or it does not happen.
- Automated bidding: +10% every few days, not daily.
- Never above the hard cap in §1. Never into a content-first strategy before Phase 5 (plan AD8).
- Scaling math (CF §2.12): 10% daily compounded for 30 days is ×17.4. A sheet projecting deposits per day at day 7, 14, 21 and 30 is kept in `scorecard.md` from the first week of spend, and the second-desk clock (§2.1) starts the day it shows L ≥ 6.

---

## 8. What the owner is told when the model and the scorecard disagree

The scorecard wins. The assumption is struck through here with the week number beside the real number. If the real number is worse than the worst defensible, this file's floor moves down to it, the plan's floors are re-derived from §2.2 and §3.4, and the plan's changelog gets a dated line. If the real number is better, nothing in this file changes until it has held for two Mondays. Hope is not a data point.

## 9. Deposit top-up (added 2026-10-12)

Whop keeps its fee on a refund (`docs/plan/research/whop.md`): a $250 deposit lands as $242.95 and a full refund costs Obavia $7.05. Every released deposit is therefore an Obavia cost of $7.05 (ASSUMPTION until the sandbox refund test on Fri Oct 30). At the plan's floors that is $7.05 × released deposits per week; the reserve ratio is still computed on the gross $250 and must stay 1.00, which means the Whop balance plus Obavia's top-up account covers every deposit held.
