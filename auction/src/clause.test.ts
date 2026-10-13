import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_CLAUSE, clauseDue, markClauseAccepted, peekClause, reopenClause, setClause } from './clause';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('expo-secure-store', () => ({ AFTER_FIRST_UNLOCK: 0, getItem: () => null, setItem: () => {} }));

class MemoryStorage { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } }
beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage(); setClause(null); });
afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

describe('the clause gate', () => {
  it('no clause: nothing due', () => { expect(clauseDue(null)).toBeNull(); expect(peekClause()).toBeNull(); });
  it('a clause is due until its version is accepted; a new version is due again; a 409 reopens it', () => {
    const c = { version: 'v1', text: 'Words.', requiresScrollToEnd: true as const };
    setClause(c);
    expect(clauseDue()).toBe(c);
    markClauseAccepted('v1');
    expect(clauseDue()).toBeNull();
    setClause({ ...c, version: 'v2' });
    expect(clauseDue()).toMatchObject({ version: 'v2' });
    markClauseAccepted('v2');
    expect(clauseDue()).toBeNull();
    reopenClause();
    expect(clauseDue()).toMatchObject({ version: 'v2' });
  });
  it('the draft the walkthrough plays says it is a draft, in plain words, with no dash of either kind', () => {
    expect(DRAFT_CLAUSE.text.startsWith('Draft.')).toBe(true);
    expect(DRAFT_CLAUSE.text).not.toMatch(/[\u2013\u2014]/);
    expect(DRAFT_CLAUSE.requiresScrollToEnd).toBe(true);
    expect(DRAFT_CLAUSE.text.split('\n\n').length).toBeGreaterThan(6);   // long enough to need the scroll that unlocks Agree
  });
});
