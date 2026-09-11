import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Chromium is pre-installed under PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers).
 * `playwright install` must never run here. If the installed revision does not
 * match the one this Playwright version expects, fall back to the pinned binary.
 */
const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
const pinnedChromium = join(browsersPath, 'chromium');

function chromiumExecutablePath(): string | undefined {
  try {
    const registry = JSON.parse(
      readFileSync(join(__dirname, 'node_modules/playwright-core/browsers.json'), 'utf8'),
    ) as { browsers: { name: string; revision: string }[] };
    const chromium = registry.browsers.find((b) => b.name === 'chromium');
    if (chromium && existsSync(join(browsersPath, `chromium-${chromium.revision}`))) {
      return undefined; // registry revision is present; let Playwright resolve it
    }
  } catch {
    // fall through to the pinned binary
  }
  return existsSync(pinnedChromium) ? pinnedChromium : undefined;
}

const executablePath = chromiumExecutablePath();
const useDevServer = process.env.E2E_DEV === '1';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
  webServer: {
    command: useDevServer
      ? 'npm run dev -w apps/web'
      : 'npm run build -w apps/web && npm run start -w apps/web',
    url: 'http://localhost:3000/today',
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
