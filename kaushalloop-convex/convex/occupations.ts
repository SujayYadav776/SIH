import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { canManageInstitution, requireUser } from "./auth";
import { mean, round4 } from "./scoring";

export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    taxonomy: v.string(),
    taxonomyVersion: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"occupations">> => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role) || !user.institutionId) {
      throw new Error("Only institution staff can create occupations");
    }
    return ctx.db.insert("occupations", args);
  },
});

export const get = query({
  args: { occupationId: v.id("occupations") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.get(args.occupationId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return ctx.db.query("occupations").collect();
  },
});

export interface SkillDemand {
  skillId: string;
  name: string;
  /** Share of matching postings that require this skill (0..1). */
  demandShare: number;
  demandPercent: number;
  postingsRequiring: number;
  mustHaveCount: number;
  avgImportance: number;
  /** Up to a few verbatim phrases so judges can see the evidence behind a skill. */
  evidenceSamples: { evidenceText: string; company: string | undefined }[];
}

/**
 * Role demand summary (the "Demand dashboard", plan §8/§15.2). Deterministic
 * aggregation of extracted skill requirements across the target role's postings,
 * optionally filtered by location and a posted-at window.
 */
export const getDemandSummary = query({
  args: {
    occupationId: v.id("occupations"),
    location: v.optional(v.string()),
    postedAfter: v.optional(v.number()),
    postedBefore: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ totalPostings: number; skills: SkillDemand[] }> => {
    await requireUser(ctx);
    let jobs = await ctx.db
      .query("jobPostings")
      .withIndex("by_occupation", (q) => q.eq("occupationId", args.occupationId))
      .collect();
    if (args.location) jobs = jobs.filter((job) => job.location === args.location);
    if (args.postedAfter) jobs = jobs.filter((job) => job.postedAt >= args.postedAfter!);
    if (args.postedBefore) jobs = jobs.filter((job) => job.postedAt <= args.postedBefore!);

    const jobIds = new Set(jobs.map((job) => job._id as string));
    const jobById = new Map(jobs.map((job) => [job._id as string, job]));
    const totalPostings = jobs.length;

    const requirements = await ctx.db.query("jobSkillRequirements").collect();
    const buckets = new Map<
      string,
      { jobs: Set<string>; importances: number[]; mustHave: number; samples: { evidenceText: string; company: string | undefined }[] }
    >();
    for (const requirement of requirements) {
      if (!jobIds.has(requirement.jobId as string)) continue;
      const key = requirement.skillId as string;
      const bucket = buckets.get(key) ?? { jobs: new Set(), importances: [], mustHave: 0, samples: [] };
      bucket.jobs.add(requirement.jobId as string);
      bucket.importances.push(requirement.importance);
      if (requirement.requirementType === "must_have") bucket.mustHave += 1;
      const job = jobById.get(requirement.jobId as string);
      if (bucket.samples.length < 3) bucket.samples.push({ evidenceText: requirement.evidenceText, company: job?.company });
      buckets.set(key, bucket);
    }

    const skills: SkillDemand[] = [];
    for (const [skillId, bucket] of buckets) {
      const skill = await ctx.db.get(skillId as Id<"skills">);
      if (!skill) continue;
      const demandShare = totalPostings > 0 ? bucket.jobs.size / totalPostings : 0;
      skills.push({
        skillId,
        name: skill.canonicalName,
        demandShare: round4(demandShare),
        demandPercent: Math.round(demandShare * 100),
        postingsRequiring: bucket.jobs.size,
        mustHaveCount: bucket.mustHave,
        avgImportance: round4(mean(bucket.importances)),
        evidenceSamples: bucket.samples,
      });
    }

    skills.sort((a, b) => b.demandPercent - a.demandPercent || b.avgImportance - a.avgImportance);
    return { totalPostings, skills: args.limit ? skills.slice(0, args.limit) : skills };
  },
});
