import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { seedBatchRows, summarizeRows, SYNTH_TOTAL } from "./synthetic_gen";

/**
 * SYNTHETIC placement-outcomes dataset for the Policy Dashboard.
 *
 * Deliberately synthetic (no real longitudinal data exists for a hackathon) but
 * built on REAL scheme names (PMKVY, MSSDS, Skill India Digital, RPL, NSDC) and
 * REPRESENTATIVE NSQF/NCO codes. Patterns are baked in on purpose (see
 * convex/synthetic_gen.ts) so the dashboard tells a story:
 *   A) Electrician + Nagpur  -> strong placement + high retention
 *   B) Beautician + Yavatmal -> saturated, low placement, high dropout
 *   C) RPL "certificate factory" -> very high completion, low placement
 *
 * Generation is DETERMINISTIC per trainee index, so running the seed in batches
 * always reproduces the exact same rows.
 *
 * Demo control: gated only by a confirmation token (no user auth) so it can be
 * seeded headlessly via `npx convex run`. Keep the token out of clients.
 */

const DEMO_CONFIRMATION = "SETU_DEMO_RESET";

/** How many synthetic rows currently exist. */
export const count = query({
  args: {},
  handler: async (ctx: QueryCtx) => (await ctx.db.query("synthetic_outcomes").collect()).length,
});

/** Insert rows for [start, start+count). Call repeatedly to cover 0..800. */
export const seedRange = mutation({
  args: { confirmation: v.string(), start: v.number(), count: v.number() },
  handler: async (ctx: MutationCtx, args) => {
    if (args.confirmation !== DEMO_CONFIRMATION) throw new Error("Invalid demo confirmation");
    const rows = seedBatchRows(args.start, args.count);
    for (const row of rows) await ctx.db.insert("synthetic_outcomes", row);
    return { inserted: rows.length, rangeEnd: Math.min(args.start + args.count, SYNTH_TOTAL), total: SYNTH_TOTAL };
  },
});

/** Delete every synthetic row (idempotent reset before re-seed). */
export const clear = mutation({
  args: { confirmation: v.string() },
  handler: async (ctx: MutationCtx, args) => {
    if (args.confirmation !== DEMO_CONFIRMATION) throw new Error("Invalid demo confirmation");
    const rows = await ctx.db.query("synthetic_outcomes").collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return { deleted: rows.length };
  },
});

/**
 * Verification + reusable aggregation for the Policy Dashboard (Block 5).
 * Returns overall metrics, the three baked-pattern segments, and the distinct
 * filter values (district / scheme / trade) the dashboard dropdowns need.
 */
export const summarize = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const rows = await ctx.db.query("synthetic_outcomes").collect();
    return {
      total: rows.length,
      overall: summarizeRows(rows),
      segments: {
        A_electrician_nagpur: summarizeRows(rows.filter((r) => r.trade === "Electrician" && r.district === "Nagpur")),
        B_beautician_yavatmal: summarizeRows(
          rows.filter((r) => r.trade.startsWith("Beautician") && r.district === "Yavatmal"),
        ),
        C_rpl_certificate_factory: summarizeRows(rows.filter((r) => r.scheme.startsWith("RPL"))),
      },
      filters: {
        districts: [...new Set(rows.map((r) => r.district))].sort(),
        schemes: [...new Set(rows.map((r) => r.scheme))].sort(),
        trades: [...new Set(rows.map((r) => r.trade))].sort(),
      },
    };
  },
});
