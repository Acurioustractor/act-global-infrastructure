# Youth Justice Visualization Cluster — Recovery Review
Date reviewed: 2026-05-28

## Overview
Three distinct but related features, all telling the same story:
~$19B of Australian youth justice spending over 17 financial years is divided into
four "lanes" — reactive ($15.1B: police/courts/detention), community-led ($470M),
prevention ($90M), unclassified — with a reactive:prevention ratio of roughly 168:1.
The cluster visualizes this disparity in multiple formats.

---

## Sub-feature 1: 3D Temporal Force-Directed Graph

### Route
`/graph/youth-justice-3d`

### What it does
Interactive 3D WebGL force-directed network graph using `react-force-graph-3d`
(dynamically imported with `ssr: false`). Nodes = programs (white) + recipient
organisations (colored by lane). Edges = grant relationships, with animated particles
on links >$1M. Z-axis = year of first funding, so the graph has depth through time
("fly through years" camera animation, 8-second dolly). Filters: state selector,
minimum grant amount slider ($50K default). Left HUD = filters; right HUD = lane
totals + legend; bottom tooltip on hover; click recipient → opens `/entity/[gs_id]`.

### Data
`/api/data/graph/youth-justice-3d` (route.ts). Queries `justice_funding` table
filtered to `topics @> ARRAY['youth-justice']`, aggregated to program×recipient,
joined to `gs_entities` for canonical names/community-controlled flag.
Lane classification is done in TypeScript post-query. Paginates via `exec_sql` RPC.
Data is REAL, not hardcoded. Cached 5 min / 10 min SWR.

### Dependencies
`react-force-graph-3d` v1.29.1 — LISTED in package.json (package exists, but
`node_modules` state in the recovered worktree is unknown — needs `pnpm install`
confirmation). This library pulls in three.js and WebGL. No SSR issues (dynamic import).

---

## Sub-feature 2: Five Static Views (`/graph/youth-justice-views/`)

### Routes
- `/graph/youth-justice-views` — launcher page with 5 cards
- `/graph/youth-justice-views/cityscape` — isometric SVG towers, orgs grouped by state
- `/graph/youth-justice-views/money-river` — 4 vertical pillars filling with cumulative spend, year scrubber + play animation
- `/graph/youth-justice-views/tree-rings` — concentric ring chart, one ring per year, sectors = lanes
- `/graph/youth-justice-views/drain` — vertical funnel showing money loss at each system layer
- `/graph/youth-justice-views/tanks` — two side-by-side liquid tanks (reactive vs prevention) with year scrubber + play animation

### What they do (collectively)
All five consume `useYJSummary` hook → `/api/data/youth-justice-summary`, which returns:
- `top_recipients`: top N orgs by total $, with lane + year range
- `by_year_lane`: year × lane aggregation for time-series animations
- `by_state_lane`: state × lane breakdown
- `totals`: overall summary

The layout CSS hides the global nav for an immersive full-screen experience. Each
view has a "← Five views" back link.

Key design details:
- All are pure SVG (no WebGL). No three.js dependency.
- Cityscape: isometric projection, log-scale tower heights, hover tooltips, click → entity page
- Money River: animated pillars with play/pause, ghost lines showing final value
- Tree Rings: donut chart with year rings, hover reveals year+lane+amount
- Drain: trapezoid funnel, 5 layers from total → reactive → external → community → prevention; estimates reactive external delivery at 30% (explicitly flagged as estimate/synthesised)
- Tanks: side-by-side CSS div tanks on same Y-axis scale to make the contrast visceral

### Data
Same API as above — `/api/data/youth-justice-summary`. REAL data. The Drain uses one
hardcoded estimate (30% of reactive routed to external contractors) — clearly labeled
`~30% — contractors, primes, consultancies (estimated)` in the source.

---

## Sub-feature 3: Scrollytelling Report (`/reports/youth-justice/money-flow`)

### Route
`/reports/youth-justice/money-flow`

### What it does
A long-scroll narrative "investigation" page. Strips the reports layout sidebar and
breadcrumbs via CSS. Five sequential full-viewport sections:

1. **HeroScene** — count-up animation of total spend ($19B), tagline "Most of it didn't go where you think." Triggers on IntersectionObserver entry.
2. **TanksScene** — scroll-driven Chapter 01: two CSS tanks (reactive vs prevention) that fill as user scrolls through ~320vh. Year counter updates. Ratio callout appears at 50% scroll.
3. **DrainScene** — scroll-driven Chapter 02: funnel layers appear one by one across ~420vh of scroll. Active layer card on left updates to show current layer name + $ + loss to next layer.
4. **CityscapeScene** — scroll-driven Chapter 03: isometric cityscape towers grow from 0 to full height across ~300vh. Tallest tower callout appears at 30% scroll.
5. **ClosingScene** — count-up to "Of every $100 in: $X.XX reaches prevention." Ratio. CTAs: → youth-justice report, → five views, → graph.

All scenes reuse `useYJSummary` with `topN: 600`. Hooks: `useInView`, `useScrollProgress`, `useCountUp` (all in `hooks.ts`, all custom, no external lib dependencies). All rendering is CSS/SVG — no WebGL. Layout hides nav via inline `<style>`.

### Data
Same `/api/data/youth-justice-summary` API. REAL data.

---

## API Routes

### `/api/data/graph/youth-justice-3d`
Queries `justice_funding` (topic filter `youth-justice`) + `gs_entities` join.
Returns program+recipient graph nodes with lane, year range, degree.
Uses paginatedRpc via `exec_sql` with 1000-row pages. Max 8000 edges.

### `/api/data/youth-justice-summary`
Queries `justice_funding` (same filter) in 3 queries:
1. Top recipients with dominant-lane assignment (majority-lane per recipient)
2. year × lane aggregation
3. state × lane aggregation

Both APIs use `getServiceSupabase()`, are server-side only, and cache at 5/10 min.

---

## Utility Script
`scripts/record-yj-views.mjs` — Playwright + ffmpeg recorder for the 5 views.
Records tanks/money-river with Play clicked, others static. Outputs MP4 to `videos/`.
Requires dev server on `localhost:3003` + ffmpeg in PATH. Not wired into CI.

---

## Wiring Status

**3D graph** (`/graph/youth-justice-3d`): **ORPHANED**. The `/graph` index page has
no link to it. Only accessible by direct URL. The 3d client back-links to `/graph`
(not to the five views), suggesting it was conceived as a separate entry point.

**Five views** (`/graph/youth-justice-views`): **ORPHANED**. No link from `/graph`
index or nav. Self-contained with internal navigation. Closing scene of money-flow
scrollytelling links HERE (`"Explore all 5 views"`), which provides one entry point
IF the scrollytelling is also reachable.

**Scrollytelling** (`/reports/youth-justice/money-flow`): **ORPHANED**. `/reports/youth-justice`
is referenced in places/[postcode] + entity pages, but `money-flow` sub-route is not
linked from anywhere except its own layout. No link from the parent youth-justice
report index.

**`record-yj-views.mjs`**: Standalone script, not connected to any CI or PM2.

---

## Completeness Assessment

| Sub-feature | Status | Blockers |
|-------------|--------|----------|
| 3D graph | **Functional, needs `pnpm install`** | `react-force-graph-3d` must be installed; no nav link |
| Five views | **Complete** — all 5 views render with real data | No nav link; orphaned |
| Scrollytelling | **Complete** — all 5 scenes + CTAs | No nav link from parent report |
| Summary API | **Complete** | None |
| 3D API | **Complete** | None |
| record-yj-views script | **Complete** | Needs dev server + ffmpeg |

The Drain view uses one synthesised data point (30% external delivery estimate)
that is labeled as an estimate in the source but presented without footnote in the UI.
This is a minor data-transparency issue for publication.

---

## Duplicate / Competing Versions

There is intentional duplication but NOT competition:
- The **scrollytelling** (`/reports/youth-justice/money-flow`) embeds simplified
  scroll-driven versions of 3 of the 5 views (tanks, drain, cityscape) as narrative
  chapters. The narrative versions are designed for emotional impact; the standalone
  views (`/graph/youth-justice-views/*`) are designed for exploration.
- The **3D graph** is a wholly different format (network topology vs. aggregate charts)
  and serves a different analytical purpose.
- No two routes render the exact same thing in the same way. These are complementary,
  not redundant — but the hierarchy is unclear (no linking between 3D and five-views).

---

## Practical Value

**Audience**: Policy advocates, journalists, funders, CivicScope/GrantScope report readers.
Specifically designed for external publication — the scrollytelling is a journalism-grade
investigation piece; the five standalone views are shareable/embeddable evidence tools.

**Value to ACT/CivicScope**:
- The scrollytelling is publication-ready if deployed and linked. It is polished,
  uses real data, and communicates a compelling systemic inequality argument.
- The five views are strong standalone evidence artefacts (especially Tanks and Drain).
- The 3D graph is an expert/analyst tool — cool but less accessible to general audiences.
- The `record-yj-views.mjs` script could produce short-form video assets for social/advocacy.

**What's blocking value delivery**: entirely nav/discoverability. The code is done.
Three missing links (from `/graph` → 3D, from `/graph` → five-views, from
`/reports/youth-justice` → money-flow) are all that separates this from being live.
