"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Quote } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { SectionShell } from "@/components/section-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCohortContext } from "@/hooks/use-cohort-context";
import { api } from "@/lib/api";

type Mode = "all" | "must" | "preferred";

function toMs(dateStr: string, endOfDay = false): number | undefined {
  if (!dateStr) return undefined;
  const base = Date.parse(dateStr);
  return Number.isNaN(base) ? undefined : endOfDay ? base + 86_400_000 - 1 : base;
}

export default function DemandPage() {
  const { cohort, cohorts, occupationId } = useCohortContext();
  const [location, setLocation] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const demand = useQuery(
    api.occupations.getDemandSummary,
    occupationId
      ? {
          occupationId,
          location: location.trim() || undefined,
          postedAfter: toMs(from),
          postedBefore: toMs(to, true),
        }
      : "skip",
  );

  const rows = useMemo(() => {
    const skills = demand?.skills ?? [];
    if (mode === "must") return skills.filter((s) => s.mustHaveCount > 0);
    if (mode === "preferred") return skills.filter((s) => s.mustHaveCount === 0);
    return skills;
  }, [demand, mode]);

  const selected = rows.find((s) => s.skillId === selectedId) ?? rows[0];

  // --- loading / empty ---
  if (cohorts === undefined || (!cohort && cohorts.length === 0)) {
    if (cohorts !== undefined && cohorts.length === 0) {
      return (
        <EmptyState
          className="mx-auto my-12 max-w-md"
          title="No cohort yet"
          description="Create a cohort with a target role to analyse labour-market demand."
        />
      );
    }
    return <DemandSkeleton />;
  }
  if (!occupationId) return <DemandSkeleton />;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Demand</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cohort?.name} · skills employers require for this role
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="loc">Location</Label>
            <Input
              id="loc"
              placeholder="e.g. Bengaluru"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from">Posted after</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to">Posted before</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Requirement</Label>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="must" className="flex-1">Must-have</TabsTrigger>
                <TabsTrigger value="preferred" className="flex-1">Preferred</TabsTrigger>
              </TabsList>
              {/* selector-only tabs: mount empty panels so aria-controls resolves */}
              <TabsContent value="all" forceMount className="hidden" />
              <TabsContent value="must" forceMount className="hidden" />
              <TabsContent value="preferred" forceMount className="hidden" />
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {demand === undefined ? (
        <DemandSkeleton />
      ) : demand.totalPostings === 0 ? (
        <EmptyState
          title="No postings match these filters"
          description="Widen the date range or clear the location filter."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <SectionShell
              title="Skills by demand"
              description={`Share of ${demand.totalPostings} matching postings requiring each skill`}
            >
              <Card>
                <CardContent className="p-0">
                  {rows.length === 0 ? (
                    <EmptyState className="border-0" title="No skills in this filter" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Skill</TableHead>
                          <TableHead className="text-right">Demand</TableHead>
                          <TableHead className="text-right">Postings</TableHead>
                          <TableHead className="text-right">Avg importance</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((s) => (
                          <TableRow
                            key={s.skillId}
                            onClick={() => setSelectedId(s.skillId)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedId(s.skillId);
                              }
                            }}
                            tabIndex={0}
                            aria-label={`Show demand evidence for ${s.name}`}
                            aria-current={selected?.skillId === s.skillId ? "true" : undefined}
                            className={
                              "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 " +
                              (selected?.skillId === s.skillId ? "bg-accent" : "")
                            }
                          >
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell className="text-right tabular-nums">{s.demandPercent}%</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {s.postingsRequiring}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {Math.round(s.avgImportance * 100)}%
                            </TableCell>
                            <TableCell>
                              {s.mustHaveCount > 0 ? (
                                <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                                  must ×{s.mustHaveCount}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                                  preferred
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </SectionShell>
          </div>

          <div>
            <Card className="lg:sticky lg:top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Quote className="size-4 text-muted-foreground" />
                  {selected?.name ?? "Select a skill"}
                </CardTitle>
                <CardDescription>
                  {selected
                    ? `Appears in ${selected.postingsRequiring} of ${demand.totalPostings} postings · avg importance ${Math.round(selected.avgImportance * 100)}%`
                    : "Pick a skill to see the source phrases."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {selected && selected.evidenceSamples.length > 0 ? (
                  selected.evidenceSamples.map((ev, i) => (
                    <blockquote
                      key={i}
                      className="rounded-lg border bg-muted/40 px-3 py-2 text-sm"
                    >
                      <p className="text-foreground">“{ev.evidenceText}”</p>
                      <footer className="mt-1 text-xs text-muted-foreground">
                        {ev.company ?? "Demo Employer"}
                      </footer>
                    </blockquote>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No evidence phrases captured.</p>
                )}
                <p className="pt-1 text-[11px] text-muted-foreground">
                  Demo dataset · synthetic postings
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function DemandSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <Card>
            <CardContent className="space-y-2 p-6">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    </div>
  );
}
