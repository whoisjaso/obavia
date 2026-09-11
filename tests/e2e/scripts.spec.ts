import { expect, test, type Page } from '@playwright/test';

/**
 * Script stage (DESIGN_SYSTEM §3.5): stage rail → LineCards → node sheet (why now · listen for ·
 * mirrors · tone · branches · sources · your words), publish tile with confirm sheet, deep link
 * `?node=<id>`, the global stop rule (B-1), the offer gate (B-2/B-3/B-12) and the frozen-draft
 * publication label (B-5).
 */

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Fresh app storage on the FIRST load of the page (reloads keep what the app persisted). */
async function prime(page: Page, extra: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript((entries: Record<string, unknown>) => {
    try {
      // The beforeEach script clears once per context; a test-level call with entries seeds them once, after that clear.
      if (!sessionStorage.getItem('e2e.primed')) {
        sessionStorage.setItem('e2e.primed', '1');
        for (const k of Object.keys(localStorage)) if (k.startsWith('apohenia.v1.')) localStorage.removeItem(k);
      }
      if (Object.keys(entries).length === 0 || sessionStorage.getItem('e2e.primed.entries')) return;
      sessionStorage.setItem('e2e.primed.entries', '1');
      for (const [k, v] of Object.entries(entries)) localStorage.setItem(`apohenia.v1.${k}`, JSON.stringify(v));
    } catch {
      // storage unavailable: the page still renders
    }
  }, extra);
}

const HEX64 = /^[0-9a-f]{64}$/;
const root = (page: Page) => page.locator('[data-scripts]');
const nodeSheet = (page: Page) => page.locator('dialog[data-sheet="node"]');

async function openNode(page: Page, id: string): Promise<void> {
  await page.locator(`[data-node-card][data-node-id="${id}"] [data-line-next]`).click();
  await expect(page.locator(`[data-node-sheet="${id}"]`)).toBeVisible();
}

test.describe('scripts', () => {
  test.beforeEach(async ({ page }) => {
    await prime(page);
  });

  test('?node=<id> selects the node, its stage and opens its sheet; unknown ids are ignored', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/scripts?node=logical-process');
    await expect(root(page)).toHaveAttribute('data-current-node', 'logical-process');
    await expect(root(page)).toHaveAttribute('data-stage', 'logical_certainty');
    await expect(page.locator('[data-node-card][data-node-id="logical-process"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('[data-node-sheet="logical-process"]')).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);

    await page.goto('/scripts?node=no-such-node');
    await expect(root(page)).toHaveAttribute('data-hydrated', 'true');
    await expect(root(page)).toHaveAttribute('data-current-node', '');
    await expect(nodeSheet(page)).toBeHidden();
  });

  test('stage: hidden h1, stage rail chips, five entry lines, honesty pills, no table, no paragraphs on the stage', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/scripts');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('Scripts');
    const box = await h1.boundingBox();
    // ≤1px box (sub-pixel layout can report 1.0000000149 for a 1px sr-only box; anything visibly larger fails).
  expect(Math.max(box!.width, box!.height)).toBeLessThanOrEqual(1.01);

    const rail = page.locator('[data-stage-rail]');
    await expect(rail.locator('[data-stage="entry"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(rail.locator('[data-stage]')).toHaveCount(15);
    await expect(page.locator('[data-stage-lines] [data-node-card]')).toHaveCount(5);
    await expect(page.locator('[data-node-card][data-node-id="inbound-callback-open"] [data-primary-line]')).toContainText('Jason with Apohenia');
    // Draft is a glyph with the whole truth in its name — never rendered as approved.
    await expect(page.locator('[data-node-card][data-node-id="cold-open"] [data-approval="draft"]')).toHaveAttribute('aria-label', /Draft — written, not reviewed/);
    // Version · graph · offer status live behind ⓘ (developer vocabulary never sits on the stage).
    await expect(page.locator('[data-status-pills]:visible')).toHaveCount(0);
    await page.locator('[data-status-open]').click();
    const status = page.locator('dialog[data-sheet="status"]');
    await expect(status.locator('[data-version-pill]')).toHaveAttribute('aria-label', /51 of 51 nodes draft/);
    await expect(status.locator('[data-graph-pill="ok"]')).toHaveAttribute('aria-label', /Graph valid: 51 nodes/);
    await expect(status.locator('[data-offer-pill="draft"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(status).toBeHidden();

    // Slots are chips, never brackets or braces; the Publish hero is docked on the stage.
    for (const card of await page.locator('[data-stage-lines] [data-primary-line]').all()) expect(await card.textContent()).not.toMatch(/\[missing:|[{}⟨⟩]/);
    await expect(page.locator('[data-node-card][data-node-id="cold-open"] [data-slot="prospect_name"]')).toHaveAttribute('aria-label', /slot: prospect name/);
    await expect(page.locator('[data-publish]')).toBeVisible();

    await expect(page.locator('table')).toHaveCount(0);
    await expect(page.locator('main p:visible')).toHaveCount(0);
    await expect(page.locator('[data-demo-pill]:visible')).toHaveCount(1);

    // Keyboard: → on the rail moves to the next stage.
    await rail.locator('[data-stage="entry"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(root(page)).toHaveAttribute('data-stage', 'intent');
    await expect(rail.locator('[data-stage="intent"]')).toBeFocused();
    await expect(page.locator('[data-stage-lines] [data-node-card]')).toHaveCount(2);
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('tap a line → sheet with the six parts; missing cues; sample facts fill slots and show the evidence transition (B-11)', async ({ page }) => {
    await page.goto('/scripts');
    await openNode(page, 'inbound-callback-open');
    const sheet = nodeSheet(page);
    for (const name of ['Why now', 'Listen for', 'Mirrors', /^Tone/, 'Branches', 'Sources', 'Your words']) {
      await expect(sheet.getByRole('heading', { level: 3, name })).toBeVisible();
    }
    await expect(sheet.locator('[data-sheet-approval="draft"]')).toBeVisible();
    await expect(sheet.locator('[data-mirror]')).toHaveCount(2);
    const say = sheet.locator('[data-say-this]');
    // A missing slot is a visible cue — a ‹dealership name› chip whose name says what fills it — never an invented value or a bracket.
    await expect(say.locator('[data-slot="dealership_name"]')).toHaveAttribute('aria-label', /slot: dealership name/);
    expect(await say.textContent()).not.toMatch(/\[missing:|[{}⟨⟩]/);

    await sheet.locator('[data-sample-facts]').click();
    await expect(sheet.locator('[data-sample-facts]')).toHaveAttribute('aria-pressed', 'true');
    await expect(say.locator('[data-slot="dealership_name"]')).toHaveCount(0);
    await expect(say).toContainText('Northgate Motors');

    // Evidence-satisfied: the spoken transition, not the rule sentence.
    await sheet.locator('[data-branch="confirmed"]').click();
    await expect(page.locator('[data-node-sheet="intent-tangible"]')).toBeVisible();
    const transition = sheet.locator('[data-evidence-transition]');
    await expect(transition).toBeVisible();
    await expect(transition).toContainText('You mentioned every web inquiry answered the same day');
    await expect(transition).not.toContainText('If the prospect already');
    await expect(page.locator('[data-node-card][data-node-id="intent-tangible"] [data-evidence-pill]')).toBeVisible();
  });

  test('branch chips navigate the graph; opt-out reaches exit-stop from a node without its own opt_out branch (B-1)', async ({ page }) => {
    await page.goto('/scripts');
    await openNode(page, 'inbound-callback-open');
    const sheet = nodeSheet(page);
    await sheet.locator('[data-branch="confirmed"]').click();
    await expect(root(page)).toHaveAttribute('data-current-node', 'intent-tangible');
    await expect(root(page)).toHaveAttribute('data-stage', 'intent');
    await sheet.locator('[data-branch="tangible_given"]').click();
    await sheet.locator('[data-branch="experience_given"]').click();
    await expect(root(page)).toHaveAttribute('data-current-node', 'logical-process');
    // logical-process has no opt_out branch of its own: the engine adds the global stop route.
    const stop = sheet.locator('[data-branch="opt_out"]');
    await expect(stop).toHaveAttribute('data-implicit', 'true');
    await expect(stop).toHaveAttribute('aria-label', /Global stop rule/);
    await stop.click();
    await expect(root(page)).toHaveAttribute('data-current-node', 'exit-stop');
    await expect(root(page)).toHaveAttribute('data-stage', 'exit');
    await expect(sheet.locator('[data-say-this]')).toContainText("I'll stop here");
    await sheet.locator('[data-branch="end"]').click();
    await expect(nodeSheet(page)).toBeHidden();
    await expect(page.locator('[data-toast]')).toContainText('End of script');
  });

  test('own words are stored separately and the primary line stays locked (scenario 29)', async ({ page }) => {
    await page.goto('/scripts');
    const primaryBefore = (await page.locator('[data-node-card][data-node-id="inbound-callback-open"] [data-primary-line]').textContent()) ?? '';
    expect(primaryBefore.length).toBeGreaterThan(20);
    await openNode(page, 'inbound-callback-open');
    const sheet = nodeSheet(page);
    const textarea = sheet.getByLabel('Your words for inbound-callback-open');
    await expect(textarea).toBeEnabled();
    await textarea.fill('Hey, is this Dana? Jason here — you grabbed the checklist, right?');
    await expect(sheet.locator('[data-primary-unchanged]')).toContainText('Jason with Apohenia');
    await expect(sheet.locator('[data-say-this]')).not.toContainText('grabbed the checklist');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-node-card][data-node-id="inbound-callback-open"] [data-primary-line]')).toHaveText(primaryBefore);
    await page.reload();
    await openNode(page, 'inbound-callback-open');
    await expect(nodeSheet(page).getByLabel('Your words for inbound-callback-open')).toHaveValue(/grabbed the checklist/);
    await expect(page.locator('[data-node-card][data-node-id="inbound-callback-open"] [data-primary-line]')).toHaveText(primaryBefore);
  });

  test('price node never shows a number while the offer price is unset; draft pillars are not spoken (scenarios 6, 38; B-2)', async ({ page }) => {
    await page.goto('/scripts');
    await page.locator('[data-stage-rail] [data-stage="decision"]').click();
    const priceLine = page.locator('[data-node-card][data-node-id="decision-price"] [data-primary-line]');
    await expect(priceLine.locator('[data-slot-status="price"]')).toHaveAttribute('aria-label', /Price not approved yet — route to scope conversation/);
    expect(await priceLine.textContent()).not.toMatch(/\$|\d/);
    await page.locator('[data-stage-rail] [data-stage="pitch"]').click();
    const pillarLine = page.locator('[data-node-card][data-node-id="pitch-pillar-1"] [data-primary-line]');
    await expect(pillarLine.locator('[data-slot="pillar_1_name"][data-slot-status="offer"]')).toHaveAttribute('aria-label', /Offer not approved: pillar 1 name/);
    await expect(pillarLine).not.toContainText('Same-day inquiry response');
  });

  test('B-12: publishing the offer in the Offer Studio store is what /scripts reads — pillars then speak, price still gated', async ({ page }) => {
    await prime(page, { 'offers.status': { 'draft-research-offer-v0': 'published' } });
    await page.goto('/scripts');
    await page.locator('[data-status-open]').click();
    await expect(page.locator('dialog[data-sheet="status"] [data-offer-pill="published"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[data-stage-rail] [data-stage="pitch"]').click();
    await expect(page.locator('[data-node-card][data-node-id="pitch-pillar-1"] [data-primary-line]')).toContainText('Same-day inquiry response');
    await page.locator('[data-stage-rail] [data-stage="decision"]').click();
    const priceLine = page.locator('[data-node-card][data-node-id="decision-price"] [data-primary-line]');
    await expect(priceLine.locator('[data-slot-status="price"]')).toHaveAttribute('aria-label', /Price not approved yet/);
    expect(await priceLine.textContent()).not.toMatch(/\$|\d/);
  });

  test('publish asks first, then stores an immutable "frozen draft" snapshot with its hash (B-5)', async ({ page }) => {
    await page.goto('/scripts');
    const publish = page.locator('[data-publish]');
    await expect(publish).toBeEnabled();
    // Cancel path: no publication.
    await publish.click();
    const confirm = page.locator('dialog[data-sheet="publish"]');
    await expect(confirm).toBeVisible();
    await expect(confirm.locator('[data-publish-caption]')).toContainText('approval unchanged');
    await page.keyboard.press('Escape');
    await expect(confirm).toBeHidden();
    await expect(page.locator('[data-publication]')).toHaveCount(0);
    // Confirm path.
    await publish.click();
    await confirm.locator('[data-confirm-publish]').click();
    await expect(confirm).toBeHidden();
    await expect(page.locator('[data-toast]')).toContainText('Frozen draft');
    const pub = page.locator('[data-publication]');
    await expect(pub).toHaveCount(1);
    await expect(pub).toHaveAttribute('data-publication-label', 'frozen draft');
    const hash = (await pub.getAttribute('data-publication-hash')) ?? '';
    expect(hash).toMatch(HEX64);
    await pub.click();
    const detail = page.locator('dialog[data-sheet="publication"]');
    await expect(detail.locator('[data-publication-approval="frozen draft"]')).toHaveAttribute('aria-label', /51 draft/);
    await expect(detail.locator('[data-publication-full-hash]')).toHaveText(hash);
    await page.keyboard.press('Escape');
    // Same content → same hash after reload and re-publish (deduplicated).
    await page.reload();
    await expect(page.locator('[data-publication]')).toHaveAttribute('data-publication-hash', hash);
    await page.locator('[data-publish]').click();
    await page.locator('dialog[data-sheet="publish"] [data-confirm-publish]').click();
    await expect(page.locator('[data-publication]')).toHaveCount(1);
  });

  test('a source chip opens the record sheet with its classification glyph, then the full record', async ({ page }) => {
    await page.goto('/scripts');
    await openNode(page, 'inbound-callback-open');
    const chip = nodeSheet(page).locator('[data-citation="I01"]');
    await expect(chip).toHaveAttribute('aria-label', /Adapt — study material/);
    await chip.click();
    const source = page.locator('dialog[data-sheet="source"]');
    await expect(source.locator('[data-source-sheet="I01"]')).toBeVisible();
    await expect(source.locator('[data-classification="adapt"]')).toBeVisible();
    await source.getByRole('link', { name: /Open record I01 in the Source Library/ }).click();
    await expect(page).toHaveURL(/\/sources\/I01$/);
  });

  test('practice-only node is marked and cites private training; the sheet heading levels are h2 → h3 (B-8)', async ({ page }) => {
    await page.goto('/scripts');
    await page.locator('[data-stage-rail] [data-stage="emotional_certainty"]').click();
    await expect(page.locator('[data-node-card][data-node-id="identity-frame-study"] [data-practice-only]')).toBeVisible();
    await openNode(page, 'identity-frame-study');
    const sheet = nodeSheet(page);
    await expect(sheet.getByRole('heading', { level: 2 })).toHaveCount(1);
    await expect(sheet.locator('[data-citation]').first()).toHaveAttribute('aria-label', /Private training/);
    await expect(sheet.locator('h4, h5, h6')).toHaveCount(0);
  });

  test('phone width: column fits, rail scrolls horizontally, no horizontal page scroll', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/scripts');
    await expect(page.locator('[data-stage-lines] [data-node-card]')).toHaveCount(5);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const rail = page.locator('[data-stage-rail]');
    const scrollable = await rail.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(scrollable).toBe(true);
    await openNode(page, 'cold-open');
    await expect(nodeSheet(page)).toBeVisible();
  });
});
