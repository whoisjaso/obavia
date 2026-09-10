import { expect, test, type Page } from '@playwright/test';

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    // The app ships no favicon; the browser's automatic /favicon.ico probe is not a page error.
    if (msg.type() === 'error' && !msg.location().url.endsWith('/favicon.ico')) errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** A hidden fact from the FICTIONAL "existing vendor, no gap" scenario that is NOT revealed at the entry step. */
const HIDDEN_FACT = 'The caller invents a problem or pushes for a meeting anyway.';
const SCENARIO_LABEL = /Existing-vendor customer with no meaningful gap/;

test.describe('practice', () => {
  test('loads with the mode selector, drill picker and honest labels', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/practice');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Practice');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByText('Choice-based synthetic practice — not a real AI voice call')).toBeVisible();
    await expect(page.locator('[data-mode-copy]')).toHaveText('Reducing assistance is optional and reversible.');
    await expect(page.getByLabel('Mode for this session')).toHaveValue('full_script');
    const picker = page.getByRole('list', { name: 'Drill picker' });
    await expect(picker.getByRole('button')).toHaveCount(10);
    await expect(picker.getByRole('button', { name: /Full mock/ })).toContainText('Choice-based simulation, not an AI voice call');
    await expect(page.locator('[data-practice-status]')).toContainText('Tone: not assessed (text-only)');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('branch classification: answer one item and see separate Memorization and Conversation labels', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/practice');
    await page.getByRole('list', { name: 'Drill picker' }).getByRole('button', { name: /Branch classification/ }).click();
    await expect(page.getByRole('list', { name: 'Drill picker' }).getByRole('button', { name: /Branch classification/ })).toHaveAttribute('aria-pressed', 'true');

    const drill = page.locator('[data-drill-kind="branch_classification"]');
    await expect(drill).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check' })).toBeDisabled();

    const choices = drill.getByRole('group', { name: 'Choices' }).getByRole('button');
    await expect(choices.first()).toBeVisible();
    await choices.first().click();
    await expect(choices.first()).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Check' }).click();

    const result = page.locator('[data-result-panel]');
    await expect(result).toBeVisible();
    await expect(result.getByRole('heading', { level: 3 })).toContainText(/Result: (Correct|Not correct)/);
    await expect(result.getByText('Memorization', { exact: true })).toBeVisible();
    await expect(result.getByText('Conversation', { exact: true })).toBeVisible();
    await expect(result).toContainText('not scored in this drill'); // memorization is not scored here
    await expect(result).toContainText('not assessed (text-only)');

    // The attempt is persisted and summarised under "Assisted" (full_script mode).
    const summary = page.locator('[data-history-summary]');
    await expect(summary).toContainText('Assisted');
    await expect(summary).toContainText('Unassisted');
    await expect(summary.getByText(/^Assisted$/)).toBeVisible();
    await expect(summary).toContainText('1 attempt(s)');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('mode can be switched to unassisted and back; the change is reversible', async ({ page }) => {
    await page.goto('/practice');
    const select = page.getByLabel('Mode for this session');
    await expect(select).toHaveValue('full_script');
    await select.selectOption('unassisted');
    await expect(select).toHaveValue('unassisted');
    await expect(page.getByText('tracked as unassisted')).toBeVisible();
    await expect(page.locator('[data-mode-copy]')).toHaveText('Reducing assistance is optional and reversible.');
    // Unassisted hides the primary line in the assistance block.
    await expect(page.locator('[data-assistance-block]').first()).toContainText('Primary line hidden');
    await select.selectOption('full_script');
    await expect(select).toHaveValue('full_script');
    await expect(page.getByText('tracked as assisted')).toBeVisible();
    await expect(page.locator('[data-assistance-block]').first()).toContainText('Say this:');
  });

  test('full mock shows no hidden facts until the post-session evaluator disclosure is opened', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/practice');
    await page.getByRole('list', { name: 'Drill picker' }).getByRole('button', { name: /Full mock/ }).click();
    const mock = page.locator('[data-drill-kind="full_mock"]');
    await expect(mock).toBeVisible();
    await expect(mock).toContainText('Choice-based simulation, not an AI voice call');

    const scenarioSelect = page.getByLabel('Scenario');
    await scenarioSelect.selectOption('existing-vendor-no-gap');
    await expect(scenarioSelect.locator('option:checked')).toHaveText(SCENARIO_LABEL);
    await expect(mock.locator('[data-coach-view]')).toContainText('General manager of a mid-size franchise store');
    await expect(page.getByText(HIDDEN_FACT)).toHaveCount(0);
    await expect(page.getByText('hidden fact sheet')).toHaveCount(0);

    await page.getByRole('button', { name: 'Start mock' }).click();
    const step = mock.locator('[data-mock-step]');
    await expect(step).toBeVisible();
    await expect(step.locator('[data-synthetic-line]')).toContainText('fictional, not a real prospect');
    await expect(page.getByText(HIDDEN_FACT)).toHaveCount(0);
    await expect(page.locator('[data-evaluator-view]')).toHaveCount(0);

    // Respectful disqualification: end with "no fit" on the never-converts scenario.
    await step.getByRole('group', { name: 'Branch or exit' }).getByRole('button', { name: /End respectfully — no fit/ }).click();
    await page.getByRole('button', { name: 'Advance' }).click();

    const ended = mock.locator('[data-mock-ended]');
    await expect(ended).toBeVisible();
    await expect(ended).toContainText('Mock ended with outcome "no fit"');
    const result = ended.locator('[data-result-panel]');
    await expect(result).toContainText('Result: Correct');
    await expect(result).toContainText('accurate disqualification');
    await expect(result.getByText('Memorization', { exact: true })).toBeVisible();
    await expect(result.getByText('Conversation', { exact: true })).toBeVisible();

    // Still no hidden facts until the disclosure is opened.
    await expect(page.getByText(HIDDEN_FACT)).toHaveCount(0);
    const toggle = page.locator('[data-evaluator-toggle]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const evaluator = page.locator('[data-evaluator-view]');
    await expect(evaluator).toBeVisible();
    await expect(evaluator).toContainText('Post-session evaluator view — hidden fact sheet');
    await expect(evaluator).toContainText('not available during the run');
    await expect(evaluator.getByText(HIDDEN_FACT)).toBeVisible();
    await expect(evaluator).toContainText('this scenario never converts');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('exact recall uses a textarea and scores typed words with separate ratios', async ({ page }) => {
    await page.goto('/practice');
    await page.getByRole('list', { name: 'Drill picker' }).getByRole('button', { name: /^Exact recall/ }).click();
    const box = page.getByLabel('Type the line from memory');
    await expect(box).toBeVisible();
    await box.fill('Hi this is Jason with Apohenia');
    await page.getByRole('button', { name: 'Check' }).click();
    const result = page.locator('[data-result-panel]');
    await expect(result).toContainText('exact match');
    await expect(result).toContainText('word order');
    await expect(result).toContainText('Missing:');
  });
});
