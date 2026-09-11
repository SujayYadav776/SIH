import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { canManageInstitution, requireUser } from "./auth";
import { pickCanonicalMatch } from "./normalize";

const requirementType = v.union(
  v.literal("must_have"),
  v.literal("preferred"),
  v.literal("not_specified"),
);

/**
 * Deterministic content fingerprint for duplicate rejection (Pipeline A step 3).
 * The AI service computes real SHA-256 for uploaded documents; for job text we
 * only need a stable, collision-resistant-enough key to reject exact re-imports.
 * Two independent FNV-1a lanes are combined into a 16-hex-char digest.
 */
function contentHash(input: string): string {
  const text = input.toLowerCase().replace(/\s+/g, " ").trim();
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + code, 0x85ebca6b) >>> 0;
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

const jobFields = {
  title: v.string(),
  company: v.optional(v.string()),
  location: v.string(),
  source: v.string(),
  sourceUrl: v.optional(v.string()),
  postedAt: v.number(),
  description: v.string(),
  occupationId: v.optional(v.id("occupations")),
  contentHash: v.optional(v.string()),
};

async function insertJob(ctx: any, job: any) {
  const hash = job.contentHash ?? contentHash(`${job.title}|${job.company ?? ""}|${job.location}|${job.description}`);
  const existing = await ctx.db
    .query("jobPostings")
    .withIndex("by_hash", (q: any) => q.eq("contentHash", hash))
    .unique();
  if (existing) return { jobId: existing._id as Id<"jobPostings">, duplicate: true };

  // Required-field guard mirroring Pipeline A step 2.
  if (!job.title?.trim() || !job.location?.trim() || !job.source?.trim() || !job.description?.trim()) {
    throw new Error("Job is missing a required field (title, location, source, description)");
  }
  if (!job.postedAt) throw new Error("Job is missing a postedAt date");

  const jobId = await ctx.db.insert("jobPostings", {
    title: job.title,
    company: job.company,
    location: job.location,
    source: job.source,
    sourceUrl: job.sourceUrl,
    postedAt: job.postedAt,
    description: job.description,
    occupationId: job.occupationId,
    contentHash: hash,
    createdAt: Date.now(),
  });
  return { jobId: jobId as Id<"jobPostings">, duplicate: false };
}

export const create = mutation({
  args: jobFields,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role)) throw new Error("Only institution staff can import jobs");
    return insertJob(ctx, args);
  },
});

/** CSV/JSON bulk entry first (Pipeline A). Duplicate rows are rejected by hash. */
export const importBatch = mutation({
  args: { jobs: v.array(v.object(jobFields)) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role)) throw new Error("Only institution staff can import jobs");
    const inserted: Id<"jobPostings">[] = [];
    const duplicates: Id<"jobPostings">[] = [];
    for (const job of args.jobs) {
      const result = await insertJob(ctx, job);
      (result.duplicate ? duplicates : inserted).push(result.jobId);
    }
    return { inserted, duplicates, total: args.jobs.length };
  },
});

export const list = query({
  args: {
    occupationId: v.optional(v.id("occupations")),
    location: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    let jobs;
    if (args.occupationId) {
      jobs = await ctx.db
        .query("jobPostings")
        .withIndex("by_occupation", (q) => q.eq("occupationId", args.occupationId))
        .collect();
    } else {
      jobs = await ctx.db.query("jobPostings").collect();
    }
    if (args.location) jobs = jobs.filter((job: any) => job.location === args.location);
    jobs.sort((a: any, b: any) => b.postedAt - a.postedAt);
    return args.limit ? jobs.slice(0, args.limit) : jobs;
  },
});

export const get = query({
  args: { jobId: v.id("jobPostings") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const requirements = await ctx.db
      .query("jobSkillRequirements")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();
    return { ...job, requirements };
  },
});

/**
 * Attach a normalised skill requirement to a job. The caller may pass a resolved
 * skillId, or a surface form which is resolved against the catalogue first — the
 * canonical id is always stored, never the raw phrase (Pipeline A steps 7-8).
 */
export const addSkillRequirement = mutation({
  args: {
    jobId: v.id("jobPostings"),
    skillId: v.optional(v.id("skills")),
    surfaceForm: v.optional(v.string()),
    requirementType,
    importance: v.number(),
    extractionConfidence: v.number(),
    evidenceText: v.string(),
    model: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role)) throw new Error("Only institution staff can edit requirements");
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");

    let skillId = args.skillId;
    let resolutionMethod = "explicit";
    let resolutionConfidence = 1;
    if (!skillId) {
      if (!args.surfaceForm) throw new Error("Provide either skillId or surfaceForm");
      const skills = await ctx.db.query("skills").collect();
      const aliases = await ctx.db.query("skillAliases").collect();
      const bySkill = new Map<string, string[]>();
      for (const alias of aliases) {
        if (!alias.approved) continue;
        bySkill.set(alias.skillId, [...(bySkill.get(alias.skillId) ?? []), alias.alias]);
      }
      const candidates = skills.map((skill) => ({
        skillId: skill._id as string,
        canonicalName: skill.canonicalName,
        aliases: bySkill.get(skill._id) ?? [],
      }));
      const resolution = pickCanonicalMatch(args.surfaceForm, candidates);
      if (!resolution.skillId) {
        // Unresolved span: leave it out of the canonical tables and flag for review.
        throw new Error(`Could not resolve "${args.surfaceForm}" to a canonical skill — needs coordinator review`);
      }
      skillId = resolution.skillId as Id<"skills">;
      resolutionMethod = resolution.method;
      resolutionConfidence = resolution.confidence;
    }

    const requirementId = await ctx.db.insert("jobSkillRequirements", {
      jobId: args.jobId,
      skillId,
      requirementType: args.requirementType,
      importance: args.importance,
      extractionConfidence: args.extractionConfidence,
      evidenceText: args.evidenceText,
      model: args.model,
      promptVersion: args.promptVersion,
    });
    return { requirementId, skillId, resolutionMethod, resolutionConfidence };
  },
});

/**
 * Queue a job for (re-)extraction by the AI worker. Creates a pipelineRuns row
 * so the UI can subscribe to progress; the worker callback is the extension
 * point (analogous to ai.analyzeDocument, but for job text).
 */
export const reprocess = mutation({
  args: { jobId: v.id("jobPostings") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role)) throw new Error("Only institution staff can reprocess jobs");
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");
    return ctx.db.insert("pipelineRuns", {
      pipelineName: "job_extraction",
      status: "queued",
      progress: 0,
      createdAt: Date.now(),
    });
  },
});
