import { describe, expect, it } from 'vitest';
import { EXAMPLE_DEALER } from './config';
import type { DealerRecord } from './dealers';
import { E164, HOURS, HOURS_ORDER, defaultSettings, gdnFromKey, hoursChoice, isValid, laneReady, lotFields, oneLine, problems, recordFor, toE164, type DealerSettings } from './dealer-settings';

/* Wave 2-C: the dealer's lane settings and the key's GDN. The lot's `hours` is what the buyer's Pickup
   reads (auction/src/sale.ts pickupWhen): a list of windows, empty for "Call to set a time". */
const dealer = { ...EXAMPLE_DEALER, street: '1201 Main St', city: 'Pasadena', state: 'TX', zip: '77504', phone: '(713) 555-0142' };
const good: DealerSettings = { lane: true, hours: [...HOURS.weekdays.hours], address: '1201 Main St, Pasadena, TX 77504', afterHours: '+17135550142', whopAccount: null };
const rec = (licence: string, name = 'Triple J Interests, LLC'): DealerRecord => ({ licence, name, dba: '', city: 'Pasadena', county: 'Harris', zip: '77504', state: 'TX', franchise: false, types: ['MV'], hasPhone: true, emailHint: '', street: '' });

describe('hours', () => {
  it('has the three choices in order, the last one empty', () => {
    expect(HOURS_ORDER).toEqual(['weekdays', 'saturday', 'call']);
    expect(HOURS.call.hours).toEqual([]);
    expect(HOURS.saturday.hours).toContain('Sat 9 am-6 pm');
  });
  it('carries no en or em dash (pickupWhen folds them anyway; the source stays plain)', () => {
    for (const k of HOURS_ORDER) for (const h of [HOURS[k].label, ...HOURS[k].hours]) expect(h).not.toMatch(/[‒-―]/);
  });
  it('reads a stored list back as its choice, and a foreign list as none', () => {
    for (const k of HOURS_ORDER) expect(hoursChoice([...HOURS[k].hours])).toBe(k);
    expect(hoursChoice(['Sun 1 pm-3 pm'])).toBeNull();
  });
});

describe('defaults', () => {
  it('turn the lane on for a lane key and off without one', () => {
    expect(defaultSettings(dealer, true).lane).toBe(true);
    expect(defaultSettings(dealer, false).lane).toBe(false);
  });
  it('start from the lot and the Desk phone, weekdays 9 to 6, no Whop account', () => {
    const s = defaultSettings(dealer, true);
    expect(s.address).toBe('1201 Main St, Pasadena, TX 77504');
    expect(s.afterHours).toBe('+17135550142');
    expect(s.hours).toEqual(HOURS.weekdays.hours);
    expect(s.whopAccount).toBeNull();
  });
  it('leave out the parts of an address the record lacks', () => {
    expect(oneLine({ street: '', city: 'Pasadena', state: 'TX', zip: '77504' })).toBe('Pasadena, TX 77504');
    expect(oneLine({ street: '', city: '', state: '', zip: '' })).toBe('');
  });
  it('do not share the hours array with the constant', () => {
    const s = defaultSettings(dealer, true); s.hours.push('x');
    expect(HOURS.weekdays.hours).toHaveLength(1);
  });
});

describe('validation', () => {
  it('passes good settings', () => { expect(problems(good)).toEqual([]); expect(isValid(good)).toBe(true); });
  it('wants E.164 with a real area code and exchange', () => {
    expect(E164.test('+17135550142')).toBe(true);
    for (const bad of ['7135550142', '(713) 555-0142', '+1713555014', '+11135550142', '+17131550142', '+447135550142', ''])
      expect(problems({ ...good, afterHours: bad })).toEqual(['afterHours']);
    expect(toE164('1 (713) 555-0142')).toBe('+17135550142');
    expect(toE164('555')).toBe('');
  });
  it('wants a non-empty address', () => { expect(problems({ ...good, address: '   ' })).toEqual(['address']); });
  it('takes no hours (call to set a time) and refuses a blank window', () => {
    expect(problems({ ...good, hours: [] })).toEqual([]);
    expect(problems({ ...good, hours: ['Mon-Fri 9 am-6 pm', ' '] })).toEqual(['hours']);
  });
  it('the lane is ready only when on and valid', () => {
    expect(laneReady(good)).toBe(true);
    expect(laneReady({ ...good, lane: false })).toBe(false);
    expect(laneReady({ ...good, afterHours: '' })).toBe(false);
  });
});

describe('lotFields', () => {
  it('is what Go sends: hours as stored, the line printed as dealer.phone goes, the address trimmed', () => {
    expect(lotFields({ ...good, address: ' 1201 Main St, Pasadena, TX 77504 ' })).toEqual({ hours: ['Mon-Fri 9 am-6 pm'], afterHours: '(713) 555-0142', address: '1201 Main St, Pasadena, TX 77504' });
  });
  it('sends an empty list for call to set a time, which Pickup reads as the call line', () => {
    expect(lotFields({ ...good, hours: [] }).hours).toEqual([]);
  });
  it('hands back a copy, never the stored array', () => {
    const f = lotFields(good); f.hours.push('x');
    expect(good.hours).toHaveLength(1);
  });
});

describe('the key', () => {
  it('reads the GDN from a dealer key', () => {
    expect(gdnFromKey('d:P123456.Xk3vQ9mZpL2rT8wYb5nHc1dF7gJ4sA6eKuVoWiRtEx0')).toBe('P123456');
    expect(gdnFromKey(' d:p171743x.abc_DEF-1 ')).toBe('P171743X');
  });
  it('reads nothing from the admin key, a bare GDN, or no key', () => {
    for (const k of ['d:*.abc', 'P123456', 'd:P123456', 'd:P1 23.abc', '', null, undefined]) expect(gdnFromKey(k)).toBeNull();
  });
  it('finds that GDN in the TxDMV list, or nothing', () => {
    const idx = { list: [rec('P153084'), rec('P171743X', 'Triple J Trailer Sales LLC')] };
    expect(recordFor(idx, 'P153084')?.name).toBe('Triple J Interests, LLC');
    expect(recordFor(idx, 'P171743X')?.licence).toBe('P171743X');
    expect(recordFor(idx, 'P000001')).toBeNull();
    expect(recordFor(null, 'P153084')).toBeNull();
    expect(recordFor(idx, null)).toBeNull();
  });
});
