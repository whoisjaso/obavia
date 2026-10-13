import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canScan, passSix } from './scan';

describe('the pickup pass', () => {
  it('reads the last six of the VIN from this lot’s pass', () => {
    expect(passSix('obavia:0a004352-d2:1HGCM82633A004352:1760000000000', '0a004352-d2')).toBe('004352');
  });
  it('ignores another lot’s pass, another code and a short VIN', () => {
    expect(passSix('obavia:other-lot:1HGCM82633A004352:1', '0a004352-d2')).toBeNull();
    expect(passSix('https://example.com/0a004352-d2', '0a004352-d2')).toBeNull();
    expect(passSix('obavia:0a004352-d2:12345:1', '0a004352-d2')).toBeNull();
  });
  it('upper-cases a lower-case VIN', () => {
    expect(passSix('obavia:L1:1hgcm82633a00435x:1', 'L1')).toBe('00435X');
  });
  it('says it cannot scan where the browser has no BarcodeDetector', () => {
    expect(canScan()).toBe(false);
  });
  it('with no scanner, the Desk types the pass: six boxes in the shape the buyer\'s phone showed, no sentence (simplicity-audit §4 row 14)', () => {
    const page = readFileSync(new URL('../Auction.tsx', import.meta.url), 'utf8');
    expect(page).toContain("{scanner ? 'Scan The Pass' : 'Type The Pass'}");
    expect(page).toContain('>Type The Pass</button>');
    expect(page).toContain('className="code"');
    expect(page).not.toContain('>The six under the buyer’s code.</p>');
    expect(page).not.toContain('Type the pass when the buyer is here');
    expect(page).toContain('>Started</button>');
    expect(page).not.toContain('>It Started</button>');
    expect(page).not.toMatch(/Type [Tt]he VIN/);
    expect(page).not.toContain('door jamb');
    expect(page).toContain(".replace(/I/g, '1').replace(/[OQ]/g, '0')");
  });
});
