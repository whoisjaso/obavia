import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/engine/**/*.test.ts', 'src/nav.test.ts', 'src/kv.test.ts', 'src/pass.test.ts', 'src/sale.test.ts', 'src/components/etch.test.ts'] } });
