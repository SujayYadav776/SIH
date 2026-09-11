import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { canManageInstitution, requireUser } from "./auth";
import {
  DEFAULT_SCORING_CONFIG,
  type EvidenceType,
  type ScoringConfig,
} from "./scoring";

const weightsValidator = v.object({
  missing: v.number(),
  inferred: v.number(),
  claimed: v.number(),
  assessed: v.number(),
  project_proven: v.number(),
  verified_external: v.number(),
});

/**
 * Resolve the effective scoring config for an institution, falling back to code
 * defaults when no `settings` row exists. This keeps gap/recommendation maths
 * deterministic and identical for everyone without a config row.
 */
export async function loadScoringConfig(ctx: any, institutionId?: string): Promise<ScoringConfig> {
  let row: any = null;
  if (institutionId) {
    row = await ctx.db
      .query("settings")
      .withIndex("by_institution", (q: any) => q.eq("institutionId", institutionId))
      .first();
  }
  return {
    weights: { ...DEFAULT_SCORING_CONFIG.weights, ...(row?.weights ?? {}) },
    roleRelevance: row?.roleRelevance ?? DEFAULT_SCORING_CONFIG.roleRelevance,
    highDemandThreshold:
      row?.tuning?.highDemandThreshold ?? DEFAULT_SCORING_CONFIG.highDemandThreshold,
    shortDurationHours:
      row?.tuning?.shortDurationHours ?? DEFAULT_SCORING_CONFIG.shortDurationHours,
    referenceDurationHours:
      row?.tuning?.referenceDurationHours ?? DEFAULT_SCORING_CONFIG.referenceDurationHours,
  };
}

/** Effective config for the signed-in user's institution (UI display / preview). */
export const get = query({
  args: {},
  handler: async (ctx) => loadScoringConfig(ctx, (await requireUser(ctx)).institutionId),
});

/** Coordinator/admin tune the evidence weights and thresholds; upserts the settings row. */
export const updateWeights = mutation({
  args: {
    weights: weightsValidator,
    roleRelevance: v.number(),
    tuning: v.optional(
      v.object({
        highDemandThreshold: v.optional(v.number()),
        shortDurationHours: v.optional(v.number()),
        referenceDurationHours: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!canManageInstitution(user.role) || !user.institutionId) {
      throw new Error("Only institution staff can adjust scoring weights");
    }
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_institution", (q) => q.eq("institutionId", user.institutionId!))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        weights: args.weights,
        roleRelevance: args.roleRelevance,
        tuning: args.tuning,
      });
      return existing._id;
    }
    return ctx.db.insert("settings", {
      institutionId: user.institutionId,
      weights: args.weights,
      roleRelevance: args.roleRelevance,
      tuning: args.tuning,
      createdAt: Date.now(),
    });
  },
});

export type { EvidenceType };
