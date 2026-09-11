import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

const documentType = v.union(v.literal("resume"), v.literal("job_description"), v.literal("other"));

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    learnerId: v.optional(v.id("learners")),
    storageId: v.id("_storage"),
    filename: v.string(),
    documentType,
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.insert("documents", {
      ...args,
      parserStatus: "uploaded",
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return ctx.db.get(args.documentId);
  },
});
