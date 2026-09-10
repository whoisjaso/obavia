import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * Single flat config for the whole monorepo. `npm run lint` runs
 * `eslint . --max-warnings 0`, so every warning fails the build.
 */
export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/out/**',
    '**/build/**',
    '**/next-env.d.ts',
    'legacy/**',
    'playwright-report/**',
    'test-results/**',
    'coverage/**',
  ]),
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: 'apps/web/' },
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]);
