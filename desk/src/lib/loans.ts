/* Buy here pay here: the note the dealer carries, and every payment on it.
   Money is in whole cents; dates are calendar days (YYYY-MM-DD) in the
   dealer's time zone. Interest is simple interest on the unpaid principal,
   counted by the day (actual/365), the way most BHPH notes are serviced.
   Texas, Finance Code ch. 348: a late charge only after the 15th day past
   due, at most 5% of the installment, once per installment (§348.107);
   a written receipt for every cash payment (§348.406); a statement of
   payments on request (§348.405). The rate ceiling is the owner's to confirm. */

import type { Attempt, Autopay } from './autopay';
import type { Condition, ServiceEntry } from './condition';
import { openPromise, promiseReminder, type PayPromise } from './promise';
import { perPayment, repairsLeft, type Extra } from './extras';

export type Frequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type Method = 'cash' | 'card' | 'ach' | 'check' | 'money_order' | 'zelle' | 'cash_app' | 'venmo' | 'paypal' | 'other';
/** Where a payment stands with the processor. Cash at the counter is cleared at once; a bank (ACH)
    payment is clearing for up to four business days and can still come back; a card can be charged back. */
export type PaymentStatus = 'cleared' | 'clearing' | 'returned' | 'refunded' | 'charged_back';
export type Payment = { id: string; on: string; cents: number; method: Method; receipt: number; note?: string; by?: string;
  toExtras?: Record<string, number>;   // the part of this payment that went to a repair or a fee, by extra id
  status?: PaymentStatus;                 // missing = cleared (every desk payment before processors existed)
  via?: 'desk' | 'text_link' | 'autopay' | 'portal' | 'retail_cash' | 'matched' | 'imported';   // matched: found in the bank feed or a receipt email, confirmed by the dealer
  processorId?: string;                   // the processor's id for this payment, to match callbacks
  reverse?: { on: string; code?: string; reason?: string };
};
/** A payment counts toward the note unless it came back. A clearing payment counts, and is marked. */
export const counts = (p: Payment) => !p.status || p.status === 'cleared' || p.status === 'clearing';
export type Lang = 'en' | 'es';
export type Loan = {
  id: string; saleId?: string;
  buyer: { name: string; phone: string };
  language?: Lang;                 // what the buyer's texts and papers are in; English when unset
  vehicle: string;                 // "2016 Honda Accord LX · Stock 104"
  principalCents: number;          // amount financed
  apr: number;                     // percent, e.g. 18
  count: number; frequency: Frequency;
  firstDue: string;                // YYYY-MM-DD
  paymentCents: number;            // the installment
  late: { graceDays: number; pct: number };
  payments: Payment[];
  remindersOn: boolean;
  openedOn: string;
  autopay?: Autopay;               // card or bank account on file
  attempts?: Attempt[];            // charges that failed, with the reason code
  condition?: Condition;           // the car's condition as signed at the sale
  service?: ServiceEntry[];        // complaints and repairs since
  extras?: Extra[];                // repair balances and recurring fees, beside the note
  promises?: PayPromise[];         // "I'll pay Monday": the account works from the promise
  imported?: { from: 'frazer'; on: string; account: string; theirBalanceCents?: number; mode: 'history' | 'balance' };
};

export const PER_YEAR: Record<Frequency, number> = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
export const TEXAS_LATE = { graceDays: 15, pct: 5 } as const;
export const METHOD_LABEL: Record<Method, string> = { cash: 'Cash', card: 'Card', ach: 'Bank (ACH)', check: 'Check', money_order: 'Money Order', zelle: 'Zelle', cash_app: 'Cash App', venmo: 'Venmo', paypal: 'PayPal', other: 'Other' };
/** How a payment was made, in the buyer's Spanish texts. */
const METHOD_ES: Record<Method, string> = { cash: 'efectivo', card: 'tarjeta', ach: 'transferencia bancaria', check: 'cheque', money_order: 'giro postal', zelle: 'Zelle', cash_app: 'Cash App', venmo: 'Venmo', paypal: 'PayPal', other: 'otro medio' };

/* ---------- calendar days ---------- */
const toUTC = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd); };
const fromUTC = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fromUTC(toUTC(d) + n * 86400000);
export const daysBetween = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / 86400000);
function addMonths(d: string, n: number, day?: number) {
  const [y, m, dd] = d.split('-').map(Number);
  const want = day ?? dd, first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return fromUTC(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(want, last)));
}
/** Today in the dealer's zone, as YYYY-MM-DD. */
export const today = (tz: string, at = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);

/* ---------- the schedule ---------- */
export function installmentCents(principalCents: number, apr: number, count: number, f: Frequency) {
  if (count <= 0) return 0;
  const r = apr / 100 / PER_YEAR[f];
  const p = r === 0 ? principalCents / count : (principalCents * r) / (1 - Math.pow(1 + r, -count));
  return Math.round(p);
}
export function dueDates(firstDue: string, count: number, f: Frequency): string[] {
  const day = Number(firstDue.slice(8));
  return Array.from({ length: count }, (_, k) => {
    if (f === 'weekly') return addDays(firstDue, 7 * k);
    if (f === 'biweekly') return addDays(firstDue, 14 * k);
    if (f === 'monthly') return addMonths(firstDue, k, day);
    // semimonthly: the first-due day and fifteen days later, every month
    const second = day + 15 > 28 ? day - 15 : day + 15;
    const lowFirst = day <= 15;
    const month = Math.floor(k / 2), isFirst = k % 2 === 0;
    if (lowFirst) return addMonths(firstDue, month, isFirst ? day : second);
    return addMonths(firstDue, month + (isFirst ? 0 : 1), isFirst ? day : second);
  });
}

export function openLoan(x: { id: string; saleId?: string; buyer: Loan['buyer']; language?: Lang; vehicle: string; principalCents: number; apr: number; count: number; frequency: Frequency; firstDue: string; openedOn: string }): Loan {
  return { ...x, paymentCents: installmentCents(x.principalCents, x.apr, x.count, x.frequency), late: { ...TEXAS_LATE }, payments: [], remindersOn: true };
}

/* ---------- where the account stands ---------- */
export type Installment = { n: number; due: string; cents: number; paidCents: number; paidOn?: string; lateFeeCents: number; state: 'paid' | 'paid_late' | 'partial' | 'due' | 'late' | 'upcoming' };
export type Standing = {
  asOf: string;
  installments: Installment[];
  pastDueCents: number;            // installments due by today, not yet covered
  daysLate: number;                // since the oldest unpaid due date
  feesOwedCents: number;           // late charges assessed and unpaid
  principalCents: number;          // unpaid principal after the last payment
  accruedCents: number;            // interest since the last payment
  payoffCents: number;             // to close the note today
  paidCents: number; interestPaidCents: number; feesPaidCents: number;
  next?: { n: number; due: string; cents: number };
  status: 'current' | 'due_today' | 'late' | 'paid_off';
};

const sorted = (p: Payment[]) => [...p].sort((a, b) => a.on.localeCompare(b.on) || a.receipt - b.receipt);
/** The part of a payment that went to the car note (the rest went to repairs or fees). */
export const noteCents = (p: Payment) => p.cents - Object.values(p.toExtras ?? {}).reduce((t, c) => t + c, 0);

export function standing(loan: Loan, asOf: string): Standing {
  const dates = dueDates(loan.firstDue, loan.count, loan.frequency);
  const pays = sorted(loan.payments).filter(p => p.on <= asOf && counts(p));

  // 1. Walk the payments by date: interest accrues by the day; each payment pays late charges, then interest, then principal.
  let principal = loan.principalCents, since = loan.openedOn, interestPaid = 0, feesPaid = 0, paid = 0;
  const feeDue: { on: string; cents: number }[] = [];   // late charges, as installments pass the 15th day unpaid
  // Coverage of installments is measured on payments toward the installment (everything except fees).
  const inst: Installment[] = dates.map((due, n) => ({ n: n + 1, due, cents: loan.paymentCents, paidCents: 0, lateFeeCents: 0, state: 'upcoming' }));
  let pool = 0, k = 0;
  const coverTo = (on: string) => { while (k < inst.length && pool >= inst[k].cents - inst[k].paidCents) { pool -= inst[k].cents - inst[k].paidCents; inst[k].paidCents = inst[k].cents; inst[k].paidOn = on; k++; } if (k < inst.length && pool > 0) { inst[k].paidCents += pool; pool = 0; } };
  const assessFees = (upTo: string) => {
    for (const i of inst) {
      if (i.lateFeeCents) continue;
      const lateDay = addDays(i.due, loan.late.graceDays + 1);           // the 16th day past due
      const coveredBy = i.paidOn && i.paidCents >= i.cents ? i.paidOn : undefined;
      if (lateDay <= upTo && (!coveredBy || coveredBy >= lateDay)) {
        i.lateFeeCents = Math.round(i.cents * loan.late.pct / 100);
        feeDue.push({ on: lateDay, cents: i.lateFeeCents });
      }
    }
  };
  let carry = 0;                                                      // interest earned but not yet paid; never compounded
  for (const p of pays) {
    assessFees(p.on);
    const feesOutstanding = feeDue.reduce((t, f) => t + f.cents, 0) - feesPaid;
    const interest = carry + Math.round(principal * (loan.apr / 100) * Math.max(0, daysBetween(since, p.on)) / 365);
    const cents = noteCents(p);
    let left = cents;
    const toFees = Math.min(left, feesOutstanding); left -= toFees; feesPaid += toFees;
    const toInterest = Math.min(left, interest); left -= toInterest; interestPaid += toInterest; carry = interest - toInterest;
    const toPrincipal = Math.min(left, principal); left -= toPrincipal; principal -= toPrincipal;
    since = p.on; paid += cents;
    pool += cents - toFees; coverTo(p.on);
  }
  assessFees(asOf);
  const feesOwed = feeDue.reduce((t, f) => t + f.cents, 0) - feesPaid;
  const accrued = carry + (principal > 0 ? Math.round(principal * (loan.apr / 100) * Math.max(0, daysBetween(since, asOf)) / 365) : 0);

  // 2. Label each installment.
  for (const i of inst) {
    const covered = i.paidCents >= i.cents;
    if (covered) i.state = i.lateFeeCents ? 'paid_late' : 'paid';
    else if (i.due < asOf) i.state = i.paidCents > 0 ? 'partial' : 'late';
    else if (i.due === asOf) i.state = 'due';
    else i.state = i.paidCents > 0 ? 'partial' : 'upcoming';
  }
  const dueByNow = inst.filter(i => i.due <= asOf);
  const pastDue = dueByNow.reduce((t, i) => t + (i.cents - i.paidCents), 0);
  const oldest = inst.find(i => i.paidCents < i.cents && i.due < asOf);
  const nextI = inst.find(i => i.paidCents < i.cents);
  const paidOff = principal <= 0 && feesOwed <= 0;
  const status: Standing['status'] = paidOff ? 'paid_off' : oldest ? 'late' : nextI?.due === asOf ? 'due_today' : 'current';
  return {
    asOf, installments: inst, pastDueCents: pastDue, daysLate: oldest ? daysBetween(oldest.due, asOf) : 0,
    feesOwedCents: Math.max(0, feesOwed), principalCents: Math.max(0, principal), accruedCents: accrued,
    payoffCents: Math.max(0, principal) + accrued + Math.max(0, feesOwed),
    paidCents: paid, interestPaidCents: interestPaid, feesPaidCents: feesPaid,
    next: nextI && !paidOff ? { n: nextI.n, due: nextI.due, cents: nextI.cents - nextI.paidCents } : undefined,
    status,
  };
}

/** What to ask for at the counter: everything past due, plus late charges owed; otherwise the next installment. */
export function amountToAsk(s: Standing) {
  if (s.status === 'paid_off') return 0;
  return s.pastDueCents > 0 ? s.pastDueCents + s.feesOwedCents : (s.next?.cents ?? 0) + s.feesOwedCents;
}

export function takePayment(loan: Loan, p: Omit<Payment, 'id' | 'receipt'>, receipt: number): Loan {
  if (!(p.cents > 0)) throw new Error('A payment must be more than zero.');
  return { ...loan, payments: [...loan.payments, { ...p, id: `p${receipt}`, receipt }] };
}

/* ---------- reminders, for the buyer and for the owner ---------- */
export type Reminder = { on: string; kind: 'before' | 'due' | 'late' | 'late_fee' | 'promise'; n: number; text: string };
const usd = (c: number) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (d: string) => new Date(toUTC(d)).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
/** "viernes, 2 de octubre" */
const dia = (d: string) => new Date(toUTC(d)).toLocaleDateString('es-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });

/** The texts a buyer will get for the next unpaid installment: four at most, then once a week while it's still late. In the buyer's language.
    While they've promised a day, the due and late texts wait for it: one reminder that morning instead. */
export function reminderPlan(loan: Loan, s: Standing, dealerName: string): Reminder[] {
  const plan = basePlan(loan, s, dealerName), p = loan.remindersOn ? openPromise(loan, s.asOf) : undefined;
  if (!p) return plan;
  return [...plan.filter(r => r.kind === 'late_fee' || (r.kind !== 'late' && r.on > p.on)),
    { on: p.on, kind: 'promise' as const, n: s.next?.n ?? 0, text: promiseReminder(loan, p, dealerName) }].sort((a, b) => a.on.localeCompare(b.on));
}
function basePlan(loan: Loan, s: Standing, dealerName: string): Reminder[] {
  if (!loan.remindersOn || !s.next || s.status === 'paid_off') return [];
  const i = s.installments[s.next.n - 1], first = loan.buyer.name.split(' ')[0], es = loan.language === 'es', d = es ? dia : day;
  const owed = i.cents - i.paidCents + perPayment(loan, i.due), fee = usd(Math.round(i.cents * loan.late.pct / 100)), lateDays = loan.late.graceDays - 2, feeDay = d(addDays(i.due, loan.late.graceDays));
  const plan: Reminder[] = [
    { on: addDays(i.due, -3), kind: 'before', n: i.n, text: es ? `Hola ${first}, un recordatorio de ${dealerName}: su pago de ${usd(owed)} vence el ${d(i.due)}.` : `Hi ${first}, a reminder from ${dealerName}: your payment of ${usd(owed)} is due ${d(i.due)}.` },
    { on: i.due, kind: 'due', n: i.n, text: es ? `Hola ${first}, su pago de ${usd(owed)} a ${dealerName} vence hoy.` : `Hi ${first}, your ${dealerName} payment of ${usd(owed)} is due today.` },
    { on: addDays(i.due, 3), kind: 'late', n: i.n, text: es ? `Hola ${first}, no hemos recibido su pago de ${usd(owed)} que vencía el ${d(i.due)}. Responda o llámenos si necesita ayuda.` : `Hi ${first}, we haven’t received your ${usd(owed)} payment due ${d(i.due)}. Reply or call us if you need help.` },
    { on: addDays(i.due, lateDays), kind: 'late_fee', n: i.n, text: es ? `Hola ${first}, su pago de ${usd(owed)} tiene ${lateDays} días de atraso. Se cobrará un cargo por atraso de ${fee} si no se paga a más tardar el ${feeDay}.` : `Hi ${first}, your ${usd(owed)} payment is now ${lateDays} days late. A late charge of ${fee} applies if it isn’t paid by ${feeDay}.` },
  ];
  const ahead = plan.filter(r => r.on >= s.asOf);
  if (ahead.length || s.status !== 'late') return ahead;
  // Still late after every step above: one plain text a week, on the same weekday it fell due, until it's caught up.
  const sinceDue = daysBetween(i.due, s.asOf), on = addDays(s.asOf, (7 - (sinceDue % 7)) % 7), pastDue = usd(s.pastDueCents + s.feesOwedCents);
  return [{ on, kind: 'late', n: i.n, text: es ? `Hola ${first}, su cuenta con ${dealerName} tiene ${pastDue} vencido. Responda o llámenos y lo resolvemos juntos.` : `Hi ${first}, your ${dealerName} account is ${pastDue} past due. Reply or call us and we’ll work it out with you.` }];
}

export function receiptText(loan: Loan, p: Payment, after: Standing, dealerName: string) {
  const car = loan.vehicle.split(' · ')[0];
  if (loan.language === 'es') {
    const next = after.next ? ` Próximo pago de ${usd(after.next.cents)} vence el ${dia(after.next.due)}.` : ' Pagado por completo. Gracias.';
    return `${dealerName} recibo #${p.receipt}: recibimos ${usd(p.cents)} en ${METHOD_ES[p.method]} el ${dia(p.on)} por el ${car}. Saldo ${usd(after.payoffCents)}.${next}`;
  }
  const next = after.next ? ` Next payment ${usd(after.next.cents)} due ${day(after.next.due)}.` : ' Paid in full. Thank you.';
  return `${dealerName} receipt #${p.receipt}: received ${usd(p.cents)} by ${METHOD_LABEL[p.method].toLowerCase()} on ${day(p.on)} for the ${car}. Balance ${usd(after.payoffCents)}.${next}`;
}

export type Digest = { dueToday: { loan: Loan; cents: number }[]; late: { loan: Loan; cents: number; days: number }[]; collectedCents: number; collectedCount: number };
export function digest(loans: Loan[], asOf: string): Digest {
  const d: Digest = { dueToday: [], late: [], collectedCents: 0, collectedCount: 0 };
  for (const l of loans) {
    const s = standing(l, asOf);
    if (s.status === 'late') d.late.push({ loan: l, cents: s.pastDueCents + s.feesOwedCents, days: s.daysLate });
    else if (s.status === 'due_today') d.dueToday.push({ loan: l, cents: s.next!.cents });
    for (const p of l.payments) if (p.on === asOf && counts(p)) { d.collectedCents += p.cents; d.collectedCount++; }
  }
  d.late.sort((a, b) => b.days - a.days);
  return d;
}
/** The owner's morning text. */
export function ownerText(d: Digest, dealerName: string) {
  const sum = (xs: { cents: number }[]) => usd(xs.reduce((t, x) => t + x.cents, 0));
  return `${dealerName} today: ${d.dueToday.length} due (${sum(d.dueToday)}), ${d.late.length} late (${sum(d.late)}). Collected so far: ${usd(d.collectedCents)}.`;
}
export { usd as money };

/* ---------- payment updates: one text to the buyer, one to the dealership ----------
   Every change in a payment's status tells both sides, in plain words, at once. */
export type PaymentEvent = 'received' | 'clearing' | 'cleared' | 'returned' | 'declined' | 'charged_back' | 'refunded';
export type PaymentTexts = { buyer?: string; dealer: string };
export function paymentTexts(ev: PaymentEvent, loan: Loan, cents: number, after: Standing, dealerName: string, receipt?: number, reason?: string): PaymentTexts {
  const car = loan.vehicle.split(' · ')[0], amt = usd(cents);
  const next = after.status === 'paid_off' ? 'Your car is paid off. Thank you.' : after.next ? `Next payment ${usd(after.next.cents)} due ${day(after.next.due)}.` : '';
  const bal = `Balance ${usd(after.payoffCents)}.`;
  const t = ((): PaymentTexts => { switch (ev) {
    case 'received': case 'cleared': return {
      buyer: `${dealerName}: we received your ${amt} payment${receipt ? ` (receipt #${receipt})` : ''}. ${bal} ${next}`.trim(),
      dealer: `Payment in: ${amt} from ${loan.buyer.name}, ${car}.${after.status === 'paid_off' ? ' Paid off.' : ` ${bal}`}`,
    };
    case 'clearing': return {
      buyer: `${dealerName}: your ${amt} bank payment is on its way and usually clears in 3 to 4 business days. ${next}`.trim(),
      dealer: `Bank payment started: ${amt} from ${loan.buyer.name}, ${car}. Clearing.`,
    };
    case 'returned': return {
      buyer: `${dealerName}: your ${amt} bank payment came back from your bank${reason ? ` (${reason.toLowerCase()})` : ''}. Please call us or reply to pay another way.`,
      dealer: `Payment returned: ${amt} from ${loan.buyer.name}, ${car}${reason ? `, ${reason}` : ''}. Their account is ${usd(after.pastDueCents + after.feesOwedCents)} past due.`,
    };
    case 'declined': return {
      buyer: `${dealerName}: your ${amt} payment didn’t go through. Please try another card or reply and we’ll help.`,
      dealer: `Payment declined: ${amt} from ${loan.buyer.name}, ${car}.`,
    };
    case 'charged_back': return { dealer: `Chargeback: ${loan.buyer.name} disputed a ${amt} card payment on the ${car}. Respond in your processor’s portal.` };
    case 'refunded': return { buyer: `${dealerName}: we refunded ${amt} to you. ${bal}`, dealer: `Refunded ${amt} to ${loan.buyer.name}, ${car}.` };
  } })();
  // The dealership's side stays in English; the buyer's side is in their language.
  if (loan.language === 'es' && t.buyer) t.buyer = buyerEs(ev, dealerName, amt, after, receipt);
  // where the money went, when part of it paid a repair or a fee
  const went = Object.entries(loan.payments.find(p => p.receipt === receipt)?.toExtras ?? {}).map(([id, c]) => ({ c, what: loan.extras?.find(e => e.id === id)?.what ?? 'other charges' }));
  if (went.length && (ev === 'received' || ev === 'cleared')) {
    const list = went.map(w => `${usd(w.c)} to ${w.what}`).join(', ');
    t.dealer = t.dealer.replace(/^Payment in: ([^ ]+) from ([^,]+), /, `Payment in: $1 from $2 (${list}), `);
    if (t.buyer) t.buyer += loan.language === 'es' ? ` De este pago: ${went.map(w => `${usd(w.c)} para ${w.what}`).join(', ')}.` : ` Of this payment, ${list}.`;
  }
  const rep = repairsLeft(loan);
  if (t.buyer && (ev === 'received' || ev === 'cleared') && (rep > 0 || went.length)) t.buyer += loan.language === 'es' ? ` Saldo de reparaciones ${usd(rep)}.` : ` Repairs balance ${usd(rep)}.`;
  return t;
}
function buyerEs(ev: PaymentEvent, dealerName: string, amt: string, after: Standing, receipt?: number) {
  const next = after.status === 'paid_off' ? 'Su carro está pagado por completo. Gracias.' : after.next ? `Próximo pago de ${usd(after.next.cents)} vence el ${dia(after.next.due)}.` : '';
  const bal = `Saldo ${usd(after.payoffCents)}.`;
  switch (ev) {
    case 'received': case 'cleared': return `${dealerName}: recibimos su pago de ${amt}${receipt ? ` (recibo #${receipt})` : ''}. ${bal} ${next}`.trim();
    case 'clearing': return `${dealerName}: su pago bancario de ${amt} está en camino y normalmente se acredita en 3 a 4 días hábiles. ${next}`.trim();
    case 'returned': return `${dealerName}: su banco devolvió su pago de ${amt}. Llámenos o responda para pagar de otra forma.`;
    case 'declined': return `${dealerName}: su pago de ${amt} no se procesó. Pruebe con otra tarjeta o responda y le ayudamos.`;
    case 'refunded': return `${dealerName}: le reembolsamos ${amt}. ${bal}`;
    default: return undefined;
  }
}

/** Apply a processor update to the payment it names. Unknown ids change nothing. */
export function updatePayment(loan: Loan, processorId: string, status: PaymentStatus, reverse?: Payment['reverse']): Loan {
  return { ...loan, payments: loan.payments.map(p => (p.processorId === processorId ? { ...p, status, ...(reverse ? { reverse } : {}) } : p)) };
}
