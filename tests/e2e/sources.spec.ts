import { expect, test, type Page } from '@playwright/test';

/**
 * Source Library (DESIGN_SYSTEM §3.5): search field + card list with id chip · title ·
 * classification glyph; Source A / Source B as two chips (never merged); section chips; the
 * named-but-missing register and coverage behind icon buttons; each /sources/[id] record is a
 * full-screen card with the excerpt as hero text, offsets, a verification-pending glyph and
 * (for study_only / private_training) the ⊘ glyph carrying the Source-only notice.
 */

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon\.ico/.test(msg.location()?.url ?? '')) errors.push(`console.error: ${msg.text()}`);
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

async function expectHiddenH1(page: Page, text: string): Promise<void> {
  const h1 = page.locator('h1');
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveText(text);
  const box = await h1.boundingBox();
  expect(Math.max(box!.width, box!.height)).toBeLessThanOrEqual(1);
}

test.describe('source library list', () => {
  test.beforeEach(async ({ page }) => {
    await prime(page);
  });

  test('Source A and Source B are two chips and two lists, never merged; private glyph; no table', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/sources');
    await expectHiddenH1(page, 'Sources');
    await expect(page.locator('[data-private-notice]')).toHaveAttribute('aria-label', /Private by default/);

    const chipA = page.locator('[data-source-chip="A"]');
    const chipB = page.locator('[data-source-chip="B"]');
    await expect(chipA).toHaveAttribute('aria-pressed', 'true');
    await expect(chipB).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-source-panel="A"] [data-record-id]')).toHaveCount(144);
    await expect(page.locator('[data-source-panel="A"] [data-record-id="I01"]')).toBeVisible();
    await expect(page.locator('[data-source-panel="B"]')).toHaveCount(0);
    await expect(page.locator('[data-results-status]')).toContainText('Source A 144, Source B 63');
    await expect(page.locator('[data-stat="matching records in source a"]')).toHaveAttribute('aria-label', 'Matching records in Source A: 144');
    // Each card: id chip, title, classification glyph with its full meaning.
    const i01 = page.locator('[data-record-id="I01"]');
    await expect(i01.locator('[data-chip="I01"]')).toBeVisible();
    await expect(i01.locator('[data-classification="adapt"]')).toHaveAttribute('aria-label', /Adapt — study material.*not live approval/);

    await chipB.click();
    await expect(chipB).toHaveAttribute('aria-pressed', 'true');
    await expect(chipA).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-source-panel="B"] [data-record-id]')).toHaveCount(63);
    await expect(page.locator('[data-source-panel="B"] [data-record-id="I01"]')).toHaveCount(0);
    await expect(page.locator('[data-source-panel="A"]')).toHaveCount(0);

    await expect(page.locator('table')).toHaveCount(0);
    await expect(page.locator('[data-demo-pill]:visible')).toHaveCount(1);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('study_only chip filters to 33 across both sources with the ⊘ glyph; clear restores everything', async ({ page }) => {
    await page.goto('/sources');
    const chip = page.locator('[data-classification-chip="study_only"]');
    await expect(chip).toHaveAttribute('aria-label', /Study only:/);
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-results-status]')).toContainText('Source A 21, Source B 12');
    await expect(page.locator('[data-source-panel="A"] [data-record-id]')).toHaveCount(21);
    await expect(page.locator('[data-source-panel="A"] [data-record-id="D01"] [data-classification="study_only"]')).toHaveAttribute('aria-label', /Study only — readable for study; never a live recommendation/);
    await page.locator('[data-clear-filters]').click();
    await expect(page.locator('[data-source-panel="A"] [data-record-id]')).toHaveCount(144);
  });

  test('search narrows results and a section chip filters within its source', async ({ page }) => {
    await page.goto('/sources');
    // Two real records share this title (L07 in A02 and V08 in A13) — the count must reflect both.
    await page.locator('[data-search]').fill('change desired');
    await expect(page.locator('[data-results-status]')).toContainText('2 matching records in Source A; Source A 2, Source B 0');
    await expect(page.locator('[data-source-panel="A"] [data-record-id="L07"]')).toBeVisible();
    await expect(page.locator('[data-source-panel="A"] [data-record-id="V08"]')).toBeVisible();
    await page.locator('[data-search]').fill('');

    const section = page.locator('[data-section-rail="A"] [data-section-id="A01"]');
    await section.click();
    await expect(section).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-source-panel="A"] [data-record-id]')).toHaveCount(4);
    await expect(section).toHaveAttribute('aria-label', /4 of 4 records/);
  });

  test('named-only sections are ∅ chips with the "no records supplied" truth in both rails', async ({ page }) => {
    await page.goto('/sources');
    const a08 = page.locator('[data-section-rail="A"] [data-named-only][data-section-id="A08"]');
    await expect(a08).toBeVisible();
    await expect(a08).toHaveAttribute('aria-label', /no records supplied/);
    await expect(page.locator('[data-section-rail="A"] [data-named-only]')).toHaveCount(1);
    await page.locator('[data-source-chip="B"]').click();
    await expect(page.locator('[data-section-rail="B"] [data-named-only]')).toHaveCount(12);
    await expect(page.locator('[data-section-rail="B"] [data-named-only][data-section-id="B22"]')).toHaveAttribute('aria-label', /no records supplied/);
  });

  test('the missing register is a sheet of ⊘ cards; the four-frame entry states exactly what is supplied (B-7)', async ({ page }) => {
    await page.goto('/sources');
    await page.locator('[data-open-missing]').click();
    const register = page.locator('dialog[data-sheet="missing"]');
    await expect(register.locator('[data-missing-id="raw_source_a"]')).toHaveAttribute('aria-label', /marked missing, not reconstructed/);
    await register.locator('[data-missing-id="four_frame_fear_set"]').click();
    const item = page.locator('dialog[data-sheet="missing-item"]');
    await expect(item.locator('[data-missing-item="four_frame_fear_set"]')).toBeVisible();
    await expect(item.locator('[data-missing-marker]')).toHaveAttribute('aria-label', 'Marked missing — not reconstructed');
    const supplied = item.locator('[data-what-is-supplied]');
    await expect(supplied).toContainText('Two fragmentary study_only analogies');
    await expect(supplied).toContainText('None of the 207 supplied records');
    await expect(supplied).not.toContainText('fully worked');
  });

  test('coverage is rings and numbers behind ⓘ', async ({ page }) => {
    await page.goto('/sources');
    await page.locator('[data-open-coverage]').click();
    const cov = page.locator('dialog[data-sheet="coverage"] [data-coverage]');
    await expect(cov).toBeVisible();
    await expect(cov.locator('[data-stat="records"]')).toHaveAttribute('aria-label', 'Records: 207');
    await expect(cov.getByRole('progressbar', { name: /Hash verified: 0 of 207/ })).toHaveAttribute('aria-valuenow', '0');
    await expect(cov.locator('[data-raw-sources="no"]')).toBeVisible();
  });
});

test.describe('source record detail', () => {
  test('D01 (study_only) carries the ⊘ Source-only glyph, offsets and the verification-pending glyph', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/sources/D01');
    await expectHiddenH1(page, 'D01 — deceptive status deflation');
    await expect(page.locator('[data-record="D01"]')).toHaveAttribute('data-live-eligible', 'no');
    const glyph = page.locator('[data-source-only-notice]');
    await expect(glyph).toHaveAttribute('aria-label', /Source-only: readable for study; not a live recommendation/);
    await expect(glyph).toHaveAttribute('data-classification', 'study_only');
    await expect(page.locator('[data-offsets]')).toHaveText('[80241, 80817)');
    await expect(page.locator('[data-offsets-chip]')).toHaveAttribute('aria-label', /code-point offsets/);
    await expect(page.locator('[data-excerpt-label]')).toHaveAttribute('aria-label', 'Unchanged source excerpt · verification pending (raw sources not supplied)');
    await expect(page.locator('[data-template-label]')).toHaveAttribute('aria-label', /normalized template — not verbatim/);
    await page.locator('[data-open-overlay]').click();
    await expect(page.locator('dialog[data-sheet="overlay"] [data-delivery-overlay]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('table')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('L07: excerpt is the selectable hero, counterpart chip deep-links into the script, pager moves to L08', async ({ page }) => {
    await page.goto('/sources/L07');
    await expectHiddenH1(page, 'L07 — change desired');
    await expect(page.locator('[data-source-only-notice]')).toHaveCount(0);
    const excerpt = page.locator('blockquote[data-excerpt]');
    await expect(excerpt).toContainText('is there is there anything you would change about either like the the the fitness regime');
    expect(await excerpt.evaluate((el) => getComputedStyle(el).userSelect)).not.toBe('none');
    const excerptSize = await excerpt.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const templateSize = await page.locator('[data-template]').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(excerptSize).toBeGreaterThan(templateSize);
    await expect(page.locator('[data-template]')).toHaveText('Is there anything you would change about either [process] or [results], if you could?');
    await expect(page.locator('[data-offsets]')).toHaveText('[15030, 15628)');

    const counterparts = page.locator('[data-counterparts]');
    const state = await counterparts.getAttribute('data-counterparts');
    if (state !== 'none') {
      const link = counterparts.locator('[data-counterpart]').first();
      const nodeId = (await link.getAttribute('data-counterpart')) ?? '';
      await expect(link).toHaveAttribute('href', `/scripts?node=${nodeId}`);
      await link.click();
      await expect(page).toHaveURL(/\/scripts\?node=/);
      await expect(page.locator('[data-scripts]')).toHaveAttribute('data-current-node', nodeId);
      await page.goBack();
      await expect(page).toHaveURL(/\/sources\/L07$/);
    }

    const pager = page.getByRole('navigation', { name: 'Record pager' });
    await expect(pager.getByRole('link', { name: /Previous: L06/ })).toBeVisible();
    await pager.getByRole('link', { name: /Next: L08/ }).click();
    await expect(page).toHaveURL(/\/sources\/L08$/);
    await expect(page.locator('h1')).toContainText('L08');
  });

  test('an unknown record id is a 404, never an invented record', async ({ page }) => {
    const response = await page.goto('/sources/ZZ99');
    expect(response?.status()).toBe(404);
  });
});
