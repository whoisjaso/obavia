export type Env = {
  AUCTION: DurableObjectNamespace;
  DB: D1Database;
  FILES: R2Bucket;              // photos/<lot>/<n>.jpg, documents/<lot>/<name>.pdf
  BUYER_SECRET: string;
  DEALER_SECRET: string;
  WHOP_API_KEY?: string;        // Whop: the rail for deposits, balances, dealer transfers
  WHOP_API_BASE?: string;       // sandbox-api.whop.com/api/v1 in staging
  WHOP_WEBHOOK_SECRET?: string; // whsec_… from POST /webhooks
  WHOP_ACCOUNT_ID?: string;     // biz_… Obavia's account
  EXPO_ACCESS_TOKEN?: string;   // optional, for Expo push
  DEV: string;   // "1" admits a deposit without Stripe, for wrangler dev and tests only
};
