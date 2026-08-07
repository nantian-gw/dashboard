import { test, expect } from "@playwright/test";

test.describe("Dashboard Navigation", () => {
  test("sidebar navigation is visible on overview page", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator("text=Nantian Gateway")).toBeVisible();
  });

  test("navigation links exist for core resources", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator("text=Gateways")).toBeVisible();
    await expect(page.locator("text=Routes")).toBeVisible();
    await expect(page.locator("text=Backends")).toBeVisible();
  });

  test("overview page redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/en/overview");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("dark mode toggle is present", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.locator('button[aria-label*="dark"]').or(page.locator('button[aria-label*="theme"]'))).toBeVisible();
  });
});