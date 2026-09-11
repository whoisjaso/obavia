import { expect, test, type Locator, type Page } from '@playwright/test';
import { loadScriptNodes } from '../../packages/domain/src/seeds';
import { demoQueue, knownFactsFor } from '../../packages/domain/src/dialer';
import { resolveSlots } from '../../packages/domain/src/scripts';

/**
 * Dial front door + in-call + outcome (DESIGN_SYSTEM §3.1–3.3, brief §9). Demo mode: the
 * simulator drives outcomes; nothing dials. Countdowns are real time (3 s arm, 5 s cooldown);
 * the synthetic transcript plays at 8× via the `dial.prefs` playback rate so a call fits in seconds.
 */

const VIEWPORTS = [
  { name: 'phone', width: 430, height: 932 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

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

/** Fresh storage + fast playback before every navigation. */
async function prime(page: Page, extra: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript((entries: Record<string, unknown>) => {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('apohenia.v1.')) localStorage.removeItem(k);
      localStorage.setItem('apohenia.v1.dial.prefs', JSON.stringify({ playback_rate: 8 }));
      for (const [k, v] of Object.entries(entries)) localStorage.setItem(`apohenia.v1.${k}`, JSON.stringify(v));
    } catch {
      // storage unavailable: the page still renders
    }
  }, extra);
}

/** The visible card locator for the currently pinned/held cards in whichever rail is on screen. */
function visibleCards(page: Page, selector: string): Locator {
  return page.locator(`${selector}:visible`);
}

async function expectStatus(page: Page, status: string, timeout = 15_000): Promise<void> {
  await expect(page.locator('[data-dial]')).toHaveAttribute('data-status', status, { timeout });
}

/** Expected entry line for the next-up record (same domain functions the screen uses). */
function expectedEntryLine(contactId: string): string {
  const seed = loadScriptNodes();
  const item = demoQueue().find((q) => q.contact_id === contactId);
  if (!item) throw new Error(`no queue item for ${contactId}`);
  const version = seed.versions[0]!;
  const entryId = version.entry_node_ids[item.entrypoint]!;
  const node = seed.nodes.find((n) => n.id === entryId)!;
  return resolveSlots(node.primary_word_track, { knownFacts: knownFactsFor(item) }).text;
}

for (const vp of VIEWPORTS) {
  test.describe(`dial at ${vp.width}x${vp.height} (${vp.name})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await prime(page);
    });

    test('idle: hero is the largest object, fewer than 15 visible words, next-up card, stats at zero', async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto('/');
      const hero = page.locator('[data-hero]');
      await expect(hero).toBeVisible();
      await expect(page.locator('[data-dial]')).toHaveAttribute('data-hydrated', 'true');
      await expectStatus(page, 'idle');

      // Hero is the largest single element on the stage (by area) among visible non-container elements.
      const heroBox = (await hero.boundingBox())!;
      expect(heroBox.width).toBeGreaterThanOrEqual(vp.width < 480 ? 160 : 200);
      const cardBox = (await page.locator('[data-next-up]').boundingBox())!;
      expect(heroBox.width * heroBox.height).toBeGreaterThan(cardBox.height * cardBox.width * 0.9 || 0);
      expect(heroBox.height).toBeGreaterThan(cardBox.height);

      // Word budget: fewer than 15 visible words on the Dial idle screen (alphabetic tokens; numbers and glyphs are not words).
      const words = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('main');
        const nav = document.querySelector<HTMLElement>('nav[aria-label="Primary"]');
        const text = `${main?.innerText ?? ''} ${nav?.innerText ?? ''}`;
        return text.split(/\s+/).filter((t) => /[A-Za-z]{2,}/.test(t));
      });
      expect(words.length, `visible words: ${words.join(' | ')}`).toBeLessThan(15);

      await expect(page.locator('[data-stat="dials"]')).toHaveAttribute('aria-label', 'Dials: 0');
      await expect(page.locator('[data-next-up]')).toHaveAttribute('data-contact-id', 'ct-dana');
      await expect(page.locator('[data-session-timer]')).toHaveCount(0);
      await expect(page.locator('table')).toHaveCount(0);
      await page.waitForLoadState('networkidle');
      expect(errors).toEqual([]);
    });

    test('tap → countdown → Esc cancels (paused); Space resumes; tap again cancels', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-dial]')).toHaveAttribute('data-hydrated', 'true');
      const hero = page.locator('[data-hero]');
      await hero.click();
      await expectStatus(page, 'arming', 3000);
      await expect(page.locator('[data-hero-state="arming"] [data-ring="countdown"]')).toBeVisible();
      await expect(hero).toHaveAttribute('aria-label', /Countdown [123]/);
      await expect(page.locator('[data-session-timer]')).toBeVisible();
      await page.keyboard.press('Escape');
      await expectStatus(page, 'paused', 2000);
      await expect(page.locator('[data-hero-state="paused"]')).toBeVisible();

      // Keyboard: Space on the focused hero resumes the countdown; a second press cancels it again.
      await hero.focus();
      await page.keyboard.press('Space');
      await expectStatus(page, 'arming', 2000);
      await hero.click();
      await expectStatus(page, 'paused', 2000);
      // ✕ ends the session and shows the summary sheet.
      await page.locator('[data-end-session]').click();
      await expect(page.locator('dialog[data-sheet="summary"]')).toBeVisible();
      await page.getByRole('button', { name: 'Done' }).click();
      await expectStatus(page, 'idle', 3000);
    });

    test('full loop: arm → dial → ring → in-call (entry line, ≥3 words, ≥1 reference) → End → 9 outcome tiles → cooldown → next record', async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto('/');
      await expect(page.locator('[data-dial]')).toHaveAttribute('data-hydrated', 'true');
      const nextUp = page.locator('[data-next-up]');
      const firstContact = (await nextUp.getAttribute('data-contact-id'))!;
      expect(firstContact).toBe('ct-dana');

      await page.locator('[data-hero]').click();
      await expectStatus(page, 'arming', 3000);
      await expect(page.locator('[data-hero-caption]')).toHaveText('Cancel');
      await expectStatus(page, 'dialing', 6000);
      await expect(page.locator('[data-hero-caption]')).toHaveText('Dialing');
      await expectStatus(page, 'ringing', 4000);
      await expectStatus(page, 'connected', 6000);

      // In-call appears with the entry node's primary line (slots from the record; never re-flows).
      const incall = page.locator('[data-incall]');
      await expect(incall).toBeVisible();
      const line = page.locator('[data-line-card] [data-primary-line]');
      await expect(line).toHaveText(expectedEntryLine(firstContact));
      const lineBefore = (await page.locator('[data-line-card]').boundingBox())!;
      await expect(page.locator('[data-state-dot="call"]')).toHaveAttribute('aria-label', /simulated/);
      await expect(page.locator('[data-call-timer]')).toBeVisible();

      // Play out (8×): ≥3 THEIR WORDS and ≥1 THEIR REFERENCE at ≥24px, none overlapping the line card.
      const wordCards = visibleCards(page, '[data-word-card]');
      const refCards = visibleCards(page, '[data-ref-card]');
      await expect.poll(async () => wordCards.count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(3);
      await expect.poll(async () => refCards.count(), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
      await expect(line).toHaveText(expectedEntryLine(firstContact));
      const lineAfter = (await page.locator('[data-line-card]').boundingBox())!;
      expect(Math.abs(lineAfter.y - lineBefore.y), 'the line did not move while words arrived').toBeLessThanOrEqual(1);
      expect(lineAfter.height).toBe(lineBefore.height);

      const lineBox = (await page.locator('[data-line-card]').boundingBox())!;
      const cards = [...(await wordCards.all()), ...(await refCards.all())];
      for (const card of cards) {
        const box = (await card.boundingBox())!;
        expect(overlaps(box, lineBox), 'card overlaps the line card').toBe(false);
      }
      for (const el of await page.locator('[data-word-card]:visible [data-word-text], [data-ref-card]:visible [data-ref-label]').all()) {
        expect(await el.evaluate((n) => parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(24);
      }
      await expect(page.locator('[data-word-card]:visible').first()).toContainText(/profit/i);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width);
      if (vp.width >= 1024) {
        // Wide: the rail is a second column to the right of the line.
        const railBox = (await page.locator('[data-words-rail]').boundingBox())!;
        expect(railBox.x).toBeGreaterThan(lineBox.x + lineBox.width - 1);
      }

      // A word card opens its sheet; Esc closes it and does NOT end the call.
      await page.locator('[data-word-card]:visible').first().click();
      await expect(page.locator('dialog[data-sheet="word"]')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog[data-sheet="word"]')).toBeHidden();
      await expectStatus(page, 'connected', 1000);

      // Branch chips: at most 4 visible plus "more"; a chip advances the line.
      const chips = page.locator('[data-branch]');
      expect(await chips.count()).toBeLessThanOrEqual(4);
      await chips.first().click();
      await expect(line).not.toHaveText(expectedEntryLine(firstContact));
      await page.keyboard.press('ArrowLeft');
      await expect(line).toHaveText(expectedEntryLine(firstContact));

      // End → outcome sheet with nine tiles, required (Esc does not close it).
      await page.locator('[data-end-call]').click();
      await expectStatus(page, 'wrapup', 3000);
      const outcome = page.locator('dialog[data-sheet="outcome"]');
      await expect(outcome).toBeVisible();
      await expect(outcome.locator('[data-outcome]')).toHaveCount(9);
      await page.keyboard.press('Escape');
      await expect(outcome).toBeVisible();

      // Callback opens the time tiles; back; then Meeting records and starts the cooldown.
      await outcome.locator('[data-outcome="callback"]').click();
      const when = page.locator('dialog[data-sheet="callback-when"]');
      await expect(when).toBeVisible();
      await expect(when.locator('[data-when]')).toHaveCount(4);
      await page.keyboard.press('Escape');
      await expect(outcome).toBeVisible();
      await outcome.locator('[data-outcome="meeting"]').click();
      await expectStatus(page, 'cooldown', 3000);
      await expect(page.locator('[data-hero-state="cooldown"] [data-ring="countdown"]')).toBeVisible();
      await expect(page.locator('[data-stat="dials"]')).toHaveAttribute('aria-label', 'Dials: 1');
      await expect(page.locator('[data-stat="next steps"]')).toHaveAttribute('aria-label', 'Next steps: 1');

      // The Next-up card changed to the next record; cooldown arms it automatically.
      await expect(nextUp).not.toHaveAttribute('data-contact-id', firstContact);
      const second = (await nextUp.getAttribute('data-contact-id'))!;
      await expectStatus(page, 'arming', 8000);
      await expect(nextUp).toHaveAttribute('data-contact-id', second);

      // ⏸ (hero) pauses; ✕ ends the session.
      await page.locator('[data-hero]').click();
      await expectStatus(page, 'paused', 2000);
      await page.locator('[data-end-session]').click();
      await expect(page.locator('dialog[data-sheet="summary"]')).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}

test.describe('suppression', () => {
  test('"Do not call" removes that number from later dials and a toast confirms it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await prime(page);
    await page.goto('/');
    await expect(page.locator('[data-dial]')).toHaveAttribute('data-hydrated', 'true');
    const nextUp = page.locator('[data-next-up]');
    await expect(nextUp).toHaveAttribute('data-contact-id', 'ct-dana');
    await page.locator('[data-hero]').click();
    await expectStatus(page, 'connected', 15_000);
    await page.locator('[data-end-call]').click();
    const outcome = page.locator('dialog[data-sheet="outcome"]');
    await outcome.locator('[data-outcome="do_not_call"]').click();
    await expect(page.locator('[data-toast]')).toContainText(/Suppressed/);
    await expectStatus(page, 'cooldown', 3000);
    await expect(nextUp).not.toHaveAttribute('data-contact-id', 'ct-dana');

    // End the session; the durable list keeps the number out of the next session and the next-up card.
    await page.locator('[data-end-session]').click();
    await page.getByRole('button', { name: 'Done' }).click();
    await expectStatus(page, 'idle', 3000);
    await expect(nextUp).not.toHaveAttribute('data-contact-id', 'ct-dana');
    const suppression = await page.evaluate(() => JSON.parse(localStorage.getItem('apohenia.v1.dial.suppression') ?? '[]') as { phone: string; reason: string }[]);
    expect(suppression).toEqual([expect.objectContaining({ phone: '+15550100001', reason: 'do_not_call' })]);
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem('apohenia.v1.dial.history') ?? '[]') as { attempts: { disposition: { kind: string } | null }[] }[]);
    expect(history).toHaveLength(1);
    expect(history[0]!.attempts.find((a) => a.disposition)?.disposition?.kind).toBe('do_not_call');

    // Reload: still suppressed, still idle, no stray session.
    await page.reload();
    await expect(page.locator('[data-dial]')).toHaveAttribute('data-hydrated', 'true');
    await expectStatus(page, 'idle');
    await expect(nextUp).not.toHaveAttribute('data-contact-id', 'ct-dana');
  });

  test('a queue with nothing dialable shows ∅ and one tile to the queue', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    const all = demoQueue().map((q) => ({ phone: q.phone, item_id: q.id, contact: q.contact, at: '2026-09-11T00:00:00.000Z', reason: 'do_not_call', session_id: null }));
    await prime(page, { 'dial.suppression': all });
    await page.goto('/');
    await expect(page.locator('[data-dial]')).toHaveAttribute('data-hydrated', 'true');
    await expect(page.locator('[data-queue-empty]')).toBeVisible();
    await expect(page.locator('[data-queue-empty]')).toContainText('Queue empty');
    await expect(page.getByRole('link', { name: 'Add prospects' })).toHaveAttribute('href', '/prospects');
    await expect(page.locator('[data-hero]')).toHaveCount(0);
  });
});
