import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./auth";

async function assertCohortAccess(ctx: any, cohortId: any) {
  const user = await requireUser(ctx);
  const cohort = await ctx.db.get(cohortId);
  if (!cohort || cohort.institutionId !== user.institutionId) throw new Error("Forbidden cohort access");
  return cohort;
}

export const cohortSkillGaps = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await assertCohortAccess(ctx, args.cohortId);
    const learners = await ctx.db.query("learners").withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId)).collect();
    const jobs = await ctx.db.query("jobPostings").collect();
    const requirements = await ctx.db.query("jobSkillRequirements").collect();
    const evidence = await ctx.db.query("learnerEvidence").collect();
    const skillMap = new Map<string, { demand: number; verified: number; totalEvidence: number; skillId: string; name: string }>();

    for (const requirement of requirements) {
      const skill = await ctx.db.get(requirement.skillId);
      if (!skill) continue;
      const item = skillMap.get(requirement.skillId) ?? { demand: 0, verified: 0, totalEvidence: 0, skillId: requirement.skillId, name: skill.canonicalName };
      item.demand += 1;
      skillMap.set(requirement.skillId, item);
    }

    for (const item of evidence) {
      const learner = learners.find((candidate) => candidate._id === item.learnerId);
      if (!learner) continue;
      const bucket = skillMap.get(item.skillId);
      if (!bucket) continue;
      bucket.totalEvidence += 1;
      if (item.verificationStatus === "verified" || item.evidenceType === "assessed" || item.evidenceType === "project_proven") {
        bucket.verified += 1;
      }
    }

    return Array.from(skillMap.values())
      .map((item) => ({
        ...item,
        demandPercent: jobs.length ? Math.round((item.demand / Math.max(jobs.length, 1)) * 100) : 0,
        verifiedCoveragePercent: learners.length ? Math.round((item.verified / learners.length) * 100) : 0,
        gapPercent: learners.length ? Math.max(0, 100 - Math.round((item.verified / learners.length) * 100)) : 100,
      }))
      .sort((a, b) => b.demandPercent - a.demandPercent);
  },
});

export const readiness = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await assertCohortAccess(ctx, args.cohortId);
    const learners = await ctx.db.query("learners").withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId)).collect();
    const evidence = await ctx.db.query("learnerEvidence").collect();
    return learners.map((learner) => {
      const own = evidence.filter((item) => item.learnerId === learner._id);
      const verified = own.filter((item) => item.verificationStatus === "verified" || item.evidenceType === "assessed" || item.evidenceType === "project_proven").length;
      return { learnerId: learner._id, learnerName: learner.name, evidenceCount: own.length, verifiedEvidenceCount: verified };
    });
  },
});

export const outcomeFunnel = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await assertCohortAccess(ctx, args.cohortId);
    const learners = await ctx.db.query("learners").withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId)).collect();
    const learnerIds = new Set(learners.map((learner) => learner._id));
    const events = (await ctx.db.query("outcomeEvents").collect()).filter((event) => learnerIds.has(event.learnerId));
    const stages = ["INTERVENTION_RECOMMENDED", "INTERVENTION_COMPLETED", "ASSESSMENT_PASSED", "APPLICATION_SUBMITTED", "SHORTLISTED", "INTERVIEWED", "OFFER_RECEIVED", "PLACED"] as const;
    return stages.map((stage) => ({ stage, learners: new Set(events.filter((event) => event.eventType === stage).map((event) => event.learnerId)).size }));
  },
});

/**
 * Cohort evidence heatmap: for each demanded skill, the % of the cohort holding at
 * least each rising evidence tier, from each learner's strongest non-rejected
 * evidence. Powers the demand-vs-evidence matrix and the intervention what-if.
 */
export const cohortEvidenceMatrix = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await assertCohortAccess(ctx, args.cohortId);
    const learners = await ctx.db
      .query("learners")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    const total = learners.length;
    const tiers = ["inferred", "claimed", "assessed", "project_proven", "verified_external"] as const;
    const tierRank = new Map<string, number>(tiers.map((t, i) => [t, i]));

    const requirements = await ctx.db.query("jobSkillRequirements").collect();
    const totalJobs = Math.max(1, (await ctx.db.query("jobPostings").collect()).length);
    const demandJobs = new Map<string, Set<string>>();
    for (const requirement of requirements) {
      const set = demandJobs.get(requirement.skillId as string) ?? new Set<string>();
      set.add(requirement.jobId as string);
      demandJobs.set(requirement.skillId as string, set);
    }

    const evidence = await ctx.db.query("learnerEvidence").collect();
    const maxTier = new Map<string, number>(); // `${learnerId}|${skillId}` -> rank
    for (const item of evidence) {
      if (item.verificationStatus === "rejected") continue;
      const rank = tierRank.get(item.evidenceType);
      if (rank === undefined) continue;
      const key = `${item.learnerId}|${item.skillId}`;
      const current = maxTier.get(key);
      if (current === undefined || current < rank) maxTier.set(key, rank);
    }

    const rows = [];
    for (const [skillId, jobSet] of demandJobs) {
      const skill = await ctx.db.get(skillId as Id<"skills">);
      if (!skill) continue;
      const counts = tiers.map(() => 0);
      for (const learner of learners) {
        const rank = maxTier.get(`${learner._id}|${skillId}`);
        if (rank === undefined) continue;
        for (let t = 0; t <= rank; t += 1) counts[t] += 1;
      }
      rows.push({
        skillId,
        name: skill.canonicalName,
        demandPercent: Math.round((jobSet.size / totalJobs) * 100),
        postingsRequiring: jobSet.size,
        tiers: tiers.map((tier, i) => ({
          tier,
          percent: total ? Math.round((counts[i] / total) * 100) : 0,
        })),
      });
    }
    rows.sort((a, b) => b.demandPercent - a.demandPercent);
    return { learners: total, tiers: [...tiers], rows };
  },
});

/** Data-quality / review queue for a cohort: pending AI runs and low-confidence evidence. */
export const reviewQueue = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await assertCohortAccess(ctx, args.cohortId);
    const learners = await ctx.db
      .query("learners")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    const learnerIds = new Set(learners.map((l) => l._id));

    const runs = (await ctx.db.query("pipelineRuns").collect()).filter(
      (r) => r.learnerId && learnerIds.has(r.learnerId),
    );
    const pending = runs.filter((r) => r.status === "queued" || r.status === "running").length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const unresolvedRuns = runs.filter((r) => r.notes && /unresolved=[1-9]/.test(r.notes)).length;

    const evidence = (await ctx.db.query("learnerEvidence").collect()).filter(
      (e) => learnerIds.has(e.learnerId),
    );
    const lowConfidence: {
      evidenceId: string;
      learnerName: string;
      skillName: string;
      confidence: number;
      evidenceText: string;
      sourceType: string;
    }[] = [];
    for (const item of evidence) {
      if (!(item.confidence < 0.5 && item.verificationStatus === "unverified")) continue;
      const learner = await ctx.db.get(item.learnerId);
      const skill = await ctx.db.get(item.skillId as Id<"skills">);
      lowConfidence.push({
        evidenceId: item._id as string,
        learnerName: learner?.name ?? "Unknown",
        skillName: skill?.canonicalName ?? "Unknown",
        confidence: item.confidence,
        evidenceText: item.evidenceText,
        sourceType: item.sourceType,
      });
    }
    lowConfidence.sort((a, b) => a.confidence - b.confidence);

    return {
      pending,
      failed,
      unresolvedRuns,
      lowConfidenceCount: lowConfidence.length,
      totalEvidence: evidence.length,
      items: lowConfidence.slice(0, 25),
    };
  },
});

const FUNNEL_STAGES = [
  "INTERVENTION_RECOMMENDED",
  "INTERVENTION_COMPLETED",
  "ASSESSMENT_PASSED",
  "APPLICATION_SUBMITTED",
  "SHORTLISTED",
  "INTERVIEWED",
  "OFFER_RECEIVED",
  "PLACED",
] as const;

/** Per-learner outcome progress for a cohort's outcomes table + CSV export. */
export const cohortOutcomes = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await assertCohortAccess(ctx, args.cohortId);
    const learners = await ctx.db
      .query("learners")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    const learnerIds = new Set(learners.map((l) => l._id));
    const events = (await ctx.db.query("outcomeEvents").collect()).filter((e) =>
      learnerIds.has(e.learnerId),
    );

    const rankOf = (stage: string) => (FUNNEL_STAGES as readonly string[]).indexOf(stage);

    return learners
      .map((learner) => {
        const own = events.filter((e) => e.learnerId === learner._id);
        const reached = FUNNEL_STAGES.filter((s) => own.some((e) => e.eventType === s));
        const furthest = reached.length ? reached[reached.length - 1] : null;
        const lastDate = own.reduce((m, e) => Math.max(m, e.eventDate), 0);
        return {
          learnerId: learner._id as string,
          learnerName: learner.name,
          eventCount: own.length,
          reached: [...reached],
          furthest,
          furthestRank: furthest ? rankOf(furthest) : -1,
          lastEventDate: lastDate || null,
        };
      })
      .sort((a, b) => b.furthestRank - a.furthestRank || a.learnerName.localeCompare(b.learnerName));
  },
});
