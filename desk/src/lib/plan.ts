/* The sale plan (the prescreen). The question chain is derived from the
   answers so far, never fixed. false is an answer. */

export type TitleStatus = 'clean' | 'rebuilt_salvage' | 'bonded' | 'salvage_unrebuilt' | 'nonrepairable' | 'export_only' | 'unknown';
export type SalvagePath = 'rebuild' | 'towAway' | 'undecided';

export type SalePlan = {
  registrationBy?: 'dealer' | 'buyer' | null;
  titleSignedBy?: 'buyer' | 'dealer' | null;
  priceIncludesRegistration?: boolean | null;
  inspectionBy?: 'dealer' | 'buyer' | 'done' | null;
  insuranceShown?: boolean | null;
};
export type PlanQuestion = keyof SalePlan;

export function planQuestions(plan: SalePlan): PlanQuestion[] {
  return [
    'registrationBy',
    ...(plan.registrationBy === 'dealer' ? ['titleSignedBy' as const] : []),
    ...(plan.registrationBy === 'buyer' ? ['priceIncludesRegistration' as const] : []),
    'inspectionBy', 'insuranceShown',
  ];
}

/** Never a truthiness check: false is an answer. */
export const isPlanQuestionAnswered = (plan: SalePlan, q: PlanQuestion) => plan[q] !== undefined && plan[q] !== null;
export const isPlanComplete = (plan: SalePlan) => planQuestions(plan).every(q => isPlanQuestionAnswered(plan, q));

/** Applies ONE answer, with its invalidation. */
export function applyPlanAnswer<Q extends PlanQuestion>(plan: SalePlan, q: Q, value: SalePlan[Q]): SalePlan {
  const next: SalePlan = { ...plan, [q]: value };
  if (q === 'registrationBy' && value === 'buyer') next.titleSignedBy = null;
  if (q === 'registrationBy' && value === 'dealer') next.priceIncludesRegistration = null;
  return next;
}

export type DocType =
  | 'billOfSale' | 'form130U' | 'financing' | 'vehicleResponsibility' | 'insuranceAcknowledgment'
  | 'powerOfAttorney' | 'rebuiltDisclosure' | 'salvageBillOfSale' | 'towAwayAcknowledgment' | 'buyerResponsibilityStatement';

export function planDocumentEffect(plan: SalePlan, titleStatus: TitleStatus): { add: DocType[]; remove: DocType[] } {
  const add: DocType[] = [], remove: DocType[] = [];
  if (titleStatus === 'rebuilt_salvage') add.push('rebuiltDisclosure');
  if (plan.registrationBy === 'buyer') { remove.push('form130U'); add.push('vehicleResponsibility'); }
  if (plan.registrationBy === 'dealer' && plan.titleSignedBy === 'dealer') add.push('powerOfAttorney');
  if (plan.insuranceShown === false) add.push('insuranceAcknowledgment');
  return { add, remove };
}

/** Once any of these is filed, every plan answer is locked. */
export const PLAN_FREEZERS: DocType[] = ['powerOfAttorney', 'form130U', 'vehicleResponsibility', 'insuranceAcknowledgment', 'rebuiltDisclosure', 'towAwayAcknowledgment', 'salvageBillOfSale', 'buyerResponsibilityStatement'];

/** 20+ years old: plain VTR-271. Under 20: the county's secure VTR-271-A. Unknown: ask. */
export function poaInstrument(saleYear: number, modelYear: number | null | undefined): 'VTR-271' | 'VTR-271-A' | null {
  if (!modelYear) return null;
  return saleYear - modelYear >= 20 ? 'VTR-271' : 'VTR-271-A';
}
