// Headful preview tour: opens a real browser, walks every page of the site,
// then stays open for manual exploration. Close the window when done.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE || "http://localhost:3000";
const ROUTES = [
  ["/product", "Landing: the pitch"],
  ["/institutions", "For institutions"],
  ["/evidence", "Evidence & trust"],
  ["/contact", "Contact"],
  ["/", "Coordinator overview (live Convex data)"],
  ["/demand", "Skills by demand + provenance"],
  ["/cohorts", "Evidence heatmap + intervention planner"],
  ["/learners", "Learner roster + drill-down"],
  ["/learner", "Learner journey (evidence/gaps/plan/assessment)"],
  ["/outcomes", "Outcome funnel + CSV export"],
  ["/data-quality", "Review queue"],
  ["/settings", "Weights & settings"],
  ["/fallback", "Static read-only snapshot"],
];

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 } });
const page = await ctx.newPage();

for (const [route, label] of ROUTES) {
  console.log(`-> ${route}  ${label}`);
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
  } catch {
    /* keep the tour going */
  }
  await page.waitForTimeout(3200);
  if (page.isClosed()) break;
}

console.log("\nTour finished. The window is yours: sidebar for the app, header nav for marketing.");
console.log("Close the browser window when you are done.");
// idle until the user closes the window
await new Promise((resolve) => {
  page.on("close", resolve);
  ctx.on("close", resolve);
  browser.on("disconnected", resolve);
});
