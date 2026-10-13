import { describe, expect, it } from 'vitest';
import { EXAMPLE_DEALER } from './config';
import { EXAMPLE_LOT } from '../data';
import { readFileSync } from 'node:fs';
import { LANE_SITE, capHashtags, draftCaption, fit, laneLink, postable, renditionFor, renditions, titleFor, withLane } from './post';

const car = { ...EXAMPLE_LOT[1], price: 10500, titleStatus: 'clean' as const };
const photos = Array.from({ length: 14 }, (_, n) => `data:image/jpeg;base64,${n}`);

describe('posting a car', () => {
  it('drafts the caption from the record only', () => {
    const c = draftCaption(car, EXAMPLE_DEALER);
    expect(c).toContain(titleFor(car));
    expect(c).toContain(`VIN ${car.vin}`);
    expect(c).toContain('Clean title.');
    expect(c).toContain(EXAMPLE_DEALER.phone);
    // Nothing the record does not say.
    expect(c).not.toMatch(/warranty|financing available|low miles|like new/i);
  });

  it('says nothing about the title unless it is clean or a disclosed rebuilt', () => {
    expect(draftCaption({ ...car, titleStatus: 'unknown' }, EXAMPLE_DEALER)).not.toMatch(/title/i);
    expect(draftCaption({ ...car, titleStatus: 'rebuilt_salvage' }, EXAMPLE_DEALER)).toMatch(/Rebuilt salvage title, disclosed/);
  });

  it('leaves the price out when none is set', () => {
    expect(titleFor({ ...car, price: 0 })).not.toMatch(/\$/);
  });

  it('sizes each channel: Instagram 10 photos and 30 hashtags, Craigslist a 70-character title', () => {
    const tags = Array.from({ length: 40 }, (_, n) => `#t${n}`).join(' ');
    const ig = renditionFor('instagram', { photos, caption: `Nice car ${tags}` }, car)!;
    expect(ig.photos).toHaveLength(10);
    expect(ig.caption.match(/#/g)).toHaveLength(30);
    const cl = renditionFor('craigslist', { photos, caption: 'x' }, { ...car, model: 'A Very Long Model Name That Goes On And On Forever And Ever' })!;
    expect([...cl.title!].length).toBeLessThanOrEqual(70);
    expect(cl.route).toBe('handoff');
    expect(cl.notes.join(' ')).toMatch(/You tap Post/);
  });

  it('cuts at a word, never mid-word', () => {
    expect(fit('one two three four five', 12)).toBe('one two…');
    expect(fit('short', 12)).toBe('short');
    expect(capHashtags('#a #b #c', 2)).toBe('#a #b');
  });

  it('a limit we have not confirmed cuts nothing', () => {
    const long = 'word '.repeat(5000);
    expect(renditionFor('marketplace', { photos, caption: long }, car)!.caption).toBe(long);
  });

  it('only channels the dealer turned on, Marketplace only once its terms are signed', () => {
    expect(postable(['instagram', 'cargurus'], false)).toEqual(['instagram']);
    expect(postable([], true)).toEqual(['marketplace']);
    expect(renditions({ photos, caption: 'x', channels: ['instagram', 'nope'] }, car)).toHaveLength(1);
  });
});

describe('caption edges', () => {
  it('cases the colour and leaves no stray line when the dealer has no name yet', () => {
    const c = draftCaption({ ...car, color: 'gray' }, { dba: '', legalName: '', phone: '', city: '' });
    expect(c).toContain('Gray');
    expect(c.split('\n').every(l => l.trim().length > 1)).toBe(true);
  });
});

describe('the lane link in the Marketplace text (gap table W3-C; phases Phase 2 Marketing)', () => {
  it('is the phone\'s own link (auction/src/store.ts laneLink): the same address on the share sheet and the listing (CP9)', () => {
    expect(laneLink('altima')).toBe('https://obavia.co/lane/altima');
    expect(laneLink('lot 9')).toBe('https://obavia.co/lane/lot%209');
    const phone = readFileSync(new URL('../../../auction/src/store.ts', import.meta.url), 'utf8');
    expect(phone).toContain(`?? '${LANE_SITE}'`);
    expect(phone).toContain('`${LANE_SITE}/lane/${encodeURIComponent(lotId)}`');
  });
  it('ends the Marketplace text with the link on its own line, and leaves the other channels as written', () => {
    const lane = laneLink('3a004352-i7hb');
    const mp = renditionFor('marketplace', { photos, caption: 'Nice car.\n', lane }, car)!;
    expect(mp.caption.endsWith(`\n\n${lane}`)).toBe(true);
    expect(mp.caption).toBe(`Nice car.\n\n${lane}`);
    expect(renditionFor('instagram', { photos, caption: 'Nice car.', lane }, car)!.caption).toBe('Nice car.');
    expect(renditionFor('marketplace', { photos, caption: 'Nice car.' }, car)!.caption).toBe('Nice car.');
    expect(withLane('x', undefined)).toBe('x');
    expect(renditions({ photos, caption: 'x', channels: ['marketplace', 'craigslist'], lane }, car).map(r => r.caption.includes(lane))).toEqual([true, false]);
  });
});
