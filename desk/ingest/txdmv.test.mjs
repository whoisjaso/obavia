import { describe, expect, it } from 'vitest';
import { buildContacts, buildIndex, delimitedRows, diffIndex, emailHint, findAsOf, findDownloadHref, guard, htmlTableRows, kindOf, normaliseAll, readRows, sniff, tidyCase } from './txdmv.lib.mjs';

const HEADER = ['County', 'LicenseNumber', 'LicenseStatus', 'LicenseExpDate', 'BusinessName', 'DBAName', 'AddressType', 'PhysicalAddress', 'PhysAddressTwo', 'City', 'State', 'Zip', 'MailingAddress', 'MailAddressTwo', 'MailingCity', 'MailingState', 'MailingZip', 'Phone', 'BusinessEmail', 'LicenseType', 'ActiveDate', 'DealerType', 'BondCompany'];
const row = (o) => HEADER.map(h => o[h] ?? '');
const ROWS = [
  HEADER,
  row({ County: 'Harris', LicenseNumber: 'P100001', LicenseStatus: 'Active', BusinessName: 'EXAMPLE AUTO SALES LLC', City: 'HOUSTON', Zip: '77002-1234', Phone: '(713) 555-0101', BusinessEmail: 'Office@Example.com', LicenseType: 'Motor Vehicle' }),
  row({ County: 'Harris', LicenseNumber: 'P100001', LicenseStatus: 'Active', BusinessName: 'EXAMPLE AUTO SALES LLC', DBAName: 'Example Autos', City: 'Houston', LicenseType: 'Motorcycle' }),
  row({ County: 'Gaines', LicenseNumber: 'P100002X', LicenseStatus: 'Active - Pending Renewal', BusinessName: 'Sample Trailer Sales LLC', City: 'Seminole', LicenseType: 'Utility Trailer/Semi-Trailer' }),
  row({ County: 'Dallas', LicenseNumber: 'P100003', LicenseStatus: 'Expired', BusinessName: 'Gone Motors', City: 'Dallas' }),
  row({ County: 'Dallas', LicenseNumber: 'not a licence', LicenseStatus: 'Active', BusinessName: 'Header Junk', City: 'Dallas' }),
];

describe('TxDMV list', () => {
  it('keeps active licences, merges repeated rows, drops expired and junk', () => {
    const d = normaliseAll(ROWS);
    expect(d.map(x => x.licence)).toEqual(['P100001', 'P100002X']);
    expect(d[0]).toMatchObject({ name: 'Example Auto Sales LLC', dba: 'Example Autos', city: 'Houston', zip: '77002', phone: '7135550101', email: 'office@example.com', types: ['MV', 'MC'] });
    expect(d[1].types).toEqual(['TR']);
  });

  it('never puts a full phone number or email in the public index', () => {
    const d = normaliseAll(ROWS), idx = JSON.stringify(buildIndex(d, '2026-09-30'));
    expect(idx).not.toContain('7135550101');
    expect(idx).not.toContain('office@example.com');
    expect(idx).toContain('0101');
    expect(buildContacts(d, '2026-09-30').contacts.P100001).toMatchObject({ phone: '7135550101', email: 'office@example.com' });
  });

  it('reads the same rows from an HTML table and from CSV', () => {
    const html = `<table>${ROWS.map(r => `<tr>${r.map(c => `<td>${c.replace('&', '&amp;')}</td>`).join('')}</tr>`).join('')}</table>`;
    const csv = ROWS.map(r => r.map(c => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\r\n');
    expect(htmlTableRows(html)).toEqual(ROWS.map(r => r.map(c => c.trim())));
    expect(delimitedRows(csv)).toEqual(ROWS.map(r => r.map(c => c.trim())));
    expect(sniff(Buffer.from(html))).toBe('html');
    expect(sniff(Buffer.from(csv))).toBe('delimited');
    expect(sniff(Buffer.from([0x50, 0x4b, 3, 4]))).toBe('xlsx');
    expect(sniff(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))).toBe('xls');
  });

  it('reads a real .xlsx through SheetJS', async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ROWS), 'Dealers');
    const { kind, rows } = await readRows(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    expect(kind).toBe('xlsx');
    expect(normaliseAll(rows).length).toBe(2);
  });

  it('refuses a download that looks broken', () => {
    expect(guard(500, 19000)).toMatch(/Only 500/);
    expect(guard(15000, 19666)).toMatch(/fell/);
    expect(guard(19500, 19666)).toBeNull();
    expect(guard(19666, undefined)).toBeNull();
  });

  it('diffs new and lapsed licences', () => {
    expect(diffIndex({ rows: [['A1'], ['B2']] }, { rows: [['B2'], ['C3']] })).toEqual({ added: ['C3'], removed: ['A1'] });
    expect(diffIndex(null, { rows: [['A1']] })).toEqual({ added: ['A1'], removed: [] });
  });

  it('finds the rotating download link and the as-of date on the list page', () => {
    const html = '<p>Data is current as of 09/30/2026 .</p><a href="https://texasdmv.my.salesforce-sites.com/dealers/servlet/servlet.FileDownload?retURL=%2Fdealers&amp;file=00Pcs00001zzxCVEAY"> Download</a>';
    expect(findDownloadHref(html)).toBe('https://texasdmv.my.salesforce-sites.com/dealers/servlet/servlet.FileDownload?retURL=%2Fdealers&file=00Pcs00001zzxCVEAY');
    expect(findAsOf(html)).toBe('2026-09-30');
  });

  it('tidies shouting names and keeps entity suffixes upper case', () => {
    expect(tidyCase('TRIPLE J AUTO INVESTMENT LLC')).toBe('Triple J Auto Investment LLC');
    expect(tidyCase('BMW OF THE WOODLANDS')).toBe('BMW of the Woodlands');
    expect(tidyCase('DLW Automotive, Inc')).toBe('DLW Automotive, Inc');
    expect(emailHint('office@example.com')).toBe('o•••••@example.com');
    expect(kindOf('Wholesale Motor Vehicle Auction License')).toBe('AU');
  });
});
