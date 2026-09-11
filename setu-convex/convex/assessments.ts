import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { canManageInstitution, requireUser } from "./auth";
import type { EvidenceType } from "./scoring";

/**
 * Practical assessments (Pipeline E).
 *
 * Scoring here is deterministic: a learner self-reports each rubric criterion
 * (optionally with an artifact), and the attempt score is the weight-normalised
 * mean of those ratings. Passing creates `assessed` / `project_proven` evidence
 * that still requires coordinator confirmation to become `verified` — the LLM is
 * only ever a future assist for rubric scoring, never the decision maker.
 *
 * Expected rubric shape:
 *   {
 *     passThreshold?: number,            // default 0.7
 *     criteria: [{ id: string, name: string, weight?: number }]
 *   }
 */

interface RubricCriterion {
  id: string;
  name: string;
  weight?: number;
}
interface Rubric {
  passThreshold?: number;
  criteria: RubricCriterion[];
}
interface Answer {
  criterionId: string;
  rating: number; // 0..1 self-assessed attainment for the criterion
}

function scoreAttempt(rubric: Rubric, answers: Answer[]) {
  const byCriterion = new Map(answers.map((a) => [a.criterionId, a.rating]));
  let weighted = 0;
  let totalWeight = 0;
  const criteriaResult = rubric.criteria.map((criterion) => {
    const weight = criterion.weight ?? 1;
    const rating = clamp01(byCriterion.get(criterion.id) ?? 0);
    weighted += weight * rating;
    totalWeight += weight;
    return { id: criterion.id, name: criterion.name, weight, rating };
  });
  const score = totalWeight > 0 ? weighted / totalWeight : 0;
  const passThreshold = rubric.passThreshold ?? 0.7;
  return { score, passed: score >= passThreshold, passThreshold, criteria: criteriaResult };
}

async function learnerInstitution(ctx: any, learnerId: Id<"learners">) {
  const user = await requireUser(ctx);
  const learner = await ctx.db.get(learnerId);
  const cohort = learner ? await ctx.db.get(learner.cohortId) : null;
  if (!learner || !cohort || cohort.institutionId !== user.institutionId) {
    throw new Error("Forbidden learner access");
  }
  return { user, learner, cohort };
}

export const create = mutation({
  args: {
    skillId: v.id("skills"),
    title: v.string(),
    rubric: v.any(),
    durationMinutes: v.number(),
    version: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"assessments">> => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role)) throw new Error("Only institution staff can create assessments");
    const skill = await ctx.db.get(args.skillId);
    if (!skill) throw new Error("Skill not found");
    return ctx.db.insert("assessments", args);
  },
});

export const get = query({
  args: { assessmentId: v.id("assessments") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.get(args.assessmentId);
  },
});

export const listForSkill = query({
  args: { skillId: v.id("skills") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db
      .query("assessments")
      .withIndex("by_skill", (q) => q.eq("skillId", args.skillId))
      .collect();
  },
});

/** Optional: record that a learner started an assessment (drives the funnel). */
export const begin = mutation({
  args: { assessmentId: v.id("assessments"), learnerId: v.id("learners") },
  handler: async (ctx, args) => {
    await learnerInstitution(ctx, args.learnerId);
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) throw new Error("Assessment not found");
    await ctx.db.insert("outcomeEvents", {
      learnerId: args.learnerId,
      eventType: "ASSESSMENT_STARTED",
      eventDate: Date.now(),
      source: "application",
      verified: false,
    });
    return args.assessmentId;
  },
});

/** Submit an attempt, deterministically score it, and create (unverified) evidence on pass. */
export const submitAttempt = mutation({
  args: {
    assessmentId: v.id("assessments"),
    learnerId: v.id("learners"),
    answers: v.array(v.object({ criterionId: v.string(), rating: v.number() })),
    hasArtifact: v.boolean(),
    artifactUrl: v.optional(v.string()),
    explanation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await learnerInstitution(ctx, args.learnerId);
    const assessment = await ctx.db.get(args.assessmentId);
    if (!assessment) throw new Error("Assessment not found");
    const rubric = assessment.rubric as Rubric;
    if (!rubric?.criteria?.length) throw new Error("Assessment rubric has no criteria");

    const result = scoreAttempt(rubric, args.answers);
    const evidenceIds: Id<"learnerEvidence">[] = [];

    if (result.passed) {
      const evidenceType: EvidenceType = args.hasArtifact ? "project_proven" : "assessed";
      const evidenceId = await ctx.db.insert("learnerEvidence", {
        learnerId: args.learnerId,
        skillId: assessment.skillId,
        sourceType: "assessment",
        evidenceType,
        evidenceText:
          args.explanation ??
          `Passed ${assessment.title} (score ${Math.round(result.score * 100)}%)`,
        confidence: result.score,
        verificationStatus: "unverified", // requires coordinator confirmEvidence()
        model: "deterministic-rubric",
        promptVersion: assessment.version,
        createdAt: Date.now(),
      });
      evidenceIds.push(evidenceId);
    }

    const attemptId = await ctx.db.insert("assessmentAttempts", {
      assessmentId: args.assessmentId,
      learnerId: args.learnerId,
      score: result.score,
      rubricResult: { ...result, evidenceIds, hasArtifact: args.hasArtifact, artifactUrl: args.artifactUrl },
      completedAt: Date.now(),
    });

    if (result.passed) {
      await ctx.db.insert("outcomeEvents", {
        learnerId: args.learnerId,
        eventType: "ASSESSMENT_PASSED",
        eventDate: Date.now(),
        metadata: { assessmentId: args.assessmentId, score: result.score },
        source: "application",
        verified: false,
      });
    }

    return { attemptId, ...result, evidenceIds };
  },
});

export const listAttempts = query({
  args: { learnerId: v.id("learners") },
  handler: async (ctx, args) => {
    await learnerInstitution(ctx, args.learnerId);
    return ctx.db
      .query("assessmentAttempts")
      .withIndex("by_learner", (q) => q.eq("learnerId", args.learnerId))
      .collect();
  },
});

/** Coordinator confirms the assessment-derived evidence, promoting it to `verified`. */
export const verifyAttempt = mutation({
  args: { attemptId: v.id("assessmentAttempts") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role)) throw new Error("Only institution staff can verify attempts");
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");
    const evidenceIds = (attempt.rubricResult as any)?.evidenceIds ?? [];
    for (const evidenceId of evidenceIds) {
      await ctx.db.patch(evidenceId as Id<"learnerEvidence">, { verificationStatus: "verified" });
    }
    return { attemptId: args.attemptId, verifiedEvidence: evidenceIds.length };
  },
});

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
