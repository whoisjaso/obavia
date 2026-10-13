# Legibility audit: the stranger test, every screen

Written October 13, 2026 by frontend, from the owner's instruction of the same day ("still make this completely legible; a lot of the people that will use it are non-technical and they need an easy application, both for dealers and individuals; a proper UI that makes sense relationally") and `docs/DOCTRINE.md` §4. Re-run it before any screen ships; a row that fails is the screen's fault, not the person's.

## How it was measured

- Every screen was exported and driven in Chromium at 393 by 852, device scale 2: the app (`auction/`, `expo export -p web`, local engine, `?win=1` for the win path), the Desk's lane screens (`desk/`, `vite build` against a stubbed lane), the dealer page (`obavia-co/index.html`) and the buyer page (`obavia-co/waitlist.html`; WebGL off, so the cloud button draws its sprite fallback).
- Type size is the computed font size of the run. Contrast is measured from the pixels, not the stylesheet: the run's box is cropped from the screenshot, the background is the most common colour in the box, and the ink is the 98.5th percentile contrast inside it, so antialiasing, opacity, shadows and the cloud bands behind the words are all counted. The carved cloud labels are measured the same way.
- Text a covering sheet hides is excluded (hit-tested at its centre).
- Scripts and both rounds of screenshots: `/tmp/claude-0/-home-user-obavia/e8ab9614-fbc7-5317-bc83-13cdf5972c0b/scratchpad/legibility/` (`shoot-app.mjs`, `shoot-desk.mjs`, `shoot-site.mjs`, `measure.py`, `summary.py`; `shots/before/*`, `shots/after/*`, `summary.txt`).
- The stranger test is judged from the screenshot alone: what a person who has never seen Obavia, given no words, would do with one thumb in ten seconds. It is a design judgement anchored to what is on the glass; the measured stranger time (`one-action.md`, "Measuring it") replaces it when the app logs it.

Legend: verb and price are size, then measured contrast, before and after. "Must read" counts the words a person has to read to do the one thing (the doctrine's ceiling is four on a scanner surface).

## The phone app

| Screen | The one verb (read aloud) | Must read | Pieces that touch | Verb: size, contrast | Price: size, contrast | Stranger under 10 s | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lane | drag the price (no word) | 0 | price on the photo, total under it, bars beside, dealer under, the next photo beside its count | n/a | 64 px, 20.1:1 to 20.2:1 | Yes for watching and scrolling; the drag-to-bid is learned from the price lifting under the thumb | **Fixed.** Was: dealer, bars, watch count and photo count at 12 px; the count at 1.3:1 on a pale sky; a dot beside a number and a 2 by 2 grid glyph, both pictograms to decode. Now 17 px, 4.8:1 to 15.6:1, "23 watching" in words, the car's next photo beside its count. |
| Bid sheet, first bid | Bid | 1 (+ 4 terms, which the law places) | number under the thumb, total under it, step under that, terms, Bid | 13 px carved, 11.8:1 to 17 px carved, 11.9:1 at rest and 10.2:1 pressed | 60 px, 13.9:1 | Yes | **Passes (D6).** The carved label is 17 pt with 3.1 pt tracking (0.18 em): `auction/src/components/CloudButton.tsx:470`, the imprints re-carved in Cycles at the same size (`tools/cloud-3d/labels.json:5`, cap line moved to 0.58 at `:20` so the taller cap stays in the safe rect). Every imprint's floor re-measured on the shipped sprites (`auction/src/components/etch.test.ts`): Bid 5.9:1 at rest and 6.4:1 pressed at 440@2x, every phone label 5.6:1 or better. Back to the lane does not hold 17 or 16 pt in the safe rect at any tracking (210 pt and 201 pt against 159 pt); it is fitted to 12.8 pt, see D6 below. |
| Bid sheet, after the first bid | Bid | 1 | number, total, step, "max bid", Bid, held line under it | 13 px carved, 11.8:1 | 60 px, 13.9:1 | Yes | **Fixed.** Was: the held line pushed off the bottom of the sheet (it never showed at rest) and "ceiling", the engine's word. Now the sheet holds every line, and the word is "max bid". |
| Bid sheet, max bid open | tap a figure | 2 | figures in a row under the step | 17 px, 6.2:1 | 60 px, 13.9:1 | Yes | **Fixed.** Was: the row of figures cut in half by the sheet's height, 15 px, "no ceiling". Now whole, 17 px, "no max". |
| ID frame (first bid) | the shutter (no word) | 0 | card outline over the lens, shutter under it | n/a | n/a | Yes, it is the phone's own camera shape | **Fixed** (Not now 14 px to 17 px). |
| ID facts | That's me | 2 | each fact under its name; a green rule under a fact the buyer corrected | 17 px carved, 12.0:1, live from the first frame | n/a | Yes: one tap confirms all five | **Passes (D1).** That's me is never disabled and confirms the five as they stand (`auction/src/screens/won/Scan.tsx:205`); a tap on a fact opens it to correct, State on its wheel, the rest as the field in place (`:148`), and a correction lands with the Light impact and the green rule (`:136`). Facts read in ink, 18 px at 13.4:1; names 17 px at 6.2:1 or more. With a Worker the facts come from the card's barcode (`:117`), never the fixture. |
| Deposit | Pay | 4 ("$250 refunded if you lose") | $250, the line under it, Pay | 13 px carved, 11.8:1 | 64 px, 13.6:1 | Yes | **Fixed.** Was: line 15 px at 4.1:1, Not now 14 px at 2.2:1. Now 17 px, 6.2:1 and 4.8:1. |
| Won, who is it for | Me | 4 | car, hammer, total, the question, two words | 20 px, 7.9:1 | 40 px, 13.4:1 | Yes | **Fixed** (question 11 px at 2.2:1 to 17 px at 6.3:1). |
| Won, steps | the lit step (ID) | 1 | car, hammer, the four steps stacked, the lit one underlined | 22 px, 13.2:1 | 40 px, 13.4:1 | Yes | **Fixed.** Was: the three waiting steps 16 px at 2.2:1. Now 17 px at 4.8:1, still clearly behind the lit one. |
| ID, prefilled | That's me | 0 | facts lit, That's me | 13 px carved, 11.9:1 | n/a | Yes | **Fixed** (fact names 11 px to 17 px). |
| Insure | the shutter | 2 | the card outline over the lens; the VIN above | n/a | n/a | **Was no:** a card outline under "VIN" did not say which card | **Fixed.** "Insurance card" in plain words above the frame, 22 px, 15.5:1. |
| Sign | the lit document | 2 | the two documents in order, the lit one underlined | 18 px, 13.4:1 | n/a | Yes | **Fixed.** Was: "Title through webDEALER at pickup", a state system word, 14 px. Now "The title is signed at pickup.", 17 px. |
| Paper (Buyers Guide) | read to the end, then sign | the document (the law's) | title over the page, pad under its end, Sign under the pad | 13 px carved, 12.0:1 | n/a | **Was no:** the sheet opened inside the Sign page's centred column, half height, its title off the top | **Fixed.** The document now opens over the whole glass with its title and the AS IS line (17 px, warn 5.7:1). |
| Pay | Bank, Wire or Cash | 3 | balance, deadline under it, three words | 17 px, 7.7:1 | 56 px, 13.6:1 | Yes | **Fixed.** Was: "ACH", a bank's system word, 15 px; the deadline 11 px at 2.2:1. Now "Bank / transfer, clears Fri", 17 px. |
| Pickup, where | the pin | 1 | dealer, street, pin, after-hours number | 17 px, 6.2:1 | 34 px, 13.6:1 | Yes | **Fixed** (Directions 11 px at 2.2:1 to 17 px). |
| Pickup, when | a time | 1 | five times stacked | 17 px, 8.0:1 | n/a | Yes | **Fixed** (15 px to 17 px). |
| Pickup, the pass | hold the pass (no word) | 0 | the QR, its six touching it, the car under | n/a | 40 px, 13.2:1 | Yes, a pass is shown, not read | **Fixed** (car name 14 px to 17 px). |
| Pickup, started | Done | 1 | the green pass, the car in green, Done | 13 px carved, 11.9:1 | 40 px, 13.2:1 | Yes | **Fixed.** "Continue" is now "Done", the doctrine's word. |
| Plates | nothing (Back) | 1 | the ring, its stage inside, the three stages under | 17 px, 5.5:1 | n/a | Yes | **Fixed.** Stage inside the ring was faint grey; the stages 11 px. |
| Car, photos | tap a photo | 0 | year over the name, miles under, the photos | n/a | 44 px name, 13.7:1 | Yes | **Fixed** (year 11 px to 17 px). |
| Car, condition | none (swipe) | 6 words | six dots, then each part over its word | n/a | n/a | Yes | **Fixed.** Part names 11 px at 2.2:1 to 17 px at 5.7:1 or more. |
| Car, papers | read it (Buyers Guide) | 6 | title, guide, seller, each over its value | 17 px, 4.9:1 | 26 px, 13.2:1 | Yes | **Fixed** (VIN 13 px, labels 11 px, all 17 px now). |
| Me | nothing (Sign out) | 4 | name, deposit, wins left, cars | 17 px, 5.4:1 | 36 px, 13.6:1 | Yes | **Fixed.** Was: four lines at 13 px, two at 2.4:1. "Release it" is now "Get it back". |
| Watching | tap a ring | 1 per row | ring, price, car under | n/a | 28 px | Yes | **Fixed** (car names 11 px to 17 px). |

## The Desk's lane screens

| Screen | The one verb (read aloud) | Must read | Pieces that touch | Verb: size, contrast | Price: size, contrast | Stranger under 10 s | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lane list | Let A Car Go | 2 | the car's drawing, its name, its bid, bids and time under | 17 px, 8.5:1 | 14 px, 4.2:1 to 17 px, 6.4:1 | Yes | **Fixed** (row line 14.5 px to 17 px, grey to 6.4:1; upright headline). |
| The key | Keep It | 12 | the field, the button | 17 px, 2.8:1 while disabled | n/a | **No.** Pasting a "d:P123456..." string is a system task | **Fails, decision D2.** The Worker's URL printed under the field is removed. |
| Let It Go, which car | tap a car | 1 per row | name over stock, price and miles | 18 px | 17 px, 6.4:1 | Yes | **Fixed** (14.5 px to 17 px; italics removed). |
| Title | In my hand | 3 | each choice over its gloss | 19 px, 14.2:1 | n/a | Yes | **Fixed.** |
| Photos | Take photos | 2 | the tile, then each photo, Next under | 19 px, 14.1:1 | n/a | Yes | **Fixed.** |
| A condition word | Good, Fair or Poor | 1 | the part's name over three words | 19 px, 14.2:1 | n/a | Yes | **Fixed.** |
| Insured | Yes, insured on the lot | 5 | question, two choices | 19 px, 13.8:1 | n/a | Yes | **Fixed.** |
| How long | 3, 7 or 10 days | 2 | three choices with their gloss | 19 px, 14.2:1 | n/a | Yes | **Fixed.** |
| The floor | type the floor, Next | 3 | the field, the band and the holding cost under it | 17 px, 8.5:1 | 17 px rows | Yes | **Fixed** (rows 14 to 15 px, now 17 px, 6.4:1). |
| Go | Go | 1 | the car, floor, title, close, photos | 17 px, 8.1:1 | 15 px, 4.4:1 to 17 px, 6.6:1 | Yes | **Fixed.** |
| Live | Sell It Now | 2 | ring, price, car, floor row | 17 px, 8.6:1 | 35 px, 15.1:1 | Yes | **Fixed** (rows to 17 px). |
| Sold, owed | Paid At The Lot | 3 | buyer's clock ring, hammer, the rows, both clocks | 17 px, 8.5:1 | 35 px, 14.5:1 | Yes | **Passes (D3).** Both clocks kept. Every Desk page with a dock pads its foot by the dock's cloud height plus 16 px (`desk/src/styles.css:803`), the height measured from the crowns' top to the glass's bottom (`desk/src/cloud3d.ts:113`, 166 px here). Scrolled to its end the last row sits 16 px clear of the crowns; at rest on 852 the page runs 18 px long and the panel's bottom edge meets the crowns' top by 1.6 px, the row's words 21 px clear. |
| Sold, paid | Type The Pass (Scan The Pass with a camera) | 3 | hammer, the rows | 17 px, 8.6:1 | 35 px, 13.8:1 | Yes | **Fixed.** |
| Type the pass | It Started | 5 | "the six under the buyer's code", the field | 17 px, 8.4:1 | n/a | Yes | **Passes.** |
| Sold, started | Open The Paperwork | 3 | hammer, rows, the two clocks | 17 px, 8.7:1 | 35 px, 13.8:1 | Yes | **Fixed.** "Picked up 10/13/2026, 5:09:51 AM" now reads "Picked up Tue, Oct 13, 5:25 AM". |
| Lane not connected | none | 4 | n/a | n/a | n/a | n/a | **Fixed.** Was: "Set VITE_AUCTION_API to the auction Worker and build the Desk again." Now: "Call Obavia to connect it." |

## The dealer page and the buyer page

| Screen | The one verb (read aloud) | Must read | Pieces that touch | Verb: size, contrast | Price: size, contrast | Stranger under 10 s | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dealer, first viewport | Get on the lane | 22 (the headline) | headline, cloud button, the film frame | 17 px, 8.4:1 | n/a | Yes | **Fails, decision D4** (the film frame is empty until Dec 4). Caption 14 px at 4.4:1 to 17 px. |
| Application, each question | the answer (Yes, Not yet, a range) | 8 to 11 | question over its answers | 17 px, 15.0:1 | n/a | Yes | **Passes.** |
| Application, the losing car | Continue | 8 | question, field, Continue | 17 px, 8.3:1 | n/a | Yes | **Fixed.** Was: the cloud's crowns over the field; the placeholder cut off mid-word. Now clear, "Year, make, model, days on the lot". |
| Application, GDN | Continue | 4 | question, field, the TxDMV line under it | 17 px, 9.2:1 | n/a | Yes | **Fixed** (the line 15.5 px to 17 px). |
| Application, the key | Copy Key | 14 | the key, Copy Key, where to paste it | n/a | n/a | No, the same paste as the Desk | **Fails, decision D2.** |
| Dealer, what it costs | none | the statute (in full, as the law places it) | rule, citation with its date | n/a | n/a | n/a | **Fixed** (quote 16.5 to 17 px, citation 14.5 px at 4.6:1 to 17 px). |
| Dealer, how bad it can get; the close | Get on the lane | 8 | three worst cases; the question over the button | 17 px | n/a | Yes | **Fixed.** Was: the close button's crowns covered "on" in the question. |
| Buyer, first viewport | Get early access | 4 | headline, the lane as built, email, button | 17 px, 8.5:1 | n/a | Yes | **Fixed.** Was: the button's crowns covered half the email field. The button now sits at the fold's edge on 852. |
| Buyer, deposit pair | none | 6 | the deposit sheet image beside "$250 to bid. Back if you lose." | n/a | 35 px, 14.4:1 | Yes | **Passes (D5).** Both captures re-shot from the current build at 393 by 852 @2x (the cloud Pay with its 17 pt carve, Not now 17 px at 4.8:1; the license frame and the shutter), WebP inlined in `obavia-co/waitlist.css:117` and `:118`, aspect ratios at `:20` and `:21`. 8.3 KB and 2.6 KB; with the lane, the three inlined captures are 35.2 KB. |
| Buyer, dated fact; worst case | Get early access | 20 (the fact and its source) | $27,239 over its sentence over its source | 17 px, 8.6:1 | 58 px, 14.2:1 | Yes | **Fixed** (source 14.5 px at 4.4:1 to 17 px, link colour 5.1:1). |

## What was fixed (small and local)

1. **Grey on grey, everywhere.** The tokens that carry words now pass 4.5:1 on the sky and on the darkest cloud band (#DCE6FA), measured: faint #9AA1B0 (2.1:1) to #5F677A (4.5:1); muted #6B7385 (3.8:1) to #4F576B (5.8:1); accent words #4E6AA8 to #435D9B (5.1:1); warn and good darkened to 4.9:1 and 4.5:1. App `auction/src/theme.ts`, Desk `desk/src/styles.css` `:root`, site `obavia-co/lane.css` `:root`. Spaced-caps labels now default to muted.
2. **Nothing under 17 px.** The app's label (11), body (16), choice detail (13), ghost button (13), Caps (15), choice words (15), Lane copy (12), bars (12), terms (13), Paper (11), Scan, Pickup, Me, Car. The Desk's notes, row values, glosses, ring face, links. The site's captions, sources, application lines, nav, footer.
3. **System words to desk words.** "ceiling" to "max bid"; "ACH" to "Bank, transfer"; "Title through webDEALER" to "The title is signed at pickup."; "Release it" to "Get it back"; "Continue" (pass) to "Done"; the Worker URL and "VITE_AUCTION_API" taken off the glass.
4. **Pictograms to words or the object.** The Lane's dot-and-number became "23 watching"; the 2 by 2 grid glyph became the car's next photo beside its count; the insurance frame says "Insurance card".
5. **Things touching that should not.** The Bid sheet's crowns now sit about 50 pt below the terms at rest (the wiring agent's report); the sheet holds the held line and the max-bid row it used to clip; the site's three cloud buttons no longer sit on the field, the field, and the question above them.
6. **A step that did not open where the last ended.** The Buyers Guide and Bill of Sale opened inside the Sign page's column, half height, their title off the top; they now open over the whole glass.
7. **No italics.** The Desk's headline accent words were italic serif; they are upright.
8. **Lane top.** A short ink shade under the ring and the count, so white words read on a pale sky (1.3:1 to 4.8:1).

## Decisions needed (not built)

| # | Fail | Proposal |
| --- | --- | --- |
| D1 | ID facts: That's me stays disabled until each of five facts is tapped, and nothing on the glass says to tap them. A stranger presses the faint button and nothing happens. | That's me is live as soon as the facts arrive and confirms all five at once; tapping a fact opens it to correct (State keeps its wheel). Keeps one action, removes five hidden ones. Needs the owner's yes because it changes what the buyer attests to (D11's shill check reads the street line). **Built October 13, 2026 (orchestrator ruling): see the ID facts row.** |
| D2 | The dealer's key: the application ends on "Copy Key" and "Paste it in the Desk under Auction, then Key"; the Desk asks for a "d:P123456..." string. A desk person does not paste keys. | The key screen shows one button, "Open The Desk", a link carrying the key that the Desk stores itself; the Desk's key page becomes a fallback reached only from an expired link. Touches the application, the Desk and the Worker (systems, onboarding), so it goes through the orchestrator. **Built 2026-10-13** (onboarding): Open The Desk on the key screen, the key in the fragment, kept by the Desk before its first render and removed from the address bar; the Worker unchanged. On a phone where the Desk was never set up, the Desk's own onboarding still comes before Let It Go. |
| D3 | Desk Sold, owed: on an 852 phone six rows run under the dock's cloud at rest; the last row (tax to the county) is half covered until the page scrolls. | Until pickup show only Pay by, Deposit and Floor; the title (day 21) and tax rows join at Started, when they are the next thing (one-action rule 5). The clocks still run from the hammer and still show on the Desk home. Needs the paperwork agent's yes against decisions §9 D2 and D7. **Built October 13, 2026 (orchestrator ruling: keep both clocks, pad every dock page): see the Sold, owed row.** |
| D4 | Dealer first viewport: the film frame is an empty box captioned "Film in the works, December 4" under the one button. | Until the film exists, put the Desk's Let It Go screen as built (a real screenshot, labelled as the build) in the frame, or drop the frame and let the application rise into the first viewport. The plan's own line (section 2.1) says the frame stays empty, so this is an amendment, not a fix. |
| D5 | Buyer page: the deposit and ID images are screenshots of an older build (an ink Pay bar, "Not now" at 2:1, a 13 px "refunded if you lose"); they no longer match the app. | Re-shoot both from the current build at 393 by 852 with the shots in `scratchpad/legibility/shots/after/app/05-deposit.png` and `03-id-frame.png` as the source, and keep the "seeded, generated photo" caption. **Built October 13, 2026: see the Buyer, deposit pair row.** |
| D6 | The carved labels on every app cloud button (Bid, Pay, That's me, Done, Sign) are 13 px, under the 17 px floor; the ink layer reads 11.8:1, so size is the only failure. | Raise the carved label to 17 px with tracking kept at about 0.18 em, and re-render the 3D imprint at that size. `auction/src/components/CloudButton.tsx` and the cloud3d labels belong to the agent editing them now; hand-off, not touched here. **Built October 13, 2026 at 17 pt: see the Bid sheet row. Open: Back to the lane (the Won page's last button) is fitted to 12.8 pt because neither 17 nor 16 pt fits the safe rect; "To the lane" holds 17 pt (143 pt of 159). A word change, so it waits for a yes.** |
| D7 | The ID frame and the insurance frame are drawings of a card on dark glass until the camera is live on a phone. | Render the licence and the insurance card as objects (DOCTRINE §5, `tools/scene-3d/`), so the frame shows the thing to point at; the plain word stays until then. |

## Doctrine §6 lines for this hand-back

- Law obeyed: CF6 (one object of attention: nothing added, three overlaps removed); CP1 (the scanner surfaces got no new words; the only words added are "watching", "Insurance card" and "transfer", each replacing a pictogram or a system word); CP9 (the same "$250 held, back if you lose" in the app, Me and the buyer page).
- One action: unchanged on every screen; nothing new is primary. The max bid stays one faint word until wanted.
- Lego: the count beside its word, the photo count beside the photo it opens, the terms above the button with air between, the document over the glass where the step was.
- Legibility: verbs read aloud above; every word a person must read is 17 px or more and 4.5:1 or more measured from the pixels, except D1, D2 and D6.
- Clouds: material untouched; only the room around the cloud buttons changed.
- Claims: no claim added; the Desk's offline line says "Call Obavia to connect it", which is true.
- Deviation: none built. D4 would amend the growth plan's section 2.1 line and needs a dated changelog entry first.
