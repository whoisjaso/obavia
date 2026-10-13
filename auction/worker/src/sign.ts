/* Signing on the lane (gap table W2-A; phases, Phase 1 Paperwork: "the three documents the buyer signs are the
   same bytes the Desk prints"). The Desk uploads each document at Go (documents/<lot>/<doc>.pdf) with its field
   rects beside it (documents/<lot>/<doc>.fields.json, desk/src/lib/sign.ts). The buyer of the sale draws once on
   the phone; this module stamps the drawing, the buyer's name, the date and (on the bill of sale) the hammer into
   those exact bytes as a PDF incremental update (ISO 32000-1 §7.5.6): the original file is the first bytes of the
   signed file, unchanged, and the stamp is appended after it. pdf-lib is not used: it is not in this Worker's
   node_modules, and its save() rewrites every byte, so it could not keep the original intact.

   The signed PDF is written to R2 under signed/<lot>/<doc>.pdf, which the public documents route cannot reach;
   only the sale's buyer and the lot's dealer read it, here. One row per signature in `signatures` (migration
   0012): the sale, the document, when, who, a salted hash of the address it came from, the consent version, and
   whether it reused the first signature. The drawn signature itself is never logged and never stored outside the
   signed PDF; the row keeps its SHA-256 only.

   Routes (mounted from index.ts on /sales/):
     PUT  /sales/:lot/fields/:doc       dealer     the field rects for that document (JSON, desk/src/lib/sign.ts)
     POST /sales/:lot/sign              buyer      { doc, svg, consent: true, consentVersion?, reuse? } -> the signed PDF
     GET  /sales/:lot/papers            buyer|dealer  what is signed, when, and where each PDF is
     GET  /sales/:lot/signed/:doc.pdf   buyer|dealer  the signed bytes
     GET  /sales/:lot/view/:doc         anyone     the viewer page (view.ts) for the signed PDF; the PDF itself needs the token */
import { buyerFrom, dealerFrom } from './auth';
import type { Env } from './env';
import { viewerHtml } from './view';

/** The consent the buyer gives by signing, and its version. The Desk (desk/src/lib/sign.ts) and the phone
    (auction/src/screens/Paper.tsx) carry the same version; a fields file or a phone on another version is refused. */
export const CONSENT_VERSION = '2026-10-13';
export const CONSENT_TEXT = 'I agree to sign electronically.';   // Bus. & Com. Code §322.005(b): the parties agree to an electronic transaction
export const DOCS = ['guide', 'bill'] as const;
export type SignDoc = typeof DOCS[number];

/** A rect in PDF points, origin bottom-left, on the field file's page. */
export type Rect = { x: number; y: number; w: number; h: number };
/** desk/src/lib/sign.ts writes this; the Worker reads it. */
export type SignFields = { v: 1; doc: SignDoc; consent: string; page: number; signature: Rect; name?: Rect; date?: Rect; price?: Rect; soldOn?: Rect; audit?: Rect };
const TEXT_FIELDS = ['name', 'date', 'price', 'soldOn', 'audit'] as const;

const MAX_SVG = 64_000, MAX_PDF = 12_000_000;
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json' } });
const fail = (error: string, status: number, extra: Record<string, unknown> = {}) => json({ error, ...extra }, status);
const isDoc = (d: unknown): d is SignDoc => d === 'guide' || d === 'bill';

/* ---------------------------------------------------------------- the routes */

type SaleLot = { id: string; closed?: { at: number; sold: boolean }; sale?: { buyer: string; hammer: number; wonAt: number; voidedAt?: number; forfeitedAt?: number } };

async function readLot(env: Env, lot: string): Promise<SaleLot | null> {
  const r = await env.AUCTION.get(env.AUCTION.idFromName(lot)).fetch(new Request(`https://lot/lots/${lot}`));
  return r.ok ? r.json<SaleLot>() : null;
}

/** The lot's dealer from the copy; null while the lot is not open yet (the Desk uploads before it opens). */
async function lotDealer(env: Env, lot: string): Promise<string | null> {
  const row = await env.DB.prepare('SELECT dealer FROM lots WHERE id = ?1').bind(lot).first<{ dealer: string }>();
  return row?.dealer ?? null;
}

/** Who may read the sale's signed papers: its buyer, its dealer, the admin. */
async function reader(req: Request, env: Env, lot: string, sale?: SaleLot['sale']): Promise<'buyer' | 'dealer' | null> {
  const dealer = await dealerFrom(req, env.DEALER_SECRET);
  if (dealer) return dealer === '*' || dealer === (await lotDealer(env, lot)) ? 'dealer' : null;
  const buyer = await buyerFrom(req, env);
  return buyer && sale && buyer === sale.buyer ? 'buyer' : null;
}

const signedKey = (lot: string, doc: SignDoc) => `signed/${lot}/${doc}.pdf`;
const signedPath = (lot: string, doc: SignDoc) => `/sales/${lot}/signed/${doc}.pdf`;
const viewPath = (lot: string, doc: SignDoc) => `/sales/${lot}/view/${doc}`;
const tokenOf = (req: Request) => { const h = req.headers.get('authorization') ?? ''; return h.startsWith('Bearer ') ? h.slice(7) : new URL(req.url).searchParams.get('token') ?? ''; };
const viewUrl = (origin: string, lot: string, doc: SignDoc, token: string) => `${origin}${viewPath(lot, doc)}?token=${encodeURIComponent(token)}`;

export async function sales(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const m = url.pathname.match(/^\/sales\/([A-Za-z0-9_-]{1,64})\/(sign|papers|fields\/(guide|bill)|signed\/(guide|bill)\.pdf|view\/(guide|bill))$/);
  if (!m) return fail('not_found', 404);
  const lot = m[1], route = m[2];
  const doc = (m[3] ?? m[4] ?? m[5]) as SignDoc | undefined;

  if (route.startsWith('fields/') && req.method === 'PUT') return putFields(req, env, lot, doc!);
  if (route === 'sign' && req.method === 'POST') return sign(req, env, lot);
  if (route === 'papers' && req.method === 'GET') return papers(req, env, lot);
  if (route.startsWith('signed/') && req.method === 'GET') {
    const l = await readLot(env, lot);
    if (!(await reader(req, env, lot, l?.sale))) return fail('not_yours', 403);
    const obj = await env.FILES.get(signedKey(lot, doc!));
    if (!obj) return fail('not_signed', 404);
    return new Response(obj.body, { headers: { 'content-type': 'application/pdf', 'cache-control': 'private, no-store' } });
  }
  if (route.startsWith('view/') && req.method === 'GET') {
    const fields = await readFields(env, lot, doc!);
    const pdf = `${url.origin}${signedPath(lot, doc!)}?token=${encodeURIComponent(url.searchParams.get('token') ?? '')}`;
    return new Response(viewerHtml(pdf, { at: fields?.page }), { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
  return fail('not_found', 404);
}

async function readFields(env: Env, lot: string, doc: SignDoc): Promise<SignFields | null> {
  const o = await env.FILES.get(`documents/${lot}/${doc}.fields.json`);
  if (!o) return null;
  try { return parseFields(JSON.parse(await o.text()), doc); } catch { return null; }
}

const rectOk = (r: unknown): r is Rect => !!r && typeof r === 'object' && ['x', 'y', 'w', 'h'].every(k => { const v = (r as Record<string, unknown>)[k]; return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 5000; }) && (r as Rect).w > 0 && (r as Rect).h > 0;

/** The fields file, checked: the version, the document, a page, a signature rect; the optional text rects. */
export function parseFields(x: unknown, doc: SignDoc): SignFields | null {
  if (!x || typeof x !== 'object') return null;
  const f = x as Record<string, unknown>;
  if (f.v !== 1 || f.doc !== doc || typeof f.consent !== 'string' || !Number.isInteger(f.page) || (f.page as number) < 0 || (f.page as number) > 99 || !rectOk(f.signature)) return null;
  for (const k of TEXT_FIELDS) if (f[k] !== undefined && !rectOk(f[k])) return null;
  return { v: 1, doc, consent: f.consent, page: f.page as number, signature: f.signature as Rect, ...Object.fromEntries(TEXT_FIELDS.filter(k => f[k]).map(k => [k, f[k]])) };
}

async function putFields(req: Request, env: Env, lot: string, doc: SignDoc): Promise<Response> {
  const dealer = await dealerFrom(req, env.DEALER_SECRET);
  if (!dealer) return fail('dealer_only', 403);
  const owner = await lotDealer(env, lot);
  if (owner && dealer !== '*' && owner !== dealer) return fail('not_your_lot', 403);
  const raw = await req.text();
  if (raw.length > 8_000) return fail('too_big', 413);
  let f: SignFields | null = null;
  try { f = parseFields(JSON.parse(raw), doc); } catch { /* below */ }
  if (!f) return fail('bad_fields', 400);
  if (f.consent !== CONSENT_VERSION) return fail('consent_changed', 409, { version: CONSENT_VERSION });
  const done = await env.DB.prepare('SELECT 1 AS x FROM signatures WHERE lot_id = ?1 AND doc = ?2').bind(lot, doc).first();
  if (done) return fail('already_signed', 409);   // the rects a signature was stamped at never move
  await env.FILES.put(`documents/${lot}/${doc}.fields.json`, JSON.stringify(f), { httpMetadata: { contentType: 'application/json' } });
  return json({ url: `/documents/${lot}/${doc}.fields.json` });
}

type Row = { doc: SignDoc; at: number; reuse: number; consent_version: string; signed_sha256: string | null; original_sha256: string | null };

async function papers(req: Request, env: Env, lot: string): Promise<Response> {
  const l = await readLot(env, lot);
  const who = await reader(req, env, lot, l?.sale);
  if (!who) return fail('not_yours', 403);
  const rows = (await env.DB.prepare('SELECT doc, at, reuse, consent_version, signed_sha256, original_sha256 FROM signatures WHERE lot_id = ?1 AND signed_sha256 IS NOT NULL').bind(lot).all<Row>()).results;
  const out: Record<string, unknown> = { lotId: lot };
  if (who === 'dealer' && l?.sale) {   // the Desk opens the paperwork with the buyer's name already on it
    const b = await env.DB.prepare('SELECT name FROM buyers WHERE id = ?1').bind(l.sale.buyer).first<{ name: string | null }>();
    out.buyer = { name: b?.name ?? null };
  }
  for (const d of DOCS) {
    const r = rows.find(x => x.doc === d);
    const original = await env.FILES.head(`documents/${lot}/${d}.pdf`);
    out[d] = {
      original: original ? `/documents/${lot}/${d}.pdf` : null,
      signed: r ? { path: signedPath(lot, d), view: viewPath(lot, d), at: r.at, reuse: r.reuse === 1, consent: r.consent_version, sha256: r.signed_sha256, originalSha256: r.original_sha256 } : null,
    };
  }
  return json(out);
}

async function sign(req: Request, env: Env, lot: string): Promise<Response> {
  const buyer = await buyerFrom(req, env);
  if (!buyer) return fail('sign_in', 401);
  const raw = await req.text();
  if (raw.length > MAX_SVG + 512) return fail('too_big', 413);
  let b: { doc?: unknown; svg?: unknown; consent?: unknown; consentVersion?: unknown; reuse?: unknown };
  try { b = JSON.parse(raw); } catch { return fail('bad_body', 400); }
  if (!b || !isDoc(b.doc)) return fail('bad_doc', 400);
  const doc = b.doc;
  if (b.consent !== true) return fail('consent_required', 400);
  if (b.consentVersion !== undefined && b.consentVersion !== CONSENT_VERSION) return fail('consent_changed', 409, { version: CONSENT_VERSION });
  const ink = typeof b.svg === 'string' && b.svg.length <= MAX_SVG ? parseSignature(b.svg) : null;
  if (!ink) return fail('bad_signature', 400);

  const l = await readLot(env, lot);
  const sale = l?.sale;
  if (!sale || sale.voidedAt || sale.forfeitedAt) return fail('no_sale', 409);
  if (sale.buyer !== buyer) return fail('not_yours', 403);

  const prior = await env.DB.prepare('SELECT doc FROM signatures WHERE lot_id = ?1 AND doc = ?2').bind(lot, doc).first();
  if (prior) return fail('already_signed', 409, { path: signedPath(lot, doc), view: viewUrl(new URL(req.url).origin, lot, doc, tokenOf(req)) });

  const [original, fields] = await Promise.all([env.FILES.get(`documents/${lot}/${doc}.pdf`), readFields(env, lot, doc)]);
  if (!original) return fail('no_document', 409);
  if (!fields) return fail('no_fields', 409);
  if (fields.consent !== CONSENT_VERSION) return fail('consent_changed', 409, { version: CONSENT_VERSION });
  const bytes = new Uint8Array(await original.arrayBuffer());
  if (bytes.byteLength > MAX_PDF) return fail('too_big', 413);

  const svgHash = await sha256Hex(new TextEncoder().encode(b.svg as string));
  const reuse = b.reuse === true;
  if (reuse) {   // one signature reused: the other document already carries this exact drawing, from this buyer
    const first = await env.DB.prepare('SELECT svg_sha256 FROM signatures WHERE lot_id = ?1 AND buyer = ?2 AND doc != ?3 AND signed_sha256 IS NOT NULL').bind(lot, buyer, doc).first<{ svg_sha256: string }>();
    if (first?.svg_sha256 !== svgHash) return fail('nothing_to_reuse', 409);
  }

  const now = Date.now();
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ipHash = ip ? await sha256Hex(new TextEncoder().encode(`${env.BUYER_SECRET}:${ip}`)) : null;
  // the row is the lock: a second sign of the same document loses the insert and is 409
  const claim = await env.DB.prepare(`INSERT INTO signatures (lot_id, doc, buyer, at, ip_hash, consent_version, reuse, svg_sha256, user_agent)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) ON CONFLICT (lot_id, doc) DO NOTHING RETURNING id`)
    .bind(lot, doc, buyer, now, ipHash, CONSENT_VERSION, reuse ? 1 : 0, svgHash, (req.headers.get('user-agent') ?? '').slice(0, 200)).first<{ id: number }>();
  if (!claim) return fail('already_signed', 409, { path: signedPath(lot, doc), view: viewUrl(new URL(req.url).origin, lot, doc, tokenOf(req)) });

  try {
    const name = (await env.DB.prepare('SELECT name FROM buyers WHERE id = ?1').bind(buyer).first<{ name: string | null }>())?.name ?? '';
    const signed = await stampPdf(bytes, fields, {
      ink, name, date: centralDate(now), price: doc === 'bill' ? usd(sale.hammer) : undefined, soldOn: doc === 'bill' ? centralDate(sale.wonAt) : undefined,
      audit: `Signed electronically on Obavia, ${centralDate(now)}. Consent ${CONSENT_VERSION}.`,
    });
    const [originalSha, signedSha] = await Promise.all([sha256Hex(bytes), sha256Hex(signed)]);
    await env.FILES.put(signedKey(lot, doc), signed, { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { original: originalSha, signed: signedSha } });
    await env.DB.prepare('UPDATE signatures SET original_sha256 = ?2, signed_sha256 = ?3, signed_key = ?4 WHERE id = ?1').bind(claim.id, originalSha, signedSha, signedKey(lot, doc)).run();
    return json({ doc, path: signedPath(lot, doc), view: viewUrl(new URL(req.url).origin, lot, doc, tokenOf(req)), sha256: signedSha, originalSha256: originalSha, at: now, reuse });
  } catch {
    await env.DB.prepare('DELETE FROM signatures WHERE id = ?1').bind(claim.id).run();   // nothing was signed; the buyer may sign again
    return fail('cannot_stamp', 422);
  }
}

/* ---------------------------------------------------------------- small helpers */

async function sha256Hex(b: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', b));
  return Array.from(d, x => x.toString(16).padStart(2, '0')).join('');
}
/** MM/DD/YYYY in Central time, the date a Texas form carries. */
export function centralDate(at: number): string {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(at));
  const g = (t: string) => p.find(x => x.type === t)?.value ?? '';
  return `${g('month')}/${g('day')}/${g('year')}`;
}
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/* ---------------------------------------------------------------- the signature */

/** A drawn signature: absolute subpaths in the pad's own units (y down). Only path data is read from the SVG. */
export type Ink = { paths: { op: 'm' | 'l' | 'c'; p: number[] }[]; box: { x0: number; y0: number; x1: number; y1: number } };

/** Reads every `d` attribute of an SVG (or a bare path string). M L H V C Q Z, absolute or relative. Null when
    there is nothing drawn or anything else is in the data. */
export function parseSignature(svg: string): Ink | null {
  const ds = svg.trim().startsWith('<') ? [...svg.matchAll(/\sd\s*=\s*"([^"]*)"/g)].map(x => x[1]) : [svg];
  const paths: Ink['paths'] = [];
  let x = 0, y = 0, sx = 0, sy = 0, drawn = false;
  for (const d of ds) {
    if (!/^[MLHVCQZmlhvcqz0-9eE\s.,+-]*$/.test(d)) return null;
    const toks = d.match(/[MLHVCQZmlhvcqz]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? [];
    if (toks.length > 40_000) return null;
    let i = 0, cmd = '';
    const num = () => { const t = toks[i++]; const n = Number(t); if (t === undefined || !Number.isFinite(n)) throw 0; return n; };
    try {
      while (i < toks.length) {
        if (/^[A-Za-z]$/.test(toks[i])) cmd = toks[i++];
        else if (!cmd) return null;
        const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
        const ox = rel ? x : 0, oy = rel ? y : 0;
        if (C === 'Z') { paths.push({ op: 'l', p: [sx, sy] }); x = sx; y = sy; cmd = ''; continue; }
        if (C === 'M') { x = ox + num(); y = oy + num(); sx = x; sy = y; paths.push({ op: 'm', p: [x, y] }); cmd = rel ? 'l' : 'L'; continue; }
        if (C === 'L') { x = ox + num(); y = oy + num(); paths.push({ op: 'l', p: [x, y] }); drawn = true; continue; }
        if (C === 'H') { x = ox + num(); paths.push({ op: 'l', p: [x, y] }); drawn = true; continue; }
        if (C === 'V') { y = oy + num(); paths.push({ op: 'l', p: [x, y] }); drawn = true; continue; }
        if (C === 'C') { const p = [ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()]; paths.push({ op: 'c', p }); x = p[4]; y = p[5]; drawn = true; continue; }
        if (C === 'Q') {   // a quadratic as the cubic it equals
          const qx = ox + num(), qy = oy + num(), ex = ox + num(), ey = oy + num();
          paths.push({ op: 'c', p: [x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey), ex, ey] }); x = ex; y = ey; drawn = true; continue;
        }
        return null;
      }
    } catch { return null; }
  }
  if (!drawn || paths[0]?.op !== 'm') return null;
  const xs: number[] = [], ys: number[] = [];
  for (const s of paths) for (let k = 0; k < s.p.length; k += 2) { xs.push(s.p[k]); ys.push(s.p[k + 1]); }
  const box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  if (box.x1 - box.x0 < 1 && box.y1 - box.y0 < 1) return null;   // a dot is not a signature
  return { paths, box };
}

/* ---------------------------------------------------------------- the PDF: read */

type Name = { k: 'name'; v: string };
type Ref = { k: 'ref'; n: number; g: number };
type Str = { k: 'str'; raw: string };
type Dict = { k: 'dict'; m: Map<string, Val> };
type Val = number | boolean | null | Name | Ref | Str | Dict | Val[];
type XEntry = { t: 1; off: number; g: number } | { t: 2; stm: number; idx: number };

const isDict = (v: Val | undefined): v is Dict => !!v && typeof v === 'object' && !Array.isArray(v) && v.k === 'dict';
const isRef = (v: Val | undefined): v is Ref => !!v && typeof v === 'object' && !Array.isArray(v) && v.k === 'ref';
const isName = (v: Val | undefined, n?: string): v is Name => !!v && typeof v === 'object' && !Array.isArray(v) && v.k === 'name' && (n === undefined || v.v === n);

function latin1(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(b.subarray(i, i + 0x8000)));
  return s;
}
function bytesOf(s: string): Uint8Array {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
}

const WS = '\x00\t\n\f\r ', DELIM = '()<>[]{}/%';

/** A PDF object parser over a latin1 view of the file: enough for xref tables and streams, object streams,
    the page tree and a page's resources. */
class Lexer {
  constructor(public s: string, public i = 0) {}
  ws() {
    for (;;) {
      while (this.i < this.s.length && WS.includes(this.s[this.i])) this.i++;
      if (this.s[this.i] !== '%') return;
      while (this.i < this.s.length && this.s[this.i] !== '\n' && this.s[this.i] !== '\r') this.i++;
    }
  }
  word(): string { const st = this.i; while (this.i < this.s.length && !WS.includes(this.s[this.i]) && !DELIM.includes(this.s[this.i])) this.i++; return this.s.slice(st, this.i); }
  value(): Val {
    this.ws();
    const s = this.s, c = s[this.i];
    if (c === '<' && s[this.i + 1] === '<') {
      this.i += 2; const m = new Map<string, Val>();
      for (;;) {
        this.ws();
        if (s[this.i] === '>' && s[this.i + 1] === '>') { this.i += 2; return { k: 'dict', m }; }
        if (s[this.i] !== '/') throw new Error('pdf: dict key');
        this.i++; const key = this.word();
        m.set(key, this.value());
      }
    }
    if (c === '<') { const e = s.indexOf('>', this.i); if (e < 0) throw new Error('pdf: hex'); const raw = s.slice(this.i, e + 1); this.i = e + 1; return { k: 'str', raw }; }
    if (c === '[') { this.i++; const a: Val[] = []; for (;;) { this.ws(); if (s[this.i] === ']') { this.i++; return a; } if (this.i >= s.length) throw new Error('pdf: array'); a.push(this.value()); } }
    if (c === '(') {
      const st = this.i; let depth = 0;
      for (; this.i < s.length; this.i++) {
        const ch = s[this.i];
        if (ch === '\\') { this.i++; continue; }
        if (ch === '(') depth++;
        else if (ch === ')' && --depth === 0) { this.i++; return { k: 'str', raw: s.slice(st, this.i) }; }
      }
      throw new Error('pdf: string');
    }
    if (c === '/') { this.i++; return { k: 'name', v: this.word() }; }
    const w = this.word();
    if (w === 'true') return true;
    if (w === 'false') return false;
    if (w === 'null') return null;
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) throw new Error(`pdf: token ${w.slice(0, 12)}`);
    const n = Number(w);
    if (/^\d+$/.test(w)) {   // perhaps `n g R`
      const save = this.i; this.ws(); const g = this.word();
      if (/^\d+$/.test(g)) { this.ws(); if (s[this.i] === 'R' && (this.i + 1 >= s.length || WS.includes(s[this.i + 1]) || DELIM.includes(s[this.i + 1]))) { this.i++; return { k: 'ref', n, g: Number(g) }; } }
      this.i = save;
    }
    return n;
  }
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const out = new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate')));
  return new Uint8Array(await out.arrayBuffer());
}

/** PNG predictors (ISO 32000-1 §7.4.4.4), as xref streams use them. */
function unpredict(data: Uint8Array, columns: number): Uint8Array {
  const row = columns + 1, rows = Math.floor(data.length / row), out = new Uint8Array(rows * columns);
  for (let r = 0; r < rows; r++) {
    const f = data[r * row], src = r * row + 1, dst = r * columns;
    for (let c = 0; c < columns; c++) {
      const a = c > 0 ? out[dst + c - 1] : 0, up = r > 0 ? out[dst - columns + c] : 0, ul = r > 0 && c > 0 ? out[dst - columns + c - 1] : 0, x = data[src + c];
      let v = x;
      if (f === 1) v = x + a; else if (f === 2) v = x + up; else if (f === 3) v = x + ((a + up) >> 1);
      else if (f === 4) { const p = a + up - ul, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - ul); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? up : ul); }
      out[dst + c] = v & 0xff;
    }
  }
  return out;
}

class Pdf {
  s: string;
  xref = new Map<number, XEntry>();
  trailer!: Dict;
  startxref = 0;
  xrefIsStream = false;
  private stmCache = new Map<number, { s: string; offs: Map<number, number> }>();
  constructor(public bytes: Uint8Array) { this.s = latin1(bytes); }

  async load() {
    const sx = this.s.lastIndexOf('startxref');
    if (sx < 0) throw new Error('pdf: no startxref');
    const lx = new Lexer(this.s, sx + 9);
    const off = lx.value();
    if (typeof off !== 'number') throw new Error('pdf: startxref');
    this.startxref = off;
    let at: number | null = off, first = true;
    const seen = new Set<number>();
    while (at !== null && !seen.has(at)) {
      seen.add(at);
      const t = await this.section(at);
      if (first) { this.trailer = t.dict; this.xrefIsStream = t.stream; first = false; }
      if (t.dict.m.get('Encrypt') !== undefined) throw new Error('pdf: encrypted');
      const prev = t.dict.m.get('Prev');
      at = typeof prev === 'number' ? prev : null;
    }
  }

  private async section(at: number): Promise<{ dict: Dict; stream: boolean }> {
    const lx = new Lexer(this.s, at); lx.ws();
    if (this.s.startsWith('xref', lx.i)) {
      lx.i += 4;
      for (;;) {
        lx.ws();
        if (this.s.startsWith('trailer', lx.i)) {
          lx.i += 7; const d = lx.value(); if (!isDict(d)) throw new Error('pdf: trailer');
          const hybrid = d.m.get('XRefStm');   // a hybrid file: the compressed objects are listed in this stream
          if (typeof hybrid === 'number') await this.section(hybrid);
          return { dict: d, stream: false };
        }
        const start = Number(lx.word()); lx.ws(); const count = Number(lx.word());
        if (!Number.isInteger(start) || !Number.isInteger(count)) throw new Error('pdf: xref');
        for (let k = 0; k < count; k++) {
          lx.ws(); const o = Number(lx.word()); lx.ws(); const g = Number(lx.word()); lx.ws(); const t = lx.word();
          if (t === 'n' && !this.xref.has(start + k)) this.xref.set(start + k, { t: 1, off: o, g });   // a free entry is skipped: nothing live points at it
        }
      }
    }
    const o = await this.objectAt(at);
    if (!isDict(o.val) || !isName(o.val.m.get('Type'), 'XRef') || o.data === null) throw new Error('pdf: xref stream');
    const d = o.val.m, w = (d.get('W') as number[]).map(Number), size = d.get('Size') as number;
    const index = (d.get('Index') as number[] | undefined) ?? [0, size];
    const data = await this.decode(o.val, o.data), rowLen = w[0] + w[1] + w[2];
    const field = (p: number, n: number) => { let v = 0; for (let k = 0; k < n; k++) v = v * 256 + data[p + k]; return v; };
    let p = 0;
    for (let s = 0; s < index.length; s += 2) {
      for (let k = 0; k < index[s + 1]; k++, p += rowLen) {
        const num = index[s] + k; if (this.xref.has(num)) continue;
        const type = w[0] ? field(p, w[0]) : 1, f2 = field(p + w[0], w[1]), f3 = field(p + w[0] + w[1], w[2]);
        if (type === 1) this.xref.set(num, { t: 1, off: f2, g: f3 });
        else if (type === 2) this.xref.set(num, { t: 2, stm: f2, idx: f3 });
        else this.xref.set(num, { t: 1, off: -1, g: f3 });
      }
    }
    return { dict: o.val, stream: true };
  }

  /** `n g obj value [stream ... endstream]` at a byte offset. */
  async objectAt(at: number): Promise<{ val: Val; data: Uint8Array | null }> {
    const lx = new Lexer(this.s, at); lx.ws();
    const head = /^(\d+)\s+(\d+)\s+obj/.exec(this.s.slice(lx.i, lx.i + 40));
    if (!head) throw new Error('pdf: obj');
    lx.i += head[0].length;
    const val = lx.value(); lx.ws();
    if (!this.s.startsWith('stream', lx.i) || !isDict(val)) return { val, data: null };
    let st = lx.i + 6;
    if (this.s[st] === '\r') st++;
    if (this.s[st] === '\n') st++;
    let len = val.m.get('Length');
    if (isRef(len)) len = await this.get(len);
    if (typeof len !== 'number') throw new Error('pdf: length');
    return { val, data: this.bytes.subarray(st, st + len) };
  }

  async decode(d: Dict, data: Uint8Array): Promise<Uint8Array> {
    let f = d.m.get('Filter');
    if (Array.isArray(f)) { if (f.length > 1) throw new Error('pdf: filters'); f = f[0]; }
    let out = data;
    if (f !== undefined && f !== null) { if (!isName(f, 'FlateDecode')) throw new Error('pdf: filter'); out = await inflate(data); }
    let p = d.m.get('DecodeParms');
    if (Array.isArray(p)) p = p[0];
    if (isDict(p)) {
      const pred = p.m.get('Predictor');
      if (typeof pred === 'number' && pred >= 10) out = unpredict(out, (p.m.get('Columns') as number | undefined) ?? 1);
      else if (typeof pred === 'number' && pred > 1) throw new Error('pdf: predictor');
    }
    return out;
  }

  async get(r: Ref): Promise<Val> {
    const e = this.xref.get(r.n);
    if (!e || (e.t === 1 && e.off < 0)) return null;
    if (e.t === 1) return (await this.objectAt(e.off)).val;
    let stm = this.stmCache.get(e.stm);
    if (!stm) {
      const se = this.xref.get(e.stm);
      if (!se || se.t !== 1) throw new Error('pdf: objstm');
      const o = await this.objectAt(se.off);
      if (!isDict(o.val) || !o.data) throw new Error('pdf: objstm');
      const s = latin1(await this.decode(o.val, o.data)), n = o.val.m.get('N') as number, first = o.val.m.get('First') as number;
      const lx = new Lexer(s), offs = new Map<number, number>();
      for (let k = 0; k < n; k++) { const num = lx.value() as number, off = lx.value() as number; offs.set(num, first + off); }
      stm = { s, offs }; this.stmCache.set(e.stm, stm);
    }
    const off = stm.offs.get(r.n);
    if (off === undefined) return null;
    return new Lexer(stm.s, off).value();
  }

  async resolve(v: Val | undefined): Promise<Val | undefined> { return isRef(v) ? this.get(v) : v; }

  /** Every page in order: its reference, its dictionary, and the resources it inherits. */
  async pages(): Promise<{ ref: Ref; dict: Dict; inherited?: Val }[]> {
    const root = await this.resolve(this.trailer.m.get('Root'));
    if (!isDict(root)) throw new Error('pdf: root');
    const out: { ref: Ref; dict: Dict; inherited?: Val }[] = [];
    const walk = async (ref: Ref, inherited: Val | undefined, depth: number) => {
      if (depth > 32 || out.length > 2000) throw new Error('pdf: page tree');
      const node = await this.get(ref);
      if (!isDict(node)) return;
      const res = node.m.get('Resources') ?? inherited;
      if (isName(node.m.get('Type'), 'Pages') || node.m.has('Kids')) {
        const kids = await this.resolve(node.m.get('Kids'));
        if (Array.isArray(kids)) for (const k of kids) if (isRef(k)) await walk(k, res, depth + 1);
      } else out.push({ ref, dict: node, inherited: res });
    };
    const top = root.m.get('Pages');
    if (!isRef(top)) throw new Error('pdf: pages');
    await walk(top, undefined, 0);
    return out;
  }
}

/* ---------------------------------------------------------------- the PDF: write */

function num(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}
function ser(v: Val): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return num(v);
  if (Array.isArray(v)) return `[${v.map(ser).join(' ')}]`;
  if (v.k === 'name') return `/${v.v}`;
  if (v.k === 'ref') return `${v.n} ${v.g} R`;
  if (v.k === 'str') return v.raw;
  return `<<${[...v.m].map(([k, x]) => `/${k} ${ser(x)}`).join(' ')}>>`;
}

/** Helvetica's widths (AFM, per 1000) for the printable ASCII range; anything else is taken as 556. */
const HELV = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
export const textWidth = (t: string, size: number) => [...t].reduce((w, ch) => { const c = ch.charCodeAt(0); return w + (c >= 32 && c <= 126 ? HELV[c - 32] : 556); }, 0) * size / 1000;
/** WinAnsi text for a literal string: Latin-1 kept, anything else a question mark, the three specials escaped. */
const pdfText = (t: string) => `(${t.replace(/\s+/g, ' ').trim().replace(/[^\x20-\x7e\xa0-\xff]/g, '?').replace(/([\\()])/g, '\\$1')})`;

function textOps(font: string, t: string, r: Rect, max = 11): string {
  const clean = t.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  let size = Math.min(max, r.h * 0.8);
  while (size > 6 && textWidth(clean, size) > r.w) size -= 0.25;
  return `BT /${font} ${num(size)} Tf 0 0 0 rg ${num(r.x)} ${num(r.y + (r.h - size * 0.72) / 2)} Td ${pdfText(clean)} Tj ET\n`;
}

/** The drawing fitted into its rect: the ink's own box, scaled evenly, left on the line, centred in height. */
function inkOps(ink: Ink, r: Rect): string {
  const bw = Math.max(ink.box.x1 - ink.box.x0, 1), bh = Math.max(ink.box.y1 - ink.box.y0, 1);
  const s = Math.min((r.w * 0.96) / bw, (r.h * 0.9) / bh);
  const left = r.x + r.w * 0.02, bottom = r.y + (r.h - bh * s) / 2;
  const X = (x: number) => num(left + (x - ink.box.x0) * s), Y = (y: number) => num(bottom + (ink.box.y1 - y) * s);
  let o = `q 0.08 0.12 0.32 RG ${num(Math.max(0.8, Math.min(1.6, r.h / 22)))} w 1 J 1 j\n`;
  for (const seg of ink.paths) {
    const p = seg.p;
    if (seg.op === 'm') o += `${X(p[0])} ${Y(p[1])} m\n`;
    else if (seg.op === 'l') o += `${X(p[0])} ${Y(p[1])} l\n`;
    else o += `${X(p[0])} ${Y(p[1])} ${X(p[2])} ${Y(p[3])} ${X(p[4])} ${Y(p[5])} c\n`;
  }
  return `${o}S Q\n`;
}

export type Stamp = { ink: Ink; name?: string; date?: string; price?: string; soldOn?: string; audit?: string };

/** The original bytes, then an incremental update that adds the stamp to one page. Nothing before the end of the
    original file changes: the update appends two content streams (a `q` before the page's own content and the stamp
    after its `Q`), one Helvetica font, a new revision of the page object, and a cross-reference section of the same
    kind the file already uses, chained to the old one by /Prev. */
export async function stampPdf(original: Uint8Array, f: SignFields, st: Stamp): Promise<Uint8Array> {
  const pdf = new Pdf(original);
  await pdf.load();
  const pages = await pdf.pages();
  const page = pages[f.page];
  if (!page) throw new Error('pdf: no such page');
  const size = pdf.trailer.m.get('Size');
  if (typeof size !== 'number') throw new Error('pdf: size');

  // resources: the page's own or inherited, copied, with one more font
  const res = await pdf.resolve(page.dict.m.get('Resources') ?? page.inherited);
  const resources: Dict = { k: 'dict', m: new Map(isDict(res) ? res.m : []) };
  const fontsVal = await pdf.resolve(resources.m.get('Font'));
  const fonts: Dict = { k: 'dict', m: new Map(isDict(fontsVal) ? fontsVal.m : []) };
  let fname = 'ObvHelv'; for (let k = 2; fonts.m.has(fname); k++) fname = `ObvHelv${k}`;
  const nOpen = size, nStamp = size + 1, nFont = size + 2;
  fonts.m.set(fname, { k: 'ref', n: nFont, g: 0 });
  resources.m.set('Font', fonts);

  const contents = await pdf.resolve(page.dict.m.get('Contents'));
  const own: Val[] = contents === undefined || contents === null ? [] : Array.isArray(contents) ? contents : [page.dict.m.get('Contents') as Val];
  const pageDict: Dict = { k: 'dict', m: new Map(page.dict.m) };
  pageDict.m.set('Contents', [{ k: 'ref', n: nOpen, g: 0 }, ...own, { k: 'ref', n: nStamp, g: 0 }]);
  pageDict.m.set('Resources', resources);

  let ops = '\nQ\nq\n' + inkOps(st.ink, f.signature);
  if (f.name && st.name) ops += textOps(fname, st.name, f.name);
  if (f.date && st.date) ops += textOps(fname, st.date, f.date);
  if (f.price && st.price) ops += textOps(fname, st.price, f.price);
  if (f.soldOn && st.soldOn) ops += textOps(fname, st.soldOn, f.soldOn);
  if (f.audit && st.audit) ops += textOps(fname, st.audit, f.audit, 6);
  ops += 'Q\n';

  const pieces: string[] = [];
  let at = original.length;
  const offsets = new Map<number, { off: number; g: number }>();
  const push = (s: string) => { pieces.push(s); at += s.length; };
  const last = original[original.length - 1];
  if (last !== 0x0a && last !== 0x0d) push('\n');
  const obj = (n: number, g: number, body: string) => { offsets.set(n, { off: at, g }); push(`${n} ${g} obj\n${body}\nendobj\n`); };
  const stream = (n: number, data: string) => obj(n, 0, `<</Length ${data.length}>>\nstream\n${data}\nendstream`);
  stream(nOpen, 'q\n');
  stream(nStamp, ops);
  obj(nFont, 0, '<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>');
  const pg = pdf.xref.get(page.ref.n);
  const pageGen = pg && pg.t === 1 ? pg.g : 0;
  obj(page.ref.n, pageGen, ser(pageDict));

  const keep = (k: string) => { const v = pdf.trailer.m.get(k); return v === undefined ? '' : ` /${k} ${ser(v)}`; };
  const xrefAt = at;
  if (!pdf.xrefIsStream) {
    const rows = [...offsets].sort((a, b) => a[0] - b[0]);
    let x = 'xref\n';
    for (let i = 0; i < rows.length;) {   // runs of consecutive numbers, one subsection each
      let j = i; while (j + 1 < rows.length && rows[j + 1][0] === rows[j][0] + 1) j++;
      x += `${rows[i][0]} ${j - i + 1}\n`;
      for (let k = i; k <= j; k++) x += `${String(rows[k][1].off).padStart(10, '0')} ${String(rows[k][1].g).padStart(5, '0')} n\r\n`;
      i = j + 1;
    }
    push(`${x}trailer\n<</Size ${size + 3}${keep('Root')}${keep('Info')}${keep('ID')} /Prev ${pdf.startxref}>>\nstartxref\n${xrefAt}\n%%EOF\n`);
  } else {
    const nX = size + 3;
    offsets.set(nX, { off: xrefAt, g: 0 });
    const rows = [...offsets].sort((a, b) => a[0] - b[0]);
    const index: number[] = []; let bin = '';
    for (let i = 0; i < rows.length;) {
      let j = i; while (j + 1 < rows.length && rows[j + 1][0] === rows[j][0] + 1) j++;
      index.push(rows[i][0], j - i + 1);
      for (let k = i; k <= j; k++) { const { off, g } = rows[k][1]; bin += String.fromCharCode(1, (off >>> 24) & 255, (off >>> 16) & 255, (off >>> 8) & 255, off & 255, (g >> 8) & 255, g & 255); }
      i = j + 1;
    }
    push(`${nX} 0 obj\n<</Type /XRef /Size ${nX + 1} /W [1 4 2] /Index [${index.join(' ')}]${keep('Root')}${keep('Info')}${keep('ID')} /Prev ${pdf.startxref} /Length ${bin.length}>>\nstream\n${bin}\nendstream\nendobj\nstartxref\n${xrefAt}\n%%EOF\n`);
  }
  const tail = bytesOf(pieces.join(''));
  const out = new Uint8Array(original.length + tail.length);
  out.set(original, 0); out.set(tail, original.length);
  return out;
}

/** Reads a stamped (or any) PDF back: the number of pages and, for one page, its content stream references. For tests. */
export async function inspectPdf(bytes: Uint8Array, pageIndex = 0): Promise<{ pages: number; contents: number; fonts: string[] }> {
  const pdf = new Pdf(bytes); await pdf.load();
  const pages = await pdf.pages(), p = pages[pageIndex];
  const c = await pdf.resolve(p.dict.m.get('Contents'));
  const res = await pdf.resolve(p.dict.m.get('Resources') ?? p.inherited);
  const fonts = isDict(res) ? await pdf.resolve(res.m.get('Font')) : undefined;
  return { pages: pages.length, contents: Array.isArray(c) ? c.length : c ? 1 : 0, fonts: isDict(fonts) ? [...fonts.m.keys()] : [] };
}
