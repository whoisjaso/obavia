import { expect, test, type Page } from '@playwright/test';
import { loadScriptNodes } from '../../packages/domain/src/seeds';
import { demoQueue, knownFactsFor } from '../../packages/domain/src/dialer';
import { resolveSlots } from '../../packages/domain/src/scripts';
import { lineParts, visibleText } from '../../apps/web/src/lib/line-parts';

/**
 * Train (`/practice`, DESIGN_SYSTEM §3.4). Brief rules encoded here: hidden facts never reach the
 * live drill DOM, no-fit is rewarded on a never-converts scenario, Memory and Conversation stay
 * separate, tone is `—` "not assessed (text-only)", the primary line renders verbatim, assisted
 * and unassisted attempts are summarised apart, reducing assistance is optional and reversible.
 */

const VIEWPORTS = [
  { name: 'phone', width: 430, height: 932 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const TONE_NAME = 'Tone not assessed (text-only)';
/** Slots in Train resolve against the FICTIONAL first synthetic record (the same facts the page uses). */
const PRACTICE_FACTS = knownFactsFor(demoQueue()[0]!);
const shownLine = (template: string) => visibleText(lineParts(resolveSlots(template, { knownFacts: PRACTICE_FACTS }).text));
/** A hidden fact from the FICTIONAL "existing vendor, no gap" scenario that is NOT revealed at the entry step. */
const HIDDEN_FACT = 'The caller invents a problem or pushes for a meeting anyway.';
const SCENARIO_TITLE = /Existing-vendor customer with no meaningful gap/;

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.location().url.endsWith('/favicon.ico')) errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Fresh app storage on the first load of the page. */
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

async function expectHiddenH1(page: Page): Promise<void> {
  const h1 = page.locator('h1');
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveText('Practice');
  const box = await h1.boundingBox();
  expect(box).not.toBeNull();
  // ≤1px box (sub-pixel layout can report 1.0000000149 for a 1px sr-only box; anything visibly larger fails).
  expect(Math.max(box!.width, box!.height)).toBeLessThanOrEqual(1.01);
}

async function openDrill(page: Page, label: string): Promise<void> {
  await page.locator(`[data-drill-tile]`, { has: page.locator(`[data-tile="${label}"]`) }).or(page.locator(`[data-drill-tile][data-tile="${label}"]`)).first().click();
}

test.describe('train', () => {
  for (const vp of VIEWPORTS) {
    test(`grid at ${vp.name}: hidden h1, 5-glyph mode control, ten tiles with two rings, no table, no paragraph, no horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await prime(page);
      const errors = trackErrors(page);
      await page.goto('/practice');
      await expectHiddenH1(page);
      await expect(page.locator('[data-practice]')).toHaveAttribute('data-hydrated', 'true');

      const group = page.getByRole('radiogroup', { name: 'Assistance mode' });
      const radios = group.getByRole('radio');
      await expect(radios).toHaveCount(5);
      await expect(group.getByRole('radio', { name: /^Full exact script \(default\)/ })).toHaveAttribute('aria-checked', 'true');
      await expect(group.getByRole('radio', { name: /Tracked as unassisted\.$/ })).toHaveCount(1);
      await expect(page.locator('[data-mode-copy]')).toHaveText('Reducing assistance is optional and reversible.');

      const tiles = page.locator('[data-drill-tile]');
      await expect(tiles).toHaveCount(10);
      await expect(tiles.locator('[data-tile-ring="assisted"]')).toHaveCount(10);
      await expect(tiles.locator('[data-tile-ring="unassisted"]')).toHaveCount(10);
      await expect(page.getByRole('button', { name: /^Mock: .*not an AI voice call/ })).toBeVisible();

      // Stage, not page: no table, no paragraph, one visible demo pill, no horizontal scroll.
      await expect(page.locator('table')).toHaveCount(0);
      await expect(page.locator('main p:visible')).toHaveCount(0);
      await expect(page.locator('[data-demo-pill]:visible')).toHaveCount(1);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width);
      await page.waitForLoadState('networkidle');
      expect(errors).toEqual([]);
    });
  }

  test('branches: one item per screen, big choice tiles, Check hero, result as two rings + tone glyph, tile ring and history update', async ({ page }) => {
    await prime(page);
    const errors = trackErrors(page);
    await page.goto('/practice');
    await expect(page.locator('[data-practice]')).toHaveAttribute('data-hydrated', 'true');
    await openDrill(page, 'Branches');

    const drill = page.locator('[data-drill-kind="branch_classification"]');
    await expect(drill).toBeVisible();
    await expect(page.locator('[data-drill-tile]')).toHaveCount(0); // one drill at a time
    const check = page.getByRole('button', { name: 'Check' });
    await expect(check).toBeDisabled();

    // The line the rep said renders verbatim (primary line unchanged); the prospect line is labelled synthetic.
    const block = drill.locator('[data-assistance-block]');
    await expect(block).toHaveAttribute('data-primary', 'shown');
    const nodeId = await block.getAttribute('data-node-id');
    const node = loadScriptNodes().nodes.find((n) => n.id === nodeId)!;
    await expect(block.locator('[data-primary-line]')).toHaveText(shownLine(node.primary_word_track));
    expect(await block.locator('[data-primary-line]').textContent()).not.toMatch(/[{}⟨⟩]|\[missing:/);
    const synthetic = drill.locator('[data-synthetic-line]');
    if ((await synthetic.count()) > 0) await expect(synthetic).toHaveAttribute('aria-label', /Synthetic prospect line, fictional, not a real prospect/);

    const choices = drill.getByRole('group', { name: 'Choices' }).getByRole('button');
    await expect(choices.first()).toBeVisible();
    // Keyboard: "1" selects the first choice; the button is a real toggle.
    await page.keyboard.press('1');
    await expect(choices.first()).toHaveAttribute('aria-pressed', 'true');
    await expect(check).toBeEnabled();
    await check.click();

    const result = page.locator('[data-result-panel]');
    await expect(result).toBeVisible();
    await expect(result.locator('[data-verdict-text]')).toHaveText(/^(Correct|Not correct)$/);
    await expect(result.locator('[data-score="memory"]').getByText('Memory', { exact: true })).toBeVisible();
    await expect(result.locator('[data-score="conversation"]').getByText('Conversation', { exact: true })).toBeVisible();
    await expect(result.locator('[data-score="memory"]')).toHaveAttribute('data-scored', 'false'); // never mixed: memory is not scored here
    await expect(result.locator('[data-score="conversation"]')).toHaveAttribute('data-scored', 'true');
    await expect(result.getByRole('progressbar', { name: 'Memory: not scored in this drill' })).toBeVisible();
    await expect(result.getByRole('status', { name: TONE_NAME })).toBeVisible();
    await expect(page.locator('[data-practice-live]')).toContainText('Tone not assessed (text-only)');
    await expect(page.getByRole('button', { name: 'Next item' })).toBeVisible();

    // Back to the grid: the assisted ring on the Branches tile now carries one attempt; the unassisted one none.
    await page.getByRole('button', { name: 'Close drill' }).click();
    const tile = page.locator('[data-drill-tile="branch_classification"]');
    await expect(tile.locator('[data-tile-ring="assisted"]')).toHaveAttribute('data-count', '1');
    await expect(tile.locator('[data-tile-ring="unassisted"]')).toHaveAttribute('data-count', '0');
    await expect(tile).toHaveAttribute('aria-label', /Branches, assisted: 1 attempt, objective satisfied [01] of 1\. Branches, unassisted: no attempts yet\./);

    // History sheet: two buckets, never mixed.
    await page.getByRole('button', { name: /^History/ }).click();
    const summary = page.locator('[data-history-summary]');
    await expect(summary).toBeVisible();
    await expect(summary.getByRole('group', { name: 'Assisted: 1 attempts' })).toBeVisible();
    await expect(summary.getByRole('group', { name: 'Unassisted: 0 attempts' })).toBeVisible();
    await expect(summary.locator('[data-bucket="assisted"] [data-stat="attempts"]')).toHaveAttribute('aria-label', 'Attempts: 1');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('assistance mode is reversible: unassisted hides the primary line, full script shows it verbatim', async ({ page }) => {
    await prime(page);
    await page.goto('/practice');
    const group = page.getByRole('radiogroup', { name: 'Assistance mode' });
    await group.getByRole('radio', { name: /^Unassisted/ }).click();
    await expect(group.getByRole('radio', { name: /^Unassisted/ })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('[data-practice]')).toHaveAttribute('data-mode', 'unassisted');

    await openDrill(page, 'Branches');
    const block = page.locator('[data-assistance-block]');
    await expect(block).toHaveAttribute('data-primary', 'hidden');
    await expect(block.locator('[data-primary-line]')).toHaveCount(0);
    await page.keyboard.press('Escape'); // Esc closes the drill

    await group.getByRole('radio', { name: /^Full exact script/ }).click();
    await expect(page.locator('[data-practice]')).toHaveAttribute('data-mode', 'full_script');
    await openDrill(page, 'Branches');
    await expect(block).toHaveAttribute('data-primary', 'shown');
    const nodeId = await block.getAttribute('data-node-id');
    const node = loadScriptNodes().nodes.find((n) => n.id === nodeId)!;
    await expect(block.locator('[data-primary-line]')).toHaveText(shownLine(node.primary_word_track));
    expect(await block.locator('[data-primary-line]').textContent()).not.toMatch(/[{}⟨⟩]|\[missing:/);

    // Arrow keys move the radio selection (roving tabindex).
    await page.getByRole('button', { name: 'Close drill' }).click();
    await group.getByRole('radio', { name: /^Full exact script/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: /^Recall with reveal/ })).toHaveAttribute('aria-checked', 'true');
    await expect(group.getByRole('radio', { name: /^Recall with reveal/ })).toBeFocused();
  });

  test('full mock: scenario tiles → brief → card-by-card run; hidden facts appear only in the post-session evaluator sheet; no-fit is rewarded', async ({ page }) => {
    await prime(page);
    const errors = trackErrors(page);
    await page.goto('/practice');
    await openDrill(page, 'Mock');
    const screen = page.locator('[data-drill-screen="full_mock"]');
    await expect(screen).toHaveAttribute('data-mock-phase', 'pick');
    await expect(page.locator('[data-scenario]')).toHaveCount(10);
    await expect(page.locator('[data-fictional-pill]:visible')).toHaveCount(1);

    await page.getByRole('button', { name: SCENARIO_TITLE }).click();
    await expect(screen).toHaveAttribute('data-mock-phase', 'brief');
    await expect(page.locator('[data-coach-view]')).toContainText('General manager of a mid-size franchise store');
    await expect(page.getByText(HIDDEN_FACT)).toHaveCount(0);

    await page.getByRole('button', { name: /^Start mock/ }).click();
    await expect(screen).toHaveAttribute('data-mock-phase', 'run');
    const step = page.locator('[data-mock-step]');
    await expect(step).toBeVisible();
    await expect(step.locator('[data-synthetic-line]')).toHaveAttribute('aria-label', /fictional, not a real prospect/);
    await expect(step.locator('[data-assistance-block]')).toHaveAttribute('data-primary', 'shown');
    await expect(page.getByText(HIDDEN_FACT)).toHaveCount(0);
    await expect(page.locator('[data-evaluator-view]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Next/ })).toBeDisabled();

    // Respectful disqualification on the never-converts scenario: End → No fit.
    await page.getByRole('button', { name: 'End the mock with an outcome' }).click();
    const endSheet = page.locator('dialog[data-sheet="mock-end"]');
    await expect(endSheet).toBeVisible();
    await expect(endSheet.getByRole('button', { name: 'End respectfully — no fit' })).toBeVisible();
    await endSheet.getByRole('button', { name: 'End respectfully — no fit' }).click();

    const ended = page.locator('[data-mock-ended]');
    await expect(ended).toBeVisible();
    await expect(ended).toHaveAttribute('data-outcome', 'no_fit');
    await expect(ended.locator('[data-mock-outcome]')).toContainText('No fit');
    await expect(ended.getByLabel('Outcome: no fit')).toBeVisible();
    const result = ended.locator('[data-result-panel]');
    await expect(result.locator('[data-verdict-text]')).toHaveText('Correct');
    await expect(result.getByRole('progressbar', { name: /accurate disqualification/ })).toBeVisible();
    await expect(result.locator('[data-score="memory"]')).toHaveAttribute('data-scored', 'false');
    await expect(result.locator('[data-score="memory"]').getByText('Memory', { exact: true })).toBeVisible();
    await expect(result.locator('[data-score="conversation"]').getByText('Conversation', { exact: true })).toBeVisible();
    await expect(result.getByRole('status', { name: TONE_NAME })).toBeVisible();

    // Still no hidden facts until the evaluator sheet is opened.
    await expect(page.getByText(HIDDEN_FACT)).toHaveCount(0);
    const toggle = page.locator('[data-evaluator-toggle]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const evaluator = page.locator('[data-evaluator-view]');
    await expect(evaluator).toBeVisible();
    await expect(evaluator.getByRole('status', { name: 'Post-session evaluator view — hidden fact sheet, not available during the run' })).toBeVisible();
    await expect(evaluator.getByRole('status', { name: /never converts/ })).toBeVisible();
    await expect(evaluator.getByText(HIDDEN_FACT)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText(HIDDEN_FACT)).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('exact recall scores typed words with separate ratios and missing-word chips; on Check the rings replace the textarea in place', async ({ page }) => {
    await prime(page);
    await page.goto('/practice');
    await openDrill(page, 'Recall');
    const block = page.locator('[data-assistance-block]');
    await expect(block).toHaveAttribute('data-primary', 'hidden'); // the drill hides the line regardless of mode
    const box = page.getByLabel('Type the line from memory');
    await expect(box).toBeVisible();
    await box.fill('Hi this is Jason with Apohenia');
    await page.getByRole('button', { name: 'Check' }).click();
    const result = page.locator('[data-result-panel]');
    await expect(result.locator('[data-score="memory"]')).toHaveAttribute('data-scored', 'true');
    await expect(result.locator('[data-score="conversation"]')).toHaveAttribute('data-scored', 'false');
    await expect(result.getByRole('progressbar', { name: /^Memory: exact match \d+%, word order \d+%$/ })).toBeVisible();
    await expect(result.locator('[data-missing-words] span').nth(2)).toBeVisible();
    await expect(box).toHaveCount(0);
    // The result rings sit where the textarea was — above the docked hero, never under the tab bar.
    const resultBox = (await result.boundingBox())!;
    const heroBox = (await page.locator('[data-practice-hero]').boundingBox())!;
    expect(resultBox.y).toBeLessThan(heroBox.y);
    // After checking, the exact line is shown verbatim and locked.
    await expect(page.locator('[data-primary-line]')).toBeVisible();
  });

  test('practice this moment compares original and simulated information as two cards with the disclaimer behind ⓘ', async ({ page }) => {
    await prime(page);
    await page.goto('/practice');
    await openDrill(page, 'Moment');
    await expect(page.locator('[data-moment-card]')).toBeVisible();
    await page.locator('[data-choice-group] button').first().click();
    await page.getByRole('button', { name: 'Check' }).click();
    const compare = page.locator('[data-moment-compare]');
    await expect(compare.locator('[data-compare="original"]')).toBeVisible();
    await expect(compare.locator('[data-compare="simulated"]')).toHaveAttribute('aria-label', /never from a real prospect/);
    await expect(page.locator('[data-result-panel]')).toHaveAttribute('data-verdict', 'self');
    await page.locator('[data-result-info]').click();
    await expect(page.locator('dialog[data-sheet="result-why"]')).toContainText('A simulated alternate outcome is not proof the real prospect would have bought');
  });
});
