import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_DEALER } from './config';
import { requiredDocumentTypes } from './documents';
import { computeMoney, parseMoney } from './money';
import { applyPlanAnswer, isPlanComplete, isPlanQuestionAnswered, planQuestions, poaInstrument, type SalePlan } from './plan';
import { buildGuideSteps, nextOpenStep, type Sale } from './sale';
import { checkDigitOk, isValidVin, normaliseDecode } from './vin';

const fees = EXAMPLE_DEALER.fees;

describe('money (SOP test vectors)', () => {
  it('$4,000 out the door, cash', () => {
    const r = computeMoney({ money: { amount: '4000', priceBasis: 'outTheDoor' }, funding: 'cash', fees });
    expect([r.salePrice, r.tax, r.fees, r.total, r.balance]).toEqual([3388.24, 211.76, 400, 4000, 0]);
  });
  it('$3,500 vehicle only, cash, nothing else typed', () => {
    const r = computeMoney({ money: { amount: '3500', priceBasis: 'vehicleOnly' }, funding: 'cash', fees });
    expect([r.tax, r.total, r.paidToday, r.balance]).toEqual([218.75, 4118.75, 3500, 618.75]);
  });
  it('$4,000 vehicle only, cash', () => {
    const r = computeMoney({ money: { amount: '4000', priceBasis: 'vehicleOnly' }, funding: 'cash', fees });
    expect([r.tax, r.total]).toEqual([250, 4650]);
  });
  it('$10,000 vehicle only, $3,000 trade', () => {
    const r = computeMoney({ money: { amount: '10000', priceBasis: 'vehicleOnly' }, funding: 'cash', tradeIn: 3000, fees });
    expect([r.tax, r.total]).toEqual([437.5, 7837.5]);
  });
  it('any lender deal has no balance', () => {
    const r = computeMoney({ money: { amount: '9000', priceBasis: 'vehicleOnly', paidTodayAmount: '100' }, funding: 'lender', fees });
    expect(r.balance).toBe(0);
  });
  it('buy here pay here with no down payment: paid 0, note = total', () => {
    const r = computeMoney({ money: { amount: '6000', priceBasis: 'outTheDoor' }, funding: 'inHouse', fees });
    expect(r.paidToday).toBe(0); expect(r.balance).toBe(r.total);
  });
  it('an unanswered screen never creates a balance', () => {
    expect(computeMoney({ money: { amount: '3500' }, funding: 'cash', fees }).balance).toBe(0);
  });
  it('parses money boxes; empty is unanswered, 0 is an answer', () => {
    expect(parseMoney('$3,000.00')).toBe(3000); expect(parseMoney('$')).toBeNull();
    expect(parseMoney('')).toBeNull(); expect(parseMoney(' ')).toBeNull(); expect(parseMoney('0')).toBe(0);
  });
  it('clamps paid today to 0..total', () => {
    const base = { priceBasis: 'outTheDoor' as const, amount: '4000' };
    expect(computeMoney({ money: { ...base, paidTodayAmount: '9999' }, funding: 'cash', fees }).paidToday).toBe(4000);
    expect(computeMoney({ money: { ...base, paidTodayAmount: '-5' }, funding: 'cash', fees }).paidToday).toBe(0);
  });
});

describe('sale plan', () => {
  it('derives the chain on both branches', () => {
    expect(planQuestions({ registrationBy: 'dealer' })).toEqual(['registrationBy', 'titleSignedBy', 'inspectionBy', 'insuranceShown']);
    expect(planQuestions({ registrationBy: 'buyer' })).toEqual(['registrationBy', 'priceIncludesRegistration', 'inspectionBy', 'insuranceShown']);
  });
  it('false counts as an answer', () => {
    expect(isPlanQuestionAnswered({ insuranceShown: false }, 'insuranceShown')).toBe(true);
    expect(isPlanComplete({ registrationBy: 'buyer', priceIncludesRegistration: false, inspectionBy: 'done', insuranceShown: false })).toBe(true);
  });
  it('invalidates on switching registration', () => {
    let p: SalePlan = applyPlanAnswer({ registrationBy: 'dealer', titleSignedBy: 'buyer' }, 'registrationBy', 'buyer');
    expect(p.titleSignedBy).toBeNull();
    p = applyPlanAnswer({ ...p, priceIncludesRegistration: true }, 'registrationBy', 'dealer');
    expect(p.priceIncludesRegistration).toBeNull();
  });
  it('picks the POA instrument by vehicle age', () => {
    expect(poaInstrument(2026, 2007)).toBe('VTR-271-A');
    expect(poaInstrument(2026, 2006)).toBe('VTR-271');
    expect(poaInstrument(2026, null)).toBeNull();
  });
});

describe('documents', () => {
  const full: SalePlan = { registrationBy: 'dealer', titleSignedBy: 'buyer', inspectionBy: 'done', insuranceShown: true };
  it('cash, dealer files', () => expect(requiredDocumentTypes('cash', full, 'clean')).toEqual(['billOfSale', 'form130U']));
  it('buy here pay here adds financing, last', () => expect(requiredDocumentTypes('inHouse', full, 'clean')).toEqual(['billOfSale', 'form130U', 'financing']));
  it('a lender deal never owes the dealer financing contract', () => {
    for (const plan of [full, { ...full, registrationBy: 'buyer' as const }]) expect(requiredDocumentTypes('lender', plan, 'clean')).not.toContain('financing');
  });
  it('buyer files: no 130-U, vehicle responsibility instead', () => {
    expect(requiredDocumentTypes('cash', { ...full, registrationBy: 'buyer', titleSignedBy: null, priceIncludesRegistration: false }, 'clean')).toEqual(['billOfSale', 'vehicleResponsibility']);
  });
  it('we sign for them: power of attorney', () => expect(requiredDocumentTypes('cash', { ...full, titleSignedBy: 'dealer' }, 'clean')).toContain('powerOfAttorney'));
  it('no insurance shown: acknowledgment', () => expect(requiredDocumentTypes('cash', { ...full, insuranceShown: false }, 'clean')).toContain('insuranceAcknowledgment'));
  it('rebuilt: the disclosure comes first', () => expect(requiredDocumentTypes('cash', full, 'rebuilt_salvage')[0]).toBe('rebuiltDisclosure'));
  it('tow-away: the salvage sheets only', () => {
    expect(requiredDocumentTypes('cash', {}, 'salvage_unrebuilt', 'towAway')).toEqual(['salvageBillOfSale', 'towAwayAcknowledgment', 'buyerResponsibilityStatement']);
    expect(requiredDocumentTypes('inHouse', {}, 'salvage_unrebuilt', 'towAway')).toContain('financing');
  });
});

const sale = (over: Partial<Sale> = {}): Sale => ({
  id: 's', status: 'in_progress', language: 'en',
  vehicle: { id: 'v', stock: '1', vin: '', year: 2018, make: 'Toyota', model: 'Corolla', bodyStyle: 'Sedan', price: 8000, mileage: 90000, emptyWeight: 2860, color: '', titleStatus: 'clean' },
  buyer: { fullName: 'Jordan Buyer', phone: '', address: '', city: 'Houston', state: 'TX', zip: '', county: 'Harris', idType: 'dl', idNumber: '' },
  step: {}, documents: {}, createdAt: '', ...over,
});

describe('guide', () => {
  it('has no document step before the plan completes', () => {
    const keys = buildGuideSteps(sale({ step: { funding: { type: 'cash' } } })).map(s => s.key);
    expect(keys.some(k => k.startsWith('document:'))).toBe(false);
  });
  it('cash, dealer files: plate, title signer, then documents', () => {
    const s = sale({ step: { funding: { type: 'cash' }, money: { amount: '8000', priceBasis: 'outTheDoor' }, salePlan: { registrationBy: 'dealer', titleSignedBy: 'buyer', inspectionBy: 'done', insuranceShown: true } } });
    const keys = buildGuideSteps(s).map(x => x.key);
    expect(keys).toEqual(['buyer', 'buyerId', 'funding', 'paid', 'price', 'plan:registration', 'plate', 'plan:title-signer', 'plan:inspection', 'plan:insurance', 'document:billOfSale', 'document:form130U', 'title', 'packet']);
    expect(nextOpenStep(s)?.key).toBe('buyerId');
  });
  it('bank sale asks the lender', () => {
    expect(buildGuideSteps(sale({ step: { funding: { type: 'lender' } } })).map(x => x.key)).toContain('lender');
  });
  it('tow-away has no plan and no title step', () => {
    const s = sale({ vehicle: { ...sale().vehicle, titleStatus: 'salvage_unrebuilt' }, step: { salvagePlan: { path: 'towAway' }, funding: { type: 'cash' } } });
    const keys = buildGuideSteps(s).map(x => x.key);
    expect(keys.filter(k => k.startsWith('plan:') && k !== 'plan:salvage')).toEqual([]);
    expect(keys).not.toContain('title');
    expect(keys).toContain('document:towAwayAcknowledgment');
  });
  it('rebuild path holds documents behind the title work', () => {
    const s = sale({ vehicle: { ...sale().vehicle, titleStatus: 'salvage_unrebuilt' }, step: { salvagePlan: { path: 'rebuild' }, funding: { type: 'cash' }, salePlan: { registrationBy: 'dealer', titleSignedBy: 'buyer', inspectionBy: 'done', insuranceShown: true } } });
    const keys = buildGuideSteps(s).map(x => x.key);
    expect(keys).toContain('titleWork'); expect(keys.some(k => k.startsWith('document:'))).toBe(false);
  });
});

describe('vin', () => {
  it('validates and checks the check digit', () => {
    expect(isValidVin('1HGCM82633A004352')).toBe(true);
    expect(checkDigitOk('1HGCM82633A004352')).toBe(true);
    expect(checkDigitOk('1HGCM82643A004352')).toBe(false);
    expect(isValidVin('1HGCM82633A00435O')).toBe(false);
    expect(isValidVin('1HGCM8263')).toBe(false);
  });
  it('normalises a decode', () => {
    const d = normaliseDecode({ Make: 'GMC', Model: 'Sierra', Trim: 'SLE', ModelYear: '2016', BodyClass: 'Pickup', DriveType: '4WD/4-Wheel Drive/4x4', EngineCylinders: '8', DisplacementL: '5.3', CurbWeightLB: 'Not Applicable' });
    expect(d).toMatchObject({ make: 'GMC', model: 'Sierra SLE', year: 2016, bodyStyle: 'Truck', drivetrain: '4WD', engine: '5.3L V8', curbWeight: null });
  });
});

describe('guards', () => {
  it('dealer fee figures are typed only in the config', () => {
    const files: string[] = [];
    const walk = (d: string) => readdirSync(d).forEach(f => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); });
    walk(join(__dirname, '..'));
    const offenders = files.filter(f => /\.(ts|tsx)$/.test(f) && !/config\.ts$|\.test\.ts$/.test(f) && /\b(0\.0625|292)\b/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
