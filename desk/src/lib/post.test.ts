import { describe, expect, it } from 'vitest';
import { EXAMPLE_DEALER } from './config';
import { EXAMPLE_LOT } from '../data';
import { capHashtags, draftCaption, fit, postable, renditionFor, renditions, titleFor } from './post';

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
