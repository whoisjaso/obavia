/* The arbitration clause behind its flag (decisions §9 D13; phases.md amendment of October 13, 2026: the mechanism
   is built, the words are counsel's and marked draft until then). GET /terms carries it or null; the page shows
   once before the first-bid terms page, scroll to end unlocks Agree, POST /me/clause records the version; a bid's
   409 clause_required reopens it. The accepted version is kept on the phone so the page never returns on its
   own; the Worker's 409 is the one thing that brings it back. Locally, ?clause=1 turns it on for the walkthrough. */
import { useSyncExternalStore } from 'react';
import type { Clause } from './engine/client';
import { kv } from './kv';

export type { Clause };

/** The accepted version, on the phone: the page is never shown twice for one version. */
export const CLAUSE_KEY = 'obavia.clause';

let clause: Clause | null = null;
const subs = new Set<() => void>();
export function setClause(c: Clause | null) { clause = c; for (const f of subs) f(); }
export const peekClause = (): Clause | null => clause;
export function useClause(): Clause | null {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => clause, () => clause);
}

/** The clause the buyer still has to agree to: the one in force, unless this phone holds its version. */
export function clauseDue(c: Clause | null = clause): Clause | null {
  if (!c) return null;
  return kv.get(CLAUSE_KEY) === c.version ? null : c;
}
/** Agreed, this version: the page is done for good (until the Worker's 409 says otherwise). */
export const markClauseAccepted = (version: string): void => kv.set(CLAUSE_KEY, version);
/** A 409 clause_required: the Worker does not hold this buyer's agreement; the page is due again. */
export const reopenClause = (): void => kv.remove(CLAUSE_KEY);

/** The local stand-in's clause (?clause=1): the shape the Worker will send, its words a draft marked as one.
    Short, plain, and long enough to need the scroll that unlocks Agree. */
export const DRAFT_CLAUSE: Clause = {
  version: 'draft-2026-10-13',
  requiresScrollToEnd: true,
  text: [
    'Draft. Counsel writes these words. Nothing on this page is the clause.',
    'Decision D13 sets only its shape, in four parts.',
    'One. Disputes about a car sold on this lane go to an arbitrator under the Federal Arbitration Act. The clause names Obavia and the dealer.',
    'Two. It does not waive your rights under the Texas Deceptive Trade Practices Act.',
    'Three. A small claim can still go to small claims court.',
    'Four. You see it once, and Agree wakes at the end.',
    'Every other line is for counsel. This page is replaced with counsel\'s words before the switch is turned on.',
    'Agreeing records the date, this version and your buyer id with Obavia.',
    'You can say no. Then you cannot bid while the switch is on.',
  ].join('\n\n'),
};
