/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as analysis from "../analysis.js";
import type * as analytics from "../analytics.js";
import type * as assessments from "../assessments.js";
import type * as auth from "../auth.js";
import type * as cohorts from "../cohorts.js";
import type * as documents from "../documents.js";
import type * as gaps from "../gaps.js";
import type * as institutions from "../institutions.js";
import type * as interventions from "../interventions.js";
import type * as jobs from "../jobs.js";
import type * as learners from "../learners.js";
import type * as normalize from "../normalize.js";
import type * as occupations from "../occupations.js";
import type * as outcomes from "../outcomes.js";
import type * as recommendations from "../recommendations.js";
import type * as scoring from "../scoring.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as skills from "../skills.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  analysis: typeof analysis;
  analytics: typeof analytics;
  assessments: typeof assessments;
  auth: typeof auth;
  cohorts: typeof cohorts;
  documents: typeof documents;
  gaps: typeof gaps;
  institutions: typeof institutions;
  interventions: typeof interventions;
  jobs: typeof jobs;
  learners: typeof learners;
  normalize: typeof normalize;
  occupations: typeof occupations;
  outcomes: typeof outcomes;
  recommendations: typeof recommendations;
  scoring: typeof scoring;
  seed: typeof seed;
  settings: typeof settings;
  skills: typeof skills;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
