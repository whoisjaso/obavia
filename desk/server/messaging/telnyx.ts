/* Telnyx, behind the MessagingProvider interface.
   API v2: https://api.telnyx.com/v2, Bearer auth. Webhooks are signed with
   Ed25519 over `${timestamp}|${rawBody}` (headers telnyx-signature-ed25519,
   telnyx-timestamp); the public key is in the Mission Control portal. */
import type { CampaignInput, DealerBrand, MessagingProvider, ProviderEvent, SendInput, SendResult, VerificationResult } from './types';

export type TelnyxConfig = {
  apiKey: string;
  messagingProfileId: string;
  verifyProfileId: string;
  publicKey: string;          // base64 Ed25519 public key
  webhookUrl?: string;
  fetch?: typeof fetch;       // injectable for tests
  base?: string;
};

const REPLAY_WINDOW_S = 300;

const b64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export class TelnyxError extends Error {
  constructor(public status: number, public detail: string) { super(`Telnyx ${status}: ${detail}`); }
}

export class Telnyx implements MessagingProvider {
  readonly name = 'telnyx' as const;
  private f: typeof fetch;
  private base: string;
  constructor(private cfg: TelnyxConfig) { this.f = cfg.fetch ?? fetch.bind(globalThis); this.base = cfg.base ?? 'https://api.telnyx.com/v2'; }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.f(`${this.base}${path}`, {
      method, headers: { Authorization: `Bearer ${this.cfg.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw new TelnyxError(res.status, json?.errors?.map((e: { title?: string; detail?: string }) => e.detail || e.title).join('; ') || res.statusText);
    return json as T;
  }

  async send(m: SendInput): Promise<SendResult> {
    try {
      const r = await this.call<{ data: { id: string; parts?: number; to?: { status?: string }[] } }>('POST', '/messages', {
        from: m.from, to: m.to, text: m.text,
        ...(m.mediaUrls?.length ? { media_urls: m.mediaUrls, type: 'MMS' } : {}),
        messaging_profile_id: this.cfg.messagingProfileId,
        ...(this.cfg.webhookUrl ? { webhook_url: this.cfg.webhookUrl } : {}),
      });
      return { providerId: r.data.id, parts: r.data.parts ?? 1, status: 'queued' };
    } catch (e) {
      return { providerId: '', parts: 0, status: 'failed', error: e instanceof Error ? e.message : String(e) };
    }
  }

  async verifyWebhook(rawBody: string, headers: Headers, now = new Date()): Promise<boolean> {
    const sig = headers.get('telnyx-signature-ed25519'), ts = headers.get('telnyx-timestamp');
    if (!sig || !ts || !/^\d+$/.test(ts)) return false;
    if (Math.abs(now.getTime() / 1000 - Number(ts)) > REPLAY_WINDOW_S) return false;
    try {
      const key = await crypto.subtle.importKey('raw', b64(this.cfg.publicKey), { name: 'Ed25519' }, false, ['verify']);
      return await crypto.subtle.verify({ name: 'Ed25519' }, key, b64(sig), new TextEncoder().encode(`${ts}|${rawBody}`));
    } catch { return false; }
  }

  parseWebhook(rawBody: string): ProviderEvent | null {
    let d: { data?: { event_type?: string; occurred_at?: string; payload?: Record<string, any> } };
    try { d = JSON.parse(rawBody); } catch { return null; }
    const ev = d.data?.event_type, p = d.data?.payload, at = d.data?.occurred_at ?? new Date().toISOString();
    if (!ev || !p) return null;
    if (ev === 'message.received') {
      return { type: 'inbound', providerId: p.id, from: p.from?.phone_number, to: p.to?.[0]?.phone_number, text: p.text ?? '', media: (p.media ?? []).map((m: { url: string }) => m.url), at };
    }
    if (ev === 'message.sent' || ev === 'message.finalized') {
      const t = p.to?.[0] ?? {};
      const raw = String(t.status ?? (ev === 'message.sent' ? 'sent' : ''));
      const status = raw === 'delivered' ? 'delivered' : /fail|undeliver|reject/.test(raw) ? 'failed' : 'sent';
      return { type: 'status', providerId: p.id, to: t.phone_number, status, error: p.errors?.[0]?.detail, at };
    }
    return null;
  }

  async startVerification(phone: string) {
    const r = await this.call<{ data: { id: string } }>('POST', '/verifications/sms', { phone_number: phone, verify_profile_id: this.cfg.verifyProfileId });
    return { id: r.data.id };
  }

  async checkVerification(phone: string, code: string): Promise<VerificationResult> {
    try {
      const r = await this.call<{ data: { response_code: string } }>('POST', `/verifications/by_phone_number/${encodeURIComponent(phone)}/actions/verify`, { code, verify_profile_id: this.cfg.verifyProfileId });
      const c = r.data.response_code;
      return c === 'accepted' ? 'accepted' : c === 'expired' ? 'expired' : c === 'max_attempts_exceeded' ? 'too_many_attempts' : 'rejected';
    } catch (e) {
      if (e instanceof TelnyxError && (e.status === 404 || e.status === 422)) return 'rejected';
      throw e;
    }
  }

  async registerBrand(b: DealerBrand) {
    const r = await this.call<{ brandId: string }>('POST', '/10dlc/brand', {
      entityType: 'PRIVATE_PROFIT', companyName: b.legalName, displayName: b.displayName, ein: b.ein, einIssuingCountry: 'US',
      phone: b.phone, email: b.email, street: b.street, city: b.city, state: b.state, postalCode: b.zip, country: 'US',
      website: b.website, vertical: 'RETAIL', referenceId: b.dealerId,
    });
    return { brandId: r.brandId };
  }

  async registerCampaign(c: CampaignInput) {
    const [sample1, sample2, sample3] = c.samples;
    const r = await this.call<{ campaignId: string }>('POST', '/10dlc/campaignBuilder', {
      brandId: c.brandId, usecase: c.usecase, description: c.description, messageFlow: c.messageFlow,
      sample1, sample2, sample3, helpMessage: c.helpMessage, optoutMessage: c.optoutMessage, optinMessage: c.optinMessage,
      subscriberOptin: true, subscriberOptout: true, subscriberHelp: true,
      optoutKeywords: 'STOP,UNSUBSCRIBE,CANCEL,END,QUIT', helpKeywords: 'HELP,INFO', embeddedLink: true, numberPool: false, ageGated: false, directLending: c.directLending,
    });
    return { campaignId: r.campaignId };
  }

  async assignNumber(phone: string, campaignId: string) {
    await this.call('POST', '/10dlc/phone_number_campaigns', { phoneNumber: phone, campaignId });
  }
}
