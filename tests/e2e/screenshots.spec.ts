import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Increment 1 visual record: one viewport screenshot per route at 1440x900 (the review
 * viewport) plus /call-room at 1280x800 (the smaller supported desktop). Written to
 * docs/screenshots/increment-1/*.png. Each shot also asserts the page rendered its h1.
 */
const OUT = join(__dirname, '..', '..', 'docs', 'screenshots', 'increment-1');

const ROUTES: { href: string; file: string }[] = [
  { href: '/today', file: 'today' },
  { href: '/onboarding/identity', file: 'onboarding-identity' },
  { href: '/profile', file: 'profile' },
  { href: '/scripts', file: 'scripts' },
  { href: '/scripts?node=logical-process', file: 'scripts-deep-link' },
  { href: '/offers', file: 'offers' },
  { href: '/sources', file: 'sources' },
  { href: '/sources/L07', file: 'sources-L07' },
  { href: '/practice', file: 'practice' },
  { href: '/call-room', file: 'call-room-1440x900' },
  { href: '/calls', file: 'calls' },
  { href: '/calls/syn-a-profit-not-revenue', file: 'calls-detail' },
  { href: '/prospects', file: 'prospects' },
  { href: '/pipeline', file: 'pipeline' },
  { href: '/insights', file: 'insights' },
  { href: '/settings', file: 'settings' },
];

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

/** Play the synthetic call so the THEIR WORDS strip carries real pins, and check they render at >= 24px. */
async function populateCallRoom(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Play all' }).click();
  const pins = page.locator('[data-their-words] [data-pin]');
  await expect(pins.first()).toBeVisible();
  const fontSize = await pins.first().locator('[data-pin-text]').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(24);
  // Playing moves focus down the page; the record should show the workspace from the top.
  await page.evaluate(() => window.scrollTo(0, 0));
}

for (const route of ROUTES) {
  test(`screenshot ${route.href} at 1440x900`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route.href);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (route.href === '/call-room') await populateCallRoom(page);
    await page.screenshot({ path: join(OUT, `${route.file}.png`) });
  });
}

test('screenshot /call-room at 1280x800', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/call-room');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await populateCallRoom(page);
  await page.screenshot({ path: join(OUT, 'call-room-1280x800.png') });
});
