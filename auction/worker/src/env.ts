export type Env = {
  AUCTION: DurableObjectNamespace;
  DB: D1Database;
  BUYER_SECRET: string;
  DEALER_SECRET: string;
  STRIPE_SECRET?: string;
  DEV: string;   // "1" admits a deposit without Stripe, for wrangler dev and tests only
};
