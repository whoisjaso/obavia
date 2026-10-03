/* Posting: the interfaces the cloud worker runs a post through. Product code
   talks to these, never to a platform. Each channel's publisher, the photo
   store and the browser are swapped per environment; tests use the fakes. */
import type { Delivery, Post, Rendition } from '../../src/lib/post';

/** The dealer's own connected account on one channel (an OAuth token, never a password). */
export type Account = { channel: string; token: string; pageId?: string; igUserId?: string; handle?: string };

export type PublishInput = { dealerId: string; postId: string; rendition: Rendition; photoUrls: string[]; account: Account };
export type PublishResult = { ok: true; url: string; externalId: string } | { ok: false; reason: string; retry: boolean };

/** Publishes through one channel's official API. */
export interface Publisher {
  readonly channel: string;
  publish(input: PublishInput): Promise<PublishResult>;
}

/** Keeps the post's photos at public HTTPS addresses the platforms can fetch. */
export interface PhotoStore {
  put(dealerId: string, postId: string, n: number, dataUrl: string): Promise<string>;
}

/** A cloud browser the worker drives for tasks that are allowed: opening a
    published post to confirm it is live and keep a picture of it. Never used
    to sign in as the dealer on a platform whose terms forbid automation. */
export interface CloudBrowser {
  capture(url: string): Promise<{ ok: true; png: Uint8Array; title: string } | { ok: false; reason: string }>;
}

export interface PostStore {
  save(dealerId: string, post: Post): Promise<void>;
  get(dealerId: string, id: string): Promise<Post | null>;
  account(dealerId: string, channel: string): Promise<Account | null>;
  /** True if this key was new and is now held; false if it already ran (a re-run never posts twice). */
  claim(key: string, at: string): Promise<boolean>;
  proof?(dealerId: string, postId: string, channel: string, png: Uint8Array): Promise<string>;
}

/** One line of the agent's work, shown to the dealer as it happens. */
export type Step = { at: string; channel?: string; text: string };
export type RunResult = { post: Post; steps: Step[] };
export type { Delivery };
