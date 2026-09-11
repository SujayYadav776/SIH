import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * DEV-ONLY auth bypass so local development and the demo can render Convex data
 * without a full auth provider wired up yet.
 *
 * The guard is a per-deployment env flag: ACTIVE ONLY when the deployment has
 * explicitly set DEV_AUTH=1. It is OFF by default, and you simply never set
 * DEV_AUTH on a production deployment, so the normal `ctx.auth` path is the only
 * one that runs there. (We can NOT gate on NODE_ENV here: Convex runs function
 * sandboxes with NODE_ENV="production" even on local dev deployments.)
 * Delete this once ConvexAuth (see CONVEX_AUTH.md) is in place.
 */
const DEV_AUTH_SUBJECT_DEFAULT = "demo-coordinator-subject";

function devAuthEnabled(): boolean {
  return process.env.DEV_AUTH === "1";
}

export async function currentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    if (!devAuthEnabled()) throw new Error("Unauthenticated");
    const subject = process.env.DEV_AUTH_SUBJECT || DEV_AUTH_SUBJECT_DEFAULT;
    return ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .unique();
  }
  return ctx.db
    .query("users")
    .withIndex("by_subject", (q) => q.eq("subject", identity.subject))
    .unique();
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await currentUser(ctx);
  if (!user) throw new Error("Application user is not provisioned");
  return user;
}

export async function requireInstitutionMember(ctx: QueryCtx | MutationCtx, institutionId: Id<"institutions">) {
  const user = await requireUser(ctx);
  if (user.institutionId !== institutionId) throw new Error("Forbidden institution access");
  return user;
}

export function canManageInstitution(role: string) {
  return role === "admin" || role === "coordinator" || role === "trainer";
}
