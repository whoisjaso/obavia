import { expect, test } from "@playwright/test";

test("tap flow: good credit, $500 down, $400 a month, Tesla Model 3 → honest hero + alternatives + dealer hand-off", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator(".large-title")).toContainText("What can I actually get");
  await expect(page.getByTestId("ask-credit")).toBeVisible();
  await page.locator("[data-testid=choice][data-value='good credit']").click();
  await expect(page.getByTestId("ask-down")).toBeVisible({ timeout: 30_000 });
  await page.locator("[data-testid=choice][data-value='$500 down']").click();
  await expect(page.getByTestId("ask-monthly")).toBeVisible({ timeout: 30_000 });
  await page.locator("[data-testid=choice][data-value='$400 a month']").click();
  await expect(page.getByTestId("ask-car")).toBeVisible({ timeout: 30_000 });
  await page.locator("[data-testid=choice][data-value='Tesla Model 3']").click();

  await expect(page.getByTestId("cards").first()).toBeVisible({ timeout: 30_000 });
  const hero = page.locator("[data-testid=fitcard]").first();
  await expect(hero).toContainText("Tesla Model 3");
  await expect(hero).toHaveAttribute("data-fit", /stretch|unlikely/);
  await expect(page.getByTestId("alts")).toBeVisible();
  await hero.locator("summary").click();
  await expect(hero.locator(".why li").first()).toBeVisible();
  const body = (await page.textContent("body")) ?? "";
  expect(body).not.toMatch(/\b(approved|prequalified|guaranteed)\b/i);
  await expect(page.locator(".fineprint").first()).toContainText("Not a credit decision");

  await page.getByTestId("talk").click();
  await page.getByTestId("inq-name").fill("Test Buyer");
  await page.getByTestId("inq-contact").fill("713-555-0100");
  await page.getByTestId("inq-send").click();
  await expect(page.locator("[data-testid=msg-assistant]").last()).toContainText("A dealer will reach out", { timeout: 30_000 });

  // The inquiry lands in the dealer's Today list.
  await page.goto("/en/dealer");
  await expect(page.getByTestId("today-list")).toContainText("Test Buyer");
  await expect(page.getByTestId("today-list")).toContainText("713-555-0100");
});

test("typed sentence skips straight to results; Spanish asks for credit first", async ({ page }) => {
  await page.goto("/en");
  await page.fill("[data-testid=composer]", "I have a 700 credit score, want a Tesla Model 3, and can only afford $600 down and about $400 a month");
  await page.click("[data-testid=send]");
  await expect(page.getByTestId("cards").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid=fitcard]").first()).toHaveAttribute("data-fit", /stretch|unlikely/);

  await page.goto("/es");
  await expect(page.getByTestId("ask-credit")).toContainText(/crédito/i);
  await page.locator("[data-testid=choice][data-value='mal crédito']").click();
  await expect(page.getByTestId("ask-down")).toBeVisible({ timeout: 30_000 });
});
