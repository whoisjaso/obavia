/* The Desk and the server keep one copy of each note. The Desk edits the note
   (sales, cash at the counter, autopay, complaints); the server adds what
   arrives without the Desk (processor payments, returns, failed charges).
   A merge keeps both and never loses a payment. */
import type { DayState } from './cashday';
import type { Loan, Payment } from './loans';

/** What the evening text needs that only the Desk knows today. */
export type DeskFacts = { on: string; toMatch: number; cashState: DayState; flaggedDays: number };
export type EveningSetting = { on: boolean; hour: number };
export type SyncBody = { notes: Loan[]; facts?: DeskFacts; evening?: EveningSetting };

const byKey = <T,>(xs: T[], key: (x: T) => string) => { const m = new Map<string, T>(); for (const x of xs) m.set(key(x), x); return m; };

/** The Desk's note, plus anything only the server has. On the same payment, the server's status wins (it heard from the processor). */
export function mergeNote(server: Loan | null, desk: Loan): Loan {
  if (!server) return desk;
  const pay = byKey<Payment>(desk.payments, p => p.processorId ?? p.id);
  for (const p of server.payments) pay.set(p.processorId ?? p.id, { ...pay.get(p.processorId ?? p.id), ...p });
  const att = byKey(desk.attempts ?? [], a => `${a.on}|${a.code}|${a.n}`);
  for (const a of server.attempts ?? []) att.set(`${a.on}|${a.code}|${a.n}`, a);
  const svc = byKey(desk.service ?? [], e => `${e.on}|${e.what}`);
  for (const e of server.service ?? []) if (!svc.has(`${e.on}|${e.what}`)) svc.set(`${e.on}|${e.what}`, e);
  return {
    ...desk,
    payments: [...pay.values()].sort((a, b) => a.on.localeCompare(b.on) || a.receipt - b.receipt),
    attempts: att.size ? [...att.values()] : desk.attempts,
    service: svc.size ? [...svc.values()] : desk.service,
  };
}

/** The highest receipt number on any note, so the server and the Desk never hand out the same one. */
export const maxReceipt = (notes: Loan[]) => notes.reduce((m, l) => Math.max(m, ...l.payments.map(p => p.receipt)), 0);
