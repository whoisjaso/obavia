/* The leak engine. Pure functions over stage counts: what converted, how it
   compares with each step's own benchmark, and what the gap is worth. */
import { BENCH, DEAL, REPS, STEPS, type Rep, type StepIndex } from './data';

export type Health = 'good' | 'norm' | 'leak';
export const HEALTH_LABEL: Record<Health, string> = { good: 'Strong', norm: 'On pace', leak: 'Leak' };

export type Counts = readonly [number, number, number, number, number];

export const rate = (c: Counts, i: StepIndex) => (c[i] ? (c[i + 1] / c[i]) * 100 : 0);
export const rates = (c: Counts) => ([0, 1, 2, 3] as StepIndex[]).map(i => rate(c, i));
export const health = (i: StepIndex, pct: number): Health =>
  pct < BENCH[i].leak ? 'leak' : pct >= BENCH[i].strong ? 'good' : 'norm';

export const cash = (c: Counts) => c[4] * DEAL;
export const perLead = (c: Counts) => (c[0] ? cash(c) / c[0] : 0);

/** Cash gained a month if step i rose to `target`%, everything downstream unchanged. */
export function lift(c: Counts, i: StepIndex, target = BENCH[i].strong): number {
  const now = rate(c, i);
  if (now >= target) return 0;
  let extra = (c[i] * target) / 100 - c[i + 1];
  for (let j = i + 1; j < 4; j++) extra *= c[j] ? c[j + 1] / c[j] : 0;
  return Math.max(0, extra * DEAL);
}

export type Leak = { step: StepIndex; name: string; pct: number; health: Health; worth: number };
export const leaks = (c: Counts): Leak[] =>
  ([0, 1, 2, 3] as StepIndex[]).map(i => ({ step: i, name: STEPS[i], pct: rate(c, i), health: health(i, rate(c, i)), worth: lift(c, i) }));
export const biggest = (c: Counts): Leak => leaks(c).reduce((a, b) => (b.worth > a.worth ? b : a));

export const teamCounts = (reps: Rep[] = REPS): Counts =>
  reps.reduce((t, r) => t.map((v, k) => v + r.counts[k]) as unknown as Counts, [0, 0, 0, 0, 0] as unknown as Counts);

export const byId = (id: string) => REPS.find(r => r.id === id)!;

/* formatting */
export const int = (v: number) => Math.round(v).toLocaleString('en-US');
export const money = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
export const k = (v: number) => (v >= 1e6 ? '$' + (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'K' : money(v));
export const pct = (v: number) => Math.round(v) + '%';
