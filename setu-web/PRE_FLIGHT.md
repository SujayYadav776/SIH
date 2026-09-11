# Pre-flight (design-taste §14) — Setu.

Status of the final filter across the app + marketing. ✅ automated/verified, 🔎 needs a
manual browser pass, ⏭ deferred.

## Global
- ✅ One theme (light-first) with a coherent dark token set; no per-section inversion.
- ✅ One accent (deep blue) locked across surfaces; evidence tiers are the one sanctioned
  semantic multi-hue scale (documented in `globals.css`).
- ✅ One radius scale (0.6rem) via shadcn tokens.
- ✅ Zero em-dashes in visible copy (grep-checked).
- ✅ Sans display (Geist), no serif-as-default; tabular numerals for metrics.
- ✅ `prefers-reduced-motion` collapses transitions/animations globally.
- ✅ Real imagery via generated on-brand art (no div-fake screenshots); illustrative data
  panels are explicitly labelled.
- ✅ Icons from lucide (project default), one family.

## Marketing
- ✅ Brief read + dials documented in `DESIGN_PLAN.md`; landing = `/product` (§7).
- ✅ ≥4 distinct layout families; no 3 consecutive image/text splits (spotlights separated by
  the funnel band); eyebrow count within budget.
- ✅ Single-intent CTA ("Book a cohort demo"), no wrap, no duplicate intent.
- ✅ Trust strip uses SVG monograms (no category labels under marks).
- ✅ AA contrast of body over art scrims + dark-mode art opacity — verified in browser
  (Playwright sweep, light/dark, 1280 + 375, axe color-contrast rule: 0 violations).
  Fixes landed: heatmap tints capped (cohorts + `/product` panel), light-mode `--evidence-*`
  tokens darkened so badge text clears 4.5:1 on /15 tints.

## App
- ✅ Loading skeletons on every data route; empty states handled.
- ✅ Every AI-derived value shows confidence + source (+ date where present) via
  `ConfidencePill`; correction action available (learner journey).
- ✅ Projections labelled "projected / illustrative", never placement impact.
- ✅ Keyboard: skip link (marketing), focus-visible rings (theme), shadcn menus/tabs/sidebar
  are keyboard-native.
- ✅ Heatmap is now a real `<table>` (scope'd row/col headers + sr-only caption); funnel and
  readiness `Progress` bars carry `aria-label` + `aria-valuetext`; demand chart has an
  sr-only figcaption summary; selectable table rows are keyboard-operable (tabIndex +
  Enter/Space + `aria-current` + focus ring, verified with a real Tab/Enter pass);
  sidebar is a labelled complementary landmark; app skip link added. axe: 0 violations
  across all routes x modes x viewports.
- ✅ Responsive to 375px verified in browser (document horizontal overflow 0px on every
  route at 375, light + dark). Fixes: `min-w-0` on demand grid columns, learner TabsList
  scrolls within its width. Mobile sidebar opens as a labelled Sheet (11 links, screenshot
  verified); heatmap/tables scroll inside their own focusable containers.

## Data / honesty
- ✅ All demo data tagged `synthetic_demo`; reset button reseeds to a known state.
- ✅ No hiring/rejection decision, no universal employability score, no protected-attribute
  inference (prompt + product guardrails).

## Remaining before shipping publicly
- ⏭ Replace `DEV_AUTH` shim with real ConvexAuth (see `setu-convex/CONVEX_AUTH.md`).
- ⏭ Qdrant vector step for skill normalisation (optional; deterministic resolver already ships).
- ⏭ Optional: real in-app screenshots to replace illustrative panels on `/product`.
