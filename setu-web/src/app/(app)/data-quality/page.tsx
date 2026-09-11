"use client";

import { useQuery } from "convex/react";
import { ShieldAlert } from "lucide-react";

import { ConfidencePill } from "@/components/confidence-pill";
import { EmptyState } from "@/components/empty-state";
import { SectionShell } from "@/components/section-shell";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCohortContext } from "@/hooks/use-cohort-context";
import { api } from "@/lib/api";

export default function DataQualityPage() {
  const { cohort, cohorts, cohortId } = useCohortContext();
  const queue = useQuery(api.analytics.reviewQueue, cohortId ? { cohortId } : "skip");

  if (cohorts === undefined) return <Skeleton className="mx-auto my-12 h-64 w-full max-w-7xl" />;
  if (cohorts.length === 0) {
    return <EmptyState className="mx-auto my-12 max-w-md" title="No cohort yet" description="Add a cohort to monitor its data quality." />;
  }
  if (!queue) return <Skeleton className="mx-auto my-12 h-64 w-full max-w-7xl" />;

  const nothingToReview =
    queue.pending === 0 && queue.failed === 0 && queue.unresolvedRuns === 0 && queue.lowConfidenceCount === 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data quality</h1>
        <p className="mt-1 text-sm text-muted-foreground">{cohort?.name} · what the system flags for review</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Runs in progress" value={queue.pending} sub="queued / processing" trend={queue.pending > 0 ? "neutral" : "neutral"} />
        <StatCard label="Failed runs" value={queue.failed} sub="needs retry" trend={queue.failed > 0 ? "down" : "neutral"} />
        <StatCard label="Unresolved spans" value={queue.unresolvedRuns} sub="AI runs with unmatched skills" />
        <StatCard label="Low-confidence evidence" value={queue.lowConfidenceCount} sub={`of ${queue.totalEvidence} rows`} trend={queue.lowConfidenceCount > 0 ? "down" : "neutral"} />
      </div>

      {nothingToReview ? (
        <EmptyState
          icon={<ShieldAlert className="size-6" />}
          title="Review queue is clear"
          description="No pending runs, failures, or low-confidence extractions right now."
        />
      ) : (
        <SectionShell title="Low-confidence evidence" description="Unverified rows below 0.5 confidence. Confirm or reject them before they influence gaps.">
          <Card>
            <CardHeader>
              <CardTitle>Needs a human decision</CardTitle>
              <CardDescription>Showing up to {queue.items.length} rows, lowest confidence first</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {queue.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No low-confidence rows; check pipeline runs above.</p>
              ) : (
                queue.items.map((it) => (
                  <div key={it.evidenceId} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 text-sm last:border-0">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {it.learnerName} <span className="text-muted-foreground">· {it.skillName}</span>
                      </div>
                      <p className="truncate text-muted-foreground">“{it.evidenceText}”</p>
                    </div>
                    <ConfidencePill confidence={it.confidence} source={it.sourceType} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </SectionShell>
      )}
    </div>
  );
}
