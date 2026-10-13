/* The corridor's licence-field ticks (Corridor.tsx BuyerId): a plain ink mark, never a .choice. The cloud material's grain
   (styles.css, .choice::after, soft-light) on a 44 px control with no body of its own blends into nothing and printed as
   grey noise at 393 wide (the October 13 end-to-end, run3/logs/probe-fields.png). No DOM in the Desk's tests: the source
   is read, as sign.test.ts reads SignDocs.tsx. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const src = readFileSync(new URL('./Corridor.tsx', import.meta.url), 'utf8');

describe('the ID fields screen: five clean ticks', () => {
  it('the confirm button beside each field is not a .choice and carries no cloud class', () => {
    const line = src.split('\n').find(l => l.includes('aria-label={`Confirm ${labels[k]}`}'));
    expect(line).toBeDefined();
    expect(line).not.toMatch(/className=/);
    expect(line).toContain('style={TICK_BUTTON}');
    expect(line).toContain('<Tick on={ok[k]} />');
    expect(line).toContain('aria-pressed={ok[k]}');
  });
  it('the tick is the Desk\'s own mark: a 26 px ring in the line colour, the accent fill with the check when on', () => {
    expect(src).toMatch(/function Tick\(\{ on \}/);
    expect(src).toContain("background: on ? 'var(--accent)' : 'transparent'");
    expect(src).toContain("boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--line)'");
    expect(src).toContain('{on && <Ic n="check" s={15} w={3} />}');
    expect(src).toMatch(/const TICK_BUTTON: CSSProperties = \{[^}]*background: 'none'[^}]*boxShadow: 'none'/);
  });
  it('no em or en dash in the corridor', () => { expect(src).not.toMatch(/[\u2013\u2014]/); });
});
