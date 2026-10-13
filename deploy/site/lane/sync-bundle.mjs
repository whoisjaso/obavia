#!/usr/bin/env node
// Writes deploy/site/lane/*.mjs into the obavia-waitlist bundle
// (deploy/site/live-worker.js) as verbatim copies, between the markers
//   // lane:begin <module>   and   // lane:end <module>
// The only change is that a leading "export " is dropped, because the bundle is
// one module with its own export list. Run after editing a module:
//   node deploy/site/lane/sync-bundle.mjs           rewrite the bundle
//   node deploy/site/lane/sync-bundle.mjs --check   exit 1 if the bundle differs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const MODULES = ['template-v9.mjs', 'lane.mjs'];
const here = new URL('./', import.meta.url);

export const inline = source => source.replace(/^export (?=(?:async function|function|const|let|class) )/gm, '');

export function syncBundle(bundle, read = name => readFileSync(new URL(name, here), 'utf8')) {
  let out = bundle;
  for (const name of MODULES) {
    const begin = `// lane:begin ${name}\n`, end = `// lane:end ${name}\n`;
    const a = out.indexOf(begin), b = out.indexOf(end);
    if (a < 0 || b < a || out.indexOf(begin, a + 1) >= 0) throw Error(`bundle markers for ${name} missing or repeated`);
    out = out.slice(0, a + begin.length) + inline(read(name)) + out.slice(b);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const path = fileURLToPath(new URL('../live-worker.js', here));
  const bundle = readFileSync(path, 'utf8'), next = syncBundle(bundle);
  if (process.argv.includes('--check')) {
    if (next !== bundle) { console.error('live-worker.js differs from deploy/site/lane; run sync-bundle.mjs'); process.exit(1); }
    console.log('live-worker.js matches deploy/site/lane');
  } else { writeFileSync(path, next); console.log(next === bundle ? 'already in sync' : 'live-worker.js updated'); }
}
