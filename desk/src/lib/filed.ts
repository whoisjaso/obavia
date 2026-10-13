/* What prints is what was filed. Filing a document freezes the facts it was
   read from (the sale's answers, the car, the buyer, the dealer, the business
   date); every later print, preview and signing reads the frozen copy, never
   a regeneration from today's records (Handle A Sale SOP, After the paperwork).
   A signature's date is the business date it was signed on.

   A lane sale opens from the lane's signed PDFs (openLanePapers, below): the Buyers Guide and the bill of sale the
   buyer signed on the phone are the bytes the Desk uploaded at Go plus the Worker's stamp, the buyer's name and
   signature already on them. They are read, checked against the hash the Worker recorded, and never regenerated;
   the buyer's name starts the Desk's sale, so its paperwork is not blank. */
import { businessDate, type DealerConfig } from './config';
import { LENDERS } from '../data';
import { payment, PER_YEAR } from './paperwork';
import { solveTerms, type Agreed, type Terms } from './terms';
import { computeMoney, parseMoney } from './money';
import type { DocType } from './plan';
import type { AgreementState, Buyer, Sale } from './sale';

export type Frozen = { date: string; dealer: DealerConfig; sale: Pick<Sale, 'vehicle' | 'buyer' | 'step' | 'language'>;
  agent?: string };   // the staff member who handled the sale: printed beside the dealership on the 130-U's seller line

export function freeze(sale: Sale, dealer: DealerConfig, at = new Date(), agent?: string): Frozen {
  return JSON.parse(JSON.stringify({ date: businessDate(dealer.timeZone, at), dealer, sale: { vehicle: sale.vehicle, buyer: sale.buyer, step: sale.step, language: sale.language }, agent }));
}

/** The sale and dealer a document renders from: the frozen copy once filed, live while it's a draft. */
export function asFiled(doc: DocType, sale: Sale, dealer: DealerConfig, now = new Date()) {
  const a: AgreementState | undefined = sale.documents[doc], f = a?.state === 'filed' ? a.frozen : undefined;
  const s: Sale = f ? { ...sale, ...f.sale } : sale, d = f?.dealer ?? dealer;
  return { sale: s, dealer: d, agent: f?.agent, date: f?.date ?? businessDate(dealer.timeZone, now), signedOn: a?.signedAt ? businessDate(d.timeZone, new Date(a.signedAt)) : undefined, filed: !!f };
}

/** The lender's real name for the lien and the bill of sale, never its directory id. */
export function lenderName(f: Sale['step']['funding']): string | null {
  if (f?.type !== 'lender') return null;
  return f.lenderOther?.trim() || LENDERS.find(l => l.id === f.lenderId)?.name || null;
}

export function saleMoney(s: Sale, dealer: DealerConfig) {
  return computeMoney({ money: s.step.money, funding: s.step.funding?.type, tradeIn: parseMoney(s.step.paperwork?.billOfSale?.tradeAllowance) ?? 0, fees: dealer.fees });
}

/** The financing contract's figures, solved from what was agreed and held to the ceiling. */
export function financingTerms(s: Sale, dealer: DealerConfig): Terms & { principal: number; down: number; perYear: number } {
  const p = s.step.paperwork?.financing ?? {}, r = saleMoney(s, dealer);
  const down = parseMoney(p.down) ?? 0, principal = Math.max(0, Math.round((r.total - down) * 100) / 100), perYear = PER_YEAR[p.frequency] ?? 12;
  const agreed = (p.agreed as Agreed) ?? 'count';
  const t = solveTerms({ principal, perYear, agreed, payment: parseMoney(p.payment) ?? undefined, count: Number(p.count) || undefined, rate: p.rate !== undefined ? Number(p.rate) : undefined, ceiling: dealer.rateCeiling });
  return { ...t, payment: t.payment || payment(principal, t.rate, t.count, perYear), principal, down, perYear };
}

/* ---------- the lane's signed papers (auction/worker/src/sign.ts, GET /sales/:lot/papers) ---------- */
export type LanePaper = { original: string | null; signed: null | { path: string; view: string; at: number; reuse: boolean; consent: string; sha256: string; originalSha256: string } };
export type LanePapers = { lotId: string; buyer?: { name: string | null }; guide: LanePaper; bill: LanePaper };
/** One document as the Desk opens it: the signed bytes when the buyer signed, else the bytes uploaded at Go. */
export type LaneOpenedDoc = { pdf: Uint8Array; signed: boolean; at?: number; reuse?: boolean; consent?: string; sha256?: string };
export type LaneOpened = { buyerName: string; guide?: LaneOpenedDoc; bill?: LaneOpenedDoc };
/** The Worker, the dealer's key and fetch: passed in (sign.ts openLaneSale passes the live ones), so this file stays free of
    the browser-only auction module the Desk's server build cannot read. */
export type LaneIo = { api: string; key: string | null; fetch: typeof fetch };

export async function sha256Hex(b: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', b.slice()));
  return Array.from(d, x => x.toString(16).padStart(2, '0')).join('');
}

/** The sale's documents from the lane: signed where the buyer signed, the Go upload where not, the buyer's name.
    A signed copy whose bytes do not match the Worker's recorded hash is not opened (null for that document). */
export async function openLanePapers(lotId: string, io: LaneIo): Promise<LaneOpened | null> {
  if (!io.api || !io.key) return null;
  const auth = { Authorization: `Bearer ${io.key}` };
  let papers: LanePapers;
  try {
    const r = await io.fetch(`${io.api}/sales/${encodeURIComponent(lotId)}/papers`, { headers: auth });
    if (!r.ok) return null;
    papers = await r.json() as LanePapers;
  } catch { return null; }
  const out: LaneOpened = { buyerName: (papers.buyer?.name ?? '').trim() };
  for (const d of ['guide', 'bill'] as const) {
    const p = papers[d], path = p?.signed?.path ?? p?.original;
    if (!path) continue;
    try {
      const r = await io.fetch(`${io.api}${path}`, { headers: auth });
      if (!r.ok) continue;
      const pdf = new Uint8Array(await r.arrayBuffer());
      if (p.signed) {
        if ((await sha256Hex(pdf)) !== p.signed.sha256) continue;   // not the bytes the buyer signed
        out[d] = { pdf, signed: true, at: p.signed.at, reuse: p.signed.reuse, consent: p.signed.consent, sha256: p.signed.sha256 };
      } else out[d] = { pdf, signed: false };
    } catch { /* that document stays closed; the other still opens */ }
  }
  return out;
}

/** The Desk's buyer for a lane sale: the name the buyer signed under; the rest is asked at pickup. */
export function laneBuyer(opened: Pick<LaneOpened, 'buyerName'> | null): Buyer {
  return { fullName: opened?.buyerName ?? '', phone: '', address: '', city: '', state: 'TX', zip: '', county: '', idType: 'dl', idNumber: '' };
}

/** The bill of sale's row on the Desk's sale once the buyer signed it on the lane: filed with what it was signed
    on, buyer-signed, its signing time, and whether the first signature was reused with consent. */
export function laneBillAgreement(doc: LaneOpenedDoc, frozen: Frozen): AgreementState | null {
  if (!doc.signed || !doc.at) return null;
  const at = new Date(doc.at).toISOString();
  return { state: 'filed', frozen, buyerSigned: true, signedAt: at, signatureReused: !!doc.reuse, ...(doc.reuse ? { reuseConsentAt: at } : {}) };
}

/* ---------- the Filed mark (gap table W3-F: "the Desk's Filed mark carries the filed 130-U's hash") ----------
   Sold's Filed tap (W3-C, desk/src/Auction.tsx) marks the county's clock on the Worker (POST /lots/:id/plates). The
   mark names the exact 130-U that went to the county: the SHA-256 of its bytes, which are stable for a filed document
   (official.ts form130U with documents/stable-pdf.ts), the business date it was filed on and the agent on its seller
   line. W3-B's plates route takes the mark beside the state; until it does, the Desk keeps it on the sale. */
export type FiledMark = { state: 'filed'; form130U: { sha256: string; filedOn: string; agent?: string } };

/** The frozen business date (MM/DD/YYYY, the Texas form's own format, which stays on the paper) as the calendar day
    the Worker takes for filedOn (YYYY-MM-DD; auction/worker/src/auction.ts form130UFrom, README "The Filed mark").
    Anything that is not MM/DD/YYYY comes back unchanged, so the Worker's own check still names it. */
export function calendarDay(frozenDate: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(frozenDate.trim());
  return m ? `${m[3]}-${m[1]}-${m[2]}` : frozenDate;
}

/** The mark for a sale whose 130-U is filed, from the bytes the Desk printed (official.ts filed130U). Null while the
    130-U is a draft: a draft has no fixed bytes to name. */
export async function filedMark(sale: Sale, pdf: Uint8Array): Promise<FiledMark | null> {
  const f = sale.documents.form130U;
  if (f?.state !== 'filed' || !f.frozen) return null;
  return { state: 'filed', form130U: { sha256: await sha256Hex(pdf), filedOn: calendarDay(f.frozen.date), ...(f.frozen.agent ? { agent: f.frozen.agent } : {}) } };
}

/* ---------- the title step after the engine start (decisions §9 D8 and D9) ----------
   The words for the one step on Sold after the start (placed by W3-C) and the one line under Sign on the phone
   (auction/src/screens/won/SignDocs.tsx carries the same words; the Desk's sign.test.ts reads that file and holds
   them equal). Four words or fewer per line (DOCTRINE §4.7). Nothing here claims a county's timing or a fee.
   D8 (webDEALER Dealer User Guide, July 2026, pp. 8-9, App. 2; Bus. & Com. Code §322.007): a Texas licence signs the
   130-U and the odometer disclosure through the webDEALER Buyer Acknowledgment (Texas DL or ID, last four of the
   SSN, the audit number), not a drawn signature.
   D9 (43 TAC §215.144(g); Tax Code §152.092; Transp. Code §503.063 as amended by HB 718, eff. 7/1/2025): any other
   licence takes the paper packet at pickup: Form 14-312 signed in ink, the assigned title handed over or filed
   within 30 days, the green 60-day out-of-state plate. */
export type LaneTitleStep = { kind: 'acknowledgment' | 'packet'; title: string; lines: string[]; law: string };
export const TITLE_STEP: Record<LaneTitleStep['kind'], LaneTitleStep> = {
  acknowledgment: { kind: 'acknowledgment', title: 'Title at pickup', lines: ['Buyer Acknowledgment in webDEALER', 'Texas DL or ID', 'Last four, audit number', 'No drawn signature'],
    law: 'webDEALER Dealer User Guide (July 2026) pp. 8-9; Bus. & Com. Code §322.007' },
  packet: { kind: 'packet', title: 'Paper packet at pickup', lines: ['Form 14-312, signed', 'Assigned title handed over', 'Or filed, 30 days', 'Green 60-day plate'],
    law: '43 TAC §215.144(g); Tax Code §152.092; Transp. Code §503.063' },
};
/** The step for a buyer by licence state: Texas (or no state yet: the lane admits Texas licences only at launch) is
    the Buyer Acknowledgment; any other state is the paper packet. */
export function laneTitleStep(licenceState: string | null | undefined): LaneTitleStep {
  const s = (licenceState ?? '').trim().toUpperCase();
  return !s || s === 'TX' ? TITLE_STEP.acknowledgment : TITLE_STEP.packet;
}
/** The phone's one line under Sign: the title, then the lines, joined by the house dot. */
export const laneTitleLine = (step: LaneTitleStep) => [step.title, ...step.lines].join(' · ');
