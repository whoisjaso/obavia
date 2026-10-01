import { describe, expect, it } from 'vitest';
import { OPT_OUT_FOOTER, gate, inMarketingHours, keyword, plainText, segments, toE164 } from './core';

const CT = 'America/Chicago';
// 2026-10-03 is a Saturday, 2026-10-04 a Sunday. Times below are UTC; Chicago is UTC-5 in October.
const at = (iso: string) => new Date(iso);

describe('phone numbers', () => {
  it('normalises US numbers to E.164 and rejects impossible ones', () => {
    expect(toE164('(713) 555-0101')).toBe('+17135550101');
    expect(toE164('(713) 488-3602')).toBe('+17134883602');
    expect(toE164('1-713-488-3602')).toBe('+17134883602');
    expect(toE164('+1 713 488 3602')).toBe('+17134883602');
    expect(toE164('113-488-3602')).toBe(null);              // area code can't start with 1
    expect(toE164('713-088-3602')).toBe(null);              // exchange can't start with 0
    expect(toE164('488-3602')).toBe(null);
  });
});

describe('segments', () => {
  it('counts GSM-7 at 160 then 153 per part', () => {
    expect(segments('a'.repeat(160))).toMatchObject({ parts: 1, encoding: 'GSM-7' });
    expect(segments('a'.repeat(161)).parts).toBe(2);
    expect(segments('a'.repeat(306)).parts).toBe(2);
    expect(segments('a'.repeat(307)).parts).toBe(3);
  });
  it('counts extension characters as two', () => {
    expect(segments('€'.repeat(80))).toMatchObject({ units: 160, parts: 1 });
    expect(segments('€'.repeat(81)).parts).toBe(2);
  });
  it('drops to 70 per part for anything outside GSM, like an emoji or a curly quote', () => {
    expect(segments('Hi 🙂')).toMatchObject({ encoding: 'UCS-2' });
    expect(segments('’'.repeat(70)).parts).toBe(1);
    expect(segments('’'.repeat(71)).parts).toBe(2);
  });
  it('plainText swaps the characters that would force the expensive encoding', () => {
    expect(segments(plainText('Your car’s ready — “come by”…')).encoding).toBe('GSM-7');
  });
});

describe('keywords', () => {
  it('only a message that is the keyword counts', () => {
    expect(keyword('STOP')).toBe('stop');
    expect(keyword(' stop. ')).toBe('stop');
    expect(keyword('Unsubscribe')).toBe('stop');
    expect(keyword("please don't stop")).toBe(null);
    expect(keyword('help')).toBe('help');
    expect(keyword('START')).toBe('start');
    expect(keyword('Is the Tahoe still there?')).toBe(null);
  });
});

describe('Texas marketing hours', () => {
  it('9 am to 9 pm Monday to Saturday', () => {
    expect(inMarketingHours(at('2026-10-03T13:59:00Z'), CT)).toBe(false); // Sat 8:59 am
    expect(inMarketingHours(at('2026-10-03T14:00:00Z'), CT)).toBe(true);  // Sat 9:00 am
    expect(inMarketingHours(at('2026-10-04T01:59:00Z'), CT)).toBe(true);  // Sat 8:59 pm
    expect(inMarketingHours(at('2026-10-04T02:00:00Z'), CT)).toBe(false); // Sat 9:00 pm
  });
  it('noon to 9 pm on Sunday', () => {
    expect(inMarketingHours(at('2026-10-04T15:00:00Z'), CT)).toBe(false); // Sun 10 am
    expect(inMarketingHours(at('2026-10-04T17:00:00Z'), CT)).toBe(true);  // Sun noon
  });
});

describe('the gate', () => {
  const ok = { suppressed: false, marketingConsent: true, now: at('2026-10-03T17:00:00Z'), recipientTimeZone: CT };
  const to = '+17134883602';
  it('lets a receipt through and leaves its words alone', () => {
    expect(gate('care', to, 'Your signed bill of sale: https://x.example/s/1', ok)).toEqual({ ok: true, text: 'Your signed bill of sale: https://x.example/s/1' });
  });
  it('a STOP ends everything, receipts included', () => {
    expect(gate('care', to, 'Receipt', { ...ok, suppressed: true })).toEqual({ ok: false, reason: 'suppressed' });
    expect(gate('otp', to, 'Code 123456', { ...ok, suppressed: true })).toEqual({ ok: false, reason: 'suppressed' });
  });
  it('marketing needs consent and the hours, and always carries the opt-out', () => {
    expect(gate('marketing', to, 'The Tahoe is $2k off this week', { ...ok, marketingConsent: false })).toEqual({ ok: false, reason: 'no_consent' });
    expect(gate('marketing', to, 'Offer', { ...ok, now: at('2026-10-04T15:00:00Z') })).toEqual({ ok: false, reason: 'quiet_hours' });
    const r = gate('marketing', to, 'The Tahoe is $2k off this week.', ok);
    expect(r).toEqual({ ok: true, text: `The Tahoe is $2k off this week. ${OPT_OUT_FOOTER}` });
  });
  it('codes and receipts ignore quiet hours', () => {
    expect(gate('otp', to, 'Your Obavia code is 123456', { ...ok, now: at('2026-10-04T08:00:00Z') }).ok).toBe(true);
  });
  it('refuses bad numbers, empty and runaway messages', () => {
    expect(gate('care', '555-1234', 'hi', ok)).toEqual({ ok: false, reason: 'bad_number' });
    expect(gate('care', to, '   ', ok)).toEqual({ ok: false, reason: 'empty' });
    expect(gate('care', to, 'a'.repeat(153 * 10 + 1), ok)).toEqual({ ok: false, reason: 'too_long' });
  });
});
