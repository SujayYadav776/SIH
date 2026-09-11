import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { canManageInstitution, requireUser } from "./auth";

const evidenceType = v.union(
  v.literal("claimed"),
  v.literal("inferred"),
  v.literal("assessed"),
  v.literal("project_proven"),
  v.literal("verified_external"),
);

export const addToCohort = mutation({
  args: {
    cohortId: v.id("cohorts"),
    name: v.string(),
    email: v.optional(v.string()),
    education: v.optional(v.string()),
    experienceMonths: v.optional(v.number()),
    location: v.optional(v.string()),
    languagePreference: v.optional(v.string()),
    consentStatus: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const cohort = await ctx.db.get(args.cohortId);
    if (!cohort || cohort.institutionId !== user.institutionId || !canManageInstitution(user.role)) {
      throw new Error("Only institution staff can add learners");
    }
    const learnerId = await ctx.db.insert("learners", { ...args, createdAt: Date.now() });
    await ctx.db.insert("outcomeEvents", {
      learnerId,
      eventType: "PROFILE_CREATED",
      eventDate: Date.now(),
      source: "application",
      verified: true,
    });
    return learnerId;
  },
});

export const get = query({
  args: { learnerId: v.id("learners") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const learner = await ctx.db.get(args.learnerId);
    if (!learner) return null;
    const cohort = await ctx.db.get(learner.cohortId);
    if (!cohort || cohort.institutionId !== user.institutionId) throw new Error("Forbidden learner access");
    return learner;
  },
});

export const listByCohort = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const cohort = await ctx.db.get(args.cohortId);
    if (!cohort || cohort.institutionId !== user.institutionId) throw new Error("Forbidden cohort access");
    return ctx.db.query("learners").withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId)).collect();
  },
});

export const listEvidence = query({
  args: { learnerId: v.id("learners") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const learner = await ctx.db.get(args.learnerId);
    const cohort = learner ? await ctx.db.get(learner.cohortId) : null;
    if (!learner || !cohort || cohort.institutionId !== user.institutionId) throw new Error("Forbidden learner access");
    return ctx.db.query("learnerEvidence").withIndex("by_learner", (q) => q.eq("learnerId", args.learnerId)).collect();
  },
});

export const confirmEvidence = mutation({
  args: {
    evidenceId: v.id("learnerEvidence"),
    verificationStatus: v.union(v.literal("unverified"), v.literal("verified"), v.literal("rejected")),
    evidenceType: v.optional(evidenceType),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const evidence = await ctx.db.get(args.evidenceId);
    if (!evidence) throw new Error("Evidence not found");
    const learner = await ctx.db.get(evidence.learnerId);
    const cohort = learner ? await ctx.db.get(learner.cohortId) : null;
    if (!learner || !cohort || cohort.institutionId !== user.institutionId || !canManageInstitution(user.role)) {
      throw new Error("Only institution staff can verify evidence");
    }
    await ctx.db.patch(args.evidenceId, {
      verificationStatus: args.verificationStatus,
      ...(args.evidenceType ? { evidenceType: args.evidenceType } : {}),
    });
    return args.evidenceId;
  },
});
