"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Users } from "lucide-react";

import { ConfidencePill } from "@/components/confidence-pill";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useCohortContext } from "@/hooks/use-cohort-context";
import { api, type Id } from "@/lib/api";

export default function LearnersPage() {
  const { cohort, cohorts, cohortId } = useCohortContext();
  const learners = useQuery(api.learners.listByCohort, cohortId ? { cohortId } : "skip");
  const readiness = useQuery(api.analytics.readiness, cohortId ? { cohortId } : "skip");
  const skills = useQuery(api.skills.list, {});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const roster = (learners ?? []).map((l) => {
    const r = readiness?.find((x) => x.learnerId === l._id);
    return {
      id: l._id as string,
      name: l.name,
      verified: r?.verifiedEvidenceCount ?? 0,
      total: r?.evidenceCount ?? 0,
    };
  });

  const selected = roster.find((x) => x.id === selectedId) ?? roster[0] ?? null;

  const gaps = useQuery(
    api.gaps.listForLearner,
    selected ? { learnerId: selected.id as Id<"learners"> } : "skip",
  );
  const evidence = useQuery(
    api.learners.listEvidence,
    selected ? { learnerId: selected.id as Id<"learners"> } : "skip",
  );
  const recs = useQuery(
    api.recommendations.listForLearner,
    selected ? { learnerId: selected.id as Id<"learners"> } : "skip",
  );
  const skillName = (id: string) => skills?.find((s) => s._id === id)?.canonicalName ?? "n/a";

  if (cohorts === undefined) return <Skeleton className="mx-auto my-12 h-64 w-full max-w-7xl" />;
  if (cohorts.length === 0) {
    return <EmptyState className="mx-auto my-12 max-w-md" title="No cohort yet" description="Add a cohort to see its learners." />;
  }
  if (learners === undefined || readiness === undefined) {
    return <Skeleton className="mx-auto my-12 h-64 w-full max-w-7xl" />;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learners</h1>
        <p className="mt-1 text-sm text-muted-foreground">{cohort?.name} · {roster.length} learners</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Roster */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" />Roster</CardTitle>
            <CardDescription>Verified / total evidence per learner</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto p-2">
            {roster.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedId(l.id)}
                className={
                  "mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent " +
                  (selected?.id === l.id ? "bg-accent" : "")
                }
              >
                <span className="truncate font-medium">{l.name}</span>
                <span className="tabular-nums text-muted-foreground">{l.verified}/{l.total}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Drill-down */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {!selected ? (
            <EmptyState title="No learner selected" />
          ) : (
            <>
              <SectionShell title={selected.name} description="Top priority gaps (deterministic)">
                <Card>
                  <CardContent className="flex flex-col gap-2 pt-6">
                    {gaps ? (
                      gaps.top.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No gaps measured for this learner.</p>
                      ) : (
                        gaps.top.map((g) => (
                          <div key={g.skillId} className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{g.name}</span>
                              {g.claimedUnverified && (
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">claimed · unverified</Badge>
                              )}
                            </div>
                            <span className="tabular-nums text-muted-foreground">
                              demand {Math.round(g.demand * 100)}% · priority {g.priority.toFixed(2)}
                            </span>
                          </div>
                        ))
                      )
                    ) : (
                      <Skeleton className="h-6 w-full" />
                    )}
                  </CardContent>
                </Card>
              </SectionShell>

              <SectionShell title="Evidence" description="Confirmed skill evidence with provenance">
                <Card>
                  <CardContent className="flex flex-col gap-2 pt-6">
                    {evidence ? (
                      evidence.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No evidence captured yet.</p>
                      ) : (
                        evidence.map((e) => (
                          <div key={e._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 text-sm last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{skillName(e.skillId)}</span>
                              <EvidenceBadge tier={e.evidenceType} />
                              {e.verificationStatus === "verified" && (
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">verified</Badge>
                              )}
                            </div>
                            <ConfidencePill confidence={e.confidence} source={e.sourceType} />
                          </div>
                        ))
                      )
                    ) : (
                      <Skeleton className="h-6 w-full" />
                    )}
                  </CardContent>
                </Card>
              </SectionShell>

              <SectionShell title="Recommendations" description="Interventions ranked for this learner">
                <Card>
                  <CardContent className="flex flex-col gap-2 pt-6">
                    {recs ? (
                      recs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No recommendations yet (run the planner).</p>
                      ) : (
                        recs.map((r) => (
                          <div key={r._id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{r.intervention?.title ?? "Intervention"}</span>
                              <span className="text-muted-foreground">→ {r.skill?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {(r.reasonCodes ?? []).slice(0, 3).map((rc) => (
                                <Badge key={rc} variant="outline" className="px-1.5 py-0 text-[10px]">{rc}</Badge>
                              ))}
                              <span className="tabular-nums text-muted-foreground">{r.score.toFixed(2)}</span>
                            </div>
                          </div>
                        ))
                      )
                    ) : (
                      <Skeleton className="h-6 w-full" />
                    )}
                  </CardContent>
                </Card>
              </SectionShell>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
