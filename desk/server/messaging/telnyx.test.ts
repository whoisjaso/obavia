import { describe, expect, it } from 'vitest';
import { Telnyx } from './telnyx';

type Call = { url: string; method: string; headers: Record<string, string>; body: any };

function mockFetch(reply: (c: Call) => { status?: number; body: unknown }) {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const c: Call = { url, method: init.method!, headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined };
    calls.push(c);
    const r = reply(c);
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

const b64 = (u: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(u)));

async function keyPair() {
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']) as CryptoKeyPair;
  return { kp, publicKey: b64(await crypto.subtle.exportKey('raw', kp.publicKey)) };
}

const cfg = (f: typeof fetch, publicKey = '') => new Telnyx({ apiKey: 'KEY', messagingProfileId: 'MP', verifyProfileId: 'VP', publicKey, webhookUrl: 'https://api.example/webhooks/telnyx', fetch: f });

describe('Telnyx send', () => {
  it('posts to /v2/messages with the profile, auth and webhook', async () => {
    const { f, calls } = mockFetch(() => ({ body: { data: { id: 'msg-1', parts: 2 } } }));
    const r = await cfg(f).send({ dealerId: 'P171632', from: '+17135550100', to: '+17134883602', text: 'Your signed bill of sale is ready.', kind: 'care' });
    expect(r).toEqual({ providerId: 'msg-1', parts: 2, status: 'queued' });
    expect(calls[0].url).toBe('https://api.telnyx.com/v2/messages');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers.Authorization).toBe('Bearer KEY');
    expect(calls[0].body).toEqual({ from: '+17135550100', to: '+17134883602', text: 'Your signed bill of sale is ready.', messaging_profile_id: 'MP', webhook_url: 'https://api.example/webhooks/telnyx' });
  });
  it('sends photos as MMS', async () => {
    const { f, calls } = mockFetch(() => ({ body: { data: { id: 'm' } } }));
    await cfg(f).send({ dealerId: 'P1', from: '+17135550100', to: '+17134883602', text: 'The Tahoe', mediaUrls: ['https://cdn.example/t.jpg'], kind: 'marketing' });
    expect(calls[0].body).toMatchObject({ type: 'MMS', media_urls: ['https://cdn.example/t.jpg'] });
  });
  it('turns an API error into a failed result instead of throwing', async () => {
    const { f } = mockFetch(() => ({ status: 422, body: { errors: [{ title: 'Invalid', detail: 'The destination number is invalid.' }] } }));
    const r = await cfg(f).send({ dealerId: 'P1', from: '+17135550100', to: '+17134883602', text: 'hi', kind: 'care' });
    expect(r.status).toBe('failed');
    expect(r.error).toMatch(/destination number is invalid/);
  });
});

describe('Telnyx webhooks', () => {
  const body = JSON.stringify({ data: { event_type: 'message.received', occurred_at: '2026-10-01T15:00:00Z', payload: { id: 'in-1', from: { phone_number: '+17134883602' }, to: [{ phone_number: '+17135550100' }], text: 'STOP', media: [] } } });

  it('accepts a correctly signed, fresh webhook and rejects tampering, stale and unsigned ones', async () => {
    const { kp, publicKey } = await keyPair();
    const t = cfg(mockFetch(() => ({ body: {} })).f, publicKey);
    const ts = '1790866800', now = new Date(Number(ts) * 1000);
    const sig = b64(await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, new TextEncoder().encode(`${ts}|${body}`)));
    const h = (s: string, t2 = ts) => new Headers({ 'telnyx-signature-ed25519': s, 'telnyx-timestamp': t2 });
    expect(await t.verifyWebhook(body, h(sig), now)).toBe(true);
    expect(await t.verifyWebhook(body.replace('STOP', 'HELP'), h(sig), now)).toBe(false);          // body changed
    expect(await t.verifyWebhook(body, h(sig), new Date((Number(ts) + 301) * 1000))).toBe(false);   // replayed later
    expect(await t.verifyWebhook(body, new Headers(), now)).toBe(false);                             // unsigned
    const other = await keyPair();
    expect(await cfg(mockFetch(() => ({ body: {} })).f, other.publicKey).verifyWebhook(body, h(sig), now)).toBe(false); // wrong key
  });

  it('parses an inbound text and a delivery result', () => {
    const t = cfg(mockFetch(() => ({ body: {} })).f);
    expect(t.parseWebhook(body)).toEqual({ type: 'inbound', providerId: 'in-1', from: '+17134883602', to: '+17135550100', text: 'STOP', media: [], at: '2026-10-01T15:00:00Z' });
    const fin = JSON.stringify({ data: { event_type: 'message.finalized', occurred_at: 'x', payload: { id: 'out-1', to: [{ phone_number: '+17134883602', status: 'delivery_failed' }], errors: [{ detail: 'Unreachable' }] } } });
    expect(t.parseWebhook(fin)).toMatchObject({ type: 'status', providerId: 'out-1', status: 'failed', error: 'Unreachable' });
    expect(t.parseWebhook('not json')).toBeNull();
  });
});

describe('Telnyx Verify', () => {
  it('starts an SMS verification with the profile', async () => {
    const { f, calls } = mockFetch(() => ({ body: { data: { id: 'v-1', status: 'pending' } } }));
    expect(await cfg(f).startVerification('+17134883602')).toEqual({ id: 'v-1' });
    expect(calls[0].url).toBe('https://api.telnyx.com/v2/verifications/sms');
    expect(calls[0].body).toEqual({ phone_number: '+17134883602', verify_profile_id: 'VP' });
  });
  it('maps the code check to accepted, rejected, expired and too many attempts', async () => {
    for (const [code, want] of [['accepted', 'accepted'], ['rejected', 'rejected'], ['expired', 'expired'], ['max_attempts_exceeded', 'too_many_attempts']] as const) {
      const { f, calls } = mockFetch(() => ({ body: { data: { response_code: code } } }));
      expect(await cfg(f).checkVerification('+17134883602', '123456')).toBe(want);
      expect(calls[0].url).toBe('https://api.telnyx.com/v2/verifications/by_phone_number/%2B17134883602/actions/verify');
    }
  });
});

describe('Telnyx 10DLC', () => {
  it('registers a dealer brand and a direct-lending care campaign', async () => {
    const { f, calls } = mockFetch(c => ({ body: c.url.endsWith('/brand') ? { brandId: 'B1' } : { campaignId: 'C1' } }));
    const t = cfg(f);
    expect(await t.registerBrand({ dealerId: 'P171632', legalName: 'Triple J Auto Investment LLC', displayName: 'Triple J Auto', ein: '00-0000000', phone: '+17134883602', email: 'office@example.com', street: '1 Example St', city: 'Houston', state: 'TX', zip: '77075' })).toEqual({ brandId: 'B1' });
    expect(calls[0].body).toMatchObject({ entityType: 'PRIVATE_PROFIT', companyName: 'Triple J Auto Investment LLC', country: 'US', referenceId: 'P171632' });
    await t.registerCampaign({ brandId: 'B1', usecase: 'CUSTOMER_CARE', description: 'd', samples: ['a', 'b'], messageFlow: 'm', helpMessage: 'h', optoutMessage: 'o', directLending: true });
    expect(calls[1].url).toBe('https://api.telnyx.com/v2/10dlc/campaignBuilder');
    expect(calls[1].body).toMatchObject({ brandId: 'B1', usecase: 'CUSTOMER_CARE', sample1: 'a', sample2: 'b', directLending: true, subscriberOptout: true });
  });
});
