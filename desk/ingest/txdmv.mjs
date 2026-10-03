#!/usr/bin/env node
/* Nightly: download the TxDMV Independent (GDN) dealer list and write
     out/tx.index.json     public search index (no full phone numbers or emails)
     out/tx.contacts.json  private: phone and email per licence, for sending codes
     out/tx.diff.json      licences added and removed since the last index
     out/meta.json         counts, the source's "current as of" date, timings

   Usage: node ingest/txdmv.mjs [--out out] [--prev path-or-url] [--file local.xls] [--browser]
   --file skips the download (tests, replays). --browser downloads through
   Playwright, for days the plain request is turned away. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { SOURCE_PAGE, buildContacts, buildIndex, diffIndex, findAsOf, findDownloadHref, guard, normaliseAll, readRows } from './txdmv.lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true; };
const OUT = arg('out', 'out');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 ObaviaDealerSync/1.0 (+https://obavia.co)';
const log = (...a) => console.log('[txdmv]', ...a);

async function viaFetch() {
  const page = await fetch(SOURCE_PAGE, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow' });
  if (!page.ok) throw new Error(`List page answered ${page.status}`);
  const html = await page.text();
  const href = findDownloadHref(html);
  if (!href) throw new Error('No download link on the list page');
  const cookie = (page.headers.getSetCookie?.() ?? []).map(c => c.split(';')[0]).join('; ');
  log('download', href.replace(/file=[^&]+/, 'file=…'));
  const res = await fetch(href, { headers: { 'user-agent': UA, referer: SOURCE_PAGE, ...(cookie ? { cookie } : {}) }, redirect: 'follow' });
  if (!res.ok) throw new Error(`Download answered ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100_000) throw new Error(`Download was only ${buf.length} bytes; probably an error page`);
  return { buf, asOf: findAsOf(html), how: 'fetch' };
}

async function viaBrowser() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ userAgent: UA, acceptDownloads: true })).newPage();
    await page.goto(SOURCE_PAGE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const asOf = findAsOf(await page.content());
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120_000 }), page.locator('a[href*="servlet.FileDownload"]').first().click()]);
    return { buf: await readFile(await dl.path()), asOf, how: 'browser' };
  } finally { await browser.close(); }
}

async function loadPrev(src) {
  if (!src || src === true) return null;
  try {
    if (/^https?:/.test(src)) { const r = await fetch(src, { headers: { 'cache-control': 'no-cache' } }); return r.ok ? await r.json() : null; }
    return JSON.parse(await readFile(src, 'utf8'));
  } catch { return null; }
}

const t0 = Date.now();
const got = arg('file') ? { buf: await readFile(arg('file')), asOf: arg('as-of', null), how: 'file' } : arg('browser') ? await viaBrowser() : await viaFetch();
const { kind, rows } = await readRows(got.buf);
const dealers = normaliseAll(rows);
const asOf = got.asOf || new Date().toISOString().slice(0, 10);
const index = buildIndex(dealers, asOf);
const prev = await loadPrev(arg('prev'));
const stop = guard(index.count, prev?.count);
if (stop) { console.error('[txdmv]', stop); process.exit(2); }
const diff = diffIndex(prev, index);
const withPhone = dealers.filter(d => d.phone).length, withEmail = dealers.filter(d => d.email).length;

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/tx.index.json`, JSON.stringify(index));
await writeFile(`${OUT}/tx.contacts.json`, JSON.stringify(buildContacts(dealers, asOf)));
await writeFile(`${OUT}/tx.diff.json`, JSON.stringify({ asOf, ...diff }));
const meta = { asOf, fetchedAt: new Date().toISOString(), how: got.how, format: kind, bytes: got.buf.length, rows: rows.length, dealers: dealers.length, withPhone, withEmail, added: diff.added.length, removed: diff.removed.length, ms: Date.now() - t0 };
await writeFile(`${OUT}/meta.json`, JSON.stringify(meta, null, 2));
log(JSON.stringify(meta));
