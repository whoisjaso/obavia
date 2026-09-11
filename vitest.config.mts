import { defineConfig } from 'vitest/config';

/**
 * Root Vitest config. `npm test` runs every unit test in the workspaces.
 * Browser E2E lives in tests/e2e and is run by Playwright, not Vitest.
 */
export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', 'legacy/**', 'tests/e2e/**'],
    environment: 'node',
  },
});
