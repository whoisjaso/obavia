#!/usr/bin/env node
/* Copies the web's share of the Blender cloud contract (assets/cloud-3d) into the two web surfaces:
     obavia-co/assets/cloud-3d/   (cloud3d.js: new URL('assets/cloud-3d/', the page))
     desk/public/cloud-3d/        (desk/src/cloud3d.ts: './cloud-3d/')
   What the web needs, WebP only (the PNGs and sprite sheets are the phone's, see auction/scripts/cloud3d.mjs):
     button/safe-zone.json
     button/{light,dark}/{320,440,640}/  rest, pressed, shadow-rest, shadow-pressed (1x and @2x),
                                         press/000 to 023 (1x and @2x), sheet.json and sheet@2x.json (geometry)
     button/wisp*, button/ring*          1x and @2x, light and dark
     sky/{light,dark}/{far,mid,near}.webp
   Deterministic: each target is emptied first and the files are copied in sorted order, byte for byte.
   No dependencies. Run from anywhere:
     node tools/cloud-3d/sync.mjs                  # from assets/cloud-3d
     node tools/cloud-3d/sync.mjs --from DIR       # from another contract tree
   Nothing under the contract is ever written. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const fromIx = args.indexOf('--from');
const src = fromIx >= 0 ? path.resolve(args[fromIx + 1]) : path.join(root, 'assets', 'cloud-3d');
const targets = [path.join(root, 'obavia-co', 'assets', 'cloud-3d'), path.join(root, 'desk', 'public', 'cloud-3d')];

if (!fs.existsSync(path.join(src, 'button', 'safe-zone.json'))) {
  console.error(`cloud-3d sync: no contract at ${src} (button/safe-zone.json missing)`);
  process.exit(1);
}

const want = [];
const add = (rel, required = true) => {
  if (fs.existsSync(path.join(src, rel))) want.push(rel);
  else if (required) { console.error(`cloud-3d sync: ${rel} missing from the contract`); process.exit(1); }
};
const scales = n => [`${n}.webp`, `${n}@2x.webp`];

add('button/safe-zone.json');
for (const tone of ['light', 'dark']) for (const size of ['320', '440', '640']) {
  const d = `button/${tone}/${size}`;
  for (const n of ['rest', 'pressed', 'shadow-rest', 'shadow-pressed']) scales(n).forEach(f => add(`${d}/${f}`));
  for (let i = 0; i < 24; i++) scales(String(i).padStart(3, '0')).forEach(f => add(`${d}/press/${f}`));
  add(`${d}/sheet.json`); add(`${d}/sheet@2x.json`);
}
for (const n of ['wisp', 'wisp-dark', 'ring', 'ring-dark']) scales(n).forEach(f => add(`button/${f}`));
for (const tone of ['light', 'dark']) for (const n of ['far', 'mid', 'near']) add(`sky/${tone}/${n}.webp`);
want.sort();

for (const dst of targets) {
  fs.rmSync(dst, { recursive: true, force: true });
  let bytes = 0;
  for (const rel of want) {
    const to = path.join(dst, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(src, rel), to);
    bytes += fs.statSync(to).size;
  }
  console.log(`cloud-3d sync: ${want.length} files, ${bytes} bytes -> ${path.relative(root, dst)}`);
}
