/* PayNearMe callbacks, read into one shape the Desk understands.
   From PayNearMe's devdocs (read October 1, 2026):
   - Confirmation callback: pnm_order_identifier, site_customer_identifier,
     payment_amount, payment_type (ach | cash | cash_app | credit | debit | paypal),
     pnm_processing_fee, status (payment | decline), payment_timestamp.
     Answer within 10 seconds or it is re-sent every minute for 30 minutes,
     then callbacks pause until resumed in the Business Portal.
   - Reverse callback: reverse_type (e.g. "Chargeback", "Bank Return"),
     reverse_code ("canceled", "refunded", or an ACH code like "R01"),
     reverse_reason (e.g. "Insufficient Funds").
   - Both are signed with HMAC-SHA256. The exact header or parameter that
     carries the signature is TO CONFIRM in the PayNearMe sandbox before
     going live; SIGNATURE_HEADER below is the one place to change. */

export type PaymentUpdate = {
  kind: 'payment' | 'decline' | 'reverse';
  processorId: string;            // pnm_order_identifier
  customerId: string;             // site_customer_identifier: our note id
  cents: number;
  method?: 'ach' | 'cash' | 'cash_app' | 'credit' | 'debit' | 'paypal' | 'other';
  feeCents?: number;
  at?: string;                    // ISO
  status: 'cleared' | 'clearing' | 'declined' | 'returned' | 'refunded' | 'charged_back';
  code?: string; reason?: string;
};

export const SIGNATURE_HEADER = 'x-pnm-signature'; // TO CONFIRM in the sandbox

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const same = (a: string, b: string) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

export async function verifySignature(rawBody: string, headers: Headers, secret: string): Promise<boolean> {
  const sig = (headers.get(SIGNATURE_HEADER) ?? '').toLowerCase().trim();
  if (!sig || !secret) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return same(sig, hex(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))));
}

/** Callbacks arrive as JSON or as form fields; read either. */
function fields(raw: string): Record<string, string> {
  const t = raw.trim();
  if (t.startsWith('{')) {
    try { const o = JSON.parse(t); const flat: Record<string, string> = {}; const walk = (x: unknown) => { if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) { if (v && typeof v === 'object') walk(v); else flat[k] = String(v); } }; walk(o); return flat; } catch { return {}; }
  }
  return Object.fromEntries(new URLSearchParams(t));
}
const cents = (v?: string) => (v ? Math.round(parseFloat(v.replace(/[$,]/g, '')) * 100) : 0);
const when = (f: Record<string, string>) => f.payment_timestamp ? new Date(f.payment_timestamp).toISOString() : f.timestamp ? new Date(Number(f.timestamp) * 1000).toISOString() : undefined;

export function parseCallback(raw: string): PaymentUpdate | null {
  const f = fields(raw);
  const processorId = f.pnm_order_identifier, customerId = f.site_customer_identifier ?? '';
  if (!processorId) return null;
  if (f.reverse_type || f.reverse_code) {
    const type = (f.reverse_type ?? '').toLowerCase(), code = f.reverse_code ?? '';
    const status = type.includes('charge') ? 'charged_back' : code === 'refunded' ? 'refunded' : 'returned';
    return { kind: 'reverse', processorId, customerId, cents: cents(f.payment_amount), at: when(f), status, code: code || undefined, reason: f.reverse_reason || undefined };
  }
  const method = (['ach', 'cash', 'cash_app', 'credit', 'debit', 'paypal'] as const).find(m => m === f.payment_type) ?? 'other';
  if (f.status === 'decline') return { kind: 'decline', processorId, customerId, cents: cents(f.payment_amount), method, at: when(f), status: 'declined' };
  if (f.status !== 'payment') return null;
  // A bank payment can still come back for days; everything else has cleared.
  return { kind: 'payment', processorId, customerId, cents: cents(f.payment_amount), method, feeCents: f.pnm_processing_fee ? cents(f.pnm_processing_fee) : undefined, at: when(f), status: method === 'ach' ? 'clearing' : 'cleared' };
}

/** The acknowledgements PayNearMe expects, word for word from its docs. */
export const ack = (u: PaymentUpdate) => u.kind === 'reverse'
  ? { payment_reverse_response: { version: '3.0', reverse_payment: { pnm_order_identifier: u.processorId } } }
  : { payment_confirmation_response: { version: '3.0', confirmation: { pnm_order_identifier: u.processorId } } };
