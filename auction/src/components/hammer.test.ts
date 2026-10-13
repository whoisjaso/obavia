/* The moments: the shipped sheets match the contract, the clock puts the hammer's strike at frame 6 at 100 ms and
   the whole fall at 400 ms, the clock's and the coin's contact on the last frame with the same 400 ms total, the
   2x sheet is chosen on 2x screens, and the window offsets land on device pixels. The manifest is read as text
   (scene3d.ts requires WebP, which vitest cannot load), the way etch.test reads ETCH. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HIDDEN, UNDER, clock, frameOf, offsets, sheetFor } from './hammer';
import type { MomentSheet } from './scene3d';

const src = readFileSync(join(__dirname, 'scene3d.ts'), 'utf8');
const lightOf = (name: string) => src.match(new RegExp(`${name}: \\{\\s*light: \\{ contact: (\\d+), fps: (\\d+), rest: (\\d+), x1: (\\{.*?\\}|null), x2: (\\{.*?\\}|null) \\},`, 's'));
const light = lightOf('hammer');
const sheet = (s: string): MomentSheet | null => {
  if (s === 'null') return null;
  const file = s.match(/require\('\.\.\/\.\.\/assets\/scene-3d\/([^']+)'\)/)![1];
  const [, w, h] = s.match(/w: (\d+), h: (\d+)/)!;
  const cell = JSON.parse(s.match(/cell: (\{[^}]*\})/)![1]);
  const gap = +s.match(/gap: (\d+)/)![1];
  const frames = JSON.parse(s.match(/frames: (\[.*\])/)![1]);
  return { src: file as unknown as number, w: +w, h: +h, cell, gap, frames };
};
const momentOf = (l: RegExpMatchArray | null) => (l ? { contact: +l[1], fps: +l[2], rest: +l[3], x1: sheet(l[4]), x2: sheet(l[5]) } : null);
const m = momentOf(light);

describe('the hammer manifest', () => {
  it('ships the light moment with both sheets', () => {
    expect(m).not.toBeNull();
    expect(m!.x1).not.toBeNull(); expect(m!.x2).not.toBeNull();
    for (const sh of [m!.x1!, m!.x2!]) expect(existsSync(join(__dirname, '..', '..', 'assets', 'scene-3d', sh.src as unknown as string))).toBe(true);
  });
  it('is the contract: 24 frames at 60 fps, the strike at 6, the still at 23, 256 and 512 cells, a 4 px gap', () => {
    expect(m!.fps).toBe(60); expect(m!.contact).toBe(6); expect(m!.rest).toBe(23);
    expect(m!.x1!.frames).toHaveLength(24); expect(m!.x2!.frames).toHaveLength(24);
    expect(m!.x1!.cell).toEqual({ w: 256, h: 256 }); expect(m!.x2!.cell).toEqual({ w: 512, h: 512 });
    expect(m!.x1!.gap).toBe(4); expect(m!.x2!.gap).toBe(4);
    expect(m!.x1!.frames[23]).toEqual({ x: 520, y: 1820, w: 256, h: 256 });
  });
  it('keeps every rect a whole cell inside its own sheet, 3 by 8 with the 4 px gap at both scales', () => {
    for (const sh of [m!.x1!, m!.x2!]) sh.frames.forEach((r, i) => {
      expect([r.w, r.h]).toEqual([sh.cell.w, sh.cell.h]);
      expect([r.x, r.y]).toEqual([(i % 3) * (sh.cell.w + sh.gap), Math.floor(i / 3) * (sh.cell.h + sh.gap)]);   // the 2x gap is 4 px too, so its rects are its own
      expect(r.x + r.w).toBeLessThanOrEqual(sh.w); expect(r.y + r.h).toBeLessThanOrEqual(sh.h);
    });
  });
  it('names the phone files without "@"', () => {
    expect(m!.x1!.src).toBe('hammer-light-sheet-1x.webp'); expect(m!.x2!.src).toBe('hammer-light-sheet-2x.webp');
  });
});

describe('the clock', () => {
  it('strikes at 100 ms and freezes at 400', () => {
    const c = clock(m!);
    expect(c.contactMs).toBeCloseTo(100, 6); expect(c.puffMs).toBeCloseTo(300, 6); expect(c.totalMs).toBeCloseTo(400, 6);
  });
  it('shows each frame for its whole 1000 / 60 ms and holds the still', () => {
    expect(frameOf(0, 23)).toBe(0); expect(frameOf(5.99, 23)).toBe(5); expect(frameOf(6, 23)).toBe(6);
    expect(frameOf(23 + UNDER, 23)).toBe(23); expect(frameOf(40, 23)).toBe(23);
  });
  it('draws nothing below zero (reduced motion before the strike)', () => {
    expect(frameOf(HIDDEN, 23)).toBe(HIDDEN); expect(frameOf(-0.5, 23)).toBe(HIDDEN);
  });
});

describe('the sheet for a screen', () => {
  it('is the 2x on 2x and 3x screens, the 1x at 1x', () => {
    expect(sheetFor(m!, 2)).toBe(m!.x2); expect(sheetFor(m!, 3)).toBe(m!.x2); expect(sheetFor(m!, 1)).toBe(m!.x1);
  });
  it('falls back to whichever ships', () => {
    expect(sheetFor({ x1: m!.x1, x2: null }, 3)).toBe(m!.x1); expect(sheetFor({ x1: null, x2: m!.x2 }, 1)).toBe(m!.x2);
  });
  it('offsets land on device pixels and scale the sheet with the cell', () => {
    const o = offsets(m!.x2!, 150, 3);
    expect(o.sheetW).toBeCloseTo(1544 * 150 / 512, 6); expect(o.sheetH).toBeCloseTo(4124 * 150 / 512, 6);
    expect(o.xs[0]).toBe(0); expect(o.ys[0]).toBe(0);
    o.xs.concat(o.ys).forEach(v => expect(Math.abs(v * 3 - Math.round(v * 3))).toBeLessThan(1e-9));
    expect(o.xs[1]).toBeCloseTo(-516 * 150 / 512, 0);
  });
});

describe('the clock and the coin (Pay by, the deposit captured, Me)', () => {
  for (const name of ['clock', 'coin'] as const) {
    const mm = momentOf(lightOf(name));
    it(`${name}: ships the light moment with both sheets, named without "@"`, () => {
      expect(mm).not.toBeNull();
      expect(mm!.x1).not.toBeNull(); expect(mm!.x2).not.toBeNull();
      expect(mm!.x1!.src).toBe(`${name}-light-sheet-1x.webp`); expect(mm!.x2!.src).toBe(`${name}-light-sheet-2x.webp`);
      for (const sh of [mm!.x1!, mm!.x2!]) expect(existsSync(join(__dirname, '..', '..', 'assets', 'scene-3d', sh.src as unknown as string))).toBe(true);
    });
    it(`${name}: is the contract, 24 frames at 60 fps, the still at 23, and lands on the last frame`, () => {
      expect(mm!.fps).toBe(60); expect(mm!.rest).toBe(23); expect(mm!.contact).toBe(23);
      expect(mm!.x1!.frames).toHaveLength(24); expect(mm!.x2!.frames).toHaveLength(24);
      expect(mm!.x1!.cell).toEqual({ w: 256, h: 256 }); expect(mm!.x2!.cell).toEqual({ w: 512, h: 512 });
      for (const sh of [mm!.x1!, mm!.x2!]) sh.frames.forEach((r, i) => {
        expect([r.x, r.y, r.w, r.h]).toEqual([(i % 3) * (sh.cell.w + sh.gap), Math.floor(i / 3) * (sh.cell.h + sh.gap), sh.cell.w, sh.cell.h]);
        expect(r.x + r.w).toBeLessThanOrEqual(sh.w); expect(r.y + r.h).toBeLessThanOrEqual(sh.h);
      });
    });
    it(`${name}: plays once in 400 ms, the contact at 383 and the still held from 400`, () => {
      const c = clock(mm!);
      expect(c.totalMs).toBeCloseTo(400, 6); expect(c.contactMs).toBeCloseTo(23000 / 60, 6); expect(c.puffMs).toBeCloseTo(1000 / 60, 6);
      expect(c.contactMs + c.puffMs).toBeCloseTo(c.totalMs, 6);
      expect(frameOf(0, mm!.rest)).toBe(0); expect(frameOf(22.99, mm!.rest)).toBe(22); expect(frameOf(23 + UNDER, mm!.rest)).toBe(23); expect(frameOf(99, mm!.rest)).toBe(23);
    });
  }
  it('the two share the hammer\'s geometry, so one player serves all three', () => {
    const a = momentOf(lightOf('clock'))!, b = momentOf(lightOf('coin'))!;
    for (const x of [a, b]) { expect([x.x2!.w, x.x2!.h]).toEqual([m!.x2!.w, m!.x2!.h]); expect(x.x2!.frames).toEqual(m!.x2!.frames); }
    expect(offsets(a.x2!, 60, 3).xs[1]).toBeCloseTo(-516 * 60 / 512, 0);
  });
});
