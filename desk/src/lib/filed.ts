/* What prints is what was filed. Filing a document freezes the facts it was
   read from (the sale's answers, the car, the buyer, the dealer, the business
   date); every later print, preview and signing reads the frozen copy, never
   a regeneration from today's records (Handle A Sale SOP, After the paperwork).
   A signature's date is the business date it was signed on. */
import { businessDate, type DealerConfig } from './config';
import { LENDERS } from '../data';
import { payment, PER_YEAR } from './paperwork';
import { solveTerms, type Agreed, type Terms } from './terms';
import { computeMoney, parseMoney } from './money';
import type { DocType } from './plan';
import type { AgreementState, Sale } from './sale';

export type Frozen = { date: string; dealer: DealerConfig; sale: Pick<Sale, 'vehicle' | 'buyer' | 'step' | 'language'>;
  agent?: string };   // the staff member who handled the sale: printed beside the dealership on the 130-U's seller line

export function freeze(sale: Sale, dealer: DealerConfig, at = new Date(), agent?: string): Frozen {
  return JSON.parse(JSON.stringify({ date: businessDate(dealer.timeZone, at), dealer, sale: { vehicle: sale.vehicle, buyer: sale.buyer, step: sale.step, language: sale.language }, agent }));
}

/** The sale and dealer a document renders from: the frozen copy once filed, live while it's a draft. */
export function asFiled(doc: DocType, sale: Sale, dealer: DealerConfig, now = new Date()) {
  const a: AgreementState | undefined = sale.documents[doc], f = a?.state === 'filed' ? a.frozen : undefined;
  const s: Sale = f ? { ...sale, ...f.sale } : sale, d = f?.dealer ?? dealer;
  return { sale: s, dealer: d, agent: f?.agent, date: f?.date ?? businessDate(dealer.timeZone, now), signedOn: a?.signedAt ? businessDate(d.timeZone, new Date(a.signedAt)) : undefined, filed: !!f };
}

/** The lender's real name for the lien and the bill of sale, never its directory id. */
export function lenderName(f: Sale['step']['funding']): string | null {
  if (f?.type !== 'lender') return null;
  return f.lenderOther?.trim() || LENDERS.find(l => l.id === f.lenderId)?.name || null;
}

export function saleMoney(s: Sale, dealer: DealerConfig) {
  return computeMoney({ money: s.step.money, funding: s.step.funding?.type, tradeIn: parseMoney(s.step.paperwork?.billOfSale?.tradeAllowance) ?? 0, fees: dealer.fees });
}

/** The financing contract's figures, solved from what was agreed and held to the ceiling. */
export function financingTerms(s: Sale, dealer: DealerConfig): Terms & { principal: number; down: number; perYear: number } {
  const p = s.step.paperwork?.financing ?? {}, r = saleMoney(s, dealer);
  const down = parseMoney(p.down) ?? 0, principal = Math.max(0, Math.round((r.total - down) * 100) / 100), perYear = PER_YEAR[p.frequency] ?? 12;
  const agreed = (p.agreed as Agreed) ?? 'count';
  const t = solveTerms({ principal, perYear, agreed, payment: parseMoney(p.payment) ?? undefined, count: Number(p.count) || undefined, rate: p.rate !== undefined ? Number(p.rate) : undefined, ceiling: dealer.rateCeiling });
  return { ...t, payment: t.payment || payment(principal, t.rate, t.count, perYear), principal, down, perYear };
}
