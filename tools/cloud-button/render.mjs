// Render the volumetric cloud button sprites to PNG.
// Run from the repo root:
//   NODE_PATH=auction/node_modules node tools/cloud-button/render.mjs [--seed 1012] [--only 440] [--contact]
// Writes assets/cloud-button/{320,440,640}/{rest,pressed,shadow-rest,shadow-pressed,dark,dark-shadow}@{1x,2x}.png,
// assets/cloud-button/hero/{rest,pressed,shadow-rest,shadow-pressed}.png and, with --contact, contact.png.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = join(repo, 'assets/cloud-button');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const seed = +arg('--seed', 1012), only = arg('--only', ''), contact = process.argv.includes('--contact');
const LIMIT = 180 * 1024;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto(pathToFileURL(join(here, 'render.html')).href);

const save = async (fn, opts, file) => {
  const url = await page.evaluate(([f, o]) => window[f](o), [fn, opts]);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  if (statSync(file).size > LIMIT) execFileSync('python3', [join(here, 'quantize.py'), file, String(LIMIT)], { stdio: 'inherit' });
  const kb = statSync(file).size / 1024;
  console.log(file.replace(repo + '/', ''), kb.toFixed(1) + ' KB' + (kb > 180 ? '  OVER LIMIT' : ''));
};

const zones = {};
for (const W of [320, 440, 640]) {
  if (only && only !== String(W)) continue;
  const base = { Wd: W, Hd: 96, seed };
  for (const dpr of [1, 2]) {
    for (const state of ['rest', 'pressed']) {
      await save('sprite', { ...base, dpr, state }, join(out, `${W}/${state}@${dpr}x.png`));
      await save('shadowSprite', { ...base, dpr, state }, join(out, `${W}/shadow-${state}@${dpr}x.png`));
    }
    await save('sprite', { ...base, dpr, theme: 'dark' }, join(out, `${W}/dark@${dpr}x.png`));
    await save('shadowSprite', { ...base, dpr, theme: 'dark' }, join(out, `${W}/dark-shadow@${dpr}x.png`));
  }
  zones[W] = await page.evaluate(o => window.safeZone(o), { ...base, dpr: 1 });
}
if (!only || only === 'hero') {
  const hero = { Wd: 384, Hd: 96, dpr: 1, scale: 1600 / 384, seed };
  for (const state of ['rest', 'pressed']) {
    await save('sprite', { ...hero, state }, join(out, `hero/${state}.png`));
    await save('shadowSprite', { ...hero, state }, join(out, `hero/shadow-${state}.png`));
  }
  zones.hero = await page.evaluate(o => window.safeZone(o), { ...hero, scale: 1 });
}
for (const [k, z] of Object.entries(zones)) console.log('safe', k, Object.fromEntries(Object.entries(z).map(([a, b]) => [a, +b.toFixed(1)])));
await browser.close();
if (contact) execFileSync('python3', [join(here, 'contact.py'), out], { stdio: 'inherit' });
