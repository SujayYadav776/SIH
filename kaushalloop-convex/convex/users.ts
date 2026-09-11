import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentUser } from "./auth";

export const ensureCurrent = mutation({
  args: { role: v.optional(v.union(v.literal("admin"), v.literal("coordinator"), v.literal("learner"), v.literal("trainer"))) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const existing = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", identity.subject))
      .unique();
    if (existing) return existing._id;
    return ctx.db.insert("users", {
      subject: identity.subject,
      email: identity.email,
      name: identity.name,
      role: args.role ?? "learner",
      createdAt: Date.now(),
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => currentUser(ctx),
});
