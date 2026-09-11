import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(v.literal("admin"), v.literal("coordinator"), v.literal("learner"), v.literal("trainer"));
const documentType = v.union(v.literal("resume"), v.literal("job_description"), v.literal("other"));
const evidenceType = v.union(
  v.literal("claimed"),
  v.literal("inferred"),
  v.literal("assessed"),
  v.literal("project_proven"),
  v.literal("verified_external"),
);
const requirementType = v.union(v.literal("must_have"), v.literal("preferred"), v.literal("not_specified"));
const outcomeType = v.union(
  v.literal("PROFILE_CREATED"),
  v.literal("ASSESSMENT_STARTED"),
  v.literal("ASSESSMENT_PASSED"),
  v.literal("INTERVENTION_RECOMMENDED"),
  v.literal("INTERVENTION_STARTED"),
  v.literal("INTERVENTION_COMPLETED"),
  v.literal("APPLICATION_SUBMITTED"),
  v.literal("SHORTLISTED"),
  v.literal("INTERVIEWED"),
  v.literal("OFFER_RECEIVED"),
  v.literal("PLACED"),
  v.literal("RETAINED_90_DAYS"),
);

export default defineSchema({
  users: defineTable({
    subject: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    role,
    institutionId: v.optional(v.id("institutions")),
    createdAt: v.number(),
  }).index("by_subject", ["subject"]).index("by_institution", ["institutionId"]),

  institutions: defineTable({
    name: v.string(),
    type: v.string(),
    city: v.string(),
    state: v.string(),
    createdAt: v.number(),
  }),

  settings: defineTable({
    institutionId: v.optional(v.id("institutions")),
    weights: v.object({
      missing: v.number(),
      inferred: v.number(),
      claimed: v.number(),
      assessed: v.number(),
      project_proven: v.number(),
      verified_external: v.number(),
    }),
    roleRelevance: v.number(),
    tuning: v.optional(
      v.object({
        highDemandThreshold: v.optional(v.number()),
        shortDurationHours: v.optional(v.number()),
        referenceDurationHours: v.optional(v.number()),
      }),
    ),
    createdAt: v.number(),
  }).index("by_institution", ["institutionId"]),

  cohorts: defineTable({
    institutionId: v.id("institutions"),
    name: v.string(),
    targetRoleId: v.id("occupations"),
    geography: v.string(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_institution", ["institutionId"]),

  learners: defineTable({
    userId: v.optional(v.id("users")),
    cohortId: v.id("cohorts"),
    name: v.string(),
    email: v.optional(v.string()),
    education: v.optional(v.string()),
    experienceMonths: v.optional(v.number()),
    location: v.optional(v.string()),
    languagePreference: v.optional(v.string()),
    consentStatus: v.boolean(),
    createdAt: v.number(),
  }).index("by_cohort", ["cohortId"]).index("by_user", ["userId"]),

  documents: defineTable({
    learnerId: v.optional(v.id("learners")),
    storageId: v.id("_storage"),
    filename: v.string(),
    documentType,
    sha256: v.optional(v.string()),
    parserStatus: v.union(v.literal("uploaded"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    createdAt: v.number(),
  }).index("by_learner", ["learnerId"]),

  occupations: defineTable({
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    taxonomy: v.string(),
    taxonomyVersion: v.string(),
  }).index("by_code", ["code"]),

  skills: defineTable({
    canonicalName: v.string(),
    description: v.optional(v.string()),
    skillType: v.union(v.literal("technical"), v.literal("soft"), v.literal("domain")),
    taxonomy: v.string(),
    taxonomyVersion: v.string(),
  }).index("by_name", ["canonicalName"]),

  skillAliases: defineTable({
    skillId: v.id("skills"),
    alias: v.string(),
    language: v.optional(v.string()),
    source: v.string(),
    approved: v.boolean(),
  }).index("by_alias", ["alias"]).index("by_skill", ["skillId"]),

  jobPostings: defineTable({
    title: v.string(),
    company: v.optional(v.string()),
    location: v.string(),
    source: v.string(),
    sourceUrl: v.optional(v.string()),
    postedAt: v.number(),
    description: v.string(),
    contentHash: v.string(),
    occupationId: v.optional(v.id("occupations")),
    createdAt: v.number(),
  }).index("by_hash", ["contentHash"]).index("by_occupation", ["occupationId"]).index("by_location", ["location"]),

  jobSkillRequirements: defineTable({
    jobId: v.id("jobPostings"),
    skillId: v.id("skills"),
    requirementType,
    importance: v.number(),
    extractionConfidence: v.number(),
    evidenceText: v.string(),
    model: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
  }).index("by_job", ["jobId"]).index("by_skill", ["skillId"]),

  learnerEvidence: defineTable({
    learnerId: v.id("learners"),
    skillId: v.id("skills"),
    sourceType: v.string(),
    sourceDocumentId: v.optional(v.id("documents")),
    evidenceType,
    evidenceText: v.string(),
    confidence: v.number(),
    verificationStatus: v.union(v.literal("unverified"), v.literal("verified"), v.literal("rejected")),
    model: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_learner", ["learnerId"]).index("by_learner_skill", ["learnerId", "skillId"]),

  interventions: defineTable({
    title: v.string(),
    type: v.string(),
    provider: v.optional(v.string()),
    durationHours: v.number(),
    cost: v.optional(v.number()),
    url: v.optional(v.string()),
    prerequisites: v.array(v.string()),
    skillIds: v.array(v.id("skills")),
    description: v.string(),
  }),

  recommendations: defineTable({
    learnerId: v.id("learners"),
    skillId: v.id("skills"),
    interventionId: v.id("interventions"),
    rank: v.number(),
    score: v.number(),
    reasonCodes: v.array(v.string()),
    sourceJobIds: v.array(v.id("jobPostings")),
    status: v.union(v.literal("recommended"), v.literal("started"), v.literal("completed")),
    createdAt: v.number(),
  }).index("by_learner", ["learnerId"]),

  assessments: defineTable({
    skillId: v.id("skills"),
    title: v.string(),
    rubric: v.any(),
    durationMinutes: v.number(),
    version: v.string(),
  }).index("by_skill", ["skillId"]),

  assessmentAttempts: defineTable({
    assessmentId: v.id("assessments"),
    learnerId: v.id("learners"),
    score: v.number(),
    rubricResult: v.any(),
    completedAt: v.number(),
  }).index("by_learner", ["learnerId"]),

  outcomeEvents: defineTable({
    learnerId: v.id("learners"),
    eventType: outcomeType,
    eventDate: v.number(),
    metadata: v.optional(v.any()),
    source: v.string(),
    verified: v.boolean(),
  }).index("by_learner", ["learnerId"]).index("by_type", ["eventType"]),

  // Flat trainee-level outcomes dataset powering the Policy Dashboard (filters:
  // district / scheme / trade; metrics: placement, dropout, days-to-placement,
  // 3/6-month retention). Deliberately SYNTHETIC for the demo but built on real
  // scheme names (PMKVY, MSSDS) and representative NSQF/NCO codes. Distinct from
  // the event-sourced `outcomeEvents` table above.
  synthetic_outcomes: defineTable({
    traineeId: v.string(), // human-readable demo id, e.g. "PMKVY-NAG-ELEC-000123"
    scheme: v.string(), // PMKVY 4.0, MSSDS, Skill India Digital, RPL, NSDC Sector Skills
    trainingCenter: v.string(),
    district: v.string(),
    state: v.string(),
    urbanRural: v.union(v.literal("urban"), v.literal("semi_urban"), v.literal("rural")),
    trade: v.string(), // e.g. "Electrician"
    nsqfCode: v.string(), // representative NCO/NSQF code, e.g. "DEO/5021"
    nsqfLevel: v.number(), // 1..8
    completionStatus: v.union(v.literal("completed"), v.literal("dropped"), v.literal("ongoing")),
    placementStatus: v.union(v.literal("placed"), v.literal("unplaced"), v.literal("unknown")),
    daysToPlacement: v.optional(v.number()), // present only when placed
    retained3Months: v.boolean(),
    retained6Months: v.boolean(),
    salaryBand: v.optional(v.string()), // "<15k" | "15-25k" | "25-40k" | "40k+"
    cohortYear: v.number(), // 2022 | 2023 | 2024 — used by the trend chart
  })
    .index("by_district", ["district"])
    .index("by_scheme", ["scheme"])
    .index("by_trade", ["trade"])
    .index("by_year", ["cohortYear"]),

  pipelineRuns: defineTable({
    learnerId: v.optional(v.id("learners")),
    documentId: v.optional(v.id("documents")),
    pipelineName: v.string(),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    progress: v.number(),
    error: v.optional(v.string()),
    model: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_learner", ["learnerId"]),
});
