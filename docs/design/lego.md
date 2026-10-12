# Lego pieces. The doctrine of adjacency.

The owner's brief (October 12, 2026): "97 percent visual oriented, image oriented, animation oriented, haptics oriented, SFX oriented. We don't want people having to read something. Lego pieces placed right next to each other; we're not connecting it for them, so users assume they go together and congratulate their own intelligence. Think of that from the marketing angle, the UI angle, the research angle."

This file is the law for every surface (the phone app, the Desk, obavia.co, the films, the ads). It sits beside `docs/plan/one-action.md` (one thing to do per screen) and `docs/design/cloud-system.md` (what a surface looks, sounds and feels like). One-action says how many things are on the glass. Lego says how they are placed and how little is said about them.

## 1. The principle

A Lego brick has studs. Nobody explains that two bricks connect; the shape says so, and the click when they join is the proof. The person who joins them feels clever, and that feeling is theirs, not ours.

On a screen this means: **put the cause next to the effect, the piece next to its slot, the number next to the thing it measures, and say nothing about the relationship.** The user draws the line. A line the user draws is believed; a line we draw is read, doubted and forgotten.

Three consequences:

1. **Adjacency replaces explanation.** If two things belong together, they touch, align, share a colour or a rhythm, or move together. No arrow, no "this means", no caption that restates the picture.
2. **The click replaces confirmation.** When a piece lands in its slot, the surface says so in the body (the §2 cloud physics, the haptic, the cloud sound, all in the same 100 ms), never in a sentence. "Success", "Done", "You have bid" are banned as text when the body can say it.
3. **The user finishes the thought.** Every screen leaves one small inference for the user to make, and it is always the right one. A screen that makes zero inferences is a form. A screen that makes the wrong one is a bug.

## 2. The 97 percent rule

Of what a screen shows, at most three percent is text that must be read to act. Everything else is image, number, motion, haptic, sound, shape, position.

| Allowed text | Banned text |
| --- | --- |
| A price, a time, a name, one verb (the auction's four words, `obavia-auction-decisions.md` §3) | Instructions ("Tap to...", "Swipe up to...") |
| A proper noun the law needs on the glass (Buyers Guide, 130-U, the dealer's name) | Explanations of what a thing is for |
| One faint word for a hidden advanced option | Marketing adjectives on a product screen |
| The legal sentence a statute requires, verbatim, where it requires it | Confirmations the body already gave |

Test: cover every word with your thumb. Can a first-time user still do the one thing? If not, the screen is reading, and it fails.

Research anchor: picture superiority (Paivio, dual coding; Nelson, Reed and Walling 1976) and the testing of recognition over recall (Nielsen's heuristic 6) both say the same thing the owner said. We do not cite them on the glass either.

## 3. Native stimuli

The user already knows how to use the phone. We borrow the gestures and the feedback the big apps trained into them, and we never invent a new one.

| Borrowed from | The learned piece | Where Obavia places it |
| --- | --- | --- |
| Instagram | double tap = want; the heart is the proof, no text | Lane: double tap watches a car, the mark swells, Light haptic, cloud-touch |
| Instagram, TikTok | vertical full-bleed cards, one subject per screen, swipe to the next | Lane: one car fills the glass, the next one is under the thumb |
| TikTok | hold to pause, release to resume; the thing under the finger obeys | Lane: hold freezes the countdown ring on the current car |
| YouTube | drag the scrubber; the number follows the finger | Lane: drag the price, the Bid sheet's number follows the drag |
| Facebook Marketplace | a price, a photo, a distance; nothing else on the card | Lane card: price, one photo, the ring, the name; miles only if it changes a decision |
| iOS | the sheet from the bottom, the scrim, the grabber; swipe down dismisses | every sheet (`auction/src/components/Sheet.tsx`); never a modal with an X |
| iOS Wallet | hold the pass, it goes live under the thumb | Pickup pass |
| iOS Camera | the shutter is the only control | Insure, Scan |
| Apple Pay | the double press and the tick; a payment is one gesture | Pay: one word, one haptic, the cloud-landed swell |
| iOS keyboards and pickers | the wheel, the detent tick per step | the ceiling wheel behind the one faint word |
| Taptic Engine | Light for touch, Medium for a step, Heavy for a moment, Success for a win, Warning once and silence after | `auction/src/feel.ts`; negative paths stay silent |

Rule: if a gesture needs a tooltip, it is not native, and it is not ours.

## 4. The seven placements

Every pair of pieces on a surface uses one of these seven adjacencies. Name which one in the screen's audit row.

1. **Touching.** The price sits on the photo of the car it prices. The holding cost sits inside the Floor row it explains (`desk/src/Auction.tsx`, the Floor row). Not under it, not in a note.
2. **Aligned.** Two numbers that are meant to be compared share a baseline and a face (Bodoni for money). The eye compares them; nobody writes "versus".
3. **Same colour.** The one lit step on Won and the one verb on its sheet share the ink. Everything else is faint. The colour says "this, now".
4. **Same motion.** The ring and the price breathe on the same beat on the Lane; the user understands they are one clock.
5. **Same sound.** Each surface's one landed sound is the same file everywhere (`cloud-landed`); the body learns "that sound = mine".
6. **Sequence.** The next piece appears in the place the last one left (the won car slides into Won, the pass rises where Pay was). Position carries the story.
7. **Absence.** The deposit line is not on the Bid sheet until a deposit exists. The missing piece tells the user what the next piece is.

## 5. The marketing angle

The same law runs the ads and the site, and the growth plan (`docs/plan/growth/obavia-growth-plan.md`) holds the cadence.

- **An ad is two pieces, no connector.** A dealer's losing car and a phone; a lot price and a floorplan clock; a buyer's thumb and a hammer. The viewer joins them. No headline that explains the join. The hook catalogue in `docs/plan/growth/messaging-hooks.md` is written as pieces, not as claims.
- **The film shows, the copy stays under three percent.** A product film is the Lane under a thumb and the sound of the cloud landing. Voice-over only states a number or a name.
- **No testimonials and no outcome claims** (the doctrine already bans them). The strongest Lego ad is the one where the viewer concludes "so I would get the car cheaper" on their own; we never say it, because it is not guaranteed and because a conclusion the viewer reaches is theirs.
- **The site's first viewport is a piece and a slot.** The lane photograph and the one cloud button. The scroll is the sequence placement: cost, then collateral, then the buyer, then how bad it is, each one a pair.

## 6. The research angle

Research files under `docs/plan/research/` keep their citations, but the way they reach the product is Lego: a fact becomes a number placed next to the thing it changes, never a paragraph on the glass.

- Holding cost 0.1 percent of value per day (`docs/plan/research/holding-cost.md`) became the number inside the Floor row, not a tooltip about floorplan interest.
- The public auction rule (43 TAC §215.144, `docs/plan/research/texas-rules.md`) is a gate in the Desk's Let It Go flow, not a legal explainer.
- The competitor decode (`docs/plan/peak-decoded.md`) feeds the delta table, and each delta line names the piece and its slot on an Obavia screen.

## 7. The audit (add a row before any screen ships)

| Screen | The two pieces | Placement (§4) | Text that must be read | The inference the user makes | Body proof (haptic, sound, motion) |
| --- | --- | --- | --- | --- | --- |
| Lane | the price on the photo; the ring beside the price | touching, same motion | the price, the name | "this price is leaving, and I can move it" | drag follows the thumb; cloud-drift under it |
| Bid sheet | the number under the thumb; the one ink Bid | touching, same colour | the number, Bid | "my number goes in when I press this" | sink, rise, cloud-landed, Heavy haptic |
| Won | the car that slid in; the one lit step | sequence, same colour | the step's one noun | "the next thing is the lit one" | settle, cloud-settle |
| Pay | three words, one ink | same colour | three words | "I pay with one of these" | Apple Pay's gesture, Success haptic |
| Desk, Let It Go | the car's cost on the photo; the floor beside it | touching, aligned | two numbers, one verb | "this is what waiting costs me" | the count rolls; Go settles |
| Site, first viewport | the lane photograph; the cloud button | touching | one verb | "the car on the phone is the one on the lot" | the cloud sinks and rises |

If the "text that must be read" cell has more than four words, the screen is reading. If the "inference" cell is empty, the screen is a form. If the "body proof" cell is empty, the screen is mute, and a mute screen is not Obavia.

## 8. What it is not

Not mystery. Not hiding the price. Not a puzzle the user must solve to pay. The inference is always small, always obvious once made, and always correct. Lego that does not click is a loose brick, and a loose brick is a bug.
