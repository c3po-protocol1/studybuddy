import { test, expect } from "@playwright/test";
import {
  authenticateUser,
  generateTestUser,
  registerUser,
  createGroupViaAPI,
} from "./helpers/auth";

test.describe("Study Groups", () => {
  test("create a new group via the modal", async ({ page, request }) => {
    await authenticateUser(page, request);
    await page.goto("/groups");

    // Click "새 그룹" button
    await page.getByTestId("create-group-btn").click();

    // Modal should appear
    const modal = page.getByTestId("create-group-modal");
    await expect(modal).toBeVisible();

    // Fill in group name
    await page.getByTestId("group-name-input").fill("E2E 테스트 그룹");

    // Fill in description
    await page.getByTestId("group-description-input").fill("Playwright 테스트용 그룹입니다");

    // Select a different emoji (🧮)
    await modal.locator("button", { hasText: "🧮" }).click();

    // Submit
    await page.getByTestId("create-group-submit").click();

    // Modal should close and group should appear in the list
    await expect(modal).not.toBeVisible({ timeout: 5_000 });

    // Verify the group appears in the grid
    const grid = page.getByTestId("group-grid");
    await expect(grid).toBeVisible({ timeout: 5_000 });
    await expect(grid.getByText("E2E 테스트 그룹")).toBeVisible();
  });

  test("navigate to group detail page", async ({ page, request }) => {
    const { token } = await authenticateUser(page, request);

    // Create a group via API
    const group = await createGroupViaAPI(request, token, {
      name: "Detail Test Group",
      emoji: "🔬",
      description: "Testing group detail page",
    });

    await page.goto("/groups");
    await page.waitForSelector('[data-testid="group-grid"]');

    // Click into the group
    await page.getByTestId(`group-card-${group.id}`).click();

    // Should navigate to group detail page
    await expect(page).toHaveURL(`/groups/${group.id}`, { timeout: 5_000 });

    // Verify group header loads
    const header = page.getByTestId("group-header");
    await expect(header).toBeVisible();
    await expect(header.getByText("Detail Test Group")).toBeVisible();
    await expect(header.getByText("Testing group detail page")).toBeVisible();
  });

  test("invite a member to the group", async ({ page, request }) => {
    const { token } = await authenticateUser(page, request);

    // Create a second user to invite
    const invitee = generateTestUser("invitee");
    await registerUser(request, invitee);

    // Create a group via API
    const group = await createGroupViaAPI(request, token, {
      name: "Invite Test Group",
      emoji: "📝",
    });

    // Navigate to group detail
    await page.goto(`/groups/${group.id}`);
    await page.waitForSelector('[data-testid="group-header"]');

    // Click invite button
    await page.getByTestId("invite-member-btn").click();

    // Invite modal should appear
    const modal = page.getByTestId("invite-member-modal");
    await expect(modal).toBeVisible();

    // Enter invitee email
    await page.getByTestId("invite-email-input").fill(invitee.email);

    // Submit
    await page.getByTestId("invite-submit").click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5_000 });

    // Member list should now show the invited user as pending
    const memberList = page.getByTestId("member-list");
    await expect(memberList).toBeVisible();
    await expect(memberList.getByText(invitee.email)).toBeVisible({
      timeout: 5_000,
    });
    await expect(memberList.getByText("대기 중")).toBeVisible();
  });

  test("empty state shows when no groups exist", async ({ page, request }) => {
    await authenticateUser(page, request);
    await page.goto("/groups");

    // Should show empty state text (if no groups created for this user)
    await expect(
      page.getByText("아직 스터디 그룹이 없어요")
    ).toBeVisible({ timeout: 5_000 });
  });
});
