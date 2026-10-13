import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

describe('cloud3d engine', () => {
  it('is the same file on obavia.co and in the Desk (one GLSL, one controller)', () => {
    expect(readFileSync(here('./cloud3d-engine.js'), 'utf8')).toBe(readFileSync(here('../../obavia-co/cloud3d-engine.js'), 'utf8'));
  });
  it('keeps the raymarch inside the frame budget the spec allows (32 to 48 steps)', async () => {
    const { GLSL } = await import('./cloud3d-engine.js');
    const steps = [...(GLSL.SKY_FS + GLSL.BTN_FS).matchAll(/const int N=(\d+);/g)].map(m => Number(m[1]));
    expect(steps.length).toBe(2);
    steps.forEach(n => { expect(n).toBeGreaterThanOrEqual(32); expect(n).toBeLessThanOrEqual(48); });
  });
  it('has no em or en dashes anywhere in the shipped engine', () => {
    expect(readFileSync(here('./cloud3d-engine.js'), 'utf8')).not.toMatch(/[–—]/);
  });
});
