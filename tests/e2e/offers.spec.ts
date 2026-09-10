import { expect, test, type Page } from '@playwright/test';

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

const BANNER = 'FICTIONAL TRAINING OFFER — NOT A REAL QUOTE';

test.describe('offers', () => {
  test('live list shows the draft research offer with "Not set" price and the blank-price note', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/offers');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Offers');
    await expect(page.getByRole('tab', { name: /Live offers \(1\)/ })).toHaveAttribute('aria-selected', 'true');

    const live = page.locator('[data-offer="draft-research-offer-v0"]');
    await expect(live).toBeVisible();
    await expect(live).toHaveAttribute('data-offer-kind', 'live');
    await expect(live.locator('[data-price-setup]')).toHaveText('Not set');
    await expect(live.locator('[data-price-recurring]')).toHaveText('Not set');
    await expect(live.locator('[data-blank-price-note]')).toContainText('A blank price is not $0');
    await expect(live).toHaveAttribute('data-offer-status', 'draft');
    // Every field section is present.
    for (const name of ['Buyer type', 'Problem', 'Prerequisites', 'Deliverables', 'Exclusions', 'Implementation dependencies', 'Supported proof', 'Approved claims', 'Three pillars', 'Price', 'Timing', 'Acceptance criteria', 'Decision roles', 'Support', 'Cancellation, exit and handoff']) {
      await expect(live.getByRole('region', { name }).first()).toBeVisible();
    }
    await expect(live.getByRole('region', { name: 'Supported proof' })).toContainText('none yet');

    // The fictional fixture is not in the live tab at all.
    await expect(page.locator('[data-offer="fictional-demo-inquiry-pilot"]')).toBeHidden();
    await expect(page.getByText(BANNER)).toBeHidden();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('fictional offer appears only under Practice fixtures with its banner', async ({ page }) => {
    await page.goto('/offers');
    await page.getByRole('tab', { name: /Practice fixtures \(1\)/ }).click();
    const fixture = page.locator('[data-offer="fictional-demo-inquiry-pilot"]');
    await expect(fixture).toBeVisible();
    await expect(fixture).toHaveAttribute('data-offer-kind', 'practice');
    await expect(fixture.locator('[data-fictional-banner]')).toHaveText(BANNER);
    await expect(fixture).toContainText('practice only · excluded from live');
    await expect(fixture.locator('[data-price-setup]')).toHaveText('$750.00');
    await expect(fixture.locator('[data-price-recurring]')).toHaveText('$150.00');
    await expect(fixture).toContainText('canQuotePrice: false');
    // No status controls on a fixture.
    await expect(fixture.locator('[data-transition]')).toHaveCount(0);
  });

  test('status moves draft → reviewed → published with confirmation, then is read-only', async ({ page }) => {
    await page.goto('/offers');
    const live = page.locator('[data-offer="draft-research-offer-v0"]');
    await live.locator('[data-transition="reviewed"]').click();
    await expect(live).toHaveAttribute('data-offer-status', 'reviewed');
    await live.locator('[data-transition="published"]').click();
    const dialog = page.getByRole('dialog', { name: 'Publish this offer version?' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(live).toHaveAttribute('data-offer-status', 'reviewed');
    await live.locator('[data-transition="published"]').click();
    await dialog.locator('[data-confirm-transition]').click();
    await expect(dialog).toBeHidden();
    await expect(live).toHaveAttribute('data-offer-status', 'published');
    await expect(live).toContainText('read-only');
    await expect(live.locator('[data-transition="reviewed"]')).toHaveCount(0);
    // Price is still Not set: publishing does not invent one.
    await expect(live.locator('[data-price-setup]')).toHaveText('Not set');
    // Persisted.
    await page.reload();
    await expect(page.locator('[data-offer="draft-research-offer-v0"]')).toHaveAttribute('data-offer-status', 'published');
  });
});
