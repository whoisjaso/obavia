/* The posting agent's Cloudflare pieces: posts and connected accounts in D1,
   photos in R2 behind a public address, and Cloudflare Browser Rendering as
   the agent's own cloud browser. Account tokens are sealed with AES-GCM under
   the session secret before they are stored. */
import type { D1 } from '../store';
import type { Post } from '../../src/lib/post';
import type { Account, CloudBrowser, PhotoStore, PostStore } from './types';

type R2Put = { put(key: string, value: ArrayBuffer | Uint8Array, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown> };

const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function key(secret: string) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`post-account:${secret}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(secret: string, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(secret), enc.encode(text)));
  return `${b64(iv)}.${b64(ct)}`;
}
export async function unseal(secret: string, sealed: string) {
  const [iv, ct] = sealed.split('.');
  return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await key(secret), unb64(ct)));
}

export class D1PostStore implements PostStore {
  constructor(private db: D1, private secret: string, private proofs?: R2Put, private proofBase?: string) {}
  async save(d: string, p: Post) {
    await this.db.prepare('INSERT INTO post (dealer_id, id, body, at) VALUES (?,?,?,?) ON CONFLICT(dealer_id, id) DO UPDATE SET body=excluded.body, at=excluded.at')
      .bind(d, p.id, JSON.stringify({ ...p, photos: [] }), new Date().toISOString()).run();   // the photos live in R2, not in the row
  }
  async get(d: string, id: string) {
    const r = await this.db.prepare('SELECT body FROM post WHERE dealer_id=? AND id=?').bind(d, id).first<{ body: string }>();
    return r ? (JSON.parse(r.body) as Post) : null;
  }
  async account(d: string, channel: string): Promise<Account | null> {
    const r = await this.db.prepare('SELECT token, page_id, ig_user_id, handle FROM post_account WHERE dealer_id=? AND channel=?').bind(d, channel)
      .first<{ token: string; page_id: string | null; ig_user_id: string | null; handle: string | null }>();
    if (!r) return null;
    return { channel, token: await unseal(this.secret, r.token), pageId: r.page_id ?? undefined, igUserId: r.ig_user_id ?? undefined, handle: r.handle ?? undefined };
  }
  async connect(d: string, a: Account) {
    await this.db.prepare('INSERT INTO post_account (dealer_id, channel, token, page_id, ig_user_id, handle, at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(dealer_id, channel) DO UPDATE SET token=excluded.token, page_id=excluded.page_id, ig_user_id=excluded.ig_user_id, handle=excluded.handle, at=excluded.at')
      .bind(d, a.channel, await seal(this.secret, a.token), a.pageId ?? null, a.igUserId ?? null, a.handle ?? null, new Date().toISOString()).run();
  }
  async claim(k: string, at: string) {
    if (await this.db.prepare('SELECT 1 FROM sent_job WHERE key=?').bind(k).first()) return false;
    await this.db.prepare('INSERT INTO sent_job (key, at) VALUES (?,?) ON CONFLICT(key) DO NOTHING').bind(k, at).run();
    return true;
  }
  async proof(d: string, postId: string, channel: string, png: Uint8Array) {
    if (!this.proofs) return '';
    const k = `proof/${d}/${postId}/${channel}.png`;
    await this.proofs.put(k, png, { httpMetadata: { contentType: 'image/png' } });
    return this.proofBase ? `${this.proofBase.replace(/\/$/, '')}/${k}` : k;
  }
}

/** Photos at public HTTPS addresses (the bucket's public domain), so Meta can fetch them. */
export class R2PhotoStore implements PhotoStore {
  constructor(private bucket: R2Put, private base: string) {}
  async put(d: string, postId: string, n: number, dataUrl: string) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
    if (!m) throw new Error('A photo must be a JPEG, PNG or WebP data URL');
    const ext = m[1] === 'image/jpeg' ? 'jpg' : m[1].slice(6);
    const k = `post/${d}/${postId}/${n}.${ext}`;
    await this.bucket.put(k, unb64(m[2]), { httpMetadata: { contentType: m[1] } });
    return `${this.base.replace(/\/$/, '')}/${k}`;
  }
}

/** Cloudflare Browser Rendering: the agent's cloud browser (binding BROWSER). */
type Launcher = { launch(binding: unknown): Promise<{ newPage(): Promise<{ goto(u: string, o?: object): Promise<unknown>; title(): Promise<string>; screenshot(o?: object): Promise<Uint8Array> }>; close(): Promise<void> }> };
export class CloudflareBrowser implements CloudBrowser {
  constructor(private binding: unknown, private load: () => Promise<Launcher> = async () => (await import(/* @vite-ignore */ '@cloudflare/puppeteer' as string)).default as Launcher) {}
  async capture(url: string) {
    try {
      const b = await (await this.load()).launch(this.binding);
      try {
        const p = await b.newPage();
        await p.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
        return { ok: true as const, png: await p.screenshot({ type: 'png' }), title: await p.title() };
      } finally { await b.close(); }
    } catch (e) { return { ok: false as const, reason: e instanceof Error ? e.message : 'browser error' }; }
  }
}
