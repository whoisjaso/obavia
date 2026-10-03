/* Photos hosted on the dealer's own Facebook Page, for when no photo bucket
   is set up (the pilot). Each photo is uploaded to the Page unpublished, as
   the file itself (multipart "source"), and the address Facebook serves it
   from is returned. Instagram fetches from that address; the Page publisher
   attaches from it. Nothing appears on the Page until a post attaches it. */
import type { PhotoStore } from './types';

const GRAPH = 'https://graph.facebook.com/v26.0';

export class FacebookPhotoHost implements PhotoStore {
  constructor(private pageId: string, private token: string, private f: typeof fetch = fetch) {}
  async put(_d: string, _post: string, n: number, dataUrl: string): Promise<string> {
    const m = /^data:(image\/(?:jpeg|png));base64,(.+)$/.exec(dataUrl);
    if (!m) throw new Error('A photo must be a JPEG or PNG data URL');
    const form = new FormData();
    form.set('source', new Blob([Uint8Array.from(atob(m[2]), c => c.charCodeAt(0))], { type: m[1] }), `photo-${n + 1}.${m[1] === 'image/png' ? 'png' : 'jpg'}`);
    form.set('published', 'false');
    form.set('access_token', this.token);
    const up = await this.f(`${GRAPH}/${this.pageId}/photos`, { method: 'POST', body: form });
    const u = (await up.json()) as { id?: string; error?: { message?: string } };
    if (!u.id) throw new Error(`Facebook would not take photo ${n + 1}: ${u.error?.message ?? up.status}`);
    const got = await this.f(`${GRAPH}/${u.id}?fields=images&access_token=${encodeURIComponent(this.token)}`);
    const g = (await got.json()) as { images?: { source: string; width: number }[]; error?: { message?: string } };
    const best = g.images?.sort((a, b) => b.width - a.width)[0]?.source;
    if (!best) throw new Error(`Facebook did not return an address for photo ${n + 1}: ${g.error?.message ?? got.status}`);
    return best;
  }
}
