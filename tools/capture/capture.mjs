#!/usr/bin/env node
// capture.mjs <url> <selector> <out-dir> [--init file.js]... [--stub url-glob]... [--settle ms]
//   [--landed-module /src/motion.ts] [--let-click] [--only mobile|desktop] [--fps 15]
// Records hover, press, hold, release, the after-release effects and the landed swell of one element,
// at 393x852 (scale 3) and 1440x900 (scale 2), on a stepped page clock (vclock.js) so every frame is
// exact even when a software GPU draws one frame a second. Writes <out-dir>/<mobile|desktop>/:
//   hover-click.mp4 (full viewport, real timing), hover-click-crop.mp4 (the element, 40 px margin),
//   strip.png (labelled frames, 2x), tiles/ (each strip tile alone), frames/ (every frame, named by
//   ms from the pointer's arrival), meta.json (event times, landed hook, timings).
// Without ffmpeg: Playwright's own webm of the session (hover-click.webm; slowed, since the clock is
// stepped) plus the same strip.
// Timeline (page ms): 0 pointer onto the element; 500 press; 750 release; 1650 landed; 2400 end.
import fs from 'node:fs';
import path from 'node:path';
import { launch, VIEWPORTS, FFMPEG, VCLOCK, opts, prepare, settle, run, freeze, step, shoot, frameAt, dumpFrames, encode, strip, sharp } from './lib.mjs';

const { pos, o } = opts(process.argv.slice(2));
const [url, selector, outDir] = pos;
if (!url || !selector || !outDir) { console.error('usage: capture.mjs <url> <selector> <out-dir> [--init f.js] [--stub glob] [--settle ms] [--landed-module path] [--let-click] [--only mobile|desktop] [--fps n]'); process.exit(2); }
const SETTLE = Number(o.settle ?? 3500), MARGIN = 40, FPS = Number(o.fps ?? 15);
const T_DOWN = 500, T_UP = 750, T_LANDED = 1650, T_END = 2400, PRE = -100;

const PLAN = [
  [0, '0 ms', 'rest, pointer arrives'],
  [100, '100 ms', 'hover lifting'],
  [200, '200 ms', 'hover lifting'],
  [350, '350 ms', 'hover'],
  [500, '500 ms', 'hover settled'],
  [600, '600 ms', 'press, +100 ms sink'],
  [750, '750 ms', 'held 250 ms, release'],
  [870, '870 ms', 'release +120, wisps'],
  [1100, '1100 ms', 'after, +350'],
  [1500, '1500 ms', 'after, +750'],
  [T_LANDED + 210, `${T_LANDED + 210} ms`, 'landed peak'],
  [T_LANDED + 450, `${T_LANDED + 450} ms`, 'landed settled'],
];
// every video frame plus every strip time, in order
const times = [...new Set([...Array.from({ length: Math.floor((T_END - PRE) * FPS / 1000) + 1 }, (_, i) => +(PRE + i * 1000 / FPS).toFixed(3)), ...PLAN.map(p => p[0]), T_DOWN, T_UP, T_LANDED])].sort((a, b) => a - b);

const browser = await launch();
const summary = {};
try {
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    if (o.only && o.only !== name) continue;
    const started = Date.now();
    const dir = path.join(outDir, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ ...vp, ...(FFMPEG ? {} : { recordVideo: { dir, size: vp.viewport } }) });
    await ctx.addInitScript({ path: VCLOCK });
    await prepare(ctx, o);
    await ctx.addInitScript(sel => { // the real pointer events on the element, in page time
      const log = window.__capLog = [];
      const on = (type, test) => addEventListener(type, e => { const el = document.querySelector(sel); if (el && test(e, el)) log.push({ type, t: performance.now() }); }, true);
      on('pointerover', (e, el) => el.contains(e.target) && !(e.relatedTarget && el.contains(e.relatedTarget)));
      on('pointerdown', (e, el) => el.contains(e.target));
      on('pointerup', () => true);
    }, selector);
    if (!o['let-click']) await ctx.addInitScript(sel => {
      // the click is held back so the page stays put for the after-effects; press and release still run
      addEventListener('click', e => { const el = document.querySelector(sel); if (el && el.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
      addEventListener('submit', e => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
    }, selector);
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await settle(page, SETTLE);
    const loc = page.locator(selector).first();
    await loc.waitFor({ state: 'visible', timeout: 20000 });
    await loc.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }));
    await run(page, 1200);
    const W = vp.viewport.width, H = vp.viewport.height, S = vp.deviceScaleFactor;
    const box0 = await loc.boundingBox();
    const cx = box0.x + box0.width / 2, cy = box0.y + box0.height / 2;
    await page.mouse.move(cx < W / 2 ? W - 4 : 4, cy < H / 2 ? H - 4 : 4); // start at the far corner
    await run(page, 600);
    const facts = await page.evaluate(sel => {
      const el = document.querySelector(sel);
      return { cloud3d: !!window.OCLOUD3D, managed3d: !!(window.OCLOUD3D?.has && window.OCLOUD3D.has(el)), canvases: document.querySelectorAll('canvas').length,
        obvLanded: typeof window.OBV?.cloud?.landed === 'function', label: el.textContent.trim().slice(0, 60) };
    }, selector);

    const tFreeze = await page.evaluate(() => window.__vclock.now()); // frozen since settle()
    const box = await loc.boundingBox();
    const frames = [];
    let landed = null, prev = PRE;
    for (const t of times) {
      if (t > prev) await step(page, t - prev);
      prev = t;
      await page.evaluate(() => window.__vclock.nativeFrame());
      frames.push({ ts: t, buf: await shoot(page) });
      if (t === 0) await page.mouse.move(cx, cy);
      if (t === T_DOWN) await page.mouse.down();
      if (t === T_UP) await page.mouse.up();
      if (t === T_LANDED) landed = await page.evaluate(async ({ sel, mod }) => {
        // obavia-co: window.OBV.cloud.landed(el) (site.js, wrapped by cloud3d.js when it loads).
        // The Desk keeps landed() in src/motion.ts, an ES module; under the Vite dev server it is imported live.
        const el = document.querySelector(sel);
        if (typeof window.OBV?.cloud?.landed === 'function') { window.OBV.cloud.landed(el); return 'window.OBV.cloud.landed(el)'; }
        if (mod) { try { const m = await import(/* @vite-ignore */ mod); const fn = m.landed || m.land; if (fn) { fn(el); return `import('${mod}').landed(el)`; } } catch (e) { /* fall through */ } }
        document.dispatchEvent(new CustomEvent('obavia:landed', { detail: el }));
        return "CustomEvent('obavia:landed') on document (no landed hook found on this page)";
      }, { sel: selector, mod: o['landed-module'] || null });
      if (t === 0 || t === T_DOWN || t === T_UP || t === T_LANDED) await page.evaluate(() => window.__vclock.pinNew());
    }
    const log = await page.evaluate(() => window.__capLog);
    const t0 = tFreeze - PRE; // page time of t = 0
    const ev = k => { const e = log.filter(x => x.type === k && x.t >= tFreeze).at(k === 'pointerup' ? -1 : 0); return e ? Math.round(e.t - t0) : null; };
    const events = { enterMs: ev('pointerover'), downMs: ev('pointerdown'), upMs: ev('pointerup') };
    if (events.enterMs === null || events.downMs === null) throw new Error(`${name}: pointer events not seen on ${selector}: ${JSON.stringify(log)}`);
    const written = dumpFrames(frames, path.join(dir, 'frames'), 0);

    // the crop: the element's box with a 40 px margin, clamped to the viewport, in device pixels
    const cr = { x: Math.max(0, box.x - MARGIN), y: Math.max(0, box.y - MARGIN) };
    cr.w = Math.min(W, box.x + box.width + MARGIN) - cr.x; cr.h = Math.min(H, box.y + box.height + MARGIN) - cr.y;
    const px = { x: Math.round(cr.x * S), y: Math.round(cr.y * S), w: Math.round(cr.w * S), h: Math.round(cr.h * S) };
    const tilesDir = path.join(dir, 'tiles'); fs.mkdirSync(tilesDir, { recursive: true });
    const tiles = [];
    for (const [t, time, phase] of PLAN) {
      const f = frameAt(frames, t);
      const buf = await sharp(f.buf).extract({ left: px.x, top: px.y, width: px.w, height: px.h }).resize({ width: Math.round(cr.w * 2), kernel: 'lanczos3' }).png().toBuffer();
      fs.writeFileSync(path.join(tilesDir, `${String(tiles.length).padStart(2, '0')}-${time.replace(/\W+/g, '')}-${phase.replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '')}.png`), buf);
      tiles.push({ buf, time, phase, frameMs: f.ts });
    }
    await strip(tiles, path.join(dir, 'strip.png'), { tileH: Math.round(cr.h * 2) });

    let video = null, cropVideo = null;
    const vframes = written.filter(f => Math.abs(((f.ts - PRE) * FPS / 1000) - Math.round((f.ts - PRE) * FPS / 1000)) < 1e-3); // the uniform video frames
    if (FFMPEG) { video = encode(vframes, path.join(dir, 'hover-click.mp4')); cropVideo = encode(vframes, path.join(dir, 'hover-click-crop.mp4'), px); }
    await page.close(); await ctx.close();
    if (!FFMPEG) { const v = fs.readdirSync(dir).find(f => f.endsWith('.webm')); if (v) { fs.renameSync(path.join(dir, v), path.join(dir, 'hover-click.webm')); video = path.join(dir, 'hover-click.webm'); } }

    const meta = {
      url, selector, viewport: vp, element: facts, box, crop: cr, fps: FPS, frames: frames.length, landedHook: landed,
      timeline: { pointerOn: 0, press: T_DOWN, release: T_UP, landed: T_LANDED, end: T_END }, events,
      video, cropVideo, strip: tiles.map(t => ({ time: t.time, phase: t.phase, frameMs: t.frameMs })),
      pageErrors: errors, seconds: Math.round((Date.now() - started) / 1000),
    };
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
    summary[name] = { dir, frames: frames.length, events, landed, managed3d: facts.managed3d, canvases: facts.canvases, pageErrors: errors.length, seconds: meta.seconds };
    console.log(`${name}: ${frames.length} frames in ${meta.seconds} s; events ${JSON.stringify(events)}; landed via ${landed} -> ${dir}`);
  }
} finally { await browser.close(); }
console.log(JSON.stringify(summary, null, 2));
