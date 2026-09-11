"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const WEIGHT_KEYS = [
  "missing", "inferred", "claimed", "assessed", "project_proven", "verified_external",
] as const;

export default function SettingsPage() {
  const config = useQuery(api.settings.get);
  const update = useMutation(api.settings.updateWeights);
  const [weights, setWeights] = useState<Record<string, number> | null>(null);
  const [roleRelevance, setRoleRelevance] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (config && !weights) {
      setWeights({ ...config.weights });
      setRoleRelevance(config.roleRelevance);
    }
  }, [config, weights]);

  if (!config || !weights) return <Skeleton className="mx-auto my-12 h-64 w-full max-w-2xl" />;

  const { highDemandThreshold, shortDurationHours, referenceDurationHours } = config;

  async function save() {
    setBusy(true);
    try {
      await update({
        weights: weights as any,
        roleRelevance,
        tuning: { highDemandThreshold, shortDurationHours, referenceDurationHours },
      });
      toast.success("Scoring weights saved");
    } catch {
      toast.error("Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scoring settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tune the deterministic gap model. These are product parameters, not scientific truth.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Evidence weights</CardTitle><CardDescription>0 = no proof, 1 = fully verified. Used to compute deficit per skill.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {WEIGHT_KEYS.map((k) => (
            <div key={k} className="flex flex-col gap-1.5">
              <Label htmlFor={k} className="capitalize">{k.replace(/_/g, " ")}</Label>
              <Input
                id={k}
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={weights[k]}
                onChange={(e) => setWeights((w) => ({ ...w!, [k]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Role relevance</CardTitle><CardDescription>Global multiplier applied to every skill's priority (0-1+).</CardDescription></CardHeader>
        <CardContent>
          <Label htmlFor="rr">roleRelevance</Label>
          <Input id="rr" type="number" step={0.05} min={0} max={2} value={roleRelevance} onChange={(e) => setRoleRelevance(Number(e.target.value))} className="mt-1.5 max-w-40" />
        </CardContent>
      </Card>

      <div>
        <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save weights"}</Button>
      </div>
    </div>
  );
}
