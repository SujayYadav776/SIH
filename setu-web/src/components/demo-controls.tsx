"use client";

import { useMutation, useQuery } from "convex/react";
import { FlaskConical, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

/**
 * Demo control: reset + reseed the synthetic dataset so a pitch can restart from a
 * known state, or load the "worked-through" scenario for a short demo. Shown only to
 * institution staff (coordinator/admin); the mutations are also guarded server-side.
 */
export function DemoControls() {
  const user = useQuery(api.users.me);
  const reset = useMutation(api.seed.resetDemo);
  const loadScenario = useMutation(api.seed.loadDemoScenario);

  const canReset = user && (user.role === "coordinator" || user.role === "admin");
  if (!canReset) return null;

  async function run() {
    if (!window.confirm("Reset the demo dataset? This clears and reseeds all demo data.")) return;
    try {
      await reset({ confirmation: "SETU_DEMO_RESET" });
      // full reload: reseeding changes every document id; cached stale ids would 403
      window.location.reload();
    } catch {
      toast.error("Reset failed");
    }
  }

  async function scenario() {
    if (!window.confirm("Load the worked-through demo scenario? This reseeds, then applies the mid-story state.")) return;
    try {
      // two mutations on purpose: the seed alone is near the operation limit
      await reset({ confirmation: "SETU_DEMO_RESET" });
      await loadScenario({ confirmation: "SETU_DEMO_RESET" });
      window.location.reload();
    } catch {
      toast.error("Scenario load failed");
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={scenario} aria-label="Load demo scenario" title="Load worked-through demo scenario">
        <FlaskConical className="size-4" />
        <span className="hidden md:inline">Scenario</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={run} aria-label="Reset demo data" title="Reset demo data">
        <RotateCcw className="size-4" />
        <span className="hidden md:inline">Reset demo</span>
      </Button>
    </>
  );
}
