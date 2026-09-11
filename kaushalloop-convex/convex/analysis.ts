import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./auth";

/**
 * Async analysis lifecycle helpers referenced by the plan as `analysis.start`.
 *
 * These only manage the `pipelineRuns` record (the durable progress row the UI
 * subscribes to). The heavy lifting — download the file, call the Python worker,
 * normalise skills, persist evidence — is done by the `ai.analyzeDocument`
 * action, which writes back to the same pipelineRuns row it is given. Keeping
 * the enqueue (fast mutation) separate from the worker call (slow action) is the
 * "Convex action + short queue" pattern from plan §2.
 */
export const start = mutation({
  args: {
    learnerId: v.id("learners"),
    documentId: v.optional(v.id("documents")),
    pipelineName: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"pipelineRuns">> => {
    const user = await requireUser(ctx);
    const learner = await ctx.db.get(args.learnerId);
    const cohort = learner ? await ctx.db.get(learner.cohortId) : null;
    if (!learner || !cohort || cohort.institutionId !== user.institutionId) {
      throw new Error("Forbidden learner access");
    }
    return ctx.db.insert("pipelineRuns", {
      learnerId: args.learnerId,
      documentId: args.documentId,
      pipelineName: args.pipelineName,
      status: "queued",
      progress: 0,
      createdAt: Date.now(),
    });
  },
});

export const getRun = query({
  args: { pipelineRunId: v.id("pipelineRuns") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const run = await ctx.db.get(args.pipelineRunId);
    if (!run) return null;
    if (run.learnerId) {
      const learner = await ctx.db.get(run.learnerId);
      const cohort = learner ? await ctx.db.get(learner.cohortId) : null;
      if (!cohort || cohort.institutionId !== user.institutionId) throw new Error("Forbidden run access");
    }
    return run;
  },
});

export const listForLearner = query({
  args: { learnerId: v.id("learners") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const learner = await ctx.db.get(args.learnerId);
    const cohort = learner ? await ctx.db.get(learner.cohortId) : null;
    if (!learner || !cohort || cohort.institutionId !== user.institutionId) {
      throw new Error("Forbidden learner access");
    }
    const runs = await ctx.db
      .query("pipelineRuns")
      .withIndex("by_learner", (q) => q.eq("learnerId", args.learnerId))
      .collect();
    return runs.sort((a, b) => b.createdAt - a.createdAt);
  },
});
