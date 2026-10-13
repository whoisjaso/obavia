import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { EXAMPLE_DEALER } from './config';
import { exampleSales } from '../data';
import { freeze } from './filed';
import { buyersGuidePdf, filed130U, form14312Pdf, laneRemittancePdf, officialPdf, OFFICIAL_LANE } from './official';
import { FORM_14_312_FIELDS, FORM_14_312_REVISION } from './documents/form-14-312';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { agreementFromSale } from './fill-130u/from-sale';
import type { Sale } from './sale';

const out = process.env.FORMS_OUT;   // set to write the filled PDFs for a visual check
const sale = (step: Sale['step'] = {}, over: Partial<Sale> = {}): Sale => {
  const s = exampleSales()[0];
  return { ...s, ...over, step: { ...s.step, ...step }, buyer: { ...s.buyer, fullName: 'maria elena example', address: '12 EXAMPLE ROAD', city: 'katy', county: 'Harris', zip: '77449', idType: 'dl', idNumber: '12345678', idIssuer: 'TX' } };
};
const fields = async (bytes: Uint8Array) => {
  const f = (await PDFDocument.load(bytes)).getForm();
  return Object.fromEntries(f.getFields().map(x => [x.getName(), 'getText' in x ? (x as { getText(): string | undefined }).getText() ?? '' : 'isChecked' in x ? (x as { isChecked(): boolean }).isChecked() : null]));   // null: a button (the 14-312's print and clear)
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
    expect(f['Sales Price Minus Rebate Amount']).toBe('3378.82');   // $4,000 out the door less $410 of fees (the $10 plate included, decisions §9 D6), less 6.25%
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

const sha = async (b: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b.slice())), x => x.toString(16).padStart(2, '0')).join('');
async function words(pdf: Uint8Array, page = 0): Promise<string> {
  const doc = await getDocument({ data: pdf.slice(), verbosity: 0 }).promise;
  return (await (await doc.getPage(page + 1)).getTextContent()).items.flatMap(i => 'str' in i ? [i.str] : []).join(' ');
}

describe('the filed 130-U is the same bytes on every print, so its Filed mark can name it', () => {
  it('two renders of one filed 130-U hash the same; filed130U carries that hash, the business date and the agent; a draft has no mark', async () => {
    const s = sale({ funding: { type: 'cash' }, money: { amount: '4000', priceBasis: 'outTheDoor' }, paperwork: { form130U: { applyingFor: 'both', buyerKind: 'person', emptyWeight: '3200' } } });
    const filed: Sale = { ...s, documents: { form130U: { state: 'filed', frozen: freeze(s, EXAMPLE_DEALER, new Date('2026-10-01T17:00:00Z'), 'Jordan Rivera') } } };
    const a = await officialPdf('form130U', filed, EXAMPLE_DEALER), b = await officialPdf('form130U', filed, EXAMPLE_DEALER);
    if (!('pdf' in a) || !('pdf' in b)) throw new Error('refused');
    expect(Buffer.from(a.pdf).equals(Buffer.from(b.pdf))).toBe(true);
    const f = await fields(a.pdf);
    expect(f['Seller  Name']).toBe('Example Motors LLC (Jordan Rivera)');   // the stable save touched no field
    const m = await filed130U(filed, EXAMPLE_DEALER);
    expect(m).not.toBeNull();
    expect(m!.mark).toEqual({ state: 'filed', form130U: { sha256: await sha(a.pdf), filedOn: '10/01/2026', agent: 'Jordan Rivera' } });
    expect(m!.mark.form130U.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await filed130U({ ...s, documents: {} }, EXAMPLE_DEALER)).toBeNull();
    expect(await filed130U({ ...s, documents: { form130U: { state: 'draft' } } }, EXAMPLE_DEALER)).toBeNull();
  });
});

describe('the lane\'s papers beyond the packet (W3-F)', () => {
  it('is registered beside the official forms, every 14-312 field with its source and its citation', () => {
    expect(OFFICIAL_LANE).toEqual({ form14312: 'Comptroller Form 14-312', remittance: 'Lender remittance' });
    expect(FORM_14_312_REVISION).toBe('Rev.12-12/4');
    for (const [k, f] of Object.entries(FORM_14_312_FIELDS)) {
      expect(f.field, k).toMatch(/^[A-Za-z]+$/); expect(f.from, k).not.toBe(''); expect(f.cite, k).toMatch(/§152\.092|§152\.063|the form/);
    }
    expect(Object.keys(FORM_14_312_FIELDS)).toHaveLength(13);
  });

  it('fills the Comptroller\'s 14-312 from an out-of-state sale into the form\'s own boxes, the signature left for ink', async () => {
    const s = sale(); s.buyer = { ...s.buyer, state: 'LA', idIssuer: 'LA', city: 'shreveport', zip: '71101', phone: '(318) 555-0142' };
    const r = await form14312Pdf(s, EXAMPLE_DEALER);
    if (!('pdf' in r)) throw new Error(r.refused);
    if (out) { mkdirSync(out, { recursive: true }); writeFileSync(`${out}/14-312.pdf`, r.pdf); }
    const f = await fields(r.pdf);
    expect(f.Purch).toBe('Maria Elena Example');
    expect(f.PurchSt).toBe('12 Example Road');
    expect(f.PurchCty).toBe('Shreveport, LA 71101');
    expect(f.PurchPh).toBe('(318) 555-0142');
    expect(f.VehId).toBe(s.vehicle.vin.toUpperCase());
    expect(f.VehMake).toBe(s.vehicle.make);
    expect(f.VehYear).toBe(String(s.vehicle.year));
    expect(f.RegSt).toBe('LA');
    expect(f.Seller).toBe(EXAMPLE_DEALER.legalName);
    expect(f.SellSt).toBe(EXAMPLE_DEALER.street);
    expect(f.SellCty).toBe(`${EXAMPLE_DEALER.city}, TX ${EXAMPLE_DEALER.zip}`);
    expect(f.SigTitl).toBe('');                                                 // a person has no office
    expect(f.SigDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    const w = await words(r.pdf);
    expect(w).toContain('Texas Motor Vehicle Sales Tax Exemption Certificate');  // the Comptroller's page, untouched
    expect(w).toContain('authorize the Comptroller to provide a copy of this certificate');   // §152.092(b)(4), the form's own sentence
    expect(w).not.toMatch(/fee/i);
  });

  it('refuses a Texas licence (webDEALER, D8) and a sale with no licence state', async () => {
    const tx = await form14312Pdf(sale(), EXAMPLE_DEALER);
    expect('refused' in tx && tx.refused).toMatch(/Texas licence takes no 14-312/);
    const s = sale(); s.buyer = { ...s.buyer, state: '', idIssuer: '' };
    const none = await form14312Pdf(s, EXAMPLE_DEALER);
    expect('refused' in none && none.refused).toMatch(/Which state/);
  });

  it('prints the lender remittance from the sale\'s payout rows, lender first, each figure with its row, owed rows without a date, no fee line', async () => {
    const pdf = await laneRemittancePdf({
      lotId: 'l1', dealer: EXAMPLE_DEALER, vehicle: { year: 2014, make: 'Nissan', model: 'Altima', vin: '1N4AL3AP0EC000001' },
      hammer: 5100, wonAt: Date.UTC(2026, 9, 12, 17), startedAt: Date.UTC(2026, 9, 14, 18), lender: { name: 'Example Floorplan LLC', payoff: 3800 },
      payouts: [
        { id: 'applied:l1', reason: 'applied', amountUsd: 250, state: 'sent', at: Date.UTC(2026, 9, 14, 18, 1), transferId: 'tr_1' },
        { id: 'net:l1', reason: 'applied_net', amountUsd: 1050, state: 'owed' },
        { id: 'lender:l1', reason: 'lender', amountUsd: 3800, state: 'owed' },
      ],
      invoice: { id: 'inv_1', kind: 'balance', state: 'paid', amountUsd: 4850 }, date: '10/14/2026',
    });
    if (out) writeFileSync(`${out}/remittance.pdf`, pdf);
    const w = await words(pdf);
    expect(w).toContain('Remittance'); expect(w).toContain('Example Floorplan LLC');
    expect(w.indexOf('Lender payoff')).toBeLessThan(w.indexOf('Dealer net'));
    expect(w.indexOf('Dealer net')).toBeLessThan(w.indexOf('Deposit applied to the price'));
    expect(w).toContain('$3,800'); expect(w).toContain('$1,050'); expect(w).toContain('$250'); expect(w).toContain('$4,850');
    expect(w).toContain('lender:l1'); expect(w).toContain('net:l1'); expect(w).toContain('applied:l1');
    expect(w).toContain('Owed, not sent'); expect(w).toContain('Sent 10/14/2026'); expect(w).toContain('tr_1');
    expect(w).toContain('no date for it is promised');
    expect(w).not.toMatch(/\bfee\b/i);
    expect(w).not.toMatch(/guarantee/i);
  });
});
