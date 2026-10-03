/* The dealer-authored paper, in the production desk's own payloads.

   The production desk files a corridor document as a payload
   (src/lib/sales/corridor-link.ts, `corridorCompletedLink`) and draws it with
   its document components (src/components/documents/DocumentSheet.tsx). This
   is that mapping for a Desk sale: the same keys, cased the same way, the same
   lien rule, the same "Still To Do" answers, so the components print exactly
   what production prints. Pure: a test hands it a sale and reads the payload. */
import type { BillOfSaleData } from '@/lib/documents/billOfSale';
import type { ContractData } from '@/lib/documents/finance';
import { BALANCE_OWED_REASON } from '@/lib/sales/money';
import { codeCase, fieldCase, vinCase } from '@/lib/documents/presentation-case';
import { formatPhone } from '@/lib/forms/phone';
import type { DealerConfig } from '@/lib/config';
import type { DocType } from '@/lib/plan';
import { ID_KIND, type Sale } from '@/lib/sale';
import { colourName } from '@/lib/colour';
import { financingTerms, lenderName, saleMoney } from '@/lib/filed';
import { photosOf } from '@/lib/condition';

/** The components that draw each Desk document. Official forms are filled PDFs instead (lib/official.ts). */
export type Section = 'billOfSale' | 'financing' | 'vehicleResponsibility' | 'insuranceAcknowledgment'
  | 'salvageBillOfSale' | 'towAwayAcknowledgment' | 'buyerResponsibilityStatement' | 'conditionReport';

export const PAPER_SECTIONS: ReadonlySet<DocType> = new Set<DocType>(['billOfSale', 'financing', 'vehicleResponsibility', 'insuranceAcknowledgment',
  'salvageBillOfSale', 'towAwayAcknowledgment', 'buyerResponsibilityStatement', 'conditionReport']);

/** MM/DD/YYYY (the Desk's business date) → YYYY-MM-DD (the production payload's). */
export const isoDate = (d: string) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d); return m ? `${m[3]}-${m[1]}-${m[2]}` : d; };

const PAY: Record<string, BillOfSaleData['paymentMethod']> = { Cash: 'Cash', Zelle: 'Zelle', 'Cash App': 'CashApp' };
const FREQ: Record<string, ContractData['paymentFrequency']> = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' };

/** The shared buyer and vehicle block every document starts from (corridor-link `baseFacts`). */
export function baseFacts(s: Sale) {
  const b = s.buyer, v = s.vehicle, kind = ID_KIND[b.idType];
  return {
    buyerName: fieldCase(b.fullName),
    buyerPhone: b.phone ? formatPhone(b.phone) : '',
    buyerEmail: b.email ?? '',
    buyerAddress: fieldCase(b.address), buyerCity: fieldCase(b.city), buyerState: codeCase(b.state) || 'TX', buyerZip: b.zip ?? '',
    buyerLicense: codeCase(b.idNumber),
    buyerIdKind: kind,
    buyerLicenseState: codeCase(b.idIssuer || s.step.paperwork?.form130U?.idState) || (kind === 'stateLicence' || kind === 'stateIdCard' ? 'TX' : ''),
    vehicleYear: v.year ? String(v.year) : '', vehicleMake: fieldCase(v.make), vehicleModel: fieldCase(v.model),
    vehicleVin: vinCase(v.vin), vehiclePlate: codeCase(s.step.plate), vehicleBodyStyle: fieldCase(v.bodyStyle),
    vehicleMileage: v.mileage != null ? String(v.mileage) : '', vehicleColor: fieldCase(colourName(v.color)), vehicleTrim: '',
  };
}

/** What the bill of sale's Still To Do says, read off the sale's own plan (corridor-link `stillToDo`). */
export function stillToDo(s: Sale) {
  const plan = s.step.salePlan ?? {};
  return {
    registrationByDealer: plan.registrationBy !== 'buyer',
    ...(plan.insuranceShown == null ? {} : { insuranceShown: plan.insuranceShown }),
    ...(plan.inspectionBy == null ? {} : { inspectionByDealer: plan.inspectionBy === 'dealer', inspectionDone: plan.inspectionBy === 'done' }),
  };
}

const odometerStatus = (m: unknown): 'actual' | 'exceeds' | 'not_actual' => m === 'exceeds' ? 'exceeds' : m === 'notActual' ? 'not_actual' : 'actual';

/** The payload one Desk document prints from: production's keys for that section. */
export function paperData(doc: DocType, s: Sale, dealer: DealerConfig, opts: { date: string }): { section: Section; data: Record<string, unknown> } | null {
  const facts = baseFacts(s), date = isoDate(opts.date), r = saleMoney(s, dealer);
  const funding = s.step.funding?.type, lender = lenderName(s.step.funding);
  const bos = s.step.paperwork?.billOfSale ?? {};
  const language = s.language === 'es' ? 'es' : 'en';
  const addressLine = [facts.buyerAddress, facts.buyerCity, facts.buyerState, facts.buyerZip].filter(Boolean).join(', ');
  const vehicleDescription = [facts.vehicleYear, facts.vehicleMake, facts.vehicleModel].filter(Boolean).join(' ');
  const ack = { buyerName: facts.buyerName, buyerIdNumber: facts.buyerLicense, buyerPhone: facts.buyerPhone, buyerAddress: addressLine,
    vehicleDescription, vehicleYear: facts.vehicleYear, vehicleMake: facts.vehicleMake, vehicleModel: facts.vehicleModel, vin: facts.vehicleVin, saleDate: date, language };

  // The seller's lien rides only while money is owed on a non-lender deal; the bank's is disclosed by name.
  const sellerLien = funding !== 'lender' && r.balance > 0
    ? { sellerLienEnabled: true, sellerLienAmount: r.balance, sellerLienReason: BALANCE_OWED_REASON, sellerLienDate: date,
        sellerLienholderName: dealer.legalName, sellerLienholderAddress: dealer.street, sellerLienholderCity: dealer.city, sellerLienholderState: dealer.state, sellerLienholderZip: dealer.zip }
    : { sellerLienEnabled: false, sellerLienAmount: 0 };
  const bankLien = funding === 'lender' && lender ? { titleLienholderName: lender, titleLienReason: 'Purchase money lien of the lender financing this sale' } : {};

  switch (doc) {
    case 'billOfSale': {
      const method = String(bos.payMethod ?? 'Cash');
      const data: BillOfSaleData & Record<string, unknown> = {
        saleDate: date, stockNumber: s.vehicle.stock ?? '', outstanding: stillToDo(s), ...facts,
        coBuyerName: '', coBuyerAddress: '', coBuyerCity: '', coBuyerState: '', coBuyerZip: '', coBuyerPhone: '', coBuyerEmail: '', coBuyerLicense: '', coBuyerLicenseState: '',
        odometerReading: facts.vehicleMileage, odometerStatus: odometerStatus(bos.mileage),
        salePrice: r.salePrice, tradeInAllowance: r.tradeIn, tradeInDescription: bos.tradeDesc ? fieldCase(String(bos.tradeDesc)) : '', tradeInVin: '', tradeInPayoff: 0,
        tax: r.tax, titleFee: r.title, docFee: r.doc, registrationFee: r.registration, otherFees: 0, otherFeesDescription: '',
        paymentMethod: funding === 'lender' || funding === 'inHouse' ? 'Financing' : PAY[method] ?? 'Other',
        paymentMethodOther: funding === 'lender' && lender ? lender : funding === 'cash' && !PAY[method] ? method : '',
        conditionType: bos.asIs === 'warranty' ? 'warranty' : 'as_is', warrantyDuration: String(bos.warrantyLength ?? ''), warrantyDescription: '',
        amountPaidToday: r.paidToday,
        ...sellerLien, ...bankLien,
      };
      return { section: 'billOfSale', data };
    }
    case 'financing': {
      const p = s.step.paperwork?.financing ?? {}, t = financingTerms(s, dealer);
      const data: ContractData = {
        contractDate: date, stockNumber: s.vehicle.stock ?? '', buyerName: facts.buyerName, buyerAddress: addressLine, buyerPhone: facts.buyerPhone, buyerEmail: facts.buyerEmail,
        coBuyerName: '', coBuyerAddress: '', coBuyerPhone: '', coBuyerEmail: '',
        vehicleYear: facts.vehicleYear, vehicleMake: facts.vehicleMake, vehicleModel: facts.vehicleModel, vehicleVin: facts.vehicleVin, vehiclePlate: facts.vehiclePlate, vehicleMileage: facts.vehicleMileage,
        cashPrice: r.salePrice - r.tradeIn, downPayment: t.down, tax: r.tax, titleFee: r.title, registrationFee: r.registration, docFee: r.doc,
        apr: t.rate, numberOfPayments: Number.isFinite(t.count) ? t.count : 0, paymentFrequency: FREQ[String(p.frequency)] ?? 'Monthly',
        firstPaymentDate: p.firstDue ? isoDate(String(p.firstDue)) : '', dueAtSigning: t.down,
        ...(t.payment > 0 ? { paymentAmount: t.payment } : {}),
      };
      return { section: 'financing', data: data as unknown as Record<string, unknown> };
    }
    case 'vehicleResponsibility':
      return { section: doc, data: { dealId: s.id, ...ack, quotedRegistrationAmount: r.registrationCost } };
    case 'insuranceAcknowledgment':
      return { section: doc, data: ack };
    case 'salvageBillOfSale': case 'towAwayAcknowledgment': case 'buyerResponsibilityStatement': {
      const method = String(bos.payMethod ?? 'Cash');
      return { section: doc, data: { ...ack, vehicleMileage: facts.vehicleMileage, odometerStatus: odometerStatus(bos.mileage),
        salePrice: r.salePrice, tax: r.tax, titleFee: r.title, docFee: r.doc, total: Math.round((r.salePrice + r.tax + r.title + r.doc) * 100) / 100,
        amountPaidToday: r.paidToday, paymentMethod: funding === 'lender' || funding === 'inHouse' ? 'Financing' : method,
        howLeaving: '', salvageLicense: '', titleOriginState: '' } };
    }
    case 'conditionReport':
      return { section: 'conditionReport', data: { ...ack, vehicleMileage: facts.vehicleMileage, warranty: bos.asIs === 'warranty', warrantyLength: String(bos.warrantyLength ?? ''),
        answers: { ...(s.step.paperwork?.conditionReport ?? {}), photos: photosOf(s.step.paperwork?.conditionReport?.photos as string | undefined) } } };
    default:
      return null;
  }
}
