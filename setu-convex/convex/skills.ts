import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { canManageInstitution, requireUser } from "./auth";
import { pickCanonicalMatch, type SkillCandidate } from "./normalize";

const evidenceType = v.union(
  v.literal("claimed"),
  v.literal("inferred"),
  v.literal("assessed"),
  v.literal("project_proven"),
  v.literal("verified_external"),
);
const requirementType = v.union(
  v.literal("must_have"),
  v.literal("preferred"),
  v.literal("not_specified"),
);

/** Load the whole catalogue as pure candidates for deterministic resolution. */
export async function loadCandidates(ctx: any): Promise<SkillCandidate[]> {
  const skills = await ctx.db.query("skills").collect();
  const aliases = await ctx.db.query("skillAliases").collect();
  const bySkill = new Map<string, string[]>();
  for (const alias of aliases) {
    if (!alias.approved) continue;
    const list = bySkill.get(alias.skillId) ?? [];
    list.push(alias.alias);
    bySkill.set(alias.skillId, list);
  }
  return skills.map((skill: any) => ({
    skillId: skill._id as string,
    canonicalName: skill.canonicalName,
    aliases: bySkill.get(skill._id) ?? [],
  }));
}

export const create = mutation({
  args: {
    canonicalName: v.string(),
    description: v.optional(v.string()),
    skillType: v.union(v.literal("technical"), v.literal("soft"), v.literal("domain")),
    taxonomy: v.string(),
    taxonomyVersion: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"skills">> => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role) || !user.institutionId) {
      throw new Error("Only institution staff can create skills");
    }
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_name", (q) => q.eq("canonicalName", args.canonicalName))
      .unique();
    if (existing) throw new Error("A skill with that canonical name already exists");
    return ctx.db.insert("skills", args);
  },
});

export const get = query({
  args: { skillId: v.id("skills") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.get(args.skillId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return ctx.db.query("skills").collect();
  },
});

export const addAlias = mutation({
  args: {
    skillId: v.id("skills"),
    alias: v.string(),
    language: v.optional(v.string()),
    source: v.string(),
    approved: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"skillAliases">> => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role) || !user.institutionId) {
      throw new Error("Only institution staff can manage skill aliases");
    }
    const skill = await ctx.db.get(args.skillId);
    if (!skill) throw new Error("Skill not found");
    return ctx.db.insert("skillAliases", args);
  },
});

/**
 * Resolve a batch of raw surface forms (e.g. from an extraction pass) against
 * the catalogue using the deterministic steps. Returns the matched skill id,
 * the method used, and a confidence so the UI can show provenance and route
 * `unresolved` rows to coordinator review.
 */
export const resolve = query({
  args: { surfaceForms: v.array(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const candidates = await loadCandidates(ctx);
    return args.surfaceForms.map((surfaceForm) => ({
      surfaceForm,
      ...pickCanonicalMatch(surfaceForm, candidates),
    }));
  },
});

/**
 * Record learner evidence from already-extracted skill spans, resolving each
 * span to a canonical skill id first. Unresolved spans are skipped and returned
 * so the caller can queue them for review (they are never invented).
 */
export const recordLearnerEvidence = mutation({
  args: {
    learnerId: v.id("learners"),
    sourceDocumentId: v.optional(v.id("documents")),
    model: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    spans: v.array(
      v.object({
        surface_form: v.string(),
        canonical_name: v.optional(v.string()),
        evidence_text: v.string(),
        evidence_type: evidenceType,
        requirement_type: v.optional(requirementType),
        confidence: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const learner = await ctx.db.get(args.learnerId);
    const cohort = learner ? await ctx.db.get(learner.cohortId) : null;
    if (!learner || !cohort || cohort.institutionId !== user.institutionId) {
      throw new Error("Forbidden learner access");
    }

    const candidates = await loadCandidates(ctx);
    const recorded: { skillId: Id<"skills">; method: string; confidence: number }[] = [];
    const unresolved: string[] = [];

    for (const span of args.spans) {
      const resolution = pickCanonicalMatch(span.surface_form, candidates);
      const skillId =
        resolution.skillId ??
        (span.canonical_name
          ? pickCanonicalMatch(span.canonical_name, candidates).skillId
          : null);
      if (!skillId) {
        unresolved.push(span.surface_form);
        continue;
      }
      await ctx.db.insert("learnerEvidence", {
        learnerId: args.learnerId,
        skillId: skillId as Id<"skills">,
        sourceType: "ai_document_extraction",
        sourceDocumentId: args.sourceDocumentId,
        evidenceType: span.evidence_type,
        evidenceText: span.evidence_text,
        confidence: span.confidence,
        verificationStatus: "unverified",
        model: args.model,
        promptVersion: args.promptVersion,
        createdAt: Date.now(),
      });
      recorded.push({ skillId: skillId as Id<"skills">, method: resolution.method, confidence: resolution.confidence });
    }

    return { recorded, unresolved };
  },
});

/** Internal helper the AI worker callback can use to resolve a single span. */
export const resolveInternal = internalMutation({
  args: { surfaceForm: v.string() },
  handler: async (ctx, args) => {
    const candidates = await loadCandidates(ctx);
    return pickCanonicalMatch(args.surfaceForm, candidates);
  },
});
