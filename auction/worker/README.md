# Obavia auction Worker

Payments run on Whop (`src/whop.ts`): the deposit is a Whop payment held and refunded on a loss; the balance is a Whop invoice; the dealer is paid by a transfer to a connected account; Whop's signed webhooks are the only way money news enters.

Cloudflare Worker + one Durable Object per lot. The object runs the same rules as the app (`../src/engine/auction.ts`) with the authority: a bid is one transaction that writes the price, the close time and the ack together; the ack is what the phone thumps on. The close is an alarm plus a read-time check. Every connected phone gets the lot on every change over a hibernating WebSocket. D1 holds a copy of every lot and every bid, never read on the bid path.

## Routes
| Method | Path | Who | What |
| --- | --- | --- | --- |
| GET | `/lots` | anyone | the lane, from the copy (no ceilings, no dealer secret) |
| GET | `/lots/:id` | anyone | the lot from its object |
| POST | `/lots/:id/open` | dealer | `{ id, dealer, start, retail, closesAt, opensAt?, car }`; refused (422) on collateral the lane cannot see (`docs/plan/collateral.md`) |
| POST | `/lots/:id/car` | dealer | patch the car; a lower `collateral.floor` moves the opening price while nobody has bid |
| POST | `/lots/:id/close` | dealer | bring the close to now (never earlier than a refill) |
| POST | `/lots/:id/paid` | dealer | the balance arrived (cash at the lot in the pilot) |
| POST | `/lots/:id/pickup` | dealer | `{ vin }` last six must match; `startedAt` is the sale |
| POST | `/lots/:id/void` | dealer or admin | `{ reason }`: the dealer cannot deliver; deposit released, incident counted |
| PUT | `/lots/:id/photos/:name` | dealer | JPEG or WebP ≤ 12 MB into R2 |
| PUT | `/lots/:id/documents/:name` | dealer | PDF into R2 (the Buyers Guide at Go) |
| GET | `/admin/exposure` | admin | deposits held, reserve ratio, sales by state, incidents by dealer, fees owed (0 until GDN), the last seven reconciliations, `bidRefusals` (`byReason` counts and the `recent` 50: lot, who, reason, matched, at), `tokenRefusals` (`byPresented` counts and the `recent` 50: claimed, reason, presented, known, at) |
| POST | `/admin/reconcile` | admin | run the nightly reconciliation now → the row (`lots_differing`, `differing`, `deposits_held`, `whop_balance_cents`, `equal`, `note`) |
| POST | `/dealers` | admin | `{ gdn, name }` → the dealer's key for the Desk |
| POST | `/dealers/mint` | the lane (`MINT_SECRET`) | `{ gdn, name, city }` (legal name and city from the TxDMV list) → `{ token }`, the dealer's Desk key. The same GDN again within 30 minutes: 409 `already_minted`, no key. At most 20 an hour in all: 429 `rate_limited` with `Retry-After`. 403 `forbidden` on any other credential (the admin secret included); 503 `mint_unavailable` while `MINT_SECRET` is unset, shorter than 32 characters or equal to `DEALER_SECRET`. Every mint is a row in `dealer_mints` with `source = 'lane'`; an existing dealer's name and standing are left alone. It lists, suspends and reads nothing |
| GET | `/dealers` | admin | every dealer: gdn, name, created_at, suspended_at, incidents |
| POST | `/dealers/:gdn/suspend` | admin | the dealer opens no new lot (403 `dealer suspended`); open lots keep running |
| POST | `/dealers/:gdn/restore` | admin | clears the suspension |
| POST | `/lots/:id/bids` | buyer | `{ amount, max, key, terms? }` → the ack (`ok`, `youLead`, or `reason`: `closed` with `lateByMs`, `outbid`, `low`). `terms: "2026-10-13"` is required on the buyer's first bid ever and ignored after. Refusals below |
| POST | `/lots/:id/watch?delta=±1` | buyer | watching count |
| GET | `/lots/:id/live` | buyer | WebSocket: the lot on connect, then every change |
| POST | `/me` | anyone the first time; the buyer after | First sign-in: no `authorization`, body `{ name?, state?, phone?, address? }` with no `id` → `{ id, token }`. The Worker makes the id (`b_` and 22 random characters) and returns it once; keep both. After: `authorization: Bearer <token>`, body `{ id?, name?, state?, phone?, address? }` → `{ id, token }` (the same token). An `id` without its current token (none, forged, another buyer's, rotated or bumped away) is 401 `{ "error": "not_yours" }` and a row in `token_refusals`. `phone` is a US number (10 digits after stripping, a leading 1 dropped), `address` the licence's street line; a bad one is 400 `bad contact`. Both feed the shill check |
| POST | `/me/rotate` | buyer | `authorization: Bearer <token>` → `{ id, token }`; the old token and every one before it stop working (401 `sign in` everywhere) |
| POST | `/admin/buyers/:id/bump` | admin | → `{ id, epoch }`; every token the buyer holds stops working. Until a Whop-verified email or phone exists (Phase 2) the token is the only proof, so the buyer cannot sign back in: a suspension |
| GET | `/me` | buyer | `{ id, name, state, deposit_status, wins, winsLeft, winsPerYear, termsVersion, termsAt, termsCurrent }`. `winsLeft` is the number the Me screen shows: 4 less the cars started this calendar year, the sales won and not yet started, and the lots the buyer leads now |
| POST | `/me/deposit/checkout` | buyer | → `{ checkoutId }`: a Whop hosted checkout for the $250, our metadata on it |
| POST | `/me/deposit` | buyer | `{ paymentId }` → verified with Whop (paid, ours, ≥ $250); `DEV=1` admits without |
| POST | `/webhooks/whop` | Whop | Standard-Webhooks signature; `payment.succeeded` captures the deposit by metadata, `refund.*` releases it; every event kept in `money_events` |

Buyers bid only with a captured deposit (402 otherwise).

## Who may bid (decisions §9 D10, D11, D15)
Checked in this order on `POST /lots/:id/bids`:

| Status | Body | When |
| --- | --- | --- |
| 403 | `{ "error": "not_a_buyer" }` | the bearer is a Desk key (`d:<gdn>`), the admin key (`d:*`) or the admin secret, on any lot. Logged |
| 401 | `sign in` | no valid buyer token |
| 402 | `deposit first` | no captured deposit |
| 409 | `{ "error": "terms_required", "version": "2026-10-13" }` | the buyer's first bid ever without `terms` equal to the current version. Not logged |
| 403 | `{ "error": "win_cap", "count": n, "cap": 4 }` | `WINS_PER_YEAR = 4` (`src/bidders.ts`; Transp. Code §503.024(a)(1)). `count` is the cars started since January 1 Central, plus sales won and not yet started, voided or forfeited, plus other lots the buyer leads now: every one of them can become a win this year, so a fifth is never possible. Raising on a lot the buyer already leads is not counted twice. Logged with the count |
| 403 | `{ "error": "seller_cannot_bid" }` | decided in the lot's object against the dealer block the lot opened with (Bus. & Com. Code §2.328(d)). The buyer's phone against the dealer's `phone` and `afterHours` (digits only); the buyer's street line against the dealer's `street` (letters and digits only, case folded); the buyer's name against the dealer's legal name. Logged with the field that matched |

Every bid that reaches the object writes `bids.shill_check`: the fields that were compared (`phone,address,name`, or `''` when the buyer gave nothing to compare). The terms are stamped on the buyer (`terms_version`, `terms_at`) when the first bid is placed (the object answered 200); a refused bid stamps nothing. The four terms are in `TERMS` in `src/bidders.ts`.

What the shill check cannot see: the buyer's phone and street are what the buyer typed, unverified; no email is held for any dealer; no payment instrument is compared (Whop's payment id is not a card fingerprint, and a dealer has no payment on file); no device is compared (the Desk registers none); `POST /me` no longer mints a token for an id the caller cannot prove (see Buyer tokens), but anyone can still make a new buyer with no phone at all, so a dealer can bid as a fresh stranger. The check stops the honest mistake and the lazy shill; the deposit's payment instrument is the next match to add. Keys are idempotency keys: a retried request returns the same ack. The buyer's ceiling never leaves the object.

## Buyer tokens (migration 0009)
A token is `<id>.<sig>` at epoch 0 and `<id>.<epoch>.<sig>` after, HMAC-SHA-256 with `BUYER_SECRET` over everything before the last dot. `buyers.token_epoch` is the epoch in force; a token signed for another epoch is refused (401 `sign in`) on every buyer route. The bid path reads the epoch in the admission read it already makes; every other buyer route makes one D1 read. Tokens minted before 0009 are epoch 0 and keep working.

Refused re-mints are logged in `token_refusals`, not `bid_refusals`: there is no lot, and `presented` (`none`, `forged`, `other`, `stale`) and `known` (the id exists) are what the admin needs to tell a lost phone from a takeover attempt.

`DEV=1` keeps the old path for `wrangler dev`, the tests and the app's local fixtures: `POST /me` with any `id` and no credential mints that id's token at its current epoch. Never set `DEV=1` on a deployed Worker: a stranger could take any buyer.

What the app must send (the phone task):
1. First launch, nothing stored: `POST /me`, `content-type: application/json`, no `authorization`, body `{ "name": "...", "state": "TX" }`. Store `id` and `token` from `{ id, token }` in secure storage. Do not send a device id.
2. Every later launch: `POST /me`, `authorization: Bearer <token>`, body `{ "id": "<stored id>", "name": "...", "state": "TX" }` (or `{}` with the token alone). 200 is `{ id, token }`; keep the token it returns.
3. A 401 `not_yours` on step 2 means the stored token is dead (rotated or bumped). Until Phase 2 there is no way back to that id; the app says so and does not start a new buyer on its own.
4. Rotation: `POST /me/rotate`, `authorization: Bearer <token>`, no body → `{ id, token }`; replace the stored token before using it again.

## Run
```
npm install
npm test                     # the real Workers runtime, D1 migrations applied
npm run typecheck
npx wrangler d1 create obavia-auction   # once; paste the id into wrangler.toml
npx wrangler d1 migrations apply obavia-auction   # 0008 and 0009 before this code: the bid copy writes bids.shill_check; buyer routes read buyers.token_epoch
npx wrangler secret put BUYER_SECRET
npx wrangler secret put DEALER_SECRET
npx wrangler secret put MINT_SECRET          # 32+ characters, not DEALER_SECRET; the same value goes on the obavia-waitlist worker
npx wrangler secret put WHOP_API_KEY
npx wrangler secret put WHOP_WEBHOOK_SECRET   # from POST /webhooks { url: .../webhooks/whop, events: [...] }
npm run deploy
```
Point the app at it with `EXPO_PUBLIC_AUCTION_URL=https://obavia-auction.<account>.workers.dev`. Without the variable the app runs its local stand-in.

## The Desk
Build the Desk with `VITE_AUCTION_API=https://<worker>` and paste the dealer's key (from `POST /dealers`) once on `#/auction/setup`. Let It Go is one question per page: the car, where the title is (and the lender, payoff and release days), photos, six words, insured, how long, the floor; "You'll bring $X. OK?" when the floor is under the payoff; Go uploads the photos and the Buyers Guide and opens the lot. Live shows the ring and the price; Sold shows the buyer's clock, Paid At The Lot, the VIN at pickup, and the way out (void).

**Admin.** The owner's Desk carries the admin key, `d:*.<sig>` (`node -e "const c=require('crypto');console.log('d:*.'+c.createHmac('sha256',process.env.DEALER_SECRET).update('d:*').digest('base64url'))"`), pasted under Lane → Key; the Lane then shows Admin.
`#/auction/admin` is the exposure report, one number per row, refreshed every 10 s; each dealer row suspends or restores him, and Add A Dealer mints a dealer's key and shows it once.

No new environment variables or secrets for D10, D11 or D15.

Local: `.dev.vars` with `BUYER_SECRET`, `DEALER_SECRET`, `DEV=1` (no Whop key: the deposit is admitted without it); `npx wrangler d1 migrations apply obavia-auction --local`; `npx wrangler dev`.

## The nightly reconciliation
Cron `0 8 * * *` (03:00 Central in daylight time, 02:00 in standard time) runs `src/reconcile.ts`: every lot's D1 copy against its object on high, bids, closesAt, leader, closed and sale; a differing copy is rewritten by the object itself and its id recorded. Deposits held (`captured`) against the Whop USD ledger balance (`GET /ledger_accounts/{WHOP_ACCOUNT_ID}`, settled balance only; pending and reserve are noted, not counted). `equal` is 1 when no copy differed and the balance is unknown or at least $250 × deposits held. One row per run in `reconciliations`.

## Not yet
The Whop transfer on forfeiture, the out-of-state packet.
