import { expect, test } from "@playwright/test";

test("marketing landing renders its hero", async ({ page }) => {
  await page.goto("/product");
  await expect(
    page.getByRole("heading", { name: /Turn local job demand into verified learner readiness/i }),
  ).toBeVisible();
});

test("app shell chrome is present at /", async ({ page }) => {
  await page.goto("/");
  // Assert the static chrome (header breadcrumb), not live Convex data.
  await expect(page.getByText("Coordinator").first()).toBeVisible();
});

test("demand route loads without error", async ({ page }) => {
  await page.goto("/demand");
  await expect(page.locator("body")).toBeVisible();
});
