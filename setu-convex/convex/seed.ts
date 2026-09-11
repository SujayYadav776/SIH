import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

import { requireUser } from "./auth";

const DEMO_CONFIRMATION = "SETU_DEMO_RESET";
const now = 1_757_520_000_000; // fixed demo timestamp; not current time

const skillSeeds = [
  ["SQL", "technical"],
  ["Excel", "technical"],
  ["Python", "technical"],
  ["Statistics", "technical"],
  ["Power BI", "technical"],
  ["Data Storytelling", "soft"],
  ["Data Cleaning", "technical"],
  ["Git", "technical"],
  ["Stakeholder Communication", "soft"],
] as const;

/** Staff-only demo controls: any signed-in coordinator/admin of the demo institution. */
async function requireDemoStaff(ctx: MutationCtx, confirmation: string) {
  if (confirmation !== DEMO_CONFIRMATION) throw new Error("Invalid demo reset confirmation");
  // Bootstrap: a deployment with no users has no demo data and no coordinator yet,
  // so the very first seed cannot be staff-gated. Once any user exists, gate is strict.
  if ((await ctx.db.query("users").first()) === null) return null;
  const user = await requireUser(ctx);
  if (user.role !== "coordinator" && user.role !== "admin") {
    throw new Error("Only demo staff can reset the dataset");
  }
  return user;
}

async function seedDemo(ctx: MutationCtx) {
    for (const table of [
      "outcomeEvents",
      "pipelineRuns",
      "assessmentAttempts",
      "assessments",
      "recommendations",
      "learnerEvidence",
      "documents",
      "learners",
      "jobSkillRequirements",
      "jobPostings",
      "interventions",
      "skillAliases",
      "skills",
      "cohorts",
      "occupations",
      "users",
      "institutions",
    ] as const) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }

    const institutionId = await ctx.db.insert("institutions", {
      name: "Northstar Institute of Technology",
      type: "engineering_college",
      city: "Bengaluru",
      state: "Karnataka",
      createdAt: now,
    });
    const occupationId = await ctx.db.insert("occupations", {
      code: "DEMO-DATA-ANALYST",
      name: "Entry-Level Data Analyst",
      description: "Entry-level analyst roles in Bengaluru technology companies",
      taxonomy: "setu-demo",
      taxonomyVersion: "2026.1",
    });
    const cohortId = await ctx.db.insert("cohorts", {
      institutionId,
      name: "Final-year B.Tech Data Analytics Cohort, 2026",
      targetRoleId: occupationId,
      geography: "Bengaluru",
      startDate: now,
      createdAt: now,
    });

    const skillIds = new Map<string, any>();
    for (const [name, skillType] of skillSeeds) {
      const id = await ctx.db.insert("skills", {
        canonicalName: name,
        description: `${name} for the Setu. demo role family`,
        skillType,
        taxonomy: "setu-demo",
        taxonomyVersion: "2026.1",
      });
      skillIds.set(name, id);
    }

    const adminUserId = await ctx.db.insert("users", {
      subject: "demo-coordinator-subject",
      email: "coordinator@northstar.demo",
      name: "Demo Placement Coordinator",
      role: "coordinator",
      institutionId,
      createdAt: now,
    });

    const interventionSpecs = [
      ["SQL Project Sprint", "project", 12, ["SQL", "Data Cleaning"]],
      ["Power BI Dashboard Lab", "lab", 10, ["Power BI", "Data Storytelling"]],
      ["Statistics Diagnostic", "assessment", 4, ["Statistics"]],
      ["Portfolio Review", "mentoring", 3, ["Git", "Data Storytelling"]],
      ["Stakeholder Communication Workshop", "workshop", 6, ["Stakeholder Communication"]],
    ] as const;
    const interventionIds: any[] = [];
    for (const [title, type, durationHours, skills] of interventionSpecs) {
      interventionIds.push(await ctx.db.insert("interventions", {
        title,
        type,
        durationHours,
        cost: 0,
        prerequisites: [],
        skillIds: skills.map((skill) => skillIds.get(skill)),
        description: `${title} for the Entry-Level Data Analyst pathway.`,
      }));
    }

    const jobSkillNames = ["SQL", "SQL", "SQL", "Excel", "Excel", "Power BI", "Data Storytelling", "Statistics", "Python", "Data Cleaning"];
    const jobIds: any[] = [];
    for (let i = 0; i < 30; i += 1) {
      const jobId = await ctx.db.insert("jobPostings", {
        title: "Junior Data Analyst",
        company: `Demo Employer ${String((i % 8) + 1).padStart(2, "0")}`,
        location: "Bengaluru",
        source: "synthetic_demo",
        sourceUrl: "https://example.com/synthetic-demo",
        postedAt: now - i * 86_400_000,
        description: `Demo data analyst posting ${i + 1}. Requires SQL, Excel, and analytical communication.`,
        contentHash: `demo-job-${i + 1}`,
        occupationId,
        createdAt: now,
      });
      jobIds.push(jobId);
      const primarySkill = jobSkillNames[i % jobSkillNames.length];
      await ctx.db.insert("jobSkillRequirements", {
        jobId,
        skillId: skillIds.get(primarySkill),
        requirementType: ["SQL", "Excel", "Power BI"].includes(primarySkill) ? "must_have" : "preferred",
        importance: ["SQL", "Excel"].includes(primarySkill) ? 0.9 : 0.7,
        extractionConfidence: 0.98,
        evidenceText: `Strong ${primarySkill} skills required for the demo role.`,
        model: "seeded",
        promptVersion: "demo",
      });
    }

    // Escalating-evidence demo plan. `verified` = learners with strong (assessed /
    // project_proven / verified_external, verified) evidence; `claimed` = extra
    // unverified resume mentions (so total evidence > verified, the point of the product).
    const STRONG = ["assessed", "project_proven", "verified_external"] as const;
    const evidencePlan: { name: string; verified: number; claimed: number }[] = [
      { name: "Excel", verified: 40, claimed: 10 },
      { name: "SQL", verified: 12, claimed: 20 },
      { name: "Python", verified: 20, claimed: 15 },
      { name: "Statistics", verified: 10, claimed: 12 },
      { name: "Power BI", verified: 8, claimed: 18 },
      { name: "Data Cleaning", verified: 25, claimed: 12 },
      { name: "Git", verified: 30, claimed: 10 },
      { name: "Stakeholder Communication", verified: 22, claimed: 14 },
      { name: "Data Storytelling", verified: 14, claimed: 20 },
    ];
    const learnerIds: any[] = [];
    let evidenceCount = 0;

    for (let i = 0; i < 60; i += 1) {
      const learnerId = await ctx.db.insert("learners", {
        cohortId,
        name: i === 0 ? "Aarav Mehta" : `Demo Learner ${String(i + 1).padStart(2, "0")}`,
        email: `learner${i + 1}@northstar.demo`,
        education: "B.Tech",
        experienceMonths: i % 4 === 0 ? 6 : 0,
        location: "Bengaluru",
        languagePreference: "English",
        consentStatus: true,
        createdAt: now,
      });
      learnerIds.push(learnerId);

      await ctx.db.insert("outcomeEvents", {
        learnerId,
        eventType: "PROFILE_CREATED",
        eventDate: now,
        source: "synthetic_demo",
        verified: true,
      });
      if (i < 18) {
        await ctx.db.insert("outcomeEvents", { learnerId, eventType: "INTERVENTION_RECOMMENDED", eventDate: now + 86_400_000, source: "synthetic_demo", verified: true });
      }
      if (i < 12) {
        await ctx.db.insert("outcomeEvents", { learnerId, eventType: "INTERVENTION_COMPLETED", eventDate: now + 3 * 86_400_000, source: "synthetic_demo", verified: true });
      }
      if (i < 8) {
        await ctx.db.insert("outcomeEvents", { learnerId, eventType: "ASSESSMENT_PASSED", eventDate: now + 5 * 86_400_000, source: "synthetic_demo", verified: true });
      }
      if (i < 6) {
        await ctx.db.insert("outcomeEvents", { learnerId, eventType: "APPLICATION_SUBMITTED", eventDate: now + 7 * 86_400_000, source: "synthetic_demo", verified: true });
      }
      if (i < 4) {
        await ctx.db.insert("outcomeEvents", { learnerId, eventType: "SHORTLISTED", eventDate: now + 9 * 86_400_000, source: "synthetic_demo", verified: true });
        await ctx.db.insert("outcomeEvents", { learnerId, eventType: "INTERVIEWED", eventDate: now + 11 * 86_400_000, source: "synthetic_demo", verified: true });
      }
      if (i < 3) {
        await ctx.db.insert("outcomeEvents", { learnerId, eventType: "OFFER_RECEIVED", eventDate: now + 13 * 86_400_000, source: "synthetic_demo", verified: true });
      }
      if (i < 2) {
        await ctx.db.insert("outcomeEvents", { learnerId, eventType: "PLACED", eventDate: now + 15 * 86_400_000, source: "synthetic_demo", verified: true });
      }

      // Evidence across skills. Aarav (i===0) SQL is handled specially below to keep
      // his claimed-but-unverified narrative, so skip the generic strong row for him.
      for (let s = 0; s < evidencePlan.length; s += 1) {
        const plan = evidencePlan[s];
        if (i === 0 && plan.name === "SQL") continue;
        if (i < plan.verified) {
          await ctx.db.insert("learnerEvidence", {
            learnerId,
            skillId: skillIds.get(plan.name),
            sourceType: "seeded_assessment",
            evidenceType: STRONG[(i + s) % STRONG.length],
            evidenceText: `Verified ${plan.name} evidence for demo learner ${i + 1}.`,
            confidence: 0.85,
            verificationStatus: "verified",
            model: "seeded",
            promptVersion: "demo",
            createdAt: now,
          });
          evidenceCount += 1;
        } else if (i < plan.verified + plan.claimed) {
          await ctx.db.insert("learnerEvidence", {
            learnerId,
            skillId: skillIds.get(plan.name),
            sourceType: "synthetic_resume",
            evidenceType: i % 2 === 0 ? "claimed" : "inferred",
            evidenceText: `Resume mentions ${plan.name}.`,
            confidence: 0.6,
            verificationStatus: "unverified",
            model: "seeded",
            promptVersion: "demo",
            createdAt: now,
          });
          evidenceCount += 1;
        }
      }

      if (i === 0) {
        // Aarav: claims SQL but has no verified evidence -> the flagship "claimed but
        // unverified" gap, and the one seeded recommendation.
        await ctx.db.insert("learnerEvidence", {
          learnerId,
          skillId: skillIds.get("SQL"),
          sourceType: "synthetic_resume",
          evidenceType: "claimed",
          evidenceText: "Built SQL queries for academic data analysis.",
          confidence: 0.91,
          verificationStatus: "unverified",
          model: "seeded",
          promptVersion: "demo",
          createdAt: now,
        });
        evidenceCount += 1;
        await ctx.db.insert("recommendations", {
          learnerId,
          skillId: skillIds.get("SQL"),
          interventionId: interventionIds[0],
          rank: 1,
          score: 0.94,
          reasonCodes: ["HIGH_DEMAND", "UNVERIFIED_GAP", "SHORT_DURATION", "PREREQUISITE_MATCH"],
          sourceJobIds: jobIds.slice(0, 5),
          status: "recommended",
          createdAt: now,
        });
      }
    }

    // Assessments for the top skills (drives the learner journey, Phase 4) + SQL attempts
    // for the learners whose ASSESSMENT_PASSED event was emitted above.
    const assessmentSpecs = [
      ["SQL", "SQL joins & aggregations"],
      ["Power BI", "Dashboard critique"],
      ["Data Storytelling", "Business-insight explanation"],
      ["Statistics", "Hypothesis-test readout"],
      ["Excel", "Pivot + lookup model"],
    ] as const;
    const assessmentIds = new Map<string, any>();
    for (const [skillName, title] of assessmentSpecs) {
      const id = await ctx.db.insert("assessments", {
        skillId: skillIds.get(skillName),
        title,
        rubric: {
          passThreshold: 0.7,
          criteria: [
            { id: "correctness", name: "Correctness", weight: 2 },
            { id: "clarity", name: "Clarity", weight: 1 },
          ],
        },
        durationMinutes: 30,
        version: "demo-1",
      });
      assessmentIds.set(skillName, id);
    }
    for (let i = 0; i < 8; i += 1) {
      await ctx.db.insert("assessmentAttempts", {
        assessmentId: assessmentIds.get("SQL"),
        learnerId: learnerIds[i],
        score: 0.82,
        rubricResult: {
          passed: true,
          evidenceIds: [],
          criteria: [
            { id: "correctness", rating: 0.9 },
            { id: "clarity", rating: 0.65 },
          ],
        },
        completedAt: now + 5 * 86_400_000,
      });
    }

    // A little synthetic data-quality load so the review queue has content to show:
    // a few low-confidence auto-extractions, one failed run, one run with unresolved spans.
    const reviewNames = ["Python", "Power BI", "Statistics"] as const;
    for (let k = 0; k < reviewNames.length; k += 1) {
      await ctx.db.insert("learnerEvidence", {
        learnerId: learnerIds[40 + k],
        skillId: skillIds.get(reviewNames[k]),
        sourceType: "ai_document_extraction",
        evidenceType: "inferred",
        evidenceText: `Possibly ${reviewNames[k]} (auto-detected, needs review)`,
        confidence: 0.34,
        verificationStatus: "unverified",
        model: "gpt-5-mini",
        promptVersion: "demo",
        createdAt: now,
      });
      evidenceCount += 1;
    }
    await ctx.db.insert("pipelineRuns", {
      learnerId: learnerIds[41],
      pipelineName: "document_analysis",
      status: "failed",
      progress: 100,
      error: "LLM provider timeout",
      model: "gpt-5-mini",
      promptVersion: "demo",
      notes: "skills resolved=0 unresolved=1",
      createdAt: now,
      completedAt: now,
    });
    await ctx.db.insert("pipelineRuns", {
      learnerId: learnerIds[42],
      pipelineName: "document_analysis",
      status: "completed",
      progress: 100,
      model: "gpt-5-mini",
      promptVersion: "demo",
      notes: "skills resolved=9 unresolved=3",
      createdAt: now,
      completedAt: now,
    });

    return {
      institutionId,
      cohortId,
      occupationId,
      adminUserId,
      learners: 60,
      jobs: 30,
      skills: skillIds.size,
      assessments: assessmentSpecs.length,
      evidenceRows: evidenceCount,
    };
}

export const resetDemo = mutation({
  args: { confirmation: v.string() },
  handler: async (ctx, args) => {
    await requireDemoStaff(ctx, args.confirmation);
    return seedDemo(ctx);
  },
});

/**
 * "Worked-through" demo overlay: run AFTER `resetDemo` (kept separate so each
 * mutation stays well under the operation limits). Applies the deltas a presenter
 * would accumulate mid-story: plan in progress, review queue cleared, failed run
 * retried. Lets a short demo start from act two without the manual steps.
 */
export const loadDemoScenario = mutation({
  args: { confirmation: v.string() },
  handler: async (ctx, args) => {
    await requireDemoStaff(ctx, args.confirmation);

    // 1. Aarav's flagship SQL recommendation is now in progress.
    const recs = await ctx.db
      .query("recommendations")
      .withIndex("by_learner")
      .collect();
    const aaravRec = recs.find((r) => r.status === "recommended");
    if (aaravRec) await ctx.db.patch(aaravRec._id, { status: "started" });

    // 2. The three low-confidence auto-extractions have been reviewed and confirmed.
    const lowConf = await ctx.db
      .query("learnerEvidence")
      .filter((q) => q.eq(q.field("sourceType"), "ai_document_extraction"))
      .collect();
    for (const row of lowConf) {
      await ctx.db.patch(row._id, { verificationStatus: "verified", confidence: 0.9 });
    }

    // 3. The failed pipeline run has been retried and resolved.
    const runs = await ctx.db.query("pipelineRuns").collect();
    for (const run of runs) {
      if (run.status === "failed") {
        await ctx.db.patch(run._id, { status: "completed", error: undefined, notes: "skills resolved=1 unresolved=0" });
      }
    }

    return { scenario: "worked-through" };
  },
});
