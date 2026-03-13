import { test, expect } from "@playwright/test";
import { authenticateUser } from "./helpers/auth";

test.describe("Mobile Responsive Navigation", () => {
  test("mobile viewport shows hamburger menu with navigation links", async ({
    page,
    request,
  }) => {
    await authenticateUser(page, request);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForSelector('[data-testid="mobile-menu-toggle"]');

    // Hamburger button should be visible
    const hamburger = page.getByTestId("mobile-menu-toggle");
    await expect(hamburger).toBeVisible();

    // Desktop nav should be hidden
    const desktopNav = page.getByTestId("desktop-nav");
    await expect(desktopNav).not.toBeVisible();

    // Mobile menu should not be open yet
    await expect(page.getByTestId("mobile-menu")).not.toBeVisible();

    // Click hamburger → mobile menu opens
    await hamburger.click();
    const mobileMenu = page.getByTestId("mobile-menu");
    await expect(mobileMenu).toBeVisible();

    // Verify mobile menu contains links: 그룹, 설정, 로그아웃
    await expect(mobileMenu.getByText("그룹")).toBeVisible();
    await expect(mobileMenu.getByText("설정")).toBeVisible();
    await expect(mobileMenu.getByText("로그아웃")).toBeVisible();
  });

  test("desktop viewport shows desktop nav, hides hamburger", async ({
    page,
    request,
  }) => {
    await authenticateUser(page, request);

    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForSelector('[data-testid="desktop-nav"]');

    // Desktop nav should be visible
    await expect(page.getByTestId("desktop-nav")).toBeVisible();

    // Hamburger button should be hidden
    await expect(page.getByTestId("mobile-menu-toggle")).not.toBeVisible();
  });
});
