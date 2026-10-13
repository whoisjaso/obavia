import { describe, expect, it } from 'vitest';
import { fieldsForWebDealer, isAdult, isExpired, isTexas, parseAamva, toSale } from './licence';

/* Synthetic AAMVA payloads only. Every name, number and address below is invented; never commit a real
   licence's barcode text. */
function aamva(iin: string, version: string, files: [type: string, body: string][]): string {
  const head = '@\n\u001e\rANSI ' + iin + version + '00' + String(files.length).padStart(2, '0');
  let offset = head.length + files.length * 10;
  let designators = '', bodies = '';
  for (const [type, body] of files) {
    const text = type + body + '\r';
    designators += type + String(offset).padStart(4, '0') + String(text.length).padStart(4, '0');
    bodies += text;
    offset += text.length;
  }
  return head + designators + bodies;
}
const lines = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => k + v).join('\n');

const TX = {
  DAQ: '01234567', DCS: 'EXAMPLE', DAC: 'MARISOL', DAD: 'ANA', DBD: '01152024', DBB: '04121991', DBA: '04122031',
  DBC: '2', DAG: '2210 SAMPLE AVE', DAI: 'SAN ANTONIO', DAJ: 'TX', DAK: '782050000  ', DCF: '12345678901234567890',
  DCG: 'USA', DDE: 'N', DDF: 'N', DDG: 'N',
};
const NOON = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const NOW = NOON(2026, 10, 13);

describe('the licence read', () => {
  it('reads a Texas licence into the facts', () => {
    const r = parseAamva(aamva('636015', '08', [['DL', lines(TX)], ['ZT', 'ZTAX']]))!;
    expect(r).toMatchObject({
      name: 'Marisol Ana Example', street: '2210 Sample Ave', city: 'San Antonio', state: 'TX', zip: '78205',
      dob: '1991-04-12', number: '01234567', expires: '2031-04-12', issued: '2024-01-15', audit: '12345678901234567890', iin: '636015',
    });
    expect(isTexas(r)).toBe(true);
    expect(isExpired(r, NOW)).toBe(false);
    expect(isAdult(r, NOW)).toBe(true);
    expect(toSale(r)).toEqual({ name: 'Marisol Ana Example', dob: '04/12/1991', address: '2210 Sample Ave, San Antonio', licence: '•••• 4567', state: 'TX', confirmed: false });
    expect(fieldsForWebDealer(r)).toEqual({ dl: '01234567', dob: '04/12/1991', audit: '12345678901234567890', typed: ['ssnLast4'] });
  });

  it('survives a scanner that rewrote CR to LF or dropped the control characters', () => {
    const raw = aamva('636015', '08', [['DL', lines(TX)], ['ZT', 'ZTAX']]);
    for (const v of [raw.replace(/\r/g, '\n'), raw.replace(/\r/g, '\r\n'), raw.replace(/[\r\u001e]/g, '').replace(/^@\n/, '')]) {
      const r = parseAamva(v);
      expect(r?.number).toBe('01234567');
      expect(r?.audit).toBe('12345678901234567890');
      expect(r?.zip).toBe('78205');
    }
  });

  it('reads an out-of-state licence and keeps it off webDEALER', () => {
    const r = parseAamva(aamva('636014', '09', [['DL', lines({ ...TX, DAQ: 'D1234567', DAJ: 'CA', DAI: 'SACRAMENTO', DAK: '958140000', DCF: 'ABC123' })]]))!;
    expect(r.state).toBe('CA');
    expect(r.audit).toBe('');
    expect(isTexas(r)).toBe(false);
    expect(fieldsForWebDealer(r)).toBeNull();
  });

  it('turns away an ID card subfile', () => {
    expect(parseAamva(aamva('636015', '08', [['ID', lines(TX)]]))).toBeNull();
  });

  it('turns away a malformed read', () => {
    expect(parseAamva('')).toBeNull();
    expect(parseAamva('https://example.com/not-a-licence-at-all')).toBeNull();
    expect(parseAamva('@\n\u001e\rANSI 6360150800010DL00410099')).toBeNull();
    expect(parseAamva(aamva('636015', '08', [['DL', lines({ ...TX, DAQ: '' })]]))).toBeNull();
    expect(parseAamva(aamva('636015', '08', [['DL', lines({ ...TX, DBB: '13451991' })]]))).toBeNull();
  });

  it('knows an expired licence by the day', () => {
    const r = parseAamva(aamva('636015', '08', [['DL', lines({ ...TX, DBA: '10122026' })]]))!;
    expect(isExpired(r, NOON(2026, 10, 12))).toBe(false);
    expect(isExpired(r, NOW)).toBe(true);
  });

  it('knows a minor until the eighteenth birthday', () => {
    const r = parseAamva(aamva('636015', '08', [['DL', lines({ ...TX, DBB: '10142008' })]]))!;
    expect(isAdult(r, NOW)).toBe(false);
    expect(isAdult(r, NOON(2026, 10, 14))).toBe(true);
    const leap = parseAamva(aamva('636015', '08', [['DL', lines({ ...TX, DBB: '02292008' })]]))!;
    expect(isAdult(leap, NOON(2026, 2, 28))).toBe(false);
    expect(isAdult(leap, NOON(2026, 3, 1))).toBe(true);
  });

  it('reads the older name elements and a missing audit number is typed', () => {
    const { DCS, DAC, DAD, DCF, ...rest } = TX;
    void DCS; void DAC; void DAD; void DCF;
    const v1 = parseAamva(aamva('636015', '01', [['DL', lines({ ...rest, DAA: 'EXAMPLE,MARISOL,ANA', DBB: '19910412', DBA: '20310412' })]]))!;
    expect(v1.name).toBe('Marisol Ana Example');
    expect(v1.dob).toBe('1991-04-12');
    expect(fieldsForWebDealer(v1)?.typed).toEqual(['ssnLast4', 'audit']);
    const v2 = parseAamva(aamva('636015', '02', [['DL', lines({ ...rest, DCS: 'EXAMPLE', DCT: 'MARISOL ANA' })]]))!;
    expect(v2.name).toBe('Marisol Ana Example');
  });
});
