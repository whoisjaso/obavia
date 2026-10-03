/* The Handle A Sale SOP's rules that the audit against the premium-dealer-build skill added. */
import { describe, expect, it } from 'vitest';
import { EXAMPLE_DEALER, missingFacts } from './config';
import { asFiled, financingTerms, freeze, lenderName } from './filed';
import { paperworkQuestions } from './paperwork';
import { ceilingFor, impliedRate, solveTerms } from './terms';
import { TX_COUNTY, exampleSales } from '../data';
import type { Sale } from './sale';

const sale = (step: Sale['step'] = {}): Sale => ({ ...exampleSales()[0], step: { ...exampleSales()[0].step, ...step } });

describe('financing terms: solved from what was agreed, held to the ceiling', () => {
  it('never holds below 18%, and uses the ceiling the owner confirms', () => {
    expect([ceilingFor(null), ceilingFor(10), ceilingFor(26.5)]).toEqual([18, 18, 26.5]);
  });
  it('agreed on the number of payments: solves the payment', () => {
    const t = solveTerms({ principal: 6000, perYear: 12, agreed: 'count', count: 36, rate: 18 });
    expect(t).toMatchObject({ rate: 18, count: 36, payment: 216.91, held: false });
  });
  it('agreed on the payment: solves how many', () => {
    expect(solveTerms({ principal: 6000, perYear: 12, agreed: 'payment', payment: 216.91, rate: 18 }).count).toBe(36);
  });
  it('agreed on both: an implied rate over the ceiling comes down, and the payment is recomputed', () => {
    expect(impliedRate(6000, 216.91, 36, 12)).toBeCloseTo(18, 1);
    const t = solveTerms({ principal: 6000, perYear: 12, agreed: 'both', payment: 260, count: 36 });
    expect(t).toMatchObject({ rate: 18, payment: 216.91, held: true });
    expect(solveTerms({ principal: 6000, perYear: 12, agreed: 'both', payment: 260, count: 36, ceiling: 32 })).toMatchObject({ held: false });
  });
  it('a rate typed above the ceiling is held to it', () => {
    expect(solveTerms({ principal: 6000, perYear: 12, agreed: 'count', count: 36, rate: 29 })).toMatchObject({ rate: 18, held: true });
  });
  it('the contract and the note read the same terms from the sale', () => {
    const s = sale({ funding: { type: 'inHouse' }, money: { amount: '8000', priceBasis: 'outTheDoor' }, paperwork: { financing: { down: '1000', frequency: 'weekly', agreed: 'count', count: '104', rate: '21', firstDue: '2026-10-09' } } });
    expect(financingTerms(s, EXAMPLE_DEALER)).toMatchObject({ principal: 7000, count: 104, rate: 18, held: true, perYear: 52 });
  });
  it('asks the payment, the count and the rate only as the agreement needs them', () => {
    const keys = (agreed?: string) => paperworkQuestions('financing', sale({ paperwork: { financing: agreed ? { agreed } : {} } })).map(q => q.key);
    expect(keys()).toEqual(['down', 'frequency', 'agreed', 'firstDue']);
    expect(keys('payment')).toEqual(['down', 'frequency', 'agreed', 'payment', 'rate', 'firstDue']);
    expect(keys('count')).toEqual(['down', 'frequency', 'agreed', 'count', 'rate', 'firstDue']);
    expect(keys('both')).toEqual(['down', 'frequency', 'agreed', 'payment', 'count', 'firstDue']);
  });
});

describe('what prints is what was filed', () => {
  it('reads the frozen copy and its business date once filed, the live record while a draft', () => {
    const s = sale(), at = new Date('2026-10-02T01:30:00Z');   // 8:30 pm in Houston on Oct 1
    const filed: Sale = { ...s, documents: { billOfSale: { state: 'filed', frozen: freeze(s, EXAMPLE_DEALER, at) } } };
    const later: Sale = { ...filed, buyer: { ...filed.buyer, fullName: 'Someone Else' } };
    expect(asFiled('billOfSale', later, EXAMPLE_DEALER)).toMatchObject({ filed: true, date: '10/01/2026' });
    expect(asFiled('billOfSale', later, EXAMPLE_DEALER).sale.buyer.fullName).toBe(s.buyer.fullName);
    expect(asFiled('form130U', later, EXAMPLE_DEALER).sale.buyer.fullName).toBe('Someone Else');
  });
});

describe('facts on the paper', () => {
  it('names the lender, never its directory id', () => {
    expect(lenderName({ type: 'lender', lenderId: 'chase' })).toBe('Chase Auto');
    expect(lenderName({ type: 'lender', lenderId: 'chase', lenderOther: 'First Local Bank' })).toBe('First Local Bank');
    expect(lenderName({ type: 'cash' })).toBeNull();
  });
  it('lists every missing legal fact so filing can be refused', () => {
    expect(missingFacts(EXAMPLE_DEALER)).toEqual([]);
    expect(missingFacts({ ...EXAMPLE_DEALER, licence: '', signer: { name: '', title: '' } })).toEqual(['Dealer licence (GDN)', 'Authorised signer']);
  });
  it('asks which state issued the licence on the 130-U', () => {
    expect(paperworkQuestions('form130U', sale()).map(q => q.key)[0]).toBe('idState');
  });
  it('derives a county only from an unambiguous city', () => {
    expect(TX_COUNTY['missouri city']).toBe('Fort Bend');
    expect(TX_COUNTY.katy).toBeUndefined();
  });
});
