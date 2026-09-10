import { expect, test, type Page } from '@playwright/test';

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test('calls list shows synthetic calls with outcome, and the opt-out call is marked do-not-call', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/calls');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Calls');
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(9); // header + 8 synthetic calls
  await expect(table).toContainText('Dana Whitlock');
  await expect(table).toContainText('Opt-out recorded — do not call');
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('call detail shows the review with tone not assessed, the unvalidated rubric, and a persisted correction', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/calls');
  await page.getByRole('link', { name: /Synthetic call A/ }).click();
  await expect(page).toHaveURL(/\/calls\/syn-a-profit-not-revenue$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Call review');
  await expect(page.locator('[data-review-tone]')).toHaveText('not assessed (text-only)');
  await expect(page.getByRole('heading', { name: 'internal training rubric — not validated' })).toBeVisible();
  await expect(page.getByText('Profit: prospect said').first()).toBeVisible();

  // Human correction persists across reload; original stays visible.
  const phrase = page.getByLabel('Phrase');
  await expect(phrase).toBeEnabled();
  await phrase.selectOption({ label: 'Profit — prospect said' });
  await page.getByLabel('Corrected meaning').fill('net profit after pack and internet payroll');
  await page.getByRole('button', { name: 'Save correction' }).click();
  const corrections = page.locator('[data-corrections]');
  await expect(corrections).toContainText('corrected by rep on');
  await expect(corrections).toContainText('net profit after pack and internet payroll');
  await expect(corrections).toContainText('Original meaning');

  await page.reload();
  await expect(page.locator('[data-corrections]')).toContainText('corrected by rep on');
  await expect(page.locator('[data-corrections]')).toContainText('net profit after pack and internet payroll');

  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('prospects, pipeline and insights render their honesty notices', async ({ page }) => {
  await page.goto('/prospects');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Prospects');
  await expect(page.getByText('CSV import — Increment 2')).toBeVisible();
  expect(await page.getByText('Contact policy: requires_review (no reviewed policy yet)').count()).toBeGreaterThanOrEqual(8);
  const callButtons = page.getByRole('button', { name: /Call — unavailable/ });
  expect(await callButtons.count()).toBeGreaterThanOrEqual(8);
  await expect(callButtons.first()).toBeDisabled();

  await page.goto('/pipeline');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pipeline');
  await expect(page.getByText('a view, not permission to message').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Do not call' })).toBeVisible();

  await page.goto('/insights');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Insights');
  await expect(page.getByText('No real calls yet — nothing is counted')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'internal training rubric — not validated' })).toBeVisible();
});
