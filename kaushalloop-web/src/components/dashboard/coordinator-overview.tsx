"use client";

import { useQuery } from "convex/react";
import { Database } from "lucide-react";

import { DemandChart } from "@/components/dashboard/demand-chart";
import { EmptyState } from "@/components/empty-state";
import { SectionShell } from "@/components/section-shell";
import { SkeletonTable } from "@/components/skeleton-table";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";

const FUNNEL_LABELS: Record<string, string> = {
  INTERVENTION_RECOMMENDED: "Recommendation",
  INTERVENTION_COMPLETED: "Intervention completed",
  ASSESSMENT_PASSED: "Assessment passed",
  APPLICATION_SUBMITTED: "Application",
  SHORTLISTED: "Shortlisted",
  INTERVIEWED: "Interviewed",
  OFFER_RECEIVED: "Offer",
  PLACED: "Placed",
};

const mean = (a: number[]) =>
  a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0;

export function CoordinatorOverview() {
  // Bootstrap: who am I -> which institution -> its first cohort.
  const user = useQuery(api.users.me);
  const institutionId = user?.institutionId;
  const cohorts = useQuery(
    api.cohorts.listForInstitution,
    institutionId ? { institutionId } : "skip",
  );
  const cohort = cohorts?.[0];
  const cohortId = cohort?._id;
  const occupationId = cohort?.targetRoleId;

  const demand = useQuery(
    api.occupations.getDemandSummary,
    occupationId ? { occupationId } : "skip",
  );
  const gaps = useQuery(
    api.analytics.cohortSkillGaps,
    cohortId ? { cohortId } : "skip",
  );
  const funnel = useQuery(
    api.analytics.outcomeFunnel,
    cohortId ? { cohortId } : "skip",
  );
  const learners = useQuery(
    api.learners.listByCohort,
    cohortId ? { cohortId } : "skip",
  );

  // --- loading ---
  const loadingHeader = (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <div className="h-7 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );

  if (user === undefined) return loadingHeader;

  if (!institutionId) {
    return (
      <EmptyState
        className="mx-auto my-12 max-w-md"
        icon={<Database className="size-6" />}
        title="No institution linked yet"
        description="This account is not attached to an institution. Create an institution and cohort to populate the dashboard."
      />
    );
  }

  if (cohorts === undefined) return loadingHeader;

  if (cohorts.length === 0) {
    return (
      <EmptyState
        className="mx-auto my-12 max-w-md"
        icon={<Database className="size-6" />}
        title="No cohorts yet"
        description="Create your first cohort (with a target role) to see demand, gaps and outcomes here."
      />
    );
  }

  const dataLoading = demand === undefined || gaps === undefined || funnel === undefined;
  if (dataLoading) return loadingHeader;

  const topSkills = (demand?.skills ?? []).slice(0, 6);
  const chartData = (demand?.skills ?? []).slice(0, 8).map((s) => ({ skill: s.name, demand: s.demandPercent }));
  const rankedGaps = [...(gaps ?? [])].sort((a, b) => b.gapPercent - a.gapPercent).slice(0, 8);
  const funnelRows = funnel ?? [];
  const funnelMax = Math.max(1, funnelRows[0]?.learners ?? 1);
  const placed = funnelRows.find((f) => f.stage === "PLACED")?.learners ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coordinator overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cohort?.name ?? "Cohort"} · {cohort?.geography ?? ""}
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <span className="size-1.5 rounded-full bg-muted-foreground" />
          Demo dataset
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Learners in cohort" value={learners?.length ?? "n/a"} sub={cohort?.name} />
        <StatCard label="Postings analysed" value={demand?.totalPostings ?? "n/a"} sub={`${cohort?.geography ?? ""} · this role`} />
        <StatCard
          label="Avg verified coverage"
          value={`${mean((gaps ?? []).map((g) => g.verifiedCoveragePercent))}%`}
          sub={`across ${(gaps ?? []).length} measured skills`}
        />
        <StatCard label="Placed (outcome)" value={placed} sub="in the funnel" />
      </div>

      <SectionShell title="Skill demand" description="Share of target postings requiring each skill">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <DemandChart data={chartData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Must-have vs preferred</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {topSkills.map((s) => (
                <div key={s.skillId} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{s.name}</span>
                    {s.mustHaveCount > 0 ? (
                      <Badge variant="default" className="px-1.5 py-0 text-[10px]">must</Badge>
                    ) : (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">pref</Badge>
                    )}
                  </div>
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">
                    {s.demandPercent}%
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </SectionShell>

      <SectionShell
        title="Cohort readiness by skill"
        description="Demand vs the share of learners with verified evidence. Keyword claims are not counted as proof."
      >
        <Card>
          <CardContent className="pt-6">
            {rankedGaps.length === 0 ? (
              <EmptyState title="No measured skills yet" description="Import job postings with recognised skills to compute gaps." />
            ) : (
              <div className="flex flex-col gap-3">
                {rankedGaps.map((g) => (
                  <div key={g.skillId} className="grid grid-cols-[1.4fr_1fr] items-center gap-3 sm:grid-cols-[1fr_repeat(2,1fr)]">
                    <span className="truncate text-sm font-medium">{g.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="w-24 text-xs text-muted-foreground">demand</span>
                      <Progress
                        value={g.demandPercent}
                        className="h-2"
                        aria-label={`${g.name} demand`}
                        aria-valuetext={`${g.demandPercent}% of target postings`}
                      />
                      <span className="w-9 text-right text-xs tabular-nums" aria-hidden="true">{g.demandPercent}%</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                      <span className="w-24 text-xs text-muted-foreground">verified</span>
                      <Progress
                        value={g.verifiedCoveragePercent}
                        className="h-2"
                        aria-label={`${g.name} verified coverage`}
                        aria-valuetext={`${g.verifiedCoveragePercent}% of learners with verified proof`}
                      />
                      <span className="w-9 text-right text-xs tabular-nums" aria-hidden="true">{g.verifiedCoveragePercent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </SectionShell>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Outcome funnel</CardTitle>
            <CardDescription>Cohort movement from recommendation to placement</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {funnelRows.map((f) => (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm">{FUNNEL_LABELS[f.stage] ?? f.stage}</span>
                <Progress
                  value={(f.learners / funnelMax) * 100}
                  className="h-2"
                  aria-label={`${FUNNEL_LABELS[f.stage] ?? f.stage} learners`}
                  aria-valuetext={`${f.learners} of ${funnelMax} learners at the entry stage`}
                />
                <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums" aria-hidden="true">{f.learners}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data & trust</CardTitle>
            <CardDescription>What the system reports about itself</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="Postings analysed" value={String(demand?.totalPostings ?? 0)} />
            <Row label="Skills measured" value={String((gaps ?? []).length)} />
            <Row label="Avg demand" value={`${mean((gaps ?? []).map((g) => g.demandPercent))}%`} />
            <Row label="Avg verified coverage" value={`${mean((gaps ?? []).map((g) => g.verifiedCoveragePercent))}%`} />
            <Row label="Learners in cohort" value={String(learners?.length ?? 0)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
