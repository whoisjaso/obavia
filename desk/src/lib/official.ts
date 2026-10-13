/* The official state forms, filled from the sale: the real TxDMV 130-U, the
   VTR-271 power of attorney and the purchaser's rebuilt-vehicle disclosure,
   plus the FTC Buyer's Guide. Nothing here is a look-alike: each starts from
   the blank form the agency publishes (public/forms) and writes only into its
   boxes. A county clerk rejects a home-made version, so there is no other kind. */
import type { DealerConfig } from './config';
import type { DocType } from './plan';
import type { Sale } from './sale';
import { asFiled } from './filed';
import { useDealership } from './dealership-config';
import { agreementFromSale } from './fill-130u/from-sale';
import { fill130U } from './fill-130u/fill-pdf';
import { fillPowerOfAttorney, VTR_271_RESTRICTION } from './documents/powerOfAttorneyForm';
import { isEligibleForPlainPoa } from './documents/power-of-attorney-eligibility';
import { repairGeneratedPoaPdf } from './documents/official-template-pdf';
import { fillOfficialRebuiltDisclosure } from './documents/official-rebuilt-disclosure';
import { generateBuyersGuidePdf } from './documents/buyersGuide';
import { formTemplate } from './documents/form-template';
import { fieldCase, vinCase } from './documents/presentation-case';
import { splitPersonName } from './forms/person-name';
import { stablePdf } from './documents/stable-pdf';
import { FORM_14_312_TEMPLATE_PATH, fillForm14312, type Form14312Input } from './documents/form-14-312';
import { remittancePdf, type RemittanceInput } from './documents/remittance';
import { filedMark, type FiledMark } from './filed';

export const OFFICIAL: Partial<Record<DocType, string>> = {
  form130U: 'TxDMV Form 130-U', powerOfAttorney: 'TxDMV Form VTR-271', rebuiltDisclosure: 'TxDMV Form ENF-MV-RBLT DSCLMR',
};
export const isOfficial = (d: DocType) => d in OFFICIAL;

/** The lane's two papers beyond the Desk's packet (gap table W3-F; decisions §9 D9 and §2 row 4), registered here
    the way the forms above are: the Comptroller's Form 14-312 for an out-of-state buyer, filled into the state's own
    file and signed in ink at pickup, and the per-car remittance for the lienholder from the sale's payout rows. */
export type LaneDocType = 'form14312' | 'remittance';
export const OFFICIAL_LANE: Record<LaneDocType, string> = { form14312: 'Comptroller Form 14-312', remittance: 'Lender remittance' };

export type OfficialResult = { pdf: Uint8Array } | { refused: string };
const toIso = (us: string) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(us); return m ? `${m[3]}-${m[1]}-${m[2]}` : us; };

export async function officialPdf(doc: DocType, live: Sale, liveDealer: DealerConfig, buyerSig?: string | null): Promise<OfficialResult> {
  const { sale, dealer, date, agent, signedOn, filed } = asFiled(doc, live, liveDealer);
  useDealership(dealer);
  const v = sale.vehicle, b = sale.buyer;
  if (doc === 'form130U') {
    const pdf = await fill130U(agreementFromSale(sale, dealer, { date, agent }), { buyerSignatureDataUrl: buyerSig ?? undefined });
    return { pdf: filed ? await stablePdf(pdf, date) : pdf };   // filed: the same bytes on every print, so its hash holds (filedMark)
  }
  if (doc === 'powerOfAttorney') {
    const plain = isEligibleForPlainPoa(v.year, Number(date.slice(6)));
    if (plain === null) return { refused: 'The model year decides which power of attorney applies. Add the year to the car first.' };
    if (!plain) return { refused: VTR_271_RESTRICTION };
    const n = splitPersonName(b.fullName);
    const pdf = await fillPowerOfAttorney({ vin: vinCase(v.vin), year: String(v.year), make: fieldCase(v.make), model: fieldCase(v.model), bodyStyle: fieldCase(v.bodyStyle),
      grantorName: fieldCase(b.fullName), grantorNameParts: n, grantorAddress: fieldCase(b.address), grantorCity: fieldCase(b.city), grantorCounty: fieldCase(b.county),
      grantorState: b.state.toUpperCase(), grantorZip: b.zip, executedDate: date });
    return { pdf: await repairGeneratedPoaPdf(pdf) };
  }
  if (doc === 'rebuiltDisclosure') return { pdf: await fillOfficialRebuiltDisclosure(await formTemplate('ENF-MV-RBLT-DSCLMR.pdf'),
    { year: String(v.year), make: fieldCase(v.make), vin: vinCase(v.vin), buyerName: fieldCase(b.fullName), buyerSignature: buyerSig ?? undefined, signatureDate: buyerSig ? toIso(signedOn ?? date) : '' }) };
  return { refused: 'Not an official form.' };
}

/** The FTC Buyer's Guide for the window, in English or Spanish. Printed, never stored or signed. */
export async function buyersGuidePdf(sale: Sale, dealer: DealerConfig, language: 'en' | 'es') {
  useDealership(dealer);
  const v = sale.vehicle;
  // The complaints contact is a person at the dealership, by name, with the number to reach them.
  const who = dealer.signer?.name ? [dealer.signer.name, dealer.signer.title].filter(Boolean).join(', ') : '';
  const contact = [who, dealer.phone].filter(Boolean).join(' · ') || undefined;
  return generateBuyersGuidePdf({ language, vehicle: { year: v.year, make: fieldCase(v.make), model: fieldCase(v.model), vin: vinCase(v.vin), stockNumber: v.stock },
    dealer: { name: dealer.legalName || undefined, email: dealer.email || undefined, contact } });
}

/** The filed 130-U and the Filed mark that names it: the stable bytes and their SHA-256, for the Desk's Filed tap on
    Sold (W3-C) to send with the plates mark, so the Worker's sale.plates row can name the exact form filed. Null
    until the 130-U is filed on the sale (a draft has no fixed bytes to name). */
export async function filed130U(live: Sale, liveDealer: DealerConfig): Promise<{ pdf: Uint8Array; mark: FiledMark } | null> {
  if (live.documents.form130U?.state !== 'filed') return null;
  const r = await officialPdf('form130U', live, liveDealer);
  if (!('pdf' in r)) return null;
  const mark = await filedMark(live, r.pdf);
  return mark ? { pdf: r.pdf, mark } : null;
}

/** Form 14-312 for the sale's buyer, from the Comptroller's file. Refused for a Texas licence (D8: that buyer's title
    goes through webDEALER and owes Texas tax; §152.092 is for use exclusively outside the state) and when the sale
    does not say which state the buyer's licence is from (the form's "state where the vehicle will be registered"
    is not guessed). The purchaser's signature line is left for ink (D9). */
export async function form14312Pdf(live: Sale, liveDealer: DealerConfig): Promise<OfficialResult> {
  const { sale, dealer, date } = asFiled('form130U', live, liveDealer);   // frozen with the title paperwork when that is filed; live before
  useDealership(dealer);
  const v = sale.vehicle, b = sale.buyer;
  const state = (b.idIssuer || b.state || '').trim().toUpperCase();
  if (!state) return { refused: 'Which state issued the buyer\'s licence? The 14-312 names where the car will be registered.' };
  if (state === 'TX') return { refused: 'A Texas licence takes no 14-312: the title goes through webDEALER (decisions §9 D8).' };
  const input: Form14312Input = {
    purchaserName: fieldCase(b.fullName), purchaserStreet: fieldCase(b.address), purchaserCityStateZip: [fieldCase(b.city), [state === b.state.toUpperCase() ? state : b.state.toUpperCase(), b.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    purchaserPhone: b.phone, vin: vinCase(v.vin), make: fieldCase(v.make), modelYear: String(v.year || ''), registrationState: state,
    sellerName: dealer.legalName, sellerStreet: fieldCase(dealer.street), sellerCityStateZip: [fieldCase(dealer.city), [dealer.state.toUpperCase(), dealer.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    signerTitle: '', date,
  };
  return { pdf: await fillForm14312(await formTemplate(FORM_14_312_TEMPLATE_PATH), input) };
}

/** The lender remittance, from the lane's payout rows the Desk read for the sale (lib/documents/remittance.ts). */
export const laneRemittancePdf = (input: RemittanceInput): Promise<Uint8Array> => remittancePdf(input);
export type { RemittanceInput, RemittanceRow } from './documents/remittance';
