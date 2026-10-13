import { describe, expect, it } from 'vitest';
import { passSix, passValue } from './pass';
import { passSix as deskSix } from '../../desk/src/lib/scan';

describe('the pass', () => {
  it('prints the same six the Desk reads from its QR', () => {
    for (const vin of ['1HGCM82633A004352', '1hgcm82633a00435x', '3N1AB7AP5KY2-5A1C']) {
      const lot = 'L1', printed = passSix(vin);
      expect(printed).toHaveLength(6);
      expect(printed).toBe(printed.toUpperCase());
      expect(deskSix(passValue(lot, vin, 1760000000000), lot)).toBe(printed);
    }
  });
  it('prints the VIN’s last six', () => {
    expect(passSix('1HGCM82633A004352')).toBe('004352');
  });
});
