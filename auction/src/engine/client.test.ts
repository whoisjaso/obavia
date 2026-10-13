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
