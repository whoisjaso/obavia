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

export type Fees = { taxRate: number; title: number; registration: number; doc: number;
  plate: number;             // the dealer-issued metal plate, $10 (decisions §9 D6)
  database?: number;         // the dealer's database compliance fee, off unless the dealer charges it; never above $20
  lateHandling?: number };   // charged if a buyer-filed title comes back to the dealer (Vehicle Responsibility); the dealer's own figure

/** Texas statutory lines. The doc fee is the dealer's, asked at onboarding.
    plate: Transp. Code §503.063 as amended by HB 718 (eff. 7/1/2025); TxDMV HB 718 Dealer FAQ (March 2025, read
    2026-10-13): "You cannot charge more than $10." Paid to the tax office with the title application.
    registration: $75 is a SEEDED ESTIMATE. Registration runs $64.00 to $98.25 by county (TxDMV); decisions §8.6 says
    the total uses $98.25 labelled "estimate" until per-county values exist. Not yet applied here. */
export const TEXAS = { taxRate: 0.0625, title: 33, registration: 75, plate: 10 } as const;

/** Transp. Code §503.0631(f): "a reasonable fee not to exceed $20". Charged only if the dealer turns it on. */
export const DATABASE_FEE_MAX = 20;
export const databaseFee = (f: Fees) => Math.min(DATABASE_FEE_MAX, Math.max(0, f.database ?? 0));
/** A document filed before the plate fee existed froze its fees without one; it keeps the total it was filed with. */
export const plateFee = (f: Fees) => f.plate ?? 0;

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

export const totalFees = (f: Fees) => f.title + f.doc + f.registration + plateFee(f) + databaseFee(f);

/** Business date in the dealer's zone, never the server's UTC date. */
export function businessDate(tz: string, at = new Date()) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, month: '2-digit', day: '2-digit', year: 'numeric' }).format(at);
}
