import { describe, expect, it } from 'vitest';
import { PostingAgent } from './service';
import { FakeBrowser, FakePhotos, FakePublisher, MemoryPostStore } from './fake';
import { FacebookPagePublisher, InstagramPublisher } from './meta';
import { EXAMPLE_LOT } from '../../src/data';
import type { Post } from '../../src/lib/post';

const car = { ...EXAMPLE_LOT[1], price: 10500 };
const post = (channels: string[]): Post => ({ id: 'p1', vehicleId: car.id, createdAt: '2026-10-02T15:00:00Z', photos: ['data:a', 'data:b', 'data:c'], caption: 'Hello', channels, deliveries: [] });

describe('the posting agent', () => {
  it('publishes API channels, prepares hand-offs, and keeps proof', async () => {
    const store = new MemoryPostStore(); store.accounts.set('P1:instagram', { channel: 'instagram', token: 't', igUserId: '9' });
    const ig = new FakePublisher('instagram'), browser = new FakeBrowser(), photos = new FakePhotos();
    const r = await new PostingAgent(store, photos, [ig], browser).run('P1', post(['instagram', 'marketplace', 'facebook-page']), car);
    expect(photos.puts).toBe(3);
    expect(ig.calls[0].photoUrls).toHaveLength(3);
    expect(r.post.deliveries.map(d => [d.channel, d.state])).toEqual([['instagram', 'posted'], ['marketplace', 'ready'], ['facebook-page', 'failed']]);
    expect(r.post.deliveries[2].reason).toMatch(/Connect/);
    expect(browser.opened).toEqual(['https://example.test/instagram/1']);
    expect(store.proofs.get('P1:p1:instagram')).toBeGreaterThan(0);
    expect(r.steps.map(s => s.text).join(' ')).toMatch(/Waiting on your tap/);
  });

  it('never posts the same car to the same channel twice', async () => {
    const store = new MemoryPostStore(); store.accounts.set('P1:instagram', { channel: 'instagram', token: 't', igUserId: '9' });
    const ig = new FakePublisher('instagram'), agent = new PostingAgent(store, new FakePhotos(), [ig]);
    const first = await agent.run('P1', post(['instagram']), car);
    await agent.run('P1', first.post, car);
    expect(ig.calls).toHaveLength(1);
  });

  it('hand-off only: no photos are uploaded and nothing is published', async () => {
    const photos = new FakePhotos();
    const r = await new PostingAgent(new MemoryPostStore(), photos, []).run('P1', post(['craigslist', 'offerup']), car);
    expect(photos.puts).toBe(0);
    expect(r.post.deliveries.every(d => d.state === 'ready')).toBe(true);
  });
});

describe('Meta Graph publishing', () => {
  const graph = () => {
    const calls: { path: string; body: URLSearchParams }[] = []; let n = 0;
    const f = (async (url: string, init: RequestInit) => {
      calls.push({ path: url.replace('https://graph.facebook.com/v26.0/', ''), body: new URLSearchParams(String(init.body)) });
      return new Response(JSON.stringify({ id: url.endsWith('/feed') ? '111_222' : `m${++n}` }), { status: 200 });
    }) as unknown as typeof fetch;
    return { calls, f };
  };
  const input = (account: Record<string, string>) => ({ dealerId: 'P1', postId: 'p1', rendition: { channel: 'x', route: 'api' as const, caption: 'Hi', photos: ['a', 'b'], notes: [] }, photoUrls: ['https://p/1.jpg', 'https://p/2.jpg'], account: { channel: 'x', token: 'tok', ...account } });

  it('Facebook Page: photos unpublished, then one feed post with them attached', async () => {
    const { calls, f } = graph();
    const r = await new FacebookPagePublisher(f).publish(input({ pageId: '111' }));
    expect(calls.map(c => c.path)).toEqual(['111/photos', '111/photos', '111/feed']);
    expect(calls[0].body.get('published')).toBe('false');
    expect(calls[2].body.get('attached_media[1]')).toBe(JSON.stringify({ media_fbid: 'm2' }));
    expect(r).toMatchObject({ ok: true, url: 'https://www.facebook.com/111/posts/222' });
  });

  it('Instagram: carousel items, the carousel with the caption, then publish', async () => {
    const { calls, f } = graph();
    const r = await new InstagramPublisher(f).publish(input({ igUserId: '9', handle: 'exampledealer' }));
    expect(calls.map(c => c.path)).toEqual(['9/media', '9/media', '9/media', '9/media_publish']);
    expect(calls[0].body.get('is_carousel_item')).toBe('true');
    expect(calls[2].body.get('media_type')).toBe('CAROUSEL');
    expect(calls[2].body.get('caption')).toBe('Hi');
    expect(calls[3].body.get('creation_id')).toBe('m3');
    expect(r.ok).toBe(true);
  });

  it('a Meta error is reported in words, and rate limits are retried', async () => {
    const f = (async () => new Response(JSON.stringify({ error: { message: 'Too many calls', code: 4 } }), { status: 400 })) as unknown as typeof fetch;
    expect(await new InstagramPublisher(f).publish(input({ igUserId: '9' }))).toEqual({ ok: false, reason: 'Meta said: Too many calls', retry: true });
  });
});

describe('sealed account tokens', () => {
  it('a token round-trips, and the stored form is not the token', async () => {
    const { seal, unseal } = await import('./cloudflare');
    const s = await seal('x'.repeat(32), 'EAAB-secret-token');
    expect(s).not.toContain('EAAB');
    expect(await unseal('x'.repeat(32), s)).toBe('EAAB-secret-token');
    await expect(unseal('y'.repeat(32), s)).rejects.toBeTruthy();
  });
});
