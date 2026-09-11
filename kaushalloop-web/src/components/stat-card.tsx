import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  delta,
  trend = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}) {
  const trendCls =
    trend === "up" ? "text-primary" : trend === "down" ? "text-destructive" : "text-muted-foreground";
  const Icon = trend === "down" ? ArrowDownRight : ArrowUpRight;
  const showBody = Boolean(sub) || delta != null;
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      {showBody && (
        <CardContent className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{sub}</span>
          {delta != null && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", trendCls)}>
              {trend !== "neutral" && <Icon className="size-3.5" />}
              {delta}
            </span>
          )}
        </CardContent>
      )}
    </Card>
  );
}
