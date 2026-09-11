# Setu. — Design & Pages Plan

Built with the **design-taste-frontend** skill (anti-slop frontend). Read the scope
note first: this skill governs landing/portfolio/redesign surfaces and is explicitly
**out of scope for dense dashboards**. Setu. therefore splits into two surface
families with one shared design language, one theme, and one accent.

## 0. Assumption & surface split

" The website" is treated as the whole product presence. Two families:

- **A. Public / marketing** (Home, Product, For Institutions, Evidence & Trust) —
  the design-taste skill applies directly (brief inference, layout diversification,
  anti-default discipline, pre-flight).
- **B. Product app** (Coordinator analytics, Learner journey, Auth) — the skill routes
  these to a real design system: **shadcn/ui** (already initialized), following its own
  "one system per project, never ship default state" rule. Only the skill's typography,
  spacing, colour-consistency, and trust/clarity guidance carry over here.

One design system overall (shadcn + Tailwind v4), one accent, one theme. No Material/Fluent
mixing. Lucide icons are accepted because the project already depends on them.

## 1. Design Read (skill §0.B)

- Marketing: *"Institutional ed-tech / B2B landing for placement officers and principals,
  with a trust-first editorial language, leaning on Tailwind v4 + shadcn primitives, a
  single deep-blue accent, and real product screenshots as the hero asset."*
- Product app: *"B2B employability-analytics dashboard for placement coordinators,
  trust-and-auditability-first, leaning on shadcn/ui with low variance, low motion,
  medium-high data density."*

## 2. The Three Dials (skill §1)

| Surface | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |
|---|---|---|---|
| Marketing (Home/Product) | 6 | 4 | 4 |
| Learner journey | 4 | 3 | 3 |
| Coordinator dashboard | 3 | 2 | 5 |

Rationale: buyers are education institutions, not consumers. Trust-first language
overrides "Awwwards-experimental". Motion stays restrained (skill: motion must be
motivated; below >3 it must still respect `prefers-reduced-motion`, which we will).
Dashboard is the densest; marketing is airy and confident.

## 3. Design-system decision (skill §2)

- **shadcn/ui** (radix-nova preset) is the single system. It is the correct reach for
  "modern SaaS where you own the components," and it is already wired.
- Landing is shadcn primitives + Tailwind utilities, customised off default state
  (never stock `bg-white` cards / default radii / Inter defaults).
- **No real system needed for the dashboard beyond shadcn.** Do not add Radix Themes or
  Material on top. Recharts (already installed) for data-viz, styled to the accent.

## 4. Design tokens (already implemented in `src/app/globals.css`)

- Surfaces: off-white `oklch(0.985 …)` background, cards a touch brighter. Never pure #fff/#000.
- Accent: single **deep blue** `oklch(0.44 0.19 264.4)` for primary, focus ring, one chart hue.
- Neutrals: cool zinc/slate/stone family only (LILA rule: no AI-purple, no neon glows).
- Radius scale locked at `0.6rem` app-wide (skill §4.4 shape lock).
- Dark tokens exist and are coherent; **theme lock** (skill §4.11): each page is one mode,
  no per-section inversion. Default light-first.

## 5. Typography, colour, motion rules (skill §4)

- **Sans display, no serif** by default (skill §4.1). Geist Sans for UI, Geist Mono for
  numerals/tabular data (tabular metrics read as trustworthy). No Fraunces/Instrument_Serif.
- Max one accent; body copy in muted zinc; high contrast for AA/AAA on body.
- Button contrast + no-wrap checks on every CTA; no duplicate CTA intent (one "Book a
  cohort demo" label used everywhere on marketing surfaces).
- Data honesty (skill §4.9): every number shown on a demo page is labelled; projections are
  labelled **"projected"**, never "placement impact". No fake-precise stats dressed as fact.

## 6. Sitemap / pages

### 6.1 Marketing (public)
1. **Home** — see §7 section-by-section.
2. **Product / How it works** — the demand→normalise→gap→intervene→verify→outcome loop, deep.
3. **For Institutions** — placement-cell value, cohort outcomes, the data-quality + human-correction story.
4. **Evidence & Trust** (differentiator) — deterministic scoring, provenance, privacy/on-prem, what the system will *not* do (no hiring decisions).
5. **Contact / Book a demo** — single conversion action (the only form).
- Global nav (one line, ≤80px), footer (functional links only, no locale/time/version decoration).

### 6.2 Auth
- Sign in (institution scoping). Keep utilitarian; no marketing hero. Convex Auth wiring later.

### 6.3 Coordinator app (uses the built shell)
- **Overview** (built — KPIs, demand chart, cohort heatmap, outcome funnel, data & trust).
- **Demand** dashboard: skills by frequency/importance with date/location/must-have filters.
- **Cohorts**: cohort heatmap drill-down + intervention planner + what-if simulator.
- **Learners**: roster → learner drill-down (evidence + recommendations).
- **Data quality**: stale records, low-confidence extraction, review queue (ties to the `resolved/unresolved` pipeline notes).
- **Outcomes**: funnel analytics + export.

### 6.4 Learner app
- **Onboarding** (role, geography, experience, consent) — one field per screen, progress honest.
- **Profile evidence**: extracted skills to confirm/correct (claim vs verified wording).
- **Role demand** view; **Gap analysis**; **Action plan** (reason codes + sources); **Assessment** (rubric submission); **Progress timeline**.

## 7. Home page, section-by-section (skill §4.7 layout discipline)

Target ~9 sections, ≥4 distinct layout families, ≤3 eyebrows total, no section-numbering, zero em-dashes, one theme, one accent.

1. **Hero — asymmetric split (not centered).** Left: headline ≤2 lines + ≤20-word subtext + one primary CTA "Book a cohort demo". Right: a **real screenshot of the coordinator dashboard** (a genuine product preview is allowed; a div-built fake is not). Max 4 text elements; no tagline-under-CTA, no micro-strip in the hero.
2. **Trust strip (under hero).** Institution marks as **SVG logos/monograms**, no category labels beneath each. Not text wordmarks.
3. **Problem statement — full-bleed editorial.** Large sans line, no card, no eyebrow. The one-sentence pitch from the spec ("a college can tell students to learn more but cannot show which skills are missing…").
4. **The loop — Bento grid, exactly 6 cells** (Demand, Normalise, Gap, Intervene, Verify, Outcome). ≥2 cells carry a real visual (mini-screenshot/tinted panel), not all white-on-white text tiles. One eyebrow budget here.
5. **Spotlight: demand vs supply** — image/text split (screenshot left).
6. **Spotlight: minimum-effective intervention + what-if** — image/text split (screenshot right). *(This is the 2nd consecutive split; the 3rd split would fail — break with #7.)*
7. **Evidence & trust** — a single wide band: deterministic-not-magical copy + a small diagram of the human-correction loop. Different family.
8. **Outcome funnel** — one wide data visual (real funnel), labelled "demo data". Data-forward, no card.
9. **CTA band + Footer.** One intent ("Book a cohort demo"). Footer: links only, no version/locale/weather decoration.

Images: reuse the built dashboard's screenshots; if any human/context photography is wanted, generate it rather than hand-roll decorative SVG or fake screenshots.

## 8. Dashboard / learner UI rules

- Reuse the shadcn `Sidebar` shell + sticky header already built. Keep variance 3, motion 2.
- Evidence tiers get a **fixed semantic colour scale** (claimed / inferred / assessed / project-proven / verified) used identically on every screen (skill colour-lock).
- Every AI-derived element visibly shows **confidence, source, date, and an edit/correct action** (the trust story, not decoration).
- Label all mock/demo data; projections marked "projected". Never a universal employability score, never a hiring recommendation.
- Empty/loading/error states designed, not skipped (skeleton loaders shaped like the table/card, not spinners).

## 9. Copy voice + banned tells (Setu.-specific)

- Concrete, institutional, no hype verbs (ban: elevate, seamless, unleash, next-gen, revolutionize).
- No generic names/brands; keep the locale-real "Aarav Mehta" / "Northstar Institute".
- No "quietly in use at"-style social proof; plain "Used by" or drop the label.
- No em-dashes anywhere visible (skill §9.G — hard rule).
- Honest framing over magic: the system reports its own limits (freshness, coverage, % inferred, review queue).

## 10. Component inventory

Installed (shadcn): sidebar, card, chart, table, tabs, badge, dialog, dropdown-menu,
tooltip, progress, select, separator, input, sheet, skeleton, avatar, breadcrumb, scroll-area,
sonner, button.
Still to add: **form** (react-hook-form + zod), **popover/calendar**, a small **Stat/Trend**
pattern, a reusable **DataTable** (TanStack Table) for the learner roster and review queue,
**ThemeProvider + mode toggle** (next-themes already installed), and an **EmptyState** component.

## 11. Accessibility & responsive

- WCAG AA body / AAA hero; focus-visible rings use the accent; full keyboard nav for sidebar, tabs, menus.
- `<lg` sidebar collapses to icon rail (`collapsible="icon"`), already wired; tables become horizontal scroll or card lists.
- Heatmap/funnel degrade to stacked bars on mobile; charts get an `aria` data summary.

## 12. Build order (maps to the spec's phases)

1. Finish app theme: add ThemeProvider toggle + Evidence-tier colour scale + DataTable.
2. Coordinator: Demand → Cohort heatmap → Intervention planner + what-if (wire to Convex analytics/gaps/recommendations).
3. Learner: Onboarding → Profile evidence → Gap → Action plan → Assessment → Timeline.
4. Marketing Home (§7) + Product + For Institutions + Evidence & Trust + Contact.
5. Pre-flight pass (§13) + both modes + reduced-motion + clean-env rehearsal.

## 13. Pre-flight gate (skill §14, run per page)

Brief read declared; dials reasoned; one system; one theme (no section inversion); one accent
locked; one radius scale; button + form contrast pass; CTA no-wrap + single intent; **zero
em-dashes**; no serif-as-default; eyebrow count ≤ ⌈sections/3⌉; no 3+ consecutive image/text
splits; bento cell count == content; demo/projection labels present; no fake screenshots or
hand-rolled decorative SVG; real logos for the trust strip; empty/loading/error states;
reduced-motion + dark-mode checked. Any unchecked box means the page is not done.
