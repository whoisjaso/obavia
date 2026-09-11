import { expect, test, type Page } from '@playwright/test';
import { APP_ROUTES, DEMO_PILL_NAME, TABS } from '../../apps/web/src/lib/routes';

/** Collect console errors and page errors for the lifetime of a page. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** The route's single h1 exists for assistive tech but is not painted on the stage (≤1px box). */
async function expectHiddenH1(page: Page, text: string): Promise<void> {
  const h1 = page.locator('h1');
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveText(text);
  const box = await h1.boundingBox();
  expect(box, 'h1 is rendered').not.toBeNull();
  // ≤1px box (sub-pixel layout can report 1.0000000149 for a 1px sr-only box; anything visibly larger fails).
  expect(Math.max(box!.width, box!.height)).toBeLessThanOrEqual(1.01);
}

test.describe('shell v2 (Arena)', () => {
  test('the front door is Dial: hero button, tab bar with four tabs, demo pill, no sidebar, no table', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expectHiddenH1(page, 'Dial');
    await expect(page.locator('[data-hero]')).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Primary' });
    const links = nav.getByRole('link');
    await expect(links).toHaveCount(4);
    await expect(links).toHaveText(TABS.map((t) => t.label));
    for (const tab of TABS) await expect(nav.getByRole('link', { name: tab.label })).toHaveAttribute('href', tab.href);
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('Dial');

    await expect(page.locator('[data-demo-pill]:visible')).toHaveCount(1);
    await expect(page.getByRole('status', { name: DEMO_PILL_NAME })).toBeVisible();

    await expect(page.locator('aside nav, [data-sidebar]')).toHaveCount(0);
    await expect(page.locator('table')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('/call-room redirects to the front door', async ({ page }) => {
    await page.goto('/call-room');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-hero]')).toBeVisible();
  });

  test('skip link is first in tab order and lands on main', async ({ page }) => {
    await page.goto('/today');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('the tab bar marks the active tab, including secondary screens', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await page.goto('/practice');
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('Train');
    await page.goto('/sources');
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('Script');
    await page.goto('/settings');
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('Me');
    await page.goto('/prospects');
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('Dial');
  });
});

for (const route of APP_ROUTES) {
  test(`route ${route.href}: 200, one visually hidden h1, tab bar (or exit on an immersive screen), one visible demo pill, no console errors`, async ({ page }) => {
    const errors = trackErrors(page);
    const response = await page.goto(route.href);
    expect(response?.status(), `status for ${route.href}`).toBe(200);
    await expectHiddenH1(page, route.h1);
    if (route.immersive) {
      // The tab bar hides on an immersive screen; an explicit exit control takes its place.
      await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden();
      await expect(page.locator('[data-interview-exit]')).toBeVisible();
    } else await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link')).toHaveCount(4);
    await expect(page.locator('[data-demo-pill]:visible')).toHaveCount(1);
    await expect(page.getByRole('status', { name: DEMO_PILL_NAME }).first()).toBeVisible();
    // Dark stage, no horizontal scroll at the review viewport.
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(11, 11, 15)');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(1440);
    await page.waitForLoadState('networkidle');
    expect(errors, `errors on ${route.href}`).toEqual([]);
  });
}
