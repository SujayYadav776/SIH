import { PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Provenance affordance required on every AI-derived value: confidence, source,
 * date, and a correction action (skill: "no AI output without a visible source
 * and an edit action").
 */
export function ConfidencePill({
  confidence,
  source,
  date,
  onCorrect,
  className,
}: {
  confidence: number;
  source?: string;
  date?: string;
  onCorrect?: () => void;
  className?: string;
}) {
  const pct = Math.round(confidence * 100);
  const tone =
    pct >= 85 ? "text-evidence-verified" : pct >= 60 ? "text-evidence-assessed" : "text-evidence-claimed";
  const meta = [source, date].filter(Boolean).join(" · ");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-card px-2.5 py-1 text-xs",
        className,
      )}
    >
      <span className={cn("font-medium tabular-nums", tone)}>{pct}% conf</span>
      {meta && <span className="text-muted-foreground">{meta}</span>}
      {onCorrect && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-xs"
          onClick={onCorrect}
        >
          <PencilLine className="size-3" />
          Correct
        </Button>
      )}
    </span>
  );
}
