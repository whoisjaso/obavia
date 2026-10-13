/* What the buyer signs on the lane, as the Desk prints it (gap table W2-A; phases, Phase 1 Paperwork: "the three
   documents the buyer signs are the same bytes the Desk prints"; decisions §9 D8: the drawn signature is for the
   bill of sale and the Buyers Guide acknowledgement, the 130-U and odometer go through webDEALER).

   At Go the Desk makes two PDFs and uploads each with its fields beside it (`<doc>.fields.json`): where the
   Worker stamps the buyer's drawn signature, printed name, the date and, on the bill of sale, the hammer and the
   date of sale. The Worker (auction/worker/src/sign.ts) appends the stamp to these exact bytes; it never
   regenerates them. Every rect is PDF points, origin bottom-left, on `page` (0 is the first page).

   The Buyers Guide is the FTC form as official.ts fills it, plus the buyer's acknowledgement of receipt below
   the form's box on page 1; the box and every word of the form are untouched. The bill of sale is the lane's
   own one page, every line of it a fact the lane holds or a rule cited beside it. */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { DealerConfig } from './config';
import type { Sale, Vehicle } from './sale';
import { buyersGuidePdf } from './official';
import { AUCTION_API, dealerKey, putDocument } from './auction';
import { openLanePapers, type LaneOpened } from './filed';

/** The consent the buyer gives by signing, and its version: the same as the Worker's (sign.ts) and the phone's
    (Paper.tsx). Texas UETA: the parties agree to conduct the transaction electronically (Bus. & Com. Code §322.005(b));
    an electronic signature satisfies a signature requirement (§322.007(d)). */
export const CONSENT_VERSION = '2026-10-13';
export const CONSENT_TEXT = 'I agree to sign electronically.';

export type LaneDoc = 'guide' | 'bill';
export type Rect = { x: number; y: number; w: number; h: number };
export type SignFields = { v: 1; doc: LaneDoc; consent: string; page: number; signature: Rect; name?: Rect; date?: Rect; price?: Rect; soldOn?: Rect; audit?: Rect };

/* ---------- the Buyers Guide: the acknowledgement below the box on page 1 ----------
   The FTC English guide (2016) draws its box from y 54 to 738 (1 pt rule, read off the form's own vector path) and
   its last line (the Spanish-sale note) at baseline 88. The acknowledgement goes below the box, so nothing inside
   the form moves: the sentence at 44, the three rules at 22, their labels at 14. The sentence is the FTC's optional
   acknowledgement of receipt (16 CFR 455; the exact subsection and placement are UNVERIFIED, counsel question). */
export const GUIDE_BOX = { x: 54, y: 54, w: 504, h: 684 } as const;
export const GUIDE_ACK = 'I hereby acknowledge receipt of the Buyers Guide at the closing of this sale.';
const GUIDE_RULE_Y = 22;
export const GUIDE_FIELDS: SignFields = {
  v: 1, doc: 'guide', consent: CONSENT_VERSION, page: 0,
  signature: { x: 54, y: GUIDE_RULE_Y + 1, w: 236, h: 19 },
  name: { x: 300, y: GUIDE_RULE_Y + 2, w: 150, h: 12 },
  date: { x: 460, y: GUIDE_RULE_Y + 2, w: 98, h: 12 },
  audit: { x: 362, y: 40, w: 196, h: 8 },
};

/* ---------- the bill of sale: one page, the lane's facts ---------- */
const BILL_SIG_Y = 150;
export const BILL_FIELDS: SignFields = {
  v: 1, doc: 'bill', consent: CONSENT_VERSION, page: 0,
  signature: { x: 54, y: BILL_SIG_Y + 1, w: 260, h: 34 },
  date: { x: 340, y: BILL_SIG_Y + 2, w: 120, h: 14 },
  name: { x: 54, y: 586, w: 380, h: 16 },
  price: { x: 54, y: 448, w: 200, h: 18 },
  soldOn: { x: 300, y: 448, w: 160, h: 18 },
  audit: { x: 54, y: BILL_SIG_Y - 22, w: 400, h: 8 },
};
export const FIELDS: Record<LaneDoc, SignFields> = { guide: GUIDE_FIELDS, bill: BILL_FIELDS };

/** The lane's four terms, agreed at the buyer's first bid (auction/worker/src/bidders.ts TERMS, version 2026-10-13; decisions §9 D10). */
export const LANE_TERMS_VERSION = '2026-10-13';
export const LANE_TERMS = ['with reserve unless marked no reserve', 'neither the seller nor Obavia bids', 'bids are irrevocable', 'the sale completes at the VIN scan and engine start'] as const;

const INK = rgb(0, 0, 0), MUTED = rgb(0.32, 0.36, 0.42);

function rule(page: PDFPage, x: number, y: number, w: number) {
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 0.75, color: INK });
}
function label(page: PDFPage, font: PDFFont, t: string, x: number, y: number, size = 7) {
  page.drawText(t, { x, y, size, font, color: MUTED });
}
function fit(font: PDFFont, t: string, size: number, w: number) {
  let s = size; while (s > 6 && font.widthOfTextAtSize(t, s) > w) s -= 0.25; return s;
}

/** The FTC Buyers Guide official.ts fills for the window, with the buyer's acknowledgement below the box. */
export async function laneGuidePdf(vehicle: Vehicle, dealer: DealerConfig): Promise<Uint8Array> {
  const filled = await buyersGuidePdf({ vehicle } as Sale, dealer, 'en');
  const pdf = await PDFDocument.load(filled);
  const page = pdf.getPage(GUIDE_FIELDS.page);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(GUIDE_ACK, { x: 54, y: 44, size: fit(font, GUIDE_ACK, 7.5, 300), font, color: INK });
  const f = GUIDE_FIELDS;
  for (const [r, l] of [[f.signature, 'Buyer signature'], [f.name!, 'Buyer name'], [f.date!, 'Date']] as const) {
    rule(page, r.x, GUIDE_RULE_Y, r.w);
    label(page, font, l, r.x, GUIDE_RULE_Y - 8, 6.5);
  }
  return pdf.save();
}

/** The lane's bill of sale: seller, buyer, car, price, the as-is line and the four terms, the buyer's signature.
    The buyer's name, the hammer and the dates are blank at Go; the Worker stamps them at signing. */
export async function laneBillPdf(vehicle: Vehicle, dealer: DealerConfig): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Bill of Sale'); pdf.setProducer('Obavia Desk');
  const page = pdf.addPage([612, 792]);
  const reg = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const text = (t: string, x: number, y: number, size = 11, font = reg, w = 504) => page.drawText(t, { x, y, size: fit(font, t, size, w), font, color: INK });
  const wrap = (t: string, x: number, y: number, size: number, w: number, lead = size * 1.35) => {
    const words = t.split(' '); let line = '', yy = y;
    for (const word of words) { const next = line ? `${line} ${word}` : word; if (reg.widthOfTextAtSize(next, size) > w && line) { text(line, x, yy, size); yy -= lead; line = word; } else line = next; }
    if (line) { text(line, x, yy, size); yy -= lead; }
    return yy;
  };
  const f = BILL_FIELDS;

  text('Bill of Sale', 54, 730, 22, bold);
  text('Sold at public auction on the Obavia lane.', 54, 712, 10);

  label(page, reg, 'SELLER (DEALER)', 54, 680);
  text(dealer.legalName || '', 54, 664, 12, bold);
  text(`Texas Dealer License ${dealer.licence || ''}`.trim(), 54, 649, 10);
  text([dealer.street, dealer.city, [dealer.state, dealer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '), 54, 635, 10);
  if (dealer.phone) text(dealer.phone, 54, 621, 10);

  label(page, reg, 'BUYER', 54, 606);
  rule(page, f.name!.x, f.name!.y - 2, f.name!.w);

  label(page, reg, 'VEHICLE', 54, 560);
  text(`${vehicle.year} ${vehicle.make} ${vehicle.model}`, 54, 544, 12, bold);
  text(`VIN ${vehicle.vin}`, 54, 529, 10);
  text([vehicle.stock ? `Stock # ${vehicle.stock}` : '', vehicle.mileage != null ? `Mileage at listing ${vehicle.mileage.toLocaleString('en-US')}` : ''].filter(Boolean).join('     '), 54, 515, 10);

  label(page, reg, 'SALE PRICE', f.price!.x, 472);
  label(page, reg, 'DATE OF SALE', f.soldOn!.x, 472);
  rule(page, f.price!.x, f.price!.y - 2, f.price!.w);
  rule(page, f.soldOn!.x, f.soldOn!.y - 2, f.soldOn!.w);

  let y = 410;
  text('Sold as is, no dealer warranty.', 54, y, 11, bold); y -= 15;
  y = wrap('The Buyers Guide for this vehicle is part of this contract and overrides any contrary provision in it (16 CFR 455.3(b)).', 54, y, 10, 504);
  y -= 8;
  y = wrap(`The conditions of the sale, agreed at the buyer's first bid (terms ${LANE_TERMS_VERSION}):`, 54, y, 10, 504);
  for (const t of LANE_TERMS) y = wrap(`- ${t[0].toUpperCase()}${t.slice(1)}.`, 66, y, 10, 492);

  rule(page, f.signature.x, BILL_SIG_Y, f.signature.w);
  rule(page, f.date!.x, BILL_SIG_Y, f.date!.w);
  label(page, reg, 'BUYER SIGNATURE', f.signature.x, BILL_SIG_Y - 10);
  label(page, reg, 'DATE', f.date!.x, BILL_SIG_Y - 10);
  rule(page, 54, 80, 260);
  label(page, reg, 'DEALER REPRESENTATIVE (AT PICKUP)', 54, 70);
  return pdf.save();
}

export type LaneDocuments = Record<LaneDoc, { pdf: Uint8Array; fields: SignFields }>;

/** Both documents for Go, with their fields. */
export async function laneDocuments(vehicle: Vehicle, dealer: DealerConfig): Promise<LaneDocuments> {
  const [guide, bill] = await Promise.all([laneGuidePdf(vehicle, dealer), laneBillPdf(vehicle, dealer)]);
  return { guide: { pdf: guide, fields: GUIDE_FIELDS }, bill: { pdf: bill, fields: BILL_FIELDS } };
}

type Io = { api: string; key: string | null; fetch: typeof fetch };
const liveIo = (): Io => ({ api: AUCTION_API, key: dealerKey.get(), fetch: (...a) => fetch(...a) });

/** The fields beside a document already uploaded (PUT /sales/:lot/fields/:doc). */
export async function putFields(lot: string, fields: SignFields, io: Io = liveIo()): Promise<boolean> {
  if (!io.api || !io.key) return false;
  try {
    const r = await io.fetch(`${io.api}/sales/${lot}/fields/${fields.doc}`, { method: 'PUT', headers: { Authorization: `Bearer ${io.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
    return r.ok;
  } catch { return false; }
}

/** At Go: each PDF, then its fields. Returns the documents' paths for CarMeta.documents; a document whose PDF or
    fields did not land is left out, so the phone never offers a page the Worker cannot stamp. */
export async function uploadLaneDocuments(lot: string, docs: LaneDocuments): Promise<{ guide?: string; bill?: string }> {
  const out: { guide?: string; bill?: string } = {};
  for (const d of ['guide', 'bill'] as const) {
    const r = await putDocument(lot, d, docs[d].pdf);
    if (r.ok && (await putFields(lot, docs[d].fields))) out[d] = r.value.url;
  }
  return out;
}

/** Open The Paperwork for a lane sale: the signed PDFs (or the Go uploads) and the buyer's name, from the Worker. */
export const openLaneSale = (lot: string): Promise<LaneOpened | null> => openLanePapers(lot, liveIo());
