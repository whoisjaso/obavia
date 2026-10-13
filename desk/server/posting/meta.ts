/* Facebook Page and Instagram, through Meta's official Graph API with the
   dealer's own connected Page token. No browser, no password.

   Facebook Page: each photo is uploaded unpublished (/{page}/photos,
   published=false), then one feed post carries them (/{page}/feed with
   attached_media) and the caption.
   Instagram: one container per photo (is_carousel_item), a CAROUSEL container
   with the caption, then media_publish. A single photo is one container with
   the caption. Instagram fetches the images itself, so they must be public
   HTTPS JPEGs. Reference: IG User Media, Graph API v26.0. */
import type { PublishInput, PublishResult, Publisher } from './types';

const GRAPH = 'https://graph.facebook.com/v26.0';
type Fetch = typeof fetch;

async function call(f: Fetch, path: string, params: Record<string, string>): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; reason: string; retry: boolean }> {
  const res = await f(`${GRAPH}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString() });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok && !data.error) return { ok: true, data };
  const e = (data.error ?? {}) as { message?: string; code?: number; is_transient?: boolean };
  // 1, 2, 4, 17, 32, 613: Meta's transient and rate-limit codes.
  const retry = e.is_transient === true || [1, 2, 4, 17, 32, 613].includes(Number(e.code)) || res.status >= 500;
  return { ok: false, reason: e.message ? `Meta said: ${e.message}` : `Meta returned ${res.status}.`, retry };
}

export class FacebookPagePublisher implements Publisher {
  readonly channel = 'facebook-page';
  constructor(private f: Fetch = fetch) {}
  async publish({ rendition, photoUrls, account }: PublishInput): Promise<PublishResult> {
    if (!account.pageId) return { ok: false, reason: 'No Facebook Page is connected.', retry: false };
    const ids: string[] = [];
    for (const url of photoUrls) {
      const r = await call(this.f, `${account.pageId}/photos`, { url, published: 'false', access_token: account.token });
      if (!r.ok) return r;
      ids.push(String(r.data.id));
    }
    const params: Record<string, string> = { message: rendition.caption, access_token: account.token };
    ids.forEach((id, n) => { params[`attached_media[${n}]`] = JSON.stringify({ media_fbid: id }); });
    const post = await call(this.f, `${account.pageId}/feed`, params);
    if (!post.ok) return post;
    const id = String(post.data.id);   // "{page-id}_{post-id}"
    return { ok: true, externalId: id, url: `https://www.facebook.com/${id.replace('_', '/posts/')}` };
  }
}

export class InstagramPublisher implements Publisher {
  readonly channel = 'instagram';
  constructor(private f: Fetch = fetch) {}
  async publish({ rendition, photoUrls, account }: PublishInput): Promise<PublishResult> {
    const ig = account.igUserId;
    if (!ig) return { ok: false, reason: 'No Instagram business account is connected.', retry: false };
    if (!photoUrls.length) return { ok: false, reason: 'Instagram needs at least one photo.', retry: false };
    let creation: string;
    if (photoUrls.length === 1) {
      const c = await call(this.f, `${ig}/media`, { image_url: photoUrls[0], caption: rendition.caption, access_token: account.token });
      if (!c.ok) return c;
      creation = String(c.data.id);
    } else {
      const children: string[] = [];
      for (const url of photoUrls) {
        const c = await call(this.f, `${ig}/media`, { image_url: url, is_carousel_item: 'true', access_token: account.token });
        if (!c.ok) return c;
        children.push(String(c.data.id));
      }
      const c = await call(this.f, `${ig}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: rendition.caption, access_token: account.token });
      if (!c.ok) return c;
      creation = String(c.data.id);
    }
    const pub = await call(this.f, `${ig}/media_publish`, { creation_id: creation, access_token: account.token });
    if (!pub.ok) return pub;
    const id = String(pub.data.id);
    return { ok: true, externalId: id, url: account.handle ? `https://www.instagram.com/${account.handle}/` : `https://www.instagram.com/` };
  }
}
