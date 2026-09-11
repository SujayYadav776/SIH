import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  const colTemplate = `repeat(${cols}, minmax(0, 1fr))`;
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <div className="grid gap-2" style={{ gridTemplateColumns: colTemplate }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-2" style={{ gridTemplateColumns: colTemplate }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-8" />
          ))}
        </div>
      ))}
    </div>
  );
}
