"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { ClipboardCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, type Id } from "@/lib/api";

export default function AssessmentsPage() {
  const skills = useQuery(api.skills.list, {});
  const [skillId, setSkillId] = useState<string>("");
  const active = (skillId || skills?.[0]?._id) as Id<"skills"> | undefined;
  const assessments = useQuery(api.assessments.listForSkill, active ? { skillId: active } : "skip");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Rubric-based evidence checks per skill</p>
        </div>
        <div className="w-56">
          <Label className="sr-only">Skill</Label>
          <Select value={active ?? undefined} onValueChange={setSkillId}>
            <SelectTrigger aria-label="Choose skill"><SelectValue placeholder="Skill" /></SelectTrigger>
            <SelectContent>
              {(skills ?? []).map((s) => (
                <SelectItem key={s._id} value={s._id as string}>{s.canonicalName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!assessments ? (
        <Skeleton className="h-32 w-full" />
      ) : assessments.length === 0 ? (
        <EmptyState title="No assessment for this skill" description="Create one to enable practical verification." />
      ) : (
        <div className="flex flex-col gap-3">
          {assessments.map((a) => (
            <Card key={a._id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-4 text-muted-foreground" />{a.title}</CardTitle>
                <CardDescription>{a.durationMinutes} min · v{a.version}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 text-sm">
                {(((a.rubric as any)?.criteria) ?? []).map((c: any) => (
                  <Badge key={c.id} variant="outline">{c.name}{c.weight ? ` ×${c.weight}` : ""}</Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
