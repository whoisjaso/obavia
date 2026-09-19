import { expect, test } from "@playwright/test";

test("S001-A end to end: workspace → check → invite → accept → status → delivery → registration", async ({ page, browser }) => {
  await page.goto("/en/dealer/workspaces/new");
  await page.fill("#vin", "1HGCM82633A004352");
  await page.fill("#buyerName", "Ana Ruiz");
  await page.fill("#buyerPhone", "713-555-0100");
  await page.selectOption("#buyerLocale", "es");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/en\/dealer\/workspaces\/deal_/);
  const dealUrl = page.url();

  await expect(page.getByTestId("no-check")).toBeVisible();
  await page.click("[data-testid=run-check]");
  await expect(page.getByTestId("verdict")).toHaveAttribute("data-verdict", "REVIEW_REQUIRED");
  const body = await page.textContent("body");
  expect(body).not.toMatch(/\bapproved\b/i);

  await page.click("[data-testid=send-invite]");
  await expect(page.getByTestId("relationship-status")).toHaveAttribute("data-status", "invited");
  const inviteUrl = await page.getByTestId("invite-link").getAttribute("href");
  expect(inviteUrl).toMatch(/\/es\/c\//);

  // Forwarded link with wrong contact yields nothing (AC-7)
  const buyer = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const bp = await buyer.newPage();
  await bp.goto(inviteUrl!);
  await bp.fill("#contact", "wrong@example.com");
  await bp.click("[data-testid=accept]");
  await expect(bp.getByTestId("accept-error")).toBeVisible();
  await bp.fill("#contact", "(713) 555-0100");
  await bp.click("[data-testid=accept]");
  await expect(bp).toHaveURL(/\/es\/me\/deals\//);
  await expect(bp.locator("[data-dim=delivery]")).toHaveAttribute("data-state", "not_scheduled");
  await expect(bp.locator("[data-dim=registration]")).toHaveAttribute("data-state", "not_ready");

  // Dealer records delivery
  await page.goto(dealUrl);
  await expect(page.getByTestId("relationship-status")).toHaveAttribute("data-status", "accepted");
  await page.check("input[name=confirm]");
  await page.click("[data-testid=record-delivery]");
  await expect(page.locator("[data-dim=delivery]")).toHaveAttribute("data-state", "delivered");
  await expect(page.locator("[data-dim=registration]")).toHaveAttribute("data-state", "ready");

  // Buyer sees delivered + registration in progress at once (AC-5)
  await bp.reload();
  await expect(bp.locator("[data-dim=delivery]")).toHaveAttribute("data-state", "delivered");
  await expect(bp.locator("[data-dim=registration]")).toHaveAttribute("data-state", "ready");
  await expect(bp.getByTestId("next-action")).toContainText("condado");

  // Registration evidence → submitted; review eligibility recorded
  await page.fill("#regFile", "webdealer-receipt.pdf");
  await page.click("[data-testid=upload-reg-evidence]");
  await expect(page.locator("[data-dim=registration]")).toHaveAttribute("data-state", "submitted");
  await expect(page.getByTestId("review-eligible")).toBeVisible();

  // Cross-tenant URL yields nothing (AC-1)
  const res = await page.goto("/en/dealer/workspaces/deal_other_fixture");
  expect(res?.status()).toBe(404);

  // Unauthenticated customer cannot read status (AC-2)
  const stranger = await browser.newContext();
  const sp = await stranger.newPage();
  await sp.goto(bp.url());
  await expect(sp.getByTestId("unauthorized")).toBeVisible();
});
