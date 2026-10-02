/* A sale is one record. Answers live in named keys of step_data; "done" is
   never stored, it is computed here by buildGuideSteps, which every screen
   calls so they cannot disagree. */
import { requiredDocumentTypes, DOC_TITLE } from './documents';
import type { FundingType, MoneyAnswers } from './money';
import { isPlanComplete, isPlanQuestionAnswered, type DocType, type SalePlan, type SalvagePath, type TitleStatus } from './plan';

export type Vehicle = {
  id: string; stock: string; vin: string; year: number; make: string; model: string; bodyStyle: string;
  price: number; mileage: number | null; emptyWeight: number | null; color: string; titleStatus: TitleStatus;
};

export type Buyer = { fullName: string; phone: string; email?: string; address: string; city: string; state: string; zip: string; county: string; idType: 'dl' | 'stateId' | 'passport' | 'military'; idNumber: string };

export type IdField = { read?: string; confirmed?: string };
export const ID_FIELDS = ['name', 'idNumber', 'dob', 'expiry', 'address'] as const;
export type IdKey = (typeof ID_FIELDS)[number];

export type StepData = {
  funding?: { type: FundingType | null; lenderId?: string; lenderOther?: string };
  money?: MoneyAnswers;
  salePlan?: SalePlan;
  salvagePlan?: { path: SalvagePath };
  buyerId?: { image?: boolean; fields: Partial<Record<IdKey, IdField>>; mailingConfirmed?: boolean };
  paperwork?: Partial<Record<DocType, Record<string, string>>>;
  languageConfirmed?: { by: string; at: string };
  plate?: string | null;
  plateAsked?: boolean;
  saleClock?: { startedAt: string };
};

export type AgreementState = {
  state: 'draft' | 'filed'; buyerSigned?: boolean; dealerSigned?: boolean; signature?: string; signedVia?: 'desk' | 'ceremony'; signedAt?: string;
  frozen?: import('./filed').Frozen;     // the facts it was filed with; every print reads these
  // signature evidence on the document's own row (ESIGN/UETA: intent, attribution, association, retention)
  signedUserAgent?: string; readToEndAt?: string; signatureReused?: boolean; reuseConsentAt?: string;
};

export type Sale = {
  id: string; status: 'in_progress' | 'completed' | 'abandoned';
  language: 'en' | 'es' | null; askLanguage?: boolean;
  vehicle: Vehicle; buyer: Buyer;
  step: StepData;
  documents: Partial<Record<DocType, AgreementState>>;
  createdAt: string; completedAt?: string;
};

export type StepKey = string;
export type GuideStep = { key: StepKey; question: string; done: boolean; group: 'Buyer' | 'Money' | 'Plan' | 'Documents' | 'Title' };

const PLACEHOLDER = /^(n\/?a|none|tbd|other|unknown|-+)$/i;

export function owedDocuments(s: Sale): DocType[] {
  return requiredDocumentTypes(s.step.funding?.type, s.step.salePlan ?? {}, s.vehicle.titleStatus, s.step.salvagePlan?.path);
}

export function buildGuideSteps(s: Sale): GuideStep[] {
  const st = s.step, plan = st.salePlan ?? {};
  const salvage = s.vehicle.titleStatus === 'salvage_unrebuilt';
  const towAway = salvage && st.salvagePlan?.path === 'towAway';
  const funding = st.funding?.type ?? null;
  const steps: GuideStep[] = [];
  const add = (key: string, question: string, done: boolean, group: GuideStep['group']) => steps.push({ key, question, done, group });

  if (s.askLanguage) add('language', 'What Language Is The Sale In?', !!st.languageConfirmed, 'Buyer');
  if (salvage) add('plan:salvage', 'What Happens With The Salvage Title?', st.salvagePlan?.path === 'rebuild' || st.salvagePlan?.path === 'towAway', 'Plan');
  add('buyer', 'Who Is Buying The Car?', !!s.buyer.fullName.trim(), 'Buyer');
  const id = st.buyerId;
  const idDone = !!id && ID_FIELDS.every(k => !!id.fields[k]?.confirmed) && !!id.mailingConfirmed;
  add('buyerId', id?.image ? 'Check What The Card Says.' : 'Put The Licence On File.', idDone, 'Buyer');
  add('funding', 'How Are They Paying?', !!funding, 'Money');
  if (funding === 'lender') {
    const f = st.funding!;
    add('lender', 'Which Lender Is Funding It?', !!f.lenderId || (!!f.lenderOther?.trim() && !PLACEHOLDER.test(f.lenderOther.trim())), 'Money');
  }
  add('paid', 'How Much Are They Paying?', st.money?.amount !== undefined && st.money?.amount !== null && st.money.amount !== '', 'Money');
  add('price', 'Does That Include Tax And Fees?', !!st.money?.priceBasis, 'Money');

  if (!towAway) {
    add('plan:registration', 'Who Files The Title And Registration?', isPlanQuestionAnswered(plan, 'registrationBy'), 'Plan');
    if (plan.registrationBy === 'dealer') {
      add('plate', 'What Plate Is Going On It?', !!st.plate || !!st.plateAsked, 'Plan');
      add('plan:title-signer', 'Who Signs The Title Application?', isPlanQuestionAnswered(plan, 'titleSignedBy'), 'Plan');
    }
    if (plan.registrationBy === 'buyer') add('plan:price-includes', 'Does The Price Include Registration?', isPlanQuestionAnswered(plan, 'priceIncludesRegistration'), 'Plan');
    add('plan:inspection', 'Where Does The Inspection Stand?', isPlanQuestionAnswered(plan, 'inspectionBy'), 'Plan');
    add('plan:insurance', 'Did They Show Proof Of Insurance?', isPlanQuestionAnswered(plan, 'insuranceShown'), 'Plan');
  }
  const waitingOnTitle = salvage && st.salvagePlan?.path === 'rebuild';
  if (waitingOnTitle) add('titleWork', 'Rebuild The Title First.', false, 'Title');

  const planReady = towAway ? true : isPlanComplete(plan);
  const docsReady = planReady && !!funding && !waitingOnTitle && (!salvage || towAway);
  if (docsReady) {
    for (const d of owedDocuments(s)) add(`document:${d}`, `Sign The ${DOC_TITLE[d]}.`, s.documents[d]?.state === 'filed', 'Documents');
  }
  if (!towAway) add('title', 'File The Title And Get Plates.', !!st.plate, 'Title');
  add('packet', 'Print Or Save The Paperwork.', Object.values(s.documents).some(d => d?.state === 'filed'), 'Title');
  return steps;
}

export const nextOpenStep = (s: Sale) => buildGuideSteps(s).find(x => !x.done) ?? null;

export function signedCount(s: Sale) {
  const owed = owedDocuments(s);
  return { signed: owed.filter(d => s.documents[d]?.buyerSigned).length, owed: owed.length, filed: owed.filter(d => s.documents[d]?.state === 'filed').length };
}

export function badge(s: Sale): string | null {
  if (s.vehicle.titleStatus === 'salvage_unrebuilt') {
    const p = s.step.salvagePlan?.path;
    if (p === 'rebuild') return 'Salvage: Waiting On Title';
    if (!p || p === 'undecided') return 'Salvage: Path Undecided';
  }
  return null;
}
