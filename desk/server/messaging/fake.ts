/* A provider that keeps everything in memory. Tests and the preview use it;
   it behaves like a real one from the service's point of view. */
import type { CampaignInput, DealerBrand, MessagingProvider, ProviderEvent, SendInput, SendResult, VerificationResult } from './types';
import { segments } from './core';

export class FakeProvider implements MessagingProvider {
  readonly name = 'fake' as const;
  sent: SendInput[] = [];
  codes = new Map<string, string>();
  brands: DealerBrand[] = [];
  campaigns: CampaignInput[] = [];
  numbers = new Map<string, string>();
  private n = 0;
  /** The code the next verification will use. Tests set it; otherwise random. */
  nextCode?: string;

  async send(m: SendInput): Promise<SendResult> { this.sent.push(m); return { providerId: `fake-${++this.n}`, parts: segments(m.text).parts, status: 'queued' }; }
  async verifyWebhook(_raw: string, headers: Headers) { return headers.get('x-fake-signature') === 'ok'; }
  parseWebhook(raw: string): ProviderEvent | null { try { return JSON.parse(raw) as ProviderEvent; } catch { return null; } }
  async startVerification(phone: string) {
    const code = this.nextCode ?? String(Math.floor(100000 + Math.random() * 900000));
    this.codes.set(phone, code);
    return { id: `fake-verify-${++this.n}` };
  }
  async checkVerification(phone: string, code: string): Promise<VerificationResult> {
    const want = this.codes.get(phone);
    if (!want) return 'expired';
    if (want !== code) return 'rejected';
    this.codes.delete(phone);
    return 'accepted';
  }
  async registerBrand(b: DealerBrand) { this.brands.push(b); return { brandId: `B-${b.dealerId}` }; }
  async registerCampaign(c: CampaignInput) { this.campaigns.push(c); return { campaignId: `C-${this.campaigns.length}` }; }
  async assignNumber(phone: string, campaignId: string) { this.numbers.set(phone, campaignId); }
}
