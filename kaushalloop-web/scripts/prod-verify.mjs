// Production smoke: load live routes, confirm real Convex data renders
// (proves NEXT_PUBLIC_CONVEX_URL + DEV_AUTH are wired in the deployed build),
// run axe on the key surfaces, and capture a screenshot set.
import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE || "https://kaushalloop.vercel.app";
const AXE = path.resolve("../node_modules/axe-core/axe.min.js");
const OUT = "E:/SIH/prod_shots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];

async function check(route, name, dataRegex, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.w || 1280, height: opts.h || 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 160)));
  if (opts.dark) await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  const t = Date.now();
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45000 });
    // wait for real data (Convex round-trip) up to 25s
    let dataOk = false;
    try {
      await page.waitForFunction((re) => new RegExp(re).test(document.body.innerText), dataRegex, { timeout: 25000 });
      dataOk = true;
    } catch { dataOk = false; }
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: !!opts.full });
    await page.addScriptTag({ path: AXE });
    const axe = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "best-practice"] } }));
    const viol = axe.violations.reduce((s, v) => s + v.nodes.length, 0);
    results.push({ route, name, dataOk, ms: Date.now() - t, viol, errs: [...new Set(errs)].slice(0, 3) });
    console.log(`${dataOk ? "OK " : "NO-DATA"} ${route.padEnd(16)} ${String(Date.now() - t).padStart(5)}ms  axe=${viol}  err=${errs.length}`);
  } catch (e) {
    results.push({ route, name, error: String(e).slice(0, 200) });
    console.log(`FAIL ${route}: ${String(e).slice(0, 120)}`);
  }
  await ctx.close();
}

console.log("BASE:", BASE);
// app routes: assert seeded demo content actually rendered from Convex
await check("/", "app-overview", "Coordinator overview[\\s\\S]*SQL");
await check("/demand", "app-demand", "SQL");
await check("/cohorts", "app-cohorts", "Evidence heatmap[\\s\\S]*SQL");
await check("/learners", "app-learners", "Aarav|Demo Learner");
await check("/learner", "app-learner", "Aarav");
await check("/outcomes", "app-outcomes", "Placed");
await check("/data-quality", "app-data-quality", "confidence|queue|Review|clear");
// marketing
await check("/product", "mkt-product", "verified learner readiness", { full: true });
await check("/institutions", "mkt-institutions", "cohort-level gap map");
await check("/evidence", "mkt-evidence", "deterministic");
await check("/contact", "mkt-contact", "Name");
// dark + mobile spot checks
await check("/", "app-overview-dark", "Coordinator overview", { dark: true });
await check("/cohorts", "app-cohorts-dark", "SQL", { dark: true });
await check("/product", "mkt-product-mobile", "verified learner readiness", { w: 375, h: 812 });
await check("/", "app-overview-mobile", "Coordinator overview", { w: 375, h: 812 });

await browser.close();
const noData = results.filter((r) => r.dataOk === false);
const viol = results.reduce((s, r) => s + (r.viol || 0), 0);
const errs = results.reduce((s, r) => s + (r.errs?.length || 0), 0);
const fails = results.filter((r) => r.error);
fs.writeFileSync(path.join(OUT, "prod-results.json"), JSON.stringify(results, null, 2));
console.log(`\nSUMMARY: routes=${results.length} no-data=${noData.length} axe-nodes=${viol} console-errs=${errs} failures=${fails.length}`);
if (noData.length) console.log("NO-DATA routes:", noData.map((r) => r.route).join(", "));
