import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

const eventType = v.union(
  v.literal("PROFILE_CREATED"),
  v.literal("ASSESSMENT_STARTED"),
  v.literal("ASSESSMENT_PASSED"),
  v.literal("INTERVENTION_RECOMMENDED"),
  v.literal("INTERVENTION_STARTED"),
  v.literal("INTERVENTION_COMPLETED"),
  v.literal("APPLICATION_SUBMITTED"),
  v.literal("SHORTLISTED"),
  v.literal("INTERVIEWED"),
  v.literal("OFFER_RECEIVED"),
  v.literal("PLACED"),
  v.literal("RETAINED_90_DAYS"),
);

async function assertLearnerAccess(ctx: any, learnerId: any) {
  const user = await requireUser(ctx);
  const learner = await ctx.db.get(learnerId);
  const cohort = learner ? await ctx.db.get(learner.cohortId) : null;
  if (!learner || !cohort || cohort.institutionId !== user.institutionId) throw new Error("Forbidden learner access");
  return learner;
}

export const create = mutation({
  args: {
    learnerId: v.id("learners"),
    eventType,
    eventDate: v.number(),
    metadata: v.optional(v.any()),
    source: v.string(),
    verified: v.boolean(),
  },
  handler: async (ctx, args) => {
    await assertLearnerAccess(ctx, args.learnerId);
    return ctx.db.insert("outcomeEvents", args);
  },
});

export const listForLearner = query({
  args: { learnerId: v.id("learners") },
  handler: async (ctx, args) => {
    await assertLearnerAccess(ctx, args.learnerId);
    return ctx.db
      .query("outcomeEvents")
      .withIndex("by_learner", (q) => q.eq("learnerId", args.learnerId))
      .order("asc")
      .collect();
  },
});
