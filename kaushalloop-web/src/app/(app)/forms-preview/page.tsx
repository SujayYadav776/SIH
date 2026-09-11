import { Inbox } from "lucide-react";

import { ConfidencePill } from "@/components/confidence-pill";
import { EmptyState } from "@/components/empty-state";
import { EvidenceBadge } from "@/components/evidence-badge";
import { ReviewDecisionForm } from "@/components/forms/review-decision-form";
import { SkeletonTable } from "@/components/skeleton-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EVIDENCE_TIERS } from "@/lib/evidence";

export default function FormsPreview() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Foundation preview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal page verifying Phase 1 primitives (theme, evidence scale, form). Not in the nav.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evidence tier scale</CardTitle>
          <CardDescription>Semantic trust colours, legible in both modes</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {EVIDENCE_TIERS.map((t) => (
            <EvidenceBadge key={t} tier={t} />
          ))}
          <EvidenceBadge tier="unknown_falls_back" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provenance pill</CardTitle>
          <CardDescription>Confidence, source, date, correction action</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ConfidencePill confidence={0.93} source="gpt-5-mini" date="2026-08-12" />
          <ConfidencePill confidence={0.42} source="alias match" date="2026-08-12" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Canonical form</CardTitle>
          <CardDescription>zod + react-hook-form, inline per-field errors</CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewDecisionForm learnerSkill="SQL joins" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Loading</CardTitle>
          </CardHeader>
          <CardContent>
            <SkeletonTable rows={4} cols={3} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Empty</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<Inbox className="size-6" />}
              title="No records need review"
              description="Low-confidence extractions will queue here."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
