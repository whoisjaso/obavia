import { describe, expect, it, vi } from 'vitest';
import { AUDIO_MAX_BYTES, ENGINE_SECONDS, SAID, VIDEO_MAX_BYTES, audioMime, canCloseLane, guideNeeded, laneApi, laneWord, reasonOf, said, videoRefusal, videoType } from './auction';
import { HOURS, toWire, type DealerSettings } from './dealer-settings';

/* Wave 4 (gap-table.md §4 W4-C): the Desk's client to W4-A's fixed contract, read as the exact request each call sends. */
const BASE = 'http://lane.test';
const KEY = 'd:P000000.sig';
type Seen = { url: string; method: string; type: string | null; auth: string | null; body: unknown };
function lane(routes: Record<string, (b: unknown) => Response>) {
  const seen: Seen[] = [];
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET', path = url.replace(BASE, '');
    const h = (init?.headers ?? {}) as Record<string, string>;
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
    seen.push({ url: path, method, type: h['Content-Type'] ?? null, auth: h.Authorization ?? null, body });
    const r = routes[`${method} ${path}`];
    return r ? r(body) : new Response('not found', { status: 404 });
  });
  return { api: laneApi(BASE, () => KEY, f), seen };
}
const ok = (x: unknown) => () => new Response(JSON.stringify(x), { status: 200, headers: { 'content-type': 'application/json' } });
const lot = (extra = {}) => ({ id: 'l1', start: 4900, retail: 7995, opensAt: 1, closesAt: 2, high: 0, bids: 0, watching: 0, car: { lane: 'public', ...extra } });

describe('PUT /lots/:id/audio and /video: the bytes, the type, the key; the caps before the lane sees them', () => {
  it('audio/webm rides as the body with its type, and the lot comes back with car.audioKey', async () => {
    const { api, seen } = lane({ 'PUT /lots/l1/audio': ok(lot({ audioKey: 'lots/l1/audio.webm' })) });
    const blob = new Blob([new Uint8Array(1024)], { type: 'audio/webm' });
    const r = await api.putAudio('l1', blob, 'audio/webm');
    expect(seen[0]).toMatchObject({ url: '/lots/l1/audio', method: 'PUT', type: 'audio/webm', auth: `Bearer ${KEY}` });
    expect(seen[0].body).toBe(blob);
    expect(r.ok && r.value.car?.audioKey).toBe('lots/l1/audio.webm');
  });
  it('audio/mp4 where webm is unsupported', async () => {
    const { api, seen } = lane({ 'PUT /lots/l1/audio': ok(lot({ audioKey: 'k' })) });
    await api.putAudio('l1', new Blob([new Uint8Array(8)]), 'audio/mp4');
    expect(seen[0].type).toBe('audio/mp4');
  });
  it('over 8 MB is refused here, in four words, and nothing is sent', async () => {
    const { api, seen } = lane({});
    const r = await api.putAudio('l1', { size: AUDIO_MAX_BYTES + 1 } as Blob, 'audio/webm');
    expect(r).toEqual({ ok: false, reason: 'audio too long' });
    expect(seen).toHaveLength(0);
    expect(AUDIO_MAX_BYTES).toBe(8_000_000);   // the Worker's MEDIA.audio.cap (index.ts), decimal
    expect(VIDEO_MAX_BYTES).toBe(60_000_000);
  });
  it('the walkaround: video/mp4 or video/webm, 60 MB, the lot back with car.videoKey', async () => {
    const { api, seen } = lane({ 'PUT /lots/l1/video': ok(lot({ videoKey: 'lots/l1/video.mp4' })) });
    const r = await api.putVideo('l1', new Blob([new Uint8Array(16)]), 'video/mp4');
    expect(seen[0]).toMatchObject({ url: '/lots/l1/video', method: 'PUT', type: 'video/mp4' });
    expect(r.ok && r.value.car?.videoKey).toBe('lots/l1/video.mp4');
    expect((await api.putVideo('l1', { size: VIDEO_MAX_BYTES + 1 } as Blob, 'video/webm'))).toEqual({ ok: false, reason: 'video too big' });
    expect(seen).toHaveLength(1);
  });
  it('the picker\'s file: over 60 MB and a type the Worker does not take are said; a .mov goes up as mp4', () => {
    expect(videoRefusal({ type: 'video/mp4', size: 10 })).toBeNull();
    expect(videoRefusal({ type: 'video/webm', size: VIDEO_MAX_BYTES })).toBeNull();
    expect(videoRefusal({ type: 'video/mp4', size: VIDEO_MAX_BYTES + 1 })).toBe('video too big');
    expect(videoRefusal({ type: 'image/jpeg', size: 10 })).toBe('video type');
    expect(videoRefusal({ type: 'video/quicktime', size: 10 })).toBeNull();
    expect(videoType('video/quicktime')).toBe('video/mp4');
    expect(videoType('video/webm')).toBe('video/webm');
  });
  it('the lot id is encoded in the path', async () => {
    const { api, seen } = lane({});
    await api.putVideo('a b', new Blob([new Uint8Array(1)]), 'video/mp4');
    expect(seen[0].url).toBe('/lots/a%20b/video');
  });
  it('the recorder\'s type: webm first, mp4 where webm is unsupported, null where neither', () => {
    expect(audioMime(t => t === 'audio/webm')).toBe('audio/webm');
    expect(audioMime(t => t === 'audio/mp4')).toBe('audio/mp4');
    expect(audioMime(() => true)).toBe('audio/webm');
    expect(audioMime(() => false)).toBeNull();
    expect(ENGINE_SECONDS).toBe(8);
  });
});

describe('the closed lane (W4-A: CarMeta.lane; a flagged dealer only)', () => {
  it('the Buyers Guide gate on Go: a public lot needs it, a closed lot does not, no lane field means public', () => {
    expect(guideNeeded('public')).toBe(true);
    expect(guideNeeded(undefined)).toBe(true);
    expect(guideNeeded('closed')).toBe(false);
  });
  it('the page exists only when /dealers/me carries wholesaleGdn', () => {
    expect(canCloseLane({ wholesaleGdn: 'W12345' })).toBe(true);
    expect(canCloseLane({ wholesaleGdn: null })).toBe(false);
    expect(canCloseLane({})).toBe(false);
    expect(canCloseLane(null)).toBe(false);
  });
  it('one faint word on Live, Sold and the row, two words long, none for public', () => {
    expect(laneWord('closed')).toBe('Dealers only');
    expect(laneWord('public')).toBe('');
    expect(laneWord(undefined)).toBe('');
  });
  it('GET /lots/closed with the dealer key', async () => {
    const { api, seen } = lane({ 'GET /lots/closed': ok([lot({ lane: 'closed' })]) });
    const r = await api.closedLots();
    expect(seen[0]).toMatchObject({ url: '/lots/closed', method: 'GET', auth: `Bearer ${KEY}` });
    expect(r.ok && r.value[0].car?.lane).toBe('closed');
  });
});

describe('the settings on the Worker (W4-A: GET and PUT /dealers/settings)', () => {
  const s: DealerSettings = { lane: true, hours: [...HOURS.saturday.hours], address: '1201 Main St, Pasadena, TX 77504', afterHours: '+17135550142', whopAccount: 'biz_x' };
  it('Yes sends the four names of the contract, the Whop account never', async () => {
    const { api, seen } = lane({ 'PUT /dealers/settings': ok(toWire(s)) });
    const r = await api.putSettings(s);
    expect(seen[0]).toMatchObject({ url: '/dealers/settings', method: 'PUT', type: 'application/json', auth: `Bearer ${KEY}` });
    expect(seen[0].body).toEqual({ hours: ['Mon-Fri 9 am-6 pm', 'Sat 9 am-6 pm'], pickupAddress: '1201 Main St, Pasadena, TX 77504', afterHoursPhone: '+17135550142', laneOn: true });
    expect(Object.keys(seen[0].body as object).sort()).toEqual(['afterHoursPhone', 'hours', 'laneOn', 'pickupAddress']);
    expect(r.ok).toBe(true);
  });
  it('on open, GET', async () => {
    const { api, seen } = lane({ 'GET /dealers/settings': ok({ hours: [], pickupAddress: 'x', afterHoursPhone: '+12145550142', laneOn: false }) });
    const r = await api.getSettings();
    expect(seen[0]).toMatchObject({ url: '/dealers/settings', method: 'GET' });
    expect(r.ok && r.value.laneOn).toBe(false);
  });
  it('a 403 role_denied from any route (the Worker\'s JSON { error, role }) is said in four words or fewer', async () => {
    const { api } = lane({ 'PUT /dealers/settings': () => new Response(JSON.stringify({ error: 'role_denied', role: 'lot' }), { status: 403, headers: { 'content-type': 'application/json' } }) });
    const r = await api.putSettings(s);
    expect(r).toEqual({ ok: false, reason: 'role_denied' });
    expect(said('role_denied')).toBe('Not your role.');
    expect(reasonOf('closed', 409)).toBe('closed');
    expect(reasonOf('{"error":"too_big"}', 413)).toBe('too_big');
    expect(reasonOf('', 500)).toBe('http 500');
    /* every refusal W4-A's routes give (index.ts: the role gate, /open's wholesale check, the media PUTs, the settings PUT; auction.ts: the lane and media patches) */
    for (const k of ['role_denied', 'video too big', 'video type', 'audio too long', 'wholesale_required', 'bad_lane', 'lane_fixed', 'bad_media_key', 'bad_type', 'too_big', 'empty', 'no_lot', 'bad_phone', 'bad_lane_on']) {
      expect(SAID[k].split(/\s+/).length).toBeLessThanOrEqual(4);
      expect(SAID[k]).not.toMatch(/[\u2013\u2014]/);
    }
  });
  it('no key and no lane say so without a request', async () => {
    const f = vi.fn();
    expect(await laneApi(BASE, () => null, f).getSettings()).toEqual({ ok: false, reason: 'no key' });
    expect(await laneApi('', () => KEY, f).getSettings()).toEqual({ ok: false, reason: 'offline' });
    expect(f).not.toHaveBeenCalled();
  });
});
