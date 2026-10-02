/* Post a car: one set of photos and one caption, written from the car's own
   record, sent to every channel the dealer turned on, each in the form that
   channel takes.

   Two ways a post leaves the Desk, and nothing else:
   - "api": the channel's official publishing API, with the dealer's own
     account connected (Facebook Page, Instagram, TikTok photo posts). The
     cloud worker publishes and reports back.
   - "handoff": channels whose terms forbid automated posting (Facebook
     Marketplace, Craigslist, OfferUp). The worker prepares the listing,
     photos in order and the text sized to the form, and the dealer posts it
     from their own phone in two taps. We never sign in as the dealer there.

   Limits are each platform's own, with where they came from. A limit we have
   not confirmed is null and the text is not cut to a guess. Captions say only
   what the record says: no invented features, no "clean title" unless the
   title status is clean, no price unless one is set. */
import type { DealerConfig } from './config';
import type { Vehicle } from './sale';
import { colourName } from './colour';
import { usd } from './money';

export type Route = 'api' | 'handoff';
export type PostSpec = {
  id: string; name: string; route: Route;
  /** Characters in the body text the channel accepts. */
  caption: number | null;
  /** Characters in a separate title, where the channel has one. */
  title: number | null;
  /** Photos per post. */
  photos: number | null;
  hashtags: number | null;
  source: string;
};

export const POST_SPECS: PostSpec[] = [
  { id: 'facebook-page', name: 'Facebook Page', route: 'api', caption: 63206, title: null, photos: 10, hashtags: null,
    source: 'Meta Graph API: Page photos uploaded unpublished, then one feed post with attached_media. 10 photos is our own cap per post.' },
  { id: 'instagram', name: 'Instagram', route: 'api', caption: 2200, title: null, photos: 10, hashtags: 30,
    source: 'Meta IG User Media reference (v26.0): caption max 2,200 characters, 30 hashtags, 20 @ tags; carousel of up to 10.' },
  { id: 'tiktok', name: 'TikTok', route: 'api', caption: 4000, title: 90, photos: 35, hashtags: null,
    source: 'TikTok Content Posting API, photo post: title up to 90 UTF-16 runes, description up to 4,000; up to 35 images.' },
  { id: 'marketplace', name: 'Facebook Marketplace', route: 'handoff', caption: null, title: null, photos: null, hashtags: null,
    source: 'No posting API for dealer vehicles since January 30, 2023; posted by the dealer from their phone.' },
  { id: 'craigslist', name: 'Craigslist', route: 'handoff', caption: null, title: 70, photos: 24, hashtags: null,
    source: 'Craigslist posting form: 70-character title, 24 images. Its terms forbid automated posting.' },
  { id: 'offerup', name: 'OfferUp', route: 'handoff', caption: null, title: null, photos: null, hashtags: null,
    source: 'No public posting API; posted by the dealer from their phone.' },
];
export const postSpec = (id: string) => POST_SPECS.find(s => s.id === id);

export type Post = {
  id: string; vehicleId: string; createdAt: string;
  photos: string[];            // in the order they post; the first is the cover
  caption: string;             // the dealer's words, edited from the written draft
  channels: string[];
  deliveries: Delivery[];
};
export type Delivery = {
  channel: string; route: Route;
  state: 'queued' | 'sent' | 'ready' | 'posted' | 'failed';   // ready = handed off, waiting on the dealer's tap
  url?: string; reason?: string; at?: string;
};

const commas = (n: number) => n.toLocaleString('en-US');

/** The listing's title line: year, make, model, and the price when one is set. */
export function titleFor(v: Pick<Vehicle, 'year' | 'make' | 'model' | 'price'>): string {
  return [[v.year, v.make, v.model].filter(Boolean).join(' '), v.price > 0 ? usd(v.price).replace(/\.00$/, '') : ''].filter(Boolean).join(' · ');
}

/** The draft caption, from the record only. The dealer edits it before it goes. */
export function draftCaption(v: Vehicle, d: Pick<DealerConfig, 'dba' | 'legalName' | 'phone' | 'city'>): string {
  const lines = [
    titleFor(v),
    [v.mileage != null ? `${commas(v.mileage)} miles` : '', colourName(v.color), v.bodyStyle].filter(Boolean).join(' · '),
    v.titleStatus === 'clean' ? 'Clean title.' : v.titleStatus === 'rebuilt_salvage' ? 'Rebuilt salvage title, disclosed in writing at sale.' : '',
    `VIN ${v.vin}`,
    [d.dba || d.legalName, d.city].filter(Boolean).join(', ') + (d.phone ? `. Call or text ${d.phone}.` : '.'),
  ];
  return lines.filter(Boolean).join('\n');
}

/** Cut at a word boundary to fit a limit; never mid-word, never with a dangling space. */
export function fit(text: string, max: number | null): string {
  if (max == null || [...text].length <= max) return text;
  const cut = [...text].slice(0, max - 1).join('');
  const at = cut.lastIndexOf(' ');
  return (at > 0 ? cut.slice(0, at) : cut).replace(/[\s,.;:·-]+$/, '') + '…';
}

/** Hashtags past a channel's limit are dropped, last first. */
export function capHashtags(text: string, max: number | null): string {
  if (max == null) return text;
  let n = 0;
  return text.replace(/#[\p{L}\p{N}_]+/gu, tag => (++n <= max ? tag : '')).replace(/[ \t]{2,}/g, ' ').trim();
}

export type Rendition = { channel: string; route: Route; title?: string; caption: string; photos: string[]; notes: string[] };

/** What one channel receives: the caption and photos in the form it takes. */
export function renditionFor(channel: string, p: Pick<Post, 'photos' | 'caption'>, v: Vehicle): Rendition | null {
  const s = postSpec(channel); if (!s) return null;
  const notes: string[] = [];
  const photos = s.photos != null ? p.photos.slice(0, s.photos) : p.photos;
  if (s.photos != null && p.photos.length > s.photos) notes.push(`${s.name} takes ${s.photos} photos; the first ${s.photos} go.`);
  let caption = capHashtags(p.caption, s.hashtags);
  if (s.caption != null && [...caption].length > s.caption) { caption = fit(caption, s.caption); notes.push(`Shortened to ${commas(s.caption)} characters.`); }
  const title = s.title != null ? fit(titleFor(v), s.title) : undefined;
  if (s.route === 'handoff') notes.push('Ready on your phone. You tap Post.');
  return { channel, route: s.route, title, caption, photos, notes };
}

export function renditions(p: Pick<Post, 'photos' | 'caption' | 'channels'>, v: Vehicle): Rendition[] {
  return p.channels.map(c => renditionFor(c, p, v)).filter((r): r is Rendition => !!r);
}

/** Which posting channels a dealer can use: the Reach channels they turned on that we can post to. */
export const postable = (wanted: string[], marketplaceOn: boolean) =>
  POST_SPECS.filter(s => (s.id === 'marketplace' ? marketplaceOn : wanted.includes(s.id))).map(s => s.id);
