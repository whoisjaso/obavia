import { describe, expect, it } from 'vitest';
import { FakeProvider } from './messaging/fake';
import { Messenger, Verifier, type ContactBook } from './service';
import { MemoryStore } from './store';
import { R2ContactBook, route, type App } from './worker';

const ORIGIN = 'https://app.obavia.co';
function app(): { a: App; p: FakeProvider; s: MemoryStore } {
  const p = new FakeProvider(), s = new MemoryStore();
  p.nextCode = '135790';
  s.lines.push({ dealerId: 'P171632', number: '+17135550100', displayName: 'Triple J Auto', helpPhone: '(713) 555-0100', timeZone: 'America/Chicago' });
  const book: ContactBook = { async get(l) { return l === 'P171632' ? { name: 'Triple J Auto Investment LLC', phone: '7134883602' } : null; } };
  const a = { messenger: new Messenger(p, s), verifier: new Verifier(p, s, book, { async send() {} }, 'x'.repeat(32)), internalToken: 'internal', allowedOrigins: [ORIGIN] };
  return { a, p, s };
}
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://api.obavia.co${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

describe('Desk API', () => {
  it('verifies a dealer end to end over HTTP', async () => {
    const { a } = app();
    const s = await route(post('/api/verify/start', { licence: 'p171632', channel: 'sms' }), a);
    expect(s.status).toBe(200);
    expect(s.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(await s.json()).toEqual({ ok: true, sentTo: '(•••) •••-3602' });
    const c = await route(post('/api/verify/check', { licence: 'P171632', channel: 'sms', code: '135790' }), a);
    expect(c.status).toBe(200);
    expect((await c.json()).token).toMatch(/^[\w-]+\.[\w-]+$/);
  });
  it('answers plainly for bad input, unknown licences and wrong codes', async () => {
    const { a } = app();
    expect((await route(post('/api/verify/start', { licence: 'DROP TABLE', channel: 'sms' }), a)).status).toBe(400);
    expect((await route(post('/api/verify/start', 'not json'), a)).status).toBe(400);
    expect((await route(post('/api/verify/start', { licence: 'P999999', channel: 'sms' }), a)).status).toBe(404);
    await route(post('/api/verify/start', { licence: 'P171632', channel: 'sms' }), a);
    expect((await route(post('/api/verify/check', { licence: 'P171632', channel: 'sms', code: '000000' }), a)).status).toBe(422);
  });
  it('gives no CORS grant to other sites', async () => {
    const { a } = app();
    const r = await route(post('/api/verify/start', { licence: 'P171632', channel: 'sms' }, { Origin: 'https://evil.example' }), a);
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
    const pre = await route(new Request('https://api.obavia.co/api/verify/start', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), a);
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-methods')).toContain('POST');
  });
  it('sends texts only with the internal token', async () => {
    const { a, p } = app();
    const msg = { dealerId: 'P171632', from: '+17135550100', to: '+17134883602', text: 'Your signing link: https://app.obavia.co/s/abc', kind: 'care' };
    expect((await route(post('/api/messages', msg), a)).status).toBe(401);
    expect((await route(post('/api/messages', msg, { Authorization: 'Bearer wrong!!' }), a)).status).toBe(401);
    const r = await route(post('/api/messages', msg, { Authorization: 'Bearer internal' }), a);
    expect(r.status).toBe(200);
    expect(p.sent).toHaveLength(1);
  });
  it('takes the webhook raw and answers 403 when unsigned', async () => {
    const { a, s } = app();
    const ev = JSON.stringify({ type: 'inbound', providerId: 'i', from: '+17134883602', to: '+17135550100', text: 'STOP', media: [], at: 'x' });
    expect((await route(post('/webhooks/telnyx', ev), a)).status).toBe(403);
    expect((await route(post('/webhooks/telnyx', ev, { 'x-fake-signature': 'ok' }), a)).status).toBe(200);
    expect(await s.isSuppressed('P171632', '+17134883602')).toBe(true);
  });
  it('refuses oversized bodies and unknown routes', async () => {
    const { a } = app();
    expect((await route(post('/api/verify/start', 'x'.repeat(70_000)), a)).status).toBe(413);
    expect((await route(post('/api/nope', {}), a)).status).toBe(404);
    expect((await route(new Request('https://api.obavia.co/health'), a)).status).toBe(200);
  });
});

describe('R2ContactBook', () => {
  it('reads contacts.json once and caches it', async () => {
    let reads = 0;
    const bucket = { async get() { reads++; return { async json<T>() { return { v: 1, asOf: '2026-09-30', contacts: { P171632: { name: 'Triple J', phone: '7134883602' } } } as T; } }; } };
    const b = new R2ContactBook(bucket, 'tx/contacts.json', () => 0);
    expect(await b.get('P171632')).toMatchObject({ phone: '7134883602' });
    expect(await b.get('P000000')).toBeNull();
    expect(reads).toBe(1);
  });
});

describe('PayNearMe webhook', () => {
  it('refuses unsigned callbacks and acknowledges signed ones after applying them', async () => {
    const { a, p } = app();
    const { MemoryNoteStore, PaymentDesk } = await import('./payments/desk');
    const { openLoan } = await import('../src/lib/loans');
    const { SIGNATURE_HEADER } = await import('./payments/paynearme');
    const notes = new MemoryNoteStore();
    notes.notes.set('note-1', openLoan({ id: 'note-1', buyer: { name: 'Maria Example', phone: '(832) 410-7788' }, vehicle: '2016 Honda Accord LX', principalCents: 600000, apr: 18, count: 52, frequency: 'weekly', firstDue: '2026-10-09', openedOn: '2026-10-02' }));
    a.payments = { desk: new PaymentDesk(notes, a.messenger, async () => ({ dealerId: 'P171632', name: 'Triple J Auto', textFrom: '+17135550100', alertTo: ['+17134883602'], timeZone: 'America/Chicago' })), secret: 'cb-secret' };
    const body = new URLSearchParams({ pnm_order_identifier: '800', site_customer_identifier: 'note-1', payment_amount: '126.28', payment_type: 'debit', status: 'payment' }).toString();
    expect((await route(post('/webhooks/paynearme', body), a)).status).toBe(403);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('cb-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))].map(b => b.toString(16).padStart(2, '0')).join('');
    const r = await route(post('/webhooks/paynearme', body, { [SIGNATURE_HEADER]: sig }), a);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ payment_confirmation_response: { version: '3.0', confirmation: { pnm_order_identifier: '800' } } });
    expect(p.sent.map(m => m.to)).toEqual(['+18324107788', '+17134883602']);
  });
});
