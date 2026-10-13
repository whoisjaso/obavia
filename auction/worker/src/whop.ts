/* Whop is the payment rail. Four things it does for the auction:
   the buyer's standing deposit (a payment we hold and refund on a loss or
   keep on a no-pay), the balance (an invoice the buyer settles by ACH, card
   or at the lot), the dealer's money (a transfer to the dealer's connected
   account on cleared funds, lender first), and the words that reach us when
   money moves (Standard Webhooks, signed). API: https://api.whop.com/api/v1,
   sandbox at sandbox-api.whop.com. Everything here is a thin, typed fetch. */

export type WhopEnv = { WHOP_API_KEY?: string; WHOP_API_BASE?: string; WHOP_WEBHOOK_SECRET?: string; WHOP_ACCOUNT_ID?: string };

export type WhopPayment = {
  id: string; status: 'draft' | 'open' | 'authorized' | 'paid' | 'pending' | 'uncollectible' | 'unresolved' | 'void';
  total?: number; usd_total?: number; currency?: string; metadata?: Record<string, string> | null;
  refundable?: boolean; refunded_amount?: number | null; user?: { id?: string } | null;
  paid_at?: string | null; settlement_time_at?: string | null;   // ISO; settlement_time_at: when the funds post to the available balance (docs read 2026-10-13)
};

/** POST /invoices and invoice.* webhooks (docs.whop.com/api-reference/invoices, read 2026-10-13). No metadata field on an
    invoice: the lane matches an invoice by the id it stored at creation. */
export type WhopInvoiceStatus = 'draft' | 'open' | 'paid' | 'past_due' | 'uncollectible' | 'void';
export type WhopInvoice = {
  id: string; status: WhopInvoiceStatus; number?: string; pay_online_url?: string | null; payment?: { id: string } | null;
  payment_processing?: boolean; company?: { id: string }; due_date?: string | null; created_at?: string;
  current_plan?: { id: string; formatted_price?: string; currency?: string } | null;
};
export type WhopSettlement = { id: string; status: WhopPayment['status']; paidAt: number | null; settlesAt: number | null; cleared: boolean };
/** POST /files: a record and a presigned upload (docs.whop.com/api-reference/beta/files/create-file, read 2026-10-13). */
export type WhopFile = { id: string; upload_url: string | null; upload_headers?: Record<string, unknown> | null; upload_status?: string; url?: string | null };
/** transfer.completed's data: the Transfer (docs.whop.com/api-reference/beta/transfers/transfer, read 2026-10-13). */
export type WhopTransfer = { id: string; status?: string; amount?: number; succeeded_at?: string | null; metadata?: Record<string, unknown> | null; notes?: string | null; destination?: { id?: string } | null };

const isoMs = (v: unknown): number | null => { if (typeof v !== 'string') return null; const t = Date.parse(v); return Number.isFinite(t) ? t : null; };

/** POST /checkout_configurations: `purchase_url` is the hosted checkout the buyer opens. */
export type WhopCheckoutConfiguration = {
  id: string; purchase_url: string; redirect_url?: string | null;
  metadata?: Record<string, string> | null; plan?: { id?: string } | null;
};

export class Whop {
  constructor(private env: WhopEnv) {}
  get ready() { return !!this.env.WHOP_API_KEY; }
  private get base() { return (this.env.WHOP_API_BASE ?? 'https://api.whop.com/api/v1').replace(/\/$/, ''); }

  private async call<T>(method: string, path: string, body?: unknown, idempotenceKey?: string): Promise<T> {
    const r = await fetch(`${this.base}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.env.WHOP_API_KEY}`, 'content-type': 'application/json', ...(idempotenceKey ? { 'idempotency-key': idempotenceKey } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`whop ${method} ${path}: ${r.status} ${await r.text()}`);
    return r.json() as Promise<T>;
  }

  /** A hosted checkout for the deposit: one payment, our metadata on it, back to the app after. */
  createDepositCheckout(buyerId: string, amountUsd: number, redirectUrl: string) {
    return this.call<WhopCheckoutConfiguration>('POST', '/checkout_configurations', {
      account_id: this.env.WHOP_ACCOUNT_ID, mode: 'payment', currency: 'usd', redirect_url: redirectUrl,
      metadata: { kind: 'deposit', buyer: buyerId },
      plan: { plan_type: 'one_time', initial_price: amountUsd, currency: 'usd', title: 'Obavia deposit' },
    });
  }

  getPayment(id: string) { return this.call<WhopPayment>('GET', `/payments/${encodeURIComponent(id)}`); }

  /** True when this payment is the buyer's captured deposit: paid, ours, at least the amount. */
  async verifyDeposit(paymentId: string, buyerId: string, amountUsd: number): Promise<WhopPayment | null> {
    const p = await this.getPayment(paymentId);
    const total = p.usd_total ?? p.total ?? 0;
    const ok = p.status === 'paid' && (p.currency ?? 'usd').toLowerCase() === 'usd' && total >= amountUsd && p.metadata?.kind === 'deposit' && p.metadata?.buyer === buyerId;
    return ok ? p : null;
  }

  /** Back to the buyer: lost the auction, or walked within the rules. */
  refund(paymentId: string, partialAmount?: number) {
    return this.call<unknown>('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, partialAmount ? { partial_amount: partialAmount } : {});
  }

  /** The dealer's money: a transfer to the dealer's connected account, safe to retry. */
  transferToDealer(dealerAccountId: string, amountUsd: number, key: string, notes: string) {
    return this.call<{ id: string }>('POST', '/transfers', { amount: amountUsd, currency: 'usd', destination_id: dealerAccountId, idempotence_key: key, notes, metadata: { key } }, key);
  }

  /** A connected account for a dealer at onboarding; Whop runs the identity checks. */
  createDealerAccount(email: string, title: string, externalId: string) {
    return this.call<{ id: string }>('POST', '/accounts', { email, title, country: 'US', metadata: { external_id: externalId }, send_customer_emails: false });
  }

  /* ---- invoices (Wave 3-A). Coded to Whop's documented v1 shape (docs.whop.com/api-reference/invoices/create-invoice,
     read 2026-10-13): POST /invoices { account_id, collection_method: 'send_invoice', email_address, customer_name, due_date,
     plan: { plan_type: 'one_time', initial_price, currency }, product: { title }, line_items } -> Invoice { id: inv_..., status,
     number, pay_online_url, payment: { id } | null, payment_processing }. UNVERIFIED in the sandbox (README "Not yet"); the
     callers in src/invoice.ts and src/fees.ts store nothing from an answer that is not an inv_ id. */

  /** One invoice, sent by email, paid online by ACH or card. `key` is the idempotency key (balance:<lot> or fee:<lot>). */
  createInvoice(input: { accountId: string; email: string; customerName: string; amountUsd: number; title: string; label: string; dueAt: number; key: string }) {
    return this.call<WhopInvoice>('POST', '/invoices', {
      account_id: input.accountId, collection_method: 'send_invoice', email_address: input.email, customer_name: input.customerName,
      due_date: new Date(input.dueAt).toISOString(), charge_buyer_fee: false,
      plan: { plan_type: 'one_time', initial_price: input.amountUsd, currency: 'usd', internal_notes: input.key },
      product: { title: input.title },
      line_items: [{ label: input.label, quantity: 1, unit_price: input.amountUsd }],
    }, input.key);
  }

  getInvoice(id: string) { return this.call<WhopInvoice>('GET', `/invoices/${encodeURIComponent(id)}`); }

  /** The balance was paid at the lot (cash, Paid At The Lot on the Desk): Whop documents no "mark paid" call for an invoice
      settled off the rail (the dashboard does it by hand), so the lane keeps paid_at_lot on its own row and voids the open
      Whop invoice (POST /invoices/{id}/void, docs read 2026-10-13) so the buyer cannot pay it twice. Permanent. */
  markInvoicePaid(id: string) { return this.call<WhopInvoice>('POST', `/invoices/${encodeURIComponent(id)}/void`, {}); }

  /** The settlement read for a payment: when it was collected and when its funds post to the available balance
      (payment.paid_at, payment.settlement_time_at, docs read 2026-10-13). `cleared` is settlement_time_at at or before now. */
  async getSettlement(paymentId: string, now = Date.now()): Promise<WhopSettlement> {
    const p = await this.getPayment(paymentId);
    const paidAt = isoMs(p.paid_at), settlesAt = isoMs(p.settlement_time_at);
    return { id: p.id, status: p.status, paidAt, settlesAt, cleared: p.status === 'paid' && settlesAt != null && settlesAt <= now };
  }

  /** The chargeback evidence pack onto a dispute (collateral.md §2, "after pickup"): POST /files { filename, visibility: 'private' }
      -> { id: file_..., upload_url, upload_headers }; the bytes PUT to the presigned URL; then PATCH /disputes/{id}
      { evidence: { uncategorized_attachment: { id }, notes } } (docs.whop.com/api-reference/beta/disputes/update-dispute, read
      2026-10-13). Attaches only: submit_evidence is a separate, irreversible call the owner makes. UNVERIFIED in the sandbox. */
  async uploadEvidence(disputeId: string, bytes: ArrayBuffer | Uint8Array, filename: string, notes: string): Promise<{ fileId: string }> {
    const f = await this.call<WhopFile>('POST', '/files', { filename, visibility: 'private' });
    if (!f || typeof f.id !== 'string' || !/^file_[A-Za-z0-9]+$/.test(f.id) || typeof f.upload_url !== 'string' || !/^https:\/\//.test(f.upload_url)) throw new Error('whop_bad_file');
    const headers: Record<string, string> = { 'content-type': 'application/pdf' };
    for (const [k, v] of Object.entries(f.upload_headers ?? {})) if (typeof v === 'string') headers[k] = v;
    const body = bytes instanceof Uint8Array ? new Uint8Array(bytes) : new Uint8Array(bytes);
    const up = await fetch(f.upload_url, { method: 'PUT', headers, body });
    if (!up.ok) throw new Error(`whop upload: ${up.status}`);
    await this.call<unknown>('PATCH', `/disputes/${encodeURIComponent(disputeId)}`, { evidence: { uncategorized_attachment: { id: f.id }, notes } });
    return { fileId: f.id };
  }

  /** Standard Webhooks: `webhook-id`, `webhook-timestamp`, `webhook-signature` ("v1,<base64>"); HMAC-SHA256 over "id.timestamp.body". */
  async verifyWebhook(req: Request, rawBody: string): Promise<boolean> {
    const secret = this.env.WHOP_WEBHOOK_SECRET; if (!secret) return false;
    const id = req.headers.get('webhook-id'), ts = req.headers.get('webhook-timestamp'), sig = req.headers.get('webhook-signature');
    if (!id || !ts || !sig) return false;
    if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;   // five minutes of skew
    const keyBytes = secret.startsWith('whsec_') ? Uint8Array.from(atob(secret.slice(6)), c => c.charCodeAt(0)) : new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${rawBody}`)));
    const want = btoa(String.fromCharCode(...mac));
    return sig.split(' ').some(part => { const [v, s] = part.split(','); return v === 'v1' && s && timingSafeEqual(s, want); });
  }
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** The events we subscribe to when creating the webhook (POST /webhooks { url, events }). */
export const WHOP_EVENTS = ['payment.succeeded', 'payment.failed', 'refund.created', 'refund.updated', 'transfer.completed', 'transfer.failed', 'dispute.created', 'dispute.updated', 'invoice.paid', 'invoice.voided'] as const;
