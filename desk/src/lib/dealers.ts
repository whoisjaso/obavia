/* Finding the dealership at onboarding. The state comes first: it decides
   which licence list we search. Texas publishes every active independent
   (GDN) dealer (TxDMV Motor Vehicle Dealers List: business name, DBA,
   licence number, city, county, contact). desk/ingest rebuilds the index
   nightly; the app searches it in the browser. */

/** One licensed dealer from a state list. Contacts arrive as hints only: the
    full phone and email stay on the server that sends the code. */
export type DealerRecord = { licence: string; name: string; dba: string; city: string; county: string; zip: string; state: string; franchise: boolean; types: string[]; phoneLast4: string; emailHint: string };

export const STATES: [string, string][] = [
  ['TX', 'Texas'], ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'],
  ['DE', 'Delaware'], ['DC', 'District Of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'],
  ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'],
  ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
  ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

/** The published index, refreshed nightly by the TxDMV job. The copy bundled
    with the app is the fallback when the CDN can't be reached. */
export const INDEX_URL: Record<string, string[]> = {
  TX: ['https://cdn.jsdelivr.net/gh/whoisjaso/obavia@data-txdmv/tx.index.json', './dealers/tx.index.json'],
};

export type DealerIndex = { state: string; asOf: string; count: number; list: DealerRecord[]; hay: string[][] };
type RawIndex = { state: string; asOf: string; count: number; fields: string[]; rows: (string | number)[][] };

const norm = (s: string) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\b(llc|inc|co|corp|ltd|lp|the)\b/g, ' ').replace(/\s+/g, ' ').trim();

export function parseIndex(raw: RawIndex): DealerIndex {
  const at = (f: string) => raw.fields.indexOf(f);
  const [L, N, D, C, K, Z, F, T, P, E] = ['licence', 'name', 'dba', 'city', 'county', 'zip', 'franchise', 'types', 'phoneLast4', 'emailHint'].map(at);
  const list: DealerRecord[] = raw.rows.map(r => ({
    licence: String(r[L]), name: String(r[N] ?? ''), dba: String(r[D] ?? '').split(',')[0].trim(), city: String(r[C] ?? ''), county: String(r[K] ?? ''),
    zip: String(r[Z] ?? ''), state: raw.state, franchise: r[F] === 1, types: T < 0 ? [] : String(r[T] ?? '').split(' ').filter(Boolean),
    phoneLast4: P < 0 ? '' : String(r[P] ?? ''), emailHint: E < 0 ? '' : String(r[E] ?? ''),
  }));
  // Every DBA on the licence is searchable, not only the first one shown.
  const hay = raw.rows.map(r => norm(`${r[N]} ${r[D]} ${r[L]}`).split(' '));
  return { state: raw.state, asOf: raw.asOf, count: raw.count, list, hay };
}

const loaded: Record<string, Promise<DealerIndex | null>> = {};
/** Load a state's list once. Tries the nightly CDN copy, then the bundled one. */
export function loadDealerIndex(state: string): Promise<DealerIndex | null> {
  return (loaded[state] ??= (async () => {
    for (const url of INDEX_URL[state] ?? []) {
      try {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
        const r = await fetch(url, { signal: ctl.signal }); clearTimeout(t);
        if (r.ok) return parseIndex(await r.json());
      } catch { /* next source */ }
    }
    return null;
  })());
}
export const hasList = (state: string) => state in INDEX_URL;

/** Every word typed must start a word of the name, a DBA or the licence. Names that start with the query rank first. */
export function searchDealers(idx: DealerIndex, q: string, max = 6): DealerRecord[] {
  const words = norm(q).split(' ').filter(Boolean);
  if (!words.length) return [];
  const hits: [number, number][] = [];
  for (let i = 0; i < idx.list.length; i++) {
    const h = idx.hay[i];
    if (!words.every(w => h.some(x => x.startsWith(w)))) continue;
    const d = idx.list[i], lead = norm(d.dba || d.name).startsWith(norm(q)) || norm(d.name).startsWith(norm(q)) ? 0 : 1;
    hits.push([lead, i]);
  }
  hits.sort((a, b) => a[0] - b[0] || idx.list[a[1]].name.localeCompare(idx.list[b[1]].name));
  return hits.slice(0, max).map(([, i]) => idx.list[i]);
}

export const maskPhone = (last4: string) => `(•••) •••-${last4}`;

export const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/\b(Llc|Inc)\b/g, m => m.toUpperCase());
