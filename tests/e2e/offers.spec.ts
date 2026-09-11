import { expect, test, type Page } from '@playwright/test';

/**
 * Offers (DESIGN_SYSTEM §3.5): cards; a blank price is the caption "Not set" (never a dash, never $0) with
 * the accessible name "Price not set: a blank price is not $0"; the fictional fixture carries the Fictional pill and lives behind the Practice
 * chip, never in the default list (B-9: the default chip is "Offers"); status moves through a
 * confirm sheet and is the one store /scripts reads (B-12).
 */

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

async function prime(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('e2e.primed')) return;
      sessionStorage.setItem('e2e.primed', '1');
      for (const k of Object.keys(localStorage)) if (k.startsWith('apohenia.v1.')) localStorage.removeItem(k);
    } catch {
      // storage unavailable: the page still renders
    }
  });
}

/** Two lines on the stage (a line break, never a dash); Playwright normalises the whitespace. */
const BANNER = 'FICTIONAL TRAINING OFFER NOT A REAL QUOTE';
const LIVE = '[data-offer="draft-research-offer-v0"]';
const FIXTURE = '[data-offer="fictional-demo-inquiry-pilot"]';

test.describe('offers', () => {
  test.beforeEach(async ({ page }) => {
    await prime(page);
  });

  test('default list is "Offers": the draft research offer with a "Not set" price and its accessible truth; the fixture is absent', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/offers');
    const h1 = page.locator('h1');
    await expect(h1).toHaveText('Offers');
    const box = await h1.boundingBox();
    // ≤1px box (sub-pixel layout can report 1.0000000149 for a 1px sr-only box; anything visibly larger fails).
  expect(Math.max(box!.width, box!.height)).toBeLessThanOrEqual(1.01);
    const offersChip = page.locator('[data-filter="offers"]');
    await expect(offersChip).toHaveText('Offers');
    await expect(offersChip).toHaveAttribute('aria-pressed', 'true');

    const live = page.locator(LIVE);
    await expect(live).toBeVisible();
    await expect(live).toHaveAttribute('data-offer-kind', 'live');
    await expect(live).toHaveAttribute('data-offer-status', 'draft');
    await expect(live.locator('[data-status-pill="draft"]')).toHaveAttribute('aria-label', /Draft: written, not reviewed/);
    await expect(live.locator('[data-status-pill="draft"]')).not.toContainText(/draft/i); // a quiet mark, never a DRAFT chip
    const setup = live.locator('[data-price="setup"]');
    await expect(setup).toHaveText('Not set');
    await expect(setup).toHaveAttribute('aria-label', 'Setup: Price not set: a blank price is not $0');
    await expect(live.locator('[data-price="recurring"]')).toHaveAttribute('aria-label', 'Recurring: Price not set: a blank price is not $0');
    await expect(live.getByRole('list', { name: 'Three pillars' }).getByRole('listitem')).toHaveCount(3);

    await expect(page.locator(FIXTURE)).toHaveCount(0);
    await expect(page.getByText(BANNER)).toHaveCount(0);
    await expect(page.locator('table')).toHaveCount(0);
    await expect(page.locator('[data-demo-pill]:visible')).toHaveCount(1);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('the offer sheet shows every field with h3 captions and the blank-price caption', async ({ page }) => {
    await page.goto('/offers');
    await page.locator(LIVE).click();
    const sheet = page.locator('dialog[data-sheet="offer"]');
    await expect(sheet.locator('[data-offer-sheet="draft-research-offer-v0"]')).toBeVisible();
    for (const name of ['Price', 'Timing', 'Pillars', 'Buyer', 'Problem', 'Prerequisites', 'Deliverables', 'Exclusions', 'Dependencies', 'Proof', 'Claims', 'Acceptance', 'Roles', 'Support', 'Exit']) {
      await expect(sheet.getByRole('heading', { level: 3, name })).toBeVisible();
    }
    await expect(sheet.getByRole('heading', { level: 2 })).toHaveCount(1);
    await expect(sheet.locator('[data-blank-price-note]')).toHaveAttribute('aria-label', /a blank price is not \$0/);
    await expect(sheet.locator('[data-price="sheet-setup"]')).toHaveText('Not set');
    await expect(sheet.getByRole('region', { name: 'Proof' })).toContainText('none yet');
  });

  test('the fictional fixture appears only under Practice, with ✦ Fictional, its banner and no status controls', async ({ page }) => {
    await page.goto('/offers');
    await page.locator('[data-filter="practice"]').click();
    const fixture = page.locator(FIXTURE);
    await expect(fixture).toBeVisible();
    await expect(fixture).toHaveAttribute('data-offer-kind', 'practice');
    await expect(fixture.locator('[data-fictional-pill]')).toHaveAttribute('aria-label', /Fictional training content/);
    await expect(fixture.locator('[data-price="setup"]')).toHaveText('$750.00');
    await expect(fixture.locator('[data-price="setup"]')).toHaveAttribute('aria-label', /fictional fixture \$750\.00, never quoted live/);
    await expect(fixture.locator('[data-price="recurring"]')).toHaveText('$150.00');
    await expect(page.locator(LIVE)).toHaveCount(0);
    await fixture.click();
    const sheet = page.locator('dialog[data-sheet="offer"]');
    await expect(sheet.locator('[data-fictional-banner]')).toHaveText(BANNER);
    await expect(sheet.locator('[data-fictional-banner]')).not.toContainText('—');
    await expect(sheet.locator('[data-practice-only]')).toBeVisible();
    await expect(sheet.locator('[data-never-quoted]')).toHaveAttribute('aria-label', /quotable: no/);
    await expect(sheet.locator('[data-transition]')).toHaveCount(0);
  });

  test('status moves draft → reviewed → published through a confirm sheet, then is read-only, persists, and /scripts reads it (B-12)', async ({ page }) => {
    await page.goto('/offers');
    await page.locator(LIVE).click();
    const sheet = page.locator('dialog[data-sheet="offer"]');
    await expect(sheet.locator('[data-sheet-status="draft"]')).toContainText('Draft offer. Not approved for live use.');
    await sheet.locator('[data-transition="reviewed"]').click();
    await expect(sheet.locator('[data-sheet-status="reviewed"]')).toBeVisible();
    await sheet.locator('[data-transition="published"]').click();
    const confirm = page.locator('dialog[data-sheet="confirm"]');
    await expect(confirm).toBeVisible();
    await expect(confirm.locator('[data-confirm-caption]')).toContainText('price stays unset');
    await page.keyboard.press('Escape');
    await expect(confirm).toBeHidden();
    await expect(sheet.locator('[data-sheet-status="reviewed"]')).toBeVisible();
    await sheet.locator('[data-transition="published"]').click();
    await confirm.locator('[data-confirm-transition]').click();
    await expect(confirm).toBeHidden();
    await expect(sheet.locator('[data-sheet-status="published"]')).toBeVisible();
    await expect(sheet.locator('[data-read-only]')).toBeVisible();
    await expect(sheet.locator('[data-transition="reviewed"]')).toHaveCount(0);
    await expect(sheet.locator('[data-transition="retired"]')).toHaveCount(1);
    // Publishing does not invent a price.
    await expect(sheet.locator('[data-price="sheet-setup"]')).toHaveText('Not set');
    await page.keyboard.press('Escape');
    await expect(page.locator(LIVE)).toHaveAttribute('data-offer-status', 'published');
    await page.reload();
    await expect(page.locator(LIVE)).toHaveAttribute('data-offer-status', 'published');

    // The script screen reads the same store: the offer pill is published and pillar wording now speaks.
    await page.goto('/scripts');
    await page.locator('[data-status-open]').click();
    await expect(page.locator('dialog[data-sheet="status"] [data-offer-pill="published"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[data-stage-rail] [data-stage="pitch"]').click();
    await expect(page.locator('[data-node-card][data-node-id="pitch-pillar-1"] [data-primary-line]')).toContainText('Same-day inquiry response');
  });
});
