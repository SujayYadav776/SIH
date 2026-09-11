import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { loadScoringConfig } from "./settings";
import { computeLearnerGaps } from "./gaps";
import {
  rankInterventions,
  type InterventionCandidate,
  type EvidenceType,
} from "./scoring";

/**
 * Compute and persist a learner's intervention recommendations (Pipeline D).
 *
 * Ranking is fully deterministic (see scoring.ts). The LLM explanation layer is
 * an intentional extension point: a grounded explanation can be attached to
 * these rows afterwards using ONLY the stored reasonCodes and sourceJobIds, so
 * the recommendation itself never depends on the model.
 */
export const generate = mutation({
  args: { learnerId: v.id("learners"), topN: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { learner, cohort } = await requireLearnerAccess(ctx, args.learnerId);
    const config = await loadScoringConfig(ctx, cohort.institutionId);
    const { top } = await computeLearnerGaps(ctx, args.learnerId, args.topN ?? 5);
    const actionable = top.filter((gap) => gap.priority > 0);
    if (actionable.length === 0) return { created: [], skippedNoGaps: true };

    const topGapSkillIds = actionable.map((gap) => gap.skillId);

    // Candidate interventions that cover at least one priority gap.
    const topGapSet = new Set(topGapSkillIds);
    const allInterventions = await ctx.db.query("interventions").collect();
    const candidateRows = new Map<string, any>();
    for (const row of allInterventions) {
      if ((row.skillIds as string[]).some((id) => topGapSet.has(id))) {
        candidateRows.set(row._id, row);
      }
    }
    const candidates: InterventionCandidate[] = Array.from(candidateRows.values()).map((row) => ({
      id: row._id as string,
      title: row.title,
      skillIds: (row.skillIds as string[]).map((id) => id as string),
      durationHours: row.durationHours,
      cost: row.cost,
      prerequisites: row.prerequisites as string[],
    }));

    // Source jobs behind the demand signal for each gap skill.
    const targetJobs = cohort.targetRoleId
      ? await ctx.db
          .query("jobPostings")
          .withIndex("by_occupation", (q: any) => q.eq("occupationId", cohort.targetRoleId))
          .collect()
      : await ctx.db.query("jobPostings").collect();
    const targetJobIds = new Set<string>(targetJobs.map((job: any) => job._id as string));
    const requirements = await ctx.db.query("jobSkillRequirements").collect();
    const sourceJobIdsBySkill: Record<string, string[]> = {};
    for (const requirement of requirements) {
      if (!targetJobIds.has(requirement.jobId as string)) continue;
      const key = requirement.skillId as string;
      sourceJobIdsBySkill[key] = [...(sourceJobIdsBySkill[key] ?? []), requirement.jobId as string];
    }

    // Prerequisites the learner already satisfied (strong evidence for that skill).
    const evidence = await ctx.db
      .query("learnerEvidence")
      .withIndex("by_learner", (q: any) => q.eq("learnerId", args.learnerId))
      .collect();
    const strongTypes = new Set<EvidenceType>(["assessed", "project_proven", "verified_external"]);
    const satisfiedSkillIds = new Set(
      evidence
        .filter((row) => strongTypes.has(row.evidenceType as EvidenceType) && row.verificationStatus !== "rejected")
        .map((row) => row.skillId as string),
    );
    const metPrerequisites = new Set<string>();
    for (const skillId of satisfiedSkillIds) {
      const skill = await ctx.db.get(skillId as Id<"skills">);
      if (skill) metPrerequisites.add(skill.canonicalName.toLowerCase());
    }

    const ranked = rankInterventions(candidates, {
      gaps: actionable,
      sourceJobIdsBySkill,
      metPrerequisites,
      config,
    });

    // Idempotent re-run: clear prior un-started recommendations for this learner.
    const prior = await ctx.db
      .query("recommendations")
      .withIndex("by_learner", (q) => q.eq("learnerId", args.learnerId))
      .collect();
    for (const row of prior) {
      if (row.status === "recommended") await ctx.db.delete(row._id);
    }

    const created: Id<"recommendations">[] = [];
    let rank = 0;
    for (const result of ranked) {
      rank += 1;
      const recommendationId = await ctx.db.insert("recommendations", {
        learnerId: args.learnerId,
        skillId: result.skillId as Id<"skills">,
        interventionId: result.interventionId as Id<"interventions">,
        rank,
        score: result.score,
        reasonCodes: result.reasonCodes,
        sourceJobIds: result.sourceJobIds as Id<"jobPostings">[],
        status: "recommended",
        createdAt: Date.now(),
      });
      created.push(recommendationId);
    }

    if (created.length > 0) {
      await ctx.db.insert("outcomeEvents", {
        learnerId: args.learnerId,
        eventType: "INTERVENTION_RECOMMENDED",
        eventDate: Date.now(),
        metadata: { count: created.length, generatedFrom: "deterministic-ranking" },
        source: "application",
        verified: false,
      });
    }

    return { created, learnerName: learner.name };
  },
});

/** Recommendations for a learner, enriched with intervention + skill details, by rank. */
export const listForLearner = query({
  args: { learnerId: v.id("learners") },
  handler: async (ctx, args) => {
    await requireLearnerAccess(ctx, args.learnerId);
    const rows = await ctx.db
      .query("recommendations")
      .withIndex("by_learner", (q) => q.eq("learnerId", args.learnerId))
      .collect();
    const enriched = [];
    for (const row of rows) {
      const intervention = await ctx.db.get(row.interventionId);
      const skill = await ctx.db.get(row.skillId);
      enriched.push({
        ...row,
        intervention,
        skill: skill ? { id: skill._id, name: skill.canonicalName } : null,
      });
    }
    return enriched.sort((a, b) => a.rank - b.rank);
  },
});

/** Learner/staff marks the recommended intervention as started. */
export const start = mutation({
  args: { recommendationId: v.id("recommendations") },
  handler: async (ctx, args) => {
    const recommendation = await ctx.db.get(args.recommendationId);
    if (!recommendation) throw new Error("Recommendation not found");
    await requireLearnerAccess(ctx, recommendation.learnerId);
    await ctx.db.patch(args.recommendationId, { status: "started" });
    await ctx.db.insert("outcomeEvents", {
      learnerId: recommendation.learnerId,
      eventType: "INTERVENTION_STARTED",
      eventDate: Date.now(),
      source: "application",
      verified: false,
    });
    return args.recommendationId;
  },
});

/** Learner/staff marks the intervention complete. */
export const complete = mutation({
  args: { recommendationId: v.id("recommendations") },
  handler: async (ctx, args) => {
    const recommendation = await ctx.db.get(args.recommendationId);
    if (!recommendation) throw new Error("Recommendation not found");
    await requireLearnerAccess(ctx, recommendation.learnerId);
    await ctx.db.patch(args.recommendationId, { status: "completed" });
    await ctx.db.insert("outcomeEvents", {
      learnerId: recommendation.learnerId,
      eventType: "INTERVENTION_COMPLETED",
      eventDate: Date.now(),
      source: "application",
      verified: false,
    });
    return args.recommendationId;
  },
});

/** Shared learner + institution access guard. */
async function requireLearnerAccess(ctx: any, learnerId: Id<"learners">) {
  const user = await requireUser(ctx);
  const learner = await ctx.db.get(learnerId);
  const cohort = learner ? await ctx.db.get(learner.cohortId) : null;
  if (!learner || !cohort || cohort.institutionId !== user.institutionId) {
    throw new Error("Forbidden learner access");
  }
  return { learner, cohort };
}
