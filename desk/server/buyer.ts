/* The buyer's page on the server: GET /b/<note>.<sig> shows it, POST to the same
   path saves a new insurance card. The signature is an HMAC of the note id, so a
   link opens exactly one note and can't be guessed from another. The page never
   shows the buyer's phone, address or anything not already on their receipts. */
import { buyerPage } from '../src/lib/buyerpage';
import { today, type Loan } from '../src/lib/loans';
import type { DealerContact, NoteStore } from './payments/desk';
import type { Messenger } from './service';

export const MAX_PAGE_POST = 600 * 1024;
const enc = new TextEncoder();
const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function sig(secret: string, id: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`buyer-page|${id}`)))).slice(0, 22);
}
export async function pagePath(secret: string, id: string) { return `/b/${encodeURIComponent(id)}.${await sig(secret, id)}`; }
export async function readPagePath(secret: string, path: string): Promise<string | null> {
  const m = /^\/b\/([^/.]+)\.([\w-]{22})$/.exec(path);
  if (!m) return null;
  const id = decodeURIComponent(m[1]), want = await sig(secret, id);
  return want.length === m[2].length && [...want].every((c, i) => c === m[2][i]) ? id : null;
}

export type BuyerPages = { notes: NoteStore & { dealerFor(n: Loan): Promise<DealerContact | null> }; messenger: Messenger; secret: string; clock?: () => Date };
const html = (body: string, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' } });

export async function buyerRoute(req: Request, path: string, p: BuyerPages): Promise<Response | null> {
  const id = await readPagePath(p.secret, path);
  if (!id) return null;
  const note = await p.notes.get(id), dealer = note && await p.notes.dealerFor(note);
  if (!note || !dealer) return html('<!doctype html><title>Not found</title><p>This link has expired.</p>', 404);
  const t = today(dealer.timeZone, p.clock?.());
  if (req.method === 'GET') return html(buyerPage(note, t, { name: dealer.name }, { action: path }));
  if (req.method !== 'POST') return html('', 405);
  const raw = await req.text();
  if (raw.length > MAX_PAGE_POST) return html('<!doctype html><p>That photo is too large.</p>', 413);
  const f = new URLSearchParams(raw), company = (f.get('company') ?? '').trim().slice(0, 60), expires = f.get('expires') ?? '', data = f.get('data') ?? '';
  if (!company || !/^\d{4}-\d{2}-\d{2}$/.test(expires) || (data && !/^data:image\/jpeg;base64,[\w+/=]+$/.test(data))) return html(buyerPage(note, t, { name: dealer.name }, { action: path }), 422);
  const next: Loan = { ...note, insurance: { company, expires, updated: t, by: 'buyer', ...(data ? { photo: data } : {}) } };
  await p.notes.save(next);
  for (const to of dealer.alertTo) await p.messenger.send({ dealerId: dealer.dealerId, from: dealer.textFrom, to, text: `${note.buyer.name} sent new insurance: ${company}, ends ${expires}.`, kind: 'care' });
  return html(buyerPage(next, t, { name: dealer.name }, { sent: true }));
}
