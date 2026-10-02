/* In-memory posting pieces for tests and the preview. */
import type { Post } from '../../src/lib/post';
import type { Account, CloudBrowser, PhotoStore, PostStore, PublishInput, PublishResult, Publisher } from './types';

export class FakePublisher implements Publisher {
  calls: PublishInput[] = [];
  constructor(readonly channel: string, private answer: PublishResult = { ok: true, url: `https://example.test/${channel}/1`, externalId: '1' }) {}
  async publish(i: PublishInput) { this.calls.push(i); return this.answer; }
}

export class FakePhotos implements PhotoStore {
  puts = 0;
  async put(dealerId: string, postId: string, n: number) { this.puts++; return `https://photos.example.test/${dealerId}/${postId}/${n}.jpg`; }
}

export class FakeBrowser implements CloudBrowser {
  opened: string[] = [];
  async capture(url: string) { this.opened.push(url); return { ok: true as const, png: new Uint8Array([137, 80, 78, 71]), title: 'post' }; }
}

export class MemoryPostStore implements PostStore {
  posts = new Map<string, Post>(); accounts = new Map<string, Account>(); claims = new Set<string>(); proofs = new Map<string, number>();
  async save(d: string, p: Post) { this.posts.set(`${d}:${p.id}`, p); }
  async get(d: string, id: string) { return this.posts.get(`${d}:${id}`) ?? null; }
  async account(d: string, channel: string) { return this.accounts.get(`${d}:${channel}`) ?? null; }
  async claim(key: string) { if (this.claims.has(key)) return false; this.claims.add(key); return true; }
  async proof(d: string, postId: string, channel: string, png: Uint8Array) { this.proofs.set(`${d}:${postId}:${channel}`, png.length); return `https://proof.example.test/${postId}/${channel}.png`; }
}
