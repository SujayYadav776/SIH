"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { ConfidencePill } from "@/components/confidence-pill";
import { EmptyState } from "@/components/empty-state";
import { EvidenceBadge } from "@/components/evidence-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCohortContext } from "@/hooks/use-cohort-context";
import { api, type Id } from "@/lib/api";

const label = (s: string) =>
  ({
    PROFILE_CREATED: "Profile created",
    ASSESSMENT_STARTED: "Assessment started",
    ASSESSMENT_PASSED: "Assessment passed",
    INTERVENTION_RECOMMENDED: "Recommendation",
    INTERVENTION_STARTED: "Intervention started",
    INTERVENTION_COMPLETED: "Intervention completed",
    APPLICATION_SUBMITTED: "Application",
    SHORTLISTED: "Shortlisted",
    INTERVIEWED: "Interviewed",
    OFFER_RECEIVED: "Offer",
    PLACED: "Placed",
    RETAINED_90_DAYS: "Retained 90 days",
  }[s] ?? s);

const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export default function LearnerPage() {
  const { cohort, cohorts, cohortId } = useCohortContext();
  const learners = useQuery(api.learners.listByCohort, cohortId ? { cohortId } : "skip");
  const skills = useQuery(api.skills.list, {});
  const [chosen, setChosen] = useState<string | null>(null);

  const roster = learners ?? [];
  const selectedId =
    chosen ?? roster.find((l) => l.name === "Aarav Mehta")?._id ?? roster[0]?._id ?? null;
  const selected = roster.find((l) => l._id === selectedId) ?? null;
  const skillName = (id: string) => skills?.find((s) => s._id === id)?.canonicalName ?? "n/a";

  if (cohorts === undefined) return <Skeleton className="mx-auto my-12 h-64 w-full max-w-5xl" />;
  if (cohorts.length === 0 || roster.length === 0) {
    return <EmptyState className="mx-auto my-12 max-w-md" title="No learners yet" description="Add a learner below to walk their journey." />;
  }
  if (!selected) return <Skeleton className="mx-auto my-12 h-64 w-full max-w-5xl" />;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learner journey</h1>
          <p className="mt-1 text-sm text-muted-foreground">{cohort?.name}</p>
        </div>
        <div className="w-64">
          <Label className="sr-only">Learner</Label>
          <Select value={selectedId ?? undefined} onValueChange={setChosen}>
            <SelectTrigger aria-label="Choose learner"><SelectValue placeholder="Pick a learner" /></SelectTrigger>
            <SelectContent>
              {roster.map((l) => (
                <SelectItem key={l._id} value={l._id as string}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="evidence">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="evidence" className="shrink-0">Evidence</TabsTrigger>
          <TabsTrigger value="gaps" className="shrink-0">Gaps</TabsTrigger>
          <TabsTrigger value="plan" className="shrink-0">Action plan</TabsTrigger>
          <TabsTrigger value="assess" className="shrink-0">Assessment</TabsTrigger>
          <TabsTrigger value="timeline" className="shrink-0">Timeline</TabsTrigger>
          <TabsTrigger value="new" className="shrink-0">Add learner</TabsTrigger>
        </TabsList>

        <EvidenceTab learnerId={selected._id} skillName={skillName} />
        <GapsTab learnerId={selected._id} />
        <PlanTab learnerId={selected._id} skillName={skillName} />
        <AssessTab learnerId={selected._id} />
        <TimelineTab learnerId={selected._id} />
        <NewLearnerTab cohortId={cohortId as Id<"cohorts">} onCreated={setChosen} />
      </Tabs>
    </div>
  );
}

/* ---- Evidence (confirm / reject) ---- */
function EvidenceTab({ learnerId, skillName }: { learnerId: Id<"learners">; skillName: (id: string) => string }) {
  const evidence = useQuery(api.learners.listEvidence, { learnerId });
  const confirm = useMutation(api.learners.confirmEvidence);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: Id<"learnerEvidence">, status: "verified" | "rejected") {
    setBusy(id as string);
    try {
      await confirm({ evidenceId: id, verificationStatus: status });
      toast.success(status === "verified" ? "Marked verified" : "Rejected");
    } catch {
      toast.error("Could not update");
    } finally {
      setBusy(null);
    }
  }

  return (
    <TabsContent value="evidence">
      <Card>
        <CardHeader><CardTitle>Profile evidence</CardTitle><CardDescription>Confirm or reject extracted skills</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {evidence === undefined ? <Skeleton className="h-8 w-full" /> : evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">No evidence captured.</p>
          ) : (
            evidence.map((e) => (
              <div key={e._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 text-sm last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{skillName(e.skillId)}</span>
                  <EvidenceBadge tier={e.evidenceType} />
                  {e.verificationStatus === "verified" && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">verified</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <ConfidencePill confidence={e.confidence} source={e.sourceType} />
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => decide(e._id, "verified")}>Verify</Button>
                  <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => decide(e._id, "rejected")}>Reject</Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

/* ---- Gaps ---- */
function GapsTab({ learnerId }: { learnerId: Id<"learners"> }) {
  const gaps = useQuery(api.gaps.listForLearner, { learnerId, topN: 5 });
  return (
    <TabsContent value="gaps">
      <Card>
        <CardHeader><CardTitle>Priority gaps</CardTitle><CardDescription>Deterministic demand × deficit × role-relevance</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {gaps === undefined ? <Skeleton className="h-8 w-full" /> : gaps.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No measurable gaps.</p>
          ) : gaps.top.map((g) => (
            <div key={g.skillId} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{g.name}</span>
                {g.claimedUnverified && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">claimed · unverified</Badge>}
              </div>
              <div className="flex w-52 items-center gap-2">
                <span className="text-muted-foreground">demand {Math.round(g.demand * 100)}%</span>
                <Progress value={Math.min(100, g.priority * 250)} className="h-2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

/* ---- Action plan (generate + start/complete) ---- */
function PlanTab({ learnerId, skillName }: { learnerId: Id<"learners">; skillName: (id: string) => string }) {
  const recs = useQuery(api.recommendations.listForLearner, { learnerId });
  const generate = useMutation(api.recommendations.generate);
  const start = useMutation(api.recommendations.start);
  const complete = useMutation(api.recommendations.complete);
  const [gen, setGen] = useState(false);

  return (
    <TabsContent value="plan">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><CardTitle>Action plan</CardTitle><CardDescription>Rank interventions for the top gaps</CardDescription></div>
          <Button size="sm" disabled={gen} onClick={async () => { setGen(true); try { await generate({ learnerId, topN: 5 }); toast.success("Plan refreshed"); } catch { toast.error("Generate failed"); } finally { setGen(false); } }}>
            {gen ? "Generating…" : "Generate plan"}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recs === undefined ? <Skeleton className="h-8 w-full" /> : recs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No plan yet. Press Generate.</p>
          ) : recs.map((r) => (
            <div key={r._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 text-sm last:border-0">
              <div>
                <div className="font-medium">{r.intervention?.title ?? "Intervention"}</div>
                <div className="text-xs text-muted-foreground">→ {skillName(r.skillId)} · {(r.reasonCodes ?? []).join(", ")}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>
                {r.status === "recommended" && <Button size="sm" variant="outline" onClick={() => start({ recommendationId: r._id }).catch(() => toast.error("Failed"))}>Start</Button>}
                {r.status === "started" && <Button size="sm" onClick={() => complete({ recommendationId: r._id }).catch(() => toast.error("Failed"))}>Complete</Button>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

/* ---- Assessment ---- */
function AssessTab({ learnerId }: { learnerId: Id<"learners"> }) {
  const gaps = useQuery(api.gaps.listForLearner, { learnerId, topN: 1 });
  const skillId = gaps?.top[0]?.skillId as string | undefined;
  const assessments = useQuery(api.assessments.listForSkill, skillId ? { skillId: skillId as Id<"skills"> } : "skip");
  const submit = useMutation(api.assessments.submitAttempt);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [artifact, setArtifact] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const assessment = assessments?.[0];
  const criteria: { id: string; name: string }[] =
    ((assessment?.rubric as any)?.criteria ?? []);

  async function onSubmit() {
    if (!assessment) return;
    setBusy(true);
    try {
      const answers = criteria.map((c) => ({ criterionId: c.id, rating: ratings[c.id] ?? 0.8 }));
      const r = await submit({ assessmentId: assessment._id, learnerId, answers, hasArtifact: artifact, explanation: "Demo submission" });
      setResult({ score: r.score, passed: r.passed });
      toast.success(r.passed ? "Passed" : "Not passed");
    } catch {
      toast.error("Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <TabsContent value="assess">
      <Card>
        <CardHeader><CardTitle>Practical assessment</CardTitle><CardDescription>{skillId ? "Top gap's rubric" : "No gap to assess"}</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!skillId || !assessments ? <Skeleton className="h-8 w-full" /> : !assessment ? (
            <p className="text-sm text-muted-foreground">No assessment exists for this skill yet.</p>
          ) : (
            <>
              <p className="text-sm font-medium">{assessment.title}</p>
              {criteria.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{c.name}</span>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={1} step={0.1} value={ratings[c.id] ?? 0.8} onChange={(e) => setRatings((r) => ({ ...r, [c.id]: Number(e.target.value) }))} className="accent-primary" />
                    <span className="w-8 text-right tabular-nums">{(ratings[c.id] ?? 0.8).toFixed(1)}</span>
                  </div>
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={artifact} onChange={(e) => setArtifact(e.target.checked)} className="accent-primary" />
                I submitted a project artifact (→ project-proven evidence)
              </label>
              <div className="flex items-center gap-3">
                <Button size="sm" disabled={busy} onClick={onSubmit}>{busy ? "Submitting…" : "Submit attempt"}</Button>
                {result && <span className="text-sm text-muted-foreground">Score {(result.score * 100).toFixed(0)}% · {result.passed ? "passed" : "below threshold"}</span>}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

/* ---- Timeline ---- */
function TimelineTab({ learnerId }: { learnerId: Id<"learners"> }) {
  const events = useQuery(api.outcomes.listForLearner, { learnerId });
  return (
    <TabsContent value="timeline">
      <Card>
        <CardHeader><CardTitle>Progress timeline</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2">
          {events === undefined ? <Skeleton className="h-8 w-full" /> : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outcome events yet.</p>
          ) : events.map((e) => (
            <div key={e._id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2"><span>{label(e.eventType)}</span>{e.verified && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">verified</Badge>}</div>
              <span className="tabular-nums text-muted-foreground">{fmt(e.eventDate)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

/* ---- Onboarding (add learner) ---- */
function NewLearnerTab({ cohortId, onCreated }: { cohortId: Id<"cohorts">; onCreated: (id: string) => void }) {
  const add = useMutation(api.learners.addToCohort);
  const [name, setName] = useState("");
  const [months, setMonths] = useState("0");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!name.trim() || !consent) { toast.error("Name and consent are required"); return; }
    setBusy(true);
    try {
      const id = await add({ cohortId, name: name.trim(), experienceMonths: Number(months) || 0, location: "Bengaluru", languagePreference: "English", consentStatus: true });
      toast.success("Learner created");
      onCreated(id as string);
    } catch {
      toast.error("Could not create learner");
    } finally {
      setBusy(false);
    }
  }

  return (
    <TabsContent value="new">
      <Card>
        <CardHeader><CardTitle>Add a learner</CardTitle><CardDescription>Writes PROFILE_CREATED (onboarding)</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5"><Label htmlFor="n">Name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="m">Experience (months)</Label><Input id="m" type="number" value={months} onChange={(e) => setMonths(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="accent-primary" />Consent to process data</label>
          <div><Button size="sm" disabled={busy} onClick={onSubmit}>{busy ? "Creating…" : "Create learner"}</Button></div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
