// The Phase 0 exit walk: Lane to Won to Plates to Me on the web export, local engine, no Worker.
// node walk.mjs <webroot> <outdir> [port]
// Writes <outdir>/NN-name.png (393 by 852 at 2x), NN-name.json (text runs, tappables, checks) and walk.json.
// Exits 1 on a page error, a dialog (alert, confirm, prompt), a modal in the tree, a step that cannot be
// driven, or a screen whose one action is not the first tappable element in the accessibility tree.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const NODE_PATH = process.env.NODE_PATH || '/home/user/obavia/auction/node_modules';
const { chromium } = require(path.join(NODE_PATH, 'playwright'));
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium';

const [ROOT_ARG, OUT, PORT = '4391'] = process.argv.slice(2);
const ROOT = ROOT_ARG && path.resolve(ROOT_ARG);
if (!ROOT || !OUT) { console.error('usage: node walk.mjs <webroot> <outdir> [port]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

/* ---------- the fixture server: the export, single page fallback ---------- */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon', '.glb': 'model/gltf-binary' };
const server = http.createServer((q, r) => {
  let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0].split('#')[0]));
  if (!f.startsWith(path.resolve(ROOT))) { r.statusCode = 403; return r.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) f = path.join(ROOT, 'index.html');
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(r);
}).listen(+PORT, '127.0.0.1');

/* ---------- what each screen is: its one action (one-action.md, the audit table) ----------
   primary: the accessible name the first tappable element must carry.
   gesture: the screen's one action is a gesture with no button; then every tappable on the glass must be
            one of the table's secondaries (allow), and the anchor must be present.
   verb:    the word printed on a carved cloud button (an image, so not in the DOM text).
   kept:    which of the four kept reads sits on this screen (one-action.md, DOCTRINE CP1).
   choices: the decision is a set of words (Pay's three, a pickup time); their words are reads. */
const SPEC = {
  'lane':            { title: 'Lane', gesture: 'drag the price', anchor: /dollars, .* left/, allow: [/^Me$/, /^Share$/, /photos, open the car$/, /^[\d,]+ dollars$/] },
  'lane-watched':    { title: 'Lane, watched (double tap)', gesture: 'drag the price', anchor: /dollars, .* left/, allow: [/^Me$/, /^Share$/, /photos, open the car$/, /^[\d,]+ dollars$/] },
  'bid-first':       { title: 'Bid sheet, first bid', primary: /^Bid/, before: [/^[\d,]+ dollars$/], verb: 'Bid' },
  'phone-number':    { title: 'Phone, your number', primary: /^Your number$/ },
  'phone-code':      { title: 'Phone, the code', gesture: 'type the six (the keyboard is up)', anchor: /^Code$/, allow: [/^Not now$/, /^Sent to /, /^Code$/, /^$/] },
  'id-frame':        { title: 'ID frame (first bid)', primary: /^Take the photo$/ },
  'id-facts':        { title: 'ID facts', primary: /^That's me$/, before: [/^(Name|Born|Address|Licen[cs]e|State) /], verb: "That's me" },
  'deposit':         { title: 'Deposit', primary: /^Pay \d+ dollars/, verb: 'Pay', kept: 'deposit' },
  // the four terms on their own page, the last of the first-bid sequence (decisions §3.4, amended October 13, 2026)
  'terms':           { title: 'Terms, the first bid', primary: /^Bid/, verb: 'Bid', kept: 'terms' },
  'bid-landed':      { title: 'Bid landed, waiting for the hammer', gesture: 'nothing to do (the close)', anchor: /./, allow: [/./] },
  'won-steps':       { title: 'Won, steps', primary: /^ID, next/ },
  'id-prefilled':    { title: 'ID, prefilled', primary: /^That's me$/, before: [/^(Name|Born|Address|Licen[cs]e|State) /], verb: "That's me" },
  'insure':          { title: 'Insure', primary: /^Take the photo$/ },
  'buyers-guide':    { title: 'Buyers Guide, the end', primary: /^(Signature pad|Sign)$/, verb: 'Sign', kept: 'document' },
  'buyers-signed':   { title: 'Buyers Guide, signed', primary: /^Sign$/, verb: 'Sign', kept: 'document' },
  'bill-of-sale':    { title: 'Bill of Sale, the end', primary: /^(Signature pad|Sign)$/, verb: 'Sign', kept: 'document' },
  'won-steps-2':     { title: 'Won, steps (the last one lit)', primary: /^(Pay|Keys|Plates|Title), next/ },
  'pay':             { title: 'Pay', primary: /^(Bank|Wire|Cash)/, choices: true },
  'pickup-where':    { title: 'Pickup, where', primary: /^Directions to / },
  'pickup-when':     { title: 'Pickup, when', primary: /\d|^Call/, choices: true },
  'pickup-pass':     { title: 'Pickup, the pass', primary: /^Pass, / },
  'pickup-started':  { title: 'Pickup, started', primary: /^Done$/, before: [/^Car started/], verb: 'Done' },
  'plates':          { title: 'Plates', gesture: 'nothing to do', anchor: /./, allow: [/./] },
  'plates-mailed':   { title: 'Plates, mailed', gesture: 'nothing to do', anchor: /./, allow: [/./] },
  'won-done':        { title: 'Won, all four done', primary: /^To the lane$/ },
  'me':              { title: 'Me', gesture: 'nothing to do', anchor: /./, allow: [/./] },
  // the second chance (decisions §2 row 9): the push's intent, played by ?offer=1; one verb, Take it; Not now faint and last
  'offer':           { title: 'Offer, the second chance', primary: /^Take it/, verb: 'Take it' },
};

/* ---------- the browser ---------- */
const failures = [];
const notes = [];
const fail = (screen, what) => { failures.push({ screen, what }); console.log(`FAIL ${screen}: ${what}`); };
// autoplay: a page that opens on launch (the Offer page, where the push lands) plays its settle before any tap;
// Chromium would refuse play() with no gesture and count the refusal as a page error, which no phone has
const browser = await chromium.launch({ executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
let current = 'boot';
page.on('pageerror', e => fail(current, `page error: ${String(e.message || e).split('\n')[0]}`));
const offline = new Set();
page.on('request', q => { const u = q.url(); if (/^(data|blob|about):/.test(u)) return; const h = new URL(u).hostname; if (h !== '127.0.0.1' && h !== 'localhost' && !offline.has(h)) { offline.add(h); fail(current, `a request left the fixture server (${h}): the export carries a Worker URL; run.sh --rebuild`); } });
page.on('dialog', async d => { fail(current, `${d.type()}() appeared: "${d.message().slice(0, 80)}"`); await d.dismiss().catch(() => {}); });
const cdp = await ctx.newCDPSession(page);
await cdp.send('DOM.enable'); await cdp.send('Accessibility.enable');

const wait = ms => page.waitForTimeout(ms);
async function until(test, ms = 15000, step = 150) {
  for (let t = 0; t < ms; t += step) { if (await test().catch(() => false)) return true; await wait(step); }
  return false;
}
const bodyText = () => page.evaluate(() => document.body.innerText);

/* the accessibility tree, in reading order: every node a thumb can act on, on the glass and not covered */
const TAP_ROLES = new Set(['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'option', 'slider', 'textbox', 'searchbox', 'combobox', 'spinbutton']);
async function tappables() {
  await page.evaluate(() => document.querySelectorAll('[data-wt-tap]').forEach(e => { e.removeAttribute('data-wt-tap'); e.removeAttribute('data-wt-primary'); }));
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const byId = new Map(nodes.map(n => [n.nodeId, n]));
  const root = nodes.find(n => !n.parentId) || nodes[0];
  const order = [];
  const walk = n => { if (!n) return; order.push(n); for (const c of n.childIds || []) walk(byId.get(c)); };
  walk(root);
  const out = [];
  for (const n of order) {
    if (n.ignored || n.backendDOMNodeId == null) continue;
    const role = n.role?.value;
    const prop = k => n.properties?.find(p => p.name === k)?.value?.value;
    const focusable = prop('focusable') === true;
    if (!TAP_ROLES.has(role) && !(focusable && role !== 'RootWebArea' && role !== 'WebArea')) continue;
    let obj;
    try { obj = await cdp.send('DOM.resolveNode', { backendNodeId: n.backendDOMNodeId }); } catch { continue; }
    const r = await cdp.send('Runtime.callFunctionOn', {
      objectId: obj.object.objectId, returnByValue: true,
      functionDeclaration: `function () {
        const b = this.getBoundingClientRect(), W = innerWidth, H = innerHeight;
        if (b.width < 2 || b.height < 2) return null;
        // the part of the box on the glass; try its centre, then a few points inside it
        const l = Math.max(0, b.left), t = Math.max(0, b.top), rr = Math.min(W, b.right), bb = Math.min(H, b.bottom);
        if (rr - l < 2 || bb - t < 2) return null;
        let o = 1, e = this; while (e && e.nodeType === 1) { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none') return null; o *= +s.opacity; e = e.parentElement; }
        if (o < 0.05) return null;
        const pts = [[.5,.5],[.5,.3],[.5,.7],[.3,.5],[.7,.5]];
        const hit = pts.some(([fx, fy]) => { const h = document.elementFromPoint(l + (rr - l) * fx, t + (bb - t) * fy); return h && (h === this || this.contains(h)); });
        if (!hit) return null;
        const disabled = this.getAttribute('aria-disabled') === 'true' || this.disabled === true;
        return { box: [b.left, b.top, b.width, b.height].map(Math.round), disabled, text: (this.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 80) };
      }`,
    }).catch(() => null);
    const v = r?.result?.value;
    if (!v) continue;
    const i = out.length;
    await cdp.send('Runtime.callFunctionOn', { objectId: obj.object.objectId, functionDeclaration: `function () { this.setAttribute('data-wt-tap', '${i}'); }` }).catch(() => {});
    out.push({ i, role, name: (n.name?.value || '').trim(), ...v });
  }
  return out;
}

/* every visible run of text, as the legibility audit dumps it, with where it sits relative to the tappables */
const dump = () => page.evaluate(() => {
  const out = [], W = innerWidth, H = innerHeight, groups = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) { const t = walker.currentNode; if (!t.parentElement) continue; const g = groups.get(t.parentElement) || []; g.push(t); groups.set(t.parentElement, g); }
  for (const [el, nodes] of groups) { while (nodes.length && !nodes[0].textContent.trim()) nodes.shift(); while (nodes.length && !nodes[nodes.length - 1].textContent.trim()) nodes.pop(); if (!nodes.length) groups.delete(el); }
  for (const [el, nodes] of groups) {
    const txt = nodes.map(n => n.textContent).join('').replace(/\s+/g, ' ').trim(); if (!txt) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    const rg = document.createRange(); rg.setStartBefore(nodes[0]); rg.setEndAfter(nodes[nodes.length - 1]); const r = rg.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.right < 0 || r.left > W || r.bottom < 0 || r.top > H) continue;
    let o = 1, e = el; while (e) { o *= +getComputedStyle(e).opacity; e = e.parentElement; }
    if (o < 0.05) continue;
    let clipped = false; e = el.parentElement;
    while (e && e !== document.body) { const st = getComputedStyle(e); if (st.overflow !== 'visible' || st.overflowX !== 'visible') { const b = e.getBoundingClientRect(); if (r.right <= b.left + 1 || r.left >= b.right - 1 || r.bottom <= b.top + 1 || r.top >= b.bottom - 1) { clipped = true; break; } } e = e.parentElement; }
    if (clipped) continue;
    // covered by a sheet or a page over it: the hit at its centre is not it, not inside it, not the control it labels
    const cx = Math.min(W - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(H - 1, Math.max(0, r.top + r.height / 2));
    const hit = document.elementFromPoint(cx, cy);
    const owner = el.closest('[aria-label]');
    if (hit && !el.contains(hit) && !hit.contains(el) && !(owner && hit.closest('[aria-label]') === owner)) continue;
    const tap = el.closest('[data-wt-tap]');
    out.push({ text: txt.slice(0, 200), fs: parseFloat(cs.fontSize), fam: cs.fontFamily.split(',')[0].replace(/"/g, ''), tap: tap ? +tap.getAttribute('data-wt-tap') : null, primary: !!el.closest('[data-wt-primary]'), terms: !!el.closest('[aria-label^="Terms."]'), r: [r.left, r.top, r.width, r.height].map(Math.round) });
  }
  // one run per place: a carved label drawn in layers is one word on the glass
  const seen = new Set();
  return out.filter(t => { const k = `${t.text}|${t.tap}|${Math.round(t.r[1] / 8)}`; if (seen.has(k)) return false; seen.add(k); return true; });
});

/* one screen: settle, check, shoot, write */
const shots = [];
let seq = 0;
async function screen(key, extra = {}) {
  current = key;
  const spec = SPEC[key];
  await wait(250);
  const n = String(++seq).padStart(2, '0');
  const file = `${n}-${key}`;
  const taps = await tappables();
  const modal = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.getAttribute('aria-label') || e.getAttribute('role')));
  const anchors = await page.evaluate(() => [...document.querySelectorAll('[aria-label]')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth; }).map(e => e.getAttribute('aria-label')));
  const checks = [];
  // the sheet's own dismissals (the backdrop over the glass, the grip) are the sheet, not a choice on it
  const chrome = t => (t.name === 'Close' && t.box[2] >= 380 && t.box[3] >= 800) || /^Sheet grip/.test(t.name);
  const live = taps.filter(t => !t.disabled && !chrome(t));
  const unlabelled = live.filter(t => !t.name);
  if (unlabelled.length) notes.push(`${key}: ${unlabelled.length} tappable element(s) with no accessible name (${unlabelled.map(t => t.text ? `"${t.text}"` : `at ${t.box.slice(0, 2)}`).join(', ')})`);
  if (modal.length) { fail(key, `modal in the tree: ${modal.join(', ')}`); checks.push('modal'); }
  if (spec.primary) {
    const first = live.find(t => !(spec.before || []).some(rx => rx.test(t.name)));
    if (!first) { fail(key, `no tappable element; expected ${spec.primary}`); checks.push('no tappable'); }
    else if (!spec.primary.test(first.name)) { fail(key, `first tappable is "${first.name}" (${first.role}), expected ${spec.primary}`); checks.push('primary not first'); }
    const prim = live.find(t => spec.primary.test(t.name));   // the one action, wherever it sits, for the reads count
    if (prim) { prim.primary = true; await page.evaluate(i => document.querySelector(`[data-wt-tap="${i}"]`)?.setAttribute('data-wt-primary', '1'), prim.i); }
    else if (first) { fail(key, `the one action ${spec.primary} is not on the glass`); checks.push('no primary'); }
  } else if (spec.gesture) {
    if (!anchors.some(a => spec.anchor.test(a))) { fail(key, `gesture anchor ${spec.anchor} not on the glass`); checks.push('no anchor'); }
    const stray = live.filter(t => !spec.allow.some(rx => rx.test(t.name)));
    if (stray.length) { fail(key, `tappables beyond the secondaries: ${stray.map(t => `"${t.name}"`).join(', ')}`); checks.push('stray tappable'); }
  }
  const text = await dump();
  await page.screenshot({ path: path.join(OUT, file + '.png') });
  const rec = { file: file + '.png', key, title: spec.title, primary: spec.primary?.source ?? null, gesture: spec.gesture ?? null, verb: spec.verb ?? null, kept: spec.kept ?? null, choices: !!spec.choices, firstTappable: live[0]?.name ?? null, primaryFound: live.find(t => t.primary)?.name ?? null, chrome: taps.filter(chrome).map(t => t.name), tappables: taps, text, modal, checks, ...extra };
  fs.writeFileSync(path.join(OUT, file + '.json'), JSON.stringify(rec, null, 1));
  shots.push({ file: file + '.png', key, title: spec.title, firstTappable: rec.firstTappable, ok: checks.length === 0 });
  console.log(`${checks.length ? 'x' : 'ok'} ${file}  first tappable: ${rec.firstTappable ?? '(none)'}`);
  return rec;
}

/* ---------- the drives ---------- */
const byLabel = (re, opts) => typeof re === 'string' ? page.getByLabel(re, { exact: true, ...opts }) : page.getByLabel(re, opts);
async function tap(re, which = 'first') {
  const l = byLabel(re); const c = await l.count();
  if (!c) throw new Error(`nothing labelled ${re}`);
  for (let i = 0; i < c; i++) { const el = which === 'last' ? l.nth(c - 1 - i) : l.nth(i); if (!(await el.isVisible())) continue; const b = await el.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (x < 0 || x > 393 || y < 0 || y > 852) continue; await page.mouse.click(x, y); return; }
  throw new Error(`nothing visible labelled ${re}`);
}
async function visible(re) { const l = byLabel(re); const c = await l.count(); for (let i = 0; i < c; i++) { const el = l.nth(i); if (!(await el.isVisible())) continue; const b = await el.boundingBox(); if (b && b.x + b.width / 2 > 0 && b.x + b.width / 2 < 393 && b.y + b.height / 2 > 0 && b.y + b.height / 2 < 852) return true; } return false; }
async function priceBox() {
  const el = page.locator('[aria-label$=" dollars"]').filter({ hasNotText: 'total' });
  for (let i = 0; i < await el.count(); i++) { const x = await el.nth(i).boundingBox(); if (x && x.y > 500 && x.y < 852 && x.x < 200) return x; }
  throw new Error('no price on the first car');
}
async function dragPriceUp() {
  const bb = await priceBox();
  await page.mouse.move(bb.x + 40, bb.y + bb.height / 2); await page.mouse.down();
  for (let i = 1; i <= 14; i++) { await page.mouse.move(bb.x + 40, bb.y + bb.height / 2 - 70 * i / 14); await wait(16); }
  await wait(100); await page.mouse.up(); await wait(1100);
}
async function scrollToEnd() { await page.mouse.move(196, 500); for (let i = 0; i < 16; i++) { await page.mouse.wheel(0, 600); await wait(60); } await wait(700); }
async function watchingCount() { const a = await page.evaluate(() => [...document.querySelectorAll('[aria-label$="watching"],[aria-label$="watching, you too"]')].filter(e => { const b = e.getBoundingClientRect(); return b.top >= 0 && b.top < innerHeight; }).map(e => e.getAttribute('aria-label'))); return a[0] ?? null; }
async function sign() {
  const pad = await byLabel('Signature pad').last().boundingBox();
  await page.mouse.move(pad.x + 30, pad.y + pad.height / 2); await page.mouse.down();
  for (let i = 1; i <= 30; i++) { await page.mouse.move(pad.x + 30 + i * 8, pad.y + pad.height / 2 - Math.sin(i / 3) * 30); await wait(8); }
  await page.mouse.up(); await wait(500);
}

const steps = [
  ['open the lane', async () => { await page.goto(`http://127.0.0.1:${PORT}/?win=1`); await wait(3000); await screen('lane'); }],
  ['double tap to watch', async () => {
    const before = await watchingCount();
    await page.mouse.dblclick(260, 330); await wait(900);
    const after = await watchingCount();
    if (!after || after === before) notes.push(`double tap: the count stayed "${before}"`);
    await screen('lane-watched', { watching: { before, after } });
  }],
  ['drag the price up to the Bid sheet', async () => { await dragPriceUp(); if (!(await visible('Bid')) && !(await visible('Bid, double tap and hold'))) throw new Error('no Bid sheet'); await screen('bid-first'); }],
  ['Bid', async () => { await tap(/^Bid/, 'last'); await wait(1300); }],
  ['phone, if the chain asks for it', async () => {
    if (!(await visible('Your number'))) { notes.push('no Phone page in the first-bid chain'); return; }
    await screen('phone-number');
    await tap('Your number', 'last'); await page.keyboard.type('2145550142', { delay: 20 }); await wait(300);
    await tap('Text me a code', 'last'); await wait(1000);
    await screen('phone-code');
    await page.keyboard.type('000000', { delay: 40 }); await wait(2200);
  }],
  ['ID, the fixture', async () => {
    if (!(await until(() => visible('Take the photo'), 6000))) throw new Error('no ID frame after the phone');
    await screen('id-frame');
    await tap('Take the photo'); await wait(1600);
    await screen('id-facts');
    await tap("That's me", 'last'); await wait(1300);
  }],
  ['the deposit', async () => {
    if (!(await until(() => visible(/^Pay \d+ dollars/), 6000))) throw new Error('no deposit page');
    await screen('deposit');
    await tap(/^Pay \d+ dollars/, 'last'); await wait(900);
  }],
  ['the terms, the last page before the bid', async () => {
    // the terms page stands over the sheet: its Bid is the only Bid on the glass that is tappable
    if (!(await until(async () => /irrevocable/i.test(await bodyText()), 6000))) throw new Error('no terms page after the deposit');
    await wait(400);
    await screen('terms');
    await tap(/^Bid/, 'last'); await wait(450);   // the local ack is at once; the landed sheet stays 900 ms, so the shot is inside it
  }],
  ['the bid lands, the hammer falls', async () => {
    await screen('bid-landed');
    if (!(await until(() => visible(/^ID, next/), 20000))) throw new Error('the hammer never fell (?win=1)');
    await wait(1900);
    await screen('won-steps');
  }],
  ['ID, prefilled', async () => { await tap(/^ID, next/); await wait(1100); await screen('id-prefilled'); await tap("That's me", 'last'); await wait(1700); }],
  ['Insure', async () => { await tap(/^Insure/); await wait(1000); await screen('insure'); await tap('Take the photo'); await wait(2700); }],
  ['Sign: the Buyers Guide', async () => {
    // the step opens the document itself; no page between (simplicity-audit change 5)
    await tap(/^Sign/); await wait(1300); await scrollToEnd(); await screen('buyers-guide');
    await sign(); await screen('buyers-signed');
    await tap('Sign', 'last'); await wait(1600);
  }],
  ['Sign: the Bill of Sale', async () => {
    // signing the Buyers Guide opened the Bill of Sale; the first signature sits on its pad, Sign signs with it
    if (!(await until(async () => /Bill of Sale/i.test(await bodyText()), 6000))) throw new Error('the Bill of Sale did not open after the Buyers Guide');
    await scrollToEnd(); await screen('bill-of-sale');
    await tap('Sign', 'last'); await wait(1600);
    if (await visible('Done')) { await tap('Done', 'last'); await wait(1300); }
    await screen('won-steps-2');
  }],
  ['Pay, a word', async () => { await tap(/^(Pay|Keys|Plates|Title), next/); await wait(1200); await screen('pay'); await tap(/^Wire/); await wait(1400); }],
  ['Pickup: where, when, the pass', async () => {
    await screen('pickup-where');
    await page.mouse.move(196, 500); await page.mouse.wheel(393, 0); await wait(1200);
    await screen('pickup-when');
    const slot = await page.evaluate(() => [...document.querySelectorAll('[data-wt-tap]')].map(e => e.getAttribute('aria-label') || '').find(x => /\d/.test(x) && !/call/i.test(x)));
    if (slot) { await tap(slot); await wait(600); } else notes.push('Pickup, when: the fixture lot has no hours; the page is "Call" over the number and the pass is ready without a slot');
    for (let i = 0; i < 4 && !(await visible(/^Pass, /)); i++) { await page.mouse.move(196, 500); await page.mouse.wheel(393, 0); await wait(1300); }
    await screen('pickup-pass');
    const pb = await page.locator('[aria-label^="Pass, "]').first().boundingBox();
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2); await page.mouse.down(); await wait(900); await page.mouse.up();
    if (!(await until(() => visible('Done'), 12000, 250))) throw new Error('the pass never started the car');
    await wait(700); await screen('pickup-started');
    await tap('Done', 'last'); await wait(1300);
  }],
  ['Plates', async () => {
    if (!/filed/i.test(await bodyText())) notes.push('Plates: the ring carries no word (expected "Filed by" or "Filed")');
    await screen('plates');
    await wait(15500);   // the local demo cadence: filed 4 s, approved 9 s, mailed 14 s after the start (sale.ts)
    await screen('plates-mailed');
  }],
  ['to the lane', async () => {
    await tap('Back', 'last'); await wait(1300);
    if (!(await until(() => visible('To the lane'), 4000))) throw new Error('no "To the lane" after the plates were mailed');
    await screen('won-done');
    await tap('To the lane', 'last'); await wait(1600);
  }],
  ['Me', async () => { await tap('Me'); await wait(1500); await screen('me'); }],
  ['the second chance', async () => {
    // a fresh launch where the "Second chance" push would land: the first lot closed to a rival who never paid, the
    // offer to me at my max (store.ts ?offer=1 plays the forfeit and the push's intent)
    await page.goto(`http://127.0.0.1:${PORT}/?offer=1`); await wait(3000);
    if (!(await until(() => visible(/^Take it/), 6000))) throw new Error('no Offer page on ?offer=1');
    await screen('offer');
    await tap(/^Take it/, 'last');
    if (!(await until(() => visible(/^ID, next/), 8000))) throw new Error('Take it did not open Won');
  }],
];

let reached = 0;
for (const [name, f] of steps) {
  try { await f(); reached++; }
  catch (e) {
    fail(current, `could not ${name}: ${String(e.message).split('\n')[0]}`);
    await page.screenshot({ path: path.join(OUT, `zz-stuck-${name.replace(/\W+/g, '-')}.png`) }).catch(() => {});
    break;
  }
}

fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify({ at: new Date().toISOString(), viewport: '393x852@2x', url: '?win=1', reached, of: steps.length, shots, failures, notes }, null, 1));
console.log(`walk: ${reached}/${steps.length} steps, ${shots.length} screens, ${failures.length} failures`);
for (const n of notes) console.log(`note: ${n}`);
await browser.close(); server.close();
process.exit(failures.length ? 1 : 0);
