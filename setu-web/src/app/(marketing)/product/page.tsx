import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Flag,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const loop = [
  { icon: TrendingUp, title: "Understand demand", body: "Ingest curated job postings for one role family and rank the skills employers actually ask for." },
  { icon: AlertTriangle, title: "Normalise skills", body: "Map messy phrases like “MS Excel” to canonical skills with confidence and a source span." },
  { icon: Sparkles, title: "Measure the gap", body: "Compare employer demand against learner evidence, deterministically. Claims are not proof." },
  { icon: Wrench, title: "Prescribe the smallest fix", body: "Recommend the shortest intervention that closes the highest-priority gap." },
  { icon: BadgeCheck, title: "Verify readiness", body: "Confirm skills through rubric assessments, not keyword counts." },
  { icon: Flag, title: "Track outcomes", body: "Instrument the journey from recommendation to placement and measure what changed." },
];

const illustrative = [
  { skill: "SQL", demand: 30, verified: 18 },
  { skill: "Excel", demand: 20, verified: 67 },
  { skill: "Power BI", demand: 10, verified: 13 },
  { skill: "Storytelling", demand: 10, verified: 23 },
];

// illustrative cohort evidence (share of learners at least each level)
const heatmap = {
  tiers: ["Inferred", "Assessed", "Verified"],
  rows: [
    { skill: "Excel", cells: [78, 55, 33] },
    { skill: "SQL", cells: [66, 34, 11] },
    { skill: "Power BI", cells: [33, 15, 3] },
  ],
};

const funnel = [
  { stage: "Recommended", n: 18 },
  { stage: "Completed", n: 12 },
  { stage: "Assessed", n: 8 },
  { stage: "Applied", n: 6 },
  { stage: "Placed", n: 2 },
];

const institutions = ["Northstar Institute", "Meridian Polytechnic", "Cassia University", "Deccan Tech Campus"];

function Mark({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-7 text-primary" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35" />
        <text x="16" y="20" textAnchor="middle" fontSize="11" fill="currentColor" fontWeight="700">{initials}</text>
      </svg>
      <span className="text-sm font-medium text-muted-foreground">{name}</span>
    </div>
  );
}

function shade(pct: number) {
  // cap the tint so foreground text keeps AA contrast in both themes
  return `color-mix(in oklab, var(--primary) ${Math.round(Math.max(6, pct) * 0.8)}%, var(--muted))`;
}

export const metadata: Metadata = {
  title: "Setu.: verified learner readiness",
  description:
    "Institutional employability intelligence: turn local job demand into a measured, explainable path to verified learner readiness.",
  openGraph: {
    title: "Setu.",
    description: "Turn local job demand into verified learner readiness.",
    type: "website",
  },
};

export default function ProductPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
      {/* Hero: asymmetric split over ambient art */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <Image src="/marketing/hero-ambient.png" alt="" fill priority sizes="100vw" className="object-cover opacity-70 dark:opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
        </div>
        <div className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Turn local job demand into verified learner readiness.
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Setu. shows a college which employer skills its cohort is missing, which intervention closes them, and whether it worked.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/contact">Book a cohort demo</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">Open the demo</Link>
            </Button>
          </div>
        </div>
        <Card className="border-primary/15">
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Demand vs verified evidence</span>
              <Badge variant="secondary" className="text-[10px]">Illustrative example</Badge>
            </div>
            <div className="mt-5 space-y-4">
              {illustrative.map((r) => (
                <div key={r.skill} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.skill}</span>
                    <span className="tabular-nums text-muted-foreground">{r.demand}% · {r.verified}%</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-muted-foreground/40" style={{ width: `${r.demand}%` }} /></div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${r.verified}%` }} /></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y py-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          {institutions.map((n) => <Mark key={n} name={n} />)}
        </div>
      </section>

      {/* Problem statement: full-bleed editorial over textured band */}
      <section className="relative isolate mt-4 overflow-hidden rounded-2xl px-6 py-20 md:px-10 md:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <Image src="/marketing/problem-band.png" alt="" fill sizes="100vw" className="object-cover opacity-90 dark:opacity-40" />
          <div className="absolute inset-0 bg-background/75 dark:bg-background/70" />
        </div>
        <p className="max-w-3xl text-2xl font-medium leading-snug tracking-tight md:text-3xl">
          A college can tell students to learn more, but it usually cannot show which local skills are missing across a cohort, which intervention closes them, or whether the intervention worked.
        </p>
      </section>

      {/* The loop: bento, exactly 6 cells */}
      <section className="py-12">
        <h2 className="text-2xl font-semibold tracking-tight">A closed loop, not a course catalogue</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loop.map((s) => (
            <Card key={s.title}>
              <CardContent className="p-6">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><s.icon className="size-5" /></div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Spotlight: cohort heatmap (image-style left, copy right) */}
      <section className="grid items-center gap-10 py-20 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <div className="grid grid-cols-[90px_repeat(3,1fr)] gap-1 text-xs">
            <div />
            {heatmap.tiers.map((t) => <div key={t} className="pb-1 text-center text-muted-foreground">{t}</div>)}
            {heatmap.rows.map((row) => (
              <div key={row.skill} className="contents">
                <div className="flex items-center font-medium">{row.skill}</div>
                {row.cells.map((c, i) => (
                  <div key={i} className="flex h-10 items-center justify-center rounded-md font-medium tabular-nums"
                    style={{ backgroundColor: shade(c) }}>
                    {c}%
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">A heatmap of what is actually proven</h2>
          <p className="mt-3 text-muted-foreground">
            Rows are the employer's top skills; columns are how many learners hold inferred, assessed, or verified evidence. Dark cells mean proof, so a coordinator sees the gap instantly rather than guessing from a resume word count.
          </p>
          <Link href="/cohorts" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Explore the cohort view <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Outcome funnel band: wide data visual */}
      <section className="rounded-2xl border bg-muted/30 p-8 py-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">From gap to placement, measured</h2>
          <Badge variant="secondary">Illustrative example</Badge>
        </div>
        <div className="mt-6 flex flex-wrap items-end gap-3">
          {funnel.map((f) => (
            <div key={f.stage} className="flex flex-1 flex-col items-center gap-2" style={{ minWidth: 96 }}>
              <div className="flex w-full items-end justify-center">
                <div className="w-full rounded-t-md bg-primary/85" style={{ height: `${(f.n / funnel[0].n) * 120 + 8}px` }} />
              </div>
              <span className="text-sm font-medium tabular-nums">{f.n}</span>
              <span className="text-center text-xs text-muted-foreground">{f.stage}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Spotlight 2: intervention planner / projected what-if (copy left, illustrative card right) */}
      <section className="grid items-center gap-10 py-20 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">The shortest credible fix, ranked</h2>
          <p className="mt-3 text-muted-foreground">
            Not a course catalogue. Setu. ranks programmes by the priority gaps they close, the time they take, and what a learner can prove afterwards, then projects the coverage before you commit hours.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Reason codes and source postings are shown with every recommendation, and projections are never presented as measured placement impact.
          </p>
          <Link href="/cohorts" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            See the planner <ArrowRight className="size-4" />
          </Link>
        </div>
        <Card className="border-primary/15">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">SQL Project Sprint</span>
              <Badge variant="secondary" className="text-[10px]">Illustrative example</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">12 hours · closes SQL joins and aggregations</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["HIGH_DEMAND", "UNVERIFIED_GAP", "SHORT_DURATION", "PREREQUISITE_MATCH"].map((rc) => (
                <Badge key={rc} variant="outline" className="text-[10px]">{rc}</Badge>
              ))}
            </div>
            <div className="mt-5 flex items-baseline justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">Projected cohort gaps addressed</span>
              <span className="text-lg font-semibold tabular-nums text-primary">~18</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Evidence & trust: two-column checklist */}
      <section className="grid gap-10 py-20 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Explainable, not magical</h2>
          <p className="mt-3 text-muted-foreground">
            The model reads language and writes explanations. Every score, ranking, permission and outcome is computed deterministically in application code.
          </p>
        </div>
        <ul className="space-y-3">
          {[
            "Demand comes from real postings, each skill tied to the phrase that produced it.",
            "Evidence is labelled: claimed, inferred, assessed, project-proven, verified.",
            "Projections are marked as projections, never as placement impact.",
            "Coordinators can correct a wrong skill and see the dashboard update.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <span className="text-sm">{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA band */}
      <section className="relative isolate mb-20 overflow-hidden rounded-2xl border px-8 py-12 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <Image src="/marketing/cta-texture.png" alt="" fill sizes="100vw" className="object-cover opacity-70 dark:opacity-25" />
          <div className="absolute inset-0 bg-background/80" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">See it on your own cohort</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">Bring a target role and a list of graduates. Leave with a ranked gap map and an intervention plan.</p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/contact">Book a cohort demo <ArrowRight className="ml-1 size-4" /></Link>
        </Button>
      </section>
    </div>
  );
}
