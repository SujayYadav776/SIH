import { evidenceTone } from "@/lib/evidence";
import { cn } from "@/lib/utils";

export function EvidenceBadge({
  tier,
  className,
}: {
  tier: string;
  className?: string;
}) {
  const t = evidenceTone(tier);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        t.soft,
        t.text,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", t.dot)} />
      {t.label}
    </span>
  );
}
