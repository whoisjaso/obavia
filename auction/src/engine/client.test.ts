/* The phone's half of buyer tokens (migration 0009) and the first-bid terms (D10), against a fake fetch. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoteAuctionServer, Refused, TERMS, TERMS_VERSION } from './client';
import { TERMS as WORKER_TERMS, TERMS_VERSION as WORKER_VERSION } from '../../worker/src/bidders';

type Call = { url: string; init: RequestInit };
function fake(status: number, body: unknown) {
  const calls: Call[] = [];
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}
const headers = (c: Call) => (c.init.headers ?? {}) as Record<string, string>;
const sent = (c: Call) => JSON.parse(String(c.init.body ?? '{}'));
const BASE = 'https://w.example';
const lot = { id: 'altima', high: 5000, bids: 1, closesAt: 1, opensAt: 0, leader: 'b_x', max: 5000 };

afterEach(() => { vi.restoreAllMocks(); });

describe('sign-in', () => {
  it('first launch: the profile alone, no id, no authorization; keeps the id and token the Worker makes', async () => {
    const calls = fake(200, { id: 'b_abc', token: 'b_abc.sig' });
    const s = await RemoteAuctionServer.signIn(BASE, null, { name: 'Marisol', state: 'TX' });
    expect(s).toEqual({ id: 'b_abc', token: 'b_abc.sig' });
    expect(calls[0].url).toBe(`${BASE}/me`);
    expect(headers(calls[0]).authorization).toBeUndefined();
    expect(sent(calls[0])).toEqual({ name: 'Marisol', state: 'TX' });
  });

  it('later launches: Bearer token with the stored id; phone and address only when known', async () => {
    const calls = fake(200, { id: 'b_abc', token: 'b_abc.sig' });
    await RemoteAuctionServer.signIn(BASE, { id: 'b_abc', token: 'b_abc.sig' }, { name: 'Marisol', state: 'TX', phone: '', address: '2210 Elm St' });
    expect(headers(calls[0]).authorization).toBe('Bearer b_abc.sig');
    expect(sent(calls[0])).toEqual({ id: 'b_abc', name: 'Marisol', state: 'TX', address: '2210 Elm St' });
  });

  it('a 401 is not_yours, and nothing is retried as a new buyer', async () => {
    const calls = fake(401, { error: 'not_yours' });
    await expect(RemoteAuctionServer.signIn(BASE, { id: 'b_abc', token: 'dead' }, {})).rejects.toMatchObject({ code: 'not_yours' });
    expect(calls).toHaveLength(1);
  });

  it('refuses to adopt a different id under a stored one', async () => {
    fake(200, { id: 'b_other', token: 't' });
    await expect(RemoteAuctionServer.signIn(BASE, { id: 'b_abc', token: 'b_abc.sig' }, {})).rejects.toBeInstanceOf(Refused);
  });

  it('rotate: Bearer, no body, the new token; null on refusal', async () => {
    let calls = fake(200, { id: 'b_abc', token: 'b_abc.1.sig' });
    expect(await RemoteAuctionServer.rotate(BASE, 'b_abc.sig')).toEqual({ id: 'b_abc', token: 'b_abc.1.sig' });
    expect(calls[0].url).toBe(`${BASE}/me/rotate`);
    expect(headers(calls[0]).authorization).toBe('Bearer b_abc.sig');
    expect(calls[0].init.body).toBeUndefined();
    calls = fake(401, 'sign in');
    expect(await RemoteAuctionServer.rotate(BASE, 'dead')).toBeNull();
  });
});

describe('bids and the terms', () => {
  const server = () => new RemoteAuctionServer(BASE, () => 'b_abc.sig');
  const req = { lotId: 'altima', bidder: 'b_abc', amount: 5100, max: 5100, key: 'k' };

  it('the first bid carries the terms version; a later one carries nothing', async () => {
    let calls = fake(200, { ok: true, youLead: true, lot, stampedAt: 1 });
    await server().bid({ ...req, terms: TERMS_VERSION });
    expect(sent(calls[0]).terms).toBe('2026-10-13');
    calls = fake(200, { ok: true, youLead: true, lot, stampedAt: 1 });
    await server().bid(req);
    expect('terms' in sent(calls[0])).toBe(false);
  });

  it('409 terms_required, 403 win_cap, 402 deposit arrive as codes', async () => {
    fake(409, { error: 'terms_required', version: '2026-10-13' });
    await expect(server().bid(req)).rejects.toMatchObject({ code: 'terms_required', status: 409 });
    fake(403, { error: 'win_cap', count: 4, cap: 4 });
    await expect(server().bid(req)).rejects.toMatchObject({ code: 'win_cap', status: 403 });
    fake(402, 'deposit first');
    await expect(server().bid(req)).rejects.toMatchObject({ code: 'deposit' });
  });

  it('the phone states the same four terms, at the same version, as the Worker', () => {
    expect([...TERMS]).toEqual([...WORKER_TERMS]);
    expect(TERMS_VERSION).toBe(WORKER_VERSION);
  });
});

describe('the second chance and the Wallet pass (W3-B routes)', () => {
  const server = () => new RemoteAuctionServer(BASE, () => 'b_abc.sig');

  it('accepts the offer at POST /lots/:id/offer/accept with the Bearer, and keeps the new sale', async () => {
    const sale = { buyer: 'b_abc', hammer: 5000, wonAt: 10, deadlineAt: 10 + 48 * 3_600_000, invoiceUrl: 'https://whop.com/invoice/inv_2' };
    const calls = fake(200, { ...lot, closed: { at: 1, sold: true }, sale });
    const got = await server().acceptOffer('altima');
    expect(calls[0].url).toBe(`${BASE}/lots/altima/offer/accept`);
    expect(calls[0].init.method).toBe('POST');
    expect(headers(calls[0]).authorization).toBe('Bearer b_abc.sig');
    expect(got.sale).toEqual(sale);
    expect(server().get).toBeDefined();
  });

  it('a spent or expired offer is a code, never a sale', async () => {
    fake(409, { error: 'offer_expired' });
    await expect(server().acceptOffer('altima')).rejects.toMatchObject({ code: 'offer_expired', status: 409 });
    fake(403, { error: 'not_yours' });
    await expect(server().acceptOffer('altima')).rejects.toMatchObject({ code: 'not_yours' });
  });

  it('the Wallet pass: the save link from the JWT, a ready https URL as it is, null on 503 and on anything odd', async () => {
    let calls = fake(200, { jwt: 'eyJ.abc.def' });
    expect(await server().walletPass('altima')).toBe('https://pay.google.com/gp/v/save/eyJ.abc.def');
    expect(calls[0].url).toBe(`${BASE}/lots/altima/pass`);
    expect(headers(calls[0]).authorization).toBe('Bearer b_abc.sig');
    fake(200, { url: 'https://pay.google.com/gp/v/save/eyJ.x' });
    expect(await server().walletPass('altima')).toBe('https://pay.google.com/gp/v/save/eyJ.x');
    fake(200, { url: 'http://evil.example/x' });
    expect(await server().walletPass('altima')).toBeNull();
    fake(503, { error: 'pass_unavailable' });
    expect(await server().walletPass('altima')).toBeNull();
    fake(200, {});
    expect(await server().walletPass('altima')).toBeNull();
    calls = fake(200, { jwt: '' });
    expect(await server().walletPass('altima')).toBeNull();
    expect(calls).toHaveLength(1);
    expect(await new RemoteAuctionServer(BASE, () => null).walletPass('altima')).toBeNull();   // not signed in: nothing asked
  });
});

describe('recovery by phone (W3-B)', () => {
  it('POST /me/recover carries the number alone, no Bearer (the number is the claim); the masked number comes back', async () => {
    const calls = fake(200, { sent: true, phone: '(•••) •••-0142' });
    expect(await RemoteAuctionServer.recover(BASE, '+12145550142')).toEqual({ ok: true, phone: '(•••) •••-0142' });
    expect(calls[0].url).toBe(`${BASE}/me/recover`);
    expect(headers(calls[0]).authorization).toBeUndefined();
    expect(sent(calls[0])).toEqual({ phone: '+12145550142' });
    fake(429, { error: 'rate_limited' });
    expect(await RemoteAuctionServer.recover(BASE, '+12145550142')).toMatchObject({ ok: false, code: 'rate_limited' });
  });

  it('POST /me/recover/verify sends the number with the code and answers the recovered buyer with a fresh token', async () => {
    const calls = fake(200, { id: 'b_old', token: 'b_old.2.sig', phone: '(•••) •••-0142' });
    const r = await RemoteAuctionServer.recoverVerify(BASE, '+12145550142', '000000');
    expect(r).toEqual({ ok: true, session: { id: 'b_old', token: 'b_old.2.sig' }, phone: '(•••) •••-0142' });
    expect(calls[0].url).toBe(`${BASE}/me/recover/verify`);
    expect(headers(calls[0]).authorization).toBeUndefined();
    expect(sent(calls[0])).toEqual({ phone: '+12145550142', code: '000000' });
  });

  it('a wrong code, a run-out code, an unknown number and a body with no token are codes, not sessions', async () => {
    fake(400, { error: 'wrong_code' });
    expect(await RemoteAuctionServer.recoverVerify(BASE, '+12145550142', '111111')).toEqual({ ok: false, code: 'wrong_code' });
    fake(410, { error: 'code_expired' });
    expect(await RemoteAuctionServer.recoverVerify(BASE, '+12145550142', '000000')).toEqual({ ok: false, code: 'code_expired' });
    fake(404, { error: 'no_such_phone' });
    expect(await RemoteAuctionServer.recoverVerify(BASE, '+12145550142', '000000')).toEqual({ ok: false, code: 'no_such_phone' });
    fake(200, { verified: true });
    expect(await RemoteAuctionServer.recoverVerify(BASE, '+12145550142', '000000')).toEqual({ ok: false, code: 'not_verified' });
  });
});
