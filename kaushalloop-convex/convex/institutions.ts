import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { canManageInstitution, requireUser } from "./auth";

export const create = mutation({
  args: { name: v.string(), type: v.string(), city: v.string(), state: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "admin") throw new Error("Only admins can create institutions");
    const institutionId = await ctx.db.insert("institutions", { ...args, createdAt: Date.now() });
    await ctx.db.patch(user._id, { institutionId, role: "admin" });
    return institutionId;
  },
});

export const get = query({
  args: { institutionId: v.id("institutions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.institutionId !== args.institutionId) throw new Error("Forbidden institution access");
    return ctx.db.get(args.institutionId);
  },
});

export const members = query({
  args: { institutionId: v.id("institutions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.institutionId !== args.institutionId || !canManageInstitution(user.role)) {
      throw new Error("Forbidden institution access");
    }
    return ctx.db
      .query("users")
      .withIndex("by_institution", (q) => q.eq("institutionId", args.institutionId))
      .collect();
  },
});
