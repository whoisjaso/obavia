import { expect, test, type Page } from '@playwright/test';
import { loadIdentityInterview } from '../../packages/domain/src/seeds';
import { applyAnswer, buildProfile, createSession, endorseProfile, sortedScreens } from '../../packages/domain/src/interview';

/**
 * M-me E2E (DESIGN_SYSTEM §3.6): complete the interview with clicks only, skip one question,
 * unlock a conditional screen, back-edit its trigger and watch it disappear, reach the review
 * cards, endorse on /profile, see answer ids, and see Today's rings / next drill / evidence.
 * No page.fill / keyboard typing in the interview itself.
 */

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon\.ico/.test(msg.location()?.url ?? '')) errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

async function currentScreenId(page: Page): Promise<string> {
  const section = page.locator('[data-screen-id]');
  await expect(section).toBeVisible();
  return (await section.getAttribute('data-screen-id')) ?? '';
}

async function clickOption(page: Page, optionId: string) {
  const button = page.locator(`[data-option-id="${optionId}"]`);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

async function clickFirstOption(page: Page) {
  const first = page.locator('[data-options] [data-option-id]').first();
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
}

/** Close whatever sheet is open (Esc) and wait for it to go. */
async function closeSheet(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
}

/** Fresh app storage on the first load, optionally seeded with entries (reloads keep what the app persisted). */
async function prime(page: Page, entries: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript((seed: Record<string, unknown>) => {
    try {
      if (sessionStorage.getItem('e2e.primed')) return;
      sessionStorage.setItem('e2e.primed', '1');
      for (const k of Object.keys(localStorage)) if (k.startsWith('apohenia.v1.')) localStorage.removeItem(k);
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(`apohenia.v1.${k}`, JSON.stringify(v));
    } catch {
      // storage unavailable: the page still renders
    }
  }, entries);
}

test.describe('identity interview → profile → Today', () => {
  test('completes with clicks only, handles skip, conditionals and back-edits, endorses, and feeds Today', async ({ page }) => {
    test.setTimeout(180_000); // 33 screens of clicks, then profile, Today and a back-edit round trip
    const errors = trackErrors(page);
    await prime(page);
    await page.goto('/onboarding/identity');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Identity interview');
    await expect(page.locator('[data-screen-id]')).toBeVisible();

    // Fresh session: 30 visible, up to 3 more — as a ring in the top bar with the whole truth in its name.
    const progress = page.locator('[data-progress-line]');
    await expect(progress).toHaveAttribute('data-index', '1');
    await expect(progress).toHaveAttribute('data-total', '30');
    await expect(page.getByRole('progressbar', { name: /Question 1 of 30 visible \(up to 3 more may appear based on your answers\)/ })).toBeVisible();

    const next = page.locator('[data-next]');
    const back = page.getByRole('button', { name: 'Back', exact: true });
    const skip = page.getByRole('button', { name: 'Skip this question' });

    // Next is disabled until a valid selection exists — with a VISIBLE reason (A-6), not only a tooltip.
    await expect(next).toBeDisabled();
    await expect(back).toBeDisabled();
    const reason = page.locator('[data-next-reason]');
    await expect(reason).toBeVisible();
    await expect(reason).toHaveAttribute('data-next-reason', 'blocked');
    await expect(reason).toContainText('Pick up to 3'); // the cue matches the question's select mode (multi, max 3)
    await expect(reason).toContainText('Choose an option, or skip this question.');
    const reasonId = await reason.getAttribute('id');
    await expect(next).toHaveAttribute('aria-describedby', reasonId ?? '');

    // Multi-select limit is stated and enforced on the first screen (max 3).
    await expect(page.locator('[data-max-select] [data-chip]')).toHaveAttribute('aria-label', /choose up to 3/);
    await clickOption(page, 'goal_durable');
    await clickOption(page, 'goal_provide');
    await clickOption(page, 'goal_freedom');
    await expect(page.locator('[data-max-select]')).toHaveAttribute('data-chosen', '3');
    await page.locator('[data-option-id="goal_proof"]').click();
    await expect(page.locator('[data-option-id="goal_proof"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-limit-notice] [data-chip]')).toHaveAttribute('aria-label', 'You have chosen 3. Unselect one to choose another.');

    // Uncertainty clears substantive options; a substantive option clears uncertainty.
    await clickOption(page, 'goal_meaning.unsure');
    await expect(page.locator('[data-option-id="goal_durable"]')).toHaveAttribute('aria-pressed', 'false');
    await clickOption(page, 'goal_durable');
    await expect(page.locator('[data-option-id="goal_meaning.unsure"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(next).toBeEnabled();
    await expect(reason).toHaveAttribute('data-next-reason', 'clear'); // the slot stays (no bar reflow); the cue is gone
    await expect(reason).not.toContainText('Pick');
    await next.click();

    // Walk every screen. Specific choices unlock / skip / exercise conditionals.
    let unlockedOfferConditional = false;
    let skippedOne = false;
    for (let guard = 0; guard < 60; guard += 1) {
      if (await page.locator('[data-review-screen]').isVisible()) break;
      const id = await currentScreenId(page);

      if (id === 'needs_current' && !skippedOne) {
        await skip.click();
        skippedOne = true;
        continue;
      }

      if (id === 'faith_context') {
        // A-8: jointly-true options → multi-select (up to 3). Private only: the faith conditional must NOT appear.
        await expect(page.locator('[data-max-select] [data-chip]')).toHaveAttribute('aria-label', /choose up to 3/);
        await clickOption(page, 'faith_private');
        await next.click();
        expect(await currentScreenId(page)).toBe('beliefs_selling');
        continue;
      }

      if (id === 'friction_biggest') {
        // A-7: the brief's fifth failure point is offered.
        await expect(page.locator('[data-option-id="big_vocab"]')).toBeVisible();
        await clickFirstOption(page);
        await next.click();
        continue;
      }

      if (id === 'learning_style') {
        await clickOption(page, 'repetition_blocks');
        await next.click();
        // Conditional unlocked.
        expect(await currentScreenId(page)).toBe('repetition_block_length');
        await clickOption(page, 'block_10');
        await next.click();
        continue;
      }

      if (id === 'offer_hypothesis' && !unlockedOfferConditional) {
        await clickOption(page, 'dealership_follow_through');
        await next.click();
        expect(await currentScreenId(page)).toBe('offer_least_control');
        await clickOption(page, 'lc_staff_follow_up');
        await next.click();
        expect(await currentScreenId(page)).toBe('offer_materials');

        // Back-edit the trigger: go back twice, change the answer, conditional disappears and a calm note appears.
        await back.click();
        expect(await currentScreenId(page)).toBe('offer_least_control');
        await back.click();
        expect(await currentScreenId(page)).toBe('offer_hypothesis');
        await expect(page.locator('[data-has-dependents] [data-chip]')).toHaveAttribute('aria-label', /Changing this answer resets the answer that depends on it/);
        await clickOption(page, 'offer_different');
        await next.click();
        expect(await currentScreenId(page)).toBe('offer_materials');
        await expect(page.locator('[data-dependents-note]')).toContainText('a dependent answer was reset');
        await expect(page.locator('[data-dependents-note]')).toContainText('Least-controlled dependency');
        unlockedOfferConditional = true;
        continue;
      }

      await clickFirstOption(page);
      await next.click();
    }

    // Review: a card per question with its status glyph.
    await expect(page.locator('[data-review-screen]')).toBeVisible();
    await expect(page.locator('[data-review-screen] h2')).toHaveText('Review your answers');
    await expect(page.locator('[data-review-row="needs_current"]')).toHaveAttribute('data-review-status', 'skipped');
    await expect(page.locator('[data-review-row="offer_least_control"]')).toHaveAttribute('data-review-status', 'not_applicable');
    await expect(page.locator('[data-review-row="faith_practice_standard"]')).toHaveAttribute('data-review-status', 'not_applicable');
    await expect(page.locator('[data-review-row="repetition_block_length"]')).toHaveAttribute('data-review-status', 'answered');
    await expect(page.locator('[data-review-row="offer_hypothesis"]')).toContainText('I have a different offer in mind');
    await expect(page.locator('[data-review-row][data-review-status="answered"]')).toHaveCount(30);
    await expect(page.locator('[data-review-screen]')).toHaveAttribute('data-complete', 'true');
    await expect(page.locator('[data-review-complete]')).toBeVisible();
    await expect(page.locator('table')).toHaveCount(0);

    // Edit chip jumps back to the screen with the previous answer selected; Next then Go to review returns.
    await page.getByRole('button', { name: 'Edit: Practice duration' }).click();
    expect(await currentScreenId(page)).toBe('practice_duration');
    await expect(page.locator('[data-option-id="dur_10"]')).toHaveAttribute('aria-pressed', 'true');
    await clickOption(page, 'dur_20');
    await next.click();
    await page.getByRole('button', { name: 'Go to review' }).click();
    await expect(page.locator('[data-review-row="practice_duration"]')).toContainText('20 minutes');

    // Resume: reloading lands on the review screen with everything intact.
    await page.reload();
    await expect(page.locator('[data-review-screen]')).toBeVisible();
    await expect(page.locator('[data-review-row][data-review-status="answered"]')).toHaveCount(30);

    // Profile: cards per section with answer ids, one unknowns heading (A-10), endorse hero.
    await page.getByRole('link', { name: 'Continue to your profile' }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Profile');
    await expect(page.locator('[data-profile-status]')).toHaveAttribute('data-profile-status', 'unendorsed');
    await page.locator('[data-plan-open]').click();
    await expect(page.locator('[data-plan-gate]')).toBeVisible();
    await closeSheet(page);
    // Provenance stays machine-readable (every section carries the answer ids it came from) but ids never print on the stage.
    const standards = page.locator('[data-profile-section="chosen_standards"]');
    await expect(standards).toHaveAttribute('data-answer-ids', /identity_statements/);
    await expect(standards).toHaveAttribute('data-answer-ids', /std_prepare/);
    await expect(standards).not.toContainText('std_prepare');
    await expect(page.locator('[data-profile-section="practice_duration"]')).toContainText('20 minutes');
    await expect(page.locator('[data-answer-card="needs_current"]')).toHaveAttribute('data-answer-status', 'skipped');
    await expect(page.locator('[data-answer-card="needs_current"] [data-not-assessed]')).toHaveAttribute('aria-label', /skipped/);
    await expect(page.locator('[data-unknowns]')).toContainText('skipped');
    await expect(page.getByRole('heading', { name: 'Explicit unknowns' })).toHaveCount(1);
    await expect(page.locator('table')).toHaveCount(0);

    await page.locator('[data-endorse-button]').click();
    await expect(page.locator('[data-profile-status]')).toHaveAttribute('data-profile-status', 'endorsed');
    await expect(page.locator('[data-profile-status]')).toHaveAttribute('aria-label', /Endorsed \d{4}-\d{2}-\d{2}/);
    await expect(page.locator('[data-endorse-button]')).toBeDisabled();
    await page.locator('[data-plan-open]').click();
    const plan = page.locator('[data-training-plan]');
    await expect(plan).toBeVisible();
    await expect(plan).toContainText('I prepare');
    await expect(plan).toContainText('Rehearse the approved opening and one branch');
    await expect(plan.locator('[data-plan-duration="20"]').first()).toBeVisible();
    await closeSheet(page);

    // Privacy sheet: statement + scoped export (interview keys only).
    await page.locator('[data-privacy-open]').click();
    await expect(page.locator('[data-privacy-statement]')).toHaveText('Private. Never enters a prospect’s context. Export or delete below.');
    await page.locator('[data-export-interview]').click();
    const exported = JSON.parse((await page.locator('[data-export-json]').textContent()) ?? '{}') as { scope: string; entries: Record<string, unknown> };
    expect(exported.scope).toBe('interview');
    expect(Object.keys(exported.entries).sort()).toEqual(['interview.profile', 'interview.session']);
    await closeSheet(page);

    // Today: rings, the CHOSEN next drill + primary statement (A-3), the chosen duration, local day (A-5).
    await page.goto('/today');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today');
    const drill = page.locator('[data-next-drill]');
    await expect(drill).toHaveAttribute('data-drill-option', 'drill_opening_recall');
    await expect(drill).toHaveAttribute('data-duration', '20');
    await expect(drill).toHaveAttribute('aria-label', /Next drill: Exact opening recall\. Primary statement: I prepare\. Duration 20 minutes/);
    await expect(drill).toHaveAttribute('href', '/practice');
    await expect(page.locator('[data-duration-row]')).toHaveCount(0);
    const browserDay = await page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await expect(page.locator('[data-today]')).toHaveAttribute('data-local-day', browserDay);

    // Rings are completion evidence you mark; they persist across reload; a minimum-action day keeps progress.
    const rehearse = page.locator('[data-ring-toggle="rehearse"]');
    await expect(rehearse).toHaveAttribute('aria-pressed', 'false');
    await rehearse.click();
    await expect(rehearse).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator('[data-ring-toggle="rehearse"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-minimum-chip]').click();
    await expect(page.locator('[data-today]')).toHaveAttribute('data-minimum-day', 'true');
    await expect(page.locator('[data-minimum-text]')).toHaveText('Say the opening once, out loud');
    await page.locator('[data-minimum-chip]').click();
    await expect(page.locator('[data-ring-toggle="rehearse"]')).toHaveAttribute('aria-pressed', 'true');

    // Evidence: a preset chip logs the full sentence; the count and the journal list agree (A-4).
    await page.locator('[data-evidence-preset="no_fit"]').click();
    await expect(page.locator('[data-evidence-today]')).toHaveAttribute('data-evidence-today', '1');
    await page.locator('[data-evidence-open]').click();
    const journal = page.locator('[data-evidence-journal="today"]');
    await expect(journal).toHaveAttribute('data-count', '1');
    await expect(journal.locator('[data-evidence-entry]')).toHaveCount(1);
    await expect(journal).toContainText('I respected a no-fit case');
    await closeSheet(page);

    // A-1: a back-edit after endorsement makes the profile stale — Today stops reading it.
    await page.goto('/onboarding/identity');
    await expect(page.locator('[data-review-screen]')).toBeVisible();
    await page.getByRole('button', { name: 'Edit: Practice duration' }).click();
    await clickOption(page, 'dur_30');
    await page.locator('[data-next]').click();
    await page.goto('/profile');
    await expect(page.locator('[data-profile-status]')).toHaveAttribute('data-profile-status', 'stale');
    await page.goto('/today');
    await expect(page.locator('[data-today-empty]')).toHaveAttribute('data-today-empty', 'unendorsed');
    await expect(page.locator('[data-next-drill]')).toHaveCount(0);

    // Start over → a fresh session; Today is back to the empty state; the interview is on question 1.
    await page.goto('/onboarding/identity');
    await page.getByRole('button', { name: 'Go to review' }).click();
    await page.locator('[data-review-restart]').click();
    await page.locator('[data-confirm-restart]').click();
    await expect(page.locator('[data-progress-line]')).toHaveAttribute('data-index', '1');
    await expect(page.locator('[data-option-id="goal_durable"]')).toHaveAttribute('aria-pressed', 'false');
    await page.goto('/today');
    await expect(page.locator('[data-today-empty]')).toBeVisible();
    await expect(page.locator('[data-next-drill]')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('an unchosen practice duration shows — and is asked on Today; a later choice feeds the plan (A-2)', async ({ page }) => {
    const errors = trackErrors(page);
    const version = loadIdentityInterview();
    const now = '2026-09-10T12:00:00.000Z';
    let session = createSession(version, now, 'e2e-a2');
    for (const screen of sortedScreens(version)) {
      if (screen.base_or_conditional !== 'base') continue;
      const ids = screen.id === 'practice_duration' ? [screen.uncertainty_option!.id] : [screen.options[0]!.id];
      session = applyAnswer(session, screen, ids, 'answered', { version, now });
    }
    const profile = endorseProfile(buildProfile(version, session), now);
    await prime(page, { 'interview.session': { ...session, status: 'endorsed', endorsed_at: now }, 'interview.profile': profile });

    await page.goto('/today');
    const drill = page.locator('[data-next-drill]');
    await expect(drill).toHaveAttribute('data-duration', '');
    await expect(drill).toHaveAttribute('aria-label', /Duration not chosen/);
    await expect(drill).not.toContainText('15 min');
    await expect(drill).toContainText('not chosen');
    const row = page.locator('[data-duration-row]');
    await expect(row).toBeVisible();
    await expect(row.locator('[data-duration-choice]')).toHaveCount(5);
    await row.locator('[data-duration-choice="20"]').click();
    await expect(row.locator('[data-duration-choice="20"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(drill).toHaveAttribute('data-duration', '20');
    await expect(drill).toContainText('20 min');

    await page.goto('/profile');
    await expect(page.locator('[data-profile-status]')).toHaveAttribute('data-profile-status', 'endorsed');
    await page.locator('[data-plan-open]').click();
    await expect(page.locator('[data-training-plan] [data-plan-duration="20"]').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('profile and today show calm empty states without a session', async ({ page }) => {
    const errors = trackErrors(page);
    await prime(page);
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Profile');
    await expect(page.getByRole('link', { name: 'Start the identity interview' })).toBeVisible();
    await page.goto('/today');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today');
    await expect(page.locator('[data-today-empty]')).toHaveAttribute('data-today-empty', 'no-session');
    await expect(page.getByRole('link', { name: 'Start the identity interview' })).toBeVisible();
    await expect(page.locator('table')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('options are keyboard operable: arrows move focus, Space toggles', async ({ page }) => {
    await prime(page);
    await page.goto('/onboarding/identity');
    const first = page.locator('[data-option-id="goal_durable"]');
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-option-id="goal_provide"]')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('[data-option-id="goal_provide"]')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('End');
    await expect(page.locator('[data-option-id="goal_meaning.none"]')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('[data-option-id="goal_meaning.none"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-option-id="goal_provide"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('settings and insights render as tiles, rings and sheets — no table, one hidden h1', async ({ page }) => {
    const errors = trackErrors(page);
    await prime(page);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
    const group = page.getByRole('radiogroup', { name: /Default assistance mode/ });
    await expect(group.getByRole('radio')).toHaveCount(5);
    await expect(group.locator('[data-mode-option="full_script"]')).toHaveAttribute('aria-checked', 'true');
    await group.locator('[data-mode-option="unassisted"]').click();
    await expect(group.locator('[data-mode-option="unassisted"]')).toHaveAttribute('aria-checked', 'true');
    await page.reload();
    await expect(page.locator('[data-mode-option="unassisted"]')).toHaveAttribute('aria-checked', 'true');
    await page.locator('[data-export-button]').click();
    const exported = JSON.parse((await page.locator('[data-export-json]').textContent()) ?? '{}') as { mode: string; entries: Record<string, unknown> };
    expect(exported.mode).toBe('local_demo');
    expect(Object.keys(exported.entries)).toContain('settings.assistance_mode');
    await closeSheet(page);
    await page.locator('[data-delete-button]').click();
    await page.locator('[data-confirm-delete]').click();
    await expect(page.locator('[data-mode-option="full_script"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('table')).toHaveCount(0);

    await page.goto('/insights');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Insights');
    await expect(page.locator('[data-calls-empty]')).toContainText('Nothing counted');
    await expect(page.locator('[data-funnel-stage]')).toHaveCount(9);
    await expect(page.locator('[data-ring-stat="drills"]')).toHaveAttribute('data-scored', 'false');
    await expect(page.locator('[data-ring-stat="drills"]')).toHaveAttribute('aria-label', 'Drills: no attempts yet');
    await page.locator('[data-rubric-open]').click();
    await expect(page.getByRole('heading', { name: 'internal training rubric — not validated' })).toBeVisible();
    await expect(page.locator('[data-rubric] li')).toHaveCount(6);
    await closeSheet(page);
    await expect(page.locator('table')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
