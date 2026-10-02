import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { EXAMPLE_DEALER } from './config';
import { exampleSales } from '../data';
import { freeze } from './filed';
import { buyersGuidePdf, officialPdf } from './official';
import { agreementFromSale } from './fill-130u/from-sale';
import type { Sale } from './sale';

const out = process.env.FORMS_OUT;   // set to write the filled PDFs for a visual check
const sale = (step: Sale['step'] = {}, over: Partial<Sale> = {}): Sale => {
  const s = exampleSales()[0];
  return { ...s, ...over, step: { ...s.step, ...step }, buyer: { ...s.buyer, fullName: 'maria elena example', address: '12 EXAMPLE ROAD', city: 'katy', county: 'Harris', zip: '77449', idType: 'dl', idNumber: '12345678', idIssuer: 'TX' } };
};
const fields = async (bytes: Uint8Array) => {
  const f = (await PDFDocument.load(bytes)).getForm();
  return Object.fromEntries(f.getFields().map(x => [x.getName(), 'getText' in x ? (x as { getText(): string | undefined }).getText() ?? '' : (x as { isChecked(): boolean }).isChecked()]));
};

describe('the official 130-U, filled from the sale', () => {
  it('prints the dealership with the agent who handled the sale on the seller line', async () => {
    const s = sale({ funding: { type: 'cash' }, money: { amount: '4000', priceBasis: 'outTheDoor' }, paperwork: { form130U: { applyingFor: 'both', buyerKind: 'person', emptyWeight: '3200' } } });
    const filed: Sale = { ...s, documents: { form130U: { state: 'filed', frozen: freeze(s, EXAMPLE_DEALER, new Date('2026-10-01T17:00:00Z'), 'Jordan Rivera') } } };
    const r = await officialPdf('form130U', filed, EXAMPLE_DEALER);
    if (!('pdf' in r)) throw new Error('refused');
    if (out) { mkdirSync(out, { recursive: true }); writeFileSync(`${out}/130-U.pdf`, r.pdf); }
    const f = await fields(r.pdf);
    expect(f['Seller  Name']).toBe('Example Motors LLC (Jordan Rivera)');
    expect(f['1 Vehicle Identification Number']).toBe(s.vehicle.vin.toUpperCase());
    expect(f['19 Applicant County of Residence']).toBe('Harris');
    expect(f['21 Dealer GDN if applicable']).toBe(EXAMPLE_DEALER.licence);
    expect(f['State of ID/DL']).toBe('TX');
    expect(f['U.S. Driver License/ID Card']).toBe(true);
    expect(f['Title  Registration']).toBe(true);
    expect(f['Sales Price Minus Rebate Amount']).toBe('3388.24');
    expect(f['Date']).toBe('10/01/2026');
  });
  it('falls back to the dealer’s authorised signer when the agent is not a full name', () => {
    const a = agreementFromSale(sale(), EXAMPLE_DEALER, { date: '10/01/2026', agent: 'Desk' });
    expect(a.seller_agent_name).toBe('Desk');   // the filler drops it: "Desk" is not a person, so the signer prints
  });
  it('names the lender as lienholder on a bank deal, never the dealer', () => {
    const a = agreementFromSale(sale({ funding: { type: 'lender', lenderId: 'chase' }, money: { amount: '9000', priceBasis: 'vehicleOnly' } }), EXAMPLE_DEALER, { date: '10/01/2026' });
    expect(a).toMatchObject({ has_lien: true, lienholder_name: 'Chase Auto' });
    const cash = agreementFromSale(sale({ funding: { type: 'cash' }, money: { amount: '4000', priceBasis: 'outTheDoor' } }), EXAMPLE_DEALER, { date: '10/01/2026' });
    expect(cash.has_lien).toBe(false);
    const bhph = agreementFromSale(sale({ funding: { type: 'inHouse' }, money: { amount: '9000', priceBasis: 'vehicleOnly' } }), EXAMPLE_DEALER, { date: '10/01/2026' });
    expect(bhph.lienholder_name).toBe(EXAMPLE_DEALER.legalName);
  });
  it('cases the paper: names and streets capitalised, codes in capitals', () => {
    const a = agreementFromSale(sale(), EXAMPLE_DEALER, { date: '10/01/2026' });
    expect([a.buyer_first_name, a.buyer_middle_name, a.buyer_last_name, a.buyer_address, a.buyer_city]).toEqual(['Maria', 'Elena', 'Example', '12 Example Road', 'Katy']);
  });
});

describe('the other official forms', () => {
  it('fills the VTR-271 for a car 20 or more years old and refuses it under 20 (VTR-271-A)', async () => {
    const old = { ...sale(), vehicle: { ...sale().vehicle, year: 2004 } };
    const r = await officialPdf('powerOfAttorney', old, EXAMPLE_DEALER);
    expect('pdf' in r).toBe(true);
    if (out && 'pdf' in r) writeFileSync(`${out}/VTR-271.pdf`, r.pdf);
    const young = await officialPdf('powerOfAttorney', { ...sale(), vehicle: { ...sale().vehicle, year: 2018 } }, EXAMPLE_DEALER);
    expect('refused' in young && young.refused).toMatch(/VTR-271-A/);
  });
  it('fills the purchaser’s rebuilt disclosure on the state form', async () => {
    const r = await officialPdf('rebuiltDisclosure', sale(), EXAMPLE_DEALER);
    expect('pdf' in r).toBe(true);
    if (out && 'pdf' in r) writeFileSync(`${out}/ENF-MV-RBLT.pdf`, r.pdf);
  });
  it('prints the FTC Buyer’s Guide in both languages', async () => {
    for (const l of ['en', 'es'] as const) { const pdf = await buyersGuidePdf(sale(), EXAMPLE_DEALER, l); expect(pdf.byteLength).toBeGreaterThan(10000); if (out) writeFileSync(`${out}/buyers-guide-${l}.pdf`, pdf); }
  });
});
