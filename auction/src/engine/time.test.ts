import { describe, expect, it, vi } from 'vitest';
import { PILOT_TZ, payByWords } from './time';

// sale.ts loads the sensory layer (native modules); the words need none of it
vi.mock('../feel', () => ({ feel: { heartbeat: vi.fn(), done: vi.fn(), tick: vi.fn() } }));


// Thu Oct 15, 2026 21:37 UTC = 4:37 pm CDT; 21:00 UTC = 4 pm CDT; Tue Nov 3, 2026 06:05 UTC = 12:05 am CST
const AT = [Date.UTC(2026, 9, 15, 21, 37), Date.UTC(2026, 9, 15, 21, 0), Date.UTC(2026, 10, 3, 6, 5)];

describe('pay-by words (CP9)', () => {
  it('carries the minutes when they are not zero, in the pilot zone', () => {
    expect(AT.map(a => payByWords(a, PILOT_TZ))).toEqual(['Thu 4:37 pm', 'Thu 4 pm', 'Tue 12:05 am']);
  });
  it('the pilot zone is the default', () => {
    for (const a of AT) expect(payByWords(a)).toBe(payByWords(a, PILOT_TZ));
  });
});

describe('three surfaces, one string', () => {
  it('the phone (sale.ts), the Worker push (worker/src/push.ts) and the engine say the same words for one deadline', async () => {
    const phone = (await import('../sale')).payByWords, worker = (await import('../../worker/src/push')).payBy;
    for (const a of AT) expect([phone(a), worker(a), payByWords(a)]).toEqual([payByWords(a, PILOT_TZ), payByWords(a, PILOT_TZ), payByWords(a, PILOT_TZ)]);
    expect([phone(AT[0]), worker(AT[0])]).toEqual(['Thu 4:37 pm', 'Thu 4:37 pm']);
  });
});
