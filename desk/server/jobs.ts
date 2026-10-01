/* The hourly job (Cloudflare cron). For each dealership, in its own time zone:
   - at REMINDER_HOUR, text each buyer the reminder due today, once;
   - at the owner's chosen hour, send tonight's text to the alert numbers, once.
   Every text goes through the Messenger, so STOP, the compliance gate and the
   log apply. Each send is claimed first, so a re-run never repeats it. */
import { evening } from '../src/lib/evening';
import { reminderPlan, standing, today, type Loan } from '../src/lib/loans';
import type { DeskFacts, EveningSetting } from '../src/lib/sync';
import type { Messenger } from './service';

export const REMINDER_HOUR = 10;

export type JobDealer = { dealerId: string; name: string; textFrom: string; timeZone: string; alertTo: string[]; evening?: EveningSetting; facts?: DeskFacts };
export interface JobStore {
  dealers(): Promise<JobDealer[]>;
  notes(dealerId: string): Promise<Loan[]>;
  /** True if this key was new and is now marked; false if it already ran. */
  claim(key: string, at: string): Promise<boolean>;
}

export const hourIn = (tz: string, at: Date) => Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(at));

export async function runJobs(store: JobStore, messenger: Messenger, now = new Date()) {
  const done = { reminders: 0, evenings: 0, skipped: 0 };
  for (const d of await store.dealers()) {
    const t = today(d.timeZone, now), hour = hourIn(d.timeZone, now);
    const notes = hour === REMINDER_HOUR || (d.evening?.on && hour === d.evening.hour) ? await store.notes(d.dealerId) : [];

    if (hour === REMINDER_HOUR) for (const l of notes) {
      for (const r of reminderPlan(l, standing(l, t), d.name).filter(r => r.on === t)) {
        if (!(await store.claim(`rem:${l.id}:${r.n}:${r.kind}:${t}`, now.toISOString()))) { done.skipped++; continue; }
        const res = await messenger.send({ dealerId: d.dealerId, from: d.textFrom, to: l.buyer.phone, text: r.text, kind: 'care', recipientTimeZone: d.timeZone });
        if (res.ok) done.reminders++;
      }
    }

    if (d.evening?.on && hour === d.evening.hour && d.alertTo.length) {
      if (!(await store.claim(`eve:${d.dealerId}:${t}`, now.toISOString()))) { done.skipped++; continue; }
      const f = d.facts?.on === t ? d.facts : undefined;    // what only the Desk knows, if it reported today
      const text = evening({ dealerName: d.name, date: t, loans: notes, toMatch: f?.toMatch ?? 0, cashState: f?.cashState ?? 'counted', flaggedDays: f?.flaggedDays ?? 0 }).text;
      for (const to of d.alertTo) await messenger.send({ dealerId: d.dealerId, from: d.textFrom, to, text, kind: 'care', recipientTimeZone: d.timeZone });
      done.evenings++;
    }
  }
  return done;
}
