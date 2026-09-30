/* The ONE function that assembles a packet, and the walk order the corridor
   and the signing ceremony both use. */
import type { FundingType } from './money';
import { planDocumentEffect, type DocType, type SalePlan, type SalvagePath, type TitleStatus } from './plan';

export const WALK_ORDER: DocType[] = [
  'rebuiltDisclosure', 'billOfSale', 'form130U', 'vehicleResponsibility', 'insuranceAcknowledgment', 'powerOfAttorney',
  'salvageBillOfSale', 'towAwayAcknowledgment', 'buyerResponsibilityStatement', 'financing',
];

export const DOC_TITLE: Record<DocType, string> = {
  billOfSale: 'Bill Of Sale', form130U: 'Title Application (130-U)', financing: 'Financing Contract',
  vehicleResponsibility: 'Vehicle Responsibility', insuranceAcknowledgment: 'Insurance Acknowledgment',
  powerOfAttorney: 'Power Of Attorney', rebuiltDisclosure: 'Rebuilt Title Disclosure',
  salvageBillOfSale: 'Salvage Bill Of Sale', towAwayAcknowledgment: 'Tow-Away Acknowledgment',
  buyerResponsibilityStatement: 'Buyer Responsibility Statement',
};

/** What each sheet means, in one sentence the buyer can hold. */
export const DOC_MEANS: Record<DocType, string> = {
  billOfSale: 'It says what you paid and how the car is sold.',
  form130U: 'It applies for the title and registration in your name.',
  financing: 'It sets out the payments you agreed to.',
  vehicleResponsibility: 'You are filing the title yourself, within 30 days.',
  insuranceAcknowledgment: 'You will get insurance before you drive.',
  powerOfAttorney: 'It lets the dealer sign the title application for you.',
  rebuiltDisclosure: 'The title is rebuilt. That is permanent and affects value.',
  salvageBillOfSale: 'It sells the car as-is on a salvage title.',
  towAwayAcknowledgment: 'The car leaves on a tow, with no plates.',
  buyerResponsibilityStatement: 'Anything after today is yours to handle.',
};

const byWalk = (a: DocType, b: DocType) => WALK_ORDER.indexOf(a) - WALK_ORDER.indexOf(b);

export function requiredDocumentTypes(funding: FundingType | null | undefined, plan: SalePlan, titleStatus: TitleStatus, salvagePath?: SalvagePath | null): DocType[] {
  const inHouse = funding === 'inHouse';
  if (titleStatus === 'salvage_unrebuilt' && salvagePath === 'towAway') {
    const docs: DocType[] = ['salvageBillOfSale', 'towAwayAcknowledgment', 'buyerResponsibilityStatement'];
    if (inHouse) docs.push('financing');
    return docs.sort(byWalk);
  }
  const base: DocType[] = ['billOfSale', 'form130U', ...(inHouse ? ['financing' as const] : [])];
  const { add, remove } = planDocumentEffect(plan, titleStatus);
  const out = [...new Set([...base.filter(d => !remove.includes(d)), ...add])];
  return out.sort(byWalk);
}
