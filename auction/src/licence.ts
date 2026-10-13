/* The licence read. The back of every US licence carries a PDF417 barcode in the AAMVA DL/ID format; expo-camera
   reads it (barcodeTypes ['pdf417'], CameraView onBarcodeScanned) and hands this module the text. Nothing here
   touches the camera or the network: a string in, the facts out, pure and tested (licence.test.ts).

   The payload: "@", LF, RS, CR, then a header ("ANSI " + the issuer's six-digit IIN + version + jurisdiction
   version + the number of subfiles), then one designator per subfile (type, four-digit offset, four-digit length),
   then the subfiles. A driver licence is subfile "DL"; an ID card is "ID". Inside a subfile every element is a
   three-letter id starting with D and its value, one per line. Scanners differ on line ends (some turn CR into LF,
   some drop the control characters), so offsets are trusted only when they land on the subfile's own two letters.

   A licence's last four of the SSN is never on the card and is never read; the buyer types it into webDEALER. */
import type { Licence } from './sale';

/** What the barcode says, fact by fact. `toSale` turns it into the sale's Licence (last four, the glass's date). */
export type LicenceRead = {
  /** First, middle, last, as on the card, in title case. */
  name: string;
  street: string;
  city: string;
  /** The address state (DAJ), two letters. */
  state: string;
  /** Five digits. */
  zip: string;
  /** ISO date, YYYY-MM-DD. */
  dob: string;
  /** The full licence number (DAQ). Held for webDEALER on the buyer's own phone; never sent, never persisted. */
  number: string;
  /** ISO date, YYYY-MM-DD. */
  expires: string;
  /** ISO date, YYYY-MM-DD, or '' when the card does not carry it. */
  issued: string;
  /** Texas: the audit number (DCF). '' when absent. */
  audit: string;
  /** The issuer's identification number from the header: 636015 is Texas. */
  iin: string;
};

const TEXAS_IIN = '636015';

/** The sale's licence line: last four only, as the frame shows it. */
const mask = (n: string) => (n.length > 4 ? '•••• ' + n.slice(-4) : n);

const title = (s: string) => s.toLowerCase().replace(/(^|[\s\-'])([a-zà-ÿ])/g, (_, a: string, b: string) => a + b.toUpperCase());

const clean = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/* "NONE" and "unavl" are how AAMVA writes an absent name part. */
const part = (s: string | undefined) => {
  const v = clean(s);
  return /^(NONE|UNAVL|UNAVAILABLE)$/i.test(v) ? '' : v;
};

/* AAMVA dates: MMDDCCYY for the United States, CCYYMMDD for Canada and for version 1 cards. */
function date(raw: string | undefined, ymd: boolean): string {
  const d = clean(raw).replace(/\D/g, '');
  if (d.length !== 8) return '';
  const [y, m, day] = ymd ? [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)] : [d.slice(4, 8), d.slice(0, 2), d.slice(2, 4)];
  const mm = Number(m), dd = Number(day), yy = Number(y);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yy < 1900 || yy > 2200) return '';
  return `${y}-${m}-${day}`;
}

type Header = { iin: string; version: number; files: { type: string; offset: number; length: number }[]; end: number };

function header(raw: string): Header | null {
  const at = raw.search(/ANSI ?\d{6}|AAMVA\d{6}/);
  if (at < 0) return null;
  const m = /^(?:ANSI ?|AAMVA)(\d{6})(\d{2})(\d{2})?(\d{2})/.exec(raw.slice(at));
  if (!m) return null;
  const version = Number(m[2]);
  const files: Header['files'] = [];
  let i = at + m[0].length;
  const count = Number(m[4]);
  for (let k = 0; k < count; k++) {
    const d = /^([A-Z]{2})(\d{4})(\d{4})/.exec(raw.slice(i));
    if (!d) break;
    files.push({ type: d[1], offset: Number(d[2]), length: Number(d[3]) });
    i += 10;
  }
  return { iin: m[1], version, files, end: i };
}

/* The DL subfile's text: by its offset when the offset lands on "DL", else the first "DL" followed by an element id
   after the designators (a scanner that rewrote line ends shifts every offset). */
function subfile(raw: string, h: Header): string | null {
  const dl = h.files.find(f => f.type === 'DL');
  if (!dl) return null;
  if (raw.slice(dl.offset, dl.offset + 2) === 'DL') return raw.slice(dl.offset + 2, dl.offset + dl.length);
  const rest = raw.slice(h.end);
  const at = rest.search(/DL(?=D[A-Z]{2})/);
  if (at < 0) return null;
  const next = h.files.filter(f => f.type !== 'DL').map(f => rest.indexOf(f.type, at + 2)).filter(n => n > at);
  return rest.slice(at + 2, next.length ? Math.min(...next) : undefined);
}

function elements(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split(/[\r\n\u001e\u001d]+/)) {
    const m = /^(D[A-Z]{2})(.*)$/.exec(line.trim());
    if (m && !out.has(m[1])) out.set(m[1], m[2]);
  }
  return out;
}

/** The AAMVA DL/ID PDF417 payload to the licence facts. null when the payload is not a driver licence subfile
    (an ID card, a malformed read, a barcode that is not AAMVA) or lacks a name, a number, a birth date or an expiry. */
export function parseAamva(raw: string): LicenceRead | null {
  if (typeof raw !== 'string' || raw.length < 30) return null;
  const h = header(raw);
  if (!h) return null;
  const text = subfile(raw, h);
  if (text == null) return null;
  const e = elements(text);
  const ymd = h.version <= 1 || clean(e.get('DCG')).toUpperCase() === 'CAN';

  let last = part(e.get('DCS')), first = part(e.get('DAC')), middle = part(e.get('DAD'));
  if (!first && e.has('DCT')) {                     // version 2: DCT carries the given names
    const given = part(e.get('DCT')).split(/[ ,]+/);
    first = given[0] ?? ''; middle = given.slice(1).join(' ');
  }
  if (!last && e.has('DAA')) {                      // version 1: DAA is LAST,FIRST,MIDDLE
    const [l, f, ...mid] = part(e.get('DAA')).split(',').map(clean);
    last = l ?? ''; first = first || f || ''; middle = middle || mid.join(' ');
  }
  const name = title([first, middle, last].filter(Boolean).join(' '));

  const number = clean(e.get('DAQ')).replace(/\s/g, '');
  const dob = date(e.get('DBB'), ymd);
  const expires = date(e.get('DBA'), ymd);
  if (!name || !number || !dob || !expires) return null;

  const street = title([clean(e.get('DAG')), clean(e.get('DAH'))].filter(Boolean).join(' '));
  const city = title(clean(e.get('DAI')));
  const state = clean(e.get('DAJ')).toUpperCase().slice(0, 2);
  const zip = clean(e.get('DAK')).replace(/\D/g, '').slice(0, 5);
  const audit = h.iin === TEXAS_IIN ? clean(e.get('DCF')) : '';

  return { name, street, city, state, zip, dob, number, expires, issued: date(e.get('DBD'), ymd), audit, iin: h.iin };
}

/** The sale's Licence from a read: the glass's date, the last four only, nothing else. */
export function toSale(l: LicenceRead): Licence {
  const [y, m, d] = l.dob.split('-');
  const address = [l.street, l.city].filter(Boolean).join(', ');
  return { name: l.name, dob: `${m}/${d}/${y}`, address, licence: mask(l.number), state: l.state, confirmed: false };
}

/** Issued by Texas: the header's IIN, or the address state when a scanner lost the header's IIN. */
export const isTexas = (l: LicenceRead) => (l.iin ? l.iin === TEXAS_IIN : l.state === 'TX');

/* The device's calendar day, YYYY-MM-DD: a licence is good through its expiry day where the buyer stands. */
const today = (now: number) => {
  const t = new Date(now);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

/** Past its expiry day. */
export const isExpired = (l: LicenceRead, now: number) => today(now) > l.expires;

/** Eighteen or older on the device's calendar day. */
export function isAdult(l: LicenceRead, now: number): boolean {
  const [y, md] = [Number(l.dob.slice(0, 4)), l.dob.slice(5)];
  const t = today(now);
  return t >= `${y + 18}-${md}` || (md === '02-29' && t >= `${y + 18}-03-01`);
}

/** What webDEALER's Buyer Acknowledgment needs from the card (research 3.10): the DL number, the date of birth and
    the audit number. The last four of the SSN is never on the card and stays a typed field; an audit number the
    card did not carry is typed too. null for a non-Texas licence: webDEALER takes Texas DL/ID only. */
export function fieldsForWebDealer(l: LicenceRead): { dl: string; dob: string; audit: string; typed: ('ssnLast4' | 'audit')[] } | null {
  if (!isTexas(l)) return null;
  const [y, m, d] = l.dob.split('-');
  return { dl: l.number, dob: `${m}/${d}/${y}`, audit: l.audit, typed: l.audit ? ['ssnLast4'] : ['ssnLast4', 'audit'] };
}
