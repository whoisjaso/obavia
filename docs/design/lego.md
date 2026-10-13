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
| TikTok | hold to pause, release to resume; the thing under the finger obeys | Lane: hold plays the engine recording of the current car (`obavia-auction-decisions.md` §3.1); the ring never freezes, it is the server's clock |
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
| Won | the hammer in its cloud touching the car; then the one lit step | touching, then sequence, same colour | the step's one noun | "the hammer struck my car; the next thing is the lit one" | the hammer's contact frame with the chime and the Success haptic in one frame; then settle |
| Pay | three words, one ink | same colour | three words | "I pay with one of these" | the tap records a choice, not a payment, so Medium haptic and cloud-touch; the Success haptic and cloud-landed belong to the moment the money lands (the Whop return, the Paid state) |
| Desk, Let It Go | the car's cost on the photo; the floor beside it | touching, aligned | two numbers, one verb | "this is what waiting costs me" | the count rolls; Go settles |
| Site, first viewport | the lane photograph; the cloud button | touching | one verb | "the car on the phone is the one on the lot" | the cloud sinks and rises |
| Offer (the second chance) | the coin touching the amount under the car; the clock touching what is left of the twelve hours; then the one cloud, Take it | touching, sequence | Take it | "my number came back; this long; this cloud takes it" | the cloud sinks and rises; Take it lands as Won's hammer strikes (chime, Success haptic, the puff) |
| Desk, Payout | the coin touching the $250; the clock touching the balance while the buyer's deadline runs; the four amounts on one baseline in one face | touching, aligned | the state word | "the coin is the part Obavia moves; the rest adds up to the hammer, mine at the lot" | the page settles (motion.ts enter); no sound: nothing was done here |
| Desk, Sold at expiry | the clock touching what is left of the twelve hours; "Their number" under it; Let It Go Again in the dock | touching, sequence | Second chance | "the next bidder may take it at this number before this clock ends; if not, the cloud sends it round again" | the row settles; the clock face counts down once a second |
| Desk, Whop | the coin above the one question; the connected card under it with the masked id | touching, sequence | Connect Whop | "my email opens where the $250 lands" | the cloud sinks and rises; cloud-landed and the chime as the card appears |
| Phone, the number on another install | the stamp "On another phone" under the six; the cloud "New phone" at the foot | sequence, same colour (the one cloud) | New phone | "that is my old phone; this one is new; press it" | the boxes empty; the cloud sinks and rises; the six turn green with the held swell on the proof |

If the "text that must be read" cell has more than four words, the screen is reading. If the "inference" cell is empty, the screen is a form. If the "body proof" cell is empty, the screen is mute, and a mute screen is not Obavia.

## 8. Synchronicity with the transcript laws

The three dissections (`docs/plan/growth/dissect-callfunnel.md`, `dissect-confirmation-page.md`, `dissect-ad-strategies.md`) and the thirty laws mirrored in `docs/plan/growth/obavia-growth-plan.md` §1 are the same doctrine stated from the money side. Lego is how those laws reach the glass. Each line below names the law, the psychology row behind it, and the placement (§4) that executes it. A screen or an ad that breaks a line here breaks the plan, and the plan is rigid.

| Law (plan §1) | Psychology behind it | Lego execution | Placement |
| --- | --- | --- | --- |
| CP1, CF scanner mode (CP P2, CF 2, AD 1: 1.8 s per post, "is this for me") | Before the action nobody reads; they snap-judge | The scanner surfaces (the ad, the first viewport, the Lane, the Bid sheet) are the 97 percent surfaces of §2: a price, a time, a name, one verb, and the body as proof. Zero education before the action. | touching, same colour |
| CP1 and CP P3 (justification mode, "they read the bold") | After the action the person wants reasons and reads only bold | The confirmation surfaces (Won, the deposit confirmation, the Go confirmation) are where text is allowed to grow past three percent, and only as bold-sized lines placed next to the thing they justify (the deadline next to the clock, the deposit line next to the balance). Body copy still does not exist. | aligned, touching |
| CP P1 and AD 4 (energy conservation, fewest steps) | Every extra step and every sentence costs calories the viewer will not spend | The user joins two pieces instead of reading one sentence. One inference per screen (§1.3); one action per screen (`one-action.md`). | sequence |
| CF6 (one object of attention per page) | A page with extra sections converts worse because the scanner scrolls instead of watching | The dealer page is headline, film, application; each scroll stop is one pair. The Lane is one car. The Bid sheet is one number. | absence |
| CF5 and AD 2 (friction equals intent; a 10 s view is the signal) | Effort is the filter and the proof of interest | Friction is a gesture, never a form: the drag to arm, the hold on the pass, the GDN number typed first on the application. A gesture the user performs is both the friction (CF5) and the endowment (§3, kinesthetic). | sequence |
| CF 5 (the layup question) and CF 16 (majority hook) | The first thing seen must say "you are in the right place" to the majority | The hook is a pair the majority instantly joins: a losing car and a phone (dealer); a price and a clock (buyer). Never a claim, never a feature. `messaging-hooks.md` holds them as pairs. | touching |
| CP4 and CF 15 (real reasons; a third-party dated verifiable fact) | Made-up urgency is discounted; a dated fact is argued for by the viewer | Urgency is a piece with a source placed beside it: the lot's close time (server-timed), the holding cost next to the floor with its rate, the Retail bar with its index. "Five slots left" and "better than Peak" never appear as text; the viewer compares the two prices and concludes. | aligned |
| CP5 and CP P6 (do their due diligence for them) | Trust comes from showing the search, the dispute rate, the worst outcomes | The published pilot results are numbers next to dates, best beside average beside worst, with no sentence between them. The reserve ratio is shown as the number, 1.00, not described. | aligned |
| CP10 and CP P15 (testimonials are the least believed; "how bad could it get") | Cherry-picked proof creates distrust | No testimonials anywhere. The worst-case breakout is a pair: the car that did not start, the deposit coming back. The viewer joins them. | sequence |
| CP2, CP3, CP8 and CP P14 (one main video unlocks everything beneath) | The one correctly chosen top piece makes the rest consumed | The main video is the one lit piece above the breakouts; the breakouts are faint until it has played. Same colour rule from Won's steps. | same colour, sequence |
| CP6, CP P11 and CP P18 (many very short clearly titled videos; chaptering) | Short pieces are perceptually easier; the scanner scrubs to what decides | Breakouts are under two minutes, titled with the question, image thumbnails: each one a brick with a stud. Chapters are the film's version of §4 sequence. | sequence |
| CP9 (say the same thing on page, push, SMS and setter) | Consistency lets a consumption problem be told from a messaging problem | The same deadline is the same piece everywhere: same number, same face (Bodoni), same cloud-landed sound when it is met. One verb per message. | same sound, same colour |
| CP P19 (acknowledge the action first: "You're in") | The first thing after the action confirms it succeeded | The acknowledgement is the body, not the words: the won car slides into Won, the cloud lands, the Heavy haptic, the chime. The words "You're in" are the fallback for a surface without a body (email). | sequence |
| AD5 and AD6 (messaging first; wrong people is a messaging failure) | The pixel only widens the audience the message already selects | A wrong applicant means the pair was wrong, not the targeting. Rewrite the pieces, never the audience, in the same week. | touching |
| AD7 and AD 7 (direct response; novelty over repetition) | The fewest steps is cheapest; 15 to 20 unique pieces, never one piece 15 times | Each push and each retargeting piece is a different pair placed in the window (outbid and time left; 2:00 and the price; won and the deadline). Never the same pair twice. | sequence |
| AD9 and AD 3 (a 3 s view makes a stranger retargetable) | Three seconds of any piece is enough to be known | The first three seconds of every film are the two pieces already touching: the car and the phone. Nothing before them. | touching |
| CF8 (five vessels feed the justification) and AD10 (15 to 20 pieces in the window) | Interest decays between the action and the outcome; each good piece bumps it back | The vessels are push, SMS, the confirmation, the desk person. Each carries one pair. The AI-answers vessel does not apply (plan §1.3); Lego never manufactures a fact. | sequence |
| CF 8, CF 9 (money questions make people lie; one arithmetic question predicts buyers) | A direct money question deters the honest | The application never asks income. The one typed question is the losing car (a fact the dealer already holds), and the GDN number (a fact that cannot be faked). | absence |
| CF 17 (hyper-sophistication; put the process on display) | The saturated viewer only believes what they can watch happen | The film is the Lane under a real thumb, the Desk's Go settling, the real cloud button. No mockups, no "fake UI" (taste-skill ban). | same motion |

What the laws do not license: the 97 percent rule is not a reason to drop a required legal sentence (Buyers Guide, §215.85 line, the deposit terms counsel approves on Oct 21). Those are pieces the law places; they sit where the statute puts them, in full, and nothing is added around them.

## 9. What it is not

Not mystery. Not hiding the price. Not a puzzle the user must solve to pay. The inference is always small, always obvious once made, and always correct. Lego that does not click is a loose brick, and a loose brick is a bug.
