import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { canManageInstitution, requireUser } from "./auth";

export const create = mutation({
  args: {
    title: v.string(),
    type: v.string(),
    provider: v.optional(v.string()),
    durationHours: v.number(),
    cost: v.optional(v.number()),
    url: v.optional(v.string()),
    prerequisites: v.array(v.string()),
    skillIds: v.array(v.id("skills")),
    description: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"interventions">> => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role) || !user.institutionId) {
      throw new Error("Only institution staff can create interventions");
    }
    for (const skillId of args.skillIds) {
      const skill = await ctx.db.get(skillId);
      if (!skill) throw new Error("Referenced skill does not exist");
    }
    return ctx.db.insert("interventions", args);
  },
});

export const get = query({
  args: { interventionId: v.id("interventions") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.get(args.interventionId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return ctx.db.query("interventions").collect();
  },
});

/** Interventions covering ANY of the given skills — candidate set for the recommender. */
export const listForSkills = query({
  args: { skillIds: v.array(v.id("skills")) },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const wanted = new Set(args.skillIds.map((id) => id as string));
    const all = await ctx.db.query("interventions").collect();
    return all.filter((row) => row.skillIds.some((id) => wanted.has(id as string)));
  },
});

export const update = mutation({
  args: {
    interventionId: v.id("interventions"),
    title: v.optional(v.string()),
    durationHours: v.optional(v.number()),
    cost: v.optional(v.number()),
    url: v.optional(v.string()),
    description: v.optional(v.string()),
    skillIds: v.optional(v.array(v.id("skills"))),
    prerequisites: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role)) throw new Error("Only institution staff can edit interventions");
    const { interventionId, ...patch } = args;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    await ctx.db.patch(interventionId, clean);
    return interventionId;
  },
});
