import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseIndex, searchDealers } from './dealers';
import { COMMON, SYSTEMS, searchSystems, systemById } from './systems';

describe('systems catalog', () => {
  it('has a real logo file for every system that claims one, and no duplicates', () => {
    for (const s of SYSTEMS) if (s.logo) expect(existsSync(`public/${s.logo.replace('./', '')}`), s.id).toBe(true);
    expect(new Set(SYSTEMS.map(s => s.id)).size).toBe(SYSTEMS.length);
    for (const id of COMMON) expect(systemById(id), id).toBeDefined();
  });
  it('finds a system by name or by an old name', () => {
    expect(searchSystems('frazer')[0].id).toBe('frazer');
    expect(searchSystems('recon velocity')[0].id).toBe('reconvelocity');
    expect(searchSystems('desk manager')[0].id).toBe('automanager');
  });
});

describe('Texas dealer index', () => {
  const idx = parseIndex(JSON.parse(readFileSync('public/dealers/tx.index.json', 'utf8')));
  it('holds the TxDMV list with contacts only as hints', () => {
    expect(idx.count).toBeGreaterThan(15000);
    const raw = readFileSync('public/dealers/tx.index.json', 'utf8');
    expect(raw).not.toMatch(/\b\d{10}\b/);                       // no full phone numbers
    expect(raw).not.toMatch(/"[a-z0-9._%+-]{2,}@[a-z0-9.-]+\.[a-z]{2,}"/i); // no full emails
  });
  it('carries whether the licence lists a phone, never a digit of it', () => {
    const raw = JSON.parse(readFileSync('public/dealers/tx.index.json', 'utf8'));
    expect(raw.fields).not.toContain('phoneLast4');
    const d = searchDealers(idx, 'P171632')[0];
    expect(typeof d.hasPhone).toBe('boolean');
    expect(Object.keys(d)).not.toContain('phoneLast4');
    expect(idx.list.some(x => x.hasPhone)).toBe(true);
    // an index published before the change: read as yes or no, the digits dropped
    const old = parseIndex({ state: 'TX', asOf: '2026-09-30', count: 2, fields: ['licence', 'name', 'phoneLast4'], rows: [['P1', 'A', '3294'], ['P2', 'B', '']] });
    expect(old.list.map(x => x.hasPhone)).toEqual([true, false]);
    expect(JSON.stringify(old.list)).not.toContain('3294');
  });
  it('finds a dealer by name, DBA or licence', () => {
    expect(searchDealers(idx, 'triple j auto investment')[0].licence).toBe('P171632');
    expect(searchDealers(idx, 'P171632')[0].name).toMatch(/Triple J Auto Investment/);
  });
});

describe('Marketplace consent', async () => {
  const { MARKETPLACE_TERMS, consentIsCurrent, isSignatureName, termsHash } = await import('./consent');
  it('says the account is theirs and that Obavia is not liable, before anything turns on', () => {
    const text = MARKETPLACE_TERMS.terms.map(t => t.title + ' ' + t.body).join(' ') + MARKETPLACE_TERMS.agreement;
    expect(text).toMatch(/your own Facebook account/);
    expect(text).toMatch(/restrict/);
    expect(text).toMatch(/isn’t liable|isn’t responsible/);
  });
  it('only counts consent for the exact words on screen now', () => {
    const c = { id: 'marketplace' as const, version: MARKETPLACE_TERMS.version, hash: termsHash(MARKETPLACE_TERMS), name: 'Jason Example', licence: 'P171632', at: '', timeZone: 'America/Chicago' };
    expect(consentIsCurrent(c, MARKETPLACE_TERMS)).toBe(true);
    const changed = { ...MARKETPLACE_TERMS, agreement: MARKETPLACE_TERMS.agreement + ' ' };
    expect(consentIsCurrent(c, changed)).toBe(false);
    expect(consentIsCurrent(undefined, MARKETPLACE_TERMS)).toBe(false);
  });
  it('needs a full name, not initials or a blank', () => {
    expect(isSignatureName('Jason Example')).toBe(true);
    expect(isSignatureName('María De La Cruz')).toBe(true);
    expect(isSignatureName('J')).toBe(false);
    expect(isSignatureName('jason')).toBe(false);
  });
});
