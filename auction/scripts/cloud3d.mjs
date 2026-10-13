#!/usr/bin/env node
/* The 3D cloud contract, made static for Metro.
   Metro bundles only what a literal require() names, so the app cannot look for files at run time. This
   script reads the Blender contract (default: <repo>/assets/cloud-3d, or --from <dir>), copies the subset the
   app ships into auction/assets/cloud-3d (button sheets at 320 and 440, @2x only; the sky layers), and writes
   src/components/cloud3d.ts with literal requires and the sheet geometry inlined. With no contract present it
   writes the empty manifest, and every surface falls back (CloudButton: the photographic sprites, then the
   ink bar; Sky: the cloud-layers set). Run it after every Blender render:
     node scripts/cloud3d.mjs              # from the contract
     node scripts/cloud3d.mjs --from DIR   # from another tree (a stub)
     node scripts/cloud3d.mjs --none       # the empty manifest
     node scripts/cloud3d.mjs --dark       # also the dark lane's button sheets and sky (no screen draws them today)
   The contract's spelling (tools/cloud-3d/README.md): sheet@2x.png with sheet@2x.json beside it, 3 columns by 8
   rows, a 4 px gap the rects exclude, rest 23, pressed 5, the phases and the fps in the json.
   Nothing under the contract directory is ever written. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');
const args = process.argv.slice(2);
const none = args.includes('--none');
const TONES = args.includes('--dark') ? ['light', 'dark'] : ['light'];   // only what a screen draws ships
const fromIx = args.indexOf('--from');
const src = fromIx >= 0 ? path.resolve(args[fromIx + 1]) : path.resolve(app, '..', 'assets', 'cloud-3d');
const dst = path.join(app, 'assets', 'cloud-3d');
const out = path.join(app, 'src', 'components', 'cloud3d.ts');

const pngSize = f => { const b = fs.readFileSync(f); if (b.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${f}: not a PNG`); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const webpSize = f => {
  const b = fs.readFileSync(f); const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8L') { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
};
/* The contract names files "at @1x/@2x" without fixing the spelling; accept the three that are plausible. */
const pick2x = (dir, name, ext) => [`${name}@2x.${ext}`, path.join('@2x', `${name}.${ext}`), `${name}.${ext}`]
  .map(n => path.join(dir, n)).find(f => fs.existsSync(f));

fs.rmSync(dst, { recursive: true, force: true });
const found = [];
const button = { light: {}, dark: {} };
const sky = { light: null, dark: null };

if (!none && fs.existsSync(src)) {
  for (const tone of TONES) for (const set of ['320', '440']) {
    const dir = path.join(src, 'button', tone, set);
    const sheet = pick2x(dir, 'sheet', 'png'), json = pick2x(dir, 'sheet', 'json');
    if (!sheet || !json) continue;
    const meta = JSON.parse(fs.readFileSync(json, 'utf8'));
    const px = pngSize(sheet);
    // frames in sheet pixels; a json written at @1x against an @2x png is scaled up
    const extent = Math.max(...meta.frames.map(f => f.x + f.w));
    const k = extent < px.w * 0.75 ? px.w / extent : 1;
    const sc = r => ({ x: Math.round(r.x * k), y: Math.round(r.y * k), w: Math.round(r.w * k), h: Math.round(r.h * k) });
    const frames = meta.frames.map(sc);
    if (frames.length < 24) throw new Error(`${json}: ${frames.length} frames, the contract says 24`);
    const rest = meta.rest ?? frames.length - 1, pressed = meta.pressed ?? 5;
    if (!(rest > pressed && rest < frames.length)) throw new Error(`${json}: rest ${rest}, pressed ${pressed}`);
    const to = path.join(dst, 'button', tone, set); fs.mkdirSync(to, { recursive: true });
    // the player needs the sheet and the two shadows; rest and pressed are frames of the sheet already
    const files = {};
    for (const n of ['shadow-rest', 'shadow-pressed']) { const f = pick2x(dir, n, 'png'); if (f) files[n] = f; }
    for (const [n, f] of Object.entries(files)) fs.copyFileSync(f, path.join(to, `${n}-2x.png`));
    // the sheet ships as WebP (ffmpeg libwebp, yuva420p, q82, method 6: the contract's own WebP settings), about
    // 30 percent under the contract's palette PNG; PNG if ffmpeg is absent
    const webp = path.join(to, 'sheet-2x.webp');
    const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', sheet, '-c:v', 'libwebp', '-pix_fmt', 'yuva420p', '-quality', '82', '-compression_level', '6', webp]);
    const sheetExt = ff.status === 0 && fs.existsSync(webp) ? 'webp' : 'png';
    if (sheetExt === 'png') fs.copyFileSync(sheet, path.join(to, 'sheet-2x.png'));
    files.sheet = sheet;
    const sh = files['shadow-rest'] ? pngSize(files['shadow-rest']) : null;
    button[tone][set] = {
      frameW: Math.round((meta.frameW ?? frames[0].w) * k), frameH: Math.round((meta.frameH ?? frames[0].h) * k),
      sheetW: px.w, sheetH: px.h, frames, safe: sc(meta.safe ?? { x: 0, y: 0, w: frames[0].w / k, h: frames[0].h / k }),
      shadowW: sh?.w ?? null, shadowH: sh?.h ?? null, files: Object.keys(files), sheetExt,
      gap: Math.round((meta.gap ?? 0) * k), rest, pressed, fps: meta.fps ?? 60,
      phases: meta.phases ?? { sink: [0, pressed], puff: [pressed + 1, 15], settle: [16, rest] },
    };
    found.push(`button/${tone}/${set}`);
  }
  for (const tone of TONES) {
    const dir = path.join(src, 'sky', tone);
    const layers = ['far', 'mid', 'near'].map(n => [n, pick2x(dir, n, 'webp')]);
    if (layers.some(([, f]) => !f)) continue;
    const to = path.join(dst, 'sky', tone); fs.mkdirSync(to, { recursive: true });
    sky[tone] = {};
    for (const [n, f] of layers) { fs.copyFileSync(f, path.join(to, `${n}-2x.webp`)); sky[tone][n] = webpSize(f); }
    found.push(`sky/${tone}`);
  }
}

/* The label imprints (tools/cloud-3d/render_labels.py): the carve of each label rendered in Cycles, as a
   transparent layer cut to the safe rect, plus its lit lip alone. @2x at 320 and 440, keyed by the label in
   capitals; the rect is in the set's sheet pixels, the same space as the sheet's safe rect. */
const labels = { light: {}, dark: {} };
const labelsJson = path.join(src, 'labels', 'labels.json');
if (!none && fs.existsSync(labelsJson)) {
  const L = JSON.parse(fs.readFileSync(labelsJson, 'utf8'));
  for (const tone of TONES) for (const set of ['320', '440']) {   // a label ships with its tone's sheet
    const rect = L.sizes?.[set]?.['@2x']?.rect;
    if (!rect) continue;
    const entries = {};
    for (const [slug, meta] of Object.entries(L.labels)) {
      const f = path.join(src, 'labels', tone, set, `${slug}@2x.png`);
      if (!fs.existsSync(f)) continue;
      const lip = path.join(src, 'labels', tone, set, `${slug}-lip@2x.png`);
      const to = path.join(dst, 'labels', tone, set); fs.mkdirSync(to, { recursive: true });
      fs.copyFileSync(f, path.join(to, `${slug}-2x.png`));
      if (fs.existsSync(lip)) fs.copyFileSync(lip, path.join(to, `${slug}-lip-2x.png`));
      const px = pngSize(f);
      if (px.w !== rect.w || px.h !== rect.h) throw new Error(`${f}: ${px.w}x${px.h}, the rect is ${rect.w}x${rect.h}`);
      entries[meta.caps] = { slug, lip: fs.existsSync(lip) };
    }
    if (Object.keys(entries).length) { labels[tone][set] = { rect, entries }; found.push(`labels/${tone}/${set} (${Object.keys(entries).length})`); }
  }
}

const rel = p => `require('../../assets/cloud-3d/${p}')`;
const req = (tone, set, n) => rel(`button/${tone}/${set}/${n}-2x.png`);
const buttonSrc = tone => `{${Object.entries(button[tone]).map(([set, m]) => `
    '${set}': {
      sheet: ${rel(`button/${tone}/${set}/sheet-2x.${m.sheetExt}`)},
      shadowRest: ${m.files.includes('shadow-rest') ? req(tone, set, 'shadow-rest') : 'null'},
      shadowPressed: ${m.files.includes('shadow-pressed') ? req(tone, set, 'shadow-pressed') : 'null'},
      frameW: ${m.frameW}, frameH: ${m.frameH}, sheetW: ${m.sheetW}, sheetH: ${m.sheetH},
      shadowW: ${m.shadowW}, shadowH: ${m.shadowH},
      gap: ${m.gap}, rest: ${m.rest}, pressed: ${m.pressed}, fps: ${m.fps}, phases: ${JSON.stringify(m.phases)},
      safe: ${JSON.stringify(m.safe)},
      frames: ${JSON.stringify(m.frames)},
    },`).join('')}
  }`;
const labelSrc = tone => `{${Object.entries(labels[tone]).map(([set, m]) => `
    '${set}': { rect: ${JSON.stringify(m.rect)}, labels: {${Object.entries(m.entries).map(([caps, e]) => `
      ${JSON.stringify(caps)}: { src: ${rel(`labels/${tone}/${set}/${e.slug}-2x.png`)}, lip: ${e.lip ? rel(`labels/${tone}/${set}/${e.slug}-lip-2x.png`) : 'null'} },`).join('')}
    } },`).join('')}
  }`;
const skySrc = tone => sky[tone] ? `{ ${['far', 'mid', 'near'].map(n => `${n}: { src: ${rel(`sky/${tone}/${n}-2x.webp`)}, w: ${sky[tone][n].w}, h: ${sky[tone][n].h} }`).join(', ')} }` : 'null';

fs.writeFileSync(out, `/* GENERATED by scripts/cloud3d.mjs from ${none || !found.length ? 'nothing (the contract is absent: every surface falls back)' : path.relative(app, src)}. Do not edit.
   Found: ${found.length ? found.join(', ') : 'none'}. */
export type Rect = { x: number; y: number; w: number; h: number };
export type Sheet3D = {
  sheet: number; shadowRest: number | null; shadowPressed: number | null;
  frameW: number; frameH: number; sheetW: number; sheetH: number; shadowW: number | null; shadowH: number | null;
  /** the transparent gap between frames (the rects exclude it), the rest and pressed frames, the playback rate */
  gap: number; rest: number; pressed: number; fps: number;
  phases: { sink: [number, number]; puff: [number, number]; settle: [number, number] };
  safe: Rect; frames: Rect[];
};
export type SkyLayer3D = { src: number; w: number; h: number };
export type Sky3D = { far: SkyLayer3D; mid: SkyLayer3D; near: SkyLayer3D };

export const BUTTON_3D: { light: Partial<Record<'320' | '440', Sheet3D>>; dark: Partial<Record<'320' | '440', Sheet3D>> } = {
  light: ${buttonSrc('light')},
  dark: ${buttonSrc('dark')},
};
export const SKY_3D: { light: Sky3D | null; dark: Sky3D | null } = { light: ${skySrc('light')}, dark: ${skySrc('dark')} };

/** A label carved into the cloud: the imprint and its lit lip, laid over any frame of the sheet at rect. */
export type Label3D = { src: number; lip: number | null };
export type LabelSet3D = { rect: Rect; labels: Record<string, Label3D> };
export const LABELS_3D: { light: Partial<Record<'320' | '440', LabelSet3D>>; dark: Partial<Record<'320' | '440', LabelSet3D>> } = {
  light: ${labelSrc('light')},
  dark: ${labelSrc('dark')},
};
`);
console.log(`cloud3d: ${found.length ? found.join(', ') : 'none (fallback manifest)'}`);
if (fs.existsSync(dst)) {
  let bytes = 0; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { bytes += fs.statSync(p).size; console.log(`  ${path.relative(dst, p)} ${fs.statSync(p).size}`); } } };
  walk(dst); console.log(`cloud3d: ${bytes} bytes shipped`);
}
