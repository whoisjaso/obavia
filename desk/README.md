# Obavia Desk

The dealership sale desk (Handle A Sale), in Obavia's look: one question per screen, the answer is the next tap, every figure computed, nothing typed twice. The logic follows the Handle A Sale SOP from the pilot dealership.

## What's here (frontend preview)

- **Onboarding:** name the dealership, pull or upload the logo (or use initials), pick a colour, bring cars (pick the current system or start with example cars), see the bill of sale in the dealer's name.
- **Handle A Sale:** open sales with "N Of M Signed" and the next step. Start A Sale covers the car (pick from the lot or decode a VIN with NHTSA), the odometer, title status, language, buyer and read-back.
- **The corridor:** buyer ID confirm with its own mailing-address confirmation, funding, lender, amount with a live receipt, tax basis, the sale plan (registration, plate, title signer, inspection, insurance), the salvage path and title work.
- **Documents:** per-document questions (bill of sale, 130-U with empty weight prefilled from the VIN, financing), then a review showing the dealer-branded sheet with the signature pad and File (or File Unsigned for ink).
- **Title and packet:** the webDEALER copy sheet, the packet, the buyer's signing ceremony (the pad unlocks only after reading to the end, with signature reuse behind consent), Complete Sale and Past Sales.

## Logic (pure, tested)

`src/lib/`: `money.ts` (every SOP test vector), `plan.ts`, `documents.ts` (`requiredDocumentTypes`), `sale.ts` (`buildGuideSteps`, `nextOpenStep`, "done" never stored), `paperwork.ts`, `vin.ts` (check digit and decode), `config.ts` (dealer facts in one place, guarded by a test).

```bash
npm install && npm test && npm run build
```

## Not built yet (needs the backend, per the SOP)

- Supabase tables and row-level security.
- Staff sign-in.
- Private storage for licence photos.
- HMAC capture and signing tokens with a real phone hand-off.
- AAMVA barcode and OCR reading.
- Official 130-U and VTR PDF filling with `pdf-lib`.
- SMS.
- Spanish document translations.
- Financing rate ceilings: the owner confirms them first.

The preview keeps everything in the browser with clearly labeled example data.
