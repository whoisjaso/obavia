/* Finding the dealership at onboarding. The state comes first: it decides
   which licence list we search. Texas publishes every active independent
   (GDN) dealer (TxDMV Motor Vehicle Dealers List: business name, DBA,
   licence number, city, county). The backend loads that list daily; the
   preview searches a small example list in its shape. */

export type DealerRecord = { licence: string; name: string; dba?: string; city: string; county: string; state: string; phone?: string; email?: string };

export const STATES: [string, string][] = [
  ['TX', 'Texas'], ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'],
  ['DE', 'Delaware'], ['DC', 'District Of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'],
  ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'],
  ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
  ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

/** States whose licence list is loaded. Everywhere else verifies with the licence itself. */
export const LIST_STATES = new Set(['TX']);

/** Example records in the TxDMV list's shape. Not real dealers. */
export const EXAMPLE_DEALERS: DealerRecord[] = [
  { licence: 'P000101', name: 'EXAMPLE MOTORS LLC', dba: 'Example Motors', city: 'Houston', county: 'Harris', state: 'TX', phone: '5550100101', email: 'office@examplemotors.example' },
  { licence: 'P000102', name: 'SAMPLE AUTO SALES INC', dba: 'Sample Auto', city: 'Pasadena', county: 'Harris', state: 'TX', phone: '5550100102', email: 'sales@sampleauto.example' },
  { licence: 'P000103', name: 'DEMO CAR COMPANY LLC', city: 'Katy', county: 'Harris', state: 'TX', phone: '5550100103' },
  { licence: 'P000104', name: 'PREVIEW AUTO GROUP LLC', dba: 'Preview Autos', city: 'Sugar Land', county: 'Fort Bend', state: 'TX', email: 'hello@previewautos.example' },
  { licence: 'P000105', name: 'PLACEHOLDER PRE-OWNED LLC', city: 'Dallas', county: 'Dallas', state: 'TX', phone: '5550100105' },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\b(llc|inc|co|corp|ltd|the)\b/g, ' ').replace(/\s+/g, ' ').trim();

/** Every word typed must start a word in the name or DBA. */
export function searchDealers(list: DealerRecord[], state: string, q: string, max = 6): DealerRecord[] {
  const words = norm(q).split(' ').filter(Boolean);
  if (!words.length) return [];
  return list.filter(d => d.state === state).filter(d => {
    const hay = norm(`${d.name} ${d.dba ?? ''} ${d.licence}`).split(' ');
    return words.every(w => hay.some(h => h.startsWith(w)));
  }).slice(0, max);
}

export const maskPhone = (p: string) => `(•••) •••-${p.replace(/\D/g, '').slice(-4)}`;
export const maskEmail = (e: string) => { const [u, d] = e.split('@'); return `${u[0]}${'•'.repeat(Math.max(2, u.length - 1))}@${d}`; };

export const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).replace(/\b(Llc|Inc)\b/g, m => m.toUpperCase());
