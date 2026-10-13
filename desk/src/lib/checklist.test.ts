import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHECKLIST, CHECKLIST_ROWS, groupDone, readTicks, splitRow, toggleTick, writeTicks, type Ticks } from './checklist';

/* W4-C: the Desk's checklist is docs/plan/ops-runbook.md §20, row for row. Every row is the runbook's line verbatim or shorter
   (its words, in the runbook's order, with nothing added), never longer; the headings are the runbook's own. */
const runbook = readFileSync(resolve(__dirname, '../../../docs/plan/ops-runbook.md'), 'utf8');
function section20() {
  const from = runbook.indexOf('## 20. The daily checklist');
  const to = runbook.indexOf('\n## 21.', from);
  const lines = runbook.slice(from, to).split('\n');
  const groups: { heading: string; lines: string[] }[] = [];
  for (const l of lines) {
    const h = /^### (.+)$/.exec(l); if (h) { groups.push({ heading: h[1].trim(), lines: [] }); continue; }
    const r = /^\d+\. (.+)$/.exec(l); if (r && groups.length) groups[groups.length - 1].lines.push(r[1]);
  }
  return groups;
}
const words = (s: string) => s.replace(/\*\*|`/g, '').replace(/§\s?\d+[a-z]?/g, '').toLowerCase().replace(/[^a-z0-9$'\s]/g, ' ').split(/\s+/).filter(Boolean);
const subsequence = (small: string[], big: string[]) => { let i = 0; for (const w of big) if (i < small.length && small[i] === w) i++; return i === small.length; };

describe('the checklist is the runbook\'s §20', () => {
  const rb = section20();
  it('the runbook has the two headings and their lines', () => {
    expect(rb.map(g => g.heading)).toEqual(['Morning, before 10 am', '9 pm']);
    expect(rb.map(g => g.lines.length)).toEqual([9, 6]);
  });
  it('the headings and the row counts are the runbook\'s', () => {
    expect(CHECKLIST.map(g => g.heading)).toEqual(rb.map(g => g.heading));
    expect(CHECKLIST.map(g => g.rows.length)).toEqual(rb.map(g => g.lines.length));
  });
  it.each(CHECKLIST.flatMap((g, gi) => g.rows.map((r, ri) => [r.id, gi, ri] as const)))('%s is its runbook line, verbatim or shorter', (_id, gi, ri) => {
    const row = CHECKLIST[gi].rows[ri].text, line = rb[gi].lines[ri];
    expect(row.length).toBeLessThanOrEqual(line.replace(/\*\*|`/g, '').length);
    expect(subsequence(words(row), words(line)), `${row}\n  is not inside\n${line}`).toBe(true);
    expect(row).not.toMatch(/[\u2013\u2014]/);
  });
  it('every row has a lead the eye lands on and no two ids collide', () => {
    expect(new Set(CHECKLIST_ROWS.map(r => r.id)).size).toBe(CHECKLIST_ROWS.length);
    for (const r of CHECKLIST_ROWS) { const { lead, rest } = splitRow(r.text); expect(lead.length).toBeGreaterThan(0); expect((lead + (rest ? ' ' + rest : '')).replace(/\s+/g, ' ')).toBe(r.text.replace(/\s+/g, ' ')); }
    expect(splitRow('Ask the owner: "Was last night equal?" Write yes or no.')).toEqual({ lead: 'Ask the owner: "Was last night equal?"', rest: 'Write yes or no.' });
    expect(splitRow('One line only.')).toEqual({ lead: 'One line only.', rest: '' });
  });
});

describe('the ticks live per day on this device', () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, m }; };
  it('toggle, keep, read back; another day starts clean; reset removes the key', () => {
    const st = mem();
    let t: Ticks = readTicks('2026-10-13', st);
    expect(t).toEqual({});
    t = toggleTick(t, 'm1'); t = toggleTick(t, 'm2'); t = toggleTick(t, 'm1');
    writeTicks('2026-10-13', t, st);
    expect(readTicks('2026-10-13', st)).toEqual({ m2: true });
    expect(readTicks('2026-10-14', st)).toEqual({});
    writeTicks('2026-10-13', {}, st);
    expect(st.m.size).toBe(0);
  });
  it('a group is done when every row of it is ticked', () => {
    const g = CHECKLIST[1];
    const all = Object.fromEntries(g.rows.map(r => [r.id, true])) as Ticks;
    expect(groupDone(g, all)).toBe(true);
    expect(groupDone(g, toggleTick(all, g.rows[0].id))).toBe(false);
    expect(groupDone(CHECKLIST[0], all)).toBe(false);
  });
  it('a broken store reads as nothing ticked', () => {
    expect(readTicks('d', { getItem: () => '{not json' })).toEqual({});
    expect(readTicks('d', null)).toEqual({});
  });
});
