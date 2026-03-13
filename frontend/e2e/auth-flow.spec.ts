import { test, expect } from "@playwright/test";
import { generateTestUser } from "./helpers/auth";

test.describe("Auth Flow", () => {
  test("sign up with a new user and redirect to dashboard", async ({
    page,
  }) => {
    const user = generateTestUser("signup");

    await page.goto("/auth/signup");

    await page.getByTestId("signup-name").fill(user.name);
    await page.getByTestId("signup-email").fill(user.email);
    await page.getByTestId("signup-password").fill(user.password);
    await page.getByTestId("signup-submit").click();

    // After successful signup + auto-login, should redirect to dashboard
    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test("sign in with existing user and redirect to dashboard", async ({
    page,
    request,
  }) => {
    const user = generateTestUser("signin");

    // Register user via API first
    await request.post("http://localhost:8080/api/auth/register", {
      data: {
        email: user.email,
        password: user.password,
        name: user.name,
      },
    });

    await page.goto("/auth/signin");

    await page.getByTestId("signin-email").fill(user.email);
    await page.getByTestId("signin-password").fill(user.password);
    await page.getByTestId("signin-submit").click();

    await expect(page).toHaveURL("/", { timeout: 10_000 });
  });

  test("sign in with wrong password shows error", async ({ page, request }) => {
    const user = generateTestUser("bad-pw");

    await request.post("http://localhost:8080/api/auth/register", {
      data: {
        email: user.email,
        password: user.password,
        name: user.name,
      },
    });

    await page.goto("/auth/signin");

    await page.getByTestId("signin-email").fill(user.email);
    await page.getByTestId("signin-password").fill("WrongPassword999!");
    await page.getByTestId("signin-submit").click();

    await expect(page.getByTestId("signin-error")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("signup link navigates to signup page", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByTestId("signin-signup-link").click();
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test("signin link navigates to signin page", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.getByTestId("signup-signin-link").click();
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
