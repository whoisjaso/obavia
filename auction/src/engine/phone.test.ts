/* Sign-in by phone, the app's half: the number as typed, the Worker's rule for it, and the two calls. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatUS, usDigits, validUS } from './phone';
import { RemoteAuctionServer } from './client';
import { usE164 } from '../../worker/src/phone';

const BASE = 'https://w.example';
type Call = { url: string; init: RequestInit };
function fake(status: number, body: unknown, headers: Record<string, string> = {}) {
  const calls: Call[] = [];
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers });
  }) as typeof fetch;
  return calls;
}
afterEach(() => { vi.restoreAllMocks(); });

describe('the number', () => {
  it('keeps ten digits, drops a leading 1, and reads as a US number while it fills', () => {
    expect(usDigits('+1 (214) 555-0142')).toBe('2145550142');
    expect(usDigits('214555014299')).toBe('2145550142');
    expect(['', '2', '214', '2145', '214555', '2145550', '2145550142'].map(d => formatUS(d)))
      .toEqual(['', '(2', '(214', '(214) 5', '(214) 555', '(214) 555-0', '(214) 555-0142']);
    expect(usDigits(formatUS('2145550142'))).toBe('2145550142');   // the field's own text types back to the same digits
    expect(formatUS('2145550142', ' ')).toBe('(214) 555 0142');
    expect(usDigits(formatUS('2145550142', ' '))).toBe('2145550142');   // the field's own text types back to the same digits
  });
  it('is valid exactly when the Worker takes it as E.164', () => {
    for (const d of ['2145550142', '7135550100', '1145550142', '2141550142', '0145550142', '214555014', '9999999999'])
      expect(validUS(d)).toBe(usE164(`+1${d}`) !== null);
  });
});

describe('the calls', () => {
  it('sends the number in E.164 with the token, and keeps only the masked number', async () => {
    const calls = fake(200, { sent: true, phone: '(•••) •••-0142', retryIn: 30 });
    expect(await RemoteAuctionServer.sendPhone(BASE, 'b_x.sig', '+12145550142')).toEqual({ ok: true, phone: '(•••) •••-0142' });
    expect(calls[0].url).toBe(`${BASE}/me/phone`);
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer b_x.sig');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ phone: '+12145550142' });
  });
  it('a refusal comes back as its code and its Retry-After', async () => {
    fake(429, { error: 'rate_limited' }, { 'retry-after': '24' });
    expect(await RemoteAuctionServer.sendPhone(BASE, 't', '+12145550142')).toEqual({ ok: false, code: 'rate_limited', retryAfter: 24 });
    fake(422, { error: 'wrong_code' });
    expect(await RemoteAuctionServer.verifyPhone(BASE, 't', '111111')).toEqual({ ok: false, code: 'wrong_code' });
    globalThis.fetch = vi.fn(async () => { throw new Error('offline'); }) as typeof fetch;
    expect(await RemoteAuctionServer.verifyPhone(BASE, 't', '111111')).toEqual({ ok: false, code: 'network' });
  });
  it('verify is proof only when the Worker says verified: a fake proof on a deployed Worker is not', async () => {
    const calls = fake(200, { verified: true, phone: '(•••) •••-0142' });
    expect(await RemoteAuctionServer.verifyPhone(BASE, 't', '000000')).toEqual({ ok: true, phone: '(•••) •••-0142' });
    expect(calls[0].url).toBe(`${BASE}/me/phone/verify`);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ code: '000000' });
    fake(200, { verified: false, phone: '(•••) •••-0142' });
    expect(await RemoteAuctionServer.verifyPhone(BASE, 't', '000000')).toEqual({ ok: false, code: 'not_verified' });
  });
});
