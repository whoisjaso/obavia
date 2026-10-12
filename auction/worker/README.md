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
| GET | `/admin/exposure` | admin | deposits held, reserve ratio, sales by state, incidents by dealer, fees owed (0 until GDN), the last seven reconciliations |
| POST | `/admin/reconcile` | admin | run the nightly reconciliation now → the row (`lots_differing`, `differing`, `deposits_held`, `whop_balance_cents`, `equal`, `note`) |
| POST | `/dealers` | admin | `{ gdn, name }` → the dealer's key for the Desk |
| GET | `/dealers` | admin | every dealer: gdn, name, created_at, suspended_at, incidents |
| POST | `/dealers/:gdn/suspend` | admin | the dealer opens no new lot (403 `dealer suspended`); open lots keep running |
| POST | `/dealers/:gdn/restore` | admin | clears the suspension |
| POST | `/lots/:id/bids` | buyer | `{ amount, max, key }` → the ack (`ok`, `youLead`, or `reason`: `closed` with `lateByMs`, `outbid`, `low`) |
| POST | `/lots/:id/watch?delta=±1` | buyer | watching count |
| GET | `/lots/:id/live` | buyer | WebSocket: the lot on connect, then every change |
| POST | `/me` | anyone | `{ id, name?, state? }` → `{ token }` (signed, no session) |
| POST | `/me/deposit/checkout` | buyer | → `{ checkoutId }`: a Whop hosted checkout for the $250, our metadata on it |
| POST | `/me/deposit` | buyer | `{ paymentId }` → verified with Whop (paid, ours, ≥ $250); `DEV=1` admits without |
| POST | `/webhooks/whop` | Whop | Standard-Webhooks signature; `payment.succeeded` captures the deposit by metadata, `refund.*` releases it; every event kept in `money_events` |

Buyers bid only with a captured deposit (402 otherwise). Keys are idempotency keys: a retried request returns the same ack. The buyer's ceiling never leaves the object.

## Run
```
npm install
npm test                     # the real Workers runtime, D1 migrations applied
npm run typecheck
npx wrangler d1 create obavia-auction   # once; paste the id into wrangler.toml
npx wrangler d1 migrations apply obavia-auction
npx wrangler secret put BUYER_SECRET
npx wrangler secret put DEALER_SECRET
npx wrangler secret put WHOP_API_KEY
npx wrangler secret put WHOP_WEBHOOK_SECRET   # from POST /webhooks { url: .../webhooks/whop, events: [...] }
npm run deploy
```
Point the app at it with `EXPO_PUBLIC_AUCTION_URL=https://obavia-auction.<account>.workers.dev`. Without the variable the app runs its local stand-in.

## The Desk
Build the Desk with `VITE_AUCTION_API=https://<worker>` and paste the dealer's key (from `POST /dealers`) once on `#/auction/setup`. Let It Go is one question per page: the car, where the title is (and the lender, payoff and release days), photos, six words, insured, how long, the floor; "You'll bring $X. OK?" when the floor is under the payoff; Go uploads the photos and the Buyers Guide and opens the lot. Live shows the ring and the price; Sold shows the buyer's clock, Paid At The Lot, the VIN at pickup, and the way out (void).

**Admin.** The owner's Desk carries the admin key, `d:*.<sig>` (`node -e "const c=require('crypto');console.log('d:*.'+c.createHmac('sha256',process.env.DEALER_SECRET).update('d:*').digest('base64url'))"`), pasted under Lane → Key; the Lane then shows Admin.
`#/auction/admin` is the exposure report, one number per row, refreshed every 10 s; each dealer row suspends or restores him, and Add A Dealer mints a dealer's key and shows it once.

Local: `.dev.vars` with `BUYER_SECRET`, `DEALER_SECRET`, `DEV=1` (no Whop key: the deposit is admitted without it); `npx wrangler d1 migrations apply obavia-auction --local`; `npx wrangler dev`.

## The nightly reconciliation
Cron `0 8 * * *` (03:00 Central in daylight time, 02:00 in standard time) runs `src/reconcile.ts`: every lot's D1 copy against its object on high, bids, closesAt, leader, closed and sale; a differing copy is rewritten by the object itself and its id recorded. Deposits held (`captured`) against the Whop USD ledger balance (`GET /ledger_accounts/{WHOP_ACCOUNT_ID}`, settled balance only; pending and reserve are noted, not counted). `equal` is 1 when no copy differed and the balance is unknown or at least $250 × deposits held. One row per run in `reconciliations`.

## Not yet
The Whop transfer on forfeiture, the out-of-state packet.
