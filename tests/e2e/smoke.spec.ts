import { expect, test, type Page } from '@playwright/test';
import { APP_ROUTES, DEMO_MODE_LABEL } from '../../apps/web/src/lib/routes';

/** Collect console errors and page errors for the lifetime of a page. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe('app shell', () => {
  test('root redirects to /today', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today');
  });

  test('skip link is first in tab order and Tab reaches the primary nav', async ({ page }) => {
    await page.goto('/today');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    // Skip link moves focus to main.
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();

    // From the top, Tab (past skip link and brand) reaches the first nav link.
    await page.goto('/today');
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // brand
    await page.keyboard.press('Tab'); // first nav link
    const nav = page.getByRole('navigation', { name: 'Primary' });
    const firstLink = nav.getByRole('link').first();
    await expect(firstLink).toBeFocused();
    await expect(firstLink).toHaveText('Today');
  });

  test('demo-mode badge is persistent and nav marks the active route', async ({ page }) => {
    await page.goto('/scripts');
    await expect(page.locator('[data-demo-mode-badge]')).toHaveText(new RegExp(DEMO_MODE_LABEL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const nav = page.getByRole('navigation', { name: 'Primary' });
    const active = nav.locator('a[aria-current="page"]');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveText('Scripts');
  });
});

for (const route of APP_ROUTES) {
  test(`route ${route.href} renders an h1 with no console errors`, async ({ page }) => {
    const errors = trackErrors(page);
    const response = await page.goto(route.href);
    expect(response?.status(), `status for ${route.href}`).toBe(200);
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(route.label);
    await expect(page.locator('[data-demo-mode-badge]')).toBeVisible();
    // Let hydration settle so client-side errors would surface.
    await page.waitForLoadState('networkidle');
    expect(errors, `errors on ${route.href}`).toEqual([]);
  });
}

test.describe('settings', () => {
  test('export yields JSON and delete-all clears the namespace', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/settings');

    // Change the assistance mode so at least one key exists.
    const select = page.getByLabel('Assistance mode for new practice sessions');
    await expect(select).toBeEnabled();
    await select.selectOption('recall_with_reveal');
    await expect(page.locator('code', { hasText: 'settings.assistance_mode' })).toBeVisible();

    await page.locator('[data-export-button]').click();
    const pre = page.locator('[data-export-json]');
    await expect(pre).toBeVisible();
    const parsed = JSON.parse((await pre.textContent()) ?? '') as {
      namespace: string;
      mode: string;
      entries: Record<string, unknown>;
    };
    expect(parsed.namespace).toBe('apohenia.v1.');
    expect(parsed.mode).toBe('local_demo');
    expect(parsed.entries['settings.assistance_mode']).toBe('recall_with_reveal');

    // Delete all through the confirm dialog (Esc cancels first).
    await page.locator('[data-delete-button]').click();
    const dialog = page.getByRole('dialog', { name: 'Delete all local data?' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.locator('[data-delete-button]').click();
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-confirm-delete]').click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-settings-status]')).toContainText('Deleted');
    await expect(page.getByText('No local entries yet.')).toBeVisible();
    await expect(select).toHaveValue('full_script');

    expect(errors).toEqual([]);
  });
});
