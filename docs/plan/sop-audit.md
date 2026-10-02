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

## Deliberate differences from the SOP

- **The stack.** The SOP's target is Next.js with Supabase under `/admin`. The Desk is a Vite and React app with a Cloudflare Worker. The routes map one to one (`#/sale/:id/guide/:step`, `#/sale/:id/paper/:doc/:q`, `#/sale/:id/packet`, `#/sign/:id`), and the pure logic is the same.
- **The condition report** is an Obavia addition to the packet, from the buy here pay here work. It's signed with the bill of sale.

## Still to build (the SOP asks; the Desk doesn't do it yet)

- Filling the official 130-U, VTR-271 and VTR-61 PDFs with `pdf-lib`. The Desk previews the fields that will be filled.
- Reading the licence barcode (AAMVA PDF417) and the offline front OCR. Today the ID is typed or confirmed by hand.
- Server-signed capture and ceremony tokens (HMAC, 15 and 20 minutes), and Text It and packet-status polling. Today the ceremony runs on the desk's own device.
- The webDEALER copy screen field by field, the sale clock board, and a fuller lender directory.

## Owner decisions

- Confirm the Texas Finance Code ceiling for your vehicle classes (`rateCeiling`). Until you do, 18% holds.
- Fill in the street, phone and signer once, through **Add Them**.
- Have counsel approve the Spanish translations before turning on Spanish e-signing.
