# Handle A Sale: the Desk checked against the SOP

Audited October 2, 2026 against `premium-dealer-build/references/handle-a-sale-desk-sop.md`, the owner's SOP that is bundled in the premium-dealer-build skill. Every rule below names where it lives in `desk/` and what proves it.

## Holds as written

| SOP rule | Where | Proof |
| --- | --- | --- |
| Money model: out-the-door and vehicle-only, tax after trade-in, implied paid, balance, money-box parsing | `lib/money.ts` | `logic.test.ts`: all six SOP test vectors, plus parsing, the clamp, and lender balance 0 |
| The plan chain is derived; `false` counts as an answer; switching registration clears the other branch's answers | `lib/plan.ts` | `logic.test.ts` |
| What the plan adds to the packet: rebuilt disclosure, 130-U ↔ vehicle responsibility, power of attorney only when we sign, insurance acknowledgment | `lib/plan.ts` | `logic.test.ts` |
| Power of attorney form: VTR-271 for a car 20 or more years old, VTR-271-A under 20, ask when the year is unknown | `poaInstrument` | `logic.test.ts` |
| `requiredDocumentTypes`: a lender deal never gets the financing contract; tow-away gets the salvage sheets only | `lib/documents.ts` | `logic.test.ts` |
| Walk order: rebuilt disclosure first, financing last | `WALK_ORDER` | `logic.test.ts` |
| Steps 1 to 15, a step that doesn't apply is absent, no document step before the plan is complete, `nextOpenStep` | `lib/sale.ts buildGuideSteps` | `logic.test.ts` (guide) |
| Plan answers lock once a plan-derived document is filed, and the screen names that document | `Corridor.tsx` with `PLAN_FREEZERS` | walk |
| Language: required, no default | `Sales.tsx` (start) | walk |
| Odometer entered once and read by every document | `startSale` writes `vehicle.mileage` | walk |
| County comes from the city and is asked only when it can't be derived | `TX_COUNTY`, `Sales.tsx` | `sop.test.ts` |
| Business date in the dealer's time zone, never UTC | `businessDate` | `sop.test.ts` (8:30 pm in Houston prints the same day) |
| Signature pad rejects a stroke under 200 characters | `ui.tsx Pad` | — |
| Ceremony: the pad unlocks only after reading to the end; the power of attorney is never e-signed; reusing the first signature needs consent; a Spanish sale ends with Print For Ink | `Packet.tsx Ceremony` | walk |
| Filing unsigned and printing for ink is always allowed | `Paper.tsx` | walk |
| Dealer facts are typed only in the config | `config.ts`, plus the guard in `logic.test.ts` | test |

## Fixed in this audit

1. **What prints is what was filed.** Filing now freezes the sale, car, buyer, dealer and business date onto the document (`lib/filed.ts`). Every print, preview and ceremony reads the frozen copy, and the purchaser's line carries the date it was signed. Before this, a packet printed tomorrow showed tomorrow's date and today's records.
2. **Lender named, not its id.** A bank deal printed the directory id (for example "chase") as the lienholder and on the bill of sale. It now prints the lender's name (`lenderName`).
3. **Financing: "What Did You Agree On?"** The question now has three answers: The Payment, The Number Of Payments, or Both. The rest is solved (`lib/terms.ts`).
4. **The rate ceiling.**
   - The APR is held to the ceiling the owner confirms for their vehicles, and never below the 18% minimum (Fin. Code §303.009).
   - If the agreed figures imply a higher rate, the rate is brought down to the ceiling and the payment recomputed. The contract says so in words.
   - The buy here pay here note opens from the same solved terms.
   - No class ceiling is encoded: `dealer.rateCeiling` stays empty until the owner confirms one.
5. **130-U: "Which State Issued Their Licence?"** It is now asked, prefilled from the buyer's address, and printed on the ID line.
6. **Signature evidence on the document's own row:** signed via (desk or ceremony), user agent (first 240 characters), when the sheet was read to the end, whether the signature was reused, and when the buyer consented to the reuse.
7. **Missing legal facts.**
   - The letterhead and the parties block now print `[Not set: …]` instead of leaving a gap.
   - Filing is refused while any fact is missing: legal name, street, city, ZIP, county, phone, licence, signer, or doc fee.
   - The refusal links to **Add Them** (`#/facts`), one question per screen. Onboarding from the TxDMV list leaves the street, phone and signer to the owner, so this is the path every real dealer takes once.
8. **The bill of sale's balance sentence** now reads "Balance owed by the buyer to the seller under this bill of sale", per the SOP.
9. **Rebuilt disclosure.** It now prints the state's sentence word for word, from TxDMV Form ENF-MV-RBLT DSCLMR (Rev. 02/17), in the purchaser's voice, over the year, make and VIN.
10. **Vehicle responsibility** now states the late fee (Tex. Transp. Code §501.146): $10 to a licensed dealer, $25 more for each 30 days after day 60, up to $250.
11. **Spanish sheets** show "Translation pending counsel review" until the owner records approval (`dealer.spanishApproved`), and Spanish e-signing stays off until then.
12. **County table.** It now uses "Missouri City" (the key was "missouri"). Katy, which spans three counties, now asks instead of guessing.

## Built from the production engine (October 2)

The form engine is ported from the production desk unchanged, apart from where the dealer's facts come from (`lib/dealership-config.ts`).

- **Official forms are the official PDFs.** The 130-U, VTR-271, rebuilt disclosure (ENF-MV-RBLT-DSCLMR) and the FTC Buyer's Guide (English and Spanish) are filled with `pdf-lib` from `public/forms/`. Every preview, the review and the signing ceremony included, is that filled PDF rendered with pdf.js. No HTML lookalikes remain. (`lib/official.ts`, `OfficialForm.tsx`)
- **The 130-U seller line** reads "Legal Name (Agent Full Name)". webDEALER rejected the dealership name alone on September 30, 2026. The agent is the staff member at filing. It is frozen with the document and checked by `isPersonName`, falling back to the dealer's signer. Staff are now added by full legal name.
- **The 130-U boxes:**
  - measured columns for names, addresses, previous owner and lienholder;
  - Box 15 from the ID kind;
  - a lender's lien leaves the address blank;
  - 38(d), (e) and (h) are left for the county;
  - Helvetica, black, fitted sizes.
- **VTR-271 vs VTR-271-A** by model age. A car under 20 years old is refused with the VTR-271-A message.
- **Typed fields are limited by what the form needs:**
  - ID kind first, then the issuer;
  - ID number capped per state or country (Texas: 8);
  - a shape warning that never blocks;
  - phone formatted and complete at 10 digits;
  - VIN 17, plate 8, state 2.
- **Dealer-authored paper is production's own templates.** The bill of sale, contract, vehicle responsibility, insurance acknowledgment and salvage sheets are drawn by the production document components and stylesheet, in an isolated frame, under production's print rules (letter, 0.6in margins). "Open The PDF" prints the same page. The condition report uses the same system. (`Sheet.tsx`, `paper/*`, `lib/paper.ts`)
- **Per-dealer facts.** Venue clauses and the POA county read the dealer's county. The late-handling fee is the dealer's own (`fees.lateHandling`, $0 until set).
- **The Buyer's Guide fill uses the FTC PDF's measured lines.** Values are set in regular Helvetica in black, resting on their rules. The X sits inside the AS IS box with an even margin.
- **Onboarding asks every fact the paper prints, one per page.** It confirms the lot address (or asks for it), then asks the phone, email, signer's full legal name, their title, the documentary fee and the late-handling fee. A new dealer no longer inherits the example's doc fee.
- **Every screen change uses one transition**, matched to obavia.co: a quick fade out, a soft fade in with a slight rise, and contents arriving in a light stagger. The sky stays still. Reduced motion turns it off.
- Tests: the production suites (`lib/forms/__tests__`) and `lib/official.test.ts`.

## Deliberate differences from the SOP

- **The stack.** The SOP's target is Next.js with Supabase under `/admin`. The Desk is a Vite and React app with a Cloudflare Worker. The routes map one to one (`#/sale/:id/guide/:step`, `#/sale/:id/paper/:doc/:q`, `#/sale/:id/packet`, `#/sign/:id`), and the pure logic is the same.
- **The condition report** is an Obavia addition to the packet, from the buy here pay here work. It's signed with the bill of sale.

## Still to build (the SOP asks; the Desk doesn't do it yet)

- Reading the licence barcode (AAMVA PDF417) and the offline front OCR. Today the ID is typed or confirmed by hand.
- Server-signed capture and ceremony tokens (HMAC, 15 and 20 minutes), and Text It and packet-status polling. Today the ceremony runs on the desk's own device.
- The webDEALER copy screen field by field, the sale clock board, and a fuller lender directory.

## Owner decisions

- Confirm the Texas Finance Code ceiling for your vehicle classes (`rateCeiling`). Until you do, 18% holds.
- Fill in the street, phone and signer once, through **Add Them**.
- Have counsel approve the Spanish translations before turning on Spanish e-signing.
