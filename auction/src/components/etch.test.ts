/* The etched label holds 4.5:1 against the cloud it is pressed into, measured on the sprites' own pixels.
   ETCH is read from CloudButton's source (the component imports the native runtime, which vitest cannot load).
   The floor is translucent, so each pixel is composited the way the screen composites it: the sprite over the
   page, the walls under the floor (worst case), the floor over them; then the floor is compared with the cloud. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// pngjs ships no types; the one call used here
const { PNG } = createRequire(join(__dirname, 'etch.test.ts'))('pngjs') as { PNG: { sync: { read(b: Buffer): { width: number; height: number; data: Buffer } } } };

const root = join(__dirname, '..', '..');
const src = readFileSync(join(__dirname, 'CloudButton.tsx'), 'utf8');
type Recipe = Record<string, string | number>;
const recipe = (name: string): Recipe => {
  const body = src.match(new RegExp(`\\n\\s*${name}: \\{([^}]*)\\}`))![1];
  const out: Recipe = {};
  for (const [, k, v] of body.matchAll(/(\w+): ('[^']*'|-?[\d.]+)/g)) out[k] = v.startsWith("'") ? v.slice(1, -1) : +v;
  return out;
};
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB;
const over = (t: RGB, a: number, b: RGB): RGB => [0, 1, 2].map(i => t[i] * a + b[i] * (1 - a)) as RGB;
const lum = (c: RGB) => {
  const l = c.map(v => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a: RGB, b: RGB) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** The worst ratio of a recipe's floor over every pixel of the label band (the widest label, "THAT'S ME",
    96.5 pt on a 345 pt cloud; the cap band of a 13 pt line centered in the safe zone, y 40 to 85 %). */
function worst(file: string, page: RGB, r: Recipe, floorO: number) {
  const png = PNG.sync.read(readFileSync(join(root, 'assets/cloud-button', file)));
  const { width: W, height: H, data } = png;
  const half = (96.5 / 345) * W / 2, x0 = Math.round(W / 2 - half), x1 = Math.round(W / 2 + half);
  const cy = H * 0.625, band = (9 / 88) * H, y0 = Math.round(cy - band / 2), y1 = Math.round(cy + band / 2);
  let min = Infinity;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4;
    const cloud = over([data[i], data[i + 1], data[i + 2]], data[i + 3] / 255, page);
    const walls = over(hex(r.shade as string), r.shadeO as number, over(hex(r.light as string), r.lightO as number, cloud));
    for (const under of [cloud, walls]) min = Math.min(min, ratio(over(hex(r.floor as string), floorO, under), cloud));
  }
  return min;
}

describe('the etched label', () => {
  const P = recipe('pressed'), I = recipe('ice');
  const sky = hex('#EEF2FC'), ink = hex('#1C2436');
  it.each([
    ['320/rest-2x.png', sky], ['440/rest-2x.png', sky], ['320/pressed-2x.png', sky], ['440/pressed-2x.png', sky],
    ['320/dark-2x.png', ink], ['440/dark-2x.png', ink],
  ] as const)('holds 4.5:1 on %s at rest and pressed', (file, page) => {
    expect(worst(file, page as RGB, P, P.floorO as number)).toBeGreaterThanOrEqual(4.5);
    expect(worst(file, page as RGB, P, (P.floorO as number) + (P.press as number))).toBeGreaterThanOrEqual(4.5);
  });
  it('holds 4.5:1 on the ink bar, on its lightest band, at rest and pressed', () => {
    const bar = over(hex('#E9EFFE'), 0.2, hex('#28324A'));
    for (const o of [I.floorO as number, (I.floorO as number) + (I.press as number)]) {
      const walls = over(hex(I.shade as string), I.shadeO as number, over(hex(I.light as string), I.lightO as number, bar));
      expect(ratio(over(hex(I.floor as string), o, walls), bar)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('keeps the floor within 82 to 88 % on a cloud and the walls at their brief', () => {
    expect(P.floorO).toBeGreaterThanOrEqual(0.82); expect(P.floorO).toBeLessThanOrEqual(0.88);
    expect(P.shadeO).toBeGreaterThanOrEqual(0.3); expect(P.shadeO).toBeLessThanOrEqual(0.4);
    expect(P.lightO).toBeGreaterThanOrEqual(0.55); expect(P.lightO).toBeLessThanOrEqual(0.7);
    expect(P.dIn).toBeLessThan(P.d as number);
  });
});
