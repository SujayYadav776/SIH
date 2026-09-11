import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { pickCanonicalMatch } from "./normalize";
import { loadCandidates } from "./skills";

const documentType = v.union(v.literal("resume"), v.literal("job_description"), v.literal("other"));

export const analyzeDocument = action({
  args: {
    learnerId: v.id("learners"),
    storageId: v.id("_storage"),
    documentType,
    targetRole: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"pipelineRuns">> => {
    const pipelineRunId = await ctx.runMutation(internal.ai.createPipelineRun, {
      learnerId: args.learnerId,
      storageId: args.storageId,
      pipelineName: "document_analysis",
    });

    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL;
      const aiServiceToken = process.env.AI_SERVICE_TOKEN;
      if (!aiServiceUrl) throw new Error("AI_SERVICE_URL is not configured");

      await ctx.runMutation(internal.ai.updatePipelineRun, {
        pipelineRunId,
        status: "running",
        progress: 10,
      });

      const sourceUrl = await ctx.storage.getUrl(args.storageId);
      if (!sourceUrl) throw new Error("Convex storage file was not found");
      const sourceResponse = await fetch(sourceUrl);
      if (!sourceResponse.ok) throw new Error(`Could not download source document (${sourceResponse.status})`);

      const form = new FormData();
      const bytes = await sourceResponse.arrayBuffer();
      form.append("file", new Blob([bytes]), "uploaded-document");
      form.append("document_type", args.documentType);
      if (args.targetRole) form.append("target_role", args.targetRole);

      const response = await fetch(`${aiServiceUrl.replace(/\/$/, "")}/v1/analyze-document`, {
        method: "POST",
        headers: aiServiceToken ? { Authorization: `Bearer ${aiServiceToken}` } : undefined,
        body: form,
      });
      if (!response.ok) throw new Error(`AI service returned ${response.status}`);
      const result = await response.json();

      await ctx.runMutation(internal.ai.saveAnalysis, {
        pipelineRunId,
        learnerId: args.learnerId,
        storageId: args.storageId,
        result,
      });
      return pipelineRunId;
    } catch (error) {
      await ctx.runMutation(internal.ai.updatePipelineRun, {
        pipelineRunId,
        status: "failed",
        progress: 100,
        error: error instanceof Error ? error.message : "AI analysis failed",
      });
      throw error;
    }
  },
});

export const createPipelineRun = internalMutation({
  args: { learnerId: v.id("learners"), storageId: v.id("_storage"), pipelineName: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const learner = await ctx.db.get(args.learnerId);
    const document = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("storageId"), args.storageId))
      .first();
    const cohort = learner ? await ctx.db.get(learner.cohortId) : null;
    if (!learner || !cohort || cohort.institutionId !== user.institutionId || !document) {
      throw new Error("Forbidden learner or document access");
    }
    if (document.learnerId && document.learnerId !== args.learnerId) {
      throw new Error("Document does not belong to learner");
    }
    return ctx.db.insert("pipelineRuns", {
      learnerId: args.learnerId,
      documentId: document._id,
      pipelineName: args.pipelineName,
      status: "queued",
      progress: 0,
      createdAt: Date.now(),
    });
  },
});

export const updatePipelineRun = internalMutation({
  args: {
    pipelineRunId: v.id("pipelineRuns"),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    progress: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.pipelineRunId, {
      status: args.status,
      progress: args.progress,
      ...(args.error ? { error: args.error } : {}),
      ...(args.status === "completed" || args.status === "failed" ? { completedAt: Date.now() } : {}),
    });
  },
});

export const saveAnalysis = internalMutation({
  args: {
    pipelineRunId: v.id("pipelineRuns"),
    learnerId: v.id("learners"),
    storageId: v.id("_storage"),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const extraction = args.result?.extraction?.extraction;
    const documentResult = args.result?.document;
    const document = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("storageId"), args.storageId))
      .first();

    if (document) {
      await ctx.db.patch(document._id, {
        parserStatus: "completed",
        sha256: documentResult?.sha256,
      });
    }

    let resolved = 0;
    let unresolved = 0;

    if (extraction?.skills && Array.isArray(extraction.skills)) {
      const model = args.result?.extraction?.model;
      const promptVersion = args.result?.extraction?.prompt_version;
      const candidates = await loadCandidates(ctx);

      for (const item of extraction.skills) {
        // Deterministic canonical resolution: exact → alias → fuzzy (Pipeline A steps 5-8).
        let resolution = item.surface_form
          ? pickCanonicalMatch(String(item.surface_form), candidates)
          : null;
        if (!resolution?.skillId && item.canonical_name) {
          resolution = pickCanonicalMatch(String(item.canonical_name), candidates);
        }

        // An unresolved span is never turned into a business record; it is only counted for review.
        if (!resolution?.skillId) {
          unresolved += 1;
          continue;
        }

        const extractionConfidence = typeof item.confidence === "number" ? item.confidence : 0.5;
        const confidence =
          Math.round(Math.min(extractionConfidence, resolution.confidence || 1) * 100) / 100;

        await ctx.db.insert("learnerEvidence", {
          learnerId: args.learnerId,
          skillId: resolution.skillId as Id<"skills">,
          sourceType: `ai_document_extraction:${resolution.method}`,
          sourceDocumentId: document?._id,
          evidenceType: item.evidence_type ?? "inferred",
          evidenceText: item.evidence_text ?? String(item.surface_form ?? item.canonical_name),
          confidence,
          verificationStatus: "unverified",
          model,
          promptVersion,
          createdAt: Date.now(),
        });
        resolved += 1;
      }
    }

    await ctx.db.patch(args.pipelineRunId, {
      status: "completed",
      progress: 100,
      model: args.result?.extraction?.model,
      promptVersion: args.result?.extraction?.prompt_version,
      notes: `skills resolved=${resolved} unresolved=${unresolved}; unresolved spans need coordinator review`,
      completedAt: Date.now(),
    });
  },
});

export const getPipelineRun = query({
  args: { pipelineRunId: v.id("pipelineRuns") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.get(args.pipelineRunId);
  },
});
