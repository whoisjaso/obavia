import { expect, test } from "@playwright/test";

test("buyer flow: Good credit, $500 down, $400/mo, Tesla Model 3 → honest score, alternatives, dealer hand-off", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByTestId("step-credit")).toBeVisible();
  await page.getByTestId("credit-prime").click();
  await expect(page.getByTestId("step-budget")).toBeVisible();
  await page.getByTestId("down-slider").fill("500");
  await expect(page.getByTestId("down-value")).toContainText("$500");
  await page.getByTestId("monthly-slider").fill("400");
  await page.getByTestId("next").click();
  await expect(page.getByTestId("step-car")).toBeVisible();
  await page.getByTestId("body-ev").click();
  await page.getByTestId("model-tesla-model-3").click();

  await expect(page.getByTestId("fitcard").first()).toBeVisible({ timeout: 30_000 });
  const hero = page.getByTestId("fitcard").first();
  await expect(hero).toContainText("Tesla Model 3");
  await expect(hero).toHaveAttribute("data-fit", /stretch|unlikely/);
  await expect(page.getByTestId("score")).toBeVisible();
  await expect(page.getByTestId("feed")).toBeVisible();
  const firstPick = await page.getByTestId("post").first().getAttribute("data-id");
  await page.getByTestId("save").first().click();
  await page.getByTestId("pass").nth(1).click();
  await page.getByTestId("tab-saved").click();
  await expect(page.getByTestId("saved-row")).toHaveCount(1);
  expect(firstPick).toBeTruthy();
  await page.locator(".scrim").click({ position: { x: 5, y: 5 } });
  await hero.locator("summary").click();
  await expect(hero.locator(".why li").first()).toBeVisible();
  const body = (await page.textContent("body")) ?? "";
  expect(body).not.toMatch(/\b(approved|prequalified|guaranteed)\b/i);
  await expect(page.locator(".fineprint")).toContainText("Not a credit decision");

  await page.getByTestId("talk").click();
  await page.getByTestId("inq-name").fill("Test Buyer");
  await page.getByTestId("inq-contact").fill("713-555-0100");
  await page.getByTestId("inq-send").click();
  await expect(page.getByTestId("sent")).toBeVisible({ timeout: 30_000 });

  await page.goto("/en/dealer");
  await expect(page.getByTestId("today-list")).toContainText("Test Buyer");
  await expect(page.getByTestId("today-list")).toContainText("713-555-0100");
});

test("show me what fits, adjust numbers with live preview; Spanish", async ({ page }) => {
  await page.goto("/en");
  await page.getByTestId("credit-near_prime").click();
  await page.getByTestId("next").click();
  await page.getByTestId("any-car").click();
  await expect(page.getByTestId("fitcard").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("fitcard").first()).toHaveAttribute("data-fit", "likely");
  await page.getByText("Adjust", { exact: true }).click();
  await expect(page.getByTestId("live")).toBeVisible({ timeout: 10_000 });
  // Returning buyer lands on the result, no re-entry.
  await page.reload();
  await expect(page.getByTestId("welcome")).toBeVisible();
  await expect(page.getByTestId("fitcard").first()).toBeVisible();

  await page.evaluate(() => localStorage.clear());
  await page.goto("/es");
  await expect(page.getByTestId("step-credit")).toContainText(/crédito/i);
  await page.getByTestId("credit-subprime").click();
  await expect(page.getByTestId("step-budget")).toContainText(/enganche/i);
});
