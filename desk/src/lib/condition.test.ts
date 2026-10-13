import { describe, expect, it } from 'vitest';
import { conditionFromSale, knownAtSale, photosOf, since, standingLine, type Condition } from './condition';
import { requiredDocumentTypes } from './documents';
import { paperworkQuestions } from './paperwork';
import type { Sale } from './sale';

const sale = (paper: Sale['step']['paperwork']): Sale => ({
  id: 's1', status: 'in_progress', language: 'en',
  vehicle: { mileage: 48210 } as Sale['vehicle'], buyer: {} as Sale['buyer'],
  step: { paperwork: paper }, documents: {}, createdAt: '2026-09-03',
});

describe('the condition report', () => {
  it('is in every sale right after the bill of sale, except a tow-away', () => {
    expect(requiredDocumentTypes('cash', { registrationBy: 'dealer', titleSignedBy: 'buyer', inspectionBy: 'done', insuranceShown: true }, 'clean')).toEqual(['billOfSale', 'conditionReport', 'form130U']);
    expect(requiredDocumentTypes('cash', {}, 'salvage_unrebuilt', 'towAway')).not.toContain('conditionReport');
  });
  it('asks which lights and what is broken only when there are some', () => {
    expect(paperworkQuestions('conditionReport', sale({})).map(q => q.key)).toEqual(['guide', 'drove', 'lights', 'known', 'photos']);
    expect(paperworkQuestions('conditionReport', sale({ conditionReport: { lights: 'yes', known: 'yes' } })).map(q => q.key)).toEqual(['guide', 'drove', 'lights', 'lightsWhich', 'known', 'knownWhat', 'photos']);
  });
  it('carries into the note as the record of the sale', () => {
    const c = conditionFromSale(sale({ billOfSale: { asIs: 'asIs' }, conditionReport: { guide: 'yes', drove: 'yes', lights: 'none', known: 'yes', knownWhat: 'AC blows warm', photos: '["data:image/jpeg;base64,AAA"]' } }), '2026-09-03')!;
    expect(c).toEqual({ signedOn: '2026-09-03', miles: 48210, asIs: true, warranty: undefined, guide: true, drove: true, lights: undefined, known: 'AC blows warm', photos: ['data:image/jpeg;base64,AAA'] });
    expect(conditionFromSale(sale({}), '2026-09-03')).toBeUndefined();
    expect(photosOf('not json')).toEqual([]);
  });
});

describe('after the sale', () => {
  const c: Condition = { signedOn: '2026-09-03', miles: 48210, asIs: true, guide: true, drove: true, known: 'AC blows warm', photos: [] };
  it('says how long and how far after the sale', () => {
    expect(since(c, { on: '2026-09-30', miles: 50350 })).toBe('27 days and 2,140 miles after the sale');
    expect(since(c, { on: '2026-09-04', miles: null })).toBe('1 day after the sale');
  });
  it('knows a complaint that was written down at the sale', () => {
    expect(knownAtSale(c, 'The AC is blowing warm air')).toBe(true);
    expect(knownAtSale(c, 'Transmission slipping')).toBe(false);
  });
  it('says plainly where the payments stand', () => {
    expect(standingLine(c)).toBe('Sold as-is. Payments are due whether or not it needs repairs.');
    expect(standingLine({ ...c, asIs: false, warranty: '30 days, powertrain' })).toContain('warranty (30 days, powertrain)');
  });
});
