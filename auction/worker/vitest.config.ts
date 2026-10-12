import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations('./migrations');
      return {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          bindings: { BUYER_SECRET: 'test-buyer-secret', DEALER_SECRET: 'test-dealer-secret', DEV: '1', TEST_MIGRATIONS: migrations },
          d1Databases: ['DB'],
        },
      };
    }),
  ],
  test: { include: ['test/**/*.test.ts'] },
});
