/* A rendered moment's sheet (motion.ts playSheet): the bleed ring on the Floor page plays its 24 frames once and rests on
   frame 23; under reduced motion the rest frame alone, at once (cloud-system.md §4: every state change still happens). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sheet } from './motion';

const cells = (scale: number): Sheet['frames'] => Array.from({ length: 24 }, (_, i) => ({ i, x: (i % 3) * 260 * scale, y: Math.floor(i / 3) * 260 * scale, w: 256 * scale, h: 256 * scale }));
const SHEET: Sheet = { fps: 60, duration_ms: 400, rest: 23, frames: cells(1) };
/* No DOM in the Desk's tests: the frame lands on an element's style, which is all sheetFrame touches. */
const box = () => ({ style: {} as CSSStyleDeclaration } as unknown as HTMLElement);
/* motion.ts and GSAP's own matchMedia both read the query at import; GSAP reads it off `window`. */
const media = (reduce: boolean) => {
  const mm = (q: string) => ({ matches: reduce ? q.includes('reduce') : q.includes('no-preference'), media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false });
  vi.stubGlobal('matchMedia', mm);
  vi.stubGlobal('window', { matchMedia: mm });
};

describe('playSheet: the bleed ring on the Floor page', () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
  it('frame 23 of the 1x sheet at 36 px is the still: the sheet scaled by 36/256, the cell corner at the origin', async () => {
    media(false);
    const { sheetFrame } = await import('./motion');
    const el = box();
    sheetFrame(el, SHEET, 23, 36);
    expect(el.style.backgroundPosition).toBe('-73.125px -255.9375px');   // cell (520, 1820) × 0.140625
    expect(el.style.backgroundSize).toBe('109.125px 291.9375px');       // the sheet, 776 × 2076, × 0.140625
    sheetFrame(el, { ...SHEET, frames: cells(2) }, 23, 36);              // the 2x sheet lands on the same pixels
    expect(el.style.backgroundPosition).toBe('-73.125px -255.9375px');
  });
  it('plays from frame 0 and rests on frame 23 when the tween ends', async () => {
    media(false);
    const { playSheet } = await import('./motion');
    const { gsap } = await import('gsap');
    const el = box();
    const stop = playSheet(el, SHEET, 36, 0);
    expect(el.style.backgroundPosition).toBe('0px 0px');
    gsap.globalTimeline.getChildren(true, true, false).forEach(t => t.progress(1));
    expect(el.style.backgroundPosition).toBe('-73.125px -255.9375px');
    stop();
    expect(el.style.backgroundPosition).toBe('-73.125px -255.9375px');
  });
  it('reduced motion: the rest frame alone, before any frame plays', async () => {
    media(true);
    const { playSheet } = await import('./motion');
    const el = box();
    playSheet(el, SHEET, 36, 0.4);
    expect(el.style.backgroundPosition).toBe('-73.125px -255.9375px');
  });
});
