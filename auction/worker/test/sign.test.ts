import { env, SELF, applyD1Migrations, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';
import type { Env as WorkerEnv } from '../src/env';
import { CONSENT_VERSION, inspectPdf, parseSignature, sales, stampPdf, type SignFields } from '../src/sign';

declare global { namespace Cloudflare { interface Env extends WorkerEnv { TEST_MIGRATIONS: D1Migration[] } } }

const base = 'https://auction.test';
const DEALER = { authorization: 'Bearer test-dealer-secret', 'content-type': 'application/json' };
const CAR = { year: 2014, make: 'Nissan', model: 'Altima', miles: 128400, vin: '1N4AL3AP0EC000001', photos: [], grade: [1, 1, 1, 1, 0.5, 1], title: 'in hand', dealer: { name: 'Triple J Auto', city: 'Houston', street: '100 Example St', gdn: 'P000000', phone: '', afterHours: '', fees: { taxRate: 0.0625, title: 33, registration: 75, doc: 150 } }, collateral: { title: { status: 'hand' }, floor: 4900, insured: true } };
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 357 150"><path d="M20.0 90.0 L40.5 60.2 L61.0 95.0 L80.0 58.0 L120.0 88.0"/></svg>';
const OTHER_SVG = '<svg viewBox="0 0 357 150"><path d="M10 10 L200 120"/></svg>';
const enc = new TextEncoder();
const text = (b: Uint8Array) => { let s = ''; for (const x of b) s += String.fromCharCode(x); return s; };

/* ---------- fixtures: two PDFs written by hand, one with a classic xref table, one with compressed object and xref streams (as pdf-lib saves) */
function classicPdf(): Uint8Array {
  const content = 'BT /F1 12 Tf 72 720 Td (Bill of Sale) Tj ET\n';
  const objs = [
    '<</Type /Catalog /Pages 2 0 R>>',
    '<</Type /Pages /Kids [3 0 R] /Count 1 /Resources <</Font <</F1 4 0 R>>>>>>',
    '<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R>>',
    '<</Type /Font /Subtype /Type1 /BaseFont /Times-Roman>>',
    `<</Length ${content.length}>>\nstream\n${content}endstream`,
  ];
  let s = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = s.length;
  s += `xref\n0 ${objs.length + 1}\n0000000000 65535 f\r\n${offs.map(o => `${String(o).padStart(10, '0')} 00000 n\r\n`).join('')}trailer\n<</Size ${objs.length + 1} /Root 1 0 R /ID [<00112233445566778899aabbccddeeff> <00112233445566778899aabbccddeeff>]>>\nstartxref\n${x}\n%%EOF\n`;
  return Uint8Array.from(s, c => c.charCodeAt(0));
}

async function deflate(b: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
}
async function objectStreamPdf(): Promise<Uint8Array> {
  const content = 'BT /F1 12 Tf 72 720 Td (Buyers Guide) Tj ET\nBT /F1 12 Tf 72 700 Td (Page two follows) Tj ET\n';
  const compressedContent = await deflate(enc.encode(content));
  // objects 1-4 live compressed in object stream 6; object 5 is the page content, object 7 the xref stream
  const inner = ['<</Type /Catalog /Pages 2 0 R>>', '<</Type /Pages /Kids [3 0 R 4 0 R] /Count 2>>',
    '<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources <</Font <</F1 8 0 R>>>>>>',
    '<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>>>>'];
  const nums = [1, 2, 3, 4]; let body = '', head = '';
  inner.forEach((o, i) => { head += `${nums[i]} ${body.length} `; body += o + '\n'; });
  const objstm = await deflate(enc.encode(head + body));
  const parts: (string | Uint8Array)[] = []; let len = 0; const offs: Record<number, number> = {};
  const add = (p: string | Uint8Array) => { parts.push(p); len += typeof p === 'string' ? p.length : p.length; };
  add('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n');
  offs[5] = len; add(`5 0 obj\n<</Length ${compressedContent.length} /Filter /FlateDecode>>\nstream\n`); add(compressedContent); add('\nendstream\nendobj\n');
  offs[6] = len; add(`6 0 obj\n<</Type /ObjStm /N 4 /First ${head.length} /Length ${objstm.length} /Filter /FlateDecode>>\nstream\n`); add(objstm); add('\nendstream\nendobj\n');
  offs[8] = len; add('8 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Courier>>\nendobj\n');
  offs[7] = len;
  // rows for 0..8 with W [1 2 1]: type, field 2, field 3; PNG Up predictor (12) over 4 columns, as many writers do
  const rows: number[][] = [[0, 0, 0, 255], ...[1, 2, 3, 4].map(i => [2, 0, 6, i - 1]), [1, offs[5] >> 8, offs[5] & 255, 0], [1, offs[6] >> 8, offs[6] & 255, 0], [1, offs[7] >> 8, offs[7] & 255, 0], [1, offs[8] >> 8, offs[8] & 255, 0]];
  // the classic layout above puts 1-4 as type 2 in object 6 at indexes 0-3
  rows[1] = [2, 0, 6, 0]; rows[2] = [2, 0, 6, 1]; rows[3] = [2, 0, 6, 2]; rows[4] = [2, 0, 6, 3];
  const raw: number[] = []; let prev = [0, 0, 0, 0];
  for (const r of rows) { raw.push(2, ...r.map((v, i) => (v - prev[i]) & 255)); prev = r; }
  const xs = await deflate(Uint8Array.from(raw));
  add(`7 0 obj\n<</Type /XRef /Size 9 /W [1 2 1] /Root 1 0 R /Filter /FlateDecode /DecodeParms <</Predictor 12 /Columns 4>> /Length ${xs.length}>>\nstream\n`); add(xs); add('\nendstream\nendobj\n');
  add(`startxref\n${offs[7]}\n%%EOF\n`);
  const out = new Uint8Array(len); let at = 0;
  for (const p of parts) { const b = typeof p === 'string' ? Uint8Array.from(p, c => c.charCodeAt(0)) : p; out.set(b, at); at += b.length; }
  return out;
}

const FIELDS = (doc: 'guide' | 'bill', page = 0): SignFields => ({ v: 1, doc, consent: CONSENT_VERSION, page,
  signature: { x: 81, y: 60, w: 220, h: 30 }, name: { x: 81, y: 100, w: 220, h: 14 }, date: { x: 320, y: 60, w: 120, h: 14 },
  ...(doc === 'bill' ? { price: { x: 320, y: 100, w: 120, h: 14 }, soldOn: { x: 450, y: 100, w: 100, h: 14 } } : {}), audit: { x: 81, y: 48, w: 300, h: 8 } });

describe('the stamp', () => {
  it('reads a drawn path and refuses anything else', () => {
    expect(parseSignature(SVG)?.paths.length).toBe(5);
    expect(parseSignature('M0 0 L10 10 Q 20 20 30 0 Z')?.paths.at(-1)).toEqual({ op: 'l', p: [0, 0] });
    expect(parseSignature('<svg><path d="M1 1"/></svg>')).toBeNull();                        // a dot
    expect(parseSignature('<svg><path d="M1 1 L2 2 A 1 1 0 0 1 3 3"/></svg>')).toBeNull();    // an arc is not drawn by the pad
    expect(parseSignature('<svg><script>alert(1)</script></svg>')).toBeNull();
  });

  it('keeps every original byte and appends the stamp (classic xref)', async () => {
    const original = classicPdf();
    const signed = await stampPdf(original, FIELDS('bill'), { ink: parseSignature(SVG)!, name: 'Marisol Trevino', date: '10/13/2026', price: '$5,100', soldOn: '10/12/2026', audit: 'Signed electronically on Obavia, 10/13/2026. Consent 2026-10-13.' });
    expect(signed.length).toBeGreaterThan(original.length);
    expect(signed.subarray(0, original.length)).toEqual(original);            // the original, byte for byte
    const tail = text(signed.subarray(original.length));
    expect(tail).toContain('(Marisol Trevino) Tj');
    expect(tail).toContain('($5,100) Tj');
    expect(tail).toMatch(/\d+(\.\d+)? \d+(\.\d+)? m\n[\s\S]* l\n[\s\S]*S Q/);   // the drawing, as strokes
    expect(tail).toContain(`/Prev ${text(original).match(/startxref\n(\d+)/)![1]}`);
    expect(tail).toContain('/ID [<00112233445566778899aabbccddeeff> <00112233445566778899aabbccddeeff>]');
    expect(tail.trimEnd().endsWith('%%EOF')).toBe(true);
    const page = await inspectPdf(signed, 0);
    expect(page.contents).toBe(3);                                            // q, the page's own content, the stamp
    expect(page.fonts).toEqual(['F1', 'ObvHelv']);                            // the inherited font kept, Helvetica added
    expect(tail).not.toContain(SVG);                                          // the SVG text itself is never written
  });

  it('reads compressed object and xref streams and writes an xref stream; stamps twice', async () => {
    const original = await objectStreamPdf();
    expect((await inspectPdf(original, 1)).pages).toBe(2);
    const once = await stampPdf(original, FIELDS('guide', 1), { ink: parseSignature(SVG)!, name: 'Ana', date: '10/13/2026' });
    expect(once.subarray(0, original.length)).toEqual(original);
    expect(text(once.subarray(original.length))).toContain('/Type /XRef /Size 13 /W [1 4 2]');
    const p1 = await inspectPdf(once, 1);
    expect(p1.contents).toBe(2); expect(p1.fonts).toEqual(['ObvHelv']);
    expect((await inspectPdf(once, 0)).contents).toBe(1);                    // the other page is untouched
    const twice = await stampPdf(once, FIELDS('guide', 0), { ink: parseSignature(OTHER_SVG)!, name: 'Ana' });
    expect(twice.subarray(0, once.length)).toEqual(once);
    expect((await inspectPdf(twice, 0)).contents).toBe(3);
    expect((await inspectPdf(twice, 0)).fonts).toEqual(['F1', 'ObvHelv']);
  });

  it('refuses a page the file does not have', async () => {
    await expect(stampPdf(classicPdf(), FIELDS('guide', 4), { ink: parseSignature(SVG)! })).rejects.toThrow();
  });
});

/* ---------- the route */
const PHONE = '+12145550142';
async function signIn(id: string, name = 'Marisol Trevino') {
  const r = await SELF.fetch(`${base}/me`, { method: 'POST', body: JSON.stringify({ id, name, state: 'TX' }) });
  const { token } = await r.json<{ token: string }>();
  const h = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  expect((await SELF.fetch(`${base}/me/phone`, { method: 'POST', headers: h, body: JSON.stringify({ phone: PHONE }) })).status).toBe(200);
  expect((await SELF.fetch(`${base}/me/phone/verify`, { method: 'POST', headers: h, body: JSON.stringify({ code: '000000' }) })).status).toBe(200);
  expect((await SELF.fetch(`${base}/me/deposit`, { method: 'POST', headers: h, body: '{}' })).status).toBe(200);
  return token;
}
/** A lot with both documents and their fields uploaded at Go, won by `token`. */
async function sold(lot: string, token: string, fields = true) {
  expect((await SELF.fetch(`${base}/lots/${lot}/open`, { method: 'POST', headers: DEALER, body: JSON.stringify({ id: lot, dealer: 'P000000', start: 4900, retail: 7995, closesAt: Date.now() + 5_000, car: CAR }) })).status).toBe(200);
  for (const [doc, pdf] of [['guide', classicPdf()], ['bill', await objectStreamPdf()]] as const) {
    expect((await SELF.fetch(`${base}/lots/${lot}/documents/${doc}.pdf`, { method: 'PUT', headers: { ...DEALER, 'content-type': 'application/pdf' }, body: pdf })).status).toBe(200);
    if (fields) expect((await call(`/sales/${lot}/fields/${doc}`, { method: 'PUT', headers: DEALER, body: JSON.stringify(FIELDS(doc)) })).status).toBe(200);
  }
  const b = await SELF.fetch(`${base}/lots/${lot}/bids`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 5100, max: 5100, key: crypto.randomUUID(), terms: '2026-10-13' }) });
  expect(b.status).toBe(200);
  const run = runInDurableObject as unknown as (s: DurableObjectStub, f: (inst: any, state: DurableObjectState) => Promise<void>) => Promise<void>;
  await run(env.AUCTION.get(env.AUCTION.idFromName(lot)) as unknown as DurableObjectStub, async (inst, state) => {   // the hammer, now
    const l = await state.storage.get<any>('lot'); l.closesAt = Date.now() - 1;
    await state.storage.put('lot', l); inst.lot = l; await state.storage.setAlarm(Date.now());
  });
  await runDurableObjectAlarm(env.AUCTION.get(env.AUCTION.idFromName(lot))); await new Promise(r => setTimeout(r, 60));
}
/** The routes as index.ts mounts them (one line: /sales/ to sales()). */
const call = (path: string, init: RequestInit = {}, ip = '203.0.113.7') => sales(new Request(`${base}${path}`, { ...init, headers: { 'cf-connecting-ip': ip, ...(init.headers as Record<string, string> ?? {}) } }), env);
const signBody = (doc: string, svg = SVG, extra: Record<string, unknown> = {}) => JSON.stringify({ doc, svg, consent: true, consentVersion: CONSENT_VERSION, ...extra });
const post = (lot: string, token: string, body: string) => call(`/sales/${lot}/sign`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body });

let buyer = '', stranger = '';
beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  buyer = await signIn('buyer-sign');
  stranger = await signIn('buyer-stranger', 'Someone Else');
  await sold('s1', buyer);
});
afterEach(() => { vi.restoreAllMocks(); });

describe('POST /sales/:id/sign', () => {
  it('stamps the Desk\'s bytes, stores them beside the original and logs the consent row; nothing is logged to the console', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(k => vi.spyOn(console, k));
    const r = await post('s1', buyer, signBody('guide'));
    expect(r.status).toBe(200);
    const out = await r.json<{ path: string; view: string; sha256: string; originalSha256: string; reuse: boolean }>();
    expect(out.path).toBe('/sales/s1/signed/guide.pdf');
    expect(out.view).toBe(`${base}/sales/s1/view/guide?token=${encodeURIComponent(buyer)}`);
    expect(out.reuse).toBe(false);
    for (const s of spies) expect(s).not.toHaveBeenCalled();

    const original = new Uint8Array(await (await env.FILES.get('documents/s1/guide.pdf'))!.arrayBuffer());
    const signed = new Uint8Array(await (await env.FILES.get('signed/s1/guide.pdf'))!.arrayBuffer());
    expect(signed.subarray(0, original.length)).toEqual(original);
    expect(text(signed.subarray(original.length))).toContain('(Marisol Trevino) Tj');
    expect((await env.FILES.get('documents/s1/guide.pdf'))!.size).toBe(original.length);   // the original is still there, unchanged

    const row = await env.DB.prepare('SELECT * FROM signatures WHERE lot_id = ?1 AND doc = ?2').bind('s1', 'guide').first<Record<string, unknown>>();
    expect(row).toMatchObject({ buyer: 'buyer-sign', consent_version: CONSENT_VERSION, reuse: 0, signed_key: 'signed/s1/guide.pdf', signed_sha256: out.sha256, original_sha256: out.originalSha256 });
    expect(row!.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row!.ip_hash).not.toContain('203.0.113.7');
    expect(Number(row!.at)).toBeGreaterThan(Date.now() - 60_000);
    expect(JSON.stringify(row)).not.toContain('M20.0 90.0');                 // the drawing is not in the row
  });

  it('a second signature on the same document is 409, with where the signed one is', async () => {
    const r = await post('s1', buyer, signBody('guide', OTHER_SVG));
    expect(r.status).toBe(409);
    expect(await r.json()).toMatchObject({ error: 'already_signed', path: '/sales/s1/signed/guide.pdf' });
  });

  it('reuse: the same drawing on the bill of sale is recorded as reused; a different one is not reuse', async () => {
    expect((await post('s1', buyer, signBody('bill', OTHER_SVG, { reuse: true }))).status).toBe(409);   // nothing_to_reuse
    const r = await post('s1', buyer, signBody('bill', SVG, { reuse: true }));
    expect(r.status).toBe(200);
    expect((await r.json<{ reuse: boolean }>()).reuse).toBe(true);
    const row = await env.DB.prepare('SELECT reuse, svg_sha256 FROM signatures WHERE lot_id = ?1 AND doc = ?2').bind('s1', 'bill').first<{ reuse: number; svg_sha256: string }>();
    const guide = await env.DB.prepare('SELECT svg_sha256 FROM signatures WHERE lot_id = ?1 AND doc = ?2').bind('s1', 'guide').first<{ svg_sha256: string }>();
    expect(row!.reuse).toBe(1); expect(row!.svg_sha256).toBe(guide!.svg_sha256);
    const signed = new Uint8Array(await (await env.FILES.get('signed/s1/bill.pdf'))!.arrayBuffer());
    const tail = text(signed.subarray((await env.FILES.get('documents/s1/bill.pdf'))!.size));
    expect(tail).toContain('($5,100) Tj');                                   // the hammer, from the sale
    expect(tail).toContain('/Type /XRef');
  });

  it('a buyer who did not win is 403; no token is 401; no consent is 400', async () => {
    await sold('s2', buyer);
    expect((await post('s2', stranger, signBody('guide'))).status).toBe(403);
    expect((await call('/sales/s2/sign', { method: 'POST', body: signBody('guide') })).status).toBe(401);
    expect((await post('s2', buyer, JSON.stringify({ doc: 'guide', svg: SVG, consent: false }))).status).toBe(400);
    expect((await post('s2', buyer, signBody('guide', '<svg><path d="M1 1"/></svg>'))).status).toBe(400);
    expect((await post('s2', buyer, signBody('guide', SVG, { consentVersion: '2025-01-01' }))).status).toBe(409);
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM signatures WHERE lot_id = ?1').bind('s2').first('n')).toBe(0);
  });

  it('no fields uploaded: 409 no_fields, and no row is left behind', async () => {
    await sold('s3', buyer, false);
    const r = await post('s3', buyer, signBody('guide'));
    expect(r.status).toBe(409); expect(await r.json()).toMatchObject({ error: 'no_fields' });
    expect(await env.DB.prepare('SELECT COUNT(*) AS n FROM signatures WHERE lot_id = ?1').bind('s3').first('n')).toBe(0);
  });

  it('no sale yet: 409', async () => {
    await SELF.fetch(`${base}/lots/s4/open`, { method: 'POST', headers: DEALER, body: JSON.stringify({ id: 's4', dealer: 'P000000', start: 4900, retail: 7995, closesAt: Date.now() + 600_000, car: CAR }) });
    expect((await post('s4', buyer, signBody('guide'))).status).toBe(409);
  });
});

describe('fields, papers, the signed PDF and its viewer', () => {
  it('only a dealer puts fields; bad fields are 400; signed fields never move', async () => {
    expect((await call('/sales/s1/fields/guide', { method: 'PUT', headers: { authorization: `Bearer ${buyer}` }, body: JSON.stringify(FIELDS('guide')) })).status).toBe(403);
    expect((await call('/sales/s9/fields/guide', { method: 'PUT', headers: DEALER, body: JSON.stringify({ ...FIELDS('guide'), signature: { x: 1, y: 1, w: 0, h: 1 } }) })).status).toBe(400);
    expect((await call('/sales/s9/fields/guide', { method: 'PUT', headers: DEALER, body: JSON.stringify(FIELDS('bill')) })).status).toBe(400);   // the bill's rects under the guide's name
    expect((await call('/sales/s1/fields/guide', { method: 'PUT', headers: DEALER, body: JSON.stringify(FIELDS('guide')) })).status).toBe(409);
  });

  it('papers: the dealer sees the buyer\'s name and both signed copies; a stranger sees nothing', async () => {
    const r = await call('/sales/s1/papers', { headers: DEALER });
    expect(r.status).toBe(200);
    const p = await r.json<any>();
    expect(p.buyer).toEqual({ name: 'Marisol Trevino' });
    expect(p.guide.original).toBe('/documents/s1/guide.pdf');
    expect(p.guide.signed).toMatchObject({ path: '/sales/s1/signed/guide.pdf', view: '/sales/s1/view/guide', reuse: false, consent: CONSENT_VERSION });
    expect(p.bill.signed.reuse).toBe(true);
    const mine = await (await call('/sales/s1/papers', { headers: { authorization: `Bearer ${buyer}` } })).json<any>();
    expect(mine.buyer).toBeUndefined(); expect(mine.guide.signed.path).toBe('/sales/s1/signed/guide.pdf');
    expect((await call('/sales/s1/papers', { headers: { authorization: `Bearer ${stranger}` } })).status).toBe(403);
  });

  it('the signed bytes go to the buyer and the dealer only, never through the public documents route', async () => {
    expect((await call(`/sales/s1/signed/guide.pdf?token=${encodeURIComponent(buyer)}`)).status).toBe(200);
    expect((await call('/sales/s1/signed/guide.pdf', { headers: DEALER })).status).toBe(200);
    expect((await call(`/sales/s1/signed/guide.pdf?token=${encodeURIComponent(stranger)}`)).status).toBe(403);
    expect((await call('/sales/s2/signed/guide.pdf', { headers: DEALER })).status).toBe(404);
    expect((await SELF.fetch(`${base}/documents/s1/guide.signed.pdf`, { headers: { authorization: `Bearer ${stranger}` } })).status).toBe(404);
    const v = await call(`/sales/s1/view/guide?token=${encodeURIComponent(buyer)}`);
    const html = await v.text();
    expect(html).toContain(`${base}/sales/s1/signed/guide.pdf?token=${encodeURIComponent(buyer)}`);
    expect(html).toContain("post('end')");
  });
});
