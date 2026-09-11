import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal e2e smoke. Runs the app shell + a static marketing page.
 * App-route assertions target the chrome (sidebar/header), not live Convex data,
 * so the suite passes without a seeded backend. For data assertions, run the
 * Convex dev backend first and add role-based cases.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
