import { expect, test, type Page } from '@playwright/test';
import { loadScriptNodes, loadSyntheticTranscripts } from '../../packages/domain/src/seeds';
import { demoQueue, knownFactsFor } from '../../packages/domain/src/dialer';
import { resolveSlots } from '../../packages/domain/src/scripts';

/**
 * Queue (/prospects), History (/calls + /calls/[id]) and Follow-ups (/pipeline): DESIGN_SYSTEM §3.7.
 * Cards, glyph chips and sheets; no table, no dial control outside `/`. Session data comes from the
 * browser's `dial.history` / `dial.suppression`, primed here exactly as the Dial screen writes it.
 */

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Fresh storage on the FIRST load (reloads keep what the app persisted). */
async function prime(page: Page, extra: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript((entries: Record<string, unknown>) => {
    try {
      if (sessionStorage.getItem('e2e.primed')) return;
      sessionStorage.setItem('e2e.primed', '1');
      for (const k of Object.keys(localStorage)) if (k.startsWith('apohenia.v1.')) localStorage.removeItem(k);
      for (const [k, v] of Object.entries(entries)) localStorage.setItem(`apohenia.v1.${k}`, JSON.stringify(v));
    } catch {
      // storage unavailable: the page still renders
    }
  }, extra);
}

/** The route's single h1 exists for assistive tech but is not painted (≤1px box). */
async function expectHiddenH1(page: Page, text: string): Promise<void> {
  const h1 = page.locator('h1');
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveText(text);
  const box = await h1.boundingBox();
  expect(box).not.toBeNull();
  // ≤1px box (sub-pixel layout can report 1.0000000149 for a 1px sr-only box; anything visibly larger fails).
  expect(Math.max(box!.width, box!.height)).toBeLessThanOrEqual(1.01);
}

/** Expected entry line for a record (same domain functions the screen uses). */
function expectedEntryLine(contactId: string): string {
  const seed = loadScriptNodes();
  const item = demoQueue().find((q) => q.contact_id === contactId);
  if (!item) throw new Error(`no queue item for ${contactId}`);
  const version = seed.versions[0]!;
  const node = seed.nodes.find((n) => n.id === version.entry_node_ids[item.entrypoint]!)!;
  return resolveSlots(node.primary_word_track, { knownFacts: knownFactsFor(item) }).text;
}

const TOMORROW = new Date(Date.now() + 24 * 3600_000).toISOString();

/** One ended demo session as the Dial screen archives it: callback (with time), meeting, no answer, do not call. */
function attempt(n: number, kind: string, extra: Record<string, unknown> = {}) {
  const q = demoQueue()[n - 1]!;
  return {
    id: `att-${n}`,
    n,
    item_id: q.id,
    phone: q.phone,
    contact: q.contact,
    company: q.company,
    started_at: `2026-09-11T10:0${n}:00.000Z`,
    status: 'done',
    dial_result: kind === 'no_answer' ? 'no_answer' : 'connected',
    connected_at: kind === 'no_answer' ? null : `2026-09-11T10:0${n}:05.000Z`,
    ended_at: `2026-09-11T10:0${n}:40.000Z`,
    talk_ms: kind === 'no_answer' ? 0 : 35_000,
    disposition: { kind, at: `2026-09-11T10:0${n}:45.000Z`, ...extra },
    transcript_id: kind === 'no_answer' ? null : (q.call_id ?? 'syn-a-profit-not-revenue'),
    skip_reasons: [],
  };
}
const SESSION = {
  id: 'dial-e2e-1',
  mode: 'demo',
  started_at: '2026-09-11T10:00:00.000Z',
  ended_at: '2026-09-11T10:09:00.000Z',
  ended_reason: 'user',
  stats: { dials: 4, connects: 3, talked: 2, next_steps: 2, talk_ms: 105_000, session_ms: 540_000 },
  attempts: [attempt(1, 'callback', { callback_at: TOMORROW }), attempt(2, 'meeting'), attempt(3, 'no_answer'), attempt(4, 'do_not_call')],
};

test.describe('Queue /prospects', () => {
  test('cards with avatar, company, contact, city and a status glyph; DNC from dial.suppression; no dial control; search and Import sheets', async ({ page }) => {
    const errors = trackErrors(page);
    const dana = demoQueue()[0]!;
    await prime(page, { 'dial.suppression': [{ phone: dana.phone, item_id: dana.id, contact: dana.contact, at: '2026-09-11T00:00:00.000Z', reason: 'do_not_call', session_id: null }] });
    await page.goto('/prospects');
    await expectHiddenH1(page, 'Prospects');
    await expect(page.locator('[data-queue]')).toHaveAttribute('data-hydrated', 'true');

    const cards = page.locator('[data-prospect-list] [data-prospect-card]');
    await expect(cards).toHaveCount(demoQueue().length);
    await expect(cards.first().locator('[data-avatar]')).toBeVisible();
    await expect(cards.first()).toContainText('Riverbend Motors');
    await expect(cards.first()).toContainText('Dana Whitlock');
    await expect(cards.first()).toContainText('Round Rock');

    // Status pills only where the policy deviates from OK: the seed's opt-out AND the durable suppression both read DNC.
    // A default (allowed) row carries no mark; its policy truth lives in the card's accessible name.
    await expect(page.locator('[data-prospect-list] [data-prospect-card][data-policy="suppressed"]')).toHaveCount(2);
    await expect(page.locator('[data-prospect-list] [data-prospect-card][data-contact-id="ct-dana"]')).toHaveAttribute('data-policy', 'suppressed');
    await expect(page.locator('[data-prospect-list] [data-prospect-card][data-contact-id="ct-victor"] [data-chip]')).toHaveAttribute('aria-label', /Do not call/);
    await expect(page.locator('[data-prospect-list] [data-prospect-card][data-policy="allow"]').first()).toHaveAttribute('aria-label', /no real call is placed/);
    await expect(page.locator('[data-prospect-list] [data-prospect-card][data-policy="allow"] [data-chip]')).toHaveCount(0);
    // Names never truncate at phone width: the name wraps instead of clipping to an ellipsis.
    await page.setViewportSize({ width: 430, height: 932 });
    for (const el of await page.locator('[data-prospect-list] [data-prospect-card] [data-avatar] + * > :first-child').all()) {
      expect(await el.evaluate((n) => n.scrollWidth <= n.clientWidth + 1)).toBe(true);
    }

    // No dial control anywhere on this screen; no table.
    await expect(page.locator('[data-hero]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Call|Dial)\b/ })).toHaveCount(0);
    await expect(page.locator('table')).toHaveCount(0);

    // Record sheet: a readable number (E.164 stays in the accessible name), chips, still no dial control.
    await cards.nth(1).click();
    const record = page.locator('dialog[data-sheet="record"]');
    await expect(record).toBeVisible();
    await expect(record.locator('[data-record-phone]')).toHaveAttribute('aria-label', /\+1555010/);
    await expect(record.locator('[data-record-phone]')).toContainText(/\(555\) 010-\d{4}$/); // readable, not E.164
    await expect(record).not.toContainText('America/');
    await expect(record.locator('[data-fictional-pill]')).toBeVisible();
    await expect(record.getByRole('button', { name: /^(Call|Dial)\b/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(record).toBeHidden();

    // Search sheet filters by contact.
    await page.locator('[data-search]').click();
    const search = page.locator('dialog[data-sheet="search"]');
    await expect(search).toBeVisible();
    await page.locator('[data-search-input]').fill('priya');
    await expect(search.locator('[data-prospect-card]')).toHaveCount(1);
    await expect(search.locator('[data-prospect-card]')).toContainText('Priya Natarajan');
    await page.locator('[data-search-input]').fill('zzzz');
    await expect(search.locator('[data-prospect-card]')).toHaveCount(0);
    await expect(search.getByLabel('No matches')).toBeVisible();
    // Escape on a search input first clears its text (browser behaviour); the close control closes the sheet.
    await search.getByRole('button', { name: 'Close Search' }).first().click();
    await expect(search).toBeHidden();

    // Import tile → one-line sheet (Increment 2).
    await page.locator('[data-import-tile]').click();
    const imp = page.locator('dialog[data-sheet="import"]');
    await expect(imp).toBeVisible();
    await expect(imp).toContainText('Increment 2');
    await imp.getByRole('button', { name: 'OK' }).click();
    await expect(imp).toBeHidden();

    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
});

test.describe('History /calls', () => {
  test('a card per synthetic call with duration and outcome glyph; the opt-out call reads DNC; the sessions section is hidden when none ended', async ({ page }) => {
    const errors = trackErrors(page);
    await prime(page);
    await page.goto('/calls');
    await expectHiddenH1(page, 'Calls');
    await expect(page.locator('[data-history]')).toHaveAttribute('data-hydrated', 'true');
    await expect(page.locator('[data-session-list]')).toHaveCount(0);
    await expect(page.locator('[data-session-card]')).toHaveCount(0);

    const calls = page.locator('[data-call-list] [data-call-card]');
    await expect(calls).toHaveCount(loadSyntheticTranscripts().transcripts.length);
    const first = calls.first();
    await expect(first).toContainText('Dana Whitlock');
    await expect(first).toContainText('Riverbend Motors');
    await expect(first).toContainText(/\d:\d\d/);
    await expect(page.locator('[data-call-card][data-call-id="syn-h-opt-out"] [data-chip]')).toHaveAttribute('aria-label', /Opt-out recorded — do not call/); // the domain's outcome label
    await expect(page.locator('[data-call-card][data-call-id="syn-h-opt-out"]')).toHaveAttribute('data-outcome', 'do_not_call');
    await expect(page.locator('table')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('an ended demo session becomes a card (date, dials, talks) whose sheet lists the attempts with outcome glyphs', async ({ page }) => {
    await prime(page, { 'dial.history': [SESSION] });
    await page.goto('/calls');
    await expect(page.locator('[data-history]')).toHaveAttribute('data-hydrated', 'true');
    await expect(page.locator('[data-stat="sessions"]')).toHaveAttribute('aria-label', 'Sessions: 1');
    await expect(page.locator('[data-stat="dials"]')).toHaveAttribute('aria-label', 'Dials: 4');
    const session = page.locator('[data-session-card]');
    await expect(session).toHaveCount(1);
    await expect(session).toHaveAttribute('aria-label', /4 dials, 2 talks, 2 next steps/);
    await session.click();
    const sheet = page.locator('dialog[data-sheet="session"]');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('[data-attempt-card]')).toHaveCount(4);
    await expect(sheet.locator('[data-attempt-card][data-attempt-id="att-4"]')).toHaveAttribute('aria-label', /Do not call/);
    // A connected attempt links to the synthetic call it played.
    await expect(sheet.locator('a[data-attempt-card][data-attempt-id="att-1"]')).toHaveAttribute('href', /\/calls\/syn-a-profit-not-revenue$/);
  });

  test('call review replays the in-call layout read-only (entry line, ≥3 words at ≥24px, tone not assessed) with four review cards whose evidence quotes the supporting turn, and a persisted correction', async ({ page }) => {
    const errors = trackErrors(page);
    await prime(page);
    await page.goto('/calls');
    await page.locator('[data-call-card][data-call-id="syn-a-profit-not-revenue"]').click();
    await expect(page).toHaveURL(/\/calls\/syn-a-profit-not-revenue$/);
    await expectHiddenH1(page, 'Call review');
    await expect(page.locator('[data-call-review]')).toHaveAttribute('data-hydrated', 'true');

    // The entry line for this record, verbatim; nothing advances (no next control).
    const line = page.locator('[data-line-card] [data-primary-line]');
    await expect(line).toHaveText(expectedEntryLine('ct-dana'));
    await expect(page.locator('[data-line-next]')).toHaveCount(0);

    // THEIR WORDS ≥3 at ≥24px, first is PROFIT; ≥1 reference card from the listener.
    const words = page.locator('[data-word-card]:visible');
    expect(await words.count()).toBeGreaterThanOrEqual(3);
    await expect(words.first()).toContainText(/profit/i);
    for (const el of await page.locator('[data-word-card]:visible [data-word-text]').all()) {
      expect(await el.evaluate((n) => parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(24);
    }
    await expect(words.first()).toHaveAttribute('aria-label', /prospect said/);

    // Tone is a caption with the whole truth (never a dash); four review cards; no table.
    await expect(page.locator('[data-review-tone]')).toHaveAttribute('aria-label', 'Tone not assessed (text-only)');
    await expect(page.locator('[data-review-tone]')).toContainText('Not assessed');
    for (const key of ['strength', 'fix', 'ask', 'drill']) await expect(page.locator(`[data-review="${key}"]`)).toBeVisible();
    await expect(page.locator('[data-review="drill"]')).toHaveAttribute('href', '/practice');
    await expect(page.locator('table')).toHaveCount(0);
    // A Fix card that names a missing field quotes the last question asked, never an unrelated closing turn.
    const fix = page.locator('[data-review="fix"]');
    if ((await fix.textContent())?.includes('Critical field not established')) {
      await expect(fix.locator('[data-review-quote]')).toContainText('?');
    }
    // One status chip (no state dots) opens the replay-state sheet listing Call / Transcription / Recording / Coach.
    await expect(page.locator('[data-state-dot]')).toHaveCount(0);
    await page.locator('[data-call-status]').click();
    const status = page.locator('dialog[data-sheet="status"]');
    await expect(status).toBeVisible();
    for (const row of ['call', 'transcription', 'recording', 'coach']) await expect(status.locator(`[data-status-row="${row}"]`)).toBeVisible();
    await page.keyboard.press('Escape');
    // The transcript and corrections controls sit in a docked bottom bar, never over the card text.
    const bar = page.locator('[data-review-bar]');
    await expect(bar).toBeVisible();
    expect(await bar.evaluate((n) => getComputedStyle(n).position)).toBe('fixed');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const barBox = (await bar.boundingBox())!;
    const lastCard = (await page.locator('[data-review-block] [data-review]').last().boundingBox())!;
    expect(lastCard.y + lastCard.height).toBeLessThanOrEqual(barBox.y + 1);
    await page.evaluate(() => window.scrollTo(0, 0));

    // ⓘ → uncertainties + the unvalidated rubric.
    await page.locator('[data-uncertainties]').click();
    const unc = page.locator('dialog[data-sheet="uncertainties"]');
    await expect(unc).toContainText('Synthetic transcript');
    await expect(unc).toContainText('not validated');
    await page.keyboard.press('Escape');

    // Correction: tap the word → sheet → save; original stays; persists across reload.
    await words.first().click();
    const word = page.locator('dialog[data-sheet="word"]');
    await expect(word).toBeVisible();
    await page.getByLabel('Corrected meaning').fill('net profit after pack and internet payroll');
    await page.locator('[data-correction-save]').click();
    await expect(page.locator('[data-toast]')).toContainText(/original kept/);
    await expect(word.locator('[data-word-corrections]')).toContainText('net profit after pack and internet payroll');
    await expect(word.locator('[data-word-corrections]')).toContainText('was:');
    await page.keyboard.press('Escape');

    await page.reload();
    await expect(page.locator('[data-call-review]')).toHaveAttribute('data-hydrated', 'true');
    await page.locator('[data-corrections-button]').click();
    const list = page.locator('[data-corrections]');
    await expect(list).toContainText('net profit after pack and internet payroll');
    await expect(list).toContainText('was:');
    await expect(list).toContainText(/profit/i);

    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
});

test.describe('Follow-ups /pipeline', () => {
  test('lanes scroll horizontally; dispositions land in lanes (callback → agreed follow-up with a time chip); ⓘ opens the week note', async ({ page }) => {
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 430, height: 932 });
    await prime(page, { 'dial.history': [SESSION], 'pipeline.prefs': { examples: false } });
    await page.goto('/pipeline');
    await expectHiddenH1(page, 'Pipeline');
    await expect(page.locator('[data-pipeline]')).toHaveAttribute('data-hydrated', 'true');

    const lanes = page.locator('[data-lanes]');
    await expect(lanes.locator('[data-lane]')).toHaveCount(8);
    const scroll = await lanes.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(430);

    await expect(page.locator('[data-lane="agreed_follow_up"]')).toHaveAttribute('data-count', '2');
    await expect(page.locator('[data-lane="no_contact"]')).toHaveAttribute('data-count', '1');
    await expect(page.locator('[data-lane="do_not_call"]')).toHaveAttribute('data-count', '1');
    await expect(page.locator('[data-lane="budget"]')).toHaveAttribute('data-count', '0');
    // One list, filtered by the segmented chips, never a board. Agreed follow-up is the default lane.
    await expect(page.locator('[data-lane-list="agreed_follow_up"]')).toHaveAttribute('data-count', '2');
    const callback = page.locator('[data-lane-list="agreed_follow_up"] [data-lane-card][data-kind="callback"]');
    await expect(callback).toHaveCount(1);
    await expect(callback.locator('[data-when-chip] [data-chip]')).toHaveAttribute('aria-label', /Callback agreed for/);
    await expect(page.locator('[data-lane-card][data-source="example"]')).toHaveCount(0);

    // Examples toggle shows synthetic example cards, each marked fictional.
    await page.locator('[data-examples-toggle]').click();
    expect(await page.locator('[data-lane-card][data-source="example"]').count()).toBeGreaterThan(0);
    await expect(page.locator('[data-lane-card][data-source="example"] [data-fictional-pill]').first()).toBeVisible();

    // ⓘ week view: a view, not permission to message.
    await page.locator('[data-weeks-info]').click();
    const weeks = page.locator('dialog[data-sheet="weeks"]');
    await expect(weeks).toBeVisible();
    await expect(weeks.getByText('a view, not permission to message', { exact: true })).toBeVisible();
    await expect(weeks.getByRole('img', { name: /Week 8/ })).toBeVisible();
    await page.keyboard.press('Escape');

    // Lane chip selects the lane; ⓘ opens its definition.
    await page.locator('[data-lane-chip="do_not_call"]').click();
    await expect(page.locator('[data-lane-list="do_not_call"] [data-lane-card][data-source="history"]')).toHaveCount(1);
    await expect(page.locator('[data-lane-list="do_not_call"] [data-lane-card][data-source="example"]')).toHaveCount(1);
    await page.locator('[data-lane-info]').click();
    await expect(page.locator('dialog[data-sheet="lane"]')).toContainText('Explicit opt-out');
    await page.keyboard.press('Escape');

    await expect(page.locator('table')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
});
