import { describe, expect, it } from 'vitest';
import { MetaConnect, type ConnectStore } from './connect';
import type { Account } from './types';

const SECRET = 's'.repeat(32);
const app = { appId: '42', appSecret: 'shh', redirectUri: 'https://api.example.test/oauth/meta', configId: 'cfg1' };
const store = () => {
  const s = { accounts: [] as [string, Account][], stash: new Map<string, unknown[]>() };
  const c: ConnectStore = {
    async connect(d, a) { s.accounts.push([d, a]); },
    async stashPages(d, p) { s.stash.set(d, p); },
    async takePages(d) { const p = s.stash.get(d) ?? []; s.stash.delete(d); return p as never; },
  };
  return { s, c };
};
const meta = (pages: unknown[]) => {
  const calls: string[] = [];
  const f = (async (url: string) => {
    calls.push(url);
    if (url.includes('oauth/access_token') && url.includes('code=')) return new Response(JSON.stringify({ access_token: 'short' }));
    if (url.includes('fb_exchange_token')) return new Response(JSON.stringify({ access_token: 'long' }));
    return new Response(JSON.stringify({ data: pages }));
  }) as unknown as typeof fetch;
  return { calls, f };
};
const PAGE = { id: '111', name: 'Example Motors', access_token: 'page-tok', instagram_business_account: { id: '999', username: 'examplemotors' } };

describe('Connect Facebook', () => {
  it('the Connect button opens Facebook Login for Business with a signed state', async () => {
    const url = new URL(await new MetaConnect(app, SECRET, store().c).startUrl('P123456'));
    expect(url.origin + url.pathname).toBe('https://www.facebook.com/v26.0/dialog/oauth');
    expect(url.searchParams.get('config_id')).toBe('cfg1');
    expect(url.searchParams.get('redirect_uri')).toBe(app.redirectUri);
    expect(url.searchParams.get('client_secret')).toBeNull();
  });

  it('one Page: exchanged for a long-lived token, Facebook and Instagram connected on the spot', async () => {
    const { s, c } = store(), { calls, f } = meta([PAGE]);
    const m = new MetaConnect(app, SECRET, c, f);
    const state = new URL(await m.startUrl('P123456')).searchParams.get('state')!;
    const r = await m.finish(new URLSearchParams({ code: 'abc', state }));
    expect(r).toMatchObject({ ok: true, licence: 'P123456', connected: { pageId: '111', name: 'Example Motors', igUsername: 'examplemotors' } });
    expect(JSON.stringify(r)).not.toContain('page-tok');
    expect(calls[1]).toContain('grant_type=fb_exchange_token');
    expect(calls[2]).toContain('access_token=long');
    expect(s.accounts.map(([d, a]) => [d, a.channel, a.token])).toEqual([['P123456', 'facebook-page', 'page-tok'], ['P123456', 'instagram', 'page-tok']]);
  });

  it('several Pages: asks which, then connects the one chosen', async () => {
    const { s, c } = store(), { f } = meta([PAGE, { id: '222', name: 'Other Page', access_token: 't2' }]);
    const m = new MetaConnect(app, SECRET, c, f);
    const state = new URL(await m.startUrl('P123456')).searchParams.get('state')!;
    const r = await m.finish(new URLSearchParams({ code: 'abc', state }));
    expect(r.ok && r.choose?.map(p => p.name)).toEqual(['Example Motors', 'Other Page']);
    expect(s.accounts).toHaveLength(0);
    expect(await m.choose('P123456', '222')).toMatchObject({ name: 'Other Page' });
    expect(s.accounts.map(([, a]) => a.channel)).toEqual(['facebook-page']);
    expect(await m.choose('P123456', '222')).toBeNull();   // used once
  });

  it('a forged, stale or cancelled login connects nothing', async () => {
    const { s, c } = store(), { f } = meta([PAGE]);
    let t = new Date('2026-10-02T12:00:00Z');
    const m = new MetaConnect(app, SECRET, c, f, () => t);
    const state = new URL(await m.startUrl('P123456')).searchParams.get('state')!;
    expect(await m.finish(new URLSearchParams({ code: 'x', state: state.replace(/.$/, 'A') }))).toMatchObject({ ok: false, reason: 'bad_state' });
    expect(await m.finish(new URLSearchParams({ error: 'access_denied', state }))).toMatchObject({ ok: false, reason: 'denied' });
    t = new Date('2026-10-02T12:20:00Z');
    expect(await m.finish(new URLSearchParams({ code: 'x', state }))).toMatchObject({ ok: false, reason: 'expired' });
    expect(s.accounts).toHaveLength(0);
  });

  it('no Pages managed: says so', async () => {
    const { c } = store(), { f } = meta([]);
    const m = new MetaConnect(app, SECRET, c, f);
    const state = new URL(await m.startUrl('P1')).searchParams.get('state')!;
    expect(await m.finish(new URLSearchParams({ code: 'x', state }))).toMatchObject({ ok: false, reason: 'no_pages' });
  });
});
