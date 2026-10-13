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
    'Draft. Counsel writes the words. These are the shape of them.',
    'If you and Obavia, or you and the dealer, disagree about a car sold on this lane, an arbitrator decides it, not a court. This is under the Federal Arbitration Act.',
    'You can still take a small claim to small claims court.',
    'Nothing here takes away your rights under the Texas Deceptive Trade Practices Act. Title, odometer and VIN disputes stay with the arbitrator and cannot be waived.',
    'The arbitration happens in Texas, in the county where the dealer is. One arbitrator. The rules are the arbitrator\'s own.',
    'Each side pays its own lawyer. The filing fee is split unless the arbitrator says otherwise.',
    'You agree for yourself only. No class actions.',
    'This clause stays even if the sale is undone.',
    'If a court finds one line of this clause cannot stand, the rest stands.',
    'You can say no. Then you cannot bid on this lane.',
    'Agreeing records the date, the version of these words and your buyer id with Obavia. Nothing else.',
  ].join('\n\n'),
};
