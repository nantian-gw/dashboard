import { test, expect } from "@playwright/test";

test.describe("Dashboard Localization", () => {
  test("login page is accessible in English", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator("h1")).toContainText("Nantian Gateway");
    await expect(page.locator('input[name="token"]')).toBeVisible();
  });

  test("login page is accessible in Chinese", async ({ page }) => {
    await page.goto("/zh/login");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('input[name="token"]')).toBeVisible();
  });

  test("locale switcher is present on login page", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator("text=English").or(page.locator("text=中文"))).toBeVisible();
  });

  test("root path redirects to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/en\/login|\/zh\/login/);
  });
});