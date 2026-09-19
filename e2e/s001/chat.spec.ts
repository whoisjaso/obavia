import { expect, test } from "@playwright/test";

test("buyer chat: 700 score, $600 down, Tesla Model 3 → honest estimate with alternatives", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator(".large-title")).toContainText("What can I actually get");
  await page.fill("[data-testid=composer]", "I have a 700 credit score, want a Tesla Model 3, and can only afford $600 down and about $400 a month");
  await page.click("[data-testid=send]");
  await expect(page.getByTestId("cards").first()).toBeVisible({ timeout: 30_000 });
  const primary = page.locator("[data-testid=fitcard]").first();
  await expect(primary).toContainText("Tesla Model 3");
  await expect(primary).toHaveAttribute("data-fit", /stretch|unlikely/);
  await expect(page.locator("[data-testid=fitcard]").nth(1)).toBeVisible();
  const body = (await page.textContent("body")) ?? "";
  expect(body).not.toMatch(/\b(approved|prequalified|guaranteed)\b/i);
  await expect(page.locator(".fineprint").first()).toContainText("Not a credit decision");
});

test("buyer chat asks for one missing fact at a time", async ({ page }) => {
  await page.goto("/es");
  await page.fill("[data-testid=composer]", "quiero un Toyota Corolla");
  await page.click("[data-testid=send]");
  const last = page.locator("[data-testid=msg-assistant]").last();
  await expect(last).toContainText(/crédito/i, { timeout: 30_000 });
});
