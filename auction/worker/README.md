# Obavia auction Worker

Cloudflare Worker + one Durable Object per lot. The object runs the same rules as the app (`../src/engine/auction.ts`) with the authority: a bid is one transaction that writes the price, the close time and the ack together; the ack is what the phone thumps on. The close is an alarm plus a read-time check. Every connected phone gets the lot on every change over a hibernating WebSocket. D1 holds a copy of every lot and every bid, never read on the bid path.

## Routes
| Method | Path | Who | What |
| --- | --- | --- | --- |
| GET | `/lots` | anyone | the lane, from the copy (no ceilings, no dealer secret) |
| GET | `/lots/:id` | anyone | the lot from its object |
| POST | `/lots/:id/open` | dealer | `{ id, dealer, start, retail, closesAt, opensAt? }` |
| POST | `/lots/:id/close` | dealer | bring the close to now (never earlier than a refill) |
| POST | `/lots/:id/bids` | buyer | `{ amount, max, key }` → the ack (`ok`, `youLead`, or `reason`: `closed` with `lateByMs`, `outbid`, `low`) |
| POST | `/lots/:id/watch?delta=±1` | buyer | watching count |
| GET | `/lots/:id/live` | buyer | WebSocket: the lot on connect, then every change |
| POST | `/me` | anyone | `{ id, name?, state? }` → `{ token }` (signed, no session) |
| POST | `/me/deposit` | buyer | `{ paymentIntent }` → verified against Stripe; `DEV=1` admits without |

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
npx wrangler secret put STRIPE_SECRET
npm run deploy
```
Point the app at it with `EXPO_PUBLIC_AUCTION_URL=https://obavia-auction.<account>.workers.dev`. Without the variable the app runs its local stand-in.

## Not yet
Push notifications (outbid with the time left, won), the Desk's Let It Go calling `/open`, the nightly D1 vs object comparison, payout and forfeiture, the out-of-state packet.
