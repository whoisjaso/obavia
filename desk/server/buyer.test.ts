import { describe, expect, it } from 'vitest';
import { FakeProvider } from './messaging/fake';
import { Messenger } from './service';
import { MemoryStore } from './store';
import { MemoryNoteStore } from './payments/desk';
import { buyerRoute, pagePath, readPagePath, type BuyerPages } from './buyer';
import { openLoan } from '../src/lib/loans';

const SECRET = 'k'.repeat(32);
function pages() {
  const p = new FakeProvider(), s = new MemoryStore(), notes = new MemoryNoteStore();
  s.lines.push({ dealerId: 'P171632', number: '+17135550100', displayName: 'Triple J Auto', helpPhone: '(713) 555-0100', timeZone: 'America/Chicago' });
  notes.notes.set('n1', openLoan({ id: 'n1', buyer: { name: 'Maria Example', phone: '(555) 010-7788' }, vehicle: '2016 Honda Accord · Stock 104', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue: '2026-10-09', openedOn: '2026-10-02' }));
  const b: BuyerPages = { notes: Object.assign(notes, { async dealerFor() { return { dealerId: 'P171632', name: 'Triple J Auto', textFrom: '+17135550100', alertTo: ['+17135550111'], timeZone: 'America/Chicago' }; } }), messenger: new Messenger(p, s), secret: SECRET, clock: () => new Date('2026-10-02T18:00:00Z') };
  return { b, notes, p };
}

describe("the buyer's page on the server", () => {
  it('opens only with a valid signature', async () => {
    const path = await pagePath(SECRET, 'n1');
    expect(await readPagePath(SECRET, path)).toBe('n1');
    expect(await readPagePath(SECRET, path.replace(/.$/, c => (c === 'A' ? 'B' : 'A')))).toBeNull();
    expect(await readPagePath('x'.repeat(32), path)).toBeNull();
    const { b } = pages();
    const r = await buyerRoute(new Request('https://api.obavia.co' + path), path, b);
    expect(r!.status).toBe(200);
    expect(r!.headers.get('x-robots-tag')).toBe('noindex');
    expect(await r!.text()).toContain('Next payment');
    expect(await buyerRoute(new Request('https://api.obavia.co/b/n1.' + 'a'.repeat(22)), '/b/n1.' + 'a'.repeat(22), b)).toBeNull();
  });

  it('saves a new insurance card from the buyer and tells the dealership', async () => {
    const { b, notes, p } = pages(), path = await pagePath(SECRET, 'n1');
    const body = new URLSearchParams({ company: 'Progressive', expires: '2027-04-01', data: 'data:image/jpeg;base64,AAAA' }).toString();
    const r = await buyerRoute(new Request('https://api.obavia.co' + path, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }), path, b);
    expect(r!.status).toBe(200);
    expect(await r!.text()).toContain('We got your insurance card');
    expect(notes.notes.get('n1')!.insurance).toEqual({ company: 'Progressive', expires: '2027-04-01', updated: '2026-10-02', by: 'buyer', photo: 'data:image/jpeg;base64,AAAA' });
    expect(p.sent.at(-1)?.text).toBe('Maria Example sent new insurance: Progressive, ends 2027-04-01.');
    const bad = await buyerRoute(new Request('https://api.obavia.co' + path, { method: 'POST', body: 'company=&expires=x' }), path, b);
    expect(bad!.status).toBe(422);
  });
});
