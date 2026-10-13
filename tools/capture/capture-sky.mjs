#!/usr/bin/env node
// capture-sky.mjs <url> <out-dir> [--init file.js]... [--stub url-glob]... [--settle ms] [--scroll px] [--scale n] [--fps n]
// Six seconds of the first viewport at 1440x900 on the stepped page clock (vclock.js): the sky drifts
// while the page scrolls slowly and linearly (--scroll px over the six seconds, default 360), so the
// parallax shows. Writes <out-dir>/sky.mp4 (sky.webm without ffmpeg), strip.png (0, 2, 4, 6 s),
// frames/ (every frame, named by ms) and meta.json.
import fs from 'node:fs';
import path from 'node:path';
import { launch, FFMPEG, VCLOCK, opts, prepare, settle, run, freeze, step, shoot, frameAt, dumpFrames, encode, strip } from './lib.mjs';

const { pos, o } = opts(process.argv.slice(2));
const [url, outDir] = pos;
if (!url || !outDir) { console.error('usage: capture-sky.mjs <url> <out-dir> [--init f.js] [--stub glob] [--settle ms] [--scroll px] [--scale n] [--fps n]'); process.exit(2); }
const W = 1440, H = 900, S = Number(o.scale ?? 1), DUR = 6000, SCROLL = Number(o.scroll ?? 360), FPS = Number(o.fps ?? 10);
fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true });
const started = Date.now();
const browser = await launch();
try {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: S, ...(FFMPEG ? {} : { recordVideo: { dir: outDir, size: { width: W, height: H } } }) });
  await ctx.addInitScript({ path: VCLOCK });
  await prepare(ctx, o);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await settle(page, Number(o.settle ?? 4000));
  await page.evaluate(() => scrollTo(0, 0));
  await page.mouse.move(W - 4, H - 4);
  await run(page, 600);
  const facts = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas').length, cloud3d: !!window.OCLOUD3D,
    webgl2: (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })() }));
  await freeze(page);
  const times = [...new Set([...Array.from({ length: Math.floor(DUR * FPS / 1000) + 1 }, (_, i) => +(i * 1000 / FPS).toFixed(3)), 0, 2000, 4000, 6000])].sort((a, b) => a - b);
  const frames = []; let prev = 0;
  for (const t of times) {
    await page.evaluate(y => scrollTo(0, y), SCROLL * t / DUR);
    await step(page, t - prev); prev = t;              // step() lets the browser dispatch the scroll first
    await page.evaluate(() => window.__vclock.nativeFrame());
    frames.push({ ts: t, buf: await shoot(page) });
  }
  const written = dumpFrames(frames, path.join(outDir, 'frames'), 0);
  const tiles = [0, 2000, 4000, 6000].map(ms => ({ buf: frameAt(frames, ms).buf, time: `${ms / 1000} s`, phase: `scrolled ${Math.round(SCROLL * ms / DUR)} px` }));
  await strip(tiles, path.join(outDir, 'strip.png'), { tileH: 540, scale: 2 });
  let video = null;
  const vframes = written.filter(f => Math.abs(f.ts * FPS / 1000 - Math.round(f.ts * FPS / 1000)) < 1e-3);
  if (FFMPEG) video = encode(vframes, path.join(outDir, 'sky.mp4'));
  await page.close(); await ctx.close();
  if (!FFMPEG) { const v = fs.readdirSync(outDir).find(f => f.endsWith('.webm')); if (v) { fs.renameSync(path.join(outDir, v), path.join(outDir, 'sky.webm')); video = path.join(outDir, 'sky.webm'); } }
  const meta = { url, viewport: { width: W, height: H, deviceScaleFactor: S }, scrollPx: SCROLL, durationMs: DUR, fps: FPS, frames: frames.length, video, page: facts, pageErrors: errors, seconds: Math.round((Date.now() - started) / 1000) };
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(`sky: ${frames.length} frames in ${meta.seconds} s; webgl2 ${facts.webgl2}, canvases ${facts.canvases}, cloud3d ${facts.cloud3d} -> ${outDir}`);
} finally { await browser.close(); }
