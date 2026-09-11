/**
 * Pure, deterministic scoring maths for KaushalLoop.
 *
 * This module deliberately has NO access to the database or the LLM. Everything
 * here is a plain function over plain data so that the same inputs always
 * produce the same outputs (the plan's core reliability requirement). The
 * Convex function files (gaps.ts, recommendations.ts) gather the raw rows, call
 * these helpers, and persist the results.
 *
 * Formulas follow "KaushalLoop MVP: Technical Implementation Plan" §6 (Pipelines
 * C and D). The weights are product parameters, not scientific truth, and are
 * overridable per institution through the `settings` table.
 */

export type EvidenceType =
  | "claimed"
  | "inferred"
  | "assessed"
  | "project_proven"
  | "verified_external";

export type RequirementType = "must_have" | "preferred" | "not_specified";

/** Evidence weights from Pipeline C. `missing` is implied for a skill with no evidence row. */
export const DEFAULT_EVIDENCE_WEIGHTS: Record<
  "missing" | EvidenceType,
  number
> = {
  missing: 0.0,
  inferred: 0.25,
  claimed: 0.4,
  assessed: 0.7,
  project_proven: 0.85,
  verified_external: 1.0,
};

/** Default single role-relevance multiplier (per-skill relevance is a later upgrade). */
export const DEFAULT_ROLE_RELEVANCE = 1.0;

/** Reference duration used to normalise time-efficiency into (0, 1]. */
export const DEFAULT_REFERENCE_DURATION_HOURS = 40;

export interface ScoringConfig {
  weights: Record<"missing" | EvidenceType, number>;
  roleRelevance: number;
  /** Demand at/above this fraction of target postings earns a HIGH_DEMAND reason code. */
  highDemandThreshold: number;
  /** Interventions at/below this duration earn a SHORT_DURATION reason code. */
  shortDurationHours: number;
  /** Reference duration for the time-efficiency sub-score. */
  referenceDurationHours: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: { ...DEFAULT_EVIDENCE_WEIGHTS },
  roleRelevance: DEFAULT_ROLE_RELEVANCE,
  highDemandThreshold: 0.5,
  shortDurationHours: 12,
  referenceDurationHours: DEFAULT_REFERENCE_DURATION_HOURS,
};

/**
 * Weight of the strongest evidence a learner holds for one skill.
 * Rows explicitly rejected by a reviewer are ignored (they no longer count as
 * possession). A skill with no surviving row is `missing` (weight 0).
 */
export function evidenceWeightForSkill(
  evidenceTypes: EvidenceType[],
  weights: ScoringConfig["weights"],
): number {
  if (evidenceTypes.length === 0) return weights.missing;
  return Math.max(...evidenceTypes.map((type) => weights[type] ?? weights.missing));
}

export interface DemandInputs {
  /** Number of target-role postings that require this skill. */
  postingsRequiringSkill: number;
  /** Total number of postings in the target role family. */
  totalTargetPostings: number;
  /** Importance values from each jobSkillRequirements row for the skill. */
  importances: number[];
}

export interface GapRow {
  skillId: string;
  name: string;
  /** Weighted share of target postings requiring the skill (0..1). */
  demand: number;
  /** Mean requirement importance across those postings (0..1). */
  importance: number;
  /** Strongest evidence the learner currently has, as a weight (0..1). */
  evidence: number;
  /** importance * (1 - evidence). */
  deficit: number;
  /** demand * deficit * roleRelevance. */
  priority: number;
  mustHave: boolean;
  evidenceTypes: EvidenceType[];
  /** True when the learner has evidence rows but none are reviewer-verified. */
  claimedUnverified: boolean;
}

/**
 * Compute the deterministic gap for one skill (Pipeline C).
 */
export function computeGap(
  skill: { id: string; name: string },
  demandInputs: DemandInputs,
  learnerEvidence: { evidenceType: EvidenceType; verificationStatus: "unverified" | "verified" | "rejected"; requirementHint?: RequirementType }[],
  config: ScoringConfig,
): GapRow {
  const demand =
    demandInputs.totalTargetPostings > 0
      ? demandInputs.postingsRequiringSkill / demandInputs.totalTargetPostings
      : 0;
  const importance = mean(demandInputs.importances);
  const surviving = learnerEvidence.filter((e) => e.verificationStatus !== "rejected");
  const evidenceTypes = surviving.map((e) => e.evidenceType);
  const evidence = evidenceWeightForSkill(evidenceTypes, config.weights);
  const deficit = importance * (1 - evidence);
  const priority = demand * deficit * config.roleRelevance;
  const mustHave =
    learnerEvidence.some((e) => e.requirementHint === "must_have") ||
    demandInputs.importances.some((i) => i >= 0.8);
  const claimedUnverified =
    surviving.length > 0 && surviving.every((e) => e.verificationStatus !== "verified");

  return {
    skillId: skill.id,
    name: skill.name,
    demand,
    importance,
    evidence,
    deficit,
    priority,
    mustHave,
    evidenceTypes,
    claimedUnverified,
  };
}

/** Rank gaps by priority, descending; returns the top `limit` (default 5). */
export function rankGaps(gaps: GapRow[], limit = 5): GapRow[] {
  return [...gaps].sort((a, b) => b.priority - a.priority).slice(0, limit);
}

/** A compact intervention descriptor fed to the recommender. */
export interface InterventionCandidate {
  id: string;
  title: string;
  skillIds: string[];
  durationHours: number;
  cost?: number;
  prerequisites: string[];
}

export interface RecommendationResult {
  skillId: string;
  interventionId: string;
  score: number;
  reasonCodes: string[];
  sourceJobIds: string[];
  breakdown: {
    skillCoverage: number;
    priorityGapReduction: number;
    evidenceStrength: number;
    prerequisiteFit: number;
    timeEfficiency: number;
    learnerPreferenceFit: number;
  };
}

export interface RecommendationInputs {
  /** The learner's ranked priority gaps that we are trying to close. */
  gaps: GapRow[];
  /** Source job ids backing the demand signal for a given skill. */
  sourceJobIdsBySkill: Record<string, string[]>;
  /** Learner's already-satisfied prerequisites (e.g. completed skill names/ids). */
  metPrerequisites: Set<string>;
  config: ScoringConfig;
}

/** Deterministic weights for the RecommendationScore blend (Pipeline D). */
export const RECOMMENDATION_WEIGHTS = {
  skillCoverage: 0.35,
  priorityGapReduction: 0.2,
  evidenceStrength: 0.15,
  prerequisiteFit: 0.1,
  timeEfficiency: 0.1,
  learnerPreferenceFit: 0.1,
} as const;

/**
 * Rank a set of interventions for one learner (Pipeline D). The LLM is never
 * consulted here; explanations are added later on top of these reason codes.
 */
export function rankInterventions(
  candidates: InterventionCandidate[],
  inputs: RecommendationInputs,
): RecommendationResult[] {
  const { gaps, config } = inputs;
  const gapsById = new Map(gaps.map((g) => [g.skillId, g]));
  const maxPriority = Math.max(1e-9, ...gaps.map((g) => g.priority));

  const results: RecommendationResult[] = [];

  for (const intervention of candidates) {
    const covered = intervention.skillIds.filter((id) => gapsById.has(id));
    if (covered.length === 0) continue;

    const coveredGaps = covered.map((id) => gapsById.get(id)!);

    // skill_coverage: fraction of this intervention's taught skills that are
    // actual learner gaps, blended with how many of the top gaps it touches.
    const precision = covered.length / Math.max(1, intervention.skillIds.length);
    const recall = covered.length / Math.max(1, gaps.length);
    const skillCoverage = 0.5 * precision + 0.5 * recall;

    // priority_gap_reduction: how much total learner priority this intervention can move.
    const reductionRaw = coveredGaps.reduce((sum, g) => sum + g.priority, 0);
    const priorityGapReduction = clamp01(reductionRaw / maxPriority);

    // evidence_strength: how weak the current evidence is for the covered gaps (room to grow).
    const avgEvidence = mean(coveredGaps.map((g) => g.evidence));
    const evidenceStrength = clamp01(1 - avgEvidence);

    // prerequisite_fit: 1 when every prerequisite is already met, else a fractional score.
    const unmet = intervention.prerequisites.filter((p) => !inputs.metPrerequisites.has(p));
    const prerequisiteFit =
      intervention.prerequisites.length === 0
        ? 1
        : clamp01(1 - unmet.length / intervention.prerequisites.length);

    // time_efficiency: shorter interventions score higher, in (0, 1].
    const timeEfficiency = clamp01(
      1 / (1 + intervention.durationHours / config.referenceDurationHours),
    );

    // learner_preference_fit: placeholder for language/cost/delivery-mode fit.
    const learnerPreferenceFit = 1;

    const score =
      RECOMMENDATION_WEIGHTS.skillCoverage * skillCoverage +
      RECOMMENDATION_WEIGHTS.priorityGapReduction * priorityGapReduction +
      RECOMMENDATION_WEIGHTS.evidenceStrength * evidenceStrength +
      RECOMMENDATION_WEIGHTS.prerequisiteFit * prerequisiteFit +
      RECOMMENDATION_WEIGHTS.timeEfficiency * timeEfficiency +
      RECOMMENDATION_WEIGHTS.learnerPreferenceFit * learnerPreferenceFit;

    const reasonCodes = deriveReasonCodes({
      coveredGaps,
      intervention,
      config,
      prerequisiteFit,
    });

    const sourceJobIds = unique(covered.flatMap((id) => inputs.sourceJobIdsBySkill[id] ?? []));

    results.push({
      skillId: coveredGaps.sort((a, b) => b.priority - a.priority)[0].skillId,
      interventionId: intervention.id,
      score: round4(score),
      reasonCodes,
      sourceJobIds,
      breakdown: {
        skillCoverage: round4(skillCoverage),
        priorityGapReduction: round4(priorityGapReduction),
        evidenceStrength: round4(evidenceStrength),
        prerequisiteFit: round4(prerequisiteFit),
        timeEfficiency: round4(timeEfficiency),
        learnerPreferenceFit: round4(learnerPreferenceFit),
      },
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

function deriveReasonCodes(args: {
  coveredGaps: GapRow[];
  intervention: InterventionCandidate;
  config: ScoringConfig;
  prerequisiteFit: number;
}): string[] {
  const codes = new Set<string>();
  const { coveredGaps, intervention, config } = args;

  if (coveredGaps.some((g) => g.demand >= config.highDemandThreshold)) {
    codes.add("HIGH_DEMAND");
  }
  if (coveredGaps.some((g) => g.mustHave && g.claimedUnverified)) {
    codes.add("UNVERIFIED_GAP");
  }
  if (coveredGaps.some((g) => g.mustHave && g.evidence === 0)) {
    codes.add("VERIFIED_GAP");
  }
  if (intervention.durationHours <= config.shortDurationHours) {
    codes.add("SHORT_DURATION");
  }
  if (args.prerequisiteFit === 1 && intervention.prerequisites.length > 0) {
    codes.add("PREREQUISITE_MATCH");
  }
  return Array.from(codes);
}

/* ---------- small numeric helpers ---------- */

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
