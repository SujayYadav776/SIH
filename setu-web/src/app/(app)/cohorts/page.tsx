"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { EvidenceBadge } from "@/components/evidence-badge";
import { SectionShell } from "@/components/section-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCohortContext } from "@/hooks/use-cohort-context";
import { api } from "@/lib/api";

function cellColor(pct: number) {
  // Cap the tint so the fixed foreground text always clears AA contrast in both themes.
  const capped = Math.round(Math.max(4, Math.round(pct)) * 0.8);
  return `color-mix(in oklab, var(--primary) ${capped}%, var(--muted))`;
}

export default function CohortsPage() {
  const { cohort, cohorts, cohortId } = useCohortContext();
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);

  const matrix = useQuery(
    api.analytics.cohortEvidenceMatrix,
    cohortId ? { cohortId } : "skip",
  );
  const interventions = useQuery(api.interventions.list, {});

  const gapSkills = matrix?.rows ?? [];
  const learners = matrix?.learners ?? 0;

  const skillMeta = useMemo(() => {
    const map = new Map<string, { name: string; demand: number; assessed: number; lacking: number }>();
    for (const row of gapSkills) {
      const assessed = row.tiers.find((t) => t.tier === "assessed")?.percent ?? 0;
      map.set(row.skillId, {
        name: row.name,
        demand: row.demandPercent,
        assessed,
        lacking: Math.round((learners * (100 - assessed)) / 100),
      });
    }
    return map;
  }, [matrix, learners]);

  // Interventions that cover at least one demanded skill.
  const candidates = useMemo(() => {
    if (!interventions) return [];
    return interventions.filter((iv) => iv.skillIds.some((id) => skillMeta.has(id as string)));
  }, [interventions, skillMeta]);

  const selected =
    candidates.find((iv) => iv._id === selectedInterventionId) ?? candidates[0] ?? null;

  const covered = useMemo(() => {
    if (!selected) return [];
    return selected.skillIds
      .map((id) => skillMeta.get(id as string))
      .filter(Boolean)
      .map((m) => m!);
  }, [selected, skillMeta]);

  const projected = covered.reduce((s, c) => s + c.lacking, 0);

  // --- loading / empty ---
  if (cohorts === undefined) return <Skeleton className="mx-auto my-12 h-64 w-full max-w-7xl" />;
  if (cohorts.length === 0) {
    return (
      <EmptyState
        className="mx-auto my-12 max-w-md"
        title="No cohort yet"
        description="Create a cohort to view its demand-vs-evidence heatmap and plan interventions."
      />
    );
  }
  if (!matrix || !interventions) return <Skeleton className="mx-auto my-12 h-64 w-full max-w-7xl" />;

  const tiers = matrix.tiers;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{cohort?.name ?? "Cohort"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {learners} learners · {gapSkills.length} demanded skills · {cohort?.geography}
        </p>
      </div>

      <SectionShell
        title="Evidence heatmap"
        description="Share of the cohort holding at least each evidence level, per demanded skill. Demand is shown for contrast."
      >
        <Card>
          <CardContent className="overflow-x-auto pt-6" tabIndex={0} aria-label="Evidence heatmap, scrollable table">
            <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
              <caption className="sr-only">
                Share of the {learners}-learner cohort holding at least each evidence level, per demanded skill. Rows are skills. Columns are demand, then the five evidence tiers.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="w-[140px] px-2 pb-1 text-left text-[11px] font-medium text-muted-foreground">
                    Skill
                  </th>
                  <th scope="col" className="w-[70px] px-2 pb-1 text-center text-[11px] font-medium text-muted-foreground">
                    demand
                  </th>
                  {tiers.map((t) => (
                    <th key={t} scope="col" className="px-1 pb-1 text-center align-middle font-medium">
                      <EvidenceBadge tier={t} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gapSkills.map((row) => (
                  <tr key={row.skillId}>
                    <th scope="row" className="py-1 pr-2 text-left font-medium">{row.name}</th>
                    <td className="py-1 text-center text-xs tabular-nums text-muted-foreground">
                      {row.demandPercent}%
                    </td>
                    {row.tiers.map((cell) => (
                      <td key={cell.tier} className="p-0">
                        <div
                          className="flex h-9 items-center justify-center rounded-md text-[11px] font-medium tabular-nums"
                          style={{ backgroundColor: cellColor(cell.percent) }}
                        >
                          {cell.percent}%
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </SectionShell>

      <SectionShell
        title="Intervention planner"
        description="Pick an intervention to preview the cohort gaps it addresses. Counts are projected, per skill, and not a placement-impact claim."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Choose intervention</CardTitle>
              <CardDescription>{candidates.length} programmes address current gaps</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Intervention</Label>
                <Select
                  value={selected?._id ?? undefined}
                  onValueChange={setSelectedInterventionId}
                  disabled={candidates.length === 0}
                >
                  <SelectTrigger aria-label="Choose intervention"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {candidates.map((iv) => (
                      <SelectItem key={iv._id} value={iv._id}>{iv.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selected && (
                <div className="text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{selected.type}</Badge>
                    <span className="tabular-nums">{selected.durationHours}h</span>
                    {selected.provider && <span className="truncate">· {selected.provider}</span>}
                  </div>
                  <p className="mt-2 text-muted-foreground">{selected.description}</p>
                </div>
              )}
              {candidates.length === 0 && (
                <p className="text-sm text-muted-foreground">No interventions match current gaps.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Projected coverage
                <Badge variant="secondary" className="ml-1 text-[10px]">projected</Badge>
              </CardTitle>
              <CardDescription>
                Estimated learners lacking verified proof, per covered skill (not deduplicated across skills).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {selected ? (
                <>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Skill</span>
                    <span className="text-right text-muted-foreground">Demand</span>
                    <span className="text-right text-muted-foreground">Verified</span>
                    <span className="text-right text-muted-foreground">Gaps</span>
                    {covered.map((c) => (
                      <SkillRow key={c.name} c={c} />
                    ))}
                  </div>
                  <div className="mt-1 flex items-baseline justify-between border-t pt-3 text-sm">
                    <span className="text-muted-foreground">Projected skill-gaps addressed</span>
                    <span className="text-lg font-semibold tabular-nums">{projected}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select an intervention to preview impact.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </SectionShell>
    </div>
  );
}

function SkillRow({ c }: { c: { name: string; demand: number; assessed: number; lacking: number } }) {
  return (
    <>
      <span className="py-1 font-medium">{c.name}</span>
      <span className="text-right tabular-nums">{c.demand}%</span>
      <span className="text-right tabular-nums">{c.assessed}%</span>
      <span className="text-right tabular-nums text-primary">~{c.lacking}</span>
    </>
  );
}
