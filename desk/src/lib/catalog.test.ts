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
  it('finds a dealer by name, DBA or licence', () => {
    expect(searchDealers(idx, 'triple j auto investment')[0].licence).toBe('P171632');
    expect(searchDealers(idx, 'P171632')[0].name).toMatch(/Triple J Auto Investment/);
  });
});
