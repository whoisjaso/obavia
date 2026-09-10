import { expect, test, type Page } from '@playwright/test';

/**
 * M-interview E2E: complete the interview with clicks only, skip one question, unlock a
 * conditional screen, back-edit its trigger and watch it disappear, reach review, endorse on
 * /profile, see answer ids, and see the routine on /today. No page.fill / keyboard typing.
 */

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    // The skeleton ships no favicon; the browser's own /favicon.ico probe is not an app error.
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

test.describe('identity interview', () => {
  test('completes with clicks only, handles skip, conditionals and back-edits, endorses, and feeds Today', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/onboarding/identity');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Identity interview');
    await expect(page.locator('[data-screen-id]')).toBeVisible();

    // Fresh session: 30 visible, up to 3 more.
    await expect(page.locator('[data-progress-line]')).toContainText('Question 1 of 30 visible (up to 3 more may appear based on your answers)');

    const next = page.getByRole('button', { name: 'Next', exact: true });
    const back = page.getByRole('button', { name: 'Back', exact: true });
    const skip = page.getByRole('button', { name: 'Skip this question' });

    // Next is disabled until a valid selection exists.
    await expect(next).toBeDisabled();
    await expect(back).toBeDisabled();

    // Multi-select limit is stated and enforced on the first screen (max 3).
    await expect(page.locator('[data-max-select]')).toContainText('choose up to 3');
    await clickOption(page, 'goal_durable');
    await clickOption(page, 'goal_provide');
    await clickOption(page, 'goal_freedom');
    await page.locator('[data-option-id="goal_proof"]').click();
    await expect(page.locator('[data-option-id="goal_proof"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('You have chosen 3. Unselect one to choose another.')).toBeVisible();

    // Uncertainty clears substantive options; a substantive option clears uncertainty.
    await clickOption(page, 'goal_meaning.unsure');
    await expect(page.locator('[data-option-id="goal_durable"]')).toHaveAttribute('aria-pressed', 'false');
    await clickOption(page, 'goal_durable');
    await expect(page.locator('[data-option-id="goal_meaning.unsure"]')).toHaveAttribute('aria-pressed', 'false');
    await expect(next).toBeEnabled();
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
        // Choose the private option: the faith conditional must NOT appear.
        await clickOption(page, 'faith_private');
        await next.click();
        expect(await currentScreenId(page)).toBe('beliefs_selling');
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
        await expect(page.getByText('Changing this answer resets the answer that depends on it.')).toBeVisible();
        await clickOption(page, 'offer_different');
        await next.click();
        expect(await currentScreenId(page)).toBe('offer_materials');
        await expect(page.locator('[data-dependents-note]')).toContainText('a dependent answer was reset');
        unlockedOfferConditional = true;
        continue;
      }

      await clickFirstOption(page);
      await next.click();
    }

    // Review screen: statuses are visible per row.
    await expect(page.locator('[data-review-screen]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Review your answers' })).toBeVisible();
    await expect(page.locator('[data-review-row="needs_current"]')).toHaveAttribute('data-review-status', 'skipped');
    await expect(page.locator('[data-review-row="offer_least_control"]')).toHaveAttribute('data-review-status', 'not_applicable');
    await expect(page.locator('[data-review-row="faith_practice_standard"]')).toHaveAttribute('data-review-status', 'not_applicable');
    await expect(page.locator('[data-review-row="repetition_block_length"]')).toHaveAttribute('data-review-status', 'answered');
    await expect(page.locator('[data-review-row="offer_hypothesis"]')).toContainText('I have a different offer in mind');
    await expect(page.locator('[data-review-row][data-review-status="answered"]')).toHaveCount(30);
    await expect(page.getByText('Every visible question is answered or skipped.')).toBeVisible();

    // Edit link jumps back to the screen with the previous answer selected; Next returns to where we were.
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

    // Profile: sections with answer ids, unknowns, endorse.
    await page.locator('[data-continue-to-profile]').click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Profile');
    await expect(page.locator('[data-profile-status]')).toHaveAttribute('data-profile-status', 'unendorsed');
    await expect(page.locator('[data-plan-gate]')).toBeVisible();
    const standards = page.locator('[data-profile-section="chosen_standards"]');
    await expect(standards.locator('[data-answer-ids]')).toContainText('identity_statements');
    await expect(standards.locator('[data-answer-ids]')).toContainText('std_prepare');
    await expect(page.locator('[data-profile-section="practice_duration"]')).toContainText('20 minutes');
    await expect(page.locator('[data-unknowns]')).toContainText('skipped');

    await page.locator('[data-endorse-button]').click();
    await expect(page.locator('[data-profile-status]')).toHaveAttribute('data-profile-status', 'endorsed');
    await expect(page.locator('[data-profile-status]')).toContainText(/Endorsed \d{4}-\d{2}-\d{2}/);
    const plan = page.locator('[data-training-plan]');
    await expect(plan).toBeVisible();
    await expect(plan).toContainText('I prepare');
    await expect(plan).toContainText('Rehearse the approved opening and one branch');
    await expect(plan).toContainText('20 min');
    await expect(page.locator('[data-privacy-statement]')).toHaveText('Private. Never enters a prospect’s context. Export or delete below.');

    // Scoped export contains only interview keys.
    await page.locator('[data-export-interview]').click();
    const exported = JSON.parse((await page.locator('[data-export-json]').textContent()) ?? '{}') as {
      scope: string;
      entries: Record<string, unknown>;
    };
    expect(exported.scope).toBe('interview');
    expect(Object.keys(exported.entries).sort()).toEqual(['interview.profile', 'interview.session']);

    // Today renders the routine from the endorsed plan.
    await page.goto('/today');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today');
    await expect(page.locator('[data-next-drill]')).toContainText('Rehearse the approved opening and one branch');
    await expect(page.locator('[data-next-drill]')).toContainText('20 minutes');
    const routine = page.locator('[data-routine]');
    await expect(routine.locator('[data-routine-item="rehearse"]')).toContainText('Rehearse exact wording and one transition');
    await expect(routine.locator('[data-routine-item="calling_block"]')).toContainText('Not available in Increment 1 (no telephony)');
    await expect(routine.locator('[data-routine-item="review_two"]')).toContainText('None yet');
    await expect(routine.locator('[data-routine-item="change_one"]')).toContainText('Change one behavior');
    await expect(routine.locator('[data-routine-item="calling_block"] input[type="checkbox"]')).toBeDisabled();

    // Completion evidence checkbox persists across reload; minimum-action day keeps progress.
    await page.getByLabel('Rehearse exact wording and one transition').check();
    await expect(page.locator('[data-routine-progress]')).toContainText('1 of 3 completable items done today');
    await page.locator('[data-minimum-day]').check();
    await expect(page.locator('[data-routine-progress]')).toContainText('Minimum-action day');
    await page.locator('[data-minimum-day]').uncheck();
    await expect(page.locator('[data-routine-progress]')).toContainText('1 of 3 completable items done today');
    await page.reload();
    await expect(page.locator('[data-routine-progress]')).toContainText('1 of 3 completable items done today');

    // Evidence journal preset entry.
    await page.locator('[data-evidence-presets]').getByRole('button', { name: 'I respected a no-fit case' }).click();
    await expect(page.locator('[data-evidence-journal]')).toContainText('I respected a no-fit case');

    expect(errors).toEqual([]);
  });

  test('profile and today show calm empty states without a session', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/profile');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Profile');
    await expect(page.getByRole('link', { name: 'Start the identity interview' })).toBeVisible();
    await page.goto('/today');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today');
    await expect(page.getByRole('link', { name: 'Review and endorse your profile' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('options are keyboard operable: arrows move focus, Space toggles', async ({ page }) => {
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
});
