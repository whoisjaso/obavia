# Obavia auction app (buyer side)

Expo (React Native) app for the phone-first public auction. Spec: `docs/plan/obavia-auction-decisions.md` §3. Doctrine: a price, a time, a name, one verb; no reading except where the law or the money requires it.

## What exists
- `src/engine/` pure rules, tested with vitest: increments, out-the-door total (Texas 6.25% + title + registration + the dealer's doc fee, zero premium), fixed 2:00 soft close, proxy ceilings, and `LocalAuctionServer`, a stand-in for the auction Durable Object (idempotent bids, server-stamped acks, latency, rival bidders).
- `src/feel.ts` the sensory layer: expo-haptics + synthesised WAVs in `assets/sfx/`. Positive events fire sound and touch together; neutral events are silent.
- `src/screens/Lane.tsx` one car per screen: swipe up for the next car, tap for the next angle, hold the photo, drag the price up to arm a bid, long-press the ring for the time. Bid and total stacked 2:1, Bid and Retail bars, dealer name and city.
- `src/screens/CarSheet.tsx` the Car: three detents, twelve photos in a packed grid (a sideways shot takes two cells, never a hole: `src/engine/grid.ts`), the six-dot grade that becomes six words on a tap, odometer, VIN last six, the title chip, the Buyers Guide as `Paper`.
- `src/components/LanePhoto.tsx` sideways photos on the Lane: the same photo blurred behind, the sharp frame at width, a little above centre so the price has room.
- `src/sale.ts` + `src/screens/won/` the sale after the hammer: Won (flash, chime, confetti, "Who is it for?", four tiles with the next one lifted), ID and insurance scans (frames and chips; the camera and the read are the next wiring), Sign (three documents as `Paper`, scroll-to-end unlocks the pad, one signature reused with a tap), Pay (ACH with its clearing day, Wire, Cash at the lot, the 48 h deadline), Pickup (the pin, the window wheel, the after-hours line, a QR pass that turns green when the car starts), Plates (one ring, three ticks, amber on a county kickback). An out-of-state licence relabels the last tile to Title.
- `src/screens/Me.tsx` Me and Watching: the name, the standing deposit, the cars won, "Sell it back here", sign out; a column of rings with the price under each, tap to jump to the car, swipe left to unwatch, the first ring spins in with the heartbeat after a day away. Double-tap a car on the Lane to watch it; the mark top-right opens Me.
- `src/screens/BidSheet.tsx` the bottom 40%: the wheel, the total, the increment, the ceiling chips ("up to $X"), one Bid button (hold 600 ms over 2×), the $250 deposit step once ever, the hollow deposit chip, the ack punch, the one-time soft-close teach, and the only sentence: "Closed 0.4 s before your bid".

## Type
Bodoni Moda, cut from the variable font at optical size 72 (`assets/fonts/Bodoni-*.ttf`), for every number and every word that owns a page: the Didone of the fashion houses, upright for money, italic for a word. Everything small (labels, choices, the one verb) is set in the platform's own face: SF on iPhone, Roboto on Android, as Wallet and Apple Pay do. No webfont for the small type, nothing trendy. The web preview shows the platform fallback (Helvetica/Arial), not SF.

## One action
Hick's Law is the house rule (`docs/plan/one-action.md`): one obvious primary action per screen, the main button outranks everything, advanced options hidden until wanted, never two equal buttons, nothing irrelevant yet. Every new screen gets a row in that audit before it ships.

## The look
Rolex, Ritz-Carlton, Porsche: restraint, precision, air. Words that own a page are set in upright spaced capitals (`Caps`), never italic; Bodoni upright is for money and names only; the one button is a squared ink bar with a spaced capital verb. Space is the luxury. Nothing boxed: no chips, no pills, no bordered cards. A small spaced label, a serif word or number that owns the page, a choice that is only its words with a short rule under the chosen one, one dark button for the one verb. Pages are centered and come one at a time (`components/Type.tsx`: Label, Serif, Body, Choice, Button, Page, Pager). American spelling on the glass (tires).

## The high-bidder moment (from the Copart decode, `docs/plan/copart-decoded.md` §2)
On the server's ack the price punches with the thud and a heavy impact, then 150 ms later two rising notes with the success haptic: you are the high bidder. A small mark sits beside the price on the Lane while you lead. When a rival's ceiling falls and the lead returns to you, the same two notes. Losing the lead is silent in the app; the push carries the words and the time left.

## The server (`worker/`)
A Cloudflare Worker and one Durable Object per lot, running the same engine with the authority: idempotent bids, one write for price, close and ack, an alarm for the hammer, a hibernating WebSocket per phone, D1 as the copy, signed buyer tokens, a deposit gate. Payments run on Whop. The phased plan for everything is `docs/plan/obavia-auction-phases.md`. Ten tests in the real Workers runtime. Set `EXPO_PUBLIC_AUCTION_URL` and the app uses it; unset, the local stand-in. See `worker/README.md`.

## Run
```
npm install
npx expo start            # iOS / Android via a development build (haptics, audio are native modules)
npx tsc --noEmit && npx vitest run
npx expo export --platform web --output-dir dist   # the web preview used for screenshots; no haptics on web
```
Preview switches on the web build only: `?closeIn=3000&lag=1500` closes the first lot in 3 s with 1.5 s of network latency, to watch a late bid get rejected; `?win=1` drops the hammer 2.5 s after your first bid, to walk Won through Plates. In Pickup, hold the pass to stand in for the dealer's VIN scan.

## Not yet
The camera and the licence/insurance read, the deposit checkout in the sheet (the Worker creates a Whop checkout and verifies the payment; the sheet does not open it yet), the Desk's document renders inside `Paper`, Wallet passes, push notifications, engine audio recordings, the walkaround video, sign-in, the dealer side (lives in the Desk).
