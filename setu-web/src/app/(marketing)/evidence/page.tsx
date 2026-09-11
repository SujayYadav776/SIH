import type { Metadata } from "next";
import Link from "next/link";
import { Cpu, EyeOff, GitCompare, Lock, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Evidence & trust" };

const model = [
  { icon: Cpu, title: "Where the model is used", body: "Reading ambiguous language and writing grounded explanations. It never invents a skill, a score, or a decision." },
  { icon: GitCompare, title: "Where the maths is", body: "Demand share, evidence weights, gap priority, intervention ranking, permissions and outcomes are deterministic application code." },
  { icon: EyeOff, title: "Honest limits", body: "Freshness, source coverage, extraction confidence and unresolved spans are surfaced in the UI, not hidden." },
];

const wont = [
  "No automated hiring or rejection decisions.",
  "No facial, personality or protected-attribute analysis.",
  "No universal employability score.",
  "No claim that synthetic demo data proves real employment impact.",
];

export default function EvidencePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16 md:px-6 md:py-20">
      <div className="max-w-2xl">
        <Badge variant="secondary">Responsible by design</Badge>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Auditable, not magical</h1>
        <p className="mt-4 text-lg text-muted-foreground">An employability system has to earn trust from students, placement officers and leadership. This is how Setu. is bounded.</p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {model.map((m) => (
          <Card key={m.title}>
            <CardContent className="p-6">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><m.icon className="size-5" /></div>
              <h2 className="mt-4 font-semibold">{m.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{m.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader2 />
          <CardContent>
            <ul className="space-y-2 text-sm">
              {wont.map((w) => (
                <li key={w} className="flex items-start gap-2"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" /><span>{w}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader2 title="Privacy" icon={<Lock className="size-4" />} />
          <CardContent className="text-sm text-muted-foreground">
            <p>Consent is captured before processing. Resumes can be parsed and normalised on-prem, so personal documents do not need to leave your network for skill matching. Access is scoped to each institution and every action is auditable.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <Button asChild variant="outline"><Link href="/contact">Ask about a pilot</Link></Button>
      </div>
    </div>
  );
}

function CardHeader2({ title = "What it will not do", icon }: { title?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b px-6 py-4 font-semibold">
      {icon}
      {title}
    </div>
  );
}
