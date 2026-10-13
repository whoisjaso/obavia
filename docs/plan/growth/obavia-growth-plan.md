# Obavia growth plan

Written October 12, 2026 by the Mirror from the three dissections in this folder (`dissect-callfunnel.md`, `dissect-confirmation-page.md`, `dissect-ad-strategies.md`) and the house docs. The owner asked for this in his own words: "make the whole plan in mirror of this, keep me accountable, be rude, etc, rigid in not deviating from the plan." This file is what he is held to. It is checked every Monday in five minutes: numbers, dates, yes or no.

Nothing here reopens a decision in `obavia-auction-decisions.md`, `obavia-auction-phases.md`, `collateral.md` or `one-action.md`. Where this file names a number those files do not, the number is an ASSUMPTION until the scorecard replaces it. Financial outcomes are not guaranteed anywhere in this file.

Standing rules that no week overrides:
- No fee of any kind before Obavia's GDN issues (43 TAC §215.85). Pilot fee is $0. `money_events` must show zero fee rows until `gdn_issued_at` is set.
- No testimonial anywhere, in any phase. The answer to "how bad could it get" is shown instead.
- No income claim, no "you will make", no hammer forecast on the glass or in an ad.
- One action per screen (Hick's Law, `one-action.md`). A screen with two primary buttons is two screens or a deviation.
- Every claim matches verified capability. Every third-party fact carries a source and a date from `researcher-architect`.
- No "AI manipulation". Obavia does not seed what AI models say about it. It publishes sourced facts and lets them be scraped.

---

## 1. Laws

Thirty laws, ten from each dissection. Codes: CF = call funnel, CP = confirmation page, AD = ad strategies. Each law is mapped or marked **does not apply** with one reason. Phases are from `obavia-auction-phases.md` only. Owner agents are from `.claude/agents/`. "Owner's human action" is the thing only the owner can do (money, counsel, filming, a decision already listed under "Who decides what" or `collateral.md` §6). Every floor is an ASSUMPTION until the scorecard replaces it.

### 1.1 Dealer acquisition funnel: ad → application → key → first lot

| Law | Maps to | Phase | Owner agent | Owner's human action | File | Number |
| --- | --- | --- | --- | --- | --- | --- |
| CF2. Cost per call = CPM × link CTR × click-to-booked; tolerance set by cash per sale | Cost per dealer application = CPM ÷ 1000 ÷ CTR ÷ (click→application). Cost per first lot = that ÷ (application→key) ÷ (key→first lot). Tolerance is set by F, the flat seller fee per started car, which is $0 until the GDN. So dealer paid acquisition does not run before Phase 3. | 3 | marketing, payments | Write the gambling budget G for dealer ads into `model.md` §1 by Fri Dec 4, 2026 | `docs/plan/growth/model.md` §4 | Cost per first lot ≤ $533 worst-defensible (ASSUMPTION, derived in model §4) |
| CF4. Calls booked ÷ 22 days ÷ 8 slots = closers; hire 4–6 weeks ahead | Desk math: lots a desk can open per week = (hours on the lane × 0.8) ÷ hours per lot. Triple J's desk is the one desk. A second desk (a second dealer, or Obavia's own desk in Phase 3) is added when lots opened hits 80% of capacity for two Mondays running. | 1, 3 | dealers | Name the desk person at Triple J by Fri Oct 16, 2026 | `docs/plan/growth/model.md` §2 | Lots opened per desk per week; capacity 8 (ASSUMPTION, model §2); add a desk at 6 for two Mondays |
| CF5. Friction and intent are one dial | The dealer application asks for the GDN number first (high friction on purpose: a non-dealer cannot pass). Nothing else typed except the one losing-car question. No income question, no "how many cars do you sell". | 2 | onboarding | None | Desk `#/auction/setup`; application page under `obavia-co/` | Application → key ≥ 50% (ASSUMPTION) |
| CF6. One object of attention per page | The dealer page is headline + the Let It Go film + the embedded application. No feature grid, no pricing table (there is no price before the GDN), no testimonials. | 3 | marketing, frontend, creative-edge | Film day at the Triple J lot, Fri Dec 4, 2026 | `obavia-co/` dealer page; `films/` | Click → application ≥ 3% (CF §2.2 floor) |
| CF7. Integrate application and scheduler: 16% drop, not 50% | The "scheduler" is the dealer key. The key is issued on the same screen as the application submit; the dealer pastes it into the Desk and the first Let It Go is the "call". No "we will call you". | 2 | onboarding, admin | None | Desk `#/auction/setup`; Worker `POST /dealers` | Submit → key pasted ≥ 84% (mirror of CF §2.7 16% drop) |
| CF9. Offload education from closers into assets; closers get layups | The Floor screen is the education: holding cost per week, the condition band, "you get / you bring". The dealer is educated on the Desk before Go, never on a call. The desk person is a layup-taker. | 1 | dealers | Ten Triple J cars with floors by Fri Oct 16, 2026 | `desk/src/Auction.tsx`, `desk/src/lib/auction.ts` | Desk → Lane under four minutes (phases §1 exit) |
| AD1. Standard events, never custom conversions | Dealer application = `Lead`; key pasted = `CompleteRegistration`; buyer deposit captured = `AddPaymentInfo` (it is refundable, so never `Purchase`); car started = `Purchase` with the hammer as value, sent server-side (AD3). No custom conversion is ever created. | 2 | marketing, systems | None | `obavia-co/` pixel; `auction/worker/src/` CAPI | Four events verified firing in Events Manager before the first dollar is spent (Mon Nov 9, 2026) |
| AD2. Optimize one step deeper only above 50 conversions/week/ad set | Floors in this plan never reach 50 of any event per week per ad set in 12 weeks. So every ad set optimizes on the shallowest event (`Lead` for dealers, `AddPaymentInfo` for buyers) until the scorecard shows 50/week. Optimizing on `Purchase` before then is a deviation. | 2, 3 | marketing | None | `docs/plan/growth/scorecard.md` | Conversions per week per ad set; threshold 50 (AD M1) |
| AD5. Messaging and event control targeting first; pixel third, fades in 180 days | Messaging before pixel (marketing mandate). The dealer hook is one sentence about a losing car and a Thursday; the buyer hook is a price, a time and a name. No audience or pixel change is made in the same week as a message change. | 2 | marketing, researcher-architect | None | `docs/plan/growth/content.md` | One change per week per funnel; logged in the scorecard |
| AD6. Wrong people arriving is a messaging failure | If applications arrive without a valid GDN number, or deposits arrive from non-Texas licences, the ad copy is rewritten. The pixel is not touched and no "lookalike" is built. | 2, 3 | marketing | None | `docs/plan/growth/content.md` | Valid-GDN applications ÷ applications ≥ 80%; Texas-licence deposits ÷ deposits ≥ 95% (ASSUMPTIONS) |

### 1.2 Buyer funnel: ad or organic → deposit → first bid → won → started

| Law | Maps to | Phase | Owner agent | Owner's human action | File | Number |
| --- | --- | --- | --- | --- | --- | --- |
| CF1. Model every stat conservatively; AOV is cash collected, never revenue | `model.md` holds the worst-defensible range for every stat. Obavia's AOV is $0 in the pilot and F per started car from Phase 3, counted only on `invoice.paid` for a lot with `startedAt`. The hammer is never Obavia's revenue. | 1 | marketing, payments | None | `docs/plan/growth/model.md` | Every Obavia number in the model carries the word ASSUMPTION until the scorecard replaces it |
| CF3. Goal ÷ cash per sale ÷ close rate ÷ show rate = bookings; × cost per call = spend | Lots per week × bidders per lot ÷ (deposit→bid rate) ÷ (bids per active bidder) = new deposits needed; × cost per deposit = spend. Worked in model §3. | 2 | marketing | Write G (gambling budget) for buyer ads by Fri Oct 30, 2026 | `docs/plan/growth/model.md` §3 | Deposits needed per week at the lot floor; spend at worst-defensible cost per deposit |
| CF8. The action flips the lead from scanner to justification; feed data through five vessels | The buyer's action is the deposit; the dealer's is Go. Vessels: (1) the deposit confirmation and the Go confirmation, (2) push and SMS, (3) paid retargeting only once the 150-person floor is met, (4) the desk person as setter, (5) does not apply: "AI answers" is AI manipulation and Obavia refuses it; replaced by publishing sourced facts (CP5). | 1, 2 | onboarding, customers, systems | None | `auction/src/` Won and deposit screens; `auction/worker/src/` push | Deposit → first bid within 24 h ≥ 50%; won → paid within 48 h ≥ 90% (ASSUMPTIONS) |
| CF10. When it fails, find the single most contracted stat and double the easiest | The Monday scorecard (§3 of this file). Five numbers, one bottleneck, one action, one date. | 1 onward | admin, orchestrator | Read the scorecard every Monday before 10:00 | `docs/plan/growth/scorecard.md` | One action per week; the bottleneck stat named |
| AD7. Direct response has the fewest steps and is the cheapest default | The 15-second ad → the lane link → deposit. No content-first strategy (Venus fly trap, Forester, Harvester, Tornado) until the five numbers hold for two Mondays. | 2 | marketing | None | `films/`; TikTok and Instagram ad accounts | Cost per deposit; reported from Mon Nov 16, 2026 |
| AD8. Content before the ask: three 10-second views, five videos per step | Phase 5 only, and only if cost per deposit is above its ceiling (model §3) for two Mondays with the direct-response ad already rewritten once. Any content-first campaign in weeks 1–12 is a deviation. | 5 | marketing, creative-edge | None in 12 weeks | `docs/plan/growth/content.md` | Not measured before Phase 5 |
| AD9. A 3-second view makes a stranger retargetable and cheaper to reach | The "3-second viewers of the 15-second ad" custom audience is created on the day spend starts (it costs nothing). It is not served until it holds 150 people. | 2 (create), 3 (serve) | marketing | None | Ads Manager audience; logged in `content.md` | Audience size ≥ 150 before any retargeting ad set exists (AD M13, CF §2.9) |
| CP1. Before the action the lead scans; after it they justify. Educate only after. | The Lane is the scanner surface: no reads, no education, a price, a time, a name. Education starts on the deposit confirmation (buyer) and the Go confirmation (dealer). | 1 | frontend, onboarding | None | `auction/src/` Lane; Desk Go screen | Zero reads added to the glass (phases §1 exit); Bid sheet open → Bid under 1 s after the first bid (`one-action.md`) |
| CP4. Urgency rests on a third-party, dated, verifiable fact | The buyer's urgency is the lot's close time and the pay deadline (server-timed, verifiable in the app) plus the Retail bar's source. The dealer's urgency is the holding cost line, sourced to a floorplan rate or a wholesale index the researcher dates. No "five slots left". | 2 | researcher-architect, marketing | None | `docs/plan/research/<topic>.md`; Floor screen | Unsourced claims in any ad, video or screen: 0 |

### 1.3 Back-end selling systems, mirrored

The five systems the dissections name are: confirmation page, value-dense emails, hammer-them retargeting, setter pre-call practice, and shaping AI's answers. Obavia's mirror: the Go confirmation and the Won screen; push and SMS cadence; paid retargeting above 150 people; the dealer's desk as setter; and no AI manipulation.

| Law | Maps to | Phase | Owner agent | Owner's human action | File | Number |
| --- | --- | --- | --- | --- | --- | --- |
| CP2. The main video is due diligence or urgency, never anything else | Dealer Go confirmation: one main video. Buyer deposit confirmation: one main video. Nothing else above the breakouts. | 2 | creative-edge, onboarding | Approve the two scripts by Fri Nov 6, 2026 | `films/`; `docs/plan/growth/content.md` | Main video play rate ≥ 50% (CP M1) |
| CP3. Originator → due diligence; vessel for a grandfather-rule opportunity → urgency | For dealers Obavia is the originator of a new category (the public lane behind the dealer's desk), so the dealer's main video is due diligence: who Obavia is, the $0 fee and why (§215.85), the deposit custody and reserve ratio, the ten pilot results best, average and worst. For buyers a car auction is a grandfather-rule vehicle and Obavia is the vessel, so the buyer's main video is urgency: the clock, the deadline, the deposit back if you lose. | 2 | creative-edge | On camera for the dealer due-diligence video, Fri Nov 13, 2026 | `films/` | Engagement ≥ 80% on both main videos (CP M2) |
| CP5. Do the viewer's due diligence for them: show the search, the dispute rate, the bad outcomes | After Phase 1 exit, publish the ten pilot results (hammer vs floor for each, the relist count, the no-pay count), the deposit reserve ratio, and the dispute count, as numbers with dates. No testimonial. No Trustpilot link. | 2 | admin, researcher-architect | Approve the published results page by Mon Nov 9, 2026 (it names Triple J) | `obavia-co/` results page; `GET /admin/exposure` | Published within 7 days of Phase 1 exit; reserve ratio shown as 1.00 |
| CP6. One breakout video per question reps are tired of answering or frame you need set | Six breakouts for buyers (the six questions the desk is tired of answering, onboarding mandate) and six for dealers. Each under two minutes, question as the title, image thumbnails because there are many. | 2 | creative-edge, onboarding | None beyond CP3 film day | `docs/plan/growth/content.md` | Twelve scripted by Fri Nov 6; cut by Fri Nov 20, 2026 |
| CP7. Right topics produce 50%+ play and 80%+ engagement; below 80% the content is wrong | Each video hosted where play and engagement are measured per video. Play < 50% with engagement ≥ 80% → change the thumbnail. Engagement < 80% → rewrite the video. | 2 | creative-edge | None | `docs/plan/growth/content.md` | Per video: play ≥ 50%, engagement ≥ 80% |
| CP8. One correct top video unlocked every video beneath it | The main video sits above the breakouts on both confirmations. Breakout play is read before and after the main video goes live. | 2 | creative-edge, frontend | None | `auction/src/` deposit confirmation; Desk Go confirmation | Breakout play rate before vs after main video |
| CP9. Say the same thing on page, email and setter; then diagnose consumption vs messaging | The Sold screen, the Won screen, the push, the SMS and the desk person all say the same deadline in the same words. If paid-within-48 h does not lift and push open is low, it is consumption: change the vessel. If push open is fine and it does not lift, it is messaging: rewrite. | 1, 2 | customers, dealers, systems | None | `auction/worker/src/` push copy; Desk Sold; `desk/server/messaging/` | Push open rate ≥ 40% (mirror of CP M7 email floor 40–60%, ASSUMPTION) |
| CP10. Testimonials are the least believed asset; answer "how bad could it get" | No testimonials. Two "worst case" breakouts: buyer, "what if it doesn't start" (no sale, deposit back); dealer, "what if the buyer never pays" (deposit to you, relist in one tap). | 2 | creative-edge, customers | None | `docs/plan/growth/content.md` | Worst-case breakout play ≥ 50% |
| CF9 (setter half). Closers should be educators | The desk person is the setter between the hammer and pickup: one call to the winner within one hour of Sold, saying the deadline and the pickup window, nothing else. In Phase 3 Obavia's own desk takes this for dealers who do not. | 1, 3 | dealers, customers | None | Ops runbook (phases §1 Ops) | Winner called within 1 h of Sold: 100% |
| AD10. Between booking and the call, show 15–20 unique pieces once each | The window is deposit → first bid, bid → close, and won → started. Paid retargeting carries it only once the 150-person audience exists (not inside 12 weeks at floor rates; model §3). Until then the window is carried by push and SMS: outbid with time left, 2:00 left, won, pay-by at 24 h and 6 h, filed, approved, mailed. One verb per message. Never the same push twice. | 2, 3 | systems, customers | None | `auction/worker/src/` alarms and push; `desk/server/messaging/` | Pushes per won car: 5, each unique; audience ≥ 150 before any paid piece |
| AD3. Mark qualified calls through CAPI after the call and let that event train delivery | The qualified event is `startedAt`: the car started at pickup. Sent server-side from the Worker as `Purchase` with the hammer as value. Not used as the optimization event until AD2's 50/week holds (not in 12 weeks). | 2 (send), 3 (optimize) | systems, marketing | None | `auction/worker/src/` | Started events sent ÷ started rows in D1 = 100% |
| AD4. Stack low-overlap events to widen reach | Phase 5. The dissection says never at test budgets; weeks 1–12 are test budgets. | 5 | marketing | None in 12 weeks | — | Not measured before Phase 5 |
| CF8 vessel 5, AD taxonomy "shape what AI says" | **Does not apply.** Obavia refuses AI manipulation. Reason: it is a claim engineered to be repeated rather than a fact verified, and the house rule is claims match verified capability. | — | — | — | — | — |

Count: 30 laws, all placed. 28 mapped to a phase, an owner, a file and a number; 2 of them (AD4, AD8) deferred to Phase 5 with the condition they must not run before. One mechanism inside two laws (the AI-answers vessel in CF8 and in AD's taxonomy) is marked does not apply. A deferred law is still a law: running it early is a deviation.

---

## 2. The twelve weeks

Anchored to `obavia-auction-phases.md`: Phase 1 weeks 1–3, Phase 2 weeks 3–6, Phase 3 weeks 6–14. Today is Monday October 12, 2026 and it is week 1. Each gate is checked on the following Monday. A gate is yes or no. There is no "mostly".

Five numbers (defined in §3): **L** lots opened this week; **D** deposits captured this week (cumulative in brackets); **B** median distinct bidders per closed lot; **S** sold rate (closed lots that hammered at or above floor ÷ closed lots); **T** started rate (started at pickup within the deadline ÷ sold). A dash means not measurable that week and the week is judged on its gate only.

| Wk | Dates | Phase | Gate (checked Monday after) | L | D | B | S | T |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Mon Oct 12 – Sun Oct 18 | 0 exit, 1 | `npm test` green in both packages; `?win=1` walkthrough Lane → Won → Plates with no new reads; Whop sandbox keys set and `payment.succeeded` received in sandbox; Let It Go, Show It, Floor, How Long, Go built on the Desk; ten pilot cars named with floors; counsel engaged | 0 | 0 | — | — | — |
| 2 | Oct 19 – Oct 25 | 1 | Desk → Lane under four minutes on a real car; Live and Sold built; push opens the named screen; licence reads 9 of 10; sandbox deposit captures, refunds in a minute on a loss, forfeits at the deadline; counsel approves the deposit terms line (no real deposit before this); five lots live by Thu Oct 22 and ten by Fri Oct 23 | 10 | 10 (10) | — | — | — |
| 3 | Oct 26 – Nov 1 | 1, 2 | All ten lots closed (five at 3 days by Mon Oct 26, five at 7 days by Fri Oct 30); every deposit in `money_events`; winners called within 1 h; pickups complete or deadline forfeits recorded by Sun Nov 1; Phase 1 exit test: ten sold or relisted, zero reads added | 2 | 3 (13) | 2 | 60% | 90% |
| 4 | Nov 2 – Nov 8 | 2 | Phase 1 exit confirmed Mon Nov 2; buyer sign-in (phone + code, licence, deposit) as three pages; dealer auction toggle and Whop connected account on the Desk; pixel's four standard events verified firing; G written in `model.md`; pilot results page approved | 3 | 5 (18) | 2 | 60% | 90% |
| 5 | Nov 9 – Nov 15 | 2 | Pilot results published; 15-second ad live on TikTok and Instagram for one zip code from Mon Nov 9; Reach posts every lot to Marketplace with the lane link; cost per deposit reported Mon Nov 16; 3-second-view audience created; dealer due-diligence video filmed | 4 | 15 (33) | 3 | 60% | 90% |
| 6 | Nov 16 – Nov 22 | 2 exit, 3 | Second dealer lists a car without a call; one week with no manual money fix; nightly D1 vs object report "equal" seven nights; GDN application filed by Fri Nov 20 with bond and premises; deposit split and suspension decisions recorded; twelve breakouts cut; Phase 2 exit test Mon Nov 23: 50 deposits, two dealers | 5 | 17 (50) | 3 | 60% | 90% |
| 7 | Nov 23 – Nov 29 (Thanksgiving Thu Nov 26) | 3 | Phase 2 exit confirmed Mon Nov 23; fee invoice code built behind a flag that reads `gdn_issued_at` and is off; `money_events` fee rows = 0; both main videos live on their confirmations with play and engagement measured | 3 | 8 (58) | 3 | 60% | 90% |
| 8 | Nov 30 – Dec 6 | 3 | Payout screen in the Desk (cleared, pending, lender split); relist, forfeit and second-chance offer on expiry work end to end; Let It Go dealer film shot Fri Dec 4; G for dealer ads written | 5 | 15 (73) | 3 | 60% | 90% |
| 9 | Dec 7 – Dec 13 | 3 | 130-U filed from the Desk at pickup on a live sale; plates ring driven by webDEALER events on at least one car; second zip code chosen by Fri Dec 11; dealer page (headline, film, embedded application) live | 6 | 15 (88) | 3 | 60% | 90% |
| 10 | Dec 14 – Dec 20 | 3 | Disputes admin: `dispute.created` assembles the evidence pack on a test dispute; audit log per lot; second zip code ad live; dealer ads live on `Lead` with G capped | 6 | 15 (103) | 3 | 60% | 90% |
| 11 | Dec 21 – Dec 27 (Christmas Fri Dec 25) | 3 | Second zip code cost per deposit reported; a Texas buyer's plates ring reaches Mailed with no manual step; `money_events` fee rows still 0 | 3 | 8 (111) | 3 | 60% | 90% |
| 12 | Dec 28 – Jan 3, 2027 | 3 | Checked Mon Jan 4, 2027: GDN application has no unanswered deficiency letter; a dealer has run one week without calling; cost per first lot reported; twelve-week scorecard complete with no blank Monday; this file amended for weeks 13–24 | 4 | 10 (121) | 3 | 60% | 90% |

Floors for D in weeks 4–12 assume one organic deposit per lot opened (Marketplace post and share sheet, ASSUMPTION) plus paid deposits at the model's worst-defensible $200 each inside G; `model.md` §3.4 states what G must be for each week's floor to be reachable. Week 4 is organic only because spend starts Mon Nov 9. If G is smaller than that number and organic does not cover the gap, the floors still stand until this file is amended. Holiday weeks (7 and 11) carry lower floors on purpose; that is planning, not a deviation.

Standing gates that apply every week from week 2: reads added to the glass = 0; fee rows in `money_events` = 0; reserve ratio = 1.00; deposits held = Whop balance.

### 2.1 Owner's human actions, by date

These are the decisions only the owner can make. They come from phases "Who decides what", `collateral.md` §6, `decisions.md` §7 and the task brief. A missed date is a missed gate.

| Date | Action | Where it lands |
| --- | --- | --- |
| Tue Oct 13, 2026 | Rotate the Higgsfield API key (the current key is attached to this session's tooling); name the repository (Phase 0 decision, overdue) | Key out of any shared session; repo name in `CLAUDE.md` |
| Wed Oct 14 | Create the Whop account; hand `WHOP_ACCOUNT_ID`, `WHOP_API_KEY` and the webhook secret to systems as secrets, never in the repo | `auction/worker/` secrets |
| Wed Oct 14 | Engage counsel with the ten questions in `decisions.md` §5, question 1 first (does §215.85 reach a live bidding platform; is a flat subscription safe), and the new question 11 from `decisions.md` §8: does the lane count as a "public motor vehicle auction" under 43 TAC §215.144(i)(3) (in force 7/1/2025: a GDN holder may not sell another GDN holder's vehicle at one), and does consignment or a wholesale-auction licence change the answer. Phase 3's step where other dealers list under Obavia's GDN is on hold until counsel answers. Amended 2026-10-13: questions 11 to 15 as written in `decisions.md` §5 (11 public auction and the 21-day clock, 12 the licensed-auctioneer path, 13 the consignment-location GDN, 14 arbitration, 15 the Copart clean-title rule) go with this engagement; sent by Fri Oct 16, 2026 at the latest. | Engagement letter; `docs/plan/research/counsel.md` |
| Fri Oct 16 | Ten Triple J pilot cars: VIN, floor (the least you'll walk away with), title location, payoff if any, days on lot. Name the desk person. | `docs/plan/growth/pilot-cars.md` (owner-written, ten rows) |
| Wed Oct 21 | Counsel's approval of the deposit terms line and the as-is language. Without it, week 2 runs on sandbox deposits only. | `docs/plan/research/counsel.md` |
| Thu Oct 22 | Be at the lot: five cars go live, three-day close | Lane |
| Fri Oct 23 | Five more cars go live, seven-day close. Confirm the reserve ratio to publish (collateral §6; this plan: 100%) | Lane; `collateral.md` §6 |
| Fri Oct 30 | Write G, the buyer-ad gambling budget, as one line in `model.md` §1. It is the amount that can be lost in full with nothing else changing. | `docs/plan/growth/model.md` §1 |
| Fri Nov 6 | Suspension policy: is a dealer's second non-delivery a suspension or an end (collateral §6). Approve the two main-video scripts. | `collateral.md` §6; `content.md` |
| Mon Nov 9 | Approve the pilot results page (it names Triple J and shows ten real numbers) | `obavia-co/` results page |
| Fri Nov 13 | On camera for the dealer due-diligence video. Bond quote in hand ($50,000 surety, Occ. Code §503.033) and premises decision (§503.032) for the GDN. | `films/`; `docs/plan/research/gdn.md` |
| Fri Nov 20 | File Obavia's Independent GDN application. Record the deposit-split decision for the licensed phase (all to the dealer, or split; collateral §6). | TxDMV filing; `collateral.md` §6 |
| Fri Dec 4 | Film day at the lot for the Let It Go dealer film. Write G for dealer ads in `model.md` §1. | `films/`; `model.md` §1 |
| Fri Dec 11 | Choose the second zip code | `scorecard.md` |
| Mon Jan 4, 2027 | Sit with the twelve-week scorecard and amend this file for weeks 13–24 | This file, §5 |

---

## 3. The Monday scorecard

Filled by admin from the Worker's D1 copy, the Whop balance and Ads Manager, before 10:00 every Monday, into `docs/plan/growth/scorecard.md`. One row per week. Never from memory, never from a rep's word (the Viral Coach rule in `icp-language.md` §1: nothing self-reported).

| # | Number | Definition | Source | Floor (ASSUMPTION until replaced) | Mirror of |
| --- | --- | --- | --- | --- | --- |
| L | Lots opened | `POST /lots/:id/open` succeeded, Monday to Sunday, all dealers | D1 `lots` | §2 table | Calls booked (CF §2.5) |
| D | Deposits captured | `payment.succeeded` on a deposit checkout, this week; cumulative in brackets; from week 5 paired with cost per deposit = ad spend ÷ paid deposits | `money_events`, Ads Manager | §2 table; cost per deposit ≤ $200 (model §3 worst-defensible) | Show rate and cost per call (CF §2.2, §2.3) |
| B | Bidders per closed lot | Median distinct buyers with at least one accepted bid, over lots that closed this week | D1 `bids` | 2 (weeks 3–4), 3 from week 5 | Show rate (CF 60% ideal, 40–50% conservative) |
| S | Sold rate | Closed lots with hammer ≥ floor ÷ closed lots | D1 `lots` | 60% | Close rate (CF 20–25% one-call; the sim's 81–97% at MMR floors, decisions §2 row 3) |
| T | Started rate | Lots with `startedAt` inside the pay deadline plus pickup window ÷ lots sold | D1 `sales` | 90% | Cash collected (CF §2.1 row 5); one no-pay in ten is the pilot's own line (decisions §2) |

Bottleneck rule, from CF law 10 and CP §3 step 9:
1. Put each of the five against its floor. Any number under its floor is contracted. If none is, the action is "spend G at +10%" (CF §2.12) and nothing else changes.
2. Among the contracted numbers, the bottleneck is the one furthest below its floor as a fraction of the floor.
3. The action is the one change that doubles the easiest contracted number, not the biggest. Upstream of D it is the ad or the page (CPM out of $30–80, link CTR under 2%, click→deposit under 3%: fix the ad; click→deposit fine but D low: fix the page). B low with D fine: the lane's reach (Marketplace posts, share sheet). S low with B fine: the floor (the Live screen's "watching, not bidding" read). T low: the deadline call and the push copy (CP9: consumption or messaging).
4. One action. One owner agent. One date inside the week. Written in the scorecard row.
5. Play and engagement per video, push open rate and the standing gates are reported under the five numbers as a second line, never as a sixth number.

---

## 4. Accountability protocol

The owner asked to be held to this and told bluntly. This is the script. The orchestrator and admin use it word for word; no agent softens it.

**When a gate is missed**, the first line of the Monday report is:

> Week N gate: NO. [Number] was X against a floor of Y. You are D days behind the plan. The one action is [action] by [date]. Nothing else is built this week.

Numeric, one sentence per missed item, no adjectives, no "but we made progress on". If an owner action in §2.1 was missed, the line names the action and the date it was due, and states what it blocked: "Counsel not engaged, due Oct 14. Real deposits are blocked. Week 2 runs on sandbox."

**When a gate is passed**, the report says "Week N gate: YES" and the next action with its date. Nothing more. Praise is a deviation from this protocol.

**Two consecutive missed gates** on the same number: the owner's next decision is forced to that number and all other owner actions that week move one week, in writing, in the changelog. Three consecutive: the phase does not advance, whatever the calendar says, and the model's ranges for that number are re-derived from the scorecard before any spend continues.

**What counts as a deviation** (any one of these, by anyone, including the owner):
- A fee, premium, surcharge or "processing" line of any kind before `gdn_issued_at` is set.
- A testimonial, a star rating, a review link, or a named buyer presented as typical.
- An income claim, a hammer forecast, a "you will get" on any screen, ad, film or page.
- A screen with two primary actions, or a button that is not yet relevant on the glass.
- A dollar of ad spend before the four standard events are verified firing (AD1) or before G is written (CF3).
- A retargeting ad set against an audience under 150 people (AD9, AD10).
- A content-first campaign (AD8) or stacked events (AD4) before Phase 5.
- Optimizing an ad set on an event under 50 conversions per week (AD2).
- A claim in an ad or video with no source line from researcher-architect (CP4).
- A number in the model changed without a scorecard row to justify it.
- A build, screen, message, channel or spend that is not in this file, the phases doc or the decisions doc.
- A phase advanced with its exit test not green.

**The rule**: no deviation is built, spent or shipped until this file is amended with a dated line in §5 that names the deviation, the law or gate it touches, and the reason. The orchestrator's first line on any deviating request is the quote of the plan line it conflicts with, and the request stops there. An amendment is one line, dated, in plain words. The owner can amend the plan whenever he likes; he cannot skip the line.

---

## 5. Changelog

| Date | Change | Caused by |
| --- | --- | --- |
| 2026-10-12 | File created: thirty laws mapped, twelve weeks scheduled Oct 12, 2026 to Jan 3, 2027, scorecard defined, accountability protocol written. | `dissect-callfunnel.md`, `dissect-confirmation-page.md`, `dissect-ad-strategies.md` |
| 2026-10-12 | Conflict noted, not resolved: `decisions.md` §1 says the deposit forfeits 72 hours after close; `phases.md` Phase 1 and `collateral.md` §2 say 48 hours. This plan uses 48 hours because two documents say so. The owner resolves it by Fri Oct 16 or 48 hours stands. | Mirror reading of the house docs |
| 2026-10-12 | Higgsfield key rotation, counsel on the GDN/fee question, deposit split, suspension policy and reserve ratio placed on the owner's dated list from the task brief and `collateral.md` §6. | Task brief |
| 2026-10-12 | Commit 96cf22c (Phase 1b) built the Desk's Let It Go, Live and Sold screens after this plan's week 1 gate was written. The gate stands as written; those items are checked, not built, on Mon Oct 19. The phases doc's Phase 0 table still says "not started" for them and should be updated by dealers. | Repo state at 22:26 UTC |
| 2026-10-12 | Research landed (`docs/plan/research/`): (1) 43 TAC §215.144(i)(3) may bar other dealers from selling on Obavia's lane; Phase 3 step 2 (dealers under Obavia's GDN) is on hold pending counsel question 11; the ten-car pilot (Triple J selling its own cars) is unaffected. (2) The $35-a-day holding cost is not defensible; the marginal cost is floorplan interest plus depreciation, about 0.1% of the car's value per day (AFC 10-K 18.1% all-in; Manheim index); the Desk's default changes to 0.1% of value per day, floor screen copy follows. (3) Whop keeps its fee on a refund: a $250 deposit lands as $242.95, so "held 1:1" holds only if Obavia tops up $7.05 per released deposit from its own money; the reserve ratio is computed on the gross $250 and the top-up is an Obavia cost in `model.md` §3; refunds older than 30 days stay UNVERIFIED until the sandbox test due Fri Oct 30. (4) The buyer urgency fact is national, not Texas (Cox Automotive, Sep 11, 2026: average US used listing $27,239, up 7% on the year; cars under $15,000 fell to 15.1% of inventory); the video says "US". (5) The Desk's seeded $33 title and $75 registration fees are county-dependent; onboarding already asks each dealer for its own. | `researcher-architect`, six files in `docs/plan/research/` |
| 2026-10-12 | Owner's amendment: Obavia is positioned as the public auction lane with the Desk behind it; the agency-owner product (app/, the agency pages on obavia.co) is legacy and gets no new work. The dealer page (week 9, CF6) moves forward to now: index.html is rebuilt around the lane with the hooks in messaging-hooks.md and the application in application.md; the film slot stays empty until Dec 4. The cloud system (docs/design/cloud-system.md) applies to the lane, the Desk and the dealer page. | Owner, 2026-10-12 |
| 2026-10-13 | Owner's amendment: the "Lego pieces" doctrine (`docs/design/lego.md`) is the execution register of CP1, CF6, CF5, CP4, CP5, CP10, CP8, CP9, AD5 to AD10 on every surface: pieces placed next to each other with no connector, 97 percent visual on scanner surfaces, bold-only lines on justification surfaces, the body (haptic, sound, motion within 100 ms) as the acknowledgement. Its §8 table binds each law to a placement; a screen or ad that breaks it breaks this plan. "Better than Peak" is never a claim on the glass (CP4, CF 15): the decode in `docs/plan/peak-decoded.md` feeds pairs the viewer joins, with sources. | Owner, 2026-10-13 |
| 2026-10-13 | Research lifted into the house docs: `docs/plan/research/public-auction-model.md` (D1 to D15 into `decisions.md` §9 with in-place pointers; counsel questions 11 to 15 into `decisions.md` §5; Phase 3 note in `phases.md`). Three statutes box the plan: Transp. Code §503.039(a) (title passes to the selling dealer before the buyer), 43 TAC §215.144(i)(3) (no GDN holder sells another GDN holder's car at a public auction), 43 TAC §215.133(a) (a GDN for each consignment location). Consignment is off; another dealer's car reaches an Obavia-GDN lane only by title assignment; the title clock on the lane is 21 days (§503.039(b)). Counsel question 12 decides whether Phase 3 files for a GDN or a TDLR auctioneer licence; the Fri Nov 20 GDN filing date stands until this file is amended. Owner's action: counsel questions 11 to 15 sent with the Phase 1 engagement by Fri Oct 16, 2026 (the brief said "Fri 2026-10-17"; Oct 17 is a Saturday, so the Friday before holds). §2.1 Oct 14 row amended to carry them. Not changed: the pay-window row of 2026-10-12 (Fri Oct 16, 48 h by default); `decisions.md` §7 records the owner's question as open until Fri Oct 30, which conflicts with that row until the owner amends it. | `docs/plan/research/public-auction-model.md`; `docs/plan/peak-decoded.md` §8 |
| 2026-10-13 | Owner's amendment (legibility, doctrine §4 and §5): until the film lands on Dec 4 the dealer page's film frame is not empty; it shows the rendered car on the lane (assets/scene-3d) with no caption, so the first screen passes the stranger test. The film replaces it on Dec 4 as planned. | Legibility audit D4, owner's car-objects instruction |
| 2026-10-13 | CF7's mechanism, not its law: the dealer no longer pastes the key. The key screen's one action is Open The Desk, a link carrying the key in the fragment; the Desk keeps it and lands on Let It Go. Copy Key and the paste field stay as faint fallbacks. "Key pasted" in CF7, AD1 and the scorecard now reads "key kept in the Desk, by the link or the paste"; the floor (50%) and target (84%) are unchanged. Recorded by onboarding on the orchestrator's decision; the owner confirms or strikes this line. | Legibility audit D2; doctrine §4 rules 1 and 10 (owner, 2026-10-13) |
