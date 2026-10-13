import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations('./migrations');
      return {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          bindings: { BUYER_SECRET: 'test-buyer-secret', DEALER_SECRET: 'test-dealer-secret', MINT_SECRET: 'test-mint-secret-0123456789abcdefghij', DEV: '1', WHOP_WEBHOOK_SECRET: 'test-whop-secret', TEST_MIGRATIONS: migrations },
          d1Databases: ['DB'],
          r2Buckets: ['FILES'],
        },
      };
    }),
  ],
  test: { include: ['test/**/*.test.ts'] },
});
