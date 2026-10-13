/* The posting agent: takes one post and does the work a person would do for
   each channel, in order, and writes down what it did.

   - Photos go up once, to addresses every platform can fetch.
   - Official-API channels publish with the dealer's connected account, then
     the browser opens the live post and keeps a picture of it as proof.
   - Hand-off channels (terms forbid automated posting) are prepared, sized to
     the form, and left "ready" for the dealer to post from their phone.
   - Each (post, channel) is claimed before it runs, so a retry or a second
     worker never posts the same car twice. */
import { renditions, type Delivery, type Post } from '../../src/lib/post';
import type { Vehicle } from '../../src/lib/sale';
import type { CloudBrowser, PhotoStore, PostStore, Publisher, RunResult, Step } from './types';

export class PostingAgent {
  constructor(
    private store: PostStore,
    private photos: PhotoStore,
    private publishers: Publisher[],
    private browser?: CloudBrowser,
    private clock: () => Date = () => new Date(),
  ) {}

  async run(dealerId: string, post: Post, vehicle: Vehicle): Promise<RunResult> {
    const steps: Step[] = [];
    const log = (text: string, channel?: string) => steps.push({ at: this.clock().toISOString(), channel, text });
    const list = renditions(post, vehicle);
    const deliveries: Delivery[] = [];

    let urls: string[] = [];
    if (list.some(r => r.route === 'api')) {
      urls = await Promise.all(post.photos.map((p, n) => this.photos.put(dealerId, post.id, n, p)));
      log(`Uploaded ${urls.length} ${urls.length === 1 ? 'photo' : 'photos'}.`);
    }

    for (const r of list) {
      const at = this.clock().toISOString();
      if (!(await this.store.claim(`post:${dealerId}:${post.id}:${r.channel}`, at))) {
        const before = post.deliveries.find(d => d.channel === r.channel);
        deliveries.push(before ?? { channel: r.channel, route: r.route, state: 'queued', at });
        log('Already handled; not posted again.', r.channel);
        continue;
      }
      if (r.route === 'handoff') {
        deliveries.push({ channel: r.channel, route: 'handoff', state: 'ready', at });
        log(`Listing prepared${r.title ? `: “${r.title}”` : ''}, ${r.photos.length} photos in order. Waiting on your tap.`, r.channel);
        continue;
      }
      const publisher = this.publishers.find(p => p.channel === r.channel);
      const account = await this.store.account(dealerId, r.channel);
      if (!publisher || !account) {
        deliveries.push({ channel: r.channel, route: 'api', state: 'failed', reason: 'Connect the account first.', at });
        log('Not connected yet, so nothing was posted.', r.channel);
        continue;
      }
      const res = await publisher.publish({ dealerId, postId: post.id, rendition: r, photoUrls: urls.slice(0, r.photos.length), account });
      if (!res.ok) {
        deliveries.push({ channel: r.channel, route: 'api', state: 'failed', reason: res.reason, at });
        log(`Didn’t post: ${res.reason}`, r.channel);
        continue;
      }
      deliveries.push({ channel: r.channel, route: 'api', state: 'posted', url: res.url, at });
      log('Posted.', r.channel);
      if (this.browser) {
        const seen = await this.browser.capture(res.url);
        if (seen.ok && this.store.proof) { await this.store.proof(dealerId, post.id, r.channel, seen.png); log('Opened the live post and kept a picture of it.', r.channel); }
        else if (!seen.ok) log(`Couldn’t open the live post to check it (${seen.reason}).`, r.channel);
      }
    }

    const done: Post = { ...post, deliveries };
    await this.store.save(dealerId, done);
    return { post: done, steps };
  }
}
