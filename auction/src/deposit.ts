/* The $250 deposit, taken on Whop from inside the app. The Worker makes a
   hosted checkout; the buyer pays in an in-app browser; Whop returns to
   obavia://deposit. Either the redirect carries a payment id we hand to the
   Worker, or the signed webhook marks the deposit captured on its own; we
   read GET /me until it says so. Locally (no AUCTION_URL) it is a flag. */
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { RemoteAuctionServer } from './engine/client';
import { AUCTION_URL, buyerToken, once } from './store';

const RETURN_URL = 'obavia://deposit';
const POLL_EVERY_MS = 1500;
const POLL_FOR_MS = 12_000;

export type DepositOutcome = 'captured' | 'cancelled' | 'failed' | 'local';

const wait = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

/** The first of payment_id, receipt_id or id on the return URL, if any. */
function paymentIdFrom(url: string): string | undefined {
  let params: Record<string, unknown> | null = null;
  try { params = Linking.parse(url).queryParams as Record<string, unknown> | null; } catch { return undefined; }
  for (const k of ['payment_id', 'receipt_id', 'id']) {
    const v = params?.[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (typeof s === 'string' && s) return s;
  }
  return undefined;
}

/** True once the Worker reports the deposit captured, read every 1.5 s for up to 12 s. */
async function pollCaptured(base: string, token: string): Promise<boolean> {
  const until = Date.now() + POLL_FOR_MS;
  for (;;) {
    const me = await RemoteAuctionServer.me(base, token);
    if (me?.deposit_status === 'captured') return true;
    if (Date.now() + POLL_EVERY_MS > until) return false;
    await wait(POLL_EVERY_MS);
  }
}

/** Open the Whop checkout, come back, and confirm the deposit with the Worker. */
export async function takeDeposit(): Promise<DepositOutcome> {
  if (!AUCTION_URL) { once.deposit = true; return 'local'; }
  const token = buyerToken();
  if (!token) return 'failed';
  const checkout = await RemoteAuctionServer.depositCheckout(AUCTION_URL, token, RETURN_URL);
  if (!checkout) return 'failed';

  let resultType: string;
  try {
    const result = await WebBrowser.openAuthSessionAsync(checkout.url, RETURN_URL);
    resultType = result.type;
    if (result.type === 'success') {
      const paymentId = paymentIdFrom(result.url);
      if (paymentId) await RemoteAuctionServer.deposit(AUCTION_URL, token, paymentId).catch(() => false);
    }
  } catch {
    resultType = 'error';
  }

  // the webhook may land before or after the redirect; the Worker's word decides
  if (await pollCaptured(AUCTION_URL, token)) { once.deposit = true; return 'captured'; }
  return resultType === 'cancel' || resultType === 'dismiss' ? 'cancelled' : 'failed';
}

/** Read the deposit once from the Worker and set the flag from it (after sign-in). */
export async function refreshDeposit(): Promise<boolean> {
  if (!AUCTION_URL) return once.deposit;
  const token = buyerToken();
  if (!token) return once.deposit;
  const me = await RemoteAuctionServer.me(AUCTION_URL, token);
  if (me) once.deposit = me.deposit_status === 'captured';
  return once.deposit;
}

/** The deposit back, when the buyer leads nothing and owes nothing. */
export async function releaseDeposit(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!AUCTION_URL) { once.deposit = false; return { ok: true }; }
  const token = buyerToken();
  if (!token) return { ok: false, reason: 'sign in' };
  const r = await RemoteAuctionServer.releaseDeposit(AUCTION_URL, token);
  if (r.ok) once.deposit = false;
  return r;
}
