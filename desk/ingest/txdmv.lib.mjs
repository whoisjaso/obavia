/* The Texas dealer list, turned into something onboarding can search.

   TxDMV publishes every active Independent (GDN) Motor Vehicle Dealer as a
   spreadsheet, refreshed daily, behind a download link whose file id rotates.
   This module is the pure half: read whatever format arrives (xlsx, legacy
   xls, an HTML table saved as .xls, or CSV/TSV), normalise each row, split it
   into a public search index and a private contact file, diff against the
   last run, and refuse to publish a list that looks broken. */

export const SOURCE_PAGE = 'https://texasdmv.my.salesforce-sites.com/dealers/motorvehicledealerliststaging';

/* ---------- reading ---------- */

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? m);
const text = s => decode(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/** Rows of an HTML table (Salesforce exports often are one, served as .xls). */
export function htmlTableRows(html) {
  const rows = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => text(m[1]));
    if (cells.length) rows.push(cells);
  }
  return rows;
}

/** Rows of a CSV or TSV, quotes respected. */
export function delimitedRows(src) {
  const sep = (src.split('\n', 1)[0].match(/\t/g) ?? []).length > (src.split('\n', 1)[0].match(/,/g) ?? []).length ? '\t' : ',';
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === sep) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

/** What kind of file arrived, from its first bytes. */
export function sniff(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (b[0] === 0x50 && b[1] === 0x4b) return 'xlsx';
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'xls';
  const head = new TextDecoder().decode(b.slice(0, 4096)).toLowerCase();
  if (head.includes('<table') || head.includes('<html')) return 'html';
  return 'delimited';
}

/** Any supported file to rows of cells. Binary spreadsheets go through SheetJS. */
export async function readRows(buf) {
  const kind = sniff(buf);
  if (kind === 'xlsx' || kind === 'xls') {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: false, raw: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return { kind, rows: XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).map(r => r.map(c => String(c ?? '').trim())) };
  }
  const src = new TextDecoder('utf-8').decode(buf);
  return { kind, rows: kind === 'html' ? htmlTableRows(src) : delimitedRows(src) };
}

/* ---------- normalising ---------- */

const key = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** The header names TxDMV uses today, with room for small renames. */
const COLUMNS = {
  licence: ['licensenumber', 'license', 'gdn', 'licenseno'], status: ['licensestatus', 'status'], expires: ['licenseexpdate', 'expirationdate'],
  name: ['businessname', 'name'], dba: ['dbaname', 'dba'], street: ['physicaladdress', 'address'], street2: ['physaddresstwo'],
  city: ['city'], state: ['state'], zip: ['zip', 'zipcode'], county: ['county'], phone: ['phone', 'phonenumber'], email: ['businessemail', 'email'],
  licenseType: ['licensetype'], since: ['activedate'], dealerType: ['dealertype'],
};

export function headerMap(header) {
  const k = header.map(key), map = {};
  for (const [field, names] of Object.entries(COLUMNS)) { const i = k.findIndex(h => names.includes(h)); if (i >= 0) map[field] = i; }
  for (const need of ['licence', 'name', 'city']) if (map[need] === undefined) throw new Error(`TxDMV list is missing the ${need} column. Header was: ${header.join(' | ')}`);
  return map;
}

const clean = s => (s ?? '').replace(/\s+/g, ' ').trim();
const SMALL = new Set(['of', 'and', 'the', 'de', 'la', 'del', 'y']);
/** "BAYER GRAHAM, INC." to "Bayer Graham, Inc."; leaves mixed case alone. */
export function tidyCase(s) {
  s = clean(s);
  if (!s || /[a-z]/.test(s)) return s;
  return s.toLowerCase().replace(/[a-z0-9'’]+/g, (w, i) => (i > 0 && SMALL.has(w)) ? w : w[0].toUpperCase() + w.slice(1))
    .replace(/\b(Llc|Inc|Lp|Llp|Pllc|Dba|Usa|Suv|Bmw|Gmc|Rv|Ii|Iii|Iv)\b/g, m => m.toUpperCase());
}
const digits = s => (s ?? '').replace(/\D/g, '');

/** One row to one dealer, or null when it can't be one. */
export function normalise(row, map) {
  const get = f => (map[f] === undefined ? '' : clean(row[map[f]]));
  const licence = get('licence').toUpperCase();
  if (!/^[A-Z]{1,3}\d{3,}[A-Z]?$/.test(licence)) return null;
  const status = get('status');
  if (status && !/active/i.test(status)) return null;
  const phone = digits(get('phone')).replace(/^1(?=\d{10}$)/, '');
  const email = get('email').toLowerCase();
  return {
    licence, name: tidyCase(get('name')), dba: tidyCase(get('dba')),
    street: tidyCase([get('street'), get('street2')].filter(Boolean).join(' ')), city: tidyCase(get('city')),
    county: tidyCase(get('county')), zip: digits(get('zip')).slice(0, 5),
    phone: phone.length === 10 ? phone : '', email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : '',
    franchise: /franchise/i.test(get('dealerType')), types: [kindOf(get('licenseType'))].filter(Boolean), expires: get('expires'), since: get('since'),
  };
}

/** TxDMV licence types, shortened. One licence number can carry several. */
export const KINDS = { MV: 'Motor Vehicle', MC: 'Motorcycle', TR: 'Trailer', TT: 'Travel Trailer', WH: 'Wholesale', AU: 'Auction', MO: 'Mobility' };
export function kindOf(t) {
  t = (t ?? '').toLowerCase();
  if (!t) return '';
  if (t.includes('auction')) return 'AU';
  if (t.includes('wholesale')) return 'WH';
  if (t.includes('travel trailer')) return 'TT';
  if (t.includes('trailer')) return 'TR';
  if (t.includes('motorcycle')) return 'MC';
  if (t.includes('mobility')) return 'MO';
  return 'MV';
}

export function normaliseAll(rows) {
  const at = rows.findIndex(r => r.some(c => key(c) === 'licensenumber'));
  const map = headerMap(rows[at < 0 ? 0 : at]);
  const byLicence = new Map();
  for (const r of rows.slice((at < 0 ? 0 : at) + 1)) {
    const d = normalise(r, map); if (!d) continue;
    const had = byLicence.get(d.licence);
    if (!had) { byLicence.set(d.licence, d); continue; }
    // Same licence on another row: keep the first record, fill its gaps, collect its types.
    for (const k of ['dba', 'phone', 'email', 'street', 'zip', 'county']) if (!had[k] && d[k]) had[k] = d[k];
    for (const t of d.types) if (!had.types.includes(t)) had.types.push(t);
    had.franchise ||= d.franchise;
  }
  return [...byLicence.values()].sort((a, b) => a.licence.localeCompare(b.licence));
}

/* ---------- publishing ---------- */

/** Enough of a contact to recognise it, never enough to use it. */
export const phoneHint = p => (p ? p.slice(-4) : '');
export function emailHint(e) {
  if (!e) return '';
  const [u, d] = e.split('@');
  return `${u[0]}${'•'.repeat(Math.min(6, Math.max(2, u.length - 1)))}@${d}`;
}

export const INDEX_FIELDS = ['licence', 'name', 'dba', 'city', 'county', 'zip', 'franchise', 'types', 'phoneLast4', 'emailHint'];

/** The public search index: no full phone numbers or emails. */
export function buildIndex(dealers, asOf) {
  return {
    v: 1, state: 'TX', source: SOURCE_PAGE, asOf, count: dealers.length, fields: INDEX_FIELDS,
    rows: dealers.map(d => [d.licence, d.name, d.dba, d.city, d.county, d.zip, d.franchise ? 1 : 0, d.types.join(' '), phoneHint(d.phone), emailHint(d.email)]),
  };
}

/** The private file the verification service reads to send a code. */
export function buildContacts(dealers, asOf) {
  const out = {};
  for (const d of dealers) if (d.phone || d.email) out[d.licence] = { phone: d.phone || undefined, email: d.email || undefined, name: d.dba || d.name, street: d.street, city: d.city, zip: d.zip };
  return { v: 1, state: 'TX', asOf, contacts: out };
}

/** Who appeared and who dropped off since the last published index. */
export function diffIndex(prev, next) {
  const before = new Set((prev?.rows ?? []).map(r => r[0])), after = new Set(next.rows.map(r => r[0]));
  return { added: [...after].filter(l => !before.has(l)), removed: [...before].filter(l => !after.has(l)) };
}

/** A download that shrank this much is a broken download, not a mass exodus. */
export function guard(count, prevCount, { floor = 10000, maxDrop = 0.15 } = {}) {
  if (count < floor) return `Only ${count} dealers parsed (expected at least ${floor}). Not publishing.`;
  if (prevCount && count < prevCount * (1 - maxDrop)) return `Dealer count fell from ${prevCount} to ${count} (more than ${maxDrop * 100}%). Not publishing.`;
  return null;
}

/** The download link on the list page. Its file id changes, so it's read fresh each run. */
export function findDownloadHref(html) {
  const m = html.match(/href="([^"]*servlet\.FileDownload\?[^"]+)"/i);
  if (!m) return null;
  const href = decode(m[1]);
  return new URL(href, SOURCE_PAGE).toString();
}

/** "Data is current as of 09/30/2026" on the list page, as an ISO date. */
export function findAsOf(html) {
  const m = html.match(/current as of\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}
