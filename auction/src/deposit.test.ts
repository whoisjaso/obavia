import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* deposit.ts against a fake Worker. The store is mocked (a token, the deposit flag, rotation counted); the in-app
   browser is a spy, so the test can say whether it opened. */
const store = vi.hoisted(() => ({ once: { deposit: false, sawRefill: false, licence: null as null }, rotations: 0 }));
vi.mock('./store', () => ({
  AUCTION_URL: 'https://w.test',
  buyerToken: () => 't-1',
  once: store.once,
  rotateToken: async () => { store.rotations += 1; return true; },
}));
const browser = vi.hoisted(() => ({ opened: [] as string[], result: { type: 'success', url: 'obavia://deposit?payment_id=pay_9' } as { type: string; url?: string } }));
vi.mock('expo-web-browser', () => ({ openAuthSessionAsync: async (url: string) => { browser.opened.push(url); return browser.result; } }));
vi.mock('expo-linking', () => ({ parse: (u: string) => ({ queryParams: Object.fromEntries(new URL(u.replace(/^obavia:\/\//, 'https://x/')).searchParams) }) }));

import { readCheckout, takeDeposit } from './deposit';

type Call = { url: string; method: string; body: Record<string, unknown> | null };
let calls: Call[];
let answers: { checkout: () => Response; me: () => Response; deposit?: () => Response };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

beforeEach(() => {
  calls = []; browser.opened = []; store.once.deposit = false; store.rotations = 0;
  answers = { checkout: () => json({ deposit: 'captured', dev: true }), me: () => json({ id: 'b-1', deposit_status: 'captured' }) };
  globalThis.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url), method = init?.method ?? 'GET';
    calls.push({ url: u, method, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (u.endsWith('/me/deposit/checkout')) return answers.checkout();
    if (u.endsWith('/me/deposit')) return (answers.deposit ?? (() => json({ deposit: 'captured' })))();
    if (u.endsWith('/me')) return answers.me();
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
});
afterEach(() => { vi.restoreAllMocks(); });

describe('readCheckout (pure)', () => {
  it('a checkout is an id and an https URL; the DEV capture is exactly { deposit: captured, dev: true }', () => {
    expect(readCheckout({ checkoutId: 'ch_1', url: 'https://whop.com/checkout/ch_1' })).toEqual({ kind: 'checkout', checkoutId: 'ch_1', url: 'https://whop.com/checkout/ch_1' });
    expect(readCheckout({ deposit: 'captured', dev: true })).toEqual({ kind: 'captured', dev: true });
  });
  it('anything else is nothing usable: no URL, a captured without dev, a URL that is not http, a bare string', () => {
    expect(readCheckout({ checkoutId: 'ch_1' })).toBeNull();
    expect(readCheckout({ deposit: 'captured' })).toBeNull();          // a deployed Worker never says this; the phone does not invent a capture
    expect(readCheckout({ deposit: 'captured', dev: 'yes' })).toBeNull();
    expect(readCheckout({ checkoutId: 'ch_1', url: 'javascript:alert(1)' })).toBeNull();
    expect(readCheckout('captured')).toBeNull(); expect(readCheckout(null)).toBeNull(); expect(readCheckout({})).toBeNull();
  });
});

describe('takeDeposit', () => {
  it('the DEV capture: no browser, the Worker read says captured, the flag is set, the token rotates once', async () => {
    expect(await takeDeposit()).toBe('captured');
    expect(browser.opened).toEqual([]);
    expect(calls.map(c => `${c.method} ${c.url}`)).toEqual(['POST https://w.test/me/deposit/checkout', 'GET https://w.test/me']);
    expect(calls[0].body).toEqual({ redirectUrl: 'obavia://deposit' });
    expect(store.once.deposit).toBe(true); expect(store.rotations).toBe(1);
  });
  it('a Whop checkout: the browser opens the URL, the payment id on the return goes to the Worker, then the same read decides', async () => {
    answers.checkout = () => json({ checkoutId: 'ch_1', url: 'https://whop.com/checkout/ch_1' });
    expect(await takeDeposit()).toBe('captured');
    expect(browser.opened).toEqual(['https://whop.com/checkout/ch_1']);
    expect(calls.map(c => `${c.method} ${c.url}`)).toEqual(['POST https://w.test/me/deposit/checkout', 'POST https://w.test/me/deposit', 'GET https://w.test/me']);
    expect(calls[1].body).toEqual({ paymentId: 'pay_9' });
    expect(store.once.deposit).toBe(true); expect(store.rotations).toBe(1);
  });
  it('503 payments not configured (a deployed Worker without Whop): failed, no browser, the flag stays down', async () => {
    answers.checkout = () => new Response('payments not configured', { status: 503 });
    expect(await takeDeposit()).toBe('failed');
    expect(browser.opened).toEqual([]); expect(store.once.deposit).toBe(false); expect(store.rotations).toBe(0);
    expect(calls).toHaveLength(1);
  });
  it('a DEV answer the Worker read does not confirm is failed, never captured on the phone\'s own word', async () => {
    answers.me = () => json({ id: 'b-1', deposit_status: 'none' });
    expect(await takeDeposit()).toBe('failed');
    expect(store.once.deposit).toBe(false); expect(store.rotations).toBe(0);
  }, 20_000);
});
