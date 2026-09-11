/**
 * Pure skill-normalisation helpers.
 *
 * The plan's resolution order (§6 Pipeline A steps 5-8, §Phase 4) is:
 *   1. exact canonical name
 *   2. approved alias
 *   3. fuzzy string match
 *   4. vector similarity   (extension point — Qdrant, not in Convex)
 *   5. LLM adjudication     (extension point — AI worker, only for ambiguous spans)
 *
 * Steps 1-3 are deterministic and live here as pure functions over plain strings.
 * Steps 4-5 are intentionally left to the caller: when `pickCanonicalMatch`
 * returns `null`, skills.ts records the span as unresolved/low-confidence so a
 * coordinator can review it (or, later, a vector/LLM pass can fill it in).
 */

/** Lowercase, strip punctuation, collapse whitespace — a stable comparison key. */
export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#.\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalise away the "sql server" vs "sql" style noise: remove common suffix words. */
const STOP_TOKENS = new Set([
  "skill",
  "skills",
  "with",
  "and",
  "the",
  "a",
  "an",
  "experience",
  "knowledge",
  "of",
]);

export function canonicalKey(input: string): string {
  const normalized = normalizeName(input);
  const tokens = normalized.split(" ").filter((token) => token && !STOP_TOKENS.has(token));
  return tokens.join(" ");
}

/** Levenshtein distance between two strings (bounded; inputs here are short). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;

  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Similarity in [0, 1] derived from edit distance, 1 meaning identical. */
export function similarity(a: string, b: string): number {
  const left = canonicalKey(a);
  const right = canonicalKey(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const distance = levenshtein(left, right);
  const longest = Math.max(left.length, right.length);
  return clamp01(1 - distance / longest);
}

export interface SkillCandidate {
  skillId: string;
  canonicalName: string;
  aliases: string[];
}

export type ResolutionMethod = "exact" | "alias" | "fuzzy" | "unresolved";

export interface ResolutionResult {
  skillId: string | null;
  canonicalName: string | null;
  method: ResolutionMethod;
  confidence: number;
  /** The matched surface string (alias or canonical), for provenance display. */
  matchedOn: string | null;
}

/** Minimum fuzzy similarity required to auto-accept a fuzzy match. */
export const FUZZY_ACCEPT_THRESHOLD = 0.82;
/** Below this, a match is considered ambiguous and should go to vector/LLM/review. */
export const FUZZY_REVIEW_THRESHOLD = 0.6;

/**
 * Resolve one surface form against the catalogue using the deterministic steps.
 * Returns `null` skillId when nothing clears the fuzzy threshold so the caller
 * can record it for review instead of guessing.
 */
export function pickCanonicalMatch(
  surfaceForm: string,
  candidates: SkillCandidate[],
): ResolutionResult {
  const target = canonicalKey(surfaceForm);
  if (!target) {
    return { skillId: null, canonicalName: null, method: "unresolved", confidence: 0, matchedOn: null };
  }

  // 1. exact canonical name
  for (const candidate of candidates) {
    if (canonicalKey(candidate.canonicalName) === target) {
      return {
        skillId: candidate.skillId,
        canonicalName: candidate.canonicalName,
        method: "exact",
        confidence: 1,
        matchedOn: candidate.canonicalName,
      };
    }
  }

  // 2. approved alias
  for (const candidate of candidates) {
    for (const alias of candidate.aliases) {
      if (canonicalKey(alias) === target) {
        return {
          skillId: candidate.skillId,
          canonicalName: candidate.canonicalName,
          method: "alias",
          confidence: 0.97,
          matchedOn: alias,
        };
      }
    }
  }

  // 3. fuzzy match over canonical names and aliases
  let best: { candidate: SkillCandidate; score: number; matchedOn: string } | null = null;
  for (const candidate of candidates) {
    const names = [candidate.canonicalName, ...candidate.aliases];
    for (const name of names) {
      const score = similarity(surfaceForm, name);
      if (!best || score > best.score) {
        best = { candidate, score, matchedOn: name };
      }
    }
  }

  if (best && best.score >= FUZZY_ACCEPT_THRESHOLD) {
    return {
      skillId: best.candidate.skillId,
      canonicalName: best.candidate.canonicalName,
      method: "fuzzy",
      confidence: Math.round(best.score * 100) / 100,
      matchedOn: best.matchedOn,
    };
  }

  // 4 & 5. vector / LLM extension points — caller decides whether to review.
  return { skillId: null, canonicalName: null, method: "unresolved", confidence: 0, matchedOn: null };
}

/** SHA-256 style content hash helper is provided by the AI service; this is a lightweight text fingerprint for de-dup of short spans. */
export function fingerprint(text: string): string {
  const normalized = normalizeName(text);
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) + hash) ^ normalized.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
