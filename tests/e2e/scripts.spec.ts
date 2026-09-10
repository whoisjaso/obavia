import { expect, test, type Page } from '@playwright/test';

/** Collect console errors and page errors for the lifetime of a page. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

const HEX64 = /^[0-9a-f]{64}$/;

test.describe('scripts', () => {
  test('opens on the inbound entry node and shows the six-part card', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/scripts');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Scripts');
    await expect(page.locator('[data-validate-status]')).toContainText('valid — 51 nodes');

    const card = page.locator('[data-node-card]');
    await expect(card).toHaveAttribute('data-current-node', 'inbound-callback-open');
    await expect(page.getByRole('heading', { name: 'Say this' })).toBeVisible();
    await expect(page.locator('[data-say-this]')).toContainText('Jason with Apohenia');
    await expect(page.getByRole('heading', { name: 'Why this now' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What to listen for' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mirror if unclear' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Tone and pacing cue/ })).toContainText('instructor-described');
    await expect(page.getByRole('heading', { name: 'Next likely branches' })).toBeVisible();
    // Draft is visible on the card, never rendered as approved.
    await expect(card).toContainText('draft');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('missing slots show a cue; toggling a fact interpolates it', async ({ page }) => {
    await page.goto('/scripts');
    const say = page.locator('[data-say-this]');
    await expect(say).toContainText('[missing: dealership name]');
    await page.locator('[data-fact="dealership_name"]').check();
    await expect(say).not.toContainText('[missing: dealership name]');
    await expect(say).toContainText('Northgate Motors (fictional)');
  });

  test('following a branch navigates the graph', async ({ page }) => {
    await page.goto('/scripts');
    await page.getByRole('button', { name: 'Confirmed', exact: true }).click();
    await expect(page.locator('[data-node-card]')).toHaveAttribute('data-current-node', 'intent-tangible');
    await expect(page.locator('[data-say-this]')).toContainText('What had you looking at this');
    await expect(page.locator('[data-path]')).toContainText('inbound-callback-open → intent-tangible');
    // Opt-out reaches the stop node from anywhere it is offered (scenario 40).
    await page.getByRole('button', { name: 'Tangible stated' }).click();
    await page.getByRole('button', { name: 'Experience given' }).click();
    await page.getByRole('button', { name: 'Declines', exact: true }).click();
    await expect(page.locator('[data-node-card]')).toHaveAttribute('data-current-node', 'exit-no-sale');
    await page.getByRole('button', { name: /^End/ }).click();
    await expect(page.locator('[data-end-notice]')).toContainText('End of sequence');
  });

  test('own words are stored separately and the primary line stays unchanged (scenario 29)', async ({ page }) => {
    await page.goto('/scripts');
    const primaryBefore = (await page.locator('[data-say-this]').textContent()) ?? '';
    expect(primaryBefore.length).toBeGreaterThan(20);
    const textarea = page.getByLabel(/Own wording for inbound-callback-open/);
    await expect(textarea).toBeEnabled();
    await textarea.fill('Hey, is this Dana? Jason here — you grabbed the checklist, right?');
    await expect(page.locator('[data-say-this]')).toHaveText(primaryBefore);
    await expect(page.locator('[data-primary-unchanged]')).toContainText('Jason with Apohenia');
    await expect(page.locator('[data-own-words-note]')).toContainText('Primary line (unchanged)');
    // Persisted across reload.
    await page.reload();
    await expect(page.getByLabel(/Own wording for inbound-callback-open/)).toHaveValue(/grabbed the checklist/);
    await expect(page.locator('[data-say-this]')).toHaveText(primaryBefore);
  });

  test('price node never shows a number while the offer price is unset (scenarios 6, 38)', async ({ page }) => {
    await page.goto('/scripts');
    await page.locator('[data-node-id="decision-price"]').click();
    const say = page.locator('[data-say-this]');
    await expect(say).toContainText('Price not approved yet — route to scope conversation');
    await expect(say).not.toContainText('$');
    expect(await say.textContent()).not.toMatch(/\d/);
  });

  test('publishing stores an immutable snapshot and shows its hash', async ({ page }) => {
    await page.goto('/scripts');
    const publish = page.locator('[data-publish]');
    await expect(publish).toBeEnabled();
    await publish.click();
    await expect(page.locator('[data-publish-notice]')).toContainText('Published snapshot');
    const hash = (await page.locator('[data-publication-hash]').first().textContent()) ?? '';
    expect(hash).toMatch(HEX64);
    await expect(page.locator('[data-publications]')).toContainText('frozen wording snapshot');
    await expect(page.locator('[data-publications]')).toContainText('draft');
    // Same content → same hash after reload and re-publish (deduplicated).
    await page.reload();
    await expect(page.locator('[data-publication-hash]').first()).toHaveText(hash);
    await page.locator('[data-publish]').click();
    await expect(page.locator('[data-publication-hash]')).toHaveCount(1);
  });

  test('a citation links to the source record with its classification badge', async ({ page }) => {
    await page.goto('/scripts');
    const link = page.locator('[data-citation="I01"]');
    await expect(link).toBeVisible();
    await expect(page.getByText('adapt (not live approval)').first()).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/sources\/I01$/);
  });

  test('assistance mode masks the line and the practice-only node is labelled', async ({ page }) => {
    await page.goto('/scripts');
    await page.getByLabel('Assistance mode').selectOption('recall_with_reveal');
    await expect(page.locator('[data-say-this-hidden]')).toBeVisible();
    await page.getByRole('button', { name: 'Reveal the line' }).click();
    await expect(page.locator('[data-say-this]')).toBeVisible();
    await page.getByLabel('Assistance mode').selectOption('unassisted');
    await expect(page.locator('[data-say-this-hidden]')).toContainText('Stage: Entry');
    await expect(page.getByRole('heading', { name: 'Next likely branches' })).toHaveCount(0);

    await page.getByLabel('Assistance mode').selectOption('full_script');
    await page.locator('[data-node-id="identity-frame-study"]').click();
    await expect(page.locator('[data-node-card]')).toContainText('study/practice only');
    await expect(page.getByText('private training').first()).toBeVisible();
  });
});
