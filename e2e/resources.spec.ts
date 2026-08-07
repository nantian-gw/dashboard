import { test, expect } from "@playwright/test";

test.describe("Dashboard Resource Pages", () => {
  test("gateways page redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/en/gateways");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("routes page redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/en/routes");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("backends page redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/en/backends");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("nodes page redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/en/nodes");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("settings page redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/en/settings");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("AI overview page redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/en/ai/overview");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("WASM plugins page redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/en/wasm/plugins");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("health endpoint returns 200", async ({ page }) => {
    const response = await page.request.get("/api/health");
    expect(response.status()).toBe(200);
  });
});