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
    118.6 pt on a 345 pt cloud at 17 pt with 3.1 pt tracking; the cap band of a 17 pt line centered in the safe
    zone, y 40 to 85 %). */
function worst(file: string, page: RGB, r: Recipe, floorO: number) {
  const png = PNG.sync.read(readFileSync(join(root, 'assets/cloud-button', file)));
  const { width: W, height: H, data } = png;
  const half = (118.6 / 345) * W / 2, x0 = Math.round(W / 2 - half), x1 = Math.round(W / 2 + half);
  const cy = H * 0.625, band = (11.8 / 88) * H, y0 = Math.round(cy - band / 2), y1 = Math.round(cy + band / 2);
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

/* The carved labels (tools/cloud-3d/render_labels.py): every imprint the contract ships, laid over the sprite
   frame it sits on at its size and scale, the way the phone lays it. The floor is the glyph's solid core (the
   floor mask written beside the imprints). Each floor pixel is compared with the cloud it is read against: the
   frame's own luminance blurred at half a cap height (the surround; a letter is read against the cloud around
   it, not the one pixel under it), at rest and on the pressed frame with the press's second copy at
   IMPRINT.press. The strict ratio, against the very pixel under the floor, is printed beside it in the table. */
const labelsDir = join(root, '..', 'assets', 'cloud-3d', 'labels');
const labelsJson = join(labelsDir, 'labels.json');
const imprintPress = +src.match(/IMPRINT = \{ press: ([\d.]+)/)![1];
type Img = { width: number; height: number; data: Buffer };
const png = (f: string): Img => PNG.sync.read(readFileSync(f));
const lumOf = (c: RGB) => lum(c);
const fromLum = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
/** Gaussian blur of a luminance field (w x h), edges extended. */
function blur(f: Float64Array, w: number, h: number, sigma: number) {
  const r = Math.max(1, Math.floor(3 * sigma)), k: number[] = [];
  for (let i = -r; i <= r; i++) k.push(Math.exp(-0.5 * (i / sigma) ** 2));
  const ks = k.reduce((a, b) => a + b, 0);
  const tmp = new Float64Array(w * h), out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0; for (let i = -r; i <= r; i++) v += k[i + r] * f[y * w + Math.min(w - 1, Math.max(0, x + i))];
    tmp[y * w + x] = v / ks;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0; for (let i = -r; i <= r; i++) v += k[i + r] * tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x];
    out[y * w + x] = v / ks;
  }
  return out;
}
/** The worst floor ratios of one imprint over one frame, surround and strict (null when no floor pixel is solid). */
function carved(imprint: Img, floor: Img, frame: Img, rect: { x: number; y: number; w: number; h: number }, page: RGB, deepen: number, sigma: number) {
  // the cloud's luminance over the rect and a margin of 3 sigma, so the blur sees the cloud past the rect's edge
  const m = Math.ceil(3 * sigma), x0 = Math.max(0, rect.x - m), y0 = Math.max(0, rect.y - m);
  const x1 = Math.min(frame.width, rect.x + rect.w + m), y1 = Math.min(frame.height, rect.y + rect.h + m), W = x1 - x0, H = y1 - y0;
  const cl = new Float64Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = ((y0 + y) * frame.width + x0 + x) * 4;
    cl[y * W + x] = lumOf(over([frame.data[i], frame.data[i + 1], frame.data[i + 2]], frame.data[i + 3] / 255, page));
  }
  const sur = blur(cl, W, H, sigma);
  let min = Infinity, strict = Infinity, n = 0;
  for (let y = 0; y < imprint.height; y++) for (let x = 0; x < imprint.width; x++) {
    const j = y * imprint.width + x;
    if (floor.data[j * 4] < 128) continue;
    const i = ((rect.y + y) * frame.width + rect.x + x) * 4;
    const cloud = over([frame.data[i], frame.data[i + 1], frame.data[i + 2]], frame.data[i + 3] / 255, page);
    const t: RGB = [imprint.data[j * 4], imprint.data[j * 4 + 1], imprint.data[j * 4 + 2]], a = imprint.data[j * 4 + 3] / 255;
    let out = over(t, a, cloud);
    if (deepen) out = over(t, a * deepen, out);
    const lo = lumOf(out), k = (rect.y + y - y0) * W + rect.x + x - x0;
    min = Math.min(min, fromLum(lo, sur[k])); strict = Math.min(strict, fromLum(lo, cl[k])); n++;
  }
  return n ? { min, strict, n } : null;
}
const exists = (f: string) => { try { readFileSync(f); return true; } catch { return false; } };
/* The cloud frames. The contract's per-frame PNGs are regenerable renders and gitignored (assets/cloud-3d/.gitignore);
   the WebP beside each is committed. A frame is read from its PNG where a render left one, else decoded from the
   WebP with sharp (auction's own, else the Desk's). A tone whose frames cannot be read is skipped with the reason
   printed, never failed: a clean checkout without a decoder measures nothing rather than lying. */
type Sharp = (f: string) => { ensureAlpha(): { raw(): { toBuffer(o: { resolveWithObject: true }): Promise<{ data: Buffer; info: { width: number; height: number; channels: number } }> } } };
const sharp: Sharp | null = (() => {
  for (const base of [join(root, 'package.json'), join(root, '..', 'desk', 'package.json')]) {
    try { return createRequire(base)('sharp') as Sharp; } catch { /* the next */ }
  }
  return null;
})();
const frameSource = (stem: string): string | null =>
  exists(`${stem}.png`) ? `${stem}.png` : sharp && exists(`${stem}.webp`) ? `${stem}.webp` : null;
async function frame(f: string): Promise<Img> {
  if (f.endsWith('.png')) return png(f);
  const { data, info } = await sharp!(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`${f}: ${info.channels} channels`);
  return { width: info.width, height: info.height, data };
}
const L = exists(labelsJson) ? JSON.parse(readFileSync(labelsJson, 'utf8')) as {
  surround_of_cap: number;
  sizes: Record<string, Record<string, { canvas: { w: number }; rect: { x: number; y: number; w: number; h: number } }>>;
  labels: Record<string, { text: string; cap_of_canvas_w: number }>;
} : null;
const rows = L ? Object.keys(L.labels).flatMap(slug => (['light', 'dark'] as const).map(tone => [slug, tone] as const)) : [];
const btnDir = (tone: string, size: string) => join(root, '..', 'assets', 'cloud-3d', 'button', tone, size);
/** Why a tone's frames cannot be read, or null when every rest and pressed frame has a source. */
const missing = (tone: string) => {
  for (const size of ['320', '440', '640']) for (const sfx of ['', '@2x']) for (const n of ['rest', 'pressed']) {
    const stem = join(btnDir(tone, size), `${n}${sfx}`);
    if (!frameSource(stem)) return exists(`${stem}.webp`) ? `${stem}.png is not rendered and no sharp is installed to decode its WebP` : `${stem}.png and .webp are both absent`;
  }
  return null;
};
const why = { light: L ? missing('light') : null, dark: L ? missing('dark') : null };
for (const [tone, w] of Object.entries(why)) if (w) console.log(`etch.test: the carved labels on ${tone} are skipped: ${w}`);
const table: string[] = [];
const f2 = (v?: number) => (v == null ? '-' : v.toFixed(2));

describe.skipIf(!L)('the carved labels', () => {
  const title = '%s (%s) holds a 4.5:1 floor against its cloud at every size, at rest and pressed';
  it.skip.each(rows.filter(([, tone]) => why[tone]))(title, () => {});   // the reason is printed above
  it.each(rows.filter(([, tone]) => !why[tone]))(title, async (slug, tone) => {
    const page = tone === 'dark' ? hex('#1C2436') : hex('#EEF2FC');
    let solid = 0;
    for (const size of ['320', '440', '640']) for (const k of ['1', '2']) {
      const scale = `@${k}x`, sfx = k === '2' ? '@2x' : '';
      const { rect, canvas } = L!.sizes[size][scale];
      const sigma = L!.surround_of_cap * L!.labels[slug].cap_of_canvas_w * canvas.w;
      const imprint = png(join(labelsDir, tone, size, `${slug}${scale}.png`));
      const floor = png(join(labelsDir, size, `${slug}-floor${scale}.png`));
      expect([imprint.width, imprint.height]).toEqual([rect.w, rect.h]);
      const btn = btnDir(tone, size);
      const rest = carved(imprint, floor, await frame(frameSource(join(btn, `rest${sfx}`))!), rect, page, 0, sigma);
      const pressed = carved(imprint, floor, await frame(frameSource(join(btn, `pressed${sfx}`))!), rect, page, imprintPress, sigma);
      table.push(`| ${L!.labels[slug].text} | ${tone} | ${size}${scale} | ${f2(rest?.min)} | ${f2(pressed?.min)} | ${f2(rest?.strict)} | ${rest?.n ?? 0} |`);
      if (!rest || !pressed) continue;   // a 1x stroke with no solid pixel: the 2x of the same size carries it
      solid++;
      expect(rest.min).toBeGreaterThanOrEqual(4.5);
      expect(pressed.min).toBeGreaterThanOrEqual(4.5);
    }
    expect(solid).toBeGreaterThanOrEqual(3);   // every size measured at 2x at least
  });
  it.runIf(!!process.env.ETCH_TABLE)('prints the table', () => {
    console.log(['| label | tone | size | rest | pressed | strict (rest) | floor px |', '| --- | --- | --- | --- | --- | --- | --- |', ...table].join('\n'));
  });
});
