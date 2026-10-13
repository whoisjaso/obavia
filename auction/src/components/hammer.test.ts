/* The hammer moment: the shipped sheets match the contract, the clock puts the strike at frame 6 at 100 ms and the
   whole fall at 400 ms, the 2x sheet is chosen on 2x screens, and the window offsets land on device pixels. The
   manifest is read as text (scene3d.ts requires WebP, which vitest cannot load), the way etch.test reads ETCH. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HIDDEN, UNDER, clock, frameOf, offsets, sheetFor } from './hammer';
import type { MomentSheet } from './scene3d';

const src = readFileSync(join(__dirname, 'scene3d.ts'), 'utf8');
const light = src.match(/hammer: \{\s*light: \{ contact: (\d+), fps: (\d+), rest: (\d+), x1: (\{.*?\}|null), x2: (\{.*?\}|null) \},/s);
const sheet = (s: string): MomentSheet | null => {
  if (s === 'null') return null;
  const file = s.match(/require\('\.\.\/\.\.\/assets\/scene-3d\/([^']+)'\)/)![1];
  const [, w, h] = s.match(/w: (\d+), h: (\d+)/)!;
  const cell = JSON.parse(s.match(/cell: (\{[^}]*\})/)![1]);
  const gap = +s.match(/gap: (\d+)/)![1];
  const frames = JSON.parse(s.match(/frames: (\[.*\])/)![1]);
  return { src: file as unknown as number, w: +w, h: +h, cell, gap, frames };
};
const m = light ? { contact: +light[1], fps: +light[2], rest: +light[3], x1: sheet(light[4]), x2: sheet(light[5]) } : null;

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
