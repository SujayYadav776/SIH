/**
 * PURE synthetic-outcome generation + statistics.
 *
 * Deliberately free of any Convex / runtime imports so it can run in a plain
 * Node process (used by scripts/synth-check.mjs) AND inside a Convex function.
 * The generator is deterministic per trainee index, so batched seeds reproduce
 * the exact same rows. See the header in convex/synthetic.ts for the story.
 */

export const SYNTH_TOTAL = 800;

export type UrbanRural = "urban" | "semi_urban" | "rural";
export type CompletionStatus = "completed" | "dropped" | "ongoing";
export type PlacementStatus = "placed" | "unplaced" | "unknown";

export type SynthRow = {
  traineeId: string;
  scheme: string;
  trainingCenter: string;
  district: string;
  state: string;
  urbanRural: UrbanRural;
  trade: string;
  nsqfCode: string;
  nsqfLevel: number;
  completionStatus: CompletionStatus;
  placementStatus: PlacementStatus;
  daysToPlacement?: number;
  retained3Months: boolean;
  retained6Months: boolean;
  salaryBand?: string;
  cohortYear: number;
};

function rng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rand = () => number;
const chance = (r: Rand, p: number) => r() < p;
const pick = <T,>(r: Rand, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
const randInt = (r: Rand, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const STATE = "Maharashtra";
const SCHEMES = [
  "PMKVY 4.0",
  "MSSDS",
  "Skill India Digital",
  "RPL — Recognition of Prior Learning",
  "NSDC Sector Skills",
] as const;

const DISTRICTS: { name: string; type: UrbanRural }[] = [
  { name: "Nagpur", type: "urban" },
  { name: "Pune", type: "urban" },
  { name: "Mumbai Suburban", type: "urban" },
  { name: "Nashik", type: "semi_urban" },
  { name: "Chhatrapati Sambhajinagar", type: "semi_urban" },
  { name: "Solapur", type: "semi_urban" },
  { name: "Amravati", type: "semi_urban" },
  { name: "Nanded", type: "rural" },
  { name: "Gondia", type: "rural" },
  { name: "Yavatmal", type: "rural" },
];

const TRADES = [
  { trade: "Electrician", code: "DEO/5021", level: 5, demand: 0.75 },
  { trade: "Fitter", code: "DEO/5012", level: 5, demand: 0.62 },
  { trade: "Welder", code: "DEO/107", level: 4, demand: 0.6 },
  { trade: "Plumber", code: "DEO/703", level: 3, demand: 0.5 },
  { trade: "Solar PV Installer", code: "SOL/9021", level: 4, demand: 0.68 },
  { trade: "Retail Sales Associate", code: "SC/501", level: 3, demand: 0.56 },
  { trade: "Data Entry Operator", code: "IT/ITE/021", level: 3, demand: 0.52 },
  { trade: "Accounting Business Services Assistant", code: "BFS/301", level: 4, demand: 0.55 },
  { trade: "Home Health Care Associate", code: "HCS/601", level: 3, demand: 0.58 },
  { trade: "Mobile Service & Repair Technician", code: "ESC/502", level: 4, demand: 0.55 },
  { trade: "Beautician & Skin/Hair Care", code: "TD/6056", level: 4, demand: 0.3 }, // saturated
  { trade: "Organic Farming", code: "AGR/001", level: 4, demand: 0.45 },
  { trade: "Tailoring", code: "SCP/101", level: 3, demand: 0.42 }, // saturated-ish
];

const CENTER_KINDS = [
  "ITI",
  "Skill Development Centre",
  "Vocational Training Institute",
  "Panchayat Skill Hub",
  "Community Skilling Centre",
];

function salaryFrom(r: Rand, demand: number, urban: UrbanRural): string {
  const bump = (urban === "urban" ? 0.3 : urban === "semi_urban" ? 0.15 : 0) + (demand - 0.5);
  const roll = r() + bump;
  if (roll > 0.95) return "40k+";
  if (roll > 0.78) return "25-40k";
  if (roll > 0.4) return "15-25k";
  return "<15k";
}

type Base = Omit<SynthRow, "placementStatus" | "daysToPlacement" | "retained3Months" | "retained6Months" | "salaryBand">;

function finalize(
  r: Rand,
  base: Base,
  pPlacedAmongCompleted: number,
  ret3: number,
  ret6: number,
  daysLo: number,
  daysHi: number,
): SynthRow {
  const row: SynthRow = {
    ...base,
    placementStatus: "unknown",
    retained3Months: false,
    retained6Months: false,
  };
  if (base.completionStatus === "dropped") {
    row.placementStatus = "unplaced";
  } else if (base.completionStatus === "completed") {
    if (chance(r, pPlacedAmongCompleted)) {
      row.placementStatus = "placed";
      row.daysToPlacement = randInt(r, daysLo, daysHi);
      row.retained3Months = chance(r, ret3);
      row.retained6Months = row.retained3Months ? chance(r, ret6) : false;
      row.salaryBand = salaryFrom(r, base.nsqfLevel / 8, base.urbanRural);
    } else {
      row.placementStatus = "unplaced";
    }
  }
  return row;
}

// segment boundaries across [0, SYNTH_TOTAL)
const A_END = 120; // Electrician @ Nagpur, strong
const B_END = 220; // Beautician @ Yavatmal, saturated
const C_END = 330; // RPL certificate factory

export function generateRow(i: number): SynthRow {
  const r = rng(i * 7919 + 13);
  const cohortYear = pick(r, [2022, 2023, 2024]);
  const mkBase = (
    t: (typeof TRADES)[number],
    districtName: string,
    urban: UrbanRural,
    scheme: string,
    completionStatus: CompletionStatus,
  ): Base => ({
    traineeId: `SYN-${String(i).padStart(5, "0")}-${t.trade.slice(0, 3).toUpperCase()}`,
    scheme,
    trainingCenter: `${districtName} ${pick(r, CENTER_KINDS)}`,
    district: districtName,
    state: STATE,
    urbanRural: urban,
    trade: t.trade,
    nsqfCode: t.code,
    nsqfLevel: t.level,
    completionStatus,
    cohortYear,
  });

  // A — hero: Electrician @ Nagpur
  if (i < A_END) {
    const elec = TRADES[0];
    const completion: CompletionStatus = chance(r, 0.95) ? "completed" : "dropped";
    return finalize(r, mkBase(elec, "Nagpur", "urban", "PMKVY 4.0", completion), 0.84, 0.92, 0.86, 30, 75);
  }
  // B — struggling: Beautician @ Yavatmal (rural, oversaturated)
  if (i < B_END) {
    const beauty = TRADES.find((t) => t.trade.startsWith("Beautician"))!;
    const roll = r();
    const completion: CompletionStatus = roll < 0.68 ? "completed" : roll < 0.95 ? "dropped" : "ongoing";
    return finalize(r, mkBase(beauty, "Yavatmal", "rural", "PMKVY 4.0", completion), 0.26, 0.55, 0.42, 95, 170);
  }
  // C — certificate factory: RPL, near-universal completion, poor placement
  if (i < C_END) {
    const t = pick(r, TRADES);
    const d = pick(r, DISTRICTS);
    const completion: CompletionStatus = chance(r, 0.98) ? "completed" : "ongoing";
    return finalize(r, mkBase(t, d.name, d.type, "RPL — Recognition of Prior Learning", completion), 0.3, 0.46, 0.32, 120, 210);
  }
  // Background — realistic noise with mild geography/demand effects
  const t = pick(r, TRADES);
  const d = pick(r, DISTRICTS);
  const scheme = pick(r, SCHEMES);
  const geoAdj = d.type === "urban" ? 0.06 : d.type === "rural" ? -0.08 : 0;
  const completionRoll = clamp01(0.74 + geoAdj);
  const roll = r();
  const completion: CompletionStatus =
    roll < completionRoll ? "completed" : roll < completionRoll + 0.2 ? "dropped" : "ongoing";
  const pPlaced = clamp01(t.demand + (d.type === "urban" ? 0.12 : d.type === "rural" ? -0.14 : 0));
  return finalize(r, mkBase(t, d.name, d.type, scheme, completion), pPlaced, 0.66, 0.58, 45, 150);
}

export function seedBatchRows(start: number, count: number): SynthRow[] {
  const end = Math.min(start + count, SYNTH_TOTAL);
  const rows: SynthRow[] = [];
  for (let i = start; i < end; i++) rows.push(generateRow(i));
  return rows;
}

export function allRows(): SynthRow[] {
  return seedBatchRows(0, SYNTH_TOTAL);
}

export type Metrics = {
  total: number;
  completionRate: number;
  placementRate: number;
  dropoutRate: number;
  avgDaysToPlacement: number;
  retention3Rate: number;
  retention6Rate: number;
};

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function summarizeRows(rows: SynthRow[]): Metrics {
  const total = rows.length;
  const placed = rows.filter((r) => r.placementStatus === "placed").length;
  const dropped = rows.filter((r) => r.completionStatus === "dropped").length;
  const completed = rows.filter((r) => r.completionStatus === "completed").length;
  const days = rows.filter((r) => typeof r.daysToPlacement === "number").map((r) => r.daysToPlacement as number);
  const ret3 = rows.filter((r) => r.retained3Months).length;
  const ret6 = rows.filter((r) => r.retained6Months).length;
  return {
    total,
    completionRate: total ? completed / total : 0,
    placementRate: total ? placed / total : 0,
    dropoutRate: total ? dropped / total : 0,
    avgDaysToPlacement: Math.round(mean(days)),
    retention3Rate: placed ? ret3 / placed : 0,
    retention6Rate: placed ? ret6 / placed : 0,
  };
}
