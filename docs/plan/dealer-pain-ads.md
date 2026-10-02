# Dealer pain ads

October 2, 2026. Owner direction:
- Lead with pain and keep pressing on it.
- Make the owner feel it before showing anything we do.
- The pains that move a dealer are **money and time**: the DMS bill and its add-ons, paying someone to file titles, and how slow and tedious one sale's paperwork is. A compliance scare on its own is not enough.

## The pains, ranked by how hard they hit

| # | Pain | The fact behind it (source) | What the Desk really does about it |
| --- | --- | --- | --- |
| 1 | **The DMS bill keeps growing.** A cheap base price, then an add-on for every part of the job. | One popular independent-dealer DMS publishes: DMS $99, buy here pay here +$50, accounting +$99, book values +$64, website +$99 to $125, credit subcode $15.95 to $55 a month. On top of that come $3 per eContract, $5 per printed deal and $4 to $5.70 per credit report (vendor pricing pages, October 2026; teardown in `cox-fullpath-dealercenter-teardown.md`). Frazer runs $129 a month on desktop and $199 hosted, with FrazerPay extra (`frazer-teardown.md`). | Buy here pay here payments, the paperwork, the title watch and the texts are all in the Desk. **The price isn't set yet**, so no ad may say "cheaper" or show our price until the owner sets one. |
| 2 | **Paying someone to file titles.** A runner or title service bills per title, and the county still kicks deals back. | Title services work Texas county tax offices; Harris County has its own drop-off rules for them. Prices seen online run about $25 to $35 a title (not Texas-verified, so no ad uses a number). Since July 1, 2025, every Texas dealer files title and registration in webDEALER (HB 718). | The Desk's title step lists every field webDEALER asks for, ready to copy, then "Plates Are On." The forms are filled from the sale, with the 130-U seller line webDEALER requires. |
| 3 | **One sale is a stack of paper, and one wrong box sends it back.** | webDEALER rejects deals for things like an invalid VIN or missing fees (TxDMV webDEALER user guide). Obavia's pilot lot had a 130-U rejected on September 30, 2026 because the seller line was wrong. | Handle A Sale asks one question per page and fills the 130-U, the Buyer's Guide, the bill of sale, the contract and the POA from the same answers. |
| 4 | **The 45-day clock and the complaint.** | Seller-financed sales must file within 45 days (Tex. Transp. Code 501.0234). Missing it ranges from a warning letter to **$10,000 per vehicle** (TxDMV disciplinary matrix). A buyer who goes to the tax office about it gets the dealer a complaint (TxDMV dealer manual, ch. 6). | The title watch counts every title: "3 days to file the title", then "Filed It Today". |
| 5 | **Not knowing who paid.** Cash in the drawer, autopay, the text link and bank deposits, all in different places. | Our own buy here pay here research (`bhph-payments.md`). | Payments, Close The Day and Tonight's Text. |

## The films

| Film | Pain | Status |
| --- | --- | --- |
| One Phone, One Evening (`films/src/evening`) | #5, shown calm | First cut. The owner's verdict: it shows what we do and doesn't press on pain. Kept as a product film. |
| Day 44 (`films/src/pain`) | #4 | Cut. The owner judged it "not crazy pain" alone; use it as a follow-up in the series. |
| **The Bill** (`films/src/bill`) | #1 and #2 | **Lead ad.** The invoice climbs line by line to $648.99, the title runner texts that the county kicked two deals back, then the typed lines: "You pay for the software. Then for every add-on. Then per contract. Per credit pull. Then someone to file your titles. What did your last sale really cost you?" The Desk's title step closes it. |

## Rules for every ad in the series
- **Pain first, at least half the running time,** in the owner's own world: their phone, their texts, their invoice. Few words, typed, never narrated.
- **Probe with a question they answer in their head:** "What did your last sale really cost you?" "How many are on your lot right now?"
- **Every number has a source** in the film's timeline file, and the end card says what is dramatized.
- **No vendor named on screen** unless counsel clears comparative claims. Describe the cost structure, not the company.
- **No "cheaper" claim and no Desk price** until the owner sets the price. Once it's set, the end line becomes the price against the bill.
- **Phone sounds only:** notifications, keys, taps, the lock button, the done chime. Silence is the loudest beat.

## Next in the series
1. **"Kicked Back."** One sale's stack of paper, one wrong box, and the county sends it back. The re-signs and the buyer calling, then the Desk's one-question pages filling every form.
2. **"Who Paid?"** Five places to look for one payment. Payments, then Close The Day.
3. **The price ad,** once the Desk's price exists: the bill against one line.
