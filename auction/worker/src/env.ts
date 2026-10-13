export type Env = {
  AUCTION: DurableObjectNamespace;
  DB: D1Database;
  FILES: R2Bucket;              // photos/<lot>/<n>.jpg, documents/<lot>/<name>.pdf
  BUYER_SECRET: string;
  DEALER_SECRET: string;
  MINT_SECRET?: string;         // POST /dealers/mint only (the public-site lane); at least 32 characters, never equal to DEALER_SECRET
  WHOP_API_KEY?: string;        // Whop: the rail for deposits, balances, dealer transfers
  WHOP_API_BASE?: string;       // sandbox-api.whop.com/api/v1 in staging
  WHOP_WEBHOOK_SECRET?: string; // whsec_… from POST /webhooks
  WHOP_ACCOUNT_ID?: string;     // biz_… Obavia's account; the nightly reconciliation reads its USD balance
  EXPO_ACCESS_TOKEN?: string;   // optional, for Expo push
  TELNYX_API_KEY?: string;      // buyer sign-in by phone (src/phone.ts): Telnyx Verify, the same account as the Desk
  TELNYX_VERIFY_PROFILE_ID?: string;
  MESSAGING_PROVIDER?: string;  // "fake": every code is 000000, and it admits a bid only where DEV=1
  DEV: string;   // "1" admits a deposit without Whop, for wrangler dev and tests only; never on a deployed Worker
};
