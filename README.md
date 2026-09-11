# Setu. (monorepo)

Institutional employability intelligence: demand vs verified learner evidence,
ranked interventions, and measured outcomes. Built for SIH on a synthetic demo
dataset (all figures labelled `synthetic_demo`; projections labelled as such).

## Layout

| Folder | What | Stack |
|---|---|---|
| `setu-web/` | Coordinator app + learner journey + marketing site | Next.js 16, Tailwind 4, shadcn/ui, Convex client |
| `setu-convex/` | Backend: schema, functions, deterministic scoring, demo seed | Convex |

`setu-web` imports the backend through the `@convex/*` tsconfig alias
(`../setu-convex/convex/*`), so the two folders must stay siblings.
This is also why the app deploys from this monorepo with Vercel's root
directory set to `setu-web/`.

## Run locally

```bash
# terminal A - backend (anonymous local deployment at 127.0.0.1:3210)
cd setu-convex && npm install && npx convex dev
npx convex env set DEV_AUTH 1
npx convex run seed:resetDemo '{"confirmation":"SETU_DEMO_RESET"}'

# terminal B - web
cd setu-web && npm install
echo "NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210" > .env.local
npm run dev   # http://localhost:3000
```

## Deploy

See `setu-web/DEPLOY.md`. Verification tooling (re-runnable):

```bash
cd setu-web
node scripts/audit-sweep.mjs      # 60 page-states x light/dark x desktop/375 + axe
node scripts/demo-rehearsal.mjs   # full journey on Fast 3G, clean profile, timed
```

## Demo identity (read before public launch)

The demo uses a server-side `DEV_AUTH=1` fallback that resolves the seeded
coordinator for unauthenticated requests. It is off by default and must never
be enabled outside a throwaway demo deployment. The production auth path is
ConvexAuth - see `setu-convex/CONVEX_AUTH.md`.

<!-- last deploy check: 2026-09-11T11:42:57Z -->
