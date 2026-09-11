# KaushalLoop Convex Backend

Convex schema, queries, mutations, actions, deterministic scoring, and demo seeding for KaushalLoop.

## Setup

```bash
npm install
npx convex dev
```

The first `convex dev` command creates the generated `_generated` files. Configure these Convex environment variables:

```bash
npx convex env set AI_SERVICE_URL http://localhost:8000
npx convex env set AI_SERVICE_TOKEN replace-with-a-shared-secret
```

For a deployed AI service, use its HTTPS URL instead of localhost.

## Auth contract

The functions expect the frontend to authenticate through Convex-compatible auth, such as Convex Auth or Clerk. `ctx.auth.getUserIdentity()` must return an identity whose `subject` is stable. The `users.ensureCurrent` mutation creates the application user from that identity.

## Important functions

- `users.ensureCurrent`
- `institutions.create`
- `cohorts.create`
- `learners.addToCohort`, `learners.listEvidence`, `learners.confirmEvidence`
- `documents.generateUploadUrl`
- `ai.analyzeDocument`, `ai.getPipelineRun`
- `analytics.cohortSkillGaps`, `analytics.readiness`, `analytics.outcomeFunnel`
- `outcomes.create`
- `seed.resetDemo`

### Deterministic pipeline (added in this scaffold)

- `jobs.create`, `jobs.importBatch`, `jobs.list`, `jobs.get`, `jobs.addSkillRequirement`, `jobs.reprocess`
- `skills.create`, `skills.list`, `skills.get`, `skills.addAlias`, `skills.resolve` (canonical resolution: exact → alias → fuzzy)
- `occupations.getDemandSummary` (coordinator demand dashboard)
- `gaps.listForLearner`, `gaps.getForSkill` (Pipeline C — deterministic demand/deficit/priority per skill)
- `interventions.create`, `interventions.list`, `interventions.listForSkills`, `interventions.update`
- `recommendations.generate`, `recommendations.listForLearner`, `recommendations.start`, `recommendations.complete` (Pipeline D — deterministic ranking + reason codes)
- `assessments.create`, `assessments.begin`, `assessments.submitAttempt`, `assessments.verifyAttempt`, `assessments.listAttempts` (Pipeline E — rubric scoring → unverified evidence → coordinator verify)
- `analysis.start`, `analysis.getRun`, `analysis.listForLearner`
- `settings.get`, `settings.updateWeights` (coordinator-tunable evidence weights & thresholds)

Shared, DB-free maths lives in `convex/scoring.ts` (gap + recommendation formulas) and
`convex/normalize.ts` (skill string resolution). Both are pure and unit-testable. Qdrant vector
retrieval and the LLM explanation layer are intentionally left as extension points: recommendations
store `reasonCodes` and `sourceJobIds`, so a grounded explanation can be produced afterwards without
the ranking ever depending on the model. The `ai.analyzeDocument` pipeline (`ai.saveAnalysis`) reuses
the same `skills.resolve` resolver, so extracted spans go through the exact → alias → fuzzy order;
spans that stay unresolved are never invented and are instead counted in the pipeline run's `notes`
for the coordinator data-quality panel.

## Frontend example

```ts
const uploadUrl = await convex.mutation(api.documents.generateUploadUrl, {});
const uploaded = await fetch(uploadUrl, {
  method: "POST",
  headers: { "Content-Type": file.type },
  body: file,
});
const { storageId } = await uploaded.json();

const documentId = await convex.mutation(api.documents.create, {
  learnerId,
  storageId,
  filename: file.name,
  documentType: "resume",
});

const runId = await convex.action(api.ai.analyzeDocument, {
  learnerId,
  storageId,
  documentType: "resume",
  targetRole: "Data Analyst",
});
```

Subscribe to the pipeline status with `api.ai.getPipelineRun` and render the learner evidence once it reaches `completed`.

## Security notes

- Keep `AI_SERVICE_TOKEN` server-side in Convex environment variables.
- The AI service should verify the `Authorization: Bearer` token in production.
- Every institution-scoped function checks the current user and institution membership.
- Do not use LLM output as an authorization decision or hiring decision.
- Synthetic demo records are tagged with `source: "synthetic_demo"`.
