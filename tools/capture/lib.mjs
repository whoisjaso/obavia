// Shared pieces for the motion capture tools: browser launch, the stepped page clock (vclock.js),
// frame shots, video encoding (ffmpeg when present) and labelled frame strips (sharp).
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const AUCTION_NM = '/home/user/obavia/auction/node_modules/';
const req = createRequire(import.meta.url);
// NODE_PATH first, then the repo's own node_modules (Playwright lives in auction/, sharp in desk/)
const ROOTS = [AUCTION_NM, '/home/user/obavia/desk/node_modules/', '/home/user/obavia/auction/worker/node_modules/'];
const load = name => { try { return req(name); } catch {} for (const r of ROOTS) { try { return createRequire(r)(name); } catch {} } throw new Error(`capture: ${name} not found on NODE_PATH or in ${ROOTS.join(', ')}`); };
export const { chromium } = load('playwright');
export const sharp = load('sharp');

export const CHROMIUM = process.env.CAPTURE_CHROMIUM || '/opt/pw-browsers/chromium';
export const FFMPEG = (() => { const r = spawnSync('sh', ['-c', 'command -v ffmpeg']); return r.status === 0 ? r.stdout.toString().trim() : null; })();

export const VIEWPORTS = {
  mobile: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
};

export function launch() {
  return chromium.launch({
    executablePath: CHROMIUM,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
  });
}

/** Parse `--key value` and `--flag` options after the positional arguments. */
export function opts(argv) {
  const pos = [], o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1]; if (v === undefined || v.startsWith('--')) o[k] = true; else { (o[k] ??= []).push(v); i++; } }
    else pos.push(a);
  }
  for (const k in o) if (Array.isArray(o[k]) && o[k].length === 1) o[k] = o[k][0];
  return { pos, o };
}
export const list = v => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Apply --init <file.js> scripts and --stub <url-glob> (answered 404) to a context. */
export async function prepare(ctx, o) {
  for (const f of list(o.init)) await ctx.addInitScript({ path: path.resolve(f) });
  for (const g of list(o.stub)) await ctx.route(g, r => r.fulfill({ status: 404, contentType: 'text/plain', body: 'stubbed by capture' }));
}

/** Fonts in and load fired, then the page clock is frozen and stepped 200 ms at a time (under GSAP's
 *  500 ms lag threshold, so entrances run at their real speed however slow the GPU) until `ms` of page
 *  time has passed and the shell (shell.js) has landed, at most 20 s of page time. */
export async function settle(page, ms) {
  await page.waitForLoadState('load').catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await freeze(page);
  await run(page, ms);
}
/** Step the frozen page clock through `ms` of page time, then on until the shell has landed. */
export async function run(page, ms, cap = 20000) {
  for (let t = 0; t < cap; t += 200) {
    if (t >= ms && await page.evaluate(() => !window.OSHELL || !!window.OSHELL.landed)) return t;
    await step(page, 200);
  }
  return cap;
}

export const VCLOCK = new URL('./vclock.js', import.meta.url).pathname;

/** Freeze the page clock (vclock.js); returns the page time it froze at. */
export const freeze = page => page.evaluate(() => window.__vclock.freeze());
/** Advance the page clock by dt ms, letting the browser dispatch what it queued first. */
export async function step(page, dt) {
  await page.evaluate(() => window.__vclock.nativeFrame());
  if (dt > 0) await page.evaluate(d => window.__vclock.step(d), dt);
}
/** One viewport frame at the page's current time, as a jpeg buffer. */
export const shoot = page => page.screenshot({ type: 'jpeg', quality: 93, animations: 'allow', caret: 'initial', scale: 'device' });

/** The frame at time t: the latest frame at or before t. */
export function frameAt(frames, t) {
  let best = frames[0];
  for (const f of frames) { if (f.ts <= t + 0.01) best = f; else break; }
  return best;
}

/** Write every frame to dir as <ms from t0>.jpg; returns the written list. */
export function dumpFrames(frames, dir, t0) {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  return frames.map((f, i) => {
    const ms = Math.round(f.ts - t0);  // ts is page time in ms
    const file = path.join(dir, `${String(i).padStart(4, '0')}_${ms < 0 ? 'm' + -ms : ms}ms.jpg`);
    fs.writeFileSync(file, f.buf);
    return { ...f, file, ms };
  });
}

/** Encode the frames at their real timing (concat demuxer durations) to mp4; optional crop in pixels. */
export function encode(written, out, crop) {
  if (!FFMPEG || written.length < 2) return null;
  const list = out + '.txt';
  const lines = [];
  for (let i = 0; i < written.length; i++) {
    const d = i + 1 < written.length ? Math.max(1, written[i + 1].ts - written[i].ts) / 1000 : 0.4;
    lines.push(`file '${written[i].file}'`, `duration ${d.toFixed(4)}`);
  }
  lines.push(`file '${written[written.length - 1].file}'`);
  fs.writeFileSync(list, lines.join('\n'));
  const vf = [crop ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}` : null, 'scale=trunc(iw/2)*2:trunc(ih/2)*2', 'fps=60'].filter(Boolean).join(',');
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', out]);
  fs.rmSync(list);
  return out;
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** A horizontal strip: each tile is { buf, time, phase }, all scaled to the same height, a label band on top. */
export async function strip(tiles, out, { tileH, gap = 16, band = 72, scale = 2 } = {}) {
  const imgs = [];
  for (const t of tiles) {
    const img = sharp(t.buf).resize({ height: tileH, kernel: 'lanczos3' });
    const { data, info } = await img.png().toBuffer({ resolveWithObject: true });
    imgs.push({ data, w: info.width, t });
  }
  const W = imgs.reduce((s, i) => s + i.w, 0) + gap * (imgs.length + 1), H = tileH + band + gap * 2;
  const comps = []; let x = gap;
  for (const i of imgs) {
    const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${i.w}" height="${band}">
      <text x="2" y="${Math.round(band * 0.42)}" font-family="DejaVu Sans" font-weight="700" font-size="${13 * scale}" fill="#14213a">${esc(i.t.time)}</text>
      <text x="2" y="${Math.round(band * 0.82)}" font-family="DejaVu Sans" font-size="${11 * scale}" fill="#3d5577">${esc(i.t.phase)}</text></svg>`);
    comps.push({ input: label, left: x, top: gap }, { input: i.data, left: x, top: gap + band });
    x += i.w + gap;
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: '#eef3f8' } }).composite(comps).png().toFile(out);
  return out;
}
