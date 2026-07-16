import { test, expect } from "@playwright/test";

test.describe("Dashboard Login", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator("h1")).toContainText("Nantian Gateway");
    await expect(page.locator('input[name="token"]')).toBeVisible();
  });

  test("empty token shows error", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=Please enter")).toBeVisible();
  });

  test("invalid token shows error", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator('input[name="token"]').fill("invalid-token");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator("text=Invalid")).toBeVisible();
  });

  test("unauthenticated redirects to login", async ({ page }) => {
    await page.goto("/en/overview");
    await expect(page).toHaveURL(/\/en\/login/);
  });
});
