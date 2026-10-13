import { describe, expect, it } from 'vitest';
import { openLoan, type Loan } from '../src/lib/loans';
import { hourIn, runJobs, type JobDealer, type JobStore } from './jobs';
import { FakeProvider } from './messaging/fake';
import { Messenger } from './service';
import { MemoryStore } from './store';

const NOTE: Loan = openLoan({ id: 'n1', buyer: { name: 'Maria Example', phone: '(832) 410-7788' }, vehicle: 'Car', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue: '2026-10-09', openedOn: '2026-10-02' });
const DEALER: JobDealer = { dealerId: 'P171632', name: 'Triple J Auto', textFrom: '+17135550100', timeZone: 'America/Chicago', alertTo: ['+17134883602'], evening: { on: true, hour: 19 },
  facts: { on: '2026-10-09', toMatch: 2, cashState: 'open', flaggedDays: 0 } };

function setup() {
  const claimed = new Set<string>(), p = new FakeProvider();
  const store: JobStore = { async dealers() { return [DEALER]; }, async notes() { return [NOTE]; }, async claim(k) { if (claimed.has(k)) return false; claimed.add(k); return true; } };
  return { store, p, messenger: new Messenger(p, new MemoryStore()) };
}
// 2026-10-09 is a Friday; Houston is UTC-5 in October.
const at = (hourLocal: number, day = '2026-10-09') => new Date(`${day}T${String(hourLocal + 5).padStart(2, '0')}:00:00Z`);

describe('the hourly job', () => {
  it('reads the hour in the dealer’s time zone', () => expect(hourIn('America/Chicago', at(10))).toBe(10));
  it('texts the reminder due today at 10 AM, once, however often it runs', async () => {
    const { store, p, messenger } = setup();
    expect(await runJobs(store, messenger, at(10))).toMatchObject({ reminders: 1, evenings: 0 });
    expect(p.sent[0]).toMatchObject({ to: '+18324107788' });
    expect(p.sent[0].text).toMatch(/payment of \$126\.28 is due today/);
    expect(await runJobs(store, messenger, at(10))).toMatchObject({ reminders: 0, skipped: 1 });
    expect(await runJobs(store, messenger, at(11))).toMatchObject({ reminders: 0 });
  });
  it('sends tonight’s text at the owner’s hour with what the Desk reported today', async () => {
    const { store, p, messenger } = setup();
    expect(await runJobs(store, messenger, at(19))).toMatchObject({ evenings: 1 });
    expect(p.sent.map(m => m.to)).toEqual(['+17134883602']);
    expect(p.sent[0].text).toContain('2 payments to match');
    await runJobs(store, messenger, at(19));
    expect(p.sent).toHaveLength(1);
  });
});
