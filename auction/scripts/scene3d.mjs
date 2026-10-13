#!/usr/bin/env node
/* The car objects (tools/scene-3d, DOCTRINE §5), made static for Metro and for the public site.
   Metro bundles only what a literal require() names, so this script reads the published renders
   (default <repo>/assets/scene-3d, or --from <dir>), copies the subset each surface draws, and writes
   src/components/scene3d.ts with literal requires and each canvas size inlined. Run it after every render:
     node scripts/scene3d.mjs              # from the renders
     node scripts/scene3d.mjs --from DIR   # from another tree
     node scripts/scene3d.mjs --none       # the empty manifest: every Object3D draws nothing
   The phone ships @2x WebP only (auction/assets/scene-3d/<name>-<tone>-2x.webp). The site ships WebP at
   @1x and @2x with an @1x PNG fallback (obavia-co/assets/scene-3d/<name>-<tone>[-2x].{webp,png}); no "@" in a
   site name, because the site Worker's /assets/ branch serves [\w./-] only (deploy/site/live-worker.js).
   The moments (the hammer) ship their 24-frame sheets at 1x and 2x as WebP (ffmpeg libwebp, the contract's own
   settings; PNG if ffmpeg is absent), auction/assets/scene-3d/<name>-<tone>-sheet-{1x,2x}.webp, with each sheet's
   frame rects inlined so the player (src/components/Hammer.tsx) picks the sheet for the screen's pixel ratio.
   Nothing under the renders directory is ever written. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');
const repo = path.resolve(app, '..');
const args = process.argv.slice(2);
const none = args.includes('--none');
const fromIx = args.indexOf('--from');
const src = fromIx >= 0 ? path.resolve(args[fromIx + 1]) : path.join(repo, 'assets', 'scene-3d');
const dst = path.join(app, 'assets', 'scene-3d');
const site = path.join(repo, 'obavia-co', 'assets', 'scene-3d');
const out = path.join(app, 'src', 'components', 'scene3d.ts');

/* Only what a screen draws ships (lego.md §4, touching):
   the car on the ink lane (Lane, empty); the licence, the insurance card, the title, the coin, the key and
   the plate on the sky (Won's tiles; Pickup's key; Plates' plate; Paper's title). The pass tile stays home:
   behind the real QR it is a second code that scans as nothing (judged on the Pickup capture). */
const PHONE = { car: ['dark'], licence: ['light'], insurance: ['light'], title: ['light'], coin: ['light'], key: ['light'], plate: ['light'] };
/* The site: the car in the film frame, the title by the collateral line, the coin by the $250 lines, the
   licence card by the buyer page's licence pair. */
const SITE = { car: ['light'], title: ['light'], coin: ['light'], licence: ['light'] };
/* The moments a screen plays (DOCTRINE §5): the hammer falling into the house cumulus on Won, light on the sky.
   `contact` is the frame the object lands on (the hammer's head meets the cloud at 6: frames/005 is still in the
   air, 006 touches), where the sound and the haptic fire. The json's own `moment` line says the same in words. */
const MOMENTS = { hammer: { tones: ['light'], contact: 6 } };

const pngSize = f => { const b = fs.readFileSync(f); if (b.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${f}: not a PNG`); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const webpSize = f => {
  const b = fs.readFileSync(f); const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8L') { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
};

fs.rmSync(dst, { recursive: true, force: true });
const found = {};
const sizes = {};
const moments = {};
let phoneBytes = 0, siteBytes = 0;
/* One sheet at one scale: the png read for its size, its json for the rects (the rects exclude the gap), the
   sheet re-encoded as WebP next to the stills. Returns the manifest entry, or null when the scale is absent. */
const sheetAt = (dir, scale, name, tone) => {
  const suffix = scale === 1 ? '' : `@${scale}x`;
  const png = path.join(dir, `sheet${suffix}.png`), json = path.join(dir, `sheet${suffix}.json`);
  if (!fs.existsSync(png) || !fs.existsSync(json)) return null;
  const meta = JSON.parse(fs.readFileSync(json, 'utf8'));
  const px = pngSize(png);
  const frames = meta.frames.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
  if (frames.length !== 24) throw new Error(`${json}: ${frames.length} frames, the contract says 24`);
  const extent = Math.max(...frames.map(r => r.x + r.w));
  if (extent > px.w) throw new Error(`${json}: rects reach ${extent} px, the sheet is ${px.w} wide`);
  const base = `${name}-${tone}-sheet-${scale}x`;
  const webp = path.join(dst, `${base}.webp`);
  const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-c:v', 'libwebp', '-pix_fmt', 'yuva420p', '-quality', '82', '-compression_level', '6', webp]);
  const ext = ff.status === 0 && fs.existsSync(webp) ? 'webp' : 'png';
  if (ext === 'png') fs.copyFileSync(png, path.join(dst, `${base}.png`));
  phoneBytes += fs.statSync(path.join(dst, `${base}.${ext}`)).size;
  return { file: `${base}.${ext}`, w: px.w, h: px.h, cell: { w: frames[0].w, h: frames[0].h }, gap: meta.gap ?? 0, fps: meta.fps ?? 60, rest: meta.rest ?? 23, frames };
};
if (!none && fs.existsSync(src)) {
  for (const [name, tones] of Object.entries(PHONE)) for (const tone of tones) {
    const f = path.join(src, name, tone, 'still@2x.webp');
    if (!fs.existsSync(f)) continue;
    fs.mkdirSync(dst, { recursive: true });
    const to = path.join(dst, `${name}-${tone}-2x.webp`);
    fs.copyFileSync(f, to);
    phoneBytes += fs.statSync(to).size;
    (found[name] ??= []).push(tone);
    sizes[name] = webpSize(f);
  }
  for (const [name, { tones, contact }] of Object.entries(MOMENTS)) for (const tone of tones) {
    const dir = path.join(src, name, tone);
    if (!fs.existsSync(dir)) continue;
    fs.mkdirSync(dst, { recursive: true });
    const x1 = sheetAt(dir, 1, name, tone), x2 = sheetAt(dir, 2, name, tone);
    if (!x1 && !x2) continue;
    if (x1 && x2 && (x1.fps !== x2.fps || x1.rest !== x2.rest)) throw new Error(`${name}/${tone}: the 1x and 2x sheets disagree on fps or rest`);
    ((moments[name] ??= {})[tone] = { contact, fps: (x1 ?? x2).fps, rest: (x1 ?? x2).rest, x1, x2 });
  }
  fs.rmSync(site, { recursive: true, force: true });
  for (const [name, tones] of Object.entries(SITE)) for (const tone of tones) {
    const files = [['still.webp', `${name}-${tone}.webp`], ['still@2x.webp', `${name}-${tone}-2x.webp`], ['still.png', `${name}-${tone}.png`]];
    if (files.some(([f]) => !fs.existsSync(path.join(src, name, tone, f)))) continue;
    fs.mkdirSync(site, { recursive: true });
    for (const [f, n] of files) { fs.copyFileSync(path.join(src, name, tone, f), path.join(site, n)); siteBytes += fs.statSync(path.join(site, n)).size; }
  }
}

const names = Object.keys(found);
const momentNames = Object.keys(moments);
const sheetTs = sh => sh ? `{ src: require('../../assets/scene-3d/${sh.file}'), w: ${sh.w}, h: ${sh.h}, cell: ${JSON.stringify(sh.cell)}, gap: ${sh.gap}, frames: ${JSON.stringify(sh.frames)} }` : 'null';
fs.writeFileSync(out, `/* GENERATED by scripts/scene3d.mjs from ${names.length || momentNames.length ? path.relative(app, src) : 'nothing (the renders are absent: every Object3D draws nothing)'}. Do not edit.
   The car objects (tools/scene-3d), @2x WebP; w and h are the canvas in pixels (the object fills 86 percent of it).
   The moments: 24-frame sheets at 1x and 2x, each with its own rects in its own pixels (the rects exclude the gap);
   \`contact\` is the frame the object lands on, \`rest\` the still it holds. */
export type SceneName = 'car' | 'licence' | 'insurance' | 'title' | 'coin' | 'key' | 'plate';
export type SceneTone = 'light' | 'dark';
export type Scene3D = { w: number; h: number; light?: number; dark?: number };
export type MomentName = 'hammer';
export type Rect = { x: number; y: number; w: number; h: number };
export type MomentSheet = { src: number; w: number; h: number; cell: { w: number; h: number }; gap: number; frames: Rect[] };
export type Moment3D = { contact: number; fps: number; rest: number; x1: MomentSheet | null; x2: MomentSheet | null };

export const SCENE_3D: Partial<Record<SceneName, Scene3D>> = {${names.map(n => `
  ${n}: { w: ${sizes[n].w}, h: ${sizes[n].h}, ${found[n].map(t => `${t}: require('../../assets/scene-3d/${n}-${t}-2x.webp')`).join(', ')} },`).join('')}
};

export const MOMENT_3D: Partial<Record<MomentName, Partial<Record<SceneTone, Moment3D>>>> = {${momentNames.map(n => `
  ${n}: {${Object.entries(moments[n]).map(([t, m]) => `
    ${t}: { contact: ${m.contact}, fps: ${m.fps}, rest: ${m.rest}, x1: ${sheetTs(m.x1)}, x2: ${sheetTs(m.x2)} },`).join('')}
  },`).join('')}
};
`);
console.log(`scene3d: ${names.length ? names.map(n => `${n} (${found[n].join(', ')})`).join(', ') : 'none (empty manifest)'}`);
console.log(`scene3d: moments ${momentNames.length ? momentNames.map(n => `${n} (${Object.entries(moments[n]).map(([t, m]) => `${t}: ${[m.x1 && '1x', m.x2 && '2x'].filter(Boolean).join(' and ')}`).join(', ')})`).join(', ') : 'none'}`);
console.log(`scene3d: phone ${phoneBytes} bytes, site ${siteBytes} bytes`);
