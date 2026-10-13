/* The Bid sheet's two newest stamps (worker/README.md, Who may bid: 429 too_many_bids with Retry-After,
   409 one_open_bid with `open`): the words, the countdown, and what the thrown Refused carries. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RETRY_MAX_S, Refused, RemoteAuctionServer, SAID, retryAfterSeconds, retryUntil, said, secondsLeft } from './client';

const BASE = 'https://w.example';
const req = { lotId: 'altima', bidder: 'b_x', amount: 5100, max: 5100, key: 'k1' };
function fake(status: number, body: unknown, headers: Record<string, string> = {}) {
  globalThis.fetch = vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers })) as typeof fetch;
}
const server = () => new RemoteAuctionServer(BASE, () => 'b_x.sig');
afterEach(() => { vi.restoreAllMocks(); });

describe('the words', () => {
  it('too_many_bids and one_open_bid say why in four words or fewer (DOCTRINE §4.7)', () => {
    for (const code of ['too_many_bids', 'one_open_bid'] as const) {
      const words = SAID[code].split(/\s+/);
      expect(words.length).toBeLessThanOrEqual(4);
      expect(SAID[code]).not.toMatch(/[\u2013\u2014]/);   // no en or em dash, ever
    }
    expect(said('too_many_bids')).toBe('Too fast');
    expect(said('one_open_bid')).toBe('One at a time');
  });
  it('codes that open a page instead have no stamp', () => {
    for (const code of ['phone_required', 'terms_required', 'deposit', 'seller_cannot_bid', 'http_500', '']) expect(said(code)).toBeNull();
  });
});

describe('the countdown', () => {
  it('Retry-After as seconds, as an HTTP date, or missing', () => {
    expect(retryAfterSeconds('18')).toBe(18);
    expect(retryAfterSeconds(' 7 ')).toBe(7);
    expect(retryAfterSeconds('0')).toBe(1);                    // the Worker never says 0; a 429 is at least a second
    const now = Date.parse('2026-10-13T12:00:00Z');
    expect(retryAfterSeconds('Tue, 13 Oct 2026 12:00:30 GMT', now)).toBe(30);
    expect(retryAfterSeconds(null)).toBeUndefined();
    expect(retryAfterSeconds('soon')).toBeUndefined();
  });
  it('counts whole seconds down from the refusal to 0 and never below', () => {
    const at = 1_000_000;
    const until = retryUntil(18, at);
    expect(secondsLeft(until, at)).toBe(18);
    expect(secondsLeft(until, at + 100)).toBe(18);             // 17.9 s left reads 18, the way a clock does
    expect(secondsLeft(until, at + 1_000)).toBe(17);
    expect(secondsLeft(until, at + 17_999)).toBe(1);
    expect(secondsLeft(until, at + 18_000)).toBe(0);
    expect(secondsLeft(until, at + 60_000)).toBe(0);
  });
  it('no Retry-After falls back to the rolling minute, and nothing waits longer than it', () => {
    expect(secondsLeft(retryUntil(undefined, 0), 0)).toBe(RETRY_MAX_S);
    expect(secondsLeft(retryUntil(600, 0), 0)).toBe(RETRY_MAX_S);
    expect(secondsLeft(retryUntil(0, 0), 0)).toBe(1);
  });
});

describe('what the thrown Refused carries', () => {
  it('429 too_many_bids: the code and the Retry-After seconds', async () => {
    fake(429, { error: 'too_many_bids' }, { 'retry-after': '18' });
    const e = await server().bid(req).catch(x => x) as Refused;
    expect(e).toBeInstanceOf(Refused);
    expect(e).toMatchObject({ code: 'too_many_bids', status: 429, retryAfter: 18 });
    expect(e.open).toBeUndefined();
  });
  it('409 one_open_bid: the code and the body\'s open count', async () => {
    fake(409, { error: 'one_open_bid', open: 1 });
    const e = await server().bid(req).catch(x => x) as Refused;
    expect(e).toMatchObject({ code: 'one_open_bid', status: 409, open: 1 });
    expect(e.retryAfter).toBeUndefined();
  });
  it('every other refusal keeps its old shape: code and status, nothing more', async () => {
    fake(403, { error: 'win_cap', count: 4, cap: 4 });
    const e = await server().bid(req).catch(x => x) as Refused;
    expect(e).toMatchObject({ code: 'win_cap', status: 403 });
    expect('retryAfter' in e).toBe(false);
    expect('open' in e).toBe(false);
    fake(402, 'deposit first');
    expect(await server().bid(req).catch(x => x)).toMatchObject({ code: 'deposit', status: 402 });
  });
});
