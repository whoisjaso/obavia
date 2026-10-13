/* Connect Facebook and Instagram: one tap for the dealer.

   The dealer taps Connect, Facebook's own login opens (Facebook Login for
   Business, with Obavia's configuration), they tap Continue and choose their
   Page. Nothing to copy, no ids, no developer tools. Behind it:
     1. the login returns a one-time code to /oauth/meta;
     2. the code becomes a user token, then a long-lived one (server side,
        with the app secret, which never leaves the Worker);
     3. /me/accounts lists the Pages they manage, each with a Page token
        that does not expire, and the Instagram business account linked;
     4. one Page: connected on the spot. Several: the Desk asks "Which Page?"
   Tokens are sealed before they are stored (D1PostStore). The signed state
   ties the login to the dealer who started it and expires in 15 minutes. */
import type { Account } from './types';

const GRAPH = 'https://graph.facebook.com/v26.0';
const DIALOG = 'https://www.facebook.com/v26.0/dialog/oauth';
const STATE_TTL_S = 15 * 60;

/** The permissions the posting agent needs; listed in the Login for Business configuration too. */
export const META_SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'business_management', 'instagram_basic', 'instagram_content_publish'];

export type MetaApp = { appId: string; appSecret: string; redirectUri: string; configId?: string };
export type PageChoice = { pageId: string; name: string; igUserId?: string; igUsername?: string };
type PageWithToken = PageChoice & { token: string };

export interface ConnectStore {
  connect(dealerId: string, a: Account): Promise<void>;
  stashPages(dealerId: string, pages: PageWithToken[]): Promise<void>;
  takePages(dealerId: string): Promise<PageWithToken[]>;
}

const enc = new TextEncoder();
const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(secret: string, text: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(`meta-state:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(text))));
}

export type Finish = { ok: true; licence: string; connected?: PageChoice; choose?: PageChoice[] } | { ok: false; reason: 'bad_state' | 'expired' | 'denied' | 'no_pages' | 'meta_error'; detail?: string; licence?: string };

export class MetaConnect {
  constructor(private app: MetaApp, private secret: string, private store: ConnectStore, private f: typeof fetch = fetch.bind(globalThis), private now = () => new Date()) {}

  /** The address the Connect button opens. */
  async startUrl(licence: string): Promise<string> {
    const body = b64url(enc.encode(JSON.stringify({ licence, exp: Math.floor(this.now().getTime() / 1000) + STATE_TTL_S, n: crypto.randomUUID() })));
    const q = new URLSearchParams({ client_id: this.app.appId, redirect_uri: this.app.redirectUri, state: `${body}.${await hmac(this.secret, body)}`, response_type: 'code' });
    if (this.app.configId) q.set('config_id', this.app.configId); else q.set('scope', META_SCOPES.join(','));
    return `${DIALOG}?${q}`;
  }

  async readState(state: string): Promise<{ licence: string } | null | 'expired'> {
    const [body, sig] = (state ?? '').split('.');
    if (!body || !sig || sig !== (await hmac(this.secret, body))) return null;
    const s = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/'))) as { licence: string; exp: number };
    return s.exp > this.now().getTime() / 1000 ? { licence: s.licence } : 'expired';
  }

  private async get(path: string, params: Record<string, string>) {
    const r = await this.f(`${GRAPH}/${path}?${new URLSearchParams(params)}`);
    const data = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string } };
    if (!r.ok || data.error) throw new Error(data.error?.message ?? `Meta returned ${r.status}`);
    return data;
  }

  /** The login came back: exchange, list the Pages, connect one or ask which. */
  async finish(q: URLSearchParams): Promise<Finish> {
    const st = await this.readState(q.get('state') ?? '');
    if (!st) return { ok: false, reason: 'bad_state' };
    if (st === 'expired') return { ok: false, reason: 'expired' };
    const { licence } = st;
    if (q.get('error') || !q.get('code')) return { ok: false, reason: 'denied', licence };
    try {
      const short = await this.get('oauth/access_token', { client_id: this.app.appId, client_secret: this.app.appSecret, redirect_uri: this.app.redirectUri, code: q.get('code')! });
      const long = await this.get('oauth/access_token', { grant_type: 'fb_exchange_token', client_id: this.app.appId, client_secret: this.app.appSecret, fb_exchange_token: String(short.access_token) });
      const acc = await this.get('me/accounts', { fields: 'id,name,access_token,instagram_business_account{id,username}', limit: '100', access_token: String(long.access_token) });
      const pages: PageWithToken[] = ((acc.data as { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }[]) ?? [])
        .map(p => ({ pageId: p.id, name: p.name, token: p.access_token, igUserId: p.instagram_business_account?.id, igUsername: p.instagram_business_account?.username }));
      if (!pages.length) return { ok: false, reason: 'no_pages', licence };
      if (pages.length === 1) { await this.use(licence, pages[0]); return { ok: true, licence, connected: strip(pages[0]) }; }
      await this.store.stashPages(licence, pages);
      return { ok: true, licence, choose: pages.map(strip) };
    } catch (e) { return { ok: false, reason: 'meta_error', detail: e instanceof Error ? e.message : String(e), licence }; }
  }

  /** "Which Page?" answered. */
  async choose(licence: string, pageId: string): Promise<PageChoice | null> {
    const p = (await this.store.takePages(licence)).find(x => x.pageId === pageId);
    if (!p) return null;
    await this.use(licence, p);
    return strip(p);
  }

  private async use(licence: string, p: PageWithToken) {
    await this.store.connect(licence, { channel: 'facebook-page', token: p.token, pageId: p.pageId, handle: p.name });
    if (p.igUserId) await this.store.connect(licence, { channel: 'instagram', token: p.token, igUserId: p.igUserId, handle: p.igUsername });
  }
}
const strip = ({ token: _t, ...p }: PageWithToken): PageChoice => p;
