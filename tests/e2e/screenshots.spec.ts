import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Design System v2 visual acceptance (DESIGN_SYSTEM §6): 430×932 (phone) and 1440×900 (desktop)
 * for Dial idle · Dial arming · In-call (≥3 words, ≥1 reference) · Outcome sheet · Train · Script ·
 * Me · Interview screen → docs/screenshots/v2/<name>-<w>x<h>.png. Each shot asserts the screen
 * reached the intended state first.
 */
const OUT = join(__dirname, '..', '..', 'docs', 'screenshots', 'v2');

const VIEWPORTS = [
  { width: 430, height: 932 },
  { width: 1440, height: 900 },
] as const;

const STATIC: { name: string; href: string; immersive?: boolean }[] = [
  { name: 'train', href: '/practice' },
  { name: 'script', href: '/scripts' },
  { name: 'me', href: '/today' },
  { name: 'interview', href: '/onboarding/identity', immersive: true },
  { name: 'sources', href: '/sources' },
  { name: 'profile', href: '/profile' },
  { name: 'insights', href: '/insights' },
  { name: 'queue', href: '/prospects' },
  { name: 'history', href: '/calls' },
  { name: 'followups', href: '/pipeline' },
];

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

async function prime(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('apohenia.v1.')) localStorage.removeItem(k);
      localStorage.setItem('apohenia.v1.dial.prefs', JSON.stringify({ playback_rate: 8 }));
    } catch {
      // storage unavailable
    }
  });
}

function shot(name: string, vp: { width: number; height: number }): string {
  return join(OUT, `${name}-${vp.width}x${vp.height}.png`);
}

async function expectStatus(page: Page, status: string, timeout = 15_000): Promise<void> {
  await expect(page.locator('[data-dial]')).toHaveAttribute('data-status', status, { timeout });
}

for (const vp of VIEWPORTS) {
  test.describe(`v2 screenshots at ${vp.width}x${vp.height}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await prime(page);
    });

    test('dial idle, dial arming, in-call, outcome sheet', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-dial]')).toHaveAttribute('data-hydrated', 'true');
      await expectStatus(page, 'idle');
      await expect(page.locator('[data-hero]')).toBeVisible();
      await page.screenshot({ path: shot('dial-idle', vp) });

      await page.locator('[data-hero]').click();
      await expectStatus(page, 'arming', 3000);
      await expect(page.locator('[data-hero-state="arming"] [data-ring="countdown"]')).toBeVisible();
      await page.screenshot({ path: shot('dial-arming', vp) });

      await expectStatus(page, 'connected', 15_000);
      await expect.poll(async () => page.locator('[data-word-card]:visible').count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(3);
      await expect.poll(async () => page.locator('[data-ref-card]:visible').count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
      await page.screenshot({ path: shot('in-call', vp) });

      await page.locator('[data-end-call]').click();
      await expect(page.locator('dialog[data-sheet="outcome"]')).toBeVisible();
      await expect(page.locator('dialog[data-sheet="outcome"] [data-outcome]')).toHaveCount(9);
      await page.screenshot({ path: shot('outcome', vp) });
    });

    for (const s of STATIC) {
      test(`${s.name} (${s.href})`, async ({ page }) => {
        await page.goto(s.href);
        await expect(page.locator('h1')).toHaveCount(1);
        // Immersive screens (the interview) own the viewport: the tab bar hides and an exit control remains.
        if (s.immersive) {
          await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
          await expect(page.locator('[data-interview-exit]')).toBeVisible();
        } else await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
        await page.screenshot({ path: shot(s.name, vp) });
      });
    }
  });
}
