# Obavia auction app (buyer side)

Expo (React Native) app for the phone-first public auction. Spec: `docs/plan/obavia-auction-decisions.md` §3. Doctrine: a price, a time, a name, one verb; no reading except where the law or the money requires it.

## What exists
- `src/engine/` pure rules, tested with vitest: increments, out-the-door total (Texas 6.25% + title + registration + the dealer's doc fee, zero premium), fixed 2:00 soft close, proxy ceilings, and `LocalAuctionServer`, a stand-in for the auction Durable Object (idempotent bids, server-stamped acks, latency, rival bidders).
- `src/feel.ts` the sensory layer: expo-haptics + synthesised WAVs in `assets/sfx/`. Positive events fire sound and touch together; neutral events are silent.
- `src/screens/Lane.tsx` one car per screen: swipe up for the next car, tap for the next angle, hold the photo, drag the price up to arm a bid, long-press the ring for the time. Bid and total stacked 2:1, Bid and Retail bars, dealer name and city.
- `src/screens/BidSheet.tsx` the bottom 40%: the wheel, the total, the increment, the ceiling chips ("up to $X"), one Bid button (hold 600 ms over 2×), the $250 deposit step once ever, the hollow deposit chip, the ack punch, the one-time soft-close teach, and the only sentence: "Closed 0.4 s before your bid".

## Run
```
npm install
npx expo start            # iOS / Android via a development build (haptics, audio are native modules)
npx tsc --noEmit && npx vitest run
npx expo export --platform web --output-dir dist   # the web preview used for screenshots; no haptics on web
```
Preview switches on the web build only: `?closeIn=3000&lag=1500` closes the first lot in 3 s with 1.5 s of network latency, to watch a late bid get rejected.

## Not yet
Car screen, licence scan, real Apple Pay, Won/Pay/Pickup/Plates, the Worker and Durable Object, engine audio recordings, the dealer side (lives in the Desk).
