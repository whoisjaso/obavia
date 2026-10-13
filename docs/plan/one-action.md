# One action. The mindset.

Source: the owner's reference clip (31 s, October 2026). Transcribed and decoded here so it governs every screen in `auction/` and every Desk screen the auction adds.

> If you're designing an app, stop giving users so many choices. Spotify wants you to press play, Netflix wants you to start the next episode, and Tinder wants you to keep swiping. This is called Hick's Law, which says that the more choices you give someone, the longer they take to decide. And that friction is what kills retention. So here are five rules.
> 1. Give every screen one obvious primary action.
> 2. Your main button should look more important than everything else around it.
> 3. Hide advanced options until someone actually needs them.
> 4. Never have two buttons that look equally important.
> 5. If an option isn't relevant yet, don't show it.

The clip's own numbers: 25 options on a home screen, 2.6 s to decide; one option, 0.4 s. Retention at 22 options: 66%. Hick's Law (W. E. Hick, 1952): decision time grows with the log of the number of choices.

## What it means here

The auction already had the doctrine "a price, a time, a name, one verb" (`obavia-auction-decisions.md` §3). This clip is the same law stated for buttons. `docs/design/lego.md` says how the one thing and its companion piece are placed, and its §8 ties both to the transcript laws. Together they are the house rule:

**Every screen has one thing to do, it is obvious, it outranks everything, and nothing that is not yet relevant is on the glass.**

The Lane's one thing is the drag. The Bid sheet's is Bid. Won's is the one lit step. Pay's is a word. Pickup's is the pass. Plates has nothing to do, so it has no button. Me's is nothing; it is the neutral screen.

## The audit, screen by screen

| Screen | Primary action | Secondary | Advanced, hidden until needed | Not yet relevant, hidden | Verdict |
| --- | --- | --- | --- | --- | --- |
| Lane | drag the price | swipe, tap, double-tap, hold, the mark | the Car (behind a swipe or the count) | Bid sheet, Won | passes |
| Bid sheet | **Bid** (ink bar) | swipe down | **the ceiling wheel: now behind one faint word** | the deposit line until a deposit exists | fixed |
| Deposit | **Pay** | "Not now" in faint text | — | — | passes |
| Car | swipe between three pages | tap a photo, Buyers Guide | — | — | passes |
| Won · steps | the one lit step | — | — | the locked steps are faint, the done ones ticked | passes |
| ID | **That's me** (live as the facts arrive; confirms all five at once) | tap a fact to correct it | the State wheel and each fact's field, until that fact is tapped | — | passes (legibility-audit D1, October 13, 2026) |
| Insure | the shutter | — | — | — | passes |
| Sign | the one live document | "Later" in faint text | the signature pad until the end of the page | the reuse offer until a signature exists | passes |
| Pay | one of three words | — | — | — | passes (three words are the decision, not options around it) |
| Pickup · where | the pin | after hours | — | — | passes |
| Pickup · when | one slot | — | — | — | passes |
| Pickup · pass | hold the pass | — | — | **Continue** appears only when the car has started | passes |
| Plates | nothing | pull to refresh, Back | — | — | passes |
| Me | nothing | Sign out in faint text | — | **"Sell it back here" only once a car was won** | fixed |
| Watching | tap a ring | swipe to unwatch | — | — | passes |

## The rule for new screens

Before a screen ships, write its row in this table. If the primary cell has two entries, the screen is two screens. If the "not yet relevant" cell is empty, look again: there is almost always something that belongs to a later moment.

## Measuring it

Hick's Law is a time. The app will log, without identity, the milliseconds from a sheet opening to its one action (Bid sheet open → Bid; Won → first step; Pay open → a word). The target is the clip's: under a second on the Bid sheet after the first bid ever. A screen that drifts above two seconds has grown a choice.
