/**
 * The one sanctioned multi-hue semantic colour scale: learner evidence tiers.
 *
 * The app's single-accent lock (deep blue) applies to chrome and actions, not to
 * data that encodes trust level. These classes are written as literal strings so
 * Tailwind v4's JIT can detect them (never build `bg-${token}` dynamically).
 */

export const EVIDENCE_TIERS = [
  "inferred",
  "claimed",
  "assessed",
  "project_proven",
  "verified_external",
] as const;

export type EvidenceTier = (typeof EVIDENCE_TIERS)[number];

export interface EvidenceTone {
  label: string;
  text: string;
  soft: string;
  dot: string;
}

const TONE: Record<EvidenceTier, EvidenceTone> = {
  inferred: {
    label: "Inferred",
    text: "text-evidence-inferred",
    soft: "bg-evidence-inferred/15",
    dot: "bg-evidence-inferred",
  },
  claimed: {
    label: "Claimed",
    text: "text-evidence-claimed",
    soft: "bg-evidence-claimed/15",
    dot: "bg-evidence-claimed",
  },
  assessed: {
    label: "Assessed",
    text: "text-evidence-assessed",
    soft: "bg-evidence-assessed/15",
    dot: "bg-evidence-assessed",
  },
  project_proven: {
    label: "Project-proven",
    text: "text-evidence-project-proven",
    soft: "bg-evidence-project-proven/15",
    dot: "bg-evidence-project-proven",
  },
  verified_external: {
    label: "Verified",
    text: "text-evidence-verified",
    soft: "bg-evidence-verified/15",
    dot: "bg-evidence-verified",
  },
};

const FALLBACK: EvidenceTone = {
  label: "Unverified",
  text: "text-muted-foreground",
  soft: "bg-muted",
  dot: "bg-muted-foreground",
};

export function evidenceTone(tier: string): EvidenceTone {
  return (TONE as Record<string, EvidenceTone>)[tier] ?? FALLBACK;
}
