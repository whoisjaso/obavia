export type Env = {
  AUCTION: DurableObjectNamespace;
  DB: D1Database;
  FILES: R2Bucket;              // photos/<lot>/<n>.jpg, documents/<lot>/<name>.pdf
  ASSETS: Fetcher;              // wrangler assets (./assets): pdf.js for the document page at /pdfjs/*, copied from pdfjs-dist by `npm run vendor`
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
  META_PIXEL_ID?: string;       // the Meta dataset (pixel) id; with META_CAPI_TOKEN the four standard events go to the Conversions API (src/marketing.ts). Unset: recorded in marketing_events, never sent
  META_CAPI_TOKEN?: string;     // secret: the Conversions API access token from Events Manager
  META_TEST_EVENT_CODE?: string; // TEST#### from Events Manager's Test events tab; set while verifying the four events, removed before the first dollar
  GOOGLE_WALLET_ISSUER_ID?: string;       // var: the Google Wallet issuer id; with the service account GET /lots/:id/pass signs a generic pass (gap table deviation 10, KEYS)
  GOOGLE_WALLET_SERVICE_ACCOUNT?: string; // secret: the service account's JSON (client_email, private_key); without both the pass route is 503 pass_unavailable
  DEV: string;   // "1" admits a deposit without Whop, for wrangler dev and tests only; never on a deployed Worker
};
