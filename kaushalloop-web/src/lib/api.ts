// Typed handle to the Convex backend functions. The `@convex/*` tsconfig path
// points at the sibling kaushalloop-convex/convex folder, so these resolve to
// the real generated `_generated` (kept fresh by `npx convex dev` there).
// At runtime only `_generated/api.js` is bundled, which imports just
// `convex/server` - client-safe.
export { api } from "@convex/_generated/api";
export type { Id, Doc } from "@convex/_generated/dataModel";
