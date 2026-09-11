# Setu. — Build Task List

Expanded from `DESIGN_PLAN.md` §12. Ordered so dependencies resolve: foundations →
wiring → coordinator → learner → marketing → hardening. Each task lists files and a
"done when" acceptance test. Ticking is the working checklist for the build.

Status reality checked against the repo: the Convex functions type-check but the
frontend is **not** connected (no Convex client/provider), there is **no auth provider**
(a hard blocker — every Convex read calls `requireUser`), and the coordinator Overview
is a **static demo shell**. Marketing surfaces do not exist yet.

---

## Phase 1 — Theme & design-system foundations  (plan §12.1)

- [x] **1.1 ThemeProvider + light/dark toggle.** Shipped: `theme-provider.tsx` (next-themes,
  `attribute="class"`, light-first) in `layout.tsx` + `ModeToggle` in both headers; all tokens
  from CSS vars. Verified both modes across 15 routes in the 6.3 sweep.
- [x] **1.2 Evidence-tier colour scale.** Shipped: `--evidence-*` tokens in `globals.css`
  (AA-tuned in 6.1) driven by the single `evidenceTone()` helper (`lib/evidence.ts`) used by
  `EvidenceBadge`/`ConfidencePill` everywhere.
- [x] **1.3 Reusable primitives.** Shipped: `StatCard`, `SectionShell`, `EmptyState`,
  `SkeletonTable`, `ConfidencePill`; Overview + all app screens use them.
- [x] **1.4 Form + validation base.** Shipped: zod + react-hook-form + @hookform/resolvers;
  canonical labelled pattern used by `/contact` (6.2-verified) and onboarding/assessment forms.

## Phase 2 — Wire the app to Convex (implicit prerequisite for §12.2/§12.3)

- [x] **2.1 Install client + provider.** `convex` v1.45 installed; single `ConvexReactClient`
  in `src/lib/convex.ts`, `ConvexProvider` wrapper in `src/components/convex-provider.tsx`
  mounted in the root layout; `NEXT_PUBLIC_CONVEX_URL` in `.env(.example/.local)`. Build green.
  (A live `useQuery(api.…)` still needs auth — 2.3.)
- [x] **2.2 Point the client at the backend.** Added `@convex/*` tsconfig path alias →
  `../setu-convex/convex/*`, so `src/lib/api.ts` re-exports the real generated `api`
  and `Id`/`Doc` types, kept fresh by `npx convex dev` in the backend (no copy). TypeScript
  build now type-checks against the backend functions (verified).
- [x] **2.3 Auth (unblocker).** Shipped a guarded **dev-only identity** in
  `convex/auth.ts` `currentUser`: when no `ctx.auth` identity, it resolves the seeded demo
  coordinator (subject `demo-coordinator-subject`) **only** if the deployment sets `DEV_AUTH=1`
  (off by default; never set it on prod). Runtime-verified locally: `skills:list` returns data
  instead of `Unauthenticated`, and validator/authz still fire. This is a stopgap — the eventual
  production path is ConvexAuth (`CONVEX_AUTH.md`), which replaces the shim + reconciles the
  `users` table and adds a real sign-in route.
- [x] **2.4 Seed richer demo data.** `seed.ts` now writes 312 evidence rows (per-skill
  verified/claimed tiers), 5 assessments + 8 SQL attempts, and the full funnel
  (APPLICATION_SUBMITTED:6, OFFER_RECEIVED:3, PLACED:2). Runtime-verified on the local backend:
  cohort readiness is varied & non-zero (SQL 30% demand / 18% verified = top gap; Excel 67%),
  Aarav's #1 gap is SQL with `claimedUnverified=true` and highest priority, all `synthetic_demo`.
  Web build still green.

## Phase 3 — Coordinator screens (plan §12.2, uses existing `(app)` shell)

- [x] **3.1 Overview — replace static with live.** New client `CoordinatorOverview`
  (bootstrap `users.me` → `cohorts.listForInstitution` → `occupations.getDemandSummary`,
  `analytics.cohortSkillGaps`, `analytics.outcomeFunnel`, `learners.listByCohort` via
  `useQuery(..., skip)`), loading skeleton + no-institution/no-cohort empty states, demand
  chart now data-driven. Required widening Turbopack root to the parent (next.config.ts) so the
  `@convex/*` alias bundles. Build green; queries runtime-verified against seed (note: verified
  coverage is 0% and APPLICATION/OFFER funnel steps are 0 because seed lacks them → 2.4).
- [x] **3.2 Demand page.** `app/(app)/demand/page.tsx`: skills-by-demand table with
  server-side location + posted-after/before filters and a client All/Must-have/Preferred
  tab; clicking a skill shows its verbatim job-posting phrases (from
  `getDemandSummary.evidenceSamples` — no extra query) in a sticky provenance panel.
  Added shared `useCohortContext` hook. Loading skeletons + empty states; build green.
- [x] **3.3 Cohort heatmap + intervention planner + what-if.** Added backend
  `analytics.cohortEvidenceMatrix` (share of cohort holding ≥ each evidence tier, per demanded
  skill) to drive a real heatmap. `/cohorts` page: 5-tier evidence heatmap (SQL 18% proof vs 30%
  demand) + intervention planner (`interventions.list`) with a **projected-coverage** what-if
  (per-skill gaps addressed, explicitly "projected · not deduplicated · not placement impact").
  Matrix runtime-verified; shared `useCohortContext`; build green.
- [x] **3.4 Learners roster + drill-down + data-quality queue.** `/learners`: roster from
  `listByCohort` + `analytics.readiness`, with a per-learner drill-down (top gaps, evidence with
  `EvidenceBadge`/`ConfidencePill` provenance, ranked recommendations). New backend
  `analytics.reviewQueue` drives `/data-quality` (pending/failed/unresolved-run counts +
  low-confidence unverified rows). Added a small synthetic data-quality load to `seed.ts`.
  All queries runtime-verified (queue: failed 1, unresolved 2, low-conf 3); build green.
- [x] **3.5 Outcomes analytics + export.** New `analytics.cohortOutcomes` (per-learner furthest
  stage + reached stages) drives `/outcomes`: conversion stats, funnel, a learner table, a
  client-side **CSV export** (Blob download), and a per-learner timeline via
  `outcomes.listForLearner`. Runtime-verified (60 learners; Aarav PLACED; 9-event timeline).
  Build green. **Phase 3 complete.**

## Phase 4 — Learner app (plan §12.3)

- [x] **4.1–4.6 Learner journey** — `/learner` (client, learner picker): tabs for Evidence
  (confirm/reject via `learners.confirmEvidence`), Gaps (`gaps.listForLearner` with the
  claimed-unverified flag), Action plan (`recommendations.generate` + start/complete), Assessment
  (`assessments.submitAttempt` against the rubric → score, writes assessed/project-proven evidence),
  Timeline (`outcomes.listForLearner`), and Add learner/onboarding (`learners.addToCohort`, writes
  PROFILE_CREATED). All mutations wired to real functions; build green. (Live write-path exercised via
  the dev-identity; verify/reject and generate are the human-correction loop, §15.7.)

## Phase 5 — Marketing surfaces (plan §12.4, governed by design-taste skill)

- [x] **5.0 Real imagery** — generated three on-brand abstract pieces (warm paper + deep-navy,
  no text/UI/people): `public/marketing/{hero-ambient,problem-band,cta-texture}.png`, wired behind
  the hero, problem-statement and CTA via `next/image` (fill, lazy/priority) with theme-aware scrims
  for AA contrast. The demand/heatmap/plan panels stay as honestly-labelled *illustrative* data
  visuals (not div-fake screenshots). Real in-app screenshots remain an optional later enhancement.
- [x] **5.1/5.2 Landing = `/product`** (DESIGN_PLAN §7): asymmetric split hero, trust strip
  (SVG monograms), full-bleed problem, 6-cell loop bento, **two spotlights** (cohort-heatmap +
  intervention-planner projected-what-if, separated by a wide funnel band so no 3 consecutive
  splits), evidence/trust checklist, single-intent CTA; page OG metadata. Zero em-dashes, one
  accent/theme/radius, ≤3 eyebrows, distinct layout families, mobile collapse. Build green.
- [x] **5.3 For institutions** (`/institutions`) — placement-cell value, pilot requirements.
- [x] **5.4 Evidence & trust** (`/evidence`) — deterministic scoring, "will not do", privacy/on-prem.
- [x] **5.5 Contact** (`/contact`) — accessible zod + react-hook-form (labels + aria-describedby),
  toast submit. `SiteHeader` client nav (desktop + mobile Sheet, active states), skip link, footer.
  All marketing routes prerender; build green.

## Phase 6 — Hardening & delivery (plan §12.5)

- [x] **6.1 Pre-flight gate** run against every marketing page (`scripts/audit-sweep.mjs`):
  15 routes x light/dark x 1280/375 = 60 states, 0 console errors, 0 horizontal overflow,
  **0 axe violations** (was 503 nodes). Em-dash sweep clean app-wide; §14 mechanical greps
  (eyebrows, scroll cues, version labels, fake tracks) clean. Fixes: capped heatmap tints,
  darkened light-mode `--evidence-*`, marketing card headings h3->h2, `/fallback` main landmark.
- [x] **6.2 Accessibility + motion.** Heatmap converted to a real `<table>` (scope'd headers,
  sr-only caption); funnel/readiness `Progress` + demand chart got `aria-label`/`aria-valuetext`/
  sr-only figcaption summaries; demand + outcomes table rows keyboard-operable (tabIndex,
  Enter/Space, `aria-current`, focus ring - verified with a real Tab/Enter pass); Select triggers
  + search input named; sidebar = labelled complementary landmark; app skip link added;
  `prefers-reduced-motion` verified active. Reduced to 0 axe nodes with the 6.1 sweep.
- [x] **6.3 Both modes + responsive.** All 15 routes screenshotted light + dark at 1280 and 375
  (`audit_shots/`); document overflow 0px everywhere after `min-w-0` on demand grid columns and
  a scroll-contained learner `TabsList`; mobile sidebar Sheet opens with full nav; heatmap/tables
  scroll inside focusable containers. **Phase 6 verification complete; 6.4 rehearsal + 6.5 deploy remain.**
- [x] **6.4 Demo reliability.** Seeded reads are precomputed by `seed:resetDemo` and land
  < 10s/page even on a 1.6 Mbps throttle (Convex subscriptions cache after first frame).
  Demo controls are staff-gated **server-side** (`requireUser` + coordinator/admin role in
  `seed.ts`, not just the confirmation string). `seed:loadDemoScenario` applies a
  worked-through overlay (SQL plan started, review queue cleared, failed run retried) as a
  second small mutation after the reset-seed, keeping each mutation under the operation
  limits; both buttons hard-reload so no stale document ids survive (transient
  "Forbidden" logs in the reset->reload window are the authz correctly rejecting old ids).
  Read-only `/fallback` verified with the backend hard-blocked: app shell renders without
  crash, snapshot shows data + static label. Scripted rehearsal
  (`scripts/demo-rehearsal.mjs`, clean profile + Fast 3G + 4s narration dwell per screen):
  full coordinator journey incl. verify, plan generation, CSV download, scenario load and
  reset = **85s vs the 300s budget - PASS**; per-step timings in
  `audit_shots/rehearsal-steps.json`.
- [x] **6.5 Deploy.** Convex prod `polite-crab-36` (https://polite-crab-36.convex.cloud)
  deployed + `DEV_AUTH=1` + seeded (60 learners / 315 evidence rows); identity + queries
  verified via CLI. Monorepo pushed to https://github.com/SujayYadav776/SIH. Vercel project
  `setu` (root dir `setu-web`, `NEXT_PUBLIC_CONVEX_URL` set) deployed to
  **https://setu-sih.vercel.app**. `scripts/prod-verify.mjs` against the live URL:
  15/15 routes render real Convex data, 0 axe violations, 0 console errors.
  Recoverable reset via the in-app **Reset demo** / **Scenario** (staff-gated) or
  `npx convex run seed:resetDemo`. **Phase 6 complete - site is live.**

---

## Critical path (do in this order)

`1.1–1.4` → `2.1 → 2.2 → 2.3 → 2.4` → `3.1` → `3.2–3.5` (parallelisable) → `4.1–4.6` →
`5.x` (only needs 5.0 assets from a working app) → `6.x`.

The single risk that gates the most downstream work is **2.3 (auth)** — no Convex data
renders until a signed-in identity exists. Everything in Phases 3–4 depends on it.

## Suggested release checkpoints

- **RC1** after Phase 2: signed-in coordinator sees live Overview.
- **RC2** after Phase 4: full learner→coordinator loop works end-to-end on seed data.
- **RC3** after Phase 5: public site + demo polish ready for judging.
