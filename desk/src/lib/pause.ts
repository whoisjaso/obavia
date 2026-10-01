/* Pausing payments: "he lost his job, give him two weeks." The paused
   installments move to the end of the note, so nothing falls due during the
   pause: no reminders, no late charges, no fees. Interest keeps accruing by
   the day on what's owed (simple interest), so the last payment can come out
   a little larger; the Desk shows that before the owner saves. No fee is
   charged for a pause; counsel confirms whether Texas wants it in writing. */
import { addDays, scheduleDates, standing, type Loan } from './loans';

export type Pause = { id: string; made: string; from: string; count: number; by?: string; why?: string };

/** The due dates a pause took off the calendar. */
export function pausedDates(l: Loan, p: Pause): string[] {
  const without = scheduleDates({ ...l, pauses: (l.pauses ?? []).filter(x => x.id !== p.id) });
  return without.filter(d => d >= p.from).slice(0, p.count);
}

/** The pause covering today, if any: its paused dates run from `from` to the day before the next payment after them. */
export function activePause(l: Loan, asOf: string) {
  for (const p of l.pauses ?? []) {
    const days = pausedDates(l, p); if (!days.length) continue;
    const resume = scheduleDates(l).find(d => d > days[days.length - 1]);
    if (asOf >= p.made && (!resume || asOf < resume)) return { pause: p, days, resume };
  }
  return undefined;
}

/** What a pause would change: when payments start again, and how the payoff at the end moves. */
export function previewPause(l: Loan, from: string, count: number, asOf: string) {
  const p: Pause = { id: 'preview', made: asOf, from, count };
  const after = { ...l, pauses: [...(l.pauses ?? []), p] };
  const days = pausedDates(after, p), sched = scheduleDates(after);
  const resume = sched.find(d => d > days[days.length - 1]);
  const lastBefore = scheduleDates(l).slice(-1)[0], lastAfter = sched.slice(-1)[0];
  // the extra interest: the payoff on the old last day if every payment came on time, compared both ways
  const onTime = (x: Loan) => {
    // every installment still owed, paid on its day (or today if it's already late); the payoff left after the last one
    const due = standing(x, asOf).installments.filter(i => i.paidCents < i.cents);
    const y = { ...x, payments: [...x.payments, ...due.map((i, k) => ({ id: 'pv' + k, on: i.due < asOf ? asOf : i.due, cents: i.cents - i.paidCents, method: 'cash' as const, receipt: -1 - k }))] };
    return standing(y, addDays(due.length ? due[due.length - 1].due : asOf, 1)).payoffCents;
  };
  return { days, resume, lastBefore, lastAfter, extraAtEnd: Math.max(0, onTime(after) - onTime(l)), pausesThisYear: (l.pauses ?? []).filter(x => x.made > addDays(asOf, -365)).length };
}

/** The text the buyer gets, in their language. */
export function pauseText(l: Loan, resume: string | undefined, dealerName: string) {
  const first = l.buyer.name.split(' ')[0];
  const day = (d: string, loc: string) => new Date(d + 'T12:00:00Z').toLocaleDateString(loc, { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
  if (l.language === 'es') return `Hola ${first}, ${dealerName} pausó sus pagos.${resume ? ` Su próximo pago vence el ${day(resume, 'es-US')}.` : ''} Llámenos si tiene preguntas.`;
  return `Hi ${first}, ${dealerName} has paused your payments.${resume ? ` Your next payment is due ${day(resume, 'en-US')}.` : ''} Call us with any questions.`;
}
