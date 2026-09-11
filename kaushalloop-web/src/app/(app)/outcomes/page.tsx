"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Download } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { SectionShell } from "@/components/section-shell";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCohortContext } from "@/hooks/use-cohort-context";
import { api, type Id } from "@/lib/api";

const STAGE_LABELS: Record<string, string> = {
  INTERVENTION_RECOMMENDED: "Recommendation",
  INTERVENTION_COMPLETED: "Intervention completed",
  ASSESSMENT_PASSED: "Assessment passed",
  APPLICATION_SUBMITTED: "Application",
  SHORTLISTED: "Shortlisted",
  INTERVIEWED: "Interviewed",
  OFFER_RECEIVED: "Offer",
  PLACED: "Placed",
};

const label = (s: string | null) => (s ? STAGE_LABELS[s] ?? s : "n/a");
const day = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : "n/a");

export default function OutcomesPage() {
  const { cohort, cohorts, cohortId } = useCohortContext();
  const funnel = useQuery(api.analytics.outcomeFunnel, cohortId ? { cohortId } : "skip");
  const outcomes = useQuery(api.analytics.cohortOutcomes, cohortId ? { cohortId } : "skip");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = (outcomes ?? []).find((o) => o.learnerId === selectedId) ?? outcomes?.[0] ?? null;
  const timeline = useQuery(
    api.outcomes.listForLearner,
    selected ? { learnerId: selected.learnerId as Id<"learners"> } : "skip",
  );

  if (cohorts === undefined) return <Skeleton className="mx-auto my-12 h-64 w-full max-w-7xl" />;
  if (cohorts.length === 0) {
    return <EmptyState className="mx-auto my-12 max-w-md" title="No cohort yet" description="Add a cohort to track outcomes." />;
  }
  if (!funnel || !outcomes) return <Skeleton className="mx-auto my-12 h-64 w-full max-w-7xl" />;

  const recommended = funnel.find((f) => f.stage === "INTERVENTION_RECOMMENDED")?.learners ?? 0;
  const placed = funnel.find((f) => f.stage === "PLACED")?.learners ?? 0;
  const conversion = recommended ? Math.round((placed / recommended) * 100) : 0;
  const funnelMax = Math.max(1, funnel[0]?.learners ?? 1);

  function exportCsv() {
    const rows = [["Learner", "Furthest stage", "Stages reached", "Events", "Last event date"]];
    for (const o of outcomes ?? []) {
      rows.push([
        o.learnerName,
        label(o.furthest),
        o.reached.map(label).join(" > "),
        String(o.eventCount),
        day(o.lastEventDate),
      ]);
    }
    const csv = rows
      .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `kaushalloop-outcomes-${cohort?.name?.toLowerCase().replace(/\W+/g, "-") ?? "cohort"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Outcomes</h1>
        <p className="mt-1 text-sm text-muted-foreground">{cohort?.name} · cohort movement through the funnel</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Recommended" value={recommended} sub="intervention issued" />
        <StatCard label="Placed" value={placed} sub="outcome events" />
        <StatCard label="Recommended → placed" value={`${conversion}%`} sub="demo funnel conversion" />
      </div>

      <SectionShell title="Outcome funnel" description="Synthetic demo events across the cohort">
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            {funnel.map((f) => (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-sm">{label(f.stage)}</span>
                <Progress
                  value={(f.learners / funnelMax) * 100}
                  className="h-2"
                  aria-label={`${label(f.stage)} learners`}
                  aria-valuetext={`${f.learners} of ${funnelMax} learners at the entry stage`}
                />
                <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums" aria-hidden="true">{f.learners}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </SectionShell>

      <SectionShell
        title="Learner outcomes"
        description="Furthest stage reached per learner"
        actions={
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              {outcomes.length === 0 ? (
                <EmptyState className="border-0" title="No learners yet" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Learner</TableHead>
                      <TableHead>Furthest</TableHead>
                      <TableHead className="text-right">Events</TableHead>
                      <TableHead className="text-right">Last</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outcomes.slice(0, 25).map((o) => (
                      <TableRow
                        key={o.learnerId}
                        onClick={() => setSelectedId(o.learnerId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedId(o.learnerId);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`Show ${o.learnerName} timeline`}
                        aria-current={selected?.learnerId === o.learnerId ? "true" : undefined}
                        className={
                          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 " +
                          (selected?.learnerId === o.learnerId ? "bg-accent" : "")
                        }
                      >
                        <TableCell className="font-medium">{o.learnerName}</TableCell>
                        <TableCell>
                          {o.furthest === "PLACED" ? (
                            <Badge variant="default" className="text-[10px]">Placed</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">{label(o.furthest)}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{o.eventCount}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{day(o.lastEventDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selected?.learnerName ?? "Select a learner"}</CardTitle>
              <CardDescription>Outcome timeline</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {!selected ? (
                <p className="text-sm text-muted-foreground">Pick a learner to see their events.</p>
              ) : !timeline ? (
                <Skeleton className="h-6 w-full" />
              ) : timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">No outcome events.</p>
              ) : (
                timeline.map((ev) => (
                  <div key={ev._id} className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 text-sm last:border-0">
                    <div className="flex items-center gap-2">
                      <span>{label(ev.eventType)}</span>
                      {ev.verified && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">verified</Badge>}
                    </div>
                    <span className="tabular-nums text-muted-foreground">{day(ev.eventDate)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </SectionShell>
    </div>
  );
}
