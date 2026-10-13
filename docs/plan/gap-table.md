# Gap table: Phase 0 to Phase 3 (code), against the code on 2026-10-13

Written October 13, 2026 from DOCTRINE.md, the phases, decisions §4 and §9, collateral.md, growth plan §2, native-patterns §7, the legibility audit and the code. Every "green" below is a command to run, not a result. Phase 2's table is still to be written (the planning pass was cut off after Phase 1); its known rows are in §4 Wave 2.

Blocker classes: BUILD (code we can write now), KEYS (an owner secret or account), DEVICE (a real phone), OWNER (a decision or a human act), DEPLOY (needs the Worker or site deployed). The sandbox has no device, no Whop keys, no deployed Worker and a software GPU. It can run vitest, vitest-pool-workers (workerd, local D1 and R2), wrangler dev with DEV=1, expo export for web and headless Chromium.

## 1. The table

### Phase 0: Foundation (exit: `npm test` green in both packages; `?win=1` Lane to Plates with no new reads; gate wk1, checked Mon Oct 19)

| Workstream | Scope | Exists | Missing | Exit test in sandbox | Owner | Blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend | Lane, Bid sheet, Car, Won through Plates, Pay, Pickup, Watching, Me; type; haptics, sound | auction/src/screens/Lane.tsx, BidSheet.tsx, CarSheet.tsx, Me.tsx, won/Won.tsx:32, won/Pickup.tsx, won/Plates.tsx, won/Pay.tsx; tests engine.test.ts, nav.test.ts, pass.test.ts, kv.test.ts, etch.test.ts | auction/package.json has no test script (W1-C, in progress); legibility D1, D5, D6 (in progress) | `cd auction && npm test`, `npx expo export -p web`, Playwright `?win=1` | frontend | BUILD |
| Server | Worker plus one Durable Object per lot, idempotent bids, alarm close, sockets, D1 copy, buyer tokens, dealer secret | auction/worker/src/auction.ts:23-210, index.ts:38-290, auth.ts:108-151; 40 tests | Ownership check skipped once a lot closes (auction.ts:32) (W1-A, in progress) | `cd auction/worker && npm test && npm run typecheck` | systems | BUILD |
| Payments (Whop) | whop.ts checkout, verify, webhook signature, refund, transfer, account; deposit routes; money_events | worker/src/whop.ts:39-83; routes index.ts:236-287; migrations/0002_money_events.sql | Sandbox keys; webhook never registered (nothing calls POST /webhooks; whop.ts:93 is a list only); capture by the verify path writes no money_events row (index.ts:256) | Signed webhook simulated in vitest-pool-workers; real payment.succeeded needs the Whop sandbox | payments | KEYS, BUILD |
| Paperwork | 130-U, VTR-271, Buyers Guide, bill of sale, title assignment on the Desk | desk/src/lib/fill-130u/, official.ts, filed.ts:16; tests official.test.ts, logic.test.ts | Nothing for Phase 0 | `cd desk && npm test` | paperwork | none |
| Dealers | Desk: Let It Go, Floor, Show It, How Long, Live, Sold | desk/src/Auction.tsx:110, :331, :390; tests auction-lane.test.ts, auction-key-link.test.ts, auction-admin.test.ts | Show It's three mandatory angles, Buyers Guide photo, defect line | desk suite plus a wrangler dev walk | dealers | BUILD |
| Legal | §215.85 reading; counsel list | decisions §0, §5 (questions 1 to 15) | Not sent | none | researcher-architect | OWNER |

### Phase 1: Pilot wiring (exit: ten pilot cars sold or relisted; every deposit in money_events; zero reads added; gates wk2 to wk3)

| Workstream | Scope | Exists | Missing | Exit test in sandbox | Owner | Blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Dealers | Let It Go (title gate), Show It, Floor, How Long, Go | Auction.tsx:110-200; collateral refusal desk/src/lib/auction.ts:80-89 and engine/meta.ts; holding cost lib/auction.ts:169-170 | Mandatory angles, Guide photo, defect line, dusk pulse; pickup hours and after-hours never asked (Auction.tsx:175 passes dealer.phone and an empty list); relist impossible (Auction.tsx:113 keeps unwound lots on the lane) | Timed wrangler dev plus Desk dev in Chromium; a real car needs a phone camera | dealers | BUILD; DEVICE |
| Dealers | Live, Sold | Auction.tsx:331-382, :390-475; pulse motion.ts:171 | Live socket refused (index.ts:130 wants a buyer token; the Desk sends the dealer key, lib/auction.ts:151, and polls every 3 s, :155); no buyer name on the sale (Auction.tsx:464); no payout chip | Worker test for the dealer socket; Chromium against wrangler dev measures bid-to-Desk under 1 s | dealers, systems | BUILD |
| Payments (Whop) | Sandbox keys; hosted checkout; the standing deposit; forfeiture at 48 h | Checkout auction/src/deposit.ts:43-66; forfeit alarm auction.ts:102-108; release index.ts:260-271 | Forfeiture moves no money (whop.ts:63 unused; dealers.whop_account never set); the $250 leak at pickup (index.ts:266); no money_events on capture (:256) or release (:269) | Logic in vitest-pool-workers; capture needs keys; the in-app browser return needs a phone | payments | BUILD; KEYS; DEVICE |
| Customers | ID before the first bid: camera, read, Texas only, state chip | Frame and shutter won/Scan.tsx:35-41; ID before deposit BidSheet.tsx:117; Wheel.tsx | The read: every scan returns FIXTURE (Scan.tsx:29, :94), and on a live Worker the fixture prefills Won's ID | Nine of ten reads needs a phone and licences | customers | DEVICE; KEYS (Persona if ML Kit fails) |
| Frontend | Push: outbid with time left, won, pay-by 24 h and 6 h, filed/approved/mailed; opens the named screen | Sender worker/src/push.ts:1-16; outbid auction.ts:159-163, won :96, started :79; app push.ts:31-88; nav.test.ts | app.json lacks expo-notifications and an EAS projectId (push.ts:20-27 returns undefined) (W1-C); no pay-by reminders (W1-A); no forfeit push (W1-A); no plates events | Routing yes; delivery needs EAS, APNs, FCM and a phone | frontend, systems | BUILD; KEYS; DEVICE |
| Paperwork | Desk documents inside Paper with buyer fields lit; one signature reused, consent logged; signed PDFs stored with the sale | Viewer worker/src/view.ts; Paper.tsx:31-110; Guide uploaded at Go Auction.tsx:173 | Signatures stay on the phone (SignDocs.tsx:44); no consent log; bill of sale not uploaded; no signed PDF in R2; Desk paperwork starts blank (Auction.tsx:464) | Worker route test plus a Desk unit test stamping the SVG into its PDF | paperwork | BUILD |
| Logistics | Pickup windows from dealer hours; pass QR; Desk scans, records started; after-hours line | pass.ts; QR Pickup.tsx:82; Desk scan lib/scan.ts:14-28, Auction.tsx:407; sync Lane.tsx:210 | Invented times (Pickup.tsx:24, :44) (W1-C); the slot never sent to the Desk; /pickup passes with no VIN (auction.ts:76) and no payment (W1-A) | Two Chromium pages on wrangler dev; QR by camera needs a phone | logistics | BUILD; DEVICE |
| Legal | Counsel engaged; Guide physical at pickup; deposit terms approved; arbitration drafted | Terms bidders.ts:12-18, engine/client.ts:7-13 | Engagement, approval, the D13 clause | none | researcher-architect | OWNER |
| Admin | Plain admin page: lots, bids, buyers, money events, release deposit, forfeit with a reason | AuctionAdmin.tsx:42-114; /admin/exposure index.ts:142-164 | No money events, bids or buyers list; no release or forfeit buttons; reserve ratio hard-coded 1 (index.ts:154) (W1-E and W1-B) | Admin route tests plus a Desk unit test | admin | BUILD |
| Ops | Runbook: 9 pm texts, late bid, county kickback, no-show; one phone number | none | The runbook (in progress); the number | Document review | logistics | BUILD; OWNER (number) |

### Phase 2 and Phase 3 (code rows): to be tabled; the known gaps are in §4 Wave 2.

## 2. Under-leveraged (money or a sale lost if launched tomorrow)

1. Every lane sale leaks $250: the phone shows total less $250 (Pay.tsx:27); after pickup the release check (index.ts:266) no longer counts the sale, so the buyer can Get it back. Fix: deposit becomes applied at startedAt with a dealer_payouts row (W1-A).
2. Another dealer can act on a closed lot (auction.ts:32); pickup completes with no VIN and no payment (auction.ts:76). Fix: ownership on every route; pickup requires the six, paidAt and no void (W1-A).
3. The Desk's Live cannot open its socket (index.ts:130 admits buyer tokens only), so a bid lands at the Desk up to 3 s late. Fix: admit the lot's dealer key and admin (W1-B).
4. A dealer cannot relist an unpaid car (Auction.tsx:113). Fix: unwound and unsold lots leave onLane; Let It Go Again preselects the car (W1-D).
5. Every real buyer signs in as the demo name (store.ts:196, :49), breaking the seller-bidding name check and the paperwork. Fix: sign-in sends no demo name (W1-C part 2, after the phone sign-in agent).
6. Glass claims nothing keeps: the Desk tells a dealer the forfeited deposit is his with no transfer behind it (Auction.tsx:438); the admin page always shows 1.00 (index.ts:154); "Sell it back here" does nothing (Me.tsx:146). Fixes in W1-A, W1-B, W1-C, W1-D.
7. Push cannot fire: no notifications plugin, no EAS project id (W1-C; KEYS for the id).
8. The forfeited deposit never reaches the dealer: no transfer, no connected account (W1-A; KEYS for the dealer's Whop account in Phase 2).

## 3. Doctrine not actualized (smallest build each)

- CP5 (publish the pilot results, the reserve ratio as 1.00, the dispute count): no results page exists; smallest build is the admin exposure rendered as a public page after Phase 1 exit (admin, Phase 2).
- CP9 on the Desk's side: the Sold page's deadline words must match the push's "Pay by <day time>" exactly (W1-D with W1-A's push copy).
- CF9 setter half: the desk person's one call within an hour of Sold is in the runbook (in progress), not yet a Desk prompt; smallest build is one line on Sold with the number and the words.
- AD1 and AD3: no pixel or CAPI event fires anywhere; smallest build is the four standard events from the site and the Worker (marketing and systems, Phase 2, after the KEYS).
- Native §7 line 2 (tap the price opens the Bid sheet) waits for a dated decisions line.

## 4. Waves (strict file ownership; verification after each)

### Wave 1: Phase 0 exit and Phase 1 money safety (wk1 gate Mon Oct 19; wk2 Oct 19 to 25)

| Agent | Owns | Builds |
| --- | --- | --- |
| W1-A payments (running) | worker/src/auction.ts, push.ts, whop.ts, migrations/0011_payouts.sql, test/sale.test.ts | Ownership on every dealer route; /paid refuses a voided sale; /pickup requires the six, paidAt and no void; deposit applied at startedAt with a dealer_payouts row and a deposit.applied event; forfeit writes a payout row, transfers on Whop with key forfeit:<lot> when the dealer has a connected account, pushes the buyer; pay-by alarms at 24 h and 6 h; reopen with a sale is 409; lot.sale.payout state |
| W1-B systems (after the phone sign-in agent frees index.ts) | worker/src/index.ts, reconcile.ts, env.ts, wrangler.toml, README.md, test/routes.test.ts, .github/workflows/test.yml | /lots/:id/live admits the lot's dealer key and admin; money events on capture and release; release refuses applied and forfeited; refunds matched by deposit_ref; reserve ratio from the last reconciliation, null when unknown; GET /admin/money, POST /admin/payouts/:id/paid, POST /admin/buyers/:id/release, POST /admin/lots/:id/forfeit; reconcile counts owed payouts; CI runs the four suites on every push |
| W1-C frontend (part running; part 2 after the phone agent) | package.json, app.json or app.config.ts, Pay.tsx, Lane.tsx sync, sale.ts, Pickup.tsx, README; then store.ts, Me.tsx, Scan.tsx | test and typecheck scripts; notifications and camera plugins; EAS id from env; Pay reads the server deadline; Pickup shows real hours or a call line; demo plates only without a Worker; then: no demo name at sign-in; the fixture licence never prefilled on a Worker; "Sell it back here" removed; the lost line gives Obavia's number |
| W1-D dealers (after the D3 agent frees Auction.tsx) | desk/src/Auction.tsx, lib/auction.ts, auction-lane.test.ts | Relist; "When can they pick up?" page with three choices and the after-hours number sent as hours and afterHours; Sold says "Obavia owes you $250" until payout is sent; a Collect row of the total less $250; Live uses the socket and polls at 15 s only after a socket failure; the setter line with the number |
| W1-E admin (running) | desk/src/AuctionAdmin.tsx, lib/admin-api.ts, admin-api.test.ts | Money events; payouts owed with Paid By Hand; Release and Forfeit with a reason; reserve ratio real or "Not read"; the last reconciliation; the five scorecard numbers |

Verification after Wave 1:
```
cd auction/worker && npm test && npm run typecheck
cd auction && npm test && npm run typecheck && npx expo export -p web --output-dir dist
cd desk && npm test && npm run typecheck && npm run build
node --test deploy/site/live-worker.test.mjs
# ?win=1 walkthrough in Playwright over auction/dist: Lane > Bid > Phone > ID > Pay > Won > Sign > Pay > Pickup > Plates; the legibility measure re-run: no new reads
# local end to end: wrangler dev (DEV=1) plus the Desk (VITE_AUCTION_API=http://127.0.0.1:8787): open, bid, close, Paid At The Lot, Type The Pass, Me release refused (applied), admin shows the payout
```

### Wave 2: Phase 1 paperwork, Show It, Phase 2 onboarding (wk3 to wk6)

| Agent | Owns | Builds |
| --- | --- | --- |
| W2-A paperwork | worker/src/view.ts, a new worker/src/sign.ts, Paper.tsx, SignDocs.tsx, desk/src/lib/filed.ts | Signatures stamped server side into the Desk's PDFs, the consent log row, signed PDFs in R2 with the sale, the bill of sale uploaded at Go, the Desk's paperwork opened from the sale with the buyer's name |
| W2-B dealers | desk/src/Auction.tsx (Show It only) | Three mandatory angles, the Buyers Guide photographed, six condition rows, the defect line, the dusk pulse |
| W2-C onboarding (dealer) | desk/src/Onboarding.tsx, lib/auction.ts (dealer settings), worker dealers table | The auction toggle, hours, pickup address, after-hours line, the Whop connected account (POST /accounts) |
| W2-D customers | won/Scan.tsx, a new licence read module | The licence read (ML Kit on Android, Vision on iOS through expo modules if present; else the Persona path behind a KEYS flag); Texas only; the state chip from the read |
| W2-E systems | worker reconcile, rate limits, fraud gates | Nightly D1 vs object report "equal"; bids per buyer rate limit; one open bid per buyer until the first car is paid (sim 03) |

Later waves (Phase 2 marketing events, Android pass, VoiceOver pass, the results page; Phase 3 code rows) are tabled after Wave 2's verification.

## 5. The owner's list (KEYS, OWNER, DEVICE)

| Item | What to provide | Date (growth plan) |
| --- | --- | --- |
| Whop sandbox | WHOP_ACCOUNT_ID, WHOP_API_KEY, WHOP_WEBHOOK_SECRET; register the webhook | Wed Oct 14 |
| Counsel | Send questions 1 to 15 with the Phase 1 engagement | Fri Oct 16 |
| The desk person | Name them; ten Triple J cars with floors | Fri Oct 16 |
| Pay window | 48 h stands unless amended | Fri Oct 16 (plan) / Fri Oct 30 (decisions) |
| EAS project id, APNs, FCM | For push on device builds | before the first device build |
| Telnyx Verify profile | 6 digits, 10 minutes; TELNYX_API_KEY and TELNYX_VERIFY_PROFILE_ID on both workers | before the first real buyer |
| MINT_SECRET | 32+ chars on both workers; migration 0007 | before Nov 16 |
| Cloudflare | API token and account id as repo secrets; CLOUDFLARE_DEPLOY_ENABLED; the Worker's D1 id in wrangler.toml; deploy | before the pilot's first lot |
| A phone | iPhone and a mid-range Android for the device items (haptics, camera, licence read, push, secure store, brightness) | wk2 |
| The one phone number | For the runbook and the after-hours line | Fri Oct 16 |
| Repo name; legacy app/ and agency pages | Decide | open since Oct 12 |
| The mark | Pick set a (the two interlocking ice bodies, obavia-co/assets/obavia-connected-mark.svg, rendered in 3D at assets/mark-3d/a) or set b (the orb with the ribbon, desk/public/mark.svg, what ships today); the chosen set is then wired into the site, the Desk and the app | Wed Oct 14 |
