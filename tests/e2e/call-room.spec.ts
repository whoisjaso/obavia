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

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function within(inner: Box, outer: Box): boolean {
  const eps = 1;
  return (
    inner.x >= outer.x - eps &&
    inner.y >= outer.y - eps &&
    inner.x + inner.width <= outer.x + outer.width + eps &&
    inner.y + inner.height <= outer.y + outer.height + eps
  );
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
]) {
  test(`call room at ${viewport.width}x${viewport.height}: three or more pins, no overlap, readable size`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = trackErrors(page);
    await page.goto('/call-room');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Call Room');
    await expect(page.getByText('Demo: synthetic transcript. No microphone, no phone, no model.')).toBeVisible();

    // Independent state chips and permission list are text, not color.
    await expect(page.getByText('Not connected (demo)')).toBeVisible();
    await expect(page.getByText('Off (no model in Increment 1)')).toBeVisible();
    expect(await page.getByText('Not granted · demo').count()).toBe(6);

    // Play the first synthetic call (A: profit, not revenue).
    await page.getByRole('button', { name: 'Play all' }).click();
    const strip = page.locator('[data-their-words]');
    const pins = strip.locator('[data-pin]');
    await expect(pins.first()).toBeVisible();
    const count = await pins.count();
    expect(count).toBeGreaterThanOrEqual(3);
    await expect(pins.first()).toContainText(/profit/i);
    await expect(strip).toContainText('PROFIT — rejected: revenue');
    await expect(strip).toContainText('prospect said');

    // Bounding boxes: pairwise non-overlapping, each inside the strip, and no horizontal page scroll.
    const stripBox = (await strip.boundingBox())!;
    const boxes: Box[] = [];
    for (let i = 0; i < count; i += 1) {
      const box = await pins.nth(i).boundingBox();
      expect(box, `pin ${i} has a box`).not.toBeNull();
      boxes.push(box!);
    }
    for (let i = 0; i < boxes.length; i += 1) {
      expect(within(boxes[i]!, stripBox), `pin ${i} inside strip`).toBe(true);
      for (let j = i + 1; j < boxes.length; j += 1) {
        expect(overlaps(boxes[i]!, boxes[j]!), `pins ${i} and ${j} overlap`).toBe(false);
      }
    }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);

    // The branch <select> (sized by its longest option) must stay inside the centre card, not bleed into the strip column.
    const branchSelect = page.getByRole('combobox', { name: 'Select branch' });
    const selectBox = (await branchSelect.boundingBox())!;
    expect(selectBox.x + selectBox.width, 'branch select ends before the THEIR WORDS strip').toBeLessThanOrEqual(stripBox.x);

    // Font size >= 24px and A+ increases it.
    const texts = strip.locator('[data-pin-text]');
    const sizeBefore = await texts.first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(sizeBefore).toBeGreaterThanOrEqual(24);
    await page.getByRole('button', { name: 'Increase their-words size' }).click();
    const sizeAfter = await texts.first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(sizeAfter).toBeGreaterThan(sizeBefore);
    for (let i = 0; i < (await texts.count()); i += 1) {
      expect(await texts.nth(i).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(24);
    }

    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
}

test('keyboard: Delete unpins the focused pin and P pins the focused candidate', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/call-room');
  await page.getByRole('button', { name: 'Play all' }).click();
  const strip = page.locator('[data-their-words]');
  const pins = strip.locator('[data-pin]');
  await expect(pins.first()).toBeVisible();
  const before = await pins.count();

  // Unpin the second pin with Delete.
  const secondId = await pins.nth(1).getAttribute('data-event-id');
  await pins.nth(1).focus();
  await page.keyboard.press('Delete');
  await expect(pins).toHaveCount(before - 1);
  await expect(page.locator('[data-strip-status]')).toContainText('Unpinned');

  // It now appears as a candidate; P pins it again.
  const candidate = page.locator(`[data-candidate][data-event-id="${secondId}"]`);
  await expect(candidate).toBeVisible();
  await candidate.focus();
  await page.keyboard.press('p');
  await expect(pins).toHaveCount(before);
  await expect(page.locator('[data-strip-status]')).toContainText('Pinned');
  await expect(strip.locator(`[data-pin][data-event-id="${secondId}"]`)).toBeVisible();

  // The stage explanation is a collapsible; the manual-advance note is visible.
  await expect(page.getByText(/Manual advance/)).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('pinned slots stay put as new turns arrive', async ({ page }) => {
  await page.goto('/call-room');
  const next = page.getByRole('button', { name: 'Play next turn' });
  for (let i = 0; i < 8; i += 1) await next.click(); // through "Profit, not revenue."
  const strip = page.locator('[data-their-words]');
  const pins = strip.locator('[data-pin]');
  await expect(pins.first()).toContainText(/profit/i);
  const firstId = await pins.first().getAttribute('data-event-id');
  await page.getByRole('button', { name: 'Play all' }).click();
  await expect(pins.first()).toHaveAttribute('data-event-id', firstId!);
  expect(await pins.count()).toBeGreaterThanOrEqual(3);
});
