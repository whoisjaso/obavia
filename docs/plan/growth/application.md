# Dealer application, Go confirmation, deposit confirmation

Written October 12, 2026 by onboarding with marketing. This application mirrors the call-funnel laws (plan §1.1: CF5, CF6, CF7, AD1, AD6; `dissect-callfunnel.md` §3 step 7 and psychology rows 5, 8, 12). It must be live, with the key issued on submit, by **Mon Nov 16, 2026**, because the week 6 gate says "Second dealer lists a car without a call." Paid traffic does not reach it before week 10 (dealer ads, plan CF2). Until then dealers arrive by hand and by referral.

Rules for every page:
- One question per page, big and centered, and the answer is the next tap (Desk rule, `dealer-gtm.md` §6). One action per page (`one-action.md`).
- No income question, no "how many cars do you sell", no price (there is none before the GDN), no testimonials (CF5, CF6).
- Three typed questions at most (CF §2.7). This application has three: the losing car, the GDN number and the name. The verification code and the email are entered, not answered.
- Plain sentences, American spelling, no exclamation marks.
- Every page logs a view and an advance, without identity beyond the application ID, so the drop between any two pages is a number.
- Car names, prices, close times and phone digits in the quoted copy below are examples. At run time they are filled from the dealer record, the lot and the server clock, never typed by hand.

Funnel numbers this application is held to, from the plan and the model. Every one is an ASSUMPTION until the scorecard replaces it.

| Stage | Floor | Source |
| --- | --- | --- |
| Click → application submitted | ≥ 3% | plan CF6; model §4.1 c_app worst defensible |
| Valid-GDN applications ÷ applications | ≥ 80% | plan AD6 |
| Submit → key pasted | **Floor 50%, target 84%** | Floor: plan CF5 ("Application → key ≥ 50%") and model §4.1 k worst defensible. Target: plan CF7 ("Submit → key pasted ≥ 84%"). The plan gives two numbers for one stage. The scorecard calls the stage contracted under 50%. 84% is the mirror of CF §2.7's 16% drop. |
| Key → first lot within 14 days | ≥ 50% | model §4.1 f worst defensible |
| Start → submit, and each page's drop | No floor in the plan | Recorded from the first application. A floor is written in `model.md` after two Mondays of data (model §8). When click → application is contracted, the page with the largest drop is that Monday's bottleneck (plan §3 step 3). |

Pixel events (AD1): submit fires `Lead`. A pasted key fires `CompleteRegistration`. No custom conversions.

---

## 1. The application, page by page

The application sits on the dealer page (headline, the Let It Go film, then the embedded application: CF6). Page 1 is embedded, so the first tap is the first answer, with no button in front of it (CF psych 4; CF claim 3).

### Block A. Layup: multiple choice first

**Page 1. The layup.**

| | |
| --- | --- |
| Copy | **Do you hold a Texas dealer license (GDN)?** |
| Field | Single choice, two full-width buttons: `Yes` · `Not yet` |
| Signals | "You are in the right place" for a licensed dealer (CF psych 5). Anyone without a license is told no on the first tap (AD law 6). |
| Desk uses it for | The gate. `Not yet` ends the application on one page: "The lane is for licensed Texas dealers. When your GDN issues, this page will be here." That page has no form and no email capture, because it is a stop. |
| Held to | Valid-GDN applications ÷ applications ≥ 80% (AD6). If `Not yet` passes 20% of starts, the ad copy is rewritten, not the page (AD6, plan §1.1). |

Reading of CF5. The plan says "The dealer application asks for the GDN number first (high friction on purpose: a non-dealer cannot pass)." This file asks the yes/no first and puts the number in the identity block (page 6), for two reasons. Identity goes last because it is the most abandoned step (CF psych 12). And the number's lookup returns the dealership name and the license phone, which page 8 needs. The friction CF5 wants is kept: no one passes page 6 without a GDN that matches the TxDMV list. If the owner wants the literal reading, page 6 moves to page 2 and no copy changes.

**Page 2. Lot size.**

| | |
| --- | --- |
| Copy | **How many cars are on your lot today?** |
| Field | Single choice: `1–10` · `11–30` · `31–75` · `76 or more` |
| Signals | Size of the desk and of the supply. It is easy to answer honestly because it isn't money (CF psych 8). |
| Desk uses it for | Desk math (model §2.1): how many lots this dealer's desk could run a week, so the second-desk clock can be read. It is not used to branch or to reject. |
| Held to | No per-page floor in the plan. The drop is recorded. |

### Block B. Qualifier second

**Page 3. Aged cars.**

| | |
| --- | --- |
| Copy | **How many of them have been on the lot more than 60 days?** |
| Field | Single choice: `None` · `1–2` · `3–5` · `6–10` · `11 or more` |
| Signals | Whether there is a losing car to put on the lane. It works as a competence question, like Fazio's arithmetic (CF psych 9): a dealer who knows the number knows his lot. |
| Desk uses it for | Sets the dealer's day count, so the Let It Go days ring turns amber past it (`decisions.md` §3.2). The default is 60. `None` still continues, because the friction here is chosen low. |
| Held to | No per-page floor in the plan. The drop is recorded. |

**Page 4. Floorplan.**

| | |
| --- | --- |
| Copy | **Do you floor-plan any of your cars?** |
| Field | Single choice: `Yes` · `No` |
| Signals | Whether titles sit at a lender, and how much holding costs him. |
| Desk uses it for | Pre-selects the "On my floorplan" chip on the title page of the first Let It Go and asks the lender's release lead time once (`decisions.md` §2 row 3; `collateral.md` §5). Payout with the lender paid first is Phase 3 (week 8 gate) and is not promised here. |
| Held to | No per-page floor in the plan. The drop is recorded. |

### Block C. One typed question third

**Page 5. The losing car.**

| | |
| --- | --- |
| Copy | **Which car are you losing money on this week?** |
| Hint (faint, inside the field) | Year, make, model, and how long it's been on the lot. |
| Field | One line of free text, 140 characters. Required. |
| Signals | Intent. Answer length is the proxy (CF claim 4). The answer also names the dealer's first lot in his own words. |
| Desk uses it for | Shown back on the key page ("Start with your 2014 Altima.") and pre-selected as the first Let It Go when it matches a car in his Desk. Answer length is logged beside key pasted and first lot, so the correlation can be read after twenty applications (CF claim 4 test). |
| Held to | No per-page floor in the plan. The drop is recorded. This is the most expensive page by design (CF5). |

### Block D. Personal information last, one field per page

**Page 6. The GDN number.**

| | |
| --- | --- |
| Copy | **What's your GDN number?** |
| Field | Typed, with type-ahead against the TxDMV dealer list (`desk/public/dealers/tx.index.json`, as of 2026-09-30, 19,666 rows). A match shows the legal name and city under the field. One button: `That's us`. With no match, the button stays disabled and one line reads "We can't find that number on the TxDMV list." |
| Signals | The hard filter: no one without a license gets past this page (CF5). |
| Desk uses it for | The dealer record. Puts the legal name and GDN on every lot and Reach post (`decisions.md` §2 row 12). Gives the license phone for page 8. |
| Held to | Valid-GDN applications ÷ applications ≥ 80% (AD6). |

**Page 7. Name.**

| | |
| --- | --- |
| Copy | **What's your name?** |
| Field | Typed: first and last name in one field |
| Signals | Nothing. It is identity, so it goes last (CF psych 12). |
| Desk uses it for | The name on the dealer's condition statements and Sold calls |
| Held to | No per-page floor in the plan. The drop is recorded. |

**Page 8. The code.**

| | |
| --- | --- |
| Copy | **We texted a code to the phone on your license, ending in 3294. Enter it here.** (The last four digits come from the lookup.) |
| Field | Six-digit code, using the code field's autofill. A faint "Send it again" appears after 30 seconds. |
| Signals | The person applying controls the dealership's licensed phone (`decisions.md` §2 row 10: "sellers only from the TxDMV list, verified by the licence's phone on file"). |
| Desk uses it for | Verification, using the Telnyx Verify path already built in `desk/server/` (`messaging.md`, build order 1–2). If the dealer no longer has that phone, admin fixes the record by hand. That fix is logged, and it counts against "without a call". |
| Held to | No per-page floor in the plan. The drop is recorded. |

**Page 9. Email.**

| | |
| --- | --- |
| Copy | **Where should we send a copy of your key?** |
| Field | Email |
| Signals | Nothing |
| Desk uses it for | One email (Resend) containing the key and the link to the Desk's key page. Nothing else is sent to it without marketing consent. |
| Held to | No per-page floor in the plan. The drop is recorded. Submit fires `Lead`. |

### The key, on the submit screen (CF7)

The submit screen is the key screen. There is no "we will call you" and no separate scheduler. The key plays the scheduler's part, and the first Let It Go plays the call's.

| | |
| --- | --- |
| Copy, headline | **Here is your key.** |
| Copy, the key | The key as a thing: its first and last four characters in Bodoni, the middle hidden (`d:P1 •••• tEx0`). |
| Primary action | `Open The Desk`, one cloud button: a link to the Desk with the key in the fragment (`<desk>#/auction/setup?key=<token>`). The fragment never reaches a server. The Desk keeps the key, takes it out of the address bar and the tab's history (`history.replaceState`) and lands on Let It Go with the landed moment. (Legibility audit D2, built 2026-10-13.) |
| Second line, faint | `Copy Key`, for a dealer opening the Desk on another device; it copies the whole key. |
| Copy, under it, faint | One key, one device. |
| Copy, last line, faint | Start with your 2014 Altima. (The page 5 answer, shown back.) |
| Built from | `POST /dealers` (Worker) issues the key; the Worker is unchanged. The Desk reads the fragment before its first render (`desk/src/lib/auction.ts` `takeKeyFromLink`). `#/auction/setup` is the fallback, reached from a link with no usable key or from Key on the Lane: one line, then the paste field, faint ("Keep It" appears once a key is in it). |
| Held to | Submit → key kept (by the link or the paste; the stage the plan calls "key pasted"): floor 50%, target 84%. A kept key fires `CompleteRegistration` (not built yet: the Desk carries no pixel). Key → first lot within 14 days ≥ 50%. |

What this needs that is not built yet, as of this file: today `POST /dealers` is an admin call. For the key to be issued on submit without a person, the Worker has to issue a key only after a verified page 8 code and a page 6 TxDMV match. That build belongs to onboarding, admin and systems, and it is due by Mon Nov 16, 2026. No copy here claims it before then.

---

## 2. Go confirmation (the Desk, dealer, due diligence)

This is what the dealer sees right after Go. The page is justification mode (CP1): due diligence, because Obavia started the category (CP3). It follows the CP order: acknowledge the action, then the main video, then the breakouts as questions, with no testimonials.

`one-action.md` row to add before it ships:

| Screen | Primary action | Secondary | Advanced, hidden until needed | Not yet relevant, hidden |
| --- | --- | --- | --- | --- |
| Go confirmation | play the main video | the breakouts; "Live" in faint text | chapters, inside the player | the dispute line until it exists |

Copy, top to bottom:

> **It's on the lane.**
> 2014 Nissan Altima · closes Tue 3:00 pm
>
> Check us before your first bid lands: what we hold, what we charge, and the worst that can happen.
>
> [Main video, video thumbnail] **Who is Obavia, and how bad can it get?** · 8:00
>
> [Image thumbnails, one per row, each title the question]
> What does Obavia charge me? · 1:15
> Who holds the buyer's $250 deposit? · 1:15
> Where should I set my floor? · 1:45
> When do I get paid, and what happens to my floorplan? · 1:45
> What if the buyer never pays? · 1:15
> What if the car doesn't start at pickup? · 1:15
>
> Live (faint)

The due-diligence line is the third line. Nothing on the page is a number Obavia has not sourced. The car and the close time come from the lot (server-timed, CP4). Durations are targets, replaced by the cut lengths. The six breakouts are D-01, D-02, D-03, D-05, D-09 and D-10 in `content.md`. Until the main video is cut, the page shows the six breakouts alone. CP8 says breakout play is read before and after the main video goes live.

---

## 3. Deposit confirmation (the phone, buyer, urgency)

This is what the buyer sees once the $250 deposit captures. It is urgency, because a car auction is a vehicle the viewer's grandfather would recognize and Obavia is the way in (CP3). The urgency rests on the lot's server-timed close, which the buyer can check in the app (CP4).

Where it appears. The first-bid script says "no toast, no text" after the acknowledgment (`decisions.md` §3.4), so this page never interrupts a bid. It opens in two ways. First, as the page behind the hollow deposit chip (tap the chip). Second, from one customer-care SMS sent 60 seconds after `payment.succeeded`, that reads "You're in. Your $250 is held." and links to this page. Frontend and onboarding sign off on that placement by Fri Nov 6, 2026. If they choose a different placement, the copy below stays as written.

`one-action.md` row to add before it ships:

| Screen | Primary action | Secondary | Advanced, hidden until needed | Not yet relevant, hidden |
| --- | --- | --- | --- | --- |
| Deposit confirmation | play the main video | the breakouts; "Back to the car" in faint text | chapters, inside the player | Won-screen pieces until a win |

Copy, top to bottom:

> **You're in.**
> $250 held. Refunded if you lose.
>
> The 2014 Altima closes Thu 3:00 pm.
>
> [Main video, video thumbnail] **Why bid now?** · 3:00
>
> [Image thumbnails, one per row]
> Do I get my $250 back if I lose? · 0:40
> What will this car really cost me? · 1:00
> How long do I have to pay after I win? · 0:50
> How do I pay the rest? · 1:00
> What if it doesn't start when I pick it up? · 0:50
> Is the car sold as-is? · 1:15
>
> Back to the car (faint)

The urgency line is the third line: one car, one time, from the server. The dated third-party fact belongs to the main video (`content.md` §3.2, S27, UNVERIFIED) and stays off this page until it is sourced. "Refunded if you lose" repeats the Bid sheet's words exactly (`auction/src/screens/BidSheet.tsx`), so the page, the sheet and the SMS say the same thing (CP9). The refund timing is not printed, because two house docs disagree on it (`content.md` S06). The six breakouts are B-01, B-02, B-06, B-07, B-10 and B-11.

---

## 4. Next action

Onboarding, admin and systems agree, by Fri Oct 23, 2026, who builds the key-on-submit path described in §1. It ships by Mon Nov 16, 2026.
