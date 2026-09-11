# Deploy & run

Three moving parts: the **Next.js web app**, the **Convex backend**, and (optionally) the
**Python AI worker**. For the demo, the web app + Convex backend are enough (skill
normalisation uses the deterministic resolver; the LLM/worker path degrades gracefully).

## Local

```bash
# 1) Convex backend (terminal A)
cd kaushalloop-convex && npm install && npx convex dev
#   -> prints a local URL, e.g. http://127.0.0.1:3210
#   seed the demo:
npx convex run seed:resetDemo '{"confirmation":"KAUSHALLOOP_DEMO_RESET"}'
#   enable the dev identity so queries resolve the seeded coordinator:
npx convex env set DEV_AUTH 1

# 2) Web app (terminal B)
cd kaushalloop-web && npm install
echo "NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210" > .env.local
npm run dev            # http://localhost:3000
```

The coordinator app is at `/`; the marketing site is at `/product`, `/institutions`,
`/evidence`, `/contact`. A static read-only snapshot lives at `/fallback`.

## Production (Vercel + Convex cloud)

This repo is an **npm-workspaces monorepo** (`kaushalloop-web` + `kaushalloop-convex`
as siblings, so the `@convex/*` tsconfig alias resolves; deps hoist to the root
`node_modules`, which is what lets the web build type-check the Convex functions on
Vercel). `kaushalloop-convex/convex/_generated` is committed on purpose.

1. **Convex**: from `kaushalloop-convex/`, `npx convex login` then `npx convex deploy`
   → note the production URL (`https://<name>-<hash>.convex.cloud`).
2. **Seed the prod deployment**:
   `npx convex run seed:resetDemo '{"confirmation":"KAUSHALLOOP_DEMO_RESET"}' --prod`
3. **Demo mode**: for the SIH demo URL, set `DEV_AUTH=1` on the deployment
   (`npx convex env set DEV_AUTH 1 --prod`) so visitors land in the seeded coordinator
   view without a login. This is a shared demo identity, not auth: before any real
   public launch, replace the shim with ConvexAuth (`kaushalloop-convex/CONVEX_AUTH.md`)
   and remove `DEV_AUTH`.
4. **Vercel**: push this monorepo to GitHub → Import Project → set
   **Root Directory = `kaushalloop-web`** → add env var
   `NEXT_PUBLIC_CONVEX_URL=<production Convex URL>` (build-time: redeploy after
   changes) → Deploy. Vercel detects the workspace root and installs at the repo root.
5. **AI worker (optional)**: deploy `kaushalloop-ai-service` (Dockerfile provided) and set
   `AI_SERVICE_URL` / `AI_SERVICE_TOKEN` on the Convex deployment. Enforce the bearer token.

## Health & reset

- Convex: `npx convex run seed:resetDemo '{"confirmation":"KAUSHALLOOP_DEMO_RESET"}'`
  resets to the known demo state. Worked-through scenario = reset, then
  `npx convex run seed:loadDemoScenario '{"confirmation":"KAUSHALLOOP_DEMO_RESET"}'`.
  The in-app **Reset demo** / **Scenario** buttons (coordinator/admin only, enforced
  server-side) run the same mutations and reload the page so stale ids cannot linger.
- Web: `npm run build` must pass; `npm run typecheck` is wired.
- E2E smoke: `npx playwright install chromium && npm run test:e2e`.

## Demo reliability notes

- Precompute/seed so no live LLM call is on the critical path; the main flow works with the
  AI worker offline.
- Demo controls (header, staff-only, also enforced server-side via `requireUser` + role):
  **Reset demo** restores the known state; **Scenario** loads the worked-through state
  (plan started, review queue cleared, failed run retried) for a short demo.
- Rehearse from a clean browser profile and a throttled network: `node scripts/demo-rehearsal.mjs`
  automates the full coordinator journey on Fast 3G (measured 115s vs the 300s budget; per-step
  timings written to `audit_shots/rehearsal-steps.json`). The `/fallback` snapshot is the
  last-resort page if the backend is unreachable (verified with Convex blocked).
- All figures are labelled synthetic/demo; projections are labelled "projected", never
  placement impact.
