// Phase 6.1-6.3 verification sweep:
// every route x light/dark x desktop(1280)/mobile(375), collecting
// console errors, axe a11y+contrast violations, and screenshots.
import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = "E:/SIH/audit_shots";
const AXE = path.resolve("node_modules/axe-core/axe.min.js");
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { p: "/", name: "app-overview", app: true, focus: "main h1" },
  { p: "/demand", name: "app-demand", app: true, focus: "main h1, main h2" },
  { p: "/cohorts", name: "app-cohorts", app: true, focus: "main table caption" },
  { p: "/learners", name: "app-learners", app: true, focus: "main" },
  { p: "/learner", name: "app-learner", app: true, focus: "main" },
  { p: "/outcomes", name: "app-outcomes", app: true, focus: "main h1" },
  { p: "/data-quality", name: "app-data-quality", app: true, focus: "main" },
  { p: "/interventions", name: "app-interventions", app: true, focus: "main" },
  { p: "/assessments", name: "app-assessments", app: true, focus: "main" },
  { p: "/settings", name: "app-settings", app: true, focus: "main" },
  { p: "/product", name: "mkt-product", app: false, focus: "h1" },
  { p: "/institutions", name: "mkt-institutions", app: false, focus: "h1" },
  { p: "/evidence", name: "mkt-evidence", app: false, focus: "h1" },
  { p: "/contact", name: "mkt-contact", app: false, focus: "h1" },
  { p: "/fallback", name: "app-fallback", app: false, focus: "h1" },
];
const MODES = ["light", "dark"];
const VPS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile375", width: 375, height: 812 },
];

const results = [];
const browser = await chromium.launch();

for (const route of ROUTES) {
  for (const mode of MODES) {
    for (const vp of VPS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const consoleErrors = [];
      const page = await ctx.newPage();
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
      page.on("pageerror", (e) => consoleErrors.push("PAGEERROR " + String(e).slice(0, 200)));
      // set theme before load (next-themes storage key)
      await page.addInitScript((t) => window.localStorage.setItem("theme", t), mode);
      try {
        await page.goto(BASE + route.p, { waitUntil: "domcontentloaded", timeout: 45000 });
        if (route.focus) await page.waitForSelector(route.focus, { timeout: 30000 });
        if (route.app) {
          // let Convex queries land; wait until no skeleton pulse remains (best-effort, max 20s)
          await page.waitForTimeout(2500);
          await page
            .waitForFunction(
              () => !document.querySelector('[class*="animate-pulse"], [data-slot="skeleton"]'),
              { timeout: 20000 }
            )
            .catch(() => {});
        }
        await page.waitForTimeout(800);
        const shot = `${route.name}__${mode}__${vp.name}.png`;
        await page.screenshot({ path: path.join(OUT, shot), fullPage: vp.name === "desktop" && !route.app });
        // horizontal overflow check at 375
        let overflow = null;
        if (vp.name === "mobile375") {
          overflow = await page.evaluate(() => {
            const d = document.documentElement;
            return d.scrollWidth - d.clientWidth; // px of horizontal page overflow
          });
        }
        // axe audit
        await page.addScriptTag({ path: AXE });
        const axeRes = await page.evaluate(async () => {
          // contrast rule needs no iframes; run on whole doc
          return window.axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
          });
        });
        const violations = axeRes.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          n: v.nodes.length,
          sample: v.nodes.slice(0, 2).map((n) => (n.target.join(" ") + " :: " + (n.failureSummary || "")).slice(0, 160)),
        }));
        results.push({ route: route.p, mode, vp: vp.name, shot, consoleErrors: [...new Set(consoleErrors)].slice(0, 5), overflow, violations });
        console.log(`${route.p} ${mode}/${vp.name}: ${violations.length} axe groups, ${consoleErrors.length} console errors${overflow !== null ? `, overflow ${overflow}px` : ""}`);
      } catch (e) {
        results.push({ route: route.p, mode, vp: vp.name, error: String(e).slice(0, 300) });
        console.log(`${route.p} ${mode}/${vp.name}: FAILED ${String(e).slice(0, 120)}`);
      }
      await ctx.close();
    }
  }
}

// keyboard interaction spot-checks (outcomes row select + mobile sidebar trigger)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => window.localStorage.setItem("theme", "light"));
  await page.goto(BASE + "/outcomes", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("table tbody tr", { timeout: 30000 });
  await page.waitForTimeout(2500);
  const kb = await page.evaluate(() => {
    const row = document.querySelector('table tbody tr[tabindex="0"]');
    if (!row) return "no focusable row";
    row.focus();
    row.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    return "entered";
  });
  await page.waitForTimeout(1200);
  const timelineTitle = await page.evaluate(
    () => document.querySelector('[data-slot="card"] h3, .card-title, [class*="CardTitle"]')?.textContent ||
      Array.from(document.querySelectorAll("h3")).map((h) => h.textContent).join("|")
  );
  // focus ring check: Tab a few times, look for visible outline
  const focusRing = await page.evaluate(() => {
    const el = document.activeElement;
    const st = getComputedStyle(el);
    return { tag: el.tagName, outline: st.outlineWidth + " " + st.outlineStyle, shadow: st.boxShadow.slice(0, 80) };
  });
  // reduced-motion smoke
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({ path: path.join(OUT, "reduced-motion__outcomes.png") });
  results.push({ test: "keyboard-select-outcomes", kb, timelineTitle, focusRing });
  console.log("keyboard:", JSON.stringify({ kb, timelineTitle, focusRing }).slice(0, 400));
  await ctx.close();
}

// mobile sidebar: sheet opens on 375
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main h1", { timeout: 30000 });
  const trigger = page.locator('[data-sidebar="trigger"], button:has-text("Toggle")').first();
  let sheet = "no trigger found";
  if (await trigger.count()) {
    await trigger.click();
    await page.waitForTimeout(700);
    sheet = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog ? "sheet open, links=" + dialog.querySelectorAll("a").length : "no dialog";
    });
    await page.screenshot({ path: path.join(OUT, "mobile-sidebar-sheet.png") });
  }
  results.push({ test: "mobile-sidebar", sheet });
  console.log("mobile sidebar:", sheet);
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, "audit-results.json"), JSON.stringify(results, null, 2));

// summary
const totalViol = results.reduce((s, r) => s + (r.violations?.reduce((a, v) => a + v.n, 0) || 0), 0);
const fails = results.filter((r) => r.error);
console.log(`\nDONE. axe violation nodes total=${totalViol}, route failures=${fails.length}`);
