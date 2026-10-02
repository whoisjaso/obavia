/* Dealer facts live here and nowhere else. Every screen and document reads
   them from the workspace; nothing in src/ types a fee, a rate or a name.
   The Texas lines are the state's (tax, title, registration); the doc fee
   is the dealer's own and comes from onboarding. */

export type Brand = { accent: string; logo: string | null; monogram: string };

export type DealerConfig = {
  legalName: string; dba: string;
  street: string; city: string; state: string; zip: string; county: string;
  phone: string; email: string; website: string;
  licence: string; timeZone: string;
  signer: { name: string; title: string };
  languages: ('en' | 'es')[];
  fees: Fees;
  brand: Brand;
  rateCeiling?: number | null;     // the Tex. Fin. Code ch. 348 ceiling the owner confirmed for their vehicles; 18% holds until then
  spanishApproved?: boolean;       // counsel approved the Spanish translations: lifts the pending mark and allows Spanish e-signing
};

/** The legal facts every document prints. Missing ones print "[Not set: …]" and block filing. */
export function missingFacts(d: DealerConfig): string[] {
  const need: [string, unknown][] = [['Legal name', d.legalName], ['Street', d.street], ['City', d.city], ['ZIP', d.zip], ['County', d.county], ['Phone', d.phone],
    ['Dealer licence (GDN)', d.licence], ['Authorised signer', d.signer?.name], ['Documentary fee', Number.isFinite(d.fees?.doc) ? 'ok' : '']];
  return need.filter(([, v]) => !String(v ?? '').trim()).map(([k]) => k);
}
export const notSet = (label: string) => `[Not set: ${label}]`;

export type Fees = { taxRate: number; title: number; registration: number; doc: number };

/** Texas statutory lines. The doc fee is the dealer's, asked at onboarding. */
export const TEXAS = { taxRate: 0.0625, title: 33, registration: 75 } as const;

/** The example workspace the public preview opens in. Clearly not a real dealer. */
export const EXAMPLE_DEALER: DealerConfig = {
  legalName: 'Example Motors LLC', dba: 'Example Motors',
  street: '100 Example Street', city: 'Houston', state: 'TX', zip: '77002', county: 'Harris',
  phone: '(555) 010-0000', email: 'desk@example.com', website: 'example.com',
  licence: 'P000000', timeZone: 'America/Chicago',
  signer: { name: 'Alex Example', title: 'Owner' },
  languages: ['en', 'es'],
  fees: { ...TEXAS, doc: 292 },
  brand: { accent: '#4E6AA8', logo: null, monogram: 'EM' },
};

export const totalFees = (f: Fees) => f.title + f.doc + f.registration;

/** Business date in the dealer's zone, never the server's UTC date. */
export function businessDate(tz: string, at = new Date()) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, month: '2-digit', day: '2-digit', year: 'numeric' }).format(at);
}
