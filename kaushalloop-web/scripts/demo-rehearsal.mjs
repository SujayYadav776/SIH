// 6.4 demo rehearsal: clean browser profile + throttled network (Fast 3G),
// full coordinator journey with per-step timing, then marketing load times,
// then backend-offline behaviour + static /fallback check.
// Budget: whole journey < 5 min (300s).
import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";
const CONVEX = "http://127.0.0.1:3210";
const OUT = "E:/SIH/audit_shots";
const BUDGET_S = 300;
const DWELL_MS = 4000; // simulate presenter narration pause per screen

const t0 = Date.now();
const steps = [];
async function step(name, fn) {
  const s = Date.now();
  await fn();
  const el = (Date.now() - s) / 1000;
  steps.push({ name, sec: +el.toFixed(1), total: +((Date.now() - t0) / 1000).toFixed(1) });
  console.log(`  ${name}: ${el.toFixed(1)}s (running ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); // clean profile: no storage state
const page = await ctx.newPage();

// Fast 3G throttle via CDP
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: 1_600_000 / 8, // 1.6 Mbps
  uploadThroughput: 750_000 / 8, // 750 Kbps
});

page.on("dialog", (d) => d.accept());

async function gotoAndReady(url, selector) {
  await step(`load ${url}`, async () => {
    await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(selector, { timeout: 45000 });
    await page.waitForTimeout(DWELL_MS);
  });
}

console.log("== coordinator journey (throttled, clean profile) ==");

await gotoAndReady("/", "main, [data-slot=sidebar-inset]");
await step("overview data lands", async () => {
  await page.waitForFunction(
    () => {
      const t = document.body.innerText;
      return t.includes("Coordinator overview") && /\bSQL\b/.test(t) && !t.includes("No cohorts yet");
    },
    undefined,
    { timeout: 45000 },
  );
  await page.screenshot({ path: path.join(OUT, "rehearse-1-overview.png") });
});

await gotoAndReady("/demand", "table");
await step("demand: select skill, provenance shows", async () => {
  const row = page.locator("table tbody tr[tabindex='0']").first();
  await row.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => !!document.querySelector("table tbody tr[aria-current]"),
    undefined,
    { timeout: 20000 },
  );
  await page.screenshot({ path: path.join(OUT, "rehearse-2-demand.png") });
});

await gotoAndReady("/cohorts", "table caption");
await step("cohorts: heatmap + intervention + what-if", async () => {
  await page.waitForFunction(
    () => /SQL/.test(document.body.innerText) && /Projected/i.test(document.body.innerText),
    undefined,
    { timeout: 30000 },
  );
  await page.screenshot({ path: path.join(OUT, "rehearse-3-cohorts.png") });
});

await gotoAndReady("/learners", "button");
await step("learners: roster drill-down", async () => {
  const btn = page.locator("main button").filter({ hasText: /Aarav|Demo Learner/ }).first();
  await btn.click();
  await page.waitForFunction(
    () => /gap|evidence|recommendation/i.test(document.body.innerText),
    undefined,
    { timeout: 20000 },
  );
  await page.screenshot({ path: path.join(OUT, "rehearse-4-learners.png") });
});

await gotoAndReady("/outcomes", "table");
await step("outcomes: funnel + CSV export", async () => {
  await page.waitForFunction(
    () => /Placed/i.test(document.body.innerText),
    undefined,
    { timeout: 30000 },
  );
  const dl = page.waitForEvent("download", { timeout: 20000 });
  await page.getByRole("button", { name: /Export CSV/i }).click();
  const download = await dl;
  if (!download.suggestedFilename().endsWith(".csv")) {
    throw new Error("CSV export filename wrong: " + download.suggestedFilename());
  }
  await page.screenshot({ path: path.join(OUT, "rehearse-5-outcomes.png") });
});

await gotoAndReady("/learner", "[role=tablist]");
await step("learner: verify one evidence row", async () => {
  const verify = page.getByRole("button", { name: "Verify" }).first();
  await verify.click();
  await page.waitForTimeout(3000); // mutation round-trip on slow net
  await page.screenshot({ path: path.join(OUT, "rehearse-6a-learner-verify.png") });
});
await step("learner: gaps tab shows claimed-unverified SQL", async () => {
  await page.getByRole("tab", { name: "Gaps" }).click();
  await page.waitForFunction(
    () => /SQL/i.test(document.body.innerText),
    undefined,
    { timeout: 20000 },
  );
});
await step("learner: generate action plan", async () => {
  await page.getByRole("tab", { name: "Action plan" }).click();
  await page.getByRole("button", { name: /Generate plan/i }).click();
  await page.waitForFunction(
    () => /SQL Project Sprint/.test(document.body.innerText),
    undefined,
    { timeout: 90000 },
  );
  await page.screenshot({ path: path.join(OUT, "rehearse-6b-learner-plan.png") });
});

await gotoAndReady("/data-quality", "main, [data-slot=sidebar-inset]");
await step("data-quality queue visible", async () => {
  await page.waitForFunction(
    () => /review|confidence|queue/i.test(document.body.innerText),
    undefined,
    { timeout: 30000 },
  );
});

async function toastsGone() {
  await page.mouse.move(640, 500); // sonner pauses dismissal while hovered; header sits under the toast stack
  await page.waitForFunction(
    () => !document.querySelector('[data-sonner-toast][data-visible="true"]'),
    undefined,
    { timeout: 20000 },
  );
}

async function waitReload() {
  await page.evaluate(() => { window.__preAction = true; });
  await page.waitForFunction(
    () => !window.__preAction && /Coordinator overview|KaushalLoop/.test(document.body.innerText),
    undefined,
    { timeout: 120000 },
  );
}

await step("demo controls: load scenario (reset + overlay)", async () => {
  await page.getByRole("button", { name: /Load demo scenario/i }).click();
  await waitReload();
});
await step("scenario state visible: SQL plan started", async () => {
  await page.goto(BASE + "/learner", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("[role=tablist]", { timeout: 45000 });
  await page.getByRole("tab", { name: "Action plan" }).click();
  await page.waitForFunction(
    () => /started/i.test(document.body.innerText),
    undefined,
    { timeout: 30000 },
  );
});
await step("demo controls: reset", async () => {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("h1", { timeout: 45000 });
  await page.getByRole("button", { name: /Reset demo data/i }).click();
  await waitReload();
});

console.log("== marketing load (throttled) ==");
for (const [url, sel] of [["/product", "h1"], ["/institutions", "h1"], ["/evidence", "h1"], ["/contact", "form"]]) {
  await gotoAndReady(url, sel);
}

const total = (Date.now() - t0) / 1000;
console.log(`\nJOURNEY TOTAL: ${total.toFixed(1)}s / budget ${BUDGET_S}s -> ${total < BUDGET_S ? "PASS" : "FAIL"}`);

// --- offline-backend behaviour: Convex unreachable, web server still up
console.log("\n== backend-offline behaviour ==");
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx2.route("**/*", (route) => {
  const u = route.request().url();
  if (u.startsWith(CONVEX)) return route.abort("connectionrefused");
  return route.continue();
});
const p2 = await ctx2.newPage();
let appCrashed = false;
p2.on("pageerror", () => { appCrashed = true; });
await p2.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await p2.waitForTimeout(8000);
const appShellOk = await p2.evaluate(
  () => /Coordinator overview|Loading|KaushalLoop/.test(document.body.innerText),
);
console.log("app with dead backend: renders shell without hard crash:", appShellOk && !appCrashed);
await p2.goto(BASE + "/fallback", { waitUntil: "domcontentloaded", timeout: 60000 });
const fb = await p2.evaluate(() => ({
  hasKpis: /60/.test(document.body.innerText) && /Placed/.test(document.body.innerText),
  hasLabel: /snapshot|static/i.test(document.body.innerText),
}));
await p2.screenshot({ path: path.join(OUT, "rehearse-7-fallback-offline.png") });
console.log("fallback renders offline with data + label:", fb.hasKpis && fb.hasLabel);

await browser.close();
fs.writeFileSync(path.join(OUT, "rehearsal-steps.json"), JSON.stringify({ totalSec: total, steps }, null, 2));
