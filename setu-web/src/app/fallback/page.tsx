import type { Metadata } from "next";
import Link from "next/link";
import { DatabaseBackup } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Snapshot" };

// Static read-only snapshot so the pitch can continue if the live Convex backend
// is unreachable. Numbers mirror the seeded demo dataset.
const kpis = [
  { label: "Learners in cohort", value: "60" },
  { label: "Postings analysed", value: "30" },
  { label: "Skills measured", value: "7" },
  { label: "Placed (outcome)", value: "2" },
];

const readiness = [
  { skill: "SQL", demand: 30, verified: 18 },
  { skill: "Excel", demand: 20, verified: 67 },
  { skill: "Power BI", demand: 10, verified: 13 },
  { skill: "Data Storytelling", demand: 10, verified: 23 },
  { skill: "Statistics", demand: 10, verified: 17 },
  { skill: "Python", demand: 10, verified: 33 },
  { skill: "Data Cleaning", demand: 10, verified: 42 },
];

export default function FallbackPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <DatabaseBackup className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Coordinator overview</h1>
          <p className="text-sm text-muted-foreground">Northstar Institute · Entry-Level Data Analyst, Bengaluru</p>
        </div>
        <Badge variant="secondary" className="ml-auto">Read-only snapshot</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums">{k.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cohort readiness by skill</CardTitle>
          <CardDescription>Demand vs share of learners with verified evidence</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {readiness.map((r) => (
            <div key={r.skill} className="grid grid-cols-[1fr_repeat(2,1fr)] items-center gap-3 text-sm">
              <span className="font-medium">{r.skill}</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-muted-foreground/40" style={{ width: `${r.demand}%` }} /></div>
                <span className="w-10 text-right tabular-nums text-muted-foreground">{r.demand}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${r.verified}%` }} /></div>
                <span className="w-10 text-right tabular-nums text-muted-foreground">{r.verified}%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        This snapshot is static and labelled as such.{" "}
        <Button asChild variant="link" className="h-auto p-0 align-baseline">
          <Link href="/">Return to the live app</Link>
        </Button>
      </div>
    </main>
  );
}
