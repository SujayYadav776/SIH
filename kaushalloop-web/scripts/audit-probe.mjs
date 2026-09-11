import { chromium } from "@playwright/test";
import path from "path";
const BASE = "http://localhost:3000";
const AXE = path.resolve("node_modules/axe-core/axe.min.js");
const b = await chromium.launch();

// --- probe 1: /cohorts desktop region+button-name nodes, heatmap colors
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/cohorts", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("table caption", { timeout: 30000 });
  await p.waitForTimeout(3000);
  await p.addScriptTag({ path: AXE });
  const res = await p.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ["region", "button-name"] });
    return r.violations.flatMap((v) => v.nodes.map((n) => ({ rule: v.id, target: n.target.join(" "), html: n.html.slice(0, 160) })));
  });
  console.log("== /cohorts nodes =="); res.forEach((x) => console.log(JSON.stringify(x)));
  const colors = await p.evaluate(() => {
    const cells = [...document.querySelectorAll("td .h-9")].slice(0, 12);
    return cells.map((c) => {
      const st = getComputedStyle(c);
      return { text: c.textContent, fg: st.color, bg: st.backgroundColor };
    });
  });
  console.log("== heatmap cell colors =="); colors.forEach((c) => console.log(JSON.stringify(c)));
  const sidebarTag = await p.evaluate(() => document.querySelector('[data-sidebar="sidebar"]')?.tagName + " / parent main count=" + document.querySelectorAll("main").length);
  console.log("sidebar tag:", sidebarTag);
  await ctx.close();
}

// --- probe 2: mobile overflow culprits
for (const route of ["/demand", "/learner", "/learners"]) {
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 } });
  const p = await ctx.newPage();
  await p.goto(BASE + route, { waitUntil: "domcontentloaded" });
  await p.waitForSelector("main, #main", { timeout: 30000 });
  await p.waitForTimeout(3500);
  const wide = await p.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width > docW + 4 && r.right > docW + 4) {
        out.push({ tag: el.tagName, cls: (el.className + "").slice(0, 90), w: Math.round(r.width), right: Math.round(r.right) });
      }
    }
    // keep innermost few
    return out.slice(0, 8);
  });
  console.log(`== ${route} 375px wide elements ==`);
  wide.forEach((w) => console.log(JSON.stringify(w)));
  await ctx.close();
}

// --- probe 3: heading-order nodes on marketing
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  for (const route of ["/institutions", "/evidence"]) {
    const p = await ctx.newPage();
    await p.goto(BASE + route, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(800);
    await p.addScriptTag({ path: AXE });
    const res = await p.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: ["heading-order"] });
      return r.violations.flatMap((v) => v.nodes.map((n) => n.html.slice(0, 120)));
    });
    console.log(`== ${route} heading-order ==`, JSON.stringify(res, null, 1));
    await p.close();
  }
  await ctx.close();
}
await b.close();
