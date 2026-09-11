import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Gauge, Layers, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "For institutions" };

const value = [
  { icon: Layers, title: "A cohort-level gap map", body: "See, per employer skill, how many graduates actually hold verified evidence. Not resume keyword counts." },
  { icon: Gauge, title: "Minimum-effective interventions", body: "Rank programmes by the priority gaps they close and the time they take, before you commit placement-cell hours." },
  { icon: ShieldCheck, title: "Defensible to leadership", body: "Every figure carries a source, a date, and a confidence, so the numbers survive scrutiny." },
];

export default function InstitutionsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 md:px-6 md:py-20">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="size-4" /> Built for placement cells and academic heads</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Employability you can measure, not just claim</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Move from a placement brochure to an evidence trail. KaushalLoop turns messy local job-market data into a decision your institution can act on and defend.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {value.map((v) => (
          <Card key={v.title}>
            <CardContent className="p-6">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><v.icon className="size-5" /></div>
              <h2 className="mt-4 font-semibold">{v.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{v.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-16 rounded-2xl border p-8">
        <h2 className="text-xl font-semibold tracking-tight">What a pilot needs from you</h2>
        <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li>One role family (for example entry-level data analyst).</li>
          <li>One geography and a recent window of job postings.</li>
          <li>A graduate cohort with resumes and consent.</li>
          <li>A list of programmes you can actually offer.</li>
        </ul>
        <Button asChild className="mt-6"><Link href="/contact">Talk to us</Link></Button>
      </section>
    </div>
  );
}
