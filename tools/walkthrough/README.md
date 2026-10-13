# The Phase 0 exit walk

`docs/plan/obavia-auction-phases.md`, Phase 0 exit test: the web walkthrough (`?win=1`) runs Lane to Won to Plates without a page that needs reading beyond the four kept reads (`docs/plan/one-action.md`: the deposit line, the terms on the first bid, the Buyers Guide, the bill of sale). This folder runs that test the same way every time.

```
tools/walkthrough/run.sh                    # walk, count, compare with baseline.json
tools/walkthrough/run.sh --rebuild          # export the app again even if dist is newer than the source
tools/walkthrough/run.sh --write-baseline   # accept this run's reads as the baseline (only if the walk completed)
tools/walkthrough/run.sh --strict           # also fail any screen over the four-word ceiling
```

Exit 0 is a pass; anything else is a fail. The evidence is `shots-review/walkthrough/<UTC stamp>/report.md` (the table and the screenshot list) beside one 393 by 852 @2x PNG and one JSON per screen; `shots-review/walkthrough/latest` points at the last run. `shots-review/` and `dist/` are not committed; `baseline.json` is.

## What runs

1. `run.sh` exports the app (`npx expo export -p web` into `tools/walkthrough/dist`), skipped when `dist/index.html` is newer than `auction/src`, `auction/assets` and the app's config. No Worker: `EXPO_PUBLIC_AUCTION_URL` is unset, so the app runs the local engine and the seeded fixture. Playwright and Chromium come from `auction/node_modules` and `/opt/pw-browsers/chromium` (`NODE_PATH`, `CHROME` override them).
2. `walk.mjs` serves the export on 127.0.0.1 and drives one buyer through it at 393 by 852, device scale 2, `?win=1` (the hammer falls 2.5 s after the first bid): Lane, double tap to watch (the count goes up by one), drag the price up, Bid, the Phone pages when the chain has them (number 214 555 0142, the local code 000000), ID (the fixture licence), the deposit (Pay), the bid lands, the hammer, Won (Me, then the steps), ID prefilled, Insure, Sign (the Buyers Guide scrolled to its end and signed, the Bill of Sale with the same signature), Pay (Wire), Pickup (where, when, the pass held until the car starts, Done), Plates (until mailed, the local cadence), back to the Lane, Me. A screenshot at every screen.
3. `reads.mjs` counts the words each screen asks a person to read, compares with `baseline.json`, prints the table and writes `report.md`.

## What fails the run

- A page error (an uncaught exception in the app).
- `alert()`, `confirm()` or `prompt()` (any browser dialog), or an element with `role="dialog"`, `role="alertdialog"` or `aria-modal="true"` on the glass.
- A step the walk cannot drive (the page it stopped on is saved as `zz-stuck-*.png`).
- The one action is not the first tappable element. Tappable means a node in Chromium's accessibility tree (`Accessibility.getFullAXTree`) with a control role or focusable, on the glass, not disabled, and hit by a point inside it (so anything under a sheet does not count). Order is the tree's reading order. Each screen's one action is its row in `one-action.md`, written in `SPEC` at the top of `walk.mjs`. Three things are allowed ahead of it, each named in `SPEC`: the sheet's own dismissals (the backdrop over the glass, the grip), and `before`, the object the verb acts on (the amount wheel above Bid, the five facts above That's me). A screen whose one action is a gesture (the Lane's drag) passes when every tappable on it is one of the table's secondaries.
- A screen reads more words than its baseline, or a screen is not in the baseline.
- With `--strict`, a screen over the ceiling.

## How the reads are counted

The legibility audit's method (`docs/design/legibility-audit.md`: what is on the glass, not hidden by a sheet, not clipped, not transparent), made mechanical so it repeats. Every visible run of text on the screenshot is put in one class:

| Class | What | Counted |
| --- | --- | --- |
| verb | the first run inside the one action; when the decision is a set of words (Who is it for, Pay, Pickup when), the first run of each choice | yes |
| read | any other run with letters that is none of the classes below | yes |
| kept | the terms (inside `aria-label="Terms. ..."`), the deposit line (`refunded if you lose`, `back if you lose`), and everything but the verb on the Buyers Guide and the Bill of Sale | apart, never failed |
| detail | a second run inside the one action or a choice (`transfer, clears Fri` under Bank) | no |
| offer | text inside a tappable that is not the one action (Not now, the done steps) | no |
| scan | Bodoni (money and names); runs with no letters, or a number with three words or fewer (`23 watching`); a fixture proper noun (`NAMES` in `reads.mjs`); a label of one or two words touching a number or a Bodoni figure (Retail beside the bar, Balance over the figure) | no |

Words are runs split on spaces that contain a letter. `must = verb + read` is the screen's number. The ceiling is four (DOCTRINE §4 rule 9, CP1); a screen over it shows OVER in the table and fails only with `--strict`, because the gate the plan asks for is that no screen gains reads, and the ceiling is the number the screens are driven toward.

To accept a change that adds words on purpose, write the screen's row in `one-action.md` first, then run `--write-baseline` and commit `baseline.json` with the change. A line added to `NAMES` is for a proper noun only.

## Limits

- The local fixture has no Worker: the Buyers Guide and the Bill of Sale render as ruled placeholder pages, so their kept count is the placeholder's, not the statute's text. The Pickup fixture lot has no hours, so Pickup, when is the call line, not slots.
- The count is words on the glass by rule, not a stranger's time. The stranger test (`one-action.md`, "Measuring it") replaces it when the app logs it.
- Other agents edit `auction/src` while this runs; an export taken mid-edit can show an empty lane. Run again with `--rebuild`.
