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

  it("That's me, signed in: the licence's name and street go to the Worker in one sign-in, and a later name alone keeps the street", async () => {
    ls.setItem('obavia.buyer', JSON.stringify({ id: 'b-1', token: 't-0' }));
    const { store } = await launch(true);
    const server = store.getServer() as unknown as { stop(): void };
    stop = () => server.stop();
    await settle(); await settle();
    calls.length = 0;
    store.saveProfile({ name: 'Ana Ruiz', address: '2210 Elm St' });   // Scan.tsx thatsMe: one save, both facts
    await settle();
    expect(signIns()).toHaveLength(1);
    expect(signIns()[0].body).toEqual({ id: 'b-1', name: 'Ana Ruiz', address: '2210 Elm St' });
    expect(store.peekBuyer().name).toBe('Ana Ruiz');
    // the buyer corrects the name on Me: the street already given is not lost
    store.saveName('Ana Ruiz Pérez');
    await settle();
    expect(signIns()).toHaveLength(2);
    expect(signIns()[1].body).toEqual({ id: 'b-1', name: 'Ana Ruiz Pérez', address: '2210 Elm St' });
  });

  it('nothing real to give saves nothing: the local fixture name never reaches the profile', async () => {
    // Scan.tsx thatsMe gives saveProfile only a name or street that is the card's or the buyer's own; with
    // neither it does not call it. Here: the call it would make with an empty name and no street.
    const { store } = await launch(false);
    store.saveProfile({ name: '', address: '' });
    expect(ls.getItem('obavia.profile')).toBe('{}');
    expect(store.signInProfile()).toEqual({ state: 'TX' });
    expect(store.peekBuyer().name).toBe('Marisol Treviño');   // the stand-in's demo name on the glass, not in kv
  });
});

describe('where the $250 stands (Me, the deposit line)', () => {
  it('the Worker\'s deposit_status becomes the phone\'s word', async () => {
    const { depositStanding } = await import('./depositLine');
    expect(depositStanding('captured')).toBe('held');
    expect(depositStanding('applied')).toBe('applied');
    expect(depositStanding('refunded')).toBe('released');
    expect(depositStanding('forfeited')).toBe('forfeited');
    expect(depositStanding('disputed')).toBe('disputed');
    expect(depositStanding('none')).toBe('none');
    expect(depositStanding(undefined)).toBe('none');
    expect(depositStanding('something_new')).toBe('none');
  });

  it('the words per standing: four or fewer, the car apart in its own slot, Get it back only while held', async () => {
    const { depositLine } = await import('./depositLine');
    expect(depositLine('none')).toEqual({ words: 'held at your first bid', back: false });
    expect(depositLine('held')).toEqual({ words: 'held · back if you lose', back: true });
    expect(depositLine('applied', 'Accord LX')).toEqual({ words: 'went to your', name: 'Accord LX', back: false });
    expect(depositLine('applied')).toEqual({ words: 'went to your car', back: false });
    expect(depositLine('released')).toEqual({ words: 'sent back', back: false });
    expect(depositLine('forfeited', 'Altima')).toEqual({ words: 'forfeited', name: 'Altima', back: false });
    expect(depositLine('forfeited')).toEqual({ words: 'forfeited', back: false });
    expect(depositLine('disputed')).toEqual({ words: 'disputed', back: false });
    // the new lines hold the four-word ceiling (DOCTRINE §4 rule 7); held is the kept deposit line the Bid sheet
    // already says (tools/walkthrough/reads.mjs DEPOSIT_LINE), left as it was
    for (const s of ['applied', 'released', 'forfeited', 'disputed'] as const) {
      const l = depositLine(s, 'Accord LX');
      expect(l.words.split(/\s+/).filter(w => /\p{L}/u.test(w)).length).toBeLessThanOrEqual(4);
    }
    for (const s of ['none', 'held', 'applied', 'released', 'forfeited', 'disputed'] as const) expect(depositLine(s, 'Accord LX').words).not.toMatch(/[\u2013\u2014]/);
  });

  it('GET /me puts the standing on the buyer and keeps once.deposit as the bid path\'s flag', async () => {
    ls.setItem('obavia.buyer', JSON.stringify({ id: 'b-1', token: 't-0' }));
    const { store } = await launch(true);
    const server = store.getServer() as unknown as { stop(): void };
    stop = () => server.stop();
    await settle(); await settle();
    expect(store.peekBuyer().deposit).toBe('none');   // the fake Worker's GET /me carries no deposit_status
    const answer = (deposit_status: string) => { globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ id: 'b-1', deposit_status }), { status: 200 })) as typeof fetch; };
    answer('captured'); await store.refreshMe();
    expect(store.peekBuyer().deposit).toBe('held'); expect(store.once.deposit).toBe(true);
    answer('applied'); await store.refreshMe();
    expect(store.peekBuyer().deposit).toBe('applied'); expect(store.once.deposit).toBe(false);
    answer('refunded'); await store.refreshMe();
    expect(store.peekBuyer().deposit).toBe('released'); expect(store.once.deposit).toBe(false);
    answer('forfeited'); await store.refreshMe();
    expect(store.peekBuyer().deposit).toBe('forfeited'); expect(store.once.deposit).toBe(false);
    answer('disputed'); await store.refreshMe();
    expect(store.peekBuyer().deposit).toBe('disputed'); expect(store.once.deposit).toBe(false);
  });

  it('the local stand-in never sets it: Me reads once.deposit and its own sale', async () => {
    const { store } = await launch(false);
    expect(store.peekBuyer().deposit).toBeUndefined();
    await store.refreshMe();
    expect(store.peekBuyer().deposit).toBeUndefined();
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

describe('recovery by phone: a proved number on a new install (W3-B /me/recover)', () => {
  it('on the Worker: the recovery code proves the old buyer, the phone adopts its id and fresh token, and reads GET /me', async () => {
    ls.setItem('obavia.buyer', JSON.stringify({ id: 'b-1', token: 't-0' }));   // this install's own buyer, signed in as t-1
    const { store } = await launch(true);
    const server = store.getServer() as unknown as { stop(): void };
    stop = () => server.stop();
    await settle(); await settle();
    globalThis.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url), method = init?.method ?? 'GET';
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({ url: u, method, body: init?.body ? JSON.parse(String(init.body)) : null, auth: headers.authorization ?? null });
      if (u.endsWith('/me/phone/verify')) return new Response(JSON.stringify({ error: 'phone_in_use' }), { status: 409 });
      if (u.endsWith('/me/recover')) return new Response(JSON.stringify({ sent: true, phone: '(•••) •••-0142' }), { status: 200 });
      if (u.endsWith('/me/recover/verify')) return new Response(JSON.stringify({ id: 'b-old', token: 't-old.2', phone: '(•••) •••-0142' }), { status: 200 });
      if (u.endsWith('/me')) return new Response(JSON.stringify({ id: 'b-old', winsLeft: 3, winsPerYear: 4, phone: '(•••) •••-0142', phoneVerified: true, deposit_status: 'captured' }), { status: 200 });
      return new Response('{}', { status: 404 });
    }) as typeof fetch;
    calls.length = 0;
    expect(await store.verifyPhoneCode('000000')).toEqual({ ok: false, code: 'phone_in_use' });
    expect(store.peekBuyer().phoneVerified).not.toBe(true);
    expect(await store.recoverByPhone('+12145550142')).toEqual({ ok: true, phone: '(•••) •••-0142' });
    const r = await store.verifyRecovery('000000');
    expect(r).toMatchObject({ ok: true, session: { id: 'b-old', token: 't-old.2' } });
    expect(store.ME).toBe('b-old');
    expect(store.buyerToken()).toBe('t-old.2');
    expect(JSON.parse(ls.getItem('obavia.buyer')!)).toEqual({ id: 'b-old', token: 't-old.2' });
    expect(store.peekBuyer()).toMatchObject({ lost: false, phoneVerified: true, phone: '(•••) •••-0142', winsLeft: 3, deposit: 'held' });
    const recover = calls.filter(c => c.url.endsWith('/me/recover'));
    expect(recover[0]).toMatchObject({ method: 'POST', body: { phone: '+12145550142' }, auth: null });   // the number is the claim, no Bearer
    const verify = calls.filter(c => c.url.endsWith('/me/recover/verify'));
    expect(verify[0]).toMatchObject({ method: 'POST', body: { phone: '+12145550142', code: '000000' }, auth: null });
    expect(calls.filter(c => c.method === 'GET' && c.url.endsWith('/me')).at(-1)?.auth).toBe('Bearer t-old.2');
    expect(calls.filter(c => JSON.stringify(c).includes('2145550142')).map(c => c.url.replace(/^.*\/me/, '/me'))).toEqual(['/me/recover', '/me/recover/verify']);   // the number goes in those two bodies, nowhere else
  });

  it('a wrong recovery code moves nothing', async () => {
    ls.setItem('obavia.buyer', JSON.stringify({ id: 'b-1', token: 't-0' }));
    const { store } = await launch(true);
    const server = store.getServer() as unknown as { stop(): void };
    stop = () => server.stop();
    await settle(); await settle();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'wrong_code' }), { status: 400 })) as typeof fetch;
    expect(await store.verifyRecovery('111111')).toEqual({ ok: false, code: 'code_expired' });   // no recovery asked on this launch: nothing is sent
    expect(await store.recoverByPhone('+12145550142')).toMatchObject({ ok: false, code: 'wrong_code' });   // the fake answers everything with that
    expect(await store.verifyRecovery('111111')).toEqual({ ok: false, code: 'wrong_code' });
    expect(store.ME).toBe('b-1');
    expect(JSON.parse(ls.getItem('obavia.buyer')!)).toEqual({ id: 'b-1', token: 't-1' });
  });

  it('the local stand-in plays it: ?recover=1 makes the first code another install\'s, then New phone and 000000 prove it', async () => {
    (globalThis as { location?: unknown }).location = { search: '?recover=1' };
    try {
      const { store } = await launch(false);
      expect(await store.sendPhoneCode('+12145550142')).toEqual({ ok: true, phone: '(•••) •••-0142' });
      expect(await store.verifyPhoneCode('000000')).toEqual({ ok: false, code: 'phone_in_use' });
      expect(store.peekBuyer().phoneVerified).not.toBe(true);
      expect(await store.verifyRecovery('000000')).toEqual({ ok: false, code: 'code_expired' });   // no recovery asked yet
      expect(await store.recoverByPhone('+12145550142')).toEqual({ ok: true, phone: '(•••) •••-0142' });
      expect(await store.verifyRecovery('123456')).toEqual({ ok: false, code: 'wrong_code' });
      expect(await store.verifyRecovery('000000')).toMatchObject({ ok: true, phone: '(•••) •••-0142' });
      expect(store.peekBuyer()).toMatchObject({ phoneVerified: true, phone: '(•••) •••-0142', lost: false });
    } finally { delete (globalThis as { location?: unknown }).location; }
  });
});

describe('the lane link, the second chance and the Wallet pass on the stand-in', () => {
  it('laneLink is the site\'s lane path with the lot id', async () => {
    const { store } = await launch(false);
    expect(store.laneLink('altima')).toBe('https://obavia.co/lane/altima');
    expect(store.laneLink('lot 9')).toBe('https://obavia.co/lane/lot%209');
  });

  it('with no offer on the lot, Take it is refused as offer_expired; the pass is null without a sale', async () => {
    const { store } = await launch(false);
    expect(await store.acceptOffer('nowhere')).toEqual({ ok: false, code: 'offer_expired' });
    expect(await store.walletPassUrl('nowhere')).toBeNull();
  });
});

/* ---- W4-B: the referral claim, the share link, the clause gate ---- */
describe('referral (W4-B): the link\'s code, kept until the phone is proved, claimed once', () => {
  const withSearch = async (search: string, f: () => Promise<void>) => {
    (globalThis as { location?: unknown }).location = { search };
    try { await f(); } finally { delete (globalThis as { location?: unknown }).location; }
  };

  it('a cold open with ?r= keeps the code; the share link carries the buyer\'s own code, not the one received', async () => {
    await withSearch('?r=abcd1234', async () => {
      const { store } = await launch(false);
      store.getServer();
      expect(ls.getItem('obavia.referral')).toBe('ABCD1234');
      expect(store.shareLink('altima')).toBe('https://obavia.co/lane/altima?r=MARISOL7');   // the stand-in's fixture code
      expect(store.shareLink('altima', null)).toBe('https://obavia.co/lane/altima');   // no code from the Worker: the plain link
    });
  });

  it('nothing is claimed before the phone code lands; then once; the stand-in answers already_claimed after', async () => {
    await withSearch('?r=abcd1234', async () => {
      const { store } = await launch(false);
      store.getServer();
      expect(await store.claimReferral()).toBe('later');
      expect(ls.getItem('obavia.referral')).toBe('ABCD1234');
      await store.sendPhoneCode('+12145550142');
      expect((await store.verifyPhoneCode('000000')).ok).toBe(true);
      await settle();
      expect(ls.getItem('obavia.referral')).toBeNull();   // claimed on the proof, and forgotten
      expect(await store.claimReferral()).toBe('none');
    });
  });

  it('on the Worker: POST /me/referral/claim with the code after the proof; 409 already_claimed forgets it; the network keeps it', async () => {
    let claimStatus = 0;
    const base = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/me/referral/claim')) {
        calls.push({ url: u, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null, auth: ((init?.headers ?? {}) as Record<string, string>).authorization ?? null });
        if (claimStatus === 0) throw new TypeError('network');
        return new Response(claimStatus === 200 ? '{}' : JSON.stringify({ error: 'already_claimed' }), { status: claimStatus });
      }
      if (u.endsWith('/me/phone/verify')) return new Response(JSON.stringify({ verified: true, phone: '(•••) •••-0142' }), { status: 200 });
      return base(url, init);
    }) as typeof fetch;
    await withSearch('?r=abcd1234', async () => {
      const { store } = await launch(true);
      const server = store.getServer() as unknown as { stop(): void };
      stop = () => server.stop();
      await settle(); await settle();
      expect(calls.filter(c => c.url.endsWith('/me/referral/claim'))).toHaveLength(0);   // not before the number is proved
      expect(await store.verifyPhoneCode('000000')).toEqual({ ok: true, phone: '(•••) •••-0142' });
      await settle(); await settle();
      const first = calls.filter(c => c.url.endsWith('/me/referral/claim'));
      expect(first).toHaveLength(1);
      expect(first[0]).toMatchObject({ method: 'POST', body: { code: 'ABCD1234' }, auth: 'Bearer t-1' });
      expect(ls.getItem('obavia.referral')).toBe('ABCD1234');   // the network lost it: kept for the next time
      claimStatus = 409;
      expect(await store.claimReferral()).toBe('already_claimed');
      expect(ls.getItem('obavia.referral')).toBeNull();   // the Worker's final word: forgotten
      expect(await store.claimReferral()).toBe('none');
      expect(calls.filter(c => c.url.endsWith('/me/referral/claim'))).toHaveLength(2);
    });
  });

  it('GET /me puts the code and the count on the buyer; a link\'s code never becomes the buyer\'s own', async () => {
    const base = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/me') && (init?.method ?? 'GET') === 'GET') return new Response(JSON.stringify({ id: 'b-1', winsLeft: 4, phoneVerified: false, referralCode: 'B1X7K2', referred: 3 }), { status: 200 });
      return base(url, init);
    }) as typeof fetch;
    await withSearch('?r=zzzz9999', async () => {
      const { store } = await launch(true);
      const server = store.getServer() as unknown as { stop(): void };
      stop = () => server.stop();
      await settle(); await settle();
      expect(store.peekBuyer()).toMatchObject({ referralCode: 'B1X7K2', referred: 3 });
      expect(store.shareLink('altima')).toBe('https://obavia.co/lane/altima?r=B1X7K2');
      expect(ls.getItem('obavia.referral')).toBe('ZZZZ9999');
    });
  });
});

describe('the clause (W4-B, D13): behind its flag, once, before the terms; a 409 brings it back', () => {
  it('off: no clause, the stand-in\'s bid never asks for one', async () => {
    const { store } = await launch(false);
    store.getServer();
    await settle();
    expect(store.clauseNeeded()).toBeNull();
  });

  it('?clause=1: the bid is refused clause_required until Agree; agreed, the version is kept and the bid goes on', async () => {
    (globalThis as { location?: unknown }).location = { search: '?clause=1' };
    // one open lot on the stand-in, so the bid after Agree has somewhere to land
    vi.doMock('./data/cars', () => ({ seedLots: () => [{ id: 'sonata', start: 3400, retail: 6495, opensAt: Date.now() - 1000, closesAt: Date.now() + 86_400_000, high: 3400, bids: 0, watching: 0 }], cars: [], carFromLot: () => null }));
    try {
      const { store } = await launch(false);
      const server = store.getServer();
      await settle();
      const clause = store.clauseNeeded();
      expect(clause).toMatchObject({ version: 'draft-2026-10-13', requiresScrollToEnd: true });
      expect(clause!.text).toMatch(/^Draft\./);   // the words are counsel's; until then the text says it is a draft
      expect(clause!.text).not.toMatch(/[\u2013\u2014]/);
      await store.sendPhoneCode('+12145550142'); await store.verifyPhoneCode('000000');
      const req = { lotId: 'sonata', bidder: 'me', amount: 3400, max: 3400, key: 'k1', terms: '2026-10-13' };
      await expect(server.bid(req)).rejects.toMatchObject({ code: 'clause_required', status: 409 });
      expect(await store.acceptClause(clause!.version)).toBe(true);
      expect(ls.getItem('obavia.clause')).toBe('draft-2026-10-13');
      expect(store.clauseNeeded()).toBeNull();
      expect((await server.bid({ ...req, key: 'k2' })).ok).toBe(true);
      // the Worker's 409 (a lost record, new words): the page is due again
      await store.clauseRequired();
      expect(store.clauseNeeded()).toMatchObject({ version: 'draft-2026-10-13' });
    } finally {
      delete (globalThis as { location?: unknown }).location;
      vi.doMock('./data/cars', () => ({ seedLots: () => [], cars: [], carFromLot: () => null }));
    }
  });

  it('on the Worker: GET /terms at launch, POST /me/clause { version } on Agree, and a failed POST keeps the page due', async () => {
    let post = 200;
    const base = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url), method = init?.method ?? 'GET';
      if (u.endsWith('/terms')) return new Response(JSON.stringify({ clause: { version: 'v2', text: 'Words.', requiresScrollToEnd: true } }), { status: 200 });
      if (u.endsWith('/me/clause')) { calls.push({ url: u, method, body: JSON.parse(String(init?.body)), auth: ((init?.headers ?? {}) as Record<string, string>).authorization ?? null }); return new Response('{}', { status: post }); }
      return base(url, init);
    }) as typeof fetch;
    const { store } = await launch(true);
    const server = store.getServer() as unknown as { stop(): void };
    stop = () => server.stop();
    await settle(); await settle();
    expect(store.clauseNeeded()).toMatchObject({ version: 'v2', text: 'Words.' });
    post = 500;
    expect(await store.acceptClause('v2')).toBe(false);
    expect(store.clauseNeeded()).toMatchObject({ version: 'v2' });
    post = 200;
    expect(await store.acceptClause('v2')).toBe(true);
    expect(calls.filter(c => c.url.endsWith('/me/clause')).at(-1)).toMatchObject({ method: 'POST', body: { version: 'v2' }, auth: 'Bearer t-1' });
    expect(store.clauseNeeded()).toBeNull();
    // the next launch holds the version: the page does not return on its own
    const again = await launch(true);
    const s2 = again.store.getServer() as unknown as { stop(): void };
    await settle(); await settle();
    expect(again.store.clauseNeeded()).toBeNull();
    s2.stop();
  });
});
