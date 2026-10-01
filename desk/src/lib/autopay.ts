/* Autopay on a debit card or bank account, and what every failed charge says
   about the buyer: can't pay right now, or won't pay.

   Rules this module enforces:
   - Debit cards and bank accounts only. Processors prohibit loan repayment on
     credit cards (Stripe and Finix both say so), and prepaid cards are refused.
     The card's funding type and issuer come from the processor when the card
     is saved; the dealer can block issuers by name.
   - Autopay is optional. Regulation E, 12 CFR 1005.10(e), bars making
     preauthorized transfers a condition of credit, so the authorization says so.
   - Retries only for "no money right now" codes, at most MAX_RETRIES per
     installment (Nacha allows two re-presentments of an R01/R09 return), and
     never for codes the card networks say will never be approved. */

import { addDays, daysBetween, type Lang, type Loan } from './loans';
import { brokenPromises } from './promise';

export type Funding = 'debit' | 'credit' | 'prepaid' | 'unknown';
export type OnFile =
  | { kind: 'card'; brand: string; last4: string; funding: Funding; issuer?: string; exp: string }
  | { kind: 'bank'; bank?: string; last4: string; routing: string };
export type Autopay = {
  on: boolean; method?: OnFile;
  payday?: number;                 // 0 Sunday … 6 Saturday; charge on the first payday on or after each due date; none = the due date
  signedBy?: string; signedOn?: string; signedIn?: Lang;   // the language of the words they signed
  history: { on: string; event: 'added' | 'removed' | 'replaced' | 'turned_off' }[];
};
export type Attempt = { on: string; cents: number; n: number; via: 'card' | 'bank'; result: 'declined' | 'returned' | 'charged_back'; code: string };
export type LoanX = Loan;

export const MAX_RETRIES = 2;
export const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/* ---------- saving a card or bank account ---------- */

export const luhn = (n: string) => {
  const d = n.replace(/\D/g, ''); if (d.length < 12 || d.length > 19) return false;
  let s = 0; for (let i = 0; i < d.length; i++) { let x = +d[d.length - 1 - i]; if (i % 2) { x *= 2; if (x > 9) x -= 9; } s += x; }
  return s % 10 === 0;
};
/** ABA routing numbers carry a 3-7-1 weighted checksum. */
export const abaOk = (r: string) => /^\d{9}$/.test(r) && [...r].reduce((t, c, i) => t + +c * [3, 7, 1][i % 3], 0) % 10 === 0;

export type CardVerdict = { ok: true } | { ok: false; why: 'invalid' | 'expired' | 'credit' | 'prepaid' | 'blocked' };
export function checkCard(c: { number: string; exp: string; funding: Funding; issuer?: string }, asOf: string, blockIssuers: string[] = []): CardVerdict {
  if (!luhn(c.number)) return { ok: false, why: 'invalid' };
  const m = c.exp.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m || +m[1] < 1 || +m[1] > 12 || `20${m[2]}-${m[1]}` < asOf.slice(0, 7)) return { ok: false, why: 'expired' };
  if (c.funding === 'prepaid') return { ok: false, why: 'prepaid' };
  if (c.funding === 'credit') return { ok: false, why: 'credit' };
  if (c.issuer && blockIssuers.some(b => c.issuer!.toLowerCase().includes(b.toLowerCase()))) return { ok: false, why: 'blocked' };
  return { ok: true };
}

/** The day autopay charges an installment: the first payday on or after the due date, or the due date. */
export function chargeDay(due: string, payday?: number) {
  if (payday === undefined) return due;
  const dow = new Date(due + 'T12:00:00Z').getUTCDay();
  return addDays(due, (payday - dow + 7) % 7);
}

/** The words the buyer signs, in their language. Counsel and a native speaker review the final wording. */
export function authorization(dealer: string, phone: string, loan: Loan, m: OnFile, payday?: number, lang: Lang = loan.language ?? 'en') {
  const amt = `$${(loan.paymentCents / 100).toFixed(2)}`, car = loan.vehicle.split(' · ')[0];
  if (lang === 'es') {
    const what = m.kind === 'card' ? `mi tarjeta de débito ${m.brand} que termina en ${m.last4}` : `mi cuenta bancaria que termina en ${m.last4}`;
    const when = payday === undefined ? 'en cada fecha de vencimiento' : `el primer ${DIA[payday]} en o después de cada fecha de vencimiento`;
    return `Autorizo a ${dealer} a cobrar ${amt} a ${what} ${when} por mi ${car} hasta que esté pagado. `
      + `Si un cobro no se procesa, ${dealer} puede intentarlo de nuevo hasta ${MAX_RETRIES} veces más para ese pago. `
      + `El pago automático es opcional y no fue un requisito para mi financiamiento. Puedo cancelarlo llamando al ${phone} al menos 3 días hábiles antes de un cobro.`;
  }
  const what = m.kind === 'card' ? `my ${m.brand} debit card ending ${m.last4}` : `my bank account ending ${m.last4}`;
  const when = payday === undefined ? 'on each due date' : `on the first ${WEEKDAY[payday]} on or after each due date`;
  return `I authorize ${dealer} to charge ${what} ${amt} ${when} for my ${car} until it is paid off. `
    + `If a charge fails, ${dealer} may try again up to ${MAX_RETRIES} more times for that payment. `
    + `Autopay is optional and was not required for my financing. I can cancel it by calling ${phone} at least 3 business days before a charge.`;
}

/* ---------- what a failed charge says ---------- */

export type Reading = 'cant' | 'wont' | 'fix' | 'unclear';
type Code = { label: string; reading: Reading; retry: boolean };
/** Card decline codes (ISO 8583, as Visa and Mastercard use them) and Nacha return codes. */
export const CODES: Record<string, Code> = {
  '51': { label: 'Not enough money', reading: 'cant', retry: true },
  '61': { label: 'Over their daily limit', reading: 'cant', retry: true },
  '65': { label: 'Over their card’s use limit', reading: 'cant', retry: true },
  '05': { label: 'Bank said no', reading: 'unclear', retry: true },
  '54': { label: 'Card expired', reading: 'fix', retry: false },
  '14': { label: 'Card number no longer valid', reading: 'fix', retry: false },
  '41': { label: 'Card reported lost', reading: 'wont', retry: false },
  '43': { label: 'Card reported stolen', reading: 'wont', retry: false },
  '57': { label: 'Card blocked for this charge', reading: 'wont', retry: false },
  '62': { label: 'Card restricted', reading: 'wont', retry: false },
  'R0': { label: 'Stopped this payment', reading: 'wont', retry: false },
  'R1': { label: 'Cancelled the authorization', reading: 'wont', retry: false },
  'R3': { label: 'Cancelled every authorization', reading: 'wont', retry: false },
  'R01': { label: 'Not enough money', reading: 'cant', retry: true },
  'R09': { label: 'Money not available yet', reading: 'cant', retry: true },
  'R02': { label: 'Closed the bank account', reading: 'wont', retry: false },
  'R03': { label: 'Bank account not found', reading: 'fix', retry: false },
  'R04': { label: 'Bank account number invalid', reading: 'fix', retry: false },
  'R07': { label: 'Cancelled the authorization', reading: 'wont', retry: false },
  'R08': { label: 'Stopped this payment', reading: 'wont', retry: false },
  'R10': { label: 'Told the bank it wasn’t authorized', reading: 'wont', retry: false },
  'R16': { label: 'Bank account frozen', reading: 'fix', retry: false },
  'chargeback': { label: 'Disputed the charge', reading: 'wont', retry: false },
};
export const read = (a: Attempt): Code => CODES[a.result === 'charged_back' ? 'chargeback' : a.code] ?? { label: `Failed (${a.code})`, reading: 'unclear', retry: false };

/** Whether to try this installment again, and when: on their next payday, or in 3 days. */
export function nextTry(a: Attempt, all: Attempt[], payday?: number): string | null {
  if (!read(a).retry) return null;
  if (all.filter(x => x.n === a.n).length > MAX_RETRIES) return null;
  const after = addDays(a.on, 1);
  return payday === undefined ? addDays(a.on, 3) : chargeDay(after, payday);
}

/* ---------- the signal the owner sees ---------- */

export type Signal = { tone: 'red' | 'amber' | 'good' | 'none'; headline: string; detail?: string };
/** Won't-pay in the last 60 days is red; can't-pay or a card to fix in the last 30 days is amber; a clean autopay is good. */
export function signal(l: LoanX, asOf: string): Signal {
  const recent = (days: number) => (l.attempts ?? []).filter(a => daysBetween(a.on, asOf) <= days && a.on <= asOf).sort((a, b) => b.on.localeCompare(a.on));
  const wont = recent(60).find(a => read(a).reading === 'wont');
  if (wont) return { tone: 'red', headline: read(wont).label, detail: `On purpose · ${wont.on}` };
  const removed = l.autopay?.history.filter(h => daysBetween(h.on, asOf) <= 60).find(h => h.event === 'removed' || h.event === 'turned_off');
  if (removed && !l.autopay?.on) return { tone: 'red', headline: 'Took their card off autopay', detail: removed.on };
  const broken = brokenPromises(l, asOf);
  if (broken.length >= 2) return { tone: 'red', headline: `Broke ${broken.length} promises`, detail: broken[0].on };
  const cant = recent(30).filter(a => read(a).reading === 'cant');
  if (cant.length) return { tone: 'amber', headline: cant.length > 1 ? `Short on money · ${cant.length} declines` : 'Short on money', detail: cant[0].on };
  if (broken.length) return { tone: 'amber', headline: 'Broke a promise', detail: broken[0].on };
  const fix = recent(30).find(a => read(a).reading === 'fix' || read(a).reading === 'unclear');
  if (fix) return { tone: 'amber', headline: read(fix).label, detail: fix.on };
  return l.autopay?.on ? { tone: 'good', headline: 'Autopay on' } : { tone: 'none', headline: 'No autopay' };
}

/** Pays a couple of days after each due date, every time: autopay should move to their payday. */
export function paydayHint(l: LoanX): number | undefined {
  const late = (l.attempts ?? []).filter(a => read(a).reading === 'cant');
  const paidAfter = late.map(a => l.payments.find(p => p.on > a.on && daysBetween(a.on, p.on) <= 4)).filter(Boolean);
  if (late.length < 2 || paidAfter.length < 2) return undefined;
  const days = paidAfter.map(p => new Date(p!.on + 'T12:00:00Z').getUTCDay());
  return days.every(d => d === days[0]) && days[0] !== l.autopay?.payday ? days[0] : undefined;
}

/** Everything that happened on the account, newest first: payments, failed charges, card changes. */
export type Moment = { on: string; tone: 'good' | 'amber' | 'red' | 'none'; text: string; cents?: number };
export function timeline(l: LoanX): Moment[] {
  const m: Moment[] = [
    ...l.payments.map(p => ({ on: p.on, tone: 'good' as const, text: p.via === 'autopay' ? 'Autopay went through' : 'Paid', cents: p.cents })),
    ...(l.attempts ?? []).map(a => { const r = read(a); return { on: a.on, tone: r.reading === 'wont' ? 'red' as const : 'amber' as const, text: r.label, cents: a.cents }; }),
    ...(l.autopay?.history ?? []).map(h => ({ on: h.on, tone: h.event === 'added' ? 'none' as const : 'red' as const,
      text: { added: 'Autopay turned on', removed: 'Card taken off autopay', replaced: 'Changed the card', turned_off: 'Autopay turned off' }[h.event] })),
    ...(l.service ?? []).map(e => ({ on: e.on, tone: 'amber' as const, text: `${e.kind === 'complaint' ? 'Complaint' : 'Repair'}: ${e.what}` })),
    ...(l.promises ?? []).map(p => ({ on: p.made, tone: 'none' as const, text: `Promised $${(p.cents / 100).toFixed(2)} by ${new Date(p.on + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })}` })),
  ];
  return m.sort((a, b) => b.on.localeCompare(a.on));
}
