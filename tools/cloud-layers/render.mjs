// Rasterize the shared cloud layers to transparent PNGs.
// Run from the repo root:
//   NODE_PATH=auction/node_modules node tools/cloud-layers/render.mjs [--seed 1012] [--only light/near]
// Writes assets/cloud-layers/{light,dark}/{far,mid,near}@{1x,2x}.png and assets/cloud-layers/grain.png.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const out = join(repo, 'assets/cloud-layers');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const seed = +arg('--seed', 1012), only = arg('--only', '');

// every PNG stays under 400 KB: pngquant when installed, otherwise a dithered PIL palette
const LIMIT = 400 * 1024;
const has = bin => { try { execFileSync('sh', ['-c', `command -v ${bin}`]); return true; } catch { return false; } };
const quantize = file => has('pngquant')
  ? execFileSync('pngquant', ['--force', '--skip-if-larger', '--quality', '70-95', '--output', file, file])
  : execFileSync('python3', [join(here, 'quantize.py'), file]);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page_url = pathToFileURL(join(here, 'render.html')).href;
const shoot = async (dpr, fn, args, file) => {
  const ctx = await browser.newContext({ deviceScaleFactor: dpr, viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(page_url);
  const { W, H } = await page.evaluate(([fn, a]) => window[fn](a), [fn, args]);
  await page.setViewportSize({ width: W, height: H });
  await page.waitForTimeout(150);
  mkdirSync(dirname(file), { recursive: true });
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
  await ctx.close();
  if (statSync(file).size > LIMIT) quantize(file);
  console.log(file.replace(repo + '/', ''), Math.round(statSync(file).size / 1024) + ' KB');
};
for (const theme of ['light', 'dark']) for (const layer of ['far', 'mid', 'near']) {
  if (only && only !== `${theme}/${layer}`) continue;
  for (const dpr of [1, 2]) await shoot(dpr, 'build', { theme, layer, seed }, join(out, theme, `${layer}@${dpr}x.png`));
}
if (!only || only === 'grain') {
  await shoot(1, 'grain', { size: 512, seed }, join(out, 'grain.png'));
  execFileSync('python3', [join(here, 'quantize.py'), join(out, 'grain.png')]);   // grey: one channel
}
await browser.close();
