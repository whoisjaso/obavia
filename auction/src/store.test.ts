import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* The store against a fake Worker: fetch is a spy that answers POST /me with a session and GET /lots with an
   empty lane. localStorage is a Map on globalThis (kv's web path); the seeded cars are stubbed out. */
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('expo-secure-store', () => ({ AFTER_FIRST_UNLOCK: 0, getItem: () => null, setItem: () => {} }));
vi.mock('./data/cars', () => ({ seedLots: () => [], cars: [], carFromLot: () => null }));

class MemoryStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
let ls: MemoryStorage;
type Call = { url: string; method: string; body: Record<string, unknown> | null; auth: string | null };
let calls: Call[];

function fakeWorker() {
  calls = [];
  globalThis.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url), method = init?.method ?? 'GET';
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url: u, method, body: init?.body ? JSON.parse(String(init.body)) : null, auth: headers.authorization ?? null });
    if (u.endsWith('/me') && method === 'POST') return new Response(JSON.stringify({ id: 'b-1', token: 't-1' }), { status: 200 });
    if (u.endsWith('/me')) return new Response(JSON.stringify({ id: 'b-1', winsLeft: 4, winsPerYear: 4, phone: null, phoneVerified: false }), { status: 200 });
    if (u.endsWith('/lots')) return new Response('[]', { status: 200 });
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
}

/** A fresh store (and nav) as the app loads them at launch. `worker`: with EXPO_PUBLIC_AUCTION_URL set. */
async function launch(worker: boolean) {
  vi.resetModules();
  if (worker) process.env.EXPO_PUBLIC_AUCTION_URL = 'https://lane.test'; else delete process.env.EXPO_PUBLIC_AUCTION_URL;
  const store = await import('./store');
  const nav = await import('./nav');
  return { store, nav };
}
const settle = () => new Promise(r => setTimeout(r, 0));
const signIns = () => calls.filter(c => c.method === 'POST' && c.url.endsWith('/me'));
let stop: (() => void) | undefined;

beforeEach(() => {
  ls = new MemoryStorage(); (globalThis as { localStorage?: unknown }).localStorage = ls;
  fakeWorker();
});
afterEach(() => {
  stop?.(); stop = undefined;
  delete (globalThis as { localStorage?: unknown }).localStorage;
  delete process.env.EXPO_PUBLIC_AUCTION_URL;
});

describe('sign-in sends no demo name', () => {
  it('first launch on the Worker: the state alone, no name', async () => {
    const { store } = await launch(true);
    const server = store.getServer() as unknown as { stop(): void };
    stop = () => server.stop();
    await settle(); await settle();
    const [first] = signIns();
    expect(first.body).toEqual({ state: 'TX' });
    expect(first.auth).toBeNull();
    expect(store.peekBuyer().name).toBeUndefined();
    expect(JSON.stringify(calls)).not.toMatch(/Marisol|Maximiliano/);
  });

  it('a later launch sends the stored id and still no name', async () => {
    ls.setItem('obavia.buyer', JSON.stringify({ id: 'b-1', token: 't-0' }));
    const { store } = await launch(true);
    const server = store.getServer() as unknown as { stop(): void };
    stop = () => server.stop();
    await settle(); await settle();
    expect(signIns()[0].body).toEqual({ id: 'b-1', state: 'TX' });
    expect(signIns()[0].auth).toBe('Bearer t-0');
  });

  it('signInProfile carries a name only once one was saved', async () => {
    const { store } = await launch(true);
    expect(store.signInProfile()).toEqual({ state: 'TX' });
    store.saveProfile({ address: '2210 Elm St' });
    expect(store.signInProfile()).toEqual({ state: 'TX', address: '2210 Elm St' });
    expect(store.signInProfile().name).toBeUndefined();
  });

  it('the fixture name lives on the local stand-in only', async () => {
    expect((await launch(false)).store.peekBuyer().name).toBe('Marisol Treviño');
    expect((await launch(true)).store.peekBuyer().name).toBeUndefined();
  });
});

describe('the name, saved on Me or from the licence read', () => {
  it('Save keeps it trimmed, on the buyer and in kv, and the next sign-in sends it', async () => {
    const { store } = await launch(true);
    expect(store.saveName('  Ana   Ruiz ')).toBe(true);
    expect(store.peekBuyer().name).toBe('Ana Ruiz');
    expect(JSON.parse(ls.getItem('obavia.profile')!)).toEqual({ name: 'Ana Ruiz' });
    expect(store.signInProfile()).toEqual({ state: 'TX', name: 'Ana Ruiz' });
    // the next launch starts with it, and the Worker hears it at sign-in
    const again = await launch(true);
    expect(again.store.peekBuyer().name).toBe('Ana Ruiz');
    const server = again.store.getServer() as unknown as { stop(): void };
    stop = () => server.stop();
    await settle(); await settle();
    expect(signIns()[0].body).toEqual({ state: 'TX', name: 'Ana Ruiz' });
  });

  it('an empty name saves nothing and sends nothing', async () => {
    const { store } = await launch(true);
    expect(store.saveName('   ')).toBe(false);
    expect(ls.getItem('obavia.profile')).toBeNull();
    expect(store.peekBuyer().name).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it('signed in, Save sends the name to the Worker with the id and token', async () => {
    ls.setItem('obavia.buyer', JSON.stringify({ id: 'b-1', token: 't-0' }));
    const { store } = await launch(true);
    const server = store.getServer() as unknown as { stop(): void };
    stop = () => server.stop();
    await settle(); await settle();
    calls.length = 0;
    store.saveName('Ana Ruiz');
    await settle();
    expect(signIns()).toHaveLength(1);
    expect(signIns()[0].body).toEqual({ id: 'b-1', name: 'Ana Ruiz' });
    expect(signIns()[0].auth).toBe('Bearer t-1');
  });

  it('the licence read saves the name through saveProfile the same way', async () => {
    const { store } = await launch(true);
    store.saveProfile({ name: 'Ana Ruiz', address: '2210 Elm St' });
    expect(store.peekBuyer().name).toBe('Ana Ruiz');
    expect(store.signInProfile()).toEqual({ state: 'TX', name: 'Ana Ruiz', address: '2210 Elm St' });
  });
});

describe('lastOpened', () => {
  it('a push intent is kept in kv with its screen and lot', async () => {
    const { store, nav } = await launch(false);
    nav.go({ screen: 'won', lotId: 'altima' });
    const o = store.lastOpened()!;
    expect(o).toMatchObject({ screen: 'won', lotId: 'altima', push: true });
    expect(JSON.parse(ls.getItem('obavia.opened')!)).toMatchObject({ screen: 'won', lotId: 'altima' });
    expect(store.reopenIntent(o, o.at + 60_000)).toEqual({ screen: 'won', lotId: 'altima' });
  });

  it('reopens once on the push screen at the next launch, then the lane', async () => {
    ls.setItem('obavia.opened', JSON.stringify({ at: Date.now() - 60_000, screen: 'pickup', lotId: 'fusion', push: true }));
    const first = await launch(false);
    first.store.getServer();
    expect(first.nav.peekIntent()).toEqual({ screen: 'pickup', lotId: 'fusion' });
    expect(first.store.lastOpened()!.push).toBeUndefined();
    const second = await launch(false);
    second.store.getServer();
    expect(second.nav.peekIntent()).toBeNull();
  });

  it('a push older than a day, or a screen opened by hand, does not reopen', async () => {
    const { store } = await launch(false);
    const now = Date.now();
    expect(store.reopenIntent({ at: now - 25 * 3_600_000, screen: 'won', lotId: 'a', push: true }, now)).toBeNull();
    store.markOpened('me');
    expect(store.reopenIntent(store.lastOpened(), now)).toBeNull();
    expect(store.reopenIntent(null, now)).toBeNull();
  });

  it('back after a day reads the kept time', async () => {
    const { store } = await launch(true);
    expect(store.backAfterADay()).toBe(false);   // no record on the Worker: no welcome back
    ls.setItem('obavia.opened', JSON.stringify({ at: Date.now() - 26 * 3_600_000, screen: 'me' }));
    expect(store.backAfterADay()).toBe(true);
    store.markOpened('me');
    expect(store.backAfterADay()).toBe(false);
    ls.setItem('obavia.opened', '{"at":"x","screen":"nowhere"}');
    expect(store.lastOpened()).toBeNull();
  });
});

describe('one car until the first is paid (sim 03)', () => {
  const lot = (id: string, more: Record<string, unknown> = {}) => ({ id, start: 1000, retail: 9000, opensAt: 0, closesAt: 9e12, high: 5000, bids: 1, watching: 0, ...more });

  it('GET /me puts openBids and paidCars on the buyer, and leaves them off when the Worker says nothing', async () => {
    ls.setItem('obavia.buyer', JSON.stringify({ id: 'b-1', token: 't-0' }));
    const { store } = await launch(true);
    const server = store.getServer() as unknown as { stop(): void };
    stop = () => server.stop();
    await settle(); await settle();
    expect(store.peekBuyer().openBids).toBeUndefined();
    expect(store.peekBuyer().paidCars).toBeUndefined();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ id: 'b-1', winsLeft: 3, openBids: 1, paidCars: 0 }), { status: 200 })) as typeof fetch;
    await store.refreshMe();
    expect(store.peekBuyer()).toMatchObject({ winsLeft: 3, openBids: 1, paidCars: 0 });
  });

  it('heldLot: the open lot I lead first, else the sale I owe, never the lot being bid on, null when unknown', async () => {
    const { store } = await launch(false);
    const me = store.ME;
    const open = lot('altima', { leader: me });
    const owed = lot('fusion', { closed: { at: 1, sold: true }, sale: { buyer: me, hammer: 3500, wonAt: 1, deadlineAt: 2 } });
    const paid = lot('sonata', { closed: { at: 1, sold: true }, sale: { buyer: me, hammer: 3500, wonAt: 1, deadlineAt: 2, paidAt: 3 } });
    expect(store.heldLot([paid, owed, open], me)).toMatchObject({ lot: { id: 'altima' }, screen: 'lane' });
    expect(store.heldLot([paid, owed, open], me, 'altima')).toMatchObject({ lot: { id: 'fusion' }, screen: 'won' });
    expect(store.heldLot([paid, open], me, 'altima')).toBeNull();
    expect(store.heldLot([lot('altima', { leader: 'r3' })], me)).toBeNull();
    expect(store.heldLot([lot('altima', { leader: me, closed: { at: 1, sold: true } })], me)).toBeNull();   // closed, no sale yet: nothing to open
  });

  it('lotName: the model the Desk wrote, else the seeded car, else nothing', async () => {
    const { store } = await launch(false);
    expect(store.lotName(lot('x', { car: { model: 'Tacoma' } }))).toBe('Tacoma');
    expect(store.lotName(lot('x'))).toBeUndefined();   // the seeded cars are stubbed out here
  });

  it('localOpen counts the open lots I lead other than the one bid on', async () => {
    const { store } = await launch(false);
    const me = store.ME;
    const lots = [lot('altima', { leader: me }), lot('fusion', { leader: 'r5' }), lot('sonata', { leader: me, closed: { at: 1, sold: true } })];
    expect(store.localOpen(lots)).toBe(1);
    expect(store.localOpen(lots, 'altima')).toBe(0);
  });
});
