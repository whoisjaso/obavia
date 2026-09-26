// Deploys obavia-co/ to obavia.co as a new version of the live Worker
// (obavia-waitlist). Everything the waitlist needs is carried over: its
// bindings (D1, email, vars) come from the live settings, secrets are kept
// in place, and the cron schedule and custom domain are not touched.
// After the upload it checks the live site and rolls back if anything fails.
//
// env: CLOUDFLARE_API_TOKEN (Workers Scripts: Edit), CLOUDFLARE_ACCOUNT_ID
// (optional), DRY_RUN=1 to stop before uploading.
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = process.env.DIST ?? join(HERE, 'dist');
const SCRIPT = process.env.SCRIPT ?? 'obavia-waitlist';
const SITE = process.env.SITE ?? 'https://obavia.co';
const API = process.env.CF_API ?? 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const EMAIL_ASSETS = [
  '/email-assets/waitlist-v4/cloud.gif', '/email-assets/waitlist-v4/cloud.png',
  '/email-assets/waitlist-v6/launch.ics',
  '/email-assets/waitlist-v7/cloud-footer.gif', '/email-assets/waitlist-v7/cloud-footer.png',
];
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.ics': 'text/calendar', '.woff2': 'font/woff2' };

if (!TOKEN) throw new Error('CLOUDFLARE_API_TOKEN is not set');
const log = (...a) => console.log('·', ...a);

async function api(path, { method = 'GET', body, headers = {}, auth = TOKEN } = {}) {
  const res = await fetch(API + path, { method, body, headers: { Authorization: `Bearer ${auth}`, ...headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data.errors ?? data).slice(0, 400)}`);
  return data.result;
}
const json = body => ({ body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await files(p)); else out.push(p);
  }
  return out;
}

// 1. The live Worker, as it runs now.
const account = process.env.CLOUDFLARE_ACCOUNT_ID || (await api('/accounts'))[0].id;
const base = `/accounts/${account}/workers/scripts/${SCRIPT}`;
const settings = await api(`${base}/settings`);
const deployments = await api(`${base}/deployments`);
const previous = deployments.deployments?.[0]?.versions ?? [];
const kept = ['secret_text', 'secret_key'];
const bindings = (settings.bindings ?? []).filter(b => !kept.includes(b.type));
if (!bindings.some(b => b.type === 'assets')) bindings.push({ type: 'assets', name: 'ASSETS' });
for (const need of ['WAITLIST_DB', 'PUBLIC_ORIGIN']) {
  if (!(settings.bindings ?? []).some(b => b.name === need)) throw new Error(`live Worker has no ${need} binding; stopping`);
}
// The waitlist code as deployed, pulled at deploy time so it never lives in
// this (public) repo. After the first deploy it is the live-worker.js module.
const raw = await fetch(API + base, { headers: { Authorization: `Bearer ${TOKEN}` } });
if (!raw.ok) throw new Error(`GET ${base} → ${raw.status}`);
const boundary = (raw.headers.get('content-type') ?? '').match(/boundary=("?)([^";]+)\1/)?.[2];
const text = await raw.text();
const parts = {};
for (const chunk of boundary ? text.split('--' + boundary) : []) {
  const m = chunk.match(/name="([^"]+)"[^]*?\r?\n\r?\n([^]*)$/);
  if (m) parts[m[1]] = m[2].replace(/\r?\n$/, '');
}
const liveCode = parts['live-worker.js'] ?? parts['worker.js'];
if (!liveCode || !liveCode.includes('function handleWaitlist') || !liveCode.includes('createWorker')) throw new Error('could not read the live waitlist code; stopping');
await writeFile(join(HERE, 'live-worker.js'), liveCode.replace(/^\/\/# sourceMappingURL=.*$/m, ''));
log('live waitlist code', `${liveCode.length} bytes`, parts['live-worker.js'] ? '(from live-worker.js)' : '(from worker.js)');
log('live bindings', (settings.bindings ?? []).map(b => `${b.name}:${b.type}`).join(', '));
log('live version', previous.map(v => `${v.version_id}@${v.percentage}%`).join(', ') || 'none');

// 2. The email assets the confirmation emails link to, pulled from the live site.
for (const p of EMAIL_ASSETS) {
  const res = await fetch(SITE + p);
  if (!res.ok) throw new Error(`could not fetch ${p} from the live site (${res.status})`);
  const to = join(DIST, p);
  await mkdir(dirname(to), { recursive: true });
  await writeFile(to, Buffer.from(await res.arrayBuffer()));
}

// 3. The manifest.
const manifest = {}, byHash = {};
for (const f of await files(DIST)) {
  const buf = await readFile(f), b64 = buf.toString('base64'), ext = extname(f);
  const hash = createHash('sha256').update(b64 + ext.slice(1)).digest('hex').slice(0, 32);
  const path = '/' + relative(DIST, f).split('\\').join('/');
  manifest[path] = { hash, size: buf.length };
  byHash[hash] = { b64, type: TYPES[ext] ?? 'application/octet-stream' };
}
log(`${Object.keys(manifest).length} files staged`);
for (const must of ['/index.html', '/waitlist.html', '/404.html', ...EMAIL_ASSETS]) if (!manifest[must]) throw new Error(`missing ${must}`);
if (DRY) { log('dry run: stopping before upload'); process.exit(0); }

// 4. Upload the assets, then the Worker.
const session = await api(`${base}/assets-upload-session`, { method: 'POST', ...json({ manifest }) });
let done = session.jwt;
for (const bucket of session.buckets ?? []) {
  const form = new FormData();
  for (const h of bucket) form.append(h, new File([byHash[h].b64], h, { type: byHash[h].type }), h);
  const r = await api(`/accounts/${account}/workers/assets/upload?base64=true`, { method: 'POST', body: form, auth: session.jwt });
  if (r?.jwt) done = r.jwt;
}
log(`assets uploaded (${(session.buckets ?? []).flat().length} new)`);

const metadata = {
  main_module: 'worker.js',
  compatibility_date: settings.compatibility_date,
  compatibility_flags: settings.compatibility_flags ?? [],
  bindings, keep_bindings: kept,
  assets: { jwt: done, config: { run_worker_first: true, html_handling: 'auto-trailing-slash', not_found_handling: 'none' } },
};
for (const k of ['observability', 'logpush', 'placement', 'tail_consumers', 'usage_model']) if (settings[k] !== undefined) metadata[k] = settings[k];
const form = new FormData();
form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
for (const name of ['worker.js', 'live-worker.js']) {
  form.append(name, new File([await readFile(join(HERE, name))], name, { type: 'application/javascript+module' }), name);
}
const uploaded = await api(base, { method: 'PUT', body: form });
log('deployed', uploaded?.id ?? '');

// 5. Check the live site. Roll back if any check fails.
async function check() {
  const get = (p, init) => fetch(SITE + p, { redirect: 'manual', ...init });
  const fails = [];
  const expect = async (label, p, ok, init) => { try { const r = await get(p, init); if (!(await ok(r))) fails.push(`${label}: ${r.status}`); } catch (e) { fails.push(`${label}: ${e.message}`); } };
  await expect('home', '/', async r => r.status === 200 && (await r.text()).includes('Know why deals are lost'));
  await expect('waitlist page', '/waitlist', async r => r.status === 200 && (await r.text()).includes('wlForm'));
  await expect('sky', '/sky/w0.webp', async r => r.status === 200);
  await expect('logos', '/logos/slack.svg', async r => r.status === 200);
  await expect('email asset', '/email-assets/waitlist-v4/cloud.png', async r => r.status === 200);
  await expect('redirect', '/teams', async r => r.status === 301 && r.headers.get('location')?.endsWith('/team'));
  await expect('not found', '/no-such-page', async r => r.status === 404);
  // An invalid email is rejected before anything is stored.
  await expect('waitlist api', '/api/waitlist', async r => r.status === 422, { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json' }, body: '{"email":"not-an-email"}' });
  return fails;
}
let fails = [];
for (let i = 0; i < 6; i++) {
  await new Promise(r => setTimeout(r, Number(process.env.CHECK_WAIT_MS ?? 10000)));
  fails = await check();
  if (!fails.length) break;
  log(`checks failing (${fails.join('; ')}), retrying`);
}
if (fails.length) {
  if (previous.length) {
    await api(`${base}/deployments`, { method: 'POST', ...json({ strategy: 'percentage', versions: previous.map(v => ({ version_id: v.version_id, percentage: v.percentage })) }) });
    console.error('✗ checks failed, rolled back to', previous.map(v => v.version_id).join(', '));
  }
  throw new Error('live checks failed: ' + fails.join('; '));
}
log('live checks passed');
