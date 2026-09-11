import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { loadScoringConfig } from "./settings";
import {
  computeGap,
  rankGaps,
  type DemandInputs,
  type GapRow,
  type RequirementType,
  type EvidenceType,
} from "./scoring";

/**
 * Learner gap analysis (Pipeline C). Everything below is deterministic: the same
 * learner, cohort, and demand data always yield the same priority gaps. No LLM
 * is involved — the model only explains these numbers afterwards.
 */
export const listForLearner = query({
  args: { learnerId: v.id("learners"), topN: v.optional(v.number()) },
  handler: async (ctx, args) => computeLearnerGaps(ctx, args.learnerId, args.topN ?? 5),
});

/** Convenience single-skill gap, e.g. for a drill-down view. */
export const getForSkill = query({
  args: { learnerId: v.id("learners"), skillId: v.id("skills") },
  handler: async (ctx, args) => {
    const { gaps } = await computeLearnerGaps(ctx, args.learnerId, Number.MAX_SAFE_INTEGER);
    return gaps.find((gap) => gap.skillId === (args.skillId as string)) ?? null;
  },
});

/**
 * Shared, deterministic gap computation used by both queries above. Kept as a
 * plain function (not a registered Convex function) so it can be reused without
 * invoking one function's handler from another.
 */
export async function computeLearnerGaps(
  ctx: any,
  learnerId: Id<"learners">,
  topN: number,
): Promise<{ gaps: GapRow[]; top: GapRow[]; totalTargetPostings: number }> {
  const user = await requireUser(ctx);
  const learner = await ctx.db.get(learnerId);
  const cohort = learner ? await ctx.db.get(learner.cohortId) : null;
  if (!learner || !cohort || cohort.institutionId !== user.institutionId) {
    throw new Error("Forbidden learner access");
  }
  const config = await loadScoringConfig(ctx, cohort.institutionId);

  // 1. Target-role demand set.
  const targetJobs = cohort.targetRoleId
    ? await ctx.db
        .query("jobPostings")
        .withIndex("by_occupation", (q: any) => q.eq("occupationId", cohort.targetRoleId))
        .collect()
    : await ctx.db.query("jobPostings").collect();
  const targetJobIds = new Set<string>(targetJobs.map((job: any) => job._id as string));
  const totalTargetPostings = targetJobs.length;

  // 2. Aggregate per-skill demand from the target postings' requirements.
  const requirements = await ctx.db.query("jobSkillRequirements").collect();
  const demandBySkill = new Map<
    string,
    { jobs: Set<string>; importances: number[]; requirementTypes: RequirementType[] }
  >();
  for (const requirement of requirements) {
    if (!targetJobIds.has(requirement.jobId as string)) continue;
    const key = requirement.skillId as string;
    const bucket =
      demandBySkill.get(key) ?? { jobs: new Set<string>(), importances: [], requirementTypes: [] };
    bucket.jobs.add(requirement.jobId as string);
    bucket.importances.push(requirement.importance);
    bucket.requirementTypes.push(requirement.requirementType);
    demandBySkill.set(key, bucket);
  }

  // 3. Learner evidence, keyed by skill.
  const evidence = await ctx.db
    .query("learnerEvidence")
    .withIndex("by_learner", (q: any) => q.eq("learnerId", learnerId))
    .collect();
  const evidenceBySkill = new Map<string, typeof evidence>();
  for (const item of evidence) {
    const key = item.skillId as string;
    evidenceBySkill.set(key, [...(evidenceBySkill.get(key) ?? []), item]);
  }

  // 4. Compute a gap for the union of demanded and evidenced skills.
  const skillIds = new Set<string>([...demandBySkill.keys(), ...evidenceBySkill.keys()]);
  const gaps: GapRow[] = [];
  for (const skillId of skillIds) {
    const skill = await ctx.db.get(skillId);
    if (!skill) continue;
    const bucket = demandBySkill.get(skillId);
    const learnerRows = (evidenceBySkill.get(skillId) ?? []).map((row: any) => ({
      evidenceType: row.evidenceType as EvidenceType,
      verificationStatus: row.verificationStatus,
      requirementHint: bucket?.requirementTypes.includes("must_have")
        ? ("must_have" as RequirementType)
        : undefined,
    }));

    const demandInputs: DemandInputs = {
      postingsRequiringSkill: bucket?.jobs.size ?? 0,
      totalTargetPostings,
      importances: bucket?.importances ?? [],
    };

    gaps.push(
      computeGap(
        { id: skillId, name: skill.canonicalName },
        demandInputs,
        learnerRows,
        config,
      ),
    );
  }

  gaps.sort((a, b) => b.priority - a.priority);
  return { gaps, top: rankGaps(gaps, topN), totalTargetPostings };
}
