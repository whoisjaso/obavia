# Obavia Desk

The dealership sale desk (Handle A Sale), in Obavia's look: one question per screen, the answer is the next tap, every figure computed, nothing typed twice. The logic follows the Handle A Sale SOP from the pilot dealership.

## What's here (frontend preview)

- **Onboarding:** pick the state, find the dealership in the state's licence list (Texas: the real TxDMV list, about 19,700 active dealers), confirm it, verify with a code to the phone or email on the licence (or the licence itself), logo, colour, the system they use today (49 real vendor logos in `public/systems`), and the bill of sale in their name.
- **Handle A Sale:** open sales with "N Of M Signed" and the next step. Start A Sale covers the car (pick from the lot or decode a VIN with NHTSA), the odometer, title status, language, buyer and read-back.
- **The corridor:** buyer ID confirm with its own mailing-address confirmation, funding, lender, amount with a live receipt, tax basis, the sale plan (registration, plate, title signer, inspection, insurance), the salvage path and title work.
- **Documents:** per-document questions (bill of sale, 130-U with empty weight prefilled from the VIN, financing), then a review showing the dealer-branded sheet with the signature pad and File (or File Unsigned for ink).
- **Title and packet:** the webDEALER copy sheet, the packet, the buyer's signing ceremony (the pad unlocks only after reading to the end, with signature reuse behind consent), Complete Sale and Past Sales.

## Logic (pure, tested)

`src/lib/`: `money.ts` (every SOP test vector), `plan.ts`, `documents.ts` (`requiredDocumentTypes`), `sale.ts` (`buildGuideSteps`, `nextOpenStep`, "done" never stored), `paperwork.ts`, `vin.ts` (check digit and decode), `config.ts` (dealer facts in one place, guarded by a test).

```bash
npm install && npm test && npm run build
```

## The Texas dealer list (nightly)

`ingest/` downloads the TxDMV Independent (GDN) Motor Vehicle Dealers List every night (`.github/workflows/txdmv-nightly.yml`, 6:17 am Central), reads it in whatever format arrives (legacy `.xls` today), and writes:

- `tx.index.json`: the public search index, with only the last four digits of the phone and a masked email. It is published to the `data-txdmv` branch and served by jsDelivr. The app loads it from there and falls back to the copy in `public/dealers/`.
- `tx.contacts.json`: full phone and email per licence, for sending verification codes. It goes to Cloudflare R2 only when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set. It is never committed and never uploaded as an artifact, because this repository is public.
- `tx.diff.json`: licences added and dropped since the last run.

A shrink guard refuses to publish a download that parses to fewer than 10,000 dealers, or 15% fewer than the last run. Run it by hand with `node ingest/txdmv.mjs --out out`.

## Not built yet (needs the backend, per the SOP)

- Supabase tables and row-level security.
- Staff sign-in.
- Private storage for licence photos.
- HMAC capture and signing tokens with a real phone hand-off.
- AAMVA barcode and OCR reading.
- Official 130-U and VTR PDF filling with `pdf-lib`.
- Sending the verification code (SMS or email) and reviewing licence uploads.
- Spanish document translations.
- Financing rate ceilings: the owner confirms them first.

The preview keeps everything in the browser with clearly labeled example data.
