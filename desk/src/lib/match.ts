/* Money that arrives outside the processor, matched to the right note.

   Buyers pay however they like: Zelle, Cash App, Venmo, a check, cash
   dropped at the bank. None of those tell the Desk who paid for which car.
   Two read-only sources do:
   - the dealer's bank feed (Plaid): every deposit, with the sender's name
     for Zelle and ACH, and no name for checks and cash deposits;
   - receipt emails ("Maria Example sent you $126.28"): Cash App and Venmo
     money sits in the app and reaches the bank as one lump cash-out with
     no names, so the receipt is the only place the payer is named.

   Every deposit becomes a Money line. Lump cash-outs and processor
   settlements are set aside (the payments inside them are already counted
   from their receipts or the processor's callbacks), the same payment seen
   twice is kept once, and each remaining line is scored against every open
   note by name, amount and date. The dealer confirms with one tap; a
   confirmed sender is remembered, so a cousin who pays for the note is
   known next time. */

import { addDays, amountToAsk, daysBetween, standing, type Loan, type Method } from './loans';

export type Source = 'bank' | 'email';
export type Money = {
  id: string; source: Source; on: string; cents: number;
  text: string;                      // the bank's description, or the receipt's subject line
  from?: string;                     // the sender's name, when the source gives one
  rail?: Method;                     // how it was sent
  pending?: boolean;
};
export type Kind = 'payment' | 'cash_out' | 'processor' | 'outflow';
export type Candidate = { loanId: string; score: number; why: string[] };
export type Verdict = 'sure' | 'likely' | 'unsure';
export type Suggestion = { money: Money; best?: Candidate; others: Candidate[]; verdict: Verdict };
/** A sender the dealer has confirmed: normalized name -> note id. */
export type Payers = Record<string, string>;

const up = (s: string) => s.toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
export const normName = (s: string) => up(s).split(' ').filter(t => t.length > 0 && !/^\d+$/.test(t)).join(' ');

/* ---------- reading one line ---------- */

/** Processors whose payments already post by callback; their settlements must not count twice. */
const PROCESSORS = /\b(PAYNEARME|PNM|REPAY|CARPAY|BLYTZ|STRIPE|SQUARE INC(?! .*CASH APP)|WHOP)\b/;
const CASH_OUT = /(CASH ?APP|SQUARE INC).*(CASH ?OUT|TRANSFER)|VENMO.*(CASH ?OUT|TRANSFER)|PAYPAL.*TRANSFER/;

export function kindOf(m: Money): Kind {
  if (m.cents <= 0) return 'outflow';
  const t = up(m.text);
  if (m.source === 'bank' && CASH_OUT.test(t)) return 'cash_out';
  if (m.source === 'bank' && PROCESSORS.test(t)) return 'processor';
  return 'payment';
}

export function railOf(text: string): Method {
  const t = up(text);
  if (/ZELLE/.test(t)) return 'zelle';
  if (/CASH ?APP/.test(t)) return 'cash_app';
  if (/VENMO/.test(t)) return 'venmo';
  if (/PAYPAL/.test(t)) return 'paypal';
  if (/MOBILE DEP|REMOTE DEP|CHECK|CHK/.test(t)) return 'check';
  if (/MONEY ?ORDER/.test(t)) return 'money_order';
  if (/CASH DEP|BRANCH|TELLER|ATM DEP/.test(t)) return 'cash';
  if (/\bACH\b|\bPPD\b|\bWEB\b|DIRECT DEP/.test(t)) return 'ach';
  return 'other';
}

/** The sender's name, from the patterns banks and apps use. The formats vary by bank and are confirmed against real feeds. */
export function senderOf(text: string): string | undefined {
  const t = up(text);
  const pats = [
    /ZELLE (?:PAYMENT |TRANSFER )?FROM ([A-Z ]+?)(?: ON | REF| CONF| ID|$)/,
    /^([A-Z ]+?) (?:SENT YOU|PAID YOU)\b/,                       // receipt emails: "Maria Example sent you $126.28"
    /(?:CASH ?APP|VENMO)\s*(?:FROM\s+)?([A-Z ]+?)(?: \d|$)/,
    /\bFROM ([A-Z ]+?)(?: ON | REF| CONF| ID|$)/,
  ];
  for (const p of pats) { const m = t.match(p); const n = m?.[1] && normName(m[1]); if (n && n.split(' ').length <= 4 && !/^(CASH APP|VENMO|ZELLE)$/.test(n)) return n; }
  return undefined;
}

/** The app a receipt came from, by its sender address. Senders are confirmed against real receipts before launch. */
function railOfSender(address = ''): Method | undefined {
  const a = address.toLowerCase();
  if (/square\.com|cash\.app/.test(a)) return 'cash_app';
  if (/venmo\.com/.test(a)) return 'venmo';
  if (/paypal\.com/.test(a)) return 'paypal';
  if (/zelle/.test(a)) return 'zelle';
  return undefined;
}

/** Reads a receipt email's subject: "Maria Example sent you $126.28" or "Maria Example paid you $126.28". */
export function fromReceipt(id: string, on: string, subject: string, sender?: string): Money | null {
  const m = subject.match(/^(.+?) (?:sent you|paid you) \$([\d,]+\.\d{2})/i);
  if (!m) return null;
  const rail = railOfSender(sender) ?? railOf(subject);
  return { id, source: 'email', on, cents: Math.round(parseFloat(m[2].replace(/,/g, '')) * 100), text: subject, from: normName(m[1]), rail: rail === 'other' ? undefined : rail };
}

/** Fills in the rail and sender when the source left them out. */
export const read = (m: Money): Money => ({ ...m, rail: m.rail ?? railOf(m.text), from: m.from ? normName(m.from) : senderOf(m.text) });

/* ---------- the same payment, seen twice ---------- */

/** A Zelle payment shows in the bank feed and in the receipt email; keep the first one seen. */
export function sameMoney(a: Money, b: Money) {
  return a.source !== b.source && a.cents === b.cents && Math.abs(daysBetween(a.on, b.on)) <= 3
    && (!a.from || !b.from || nameScore(a.from, b.from) >= 0.85);
}

/* ---------- scoring ---------- */

/** How well a sender's name fits a buyer's: full name 1, first initial and last name 0.85, last name 0.55, first name 0.3. */
export function nameScore(from: string, buyer: string): number {
  const p = normName(from).split(' '), b = normName(buyer).split(' ');
  if (!p[0] || !b[0]) return 0;
  const first = b[0], last = b[b.length - 1];
  const hasLast = b.length > 1 && p.includes(last), hasFirst = p.includes(first);
  const hasInitial = p.some(t => t.length === 1 && t === first[0]);
  if (hasLast && hasFirst) return 1;
  if (hasLast && hasInitial) return 0.85;
  if (hasLast) return 0.55;
  if (hasFirst) return 0.3;
  return 0;
}

/** How well an amount fits a note: what's owed 1, a whole number of installments or the payoff 0.9, any amount up to the payoff 0.3. */
export function amountScore(cents: number, loan: Loan, asOf: string): { s: number; why?: string } {
  const st = standing(loan, asOf);
  if (st.status === 'paid_off' || cents > st.payoffCents + 100) return { s: 0 };
  if (cents === amountToAsk(st)) return { s: 1, why: 'what they owe' };
  if (cents === st.payoffCents) return { s: 0.9, why: 'the payoff' };
  for (let k = 1; k <= 4; k++) if (cents === k * loan.paymentCents) return { s: 0.9, why: k === 1 ? 'one payment' : `${k} payments` };
  return { s: 0.3 };
}

/** Near a due date, give or take a week. */
function dateScore(on: string, loan: Loan, asOf: string) {
  const st = standing(loan, asOf);
  return st.installments.some(i => Math.abs(daysBetween(i.due, on)) <= 7 && i.due <= addDays(on, 7)) ? 1 : 0;
}

export function score(m: Money, loan: Loan, asOf: string, payers: Payers): Candidate | null {
  const why: string[] = [];
  const a = amountScore(m.cents, loan, asOf);
  if (a.s === 0) return null;
  let n = 0;
  if (m.from && payers[normName(m.from)] === loan.id) { n = 1; why.push('paid this note before'); }
  else if (m.from) { n = nameScore(m.from, loan.buyer.name); if (n >= 0.85) why.push('name matches'); else if (n >= 0.55) why.push('same last name'); }
  if (a.why) why.push(`amount is ${a.why}`);
  const d = dateScore(m.on, loan, asOf);
  const s = m.from ? 0.55 * n + 0.35 * a.s + 0.1 * d : 0.5 * a.s + 0.1 * d;   // no name (a check, a cash deposit): never better than likely
  return { loanId: loan.id, score: Math.round(s * 100) / 100, why };
}

/* ---------- the whole inbox ---------- */

export function suggest(m: Money, loans: Loan[], asOf: string, payers: Payers = {}): Suggestion {
  const c = loans.map(l => score(m, l, asOf, payers)).filter((x): x is Candidate => !!x).sort((a, b) => b.score - a.score);
  const [best, second] = c;
  const verdict: Verdict = best && best.score >= 0.85 && (!second || best.score - second.score >= 0.2) ? 'sure' : best && best.score >= 0.5 ? 'likely' : 'unsure';
  return { money: m, best, others: c.slice(1), verdict };
}

/** Everything still to match: real payments only, each seen once, not already matched, sure ones first. */
export function inbox(all: Money[], loans: Loan[], asOf: string, done: Record<string, unknown>, payers: Payers = {}): Suggestion[] {
  const kept: Money[] = [];
  for (const raw of all) {
    const m = read(raw);
    if (m.pending || kindOf(m) !== 'payment' || kept.some(k => sameMoney(k, m))) continue;
    kept.push(m);
  }
  const rank = { sure: 0, likely: 1, unsure: 2 } as const;
  return kept.filter(m => !(m.id in done)).map(m => suggest(m, loans, asOf, payers))
    .sort((a, b) => rank[a.verdict] - rank[b.verdict] || b.money.on.localeCompare(a.money.on));
}
