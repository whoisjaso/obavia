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
};

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
export const WHOP_EVENTS = ['payment.succeeded', 'payment.failed', 'refund.created', 'refund.updated', 'transfer.completed', 'transfer.failed', 'dispute.created', 'invoice.paid'] as const;
