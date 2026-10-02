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

export const OFFICIAL: Partial<Record<DocType, string>> = {
  form130U: 'TxDMV Form 130-U', powerOfAttorney: 'TxDMV Form VTR-271', rebuiltDisclosure: 'TxDMV Form ENF-MV-RBLT DSCLMR',
};
export const isOfficial = (d: DocType) => d in OFFICIAL;

export type OfficialResult = { pdf: Uint8Array } | { refused: string };
const toIso = (us: string) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(us); return m ? `${m[3]}-${m[1]}-${m[2]}` : us; };

export async function officialPdf(doc: DocType, live: Sale, liveDealer: DealerConfig, buyerSig?: string | null): Promise<OfficialResult> {
  const { sale, dealer, date, agent, signedOn } = asFiled(doc, live, liveDealer);
  useDealership(dealer);
  const v = sale.vehicle, b = sale.buyer;
  if (doc === 'form130U') return { pdf: await fill130U(agreementFromSale(sale, dealer, { date, agent }), { buyerSignatureDataUrl: buyerSig ?? undefined }) };
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
