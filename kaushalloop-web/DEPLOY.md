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

1. **Convex**: `npx convex deploy` (or link a project) → note the `CONVEX_URL`.
2. **Auth**: before going public, replace the `DEV_AUTH` shim with real ConvexAuth
   (see `kaushalloop-convex/CONVEX_AUTH.md`) and **do not** set `DEV_AUTH=1` on prod.
3. **Vercel**: import the `kaushalloop-web` repo, set env var
   `NEXT_PUBLIC_CONVEX_URL=<your Convex URL>`, deploy. (The `@convex/*` tsconfig path
   alias assumes the two repos sit side by side; for a standalone web deploy, either
   vendor the generated `_generated` or run `npx convex codegen` against the deployed
   functions during build.)
4. **AI worker (optional)**: deploy `kaushalloop-ai-service` (Dockerfile provided) and set
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
