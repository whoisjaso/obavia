import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, PDFName } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { EXAMPLE_DEALER } from './config';
import type { Vehicle } from './sale';
import { BILL_FIELDS, CONSENT_VERSION, FIELDS, GUIDE_BOX, GUIDE_FIELDS, LANE_TERMS, LANE_TERMS_VERSION, UPLOAD_STEPS, laneDocuments, uploadLaneDocuments, type Rect } from './sign';
import { TITLE_STEP, calendarDay, filedMark, freeze, laneBillAgreement, laneBuyer, laneTitleLine, laneTitleStep, openLanePapers, type LanePapers } from './filed';
import { readFileSync } from 'node:fs';
// the Worker's own stamper and checks, run on the Desk's real bytes: the same code that signs in production
import { CONSENT_VERSION as WORKER_CONSENT, assemblePack, packCover, parseFields, parseSignature, stampPdf, type PackFacts } from '../../../auction/worker/src/sign';
import { TERMS, TERMS_VERSION } from '../../../auction/worker/src/bidders';

const CAR: Vehicle = { id: 'v1', stock: 'A1042', vin: '1N4AL3AP0EC000001', year: 2014, make: 'Nissan', model: 'Altima', bodyStyle: 'Sedan', price: 7995, mileage: 128400, emptyWeight: 3100, color: 'Silver', titleStatus: 'clean' } as Vehicle;
const SVG = '<svg viewBox="0 0 357 150"><path d="M20 90 L40 60 L61 95 L80 58 L120 88 L160 70"/></svg>';

type Item = { str: string; x: number; y: number; w: number; h: number };
async function pageText(pdf: Uint8Array, index: number): Promise<{ w: number; h: number; items: Item[] }> {
  const doc = await getDocument({ data: pdf.slice(), verbosity: 0 }).promise;
  const page = await doc.getPage(index + 1), vp = page.getViewport({ scale: 1 });
  const items = (await page.getTextContent()).items.flatMap(i => 'str' in i && i.str.trim() ? [{ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: i.height || Math.abs(i.transform[3]) }] : []);
  return { w: vp.width, h: vp.height, items };
}
const overlaps = (r: Rect, i: Item) => i.x < r.x + r.w && i.x + i.w > r.x && i.y < r.y + r.h && i.y + i.h > r.y;
const rects = (f: typeof GUIDE_FIELDS) => Object.entries(f).filter(([, v]) => v && typeof v === 'object') as [string, Rect][];

const docs = laneDocuments(CAR, EXAMPLE_DEALER);

describe('the field rects', () => {
  it('the Desk and the Worker carry the same consent version, and the Worker accepts both fields files', () => {
    expect(CONSENT_VERSION).toBe(WORKER_CONSENT);
    expect(parseFields(JSON.parse(JSON.stringify(GUIDE_FIELDS)), 'guide')).toEqual(GUIDE_FIELDS);
    expect(parseFields(JSON.parse(JSON.stringify(BILL_FIELDS)), 'bill')).toEqual(BILL_FIELDS);
    expect(parseFields(JSON.parse(JSON.stringify(BILL_FIELDS)), 'guide')).toBeNull();
  });

  it('the bill of sale prints the lane\'s four terms, word for word, at the Worker\'s version', () => {
    expect(LANE_TERMS_VERSION).toBe(TERMS_VERSION);
    expect([...LANE_TERMS]).toEqual([...TERMS]);
  });

  for (const d of ['guide', 'bill'] as const) {
    it(`${d}: every rect is on the page and clear of every printed word`, async () => {
      const { pdf } = (await docs)[d];
      const f = FIELDS[d];
      const t = await pageText(pdf, f.page);
      expect([t.w, t.h]).toEqual([612, 792]);
      for (const [k, r] of rects(f)) {
        expect(r.x, k).toBeGreaterThanOrEqual(0); expect(r.y, k).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w, k).toBeLessThanOrEqual(t.w); expect(r.y + r.h, k).toBeLessThanOrEqual(t.h);
        const hit = t.items.filter(i => overlaps(r, i));
        expect(hit.map(i => i.str), `${d}.${k}`).toEqual([]);
      }
    });
  }

  it('the guide\'s acknowledgement sits below the FTC box: the form itself is untouched', async () => {
    for (const [k, r] of rects(GUIDE_FIELDS)) expect(r.y + r.h, k).toBeLessThan(GUIDE_BOX.y);
    const t = await pageText((await docs).guide.pdf, 0);
    expect(t.items.map(i => i.str).join(' ')).toContain('I hereby acknowledge receipt of the Buyers Guide at the closing of this sale.');
  });
});

describe('stamping the Desk\'s real bytes with the Worker\'s stamper', () => {
  for (const d of ['guide', 'bill'] as const) {
    it(`${d}: the original bytes first and unchanged; pdf-lib and pdf.js both read the signed file; the name is on it`, async () => {
      const { pdf, fields } = (await docs)[d];
      const signed = await stampPdf(pdf, fields, { ink: parseSignature(SVG)!, name: 'Marisol Treviño', date: '10/13/2026', price: '$5,100', soldOn: '10/12/2026', audit: 'Signed electronically on Obavia, 10/13/2026. Consent 2026-10-13.' });
      expect(Buffer.from(signed.subarray(0, pdf.length)).equals(Buffer.from(pdf))).toBe(true);
      const again = await PDFDocument.load(signed);
      expect(again.getPageCount()).toBe((await PDFDocument.load(pdf)).getPageCount());
      const words = (await pageText(signed, fields.page)).items.map(i => i.str).join(' ');
      expect(words).toContain('Marisol Treviño');
      expect(words).toContain('10/13/2026');
      if (d === 'bill') { expect(words).toContain('$5,100'); expect(words).toContain('10/12/2026'); }
      if (process.env.W2A_OUT) {   // fixtures for the phone's screenshot: the Go upload and its signed copy
        mkdirSync(process.env.W2A_OUT, { recursive: true });
        writeFileSync(`${process.env.W2A_OUT}/${d}.pdf`, pdf); writeFileSync(`${process.env.W2A_OUT}/${d}.signed.pdf`, signed);
        writeFileSync(`${process.env.W2A_OUT}/${d}.fields.json`, JSON.stringify(fields));
      }
    });
  }
});

describe('the Desk opens a lane sale from the signed PDFs', () => {
  const api = 'https://w.test', key = 'd:P000000.sig';
  async function lane(signedGuide: Uint8Array, original: Uint8Array, tamper = false) {
    const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', signedGuide.slice())), x => x.toString(16).padStart(2, '0')).join('');
    const papers: LanePapers = { lotId: 'l1', buyer: { name: ' Marisol Treviño ' },
      guide: { original: '/documents/l1/guide.pdf', signed: { path: '/sales/l1/signed/guide.pdf', view: '/sales/l1/view/guide', at: Date.UTC(2026, 9, 13, 17), reuse: false, consent: CONSENT_VERSION, sha256: sha, originalSha256: 'x' } },
      bill: { original: '/documents/l1/bill.pdf', signed: null } };
    const seen: string[] = [];
    const fetch = (async (u: string, init?: RequestInit) => {
      seen.push(`${u} ${(init?.headers as Record<string, string>)?.Authorization}`);
      if (u === `${api}/sales/l1/papers`) return new Response(JSON.stringify(papers));
      if (u === `${api}/sales/l1/signed/guide.pdf`) return new Response(tamper ? signedGuide.slice(0, -1) : signedGuide.slice());
      if (u === `${api}/documents/l1/bill.pdf`) return new Response(original.slice());
      return new Response('', { status: 404 });
    }) as typeof globalThis.fetch;
    return { opened: await openLanePapers('l1', { api, key, fetch }), seen };
  }

  it('signed documents open as the signed bytes, unsigned ones as the Go upload, with the buyer\'s name; never blank', async () => {
    const { guide, bill } = await docs;
    const signed = await stampPdf(guide.pdf, guide.fields, { ink: parseSignature(SVG)!, name: 'Marisol Treviño', date: '10/13/2026' });
    const { opened, seen } = await lane(signed, bill.pdf);
    expect(opened?.buyerName).toBe('Marisol Treviño');
    expect(opened?.guide?.signed).toBe(true);
    expect(Buffer.from(opened!.guide!.pdf).equals(Buffer.from(signed))).toBe(true);
    expect(opened?.bill).toEqual({ pdf: bill.pdf, signed: false });
    expect(seen.every(s => s.endsWith(`Bearer ${key}`))).toBe(true);
    expect(laneBuyer(opened).fullName).toBe('Marisol Treviño');
  });

  it('a signed copy that is not the bytes the Worker recorded is not opened', async () => {
    const { guide, bill } = await docs;
    const signed = await stampPdf(guide.pdf, guide.fields, { ink: parseSignature(SVG)!, name: 'A' });
    const { opened } = await lane(signed, bill.pdf, true);
    expect(opened?.guide).toBeUndefined();
    expect(opened?.bill?.signed).toBe(false);
  });

  it('no lane or no key: nothing to open', async () => {
    expect(await openLanePapers('l1', { api: '', key, fetch })).toBeNull();
    expect(await openLanePapers('l1', { api, key: null, fetch })).toBeNull();
  });

  it('the bill of sale signed on the lane is a filed, buyer-signed row; reuse is recorded with its consent time', () => {
    const frozen = freeze({ vehicle: CAR, buyer: laneBuyer({ buyerName: 'Ana' }), step: {}, language: 'en' } as never, EXAMPLE_DEALER, new Date(Date.UTC(2026, 9, 13, 17)));
    const at = Date.UTC(2026, 9, 13, 17, 5);
    expect(laneBillAgreement({ pdf: new Uint8Array(), signed: true, at, reuse: true }, frozen)).toEqual({ state: 'filed', frozen, buyerSigned: true, signedAt: new Date(at).toISOString(), signatureReused: true, reuseConsentAt: new Date(at).toISOString() });
    expect(laneBillAgreement({ pdf: new Uint8Array(), signed: false }, frozen)).toBeNull();
  });
});

describe('Go uploads the paper in the order the Worker needs, and refuses Go when a PUT fails', () => {
  const api = 'https://w.test', key = 'd:P000000.sig';
  /** A faked Worker: every PUT answers 200 with its path, except the ones named in `refuse`. */
  function worker(refuse: string[] = []) {
    const calls: { method: string; path: string; type: string | undefined; auth: string | undefined; body: unknown }[] = [];
    const fetch = (async (u: string, init?: RequestInit) => {
      const path = u.replace(api, ''), h = init?.headers as Record<string, string>;
      let body: unknown = init?.body;
      if (body instanceof Blob) body = { blob: body.size, type: body.type };
      else if (typeof body === 'string') body = JSON.parse(body);
      calls.push({ method: init?.method ?? 'GET', path, type: h?.['Content-Type'], auth: h?.Authorization, body });
      if (refuse.includes(path)) return new Response('{"error":"bad_fields"}', { status: 400 });
      return new Response(JSON.stringify({ url: path.startsWith('/sales/') ? path.replace(/^\/sales\/(.+)\/fields\/(.+)$/, '/documents/$1/$2.fields.json') : path.replace(/^\/lots\/(.+)\/documents\//, '/documents/$1/') }), { status: 200 });
    }) as typeof globalThis.fetch;
    return { calls, io: { api, key, fetch } };
  }

  it('the guide PDF, the bill PDF, then the guide fields, then the bill fields; the paths come back for the open', async () => {
    const d = await docs;
    const { calls, io } = worker();
    const steps: string[] = [];
    const r = await uploadLaneDocuments('l1', d, io, s => steps.push(s));
    expect(r).toEqual({ ok: true, documents: { guide: '/documents/l1/guide.pdf', bill: '/documents/l1/bill.pdf' } });
    expect(calls.map(c => `${c.method} ${c.path}`)).toEqual(['PUT /lots/l1/documents/guide.pdf', 'PUT /lots/l1/documents/bill.pdf', 'PUT /sales/l1/fields/guide', 'PUT /sales/l1/fields/bill']);
    expect(calls.every(c => c.auth === `Bearer ${key}`)).toBe(true);
    expect(calls.slice(0, 2).map(c => c.type)).toEqual(['application/pdf', 'application/pdf']);
    expect(calls[0].body).toEqual({ blob: d.guide.pdf.byteLength, type: 'application/pdf' });
    expect(calls[1].body).toEqual({ blob: d.bill.pdf.byteLength, type: 'application/pdf' });
    expect(calls.slice(2).map(c => c.type)).toEqual(['application/json', 'application/json']);
    expect(calls[2].body).toEqual(GUIDE_FIELDS);
    expect(calls[3].body).toEqual(BILL_FIELDS);
    expect(steps).toEqual([UPLOAD_STEPS.guide, UPLOAD_STEPS.bill, UPLOAD_STEPS.fields]);
  });

  it('a PUT that fails stops the rest and names itself; the lot is not given its paths', async () => {
    const d = await docs;
    const bill = worker(['/lots/l1/documents/bill.pdf']);
    expect(await uploadLaneDocuments('l1', d, bill.io)).toEqual({ ok: false, reason: 'bill pdf failed' });
    expect(bill.calls.map(c => c.path)).toEqual(['/lots/l1/documents/guide.pdf', '/lots/l1/documents/bill.pdf']);
    const fields = worker(['/sales/l1/fields/guide']);
    expect(await uploadLaneDocuments('l1', d, fields.io)).toEqual({ ok: false, reason: 'guide fields failed' });
    expect(fields.calls.map(c => c.path)).toEqual(['/lots/l1/documents/guide.pdf', '/lots/l1/documents/bill.pdf', '/sales/l1/fields/guide']);
    const last = worker(['/sales/l1/fields/bill']);
    expect(await uploadLaneDocuments('l1', d, last.io)).toEqual({ ok: false, reason: 'bill fields failed' });
    expect(last.calls).toHaveLength(4);
  });

  it('a lane out of reach, or no key, refuses before any PUT', async () => {
    const d = await docs;
    const dead = worker();
    expect(await uploadLaneDocuments('l1', d, { ...dead.io, fetch: (async () => { throw new Error('ECONNREFUSED'); }) as typeof globalThis.fetch })).toEqual({ ok: false, reason: 'guide pdf failed' });
    expect(await uploadLaneDocuments('l1', d, { ...dead.io, api: '' })).toEqual({ ok: false, reason: 'offline' });
    expect(await uploadLaneDocuments('l1', d, { ...dead.io, key: null })).toEqual({ ok: false, reason: 'no key' });
    expect(dead.calls).toHaveLength(0);
  });
});

describe('the title step after the start (D8, D9): the Desk\'s words and the phone\'s are one set', () => {
  it('Texas, or no state yet, is the Buyer Acknowledgment; any other state the paper packet; four words or fewer a line; no timing, no fee', () => {
    expect(laneTitleStep('TX').kind).toBe('acknowledgment'); expect(laneTitleStep('tx ').kind).toBe('acknowledgment');
    expect(laneTitleStep(null).kind).toBe('acknowledgment'); expect(laneTitleStep('').kind).toBe('acknowledgment');
    expect(laneTitleStep('LA').kind).toBe('packet'); expect(laneTitleStep('ok').kind).toBe('packet');
    for (const step of Object.values(TITLE_STEP)) {
      for (const l of [step.title, ...step.lines]) expect(l.split(' ').length, l).toBeLessThanOrEqual(4);
      const all = [step.title, ...step.lines, step.law].join(' ');
      expect(all).not.toMatch(/\bfee\b/i); expect(all).not.toMatch(/business day|within \d+ days|by day/i);
    }
    expect(laneTitleStep('LA').lines).toContain('Form 14-312, signed');
    expect(laneTitleStep('LA').lines).toContain('Green 60-day plate');
    expect(laneTitleStep('TX').lines).toContain('Buyer Acknowledgment in webDEALER');
    expect(laneTitleLine(laneTitleStep('LA'))).toBe('Paper packet at pickup · Form 14-312, signed · Assigned title handed over · Or filed, 30 days · Green 60-day plate');
  });

  it('SignDocs.tsx carries the same words, verbatim', () => {
    const src = readFileSync(new URL('../../../auction/src/screens/won/SignDocs.tsx', import.meta.url), 'utf8');
    for (const step of Object.values(TITLE_STEP)) {
      expect(src).toContain(`title: '${step.title}'`);
      expect(src).toContain(`lines: [${step.lines.map(l => `'${l}'`).join(', ')}]`);
    }
    expect(src).not.toContain('TITLE_AWAY');
  });
});

describe('the Filed mark names the 130-U by its hash', () => {
  it('a filed 130-U gives its sha256, the business date and the agent; a draft gives nothing', async () => {
    const s = { vehicle: CAR, buyer: laneBuyer({ buyerName: 'Ana' }), step: {}, language: 'en', documents: {} } as never as import('./sale').Sale;
    const frozen = freeze(s, EXAMPLE_DEALER, new Date(Date.UTC(2026, 9, 13, 17)), 'Jordan Rivera');
    const bytes = new TextEncoder().encode('%PDF-1.7 the filed bytes');
    const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
    expect(frozen.date).toBe('10/13/2026');   // the paper keeps the Texas form's own format
    const mark = await filedMark({ ...s, documents: { form130U: { state: 'filed', frozen } } }, bytes);
    expect(mark).toEqual({ state: 'filed', form130U: { sha256: sha, filedOn: '2026-10-13', agent: 'Jordan Rivera' } });
    expect(await filedMark({ ...s, documents: { form130U: { state: 'draft' } } }, bytes)).toBeNull();
    expect(await filedMark(s, bytes)).toBeNull();
  });

  it('filedOn is the calendar day the Worker takes (YYYY-MM-DD; worker README, the plates route), never the paper\'s MM/DD/YYYY', async () => {
    const s = { vehicle: CAR, buyer: laneBuyer({ buyerName: 'Ana' }), step: {}, language: 'en', documents: {} } as never as import('./sale').Sale;
    const frozen = freeze(s, EXAMPLE_DEALER, new Date(Date.UTC(2026, 9, 13, 17)));
    const mark = await filedMark({ ...s, documents: { form130U: { state: 'filed', frozen } } }, new Uint8Array([37, 80, 68, 70]));
    expect(mark!.form130U.filedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mark!.form130U.filedOn).toBe('2026-10-13');
    expect(mark!.form130U.agent).toBeUndefined();   // no agent: the field is dropped, not sent empty
    expect(calendarDay('10/13/2026')).toBe('2026-10-13');
    expect(calendarDay('01/02/2027')).toBe('2027-01-02');
    expect(calendarDay('2026-10-13')).toBe('2026-10-13');   // already a day: unchanged
  });
});

describe('the evidence pack on the Desk\'s real signed bytes (the Worker\'s assemblePack)', () => {
  it('copies every page of both signed documents after the cover, readable by pdf.js with the name and the hammer on them; the files ride along unchanged', async () => {
    const { guide, bill } = await docs;
    const stamp = (d: typeof guide) => stampPdf(d.pdf, d.fields, { ink: parseSignature(SVG)!, name: 'Marisol Treviño', date: '10/13/2026', price: '$5,100', soldOn: '10/12/2026' });
    const g = await stamp(guide), b = await stamp(bill);
    const sha = async (x: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', x.slice())), n => n.toString(16).padStart(2, '0')).join('');
    const T0 = Date.UTC(2026, 9, 12, 17);
    const facts: PackFacts = {   // the cover as the Worker gathers it (sign.ts evidencePack), here from fixed facts
      lotId: 'l1', now: T0 + 5 * 86_400_000, car: '2014 Nissan Altima', vin: CAR.vin, dealer: { name: EXAMPLE_DEALER.legalName, gdn: EXAMPLE_DEALER.licence, city: EXAMPLE_DEALER.city },
      buyer: { id: 'b_example', name: 'Marisol Treviño', state: 'TX', depositStatus: 'applied', depositRef: 'pay_example', termsVersion: '2026-10-13', termsAt: T0 - 3_600_000 },
      capture: { id: 'capture:pay_example', at: T0 - 3_700_000 },
      sale: { hammer: 5100, wonAt: T0, deadlineAt: T0 + 48 * 3_600_000, paidAt: T0 + 20 * 3_600_000, startedAt: T0 + 26 * 3_600_000, voidedAt: null, forfeitedAt: null, plates: { state: 'filed', at: T0 + 3 * 86_400_000 } },
      signed: [{ doc: 'guide', at: T0 + 3_600_000, consent: CONSENT_VERSION, reuse: false, signedSha256: await sha(g), originalSha256: await sha(guide.pdf), ok: true },
        { doc: 'bill', at: T0 + 3_700_000, consent: CONSENT_VERSION, reuse: true, signedSha256: await sha(b), originalSha256: await sha(bill.pdf), ok: true }],
      refusals: [{ reason: 'wrong car', presented: 'C00009', at: T0 + 25 * 3_600_000 }],
    };
    const pack = await assemblePack(packCover(facts), [{ name: 'guide.signed.pdf', bytes: g, sha256: await sha(g) }, { name: 'bill.signed.pdf', bytes: b, sha256: await sha(b) }]);
    if (process.env.FORMS_OUT) { mkdirSync(process.env.FORMS_OUT, { recursive: true }); writeFileSync(`${process.env.FORMS_OUT}/evidence-pack.pdf`, pack); }
    const again = await PDFDocument.load(pack);
    const gp = (await PDFDocument.load(g)).getPageCount(), bp = (await PDFDocument.load(b)).getPageCount();
    expect(again.getPageCount()).toBe(1 + gp + bp);
    const cover = (await pageText(pack, 0)).items.map(i => i.str).join(' ');
    expect(cover).toContain('Evidence pack'); expect(cover).toContain('Hammer $5,100'); expect(cover).toContain(await sha(g)); expect(cover).toContain(`last six ${CAR.vin.slice(-6)}`);
    expect(cover).toContain('the first signature reused with consent'); expect(cover).toContain('wrong car (C00009)');
    const guidePage = (await pageText(pack, 1)).items.map(i => i.str).join(' ');
    expect(guidePage).toContain('Marisol Treviño'); expect(guidePage).toContain('I hereby acknowledge receipt of the Buyers Guide at the closing of this sale.');
    const billPage = (await pageText(pack, 1 + gp)).items.map(i => i.str).join(' ');
    expect(billPage).toContain('Bill of Sale'); expect(billPage).toContain('$5,100'); expect(billPage).toContain('Marisol Treviño');
    const packBuf = Buffer.from(pack);
    expect(packBuf.indexOf(Buffer.from(g))).toBeGreaterThan(0); expect(packBuf.indexOf(Buffer.from(b))).toBeGreaterThan(0);
    expect(again.catalog.has(PDFName.of('Names'))).toBe(true);
  });
});
