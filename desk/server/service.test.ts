import { describe, expect, it } from 'vitest';
import { FakeProvider } from './messaging/fake';
import { MemoryStore } from './store';
import { Messenger, Verifier, issueToken, readToken, type Contact, type ContactBook, type EmailSender } from './service';

const LINE = { dealerId: 'P171632', number: '+17135550100', displayName: 'Triple J Auto', helpPhone: '(713) 555-0100', timeZone: 'America/Chicago' };
const BUYER = '+17134883602';
// Wednesday 1 Oct 2026, 15:00 UTC = 10:00 in Houston: inside marketing hours.
const NOON = () => new Date('2026-10-01T15:00:00Z');

function setup(clock = NOON) {
  const p = new FakeProvider(), s = new MemoryStore();
  s.lines.push(LINE);
  return { p, s, m: new Messenger(p, s, clock) };
}
const inbound = (text: string, from = BUYER) => JSON.stringify({ type: 'inbound', providerId: `in-${text}`, from, to: LINE.number, text, media: [], at: '2026-10-01T15:00:00Z' });
const signed = new Headers({ 'x-fake-signature': 'ok' });

describe('Messenger.send', () => {
  it('sends a care text and logs it', async () => {
    const { p, s, m } = setup();
    const r = await m.send({ dealerId: LINE.dealerId, from: LINE.number, to: '(713) 488-3602', text: 'Your bill of sale is ready to sign.', kind: 'care' });
    expect(r).toMatchObject({ ok: true, parts: 1 });
    expect(p.sent[0].to).toBe(BUYER);
    expect(s.messages[0]).toMatchObject({ direction: 'out', kind: 'care', status: 'queued', to: BUYER });
  });
  it('refuses marketing without consent and sends nothing', async () => {
    const { p, s, m } = setup();
    expect(await m.send({ dealerId: LINE.dealerId, from: LINE.number, to: BUYER, text: 'New Tahoe in.', kind: 'marketing' })).toEqual({ ok: false, reason: 'no_consent' });
    expect(p.sent).toHaveLength(0);
    expect(s.messages).toHaveLength(0);
  });
  it('adds the opt-out line to marketing once consent is on record', async () => {
    const { p, s, m } = setup();
    await s.recordConsent({ dealerId: LINE.dealerId, phone: BUYER, kind: 'marketing', wording: 'w', method: 'desk-signature', at: 'x' });
    expect((await m.send({ dealerId: LINE.dealerId, from: LINE.number, to: BUYER, text: 'New Tahoe in.', kind: 'marketing' })).ok).toBe(true);
    expect(p.sent[0].text).toMatch(/Reply STOP to opt out\.$/);
  });
  it('holds marketing outside Texas hours', async () => {
    const { s, m } = setup(() => new Date('2026-10-02T03:00:00Z')); // 22:00 Houston
    await s.recordConsent({ dealerId: LINE.dealerId, phone: BUYER, kind: 'marketing', wording: 'w', method: 'desk-signature', at: 'x' });
    expect(await m.send({ dealerId: LINE.dealerId, from: LINE.number, to: BUYER, text: 'Offer', kind: 'marketing' })).toEqual({ ok: false, reason: 'quiet_hours' });
  });
  it('rejects a number that is not a number', async () => {
    const { m } = setup();
    expect(await m.send({ dealerId: LINE.dealerId, from: LINE.number, to: '555', text: 'hi', kind: 'care' })).toEqual({ ok: false, reason: 'bad_number' });
  });
});

describe('Messenger.webhook', () => {
  it('answers 403 to an unsigned webhook and does nothing', async () => {
    const { p, s, m } = setup();
    expect(await m.webhook(inbound('STOP'), new Headers())).toBe(403);
    expect(s.suppressed.size).toBe(0);
    expect(p.sent).toHaveLength(0);
  });
  it('STOP suppresses, confirms once, and blocks every later text', async () => {
    const { p, s, m } = setup();
    expect(await m.webhook(inbound('Stop'), signed)).toBe(200);
    expect(await s.isSuppressed(LINE.dealerId, BUYER)).toBe(true);
    expect(p.sent).toHaveLength(1);
    expect(p.sent[0].text).toMatch(/Triple J Auto/);
    expect(s.messages.map(x => x.kind)).toEqual(['inbound', 'keyword-reply']);
    expect(await m.send({ dealerId: LINE.dealerId, from: LINE.number, to: BUYER, text: 'Your title is in.', kind: 'care' })).toEqual({ ok: false, reason: 'suppressed' });
    expect(p.sent).toHaveLength(1);
  });
  it('START lifts the block; HELP answers with the dealer phone', async () => {
    const { p, s, m } = setup();
    await m.webhook(inbound('STOP'), signed);
    await m.webhook(inbound('start'), signed);
    expect(await s.isSuppressed(LINE.dealerId, BUYER)).toBe(false);
    await m.webhook(inbound('HELP'), signed);
    expect(p.sent.at(-1)!.text).toContain(LINE.helpPhone);
  });
  it('logs a real reply without answering it, and ignores numbers that are not ours', async () => {
    const { p, s, m } = setup();
    await m.webhook(inbound('Is the Tahoe still there?'), signed);
    expect(p.sent).toHaveLength(0);
    expect(s.messages[0]).toMatchObject({ direction: 'in', text: 'Is the Tahoe still there?' });
    await m.webhook(JSON.stringify({ type: 'inbound', providerId: 'x', from: BUYER, to: '+19995550000', text: 'STOP', media: [], at: 'x' }), signed);
    expect(s.suppressed.size).toBe(0);
  });
  it('records delivery results against the sent message', async () => {
    const { s, m } = setup();
    const r = await m.send({ dealerId: LINE.dealerId, from: LINE.number, to: BUYER, text: 'Signed copy attached.', kind: 'care' });
    if (!r.ok) throw new Error(r.reason);
    await m.webhook(JSON.stringify({ type: 'status', providerId: r.providerId, to: BUYER, status: 'failed', error: 'Unreachable', at: 'x' }), signed);
    expect(s.messages[0]).toMatchObject({ status: 'failed', error: 'Unreachable' });
  });
  it('acknowledges events it does not use', async () => {
    const { m } = setup();
    expect(await m.webhook('not json', signed)).toBe(200);
  });
});

describe('Verifier', () => {
  const book: ContactBook = { async get(l) { return l === 'P171632' ? { name: 'Example Motors LLC', phone: '713-488-3602', email: 'Office@Example.com', street: '100 Example St', city: 'Houston', zip: '77002' } as Contact : l === 'P000001' ? { name: 'No Contact LLC' } : null; } };
  function make(clock = NOON) {
    const p = new FakeProvider(), s = new MemoryStore(), mail: { to: string; subject: string; text: string }[] = [];
    const email: EmailSender = { async send(to, subject, text) { mail.push({ to, subject, text }); } };
    let now = clock();
    const v = new Verifier(p, s, book, email, 'test-secret', () => now);
    return { p, s, v, mail, tick: (ms: number) => { now = new Date(now.getTime() + ms); } };
  }

  it('texts a code to the phone on the licence and accepts it once', async () => {
    const { p, v } = make();
    p.nextCode = '424242';
    expect(await v.start('p171632', 'sms')).toEqual({ ok: true, sentTo: '(•••) •••-3602' });
    expect(await v.check('P171632', 'sms', '111111')).toEqual({ ok: false, reason: 'rejected' });
    const r = await v.check('P171632', 'sms', '424 242');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(await readToken('test-secret', r.token, NOON())).toMatchObject({ licence: 'P171632', via: 'sms' });
      expect(r.profile).toEqual({ phone: '(713) 488-3602', email: 'Office@Example.com', street: '100 Example St', city: 'Houston', zip: '77002' });
    }
  });

  it('emails a code that works for ten minutes, then expires', async () => {
    const { v, mail, tick } = make();
    const r = await v.start('P171632', 'email');
    expect(r).toEqual({ ok: true, sentTo: 'o•••••@example.com' });
    expect(mail[0].to).toBe('office@example.com');
    const code = mail[0].subject.match(/\d{6}/)![0];
    expect((await v.check('P171632', 'email', '000000')).ok).toBe(code === '000000');
    expect((await v.check('P171632', 'email', code)).ok).toBe(true);
    tick(25 * 60 * 1000);
    expect(await v.check('P171632', 'email', code)).toEqual({ ok: false, reason: 'rejected' });
  });

  it('says plainly when the licence is unknown or has no contact', async () => {
    const { v } = make();
    expect(await v.start('P999999', 'sms')).toEqual({ ok: false, reason: 'unknown_licence' });
    expect(await v.start('P000001', 'email')).toEqual({ ok: false, reason: 'no_contact' });
  });

  it('limits sends to five an hour and guesses to six in ten minutes', async () => {
    const { v, p } = make();
    for (let i = 0; i < 5; i++) expect((await v.start('P171632', 'sms')).ok).toBe(true);
    expect(await v.start('P171632', 'sms')).toEqual({ ok: false, reason: 'rate_limited' });
    p.nextCode = '123456';
    for (let i = 0; i < 6; i++) await v.check('P171632', 'sms', '000000');
    expect(await v.check('P171632', 'sms', '123456')).toEqual({ ok: false, reason: 'too_many_attempts' });
  });
});

describe('tokens', () => {
  it('reads back what it issued, and refuses tampered, foreign and expired tokens', async () => {
    const now = NOON(), t = await issueToken('s', { licence: 'P171632', via: 'email' }, now, 60);
    expect(await readToken('s', t, now)).toMatchObject({ licence: 'P171632', via: 'email' });
    expect(await readToken('other', t, now)).toBeNull();
    const [body, sig] = t.split('.');
    expect(await readToken('s', `${body}x.${sig}`, now)).toBeNull();
    expect(await readToken('s', t, new Date(now.getTime() + 61_000))).toBeNull();
    expect(await readToken('s', 'garbage', now)).toBeNull();
  });
});
