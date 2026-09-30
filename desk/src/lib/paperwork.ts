/* Per-document questions: only what the record does not already hold.
   The chain is derived from the answers, like the plan. */
import type { DocType } from './plan';
import type { Sale } from './sale';
import { asksCarryingCapacity } from './vin';

export type PQ = { key: string; question: string; kind: 'choice' | 'money' | 'number' | 'text' | 'date'; choices?: { v: string; label: string; gloss?: string }[]; prefill?: (s: Sale) => string };

const PAY = ['Cash', 'Zelle', 'Cash App', 'Venmo', 'Card', 'Check'].map(v => ({ v, label: v }));

export function paperworkQuestions(doc: DocType, s: Sale): PQ[] {
  const a = s.step.paperwork?.[doc] ?? {};
  const cash = s.step.funding?.type === 'cash';
  if (doc === 'billOfSale' || doc === 'salvageBillOfSale') return [
    { key: 'mileage', question: 'Is That The Real Mileage?', kind: 'choice', choices: [{ v: 'actual', label: 'Real', gloss: `${s.vehicle.mileage?.toLocaleString() ?? 'Not set'} miles` }, { v: 'exceeds', label: 'Rolled Over', gloss: 'Past the odometer’s limit' }, { v: 'notActual', label: 'Not The Real Mileage' }] },
    ...(cash ? [{ key: 'payMethod', question: 'How Are They Paying Today?', kind: 'choice' as const, choices: PAY }] : []),
    { key: 'trade', question: 'Is There A Trade-In?', kind: 'choice', choices: [{ v: 'no', label: 'No' }, { v: 'yes', label: 'Yes' }] },
    ...(a.trade === 'yes' ? [
      { key: 'tradeDesc', question: 'What Are They Trading In?', kind: 'text' as const },
      { key: 'tradeAllowance', question: 'What Are We Allowing For It?', kind: 'money' as const },
    ] : []),
    { key: 'asIs', question: 'Sold As-Is Or With A Warranty?', kind: 'choice', choices: [{ v: 'asIs', label: 'As-Is', gloss: 'No warranty' }, { v: 'warranty', label: 'With A Warranty' }] },
    ...(a.asIs === 'warranty' ? [{ key: 'warrantyLength', question: 'How Long Is The Warranty?', kind: 'text' as const }] : []),
  ];
  if (doc === 'form130U') return [
    ...(!s.buyer.county ? [{ key: 'county', question: 'Which County Do They Live In?', kind: 'text' as const }] : []),
    { key: 'applyingFor', question: 'What Are We Applying For?', kind: 'choice', choices: [{ v: 'both', label: 'Title And Registration' }, { v: 'title', label: 'Title Only' }, { v: 'registration', label: 'Registration Only' }] },
    { key: 'buyerKind', question: 'Is The Buyer A Person Or A Business?', kind: 'choice', choices: [{ v: 'person', label: 'A Person' }, { v: 'business', label: 'A Business' }] },
    { key: 'emptyWeight', question: 'What Is The Empty Weight?', kind: 'number', prefill: x => (x.vehicle.emptyWeight ? String(x.vehicle.emptyWeight) : '') },
    ...(asksCarryingCapacity(s.vehicle.bodyStyle) ? [{ key: 'capacity', question: 'What Is The Carrying Capacity?', kind: 'text' as const }] : []),
  ];
  if (doc === 'financing') return [
    { key: 'down', question: 'How Much Are They Putting Down?', kind: 'money', prefill: x => x.step.money?.paidTodayAmount ?? '' },
    { key: 'frequency', question: 'How Often Do They Pay?', kind: 'choice', choices: [{ v: 'weekly', label: 'Weekly' }, { v: 'biweekly', label: 'Every Two Weeks' }, { v: 'monthly', label: 'Monthly' }] },
    { key: 'count', question: 'How Many Payments?', kind: 'number' },
    { key: 'rate', question: 'What Is The Rate?', kind: 'number' },
    { key: 'firstDue', question: 'When Is The First Payment Due?', kind: 'date' },
  ];
  return []; // review-only documents: everything comes from the sale
}

export const isAnswered = (v: string | undefined) => v !== undefined && v !== null && String(v).trim() !== '';
export const nextPaperworkQuestion = (doc: DocType, s: Sale) => paperworkQuestions(doc, s).find(q => !isAnswered(s.step.paperwork?.[doc]?.[q.key]));

/** Level payment on the financed amount. The ceiling rate is the owner's to confirm, never encoded here. */
export function payment(principal: number, annualRatePct: number, count: number, perYear: number) {
  if (count <= 0) return 0;
  const r = annualRatePct / 100 / perYear;
  const p = r === 0 ? principal / count : (principal * r) / (1 - Math.pow(1 + r, -count));
  return Math.round(p * 100) / 100;
}
export const PER_YEAR: Record<string, number> = { weekly: 52, biweekly: 26, monthly: 12 };
