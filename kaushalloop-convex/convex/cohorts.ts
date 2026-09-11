import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { canManageInstitution, requireUser } from "./auth";

export const create = mutation({
  args: {
    institutionId: v.id("institutions"),
    name: v.string(),
    targetRoleId: v.id("occupations"),
    geography: v.string(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.institutionId !== args.institutionId || !canManageInstitution(user.role)) {
      throw new Error("Only institution staff can create cohorts");
    }
    return ctx.db.insert("cohorts", { ...args, createdAt: Date.now() });
  },
});

export const get = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const cohort = await ctx.db.get(args.cohortId);
    if (!cohort || cohort.institutionId !== user.institutionId) throw new Error("Cohort not found");
    return cohort;
  },
});

export const listForInstitution = query({
  args: { institutionId: v.id("institutions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.institutionId !== args.institutionId) throw new Error("Forbidden institution access");
    return ctx.db.query("cohorts").withIndex("by_institution", (q) => q.eq("institutionId", args.institutionId)).collect();
  },
});
