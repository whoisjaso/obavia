import { expect, test, type Page } from '@playwright/test';

/**
 * M-sources E2E: /sources keeps Source A and Source B apart, filters and searches the 207
 * study records, lists the 13 named-only sections with a "no records supplied" badge, shows
 * the named-but-missing register, and each /sources/[id] page shows the template label,
 * the offsets, the unchanged excerpt, the own-script counterpart and (for study_only /
 * private_training) the Source-only notice.
 */

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon\.ico/.test(msg.location()?.url ?? '')) errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe('source library list', () => {
  test('shows Source A and Source B tabs separately, the private notice and the missing register', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/sources');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sources');
    await expect(page.locator('h1')).toHaveCount(1);

    // Private-by-default notice at the top.
    await expect(page.locator('[data-private-notice]')).toContainText('Private by default');

    const tablist = page.getByRole('tablist', { name: 'Source' });
    const tabA = tablist.getByRole('tab', { name: 'Source A' });
    const tabB = tablist.getByRole('tab', { name: 'Source B' });
    await expect(tabA).toBeVisible();
    await expect(tabB).toBeVisible();
    await expect(tabA).toHaveAttribute('aria-selected', 'true');

    // Unfiltered: all 207, never merged — A and B are counted separately.
    const status = page.locator('[data-results-status]');
    await expect(status).toContainText('207 matching records');
    await expect(status).toContainText('Source A 144');
    await expect(status).toContainText('Source B 63');
    await expect(page.locator('[data-source-panel="A"] [data-record-id]')).toHaveCount(144);
    await expect(page.locator('[data-source-panel="A"] [data-record-id="I01"]')).toBeVisible();
    await expect(page.locator('[data-source-panel="B"]')).toBeHidden();

    // Each row labels its template as normalized, not verbatim.
    await expect(page.locator('[data-record-id="I01"]')).toContainText('normalized template — not verbatim');

    // Keyboard: Arrow Right moves to Source B; its panel shows only B records.
    await tabA.focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabB).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-source-panel="B"] [data-record-id]')).toHaveCount(63);
    await expect(page.locator('[data-source-panel="B"] [data-record-id="I01"]')).toHaveCount(0);

    // Named-but-missing register from data/source_missing_resources.json.
    const register = page.locator('[data-missing-register]');
    await expect(register.getByRole('heading', { name: 'Named but missing resources' })).toBeVisible();
    await expect(register.locator('[data-missing-id="raw_source_a"]')).toContainText('marked missing — not reconstructed');
    await expect(register.locator('[data-missing-id="four_frame_fear_set"]')).toBeVisible();

    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('filtering to study_only shows 33 results across both sources', async ({ page }) => {
    await page.goto('/sources');
    await page.getByLabel('Classification', { exact: true }).selectOption('study_only');
    const status = page.locator('[data-results-status]');
    await expect(status).toContainText('33 matching records');
    await expect(status).toContainText('Source A 21');
    await expect(status).toContainText('Source B 12');
    await expect(page.locator('[data-source-panel="A"] [data-record-id]')).toHaveCount(21);
    await expect(page.locator('[data-source-panel="A"] [data-record-id="D01"]')).toBeVisible();

    // Clear restores everything.
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(status).toContainText('207 matching records');
  });

  test('search box narrows results and a section button filters within its source', async ({ page }) => {
    await page.goto('/sources');
    // Two real records share this title (L07 in A02 and V08 in A13) — the count must reflect both.
    await page.getByLabel('Search', { exact: true }).fill('change desired');
    await expect(page.locator('[data-results-status]')).toContainText('2 matching records · Source A 2 · Source B 0');
    await expect(page.locator('[data-source-panel="A"] [data-record-id="L07"]')).toBeVisible();
    await expect(page.locator('[data-source-panel="A"] [data-record-id="V08"]')).toBeVisible();
    await expect(page.locator('[data-source-panel="A"] [data-record-id]')).toHaveCount(2);
    await page.getByLabel('Search', { exact: true }).fill('');

    const sectionButton = page.locator('[data-source-panel="A"] button[data-section-id="A01"]');
    await sectionButton.click();
    await expect(sectionButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-source-panel="A"] [data-record-id]')).toHaveCount(4);
    await expect(page.locator('[data-source-panel="A"] h3', { hasText: 'Source A — 4 records in A01' })).toBeVisible();
  });

  test('named-only sections are listed with the "no records supplied" badge in both tabs', async ({ page }) => {
    await page.goto('/sources');
    const a08 = page.locator('[data-source-panel="A"] [data-named-only][data-section-id="A08"]');
    await expect(a08).toBeVisible();
    await expect(a08).toContainText('no records supplied');
    await expect(page.locator('[data-source-panel="A"] [data-named-only]')).toHaveCount(1);

    await page.getByRole('tab', { name: 'Source B' }).click();
    await expect(page.locator('[data-source-panel="B"] [data-named-only]')).toHaveCount(12);
    const b22 = page.locator('[data-source-panel="B"] [data-named-only][data-section-id="B22"]');
    await expect(b22).toBeVisible();
    await expect(b22).toContainText('no records supplied');
  });
});

test.describe('source record detail', () => {
  test('D01 (study_only) shows the Source-only notice, its offsets and the excerpt label', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/sources/D01');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('D01 — deceptive status deflation');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('[data-source-only-notice]')).toContainText('Source-only: readable for study; not a live recommendation');
    await expect(page.locator('[data-offsets]')).toHaveText('[80241, 80817)');
    await expect(page.getByText('code-point offsets', { exact: false }).first()).toBeVisible();
    await expect(page.locator('[data-excerpt-label]')).toHaveText('Unchanged source excerpt · verification pending (raw sources not supplied)');
    await expect(page.locator('[data-live-eligible]')).toHaveAttribute('data-live-eligible', 'no');
    await expect(page.getByText('normalized template — not verbatim').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Delivery overlay \(framework §11\)/ })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('L07 shows its unchanged excerpt as selectable text, the counterpart list and prev/next links', async ({ page }) => {
    await page.goto('/sources/L07');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('L07 — change desired');
    await expect(page.locator('[data-source-only-notice]')).toHaveCount(0);

    const excerpt = page.locator('blockquote[data-excerpt]');
    await expect(excerpt).toContainText('is there is there anything you would change about either like the the the fitness regime');
    const userSelect = await excerpt.evaluate((el) => getComputedStyle(el).userSelect);
    expect(userSelect).not.toBe('none');
    await expect(page.locator('[data-template]')).toHaveText('Is there anything you would change about either [process] or [results], if you could?');
    await expect(page.locator('[data-offsets]')).toHaveText('[15030, 15628)');

    // Own-script counterpart: the authored script seed cites L07 from logical-change; a placeholder seed says "None yet".
    const counterparts = page.locator('[data-counterparts]');
    await expect(counterparts).toBeVisible();
    const state = await counterparts.getAttribute('data-counterparts');
    if (state !== 'none') {
      const link = counterparts.getByRole('link').first();
      await expect(link).toHaveAttribute('href', /^\/scripts\?node=/);
      // The deep link must open that exact node on /scripts, then come back for the pager check.
      const nodeId = (await link.textContent())?.trim() ?? '';
      await link.click();
      await expect(page).toHaveURL(/\/scripts\?node=/);
      await expect(page.locator('[data-node-card]')).toHaveAttribute('data-current-node', nodeId);
      await page.goBack();
      await expect(page).toHaveURL(/\/sources\/L07$/);
    } else {
      await expect(counterparts).toContainText('None yet');
    }

    const pager = page.getByRole('navigation', { name: 'Record pager' });
    await expect(pager.getByRole('link', { name: /Previous: L06/ })).toBeVisible();
    await pager.getByRole('link', { name: /Next: L08/ }).click();
    await expect(page).toHaveURL(/\/sources\/L08$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('L08');
  });

  test('an unknown record id is a 404, never an invented record', async ({ page }) => {
    const response = await page.goto('/sources/ZZ99');
    expect(response?.status()).toBe(404);
  });
});
