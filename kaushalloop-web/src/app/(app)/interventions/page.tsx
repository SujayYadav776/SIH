"use client";

import { useQuery } from "convex/react";
import { Clock, GraduationCap } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function InterventionsPage() {
  const interventions = useQuery(api.interventions.list);
  const skills = useQuery(api.skills.list, {});
  const name = (id: string) => skills?.find((s) => s._id === id)?.canonicalName ?? id;

  if (!interventions || !skills) return <Skeleton className="mx-auto my-12 h-64 w-full max-w-6xl" />;
  if (interventions.length === 0) return <EmptyState className="mx-auto my-12 max-w-md" title="No interventions yet" />;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Interventions</h1>
      <p className="mt-1 text-sm text-muted-foreground">Programmes available to close learner gaps</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {interventions.map((iv) => (
          <Card key={iv._id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GraduationCap className="size-4 text-muted-foreground" />{iv.title}</CardTitle>
              <CardDescription>{iv.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {iv.skillIds.map((id) => (
                  <Badge key={id} variant="secondary" className="text-[10px]">{name(id)}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{iv.durationHours}h</span>
                <Badge variant="outline" className="text-[10px]">{iv.type}</Badge>
                {iv.cost != null && <span>{iv.cost === 0 ? "Free" : `₹${iv.cost}`}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
