/* The messaging interface. Product code talks to this, never to a provider.
   Telnyx is the first implementation; Twilio can be added behind the same
   shape and switched per dealer. See docs/plan/messaging.md. */

/** Why a message is being sent. The law treats these differently. */
export type MessageKind =
  | 'otp'        // a verification code
  | 'care'       // transactional: signing links, receipts, title updates, appointment confirmations
  | 'marketing'; // Reach follow-ups, re-engagement, offers: needs express written consent

export type SendInput = {
  dealerId: string;      // TxDMV licence, e.g. P171632
  from: string;          // E.164 number registered to that dealer's campaign
  to: string;            // E.164
  text: string;
  mediaUrls?: string[];
  kind: MessageKind;
};

export type SendResult = { providerId: string; parts: number; status: 'queued' | 'sent' | 'failed'; error?: string };

/** Provider events, normalised. */
export type InboundMessage = { type: 'inbound'; providerId: string; from: string; to: string; text: string; media: string[]; at: string };
export type DeliveryUpdate = { type: 'status'; providerId: string; to: string; status: 'sent' | 'delivered' | 'failed'; error?: string; at: string };
export type ProviderEvent = InboundMessage | DeliveryUpdate;

export type VerificationResult = 'accepted' | 'rejected' | 'expired' | 'too_many_attempts';

export type DealerBrand = {
  dealerId: string; legalName: string; displayName: string; ein: string;
  phone: string; email: string; street: string; city: string; state: string; zip: string; website?: string;
};

export type CampaignInput = {
  brandId: string; usecase: 'CUSTOMER_CARE' | 'MARKETING' | 'MIXED';
  description: string; samples: string[]; messageFlow: string;
  helpMessage: string; optoutMessage: string; optinMessage?: string;
  /** Buy here pay here and in-house financing dealers lend directly; carriers require it declared. */
  directLending: boolean;
};

export interface MessagingProvider {
  readonly name: 'telnyx' | 'twilio' | 'fake';
  send(input: SendInput): Promise<SendResult>;
  /** Check a webhook really came from the provider. Must see the raw body bytes. */
  verifyWebhook(rawBody: string, headers: Headers, now?: Date): Promise<boolean>;
  parseWebhook(rawBody: string): ProviderEvent | null;
  /** Provider-run one-time codes (no carrier registration needed on our side). */
  startVerification(phone: string): Promise<{ id: string }>;
  checkVerification(phone: string, code: string): Promise<VerificationResult>;
  /** Carrier registration (10DLC), one brand per dealer. */
  registerBrand(brand: DealerBrand): Promise<{ brandId: string }>;
  registerCampaign(c: CampaignInput): Promise<{ campaignId: string }>;
  assignNumber(phone: string, campaignId: string): Promise<void>;
}
