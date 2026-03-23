import { test, expect } from "@playwright/test";
import { authenticateUser } from "./helpers/auth";

test.describe("Dark Mode Toggle", () => {
  test.beforeEach(async ({ page, request }) => {
    await authenticateUser(page, request);
  });

  test("cycles through system → light → dark and persists after reload", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="theme-toggle-btn"]');

    const btn = page.getByTestId("theme-toggle-btn");

    // Initial state should be "system" (default)
    await expect(btn).toHaveAttribute("data-theme", "system");

    // Click 1: system → light
    await btn.click();
    await expect(btn).toHaveAttribute("data-theme", "light");

    // In light mode, html should NOT have "dark" class
    const htmlEl = page.locator("html");
    await expect(htmlEl).not.toHaveClass(/dark/);

    // Click 2: light → dark
    await btn.click();
    await expect(btn).toHaveAttribute("data-theme", "dark");

    // In dark mode, html should have "dark" class
    await expect(htmlEl).toHaveClass(/dark/);

    // Click 3: dark → system
    await btn.click();
    await expect(btn).toHaveAttribute("data-theme", "system");

    // Set to dark for persistence test
    await btn.click(); // system → light
    await btn.click(); // light → dark
    await expect(btn).toHaveAttribute("data-theme", "dark");

    // Reload and verify theme persists from localStorage
    await page.reload();
    await page.waitForSelector('[data-testid="theme-toggle-btn"]');
    const btnAfterReload = page.getByTestId("theme-toggle-btn");
    await expect(btnAfterReload).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
