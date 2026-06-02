---
title: ACT Ecosystem Connective Tissue — analytics + funnel + SEO across all sites
date: 2026-06-02
owner: Ben
status: active
related:
  - wiki/decisions/act-site-form-alignment.md
  - wiki/decisions/act-ghl-operating-strategy.md
  - thoughts/shared/handoffs/2026-06-02-act-ghl-website-alignment-handoff.md
decision: "First slice = Hub + mirror first (this repo, unblocked). Chosen 2026-06-02."
---

# ACT Ecosystem Connective Tissue

Wire analytics + funnel + SEO across all 7 ACT sites into one connected system, so
belonging (not sales) is measurable end-to-end: who arrived, from where, what they
did, how they moved through a project's journey, and their consent state — unified
in command-center. "Deep connective tissue" = the six layers below.

## Verified ground truth (2026-06-02 — do NOT rebuild these)

**Live sites (Vercel team `benjamin-knights-projects`):**
act.place→`act-regenerative-studio` · civicgraph.app→`grantscope` (= CivicGraph) ·
www.goodsoncountry.com→`goods-on-country` · www.justicehub.com.au→`justicehub` ·
www.theharvestwitta.com.au→`the-harvest` · www.empathyledger.com→`empathy-ledger-v2` ·
wiki.act.place→`act-global-infrastructure` (this repo).

**Every sub-site runs its OWN GHL integration into the same location
(`agzsSZWgovjwgpcoASWG`)** with its own tags. act.place is the only one on the
namespaced `/api/forms/submit` → `projectCode` scheme.

**The GHL→Supabase mirror ALREADY EXISTS and is heavily used** (Layer 3 — mostly done):
- Tables: `ghl_contacts` (273 refs), `ghl_opportunities` (119), `ghl_pipelines`,
  `ghl_sync_log`, `ghl_tags`, `ghl_contact_sync`. Instance: shared `tednluwflfhxyucgwigh`.
- Real-time: `apps/command-center/src/app/api/webhooks/ghl/route.ts` →
  `lib/webhooks/ghl-handler.ts` handles contact.create/update/delete +
  opportunity.create/update/status_change; captures `ghl_pipeline_id`,
  `ghl_stage_id`, `stage_name`; normalizes GHL-Workflow ("ContactCreate") AND API
  ("contact.create") formats; OCAP field-stripping via `BLOCKED_FIELDS_TO_GHL`;
  signature check on `GHL_WEBHOOK_SECRET`.
- Batch reconcile: `scripts/sync-ghl-to-supabase.mjs`.
- Cross-site precedent: `/api/webhooks/grantscope/stage-change/route.ts` already
  exists (CivicGraph → command-center).
- `/ecosystem` page = infra/connector-health dashboard (NOT a funnel) — sibling, not overlap.

## The six layers

| # | Layer | Status | Phase |
|---|---|---|---|
| 1 | Vercel: Web Analytics + Speed Insights per site; deploy/traffic/Web-Vitals → command-center | new | 1 (feed) + 2 (per-site) |
| 2 | Attribution: UTM + `lead_site` hidden fields on every form → GHL contact | new | 3 (act.place after deploy fix) |
| 3 | Mirror: GHL outbound webhooks → Supabase | **EXISTS** — verify config covers stage-change | 1 (verify only) |
| 4 | Funnel: view→submit→seated→stage timeline; belonging metrics | partial (mirror has the data) | 1 (hub reads it) |
| 5 | SEO: metadata/OG/structured-data/sitemap/robots per site | new | 2 |
| 6 | Hub: command-center "Ecosystem Analytics" surface unifying all sites | new | 1 |

## Phase 1 — Hub + mirror (this repo, UNBLOCKED) ← BUILDING NOW

Goal: a command-center `/analytics` surface that reads the existing GHL mirror and
shows the belonging funnel across projects/sites, plus a Vercel deployment+traffic
feed. No dependency on act.place's blocked deploy.

- [ ] **Schema-first**: confirm actual columns of `ghl_contacts`, `ghl_opportunities`,
      `ghl_pipelines` before writing any query (never assume column names).
- [ ] **Data layer** `lib/analytics/ecosystem.ts`: funnel by pipeline/stage, by
      `project:` tag, contacts by source/`comms:`, consent-state counts, time-in-stage
      (from `ghl_opportunities` stage timestamps / `ghl_sync_log`). Paginate past the
      1000-row cap (memory trap) or aggregate in SQL.
- [ ] **Hub page** `app/analytics/page.tsx`: per-project belonging funnels (5 rungs),
      source/UTM breakdown, consent-state panel, site cards. Belonging metrics, NOT
      sales conversion (redefine "conversion" per §5).
- [ ] **Vercel feed**: deployments + domains + Web-Vitals per project. Via Vercel MCP
      (pending Ben OAuth) or CLI/REST token. Surface deploy health + traffic on the hub.
- [ ] **Verify GHL-side outbound webhook config** (Tier 2 — Ben): confirm Contact
      Created/Updated + **Pipeline Stage Changed** actually POST to `/api/webhooks/ghl`.
      Handler already supports them; batch sync covers gaps. Fill only if missing.
- [ ] tsc clean → build → commit on branch. Deploy = Tier 3 (Ben's verb).

## Phase 2 — Breadth quick-wins (all 7 sites)
Vercel Web Analytics + Speed Insights + SEO baseline (metadata/OG/sitemap/robots) per
repo. One small PR per site; each needs its own deploy (Tier 3, Ben).

## Phase 3 — act.place depth (after deploy fix)
Fix the static-gen timeout (`/projects`,`/art`,`/sitemap.xml` >60s → ISR/runtime), then
UTM+`lead_site` capture on forms + funnel goal tracking. Ships with the held
`wip/forms-projectcode-routing-2026-06-02` branch + PR #50.

## Decision log
- 2026-06-02 — First slice = **Hub + mirror first** (unblocked, this repo). [Ben]
- 2026-06-02 — Ecosystem Journey rungs = Curious→Connected→Member→Active→Steward. [Ben]
- 2026-06-02 — CivicGraph = grantscope repo; site map verified against repos. [Claude, Ben-corrected]

## Guardrails
- Belonging, not sales: no WON/lost framing; consent-state is a first-class metric.
- OCAP: Empathy Ledger storyteller records never funnelled; `care:ocap-gated` respected;
  blocked fields stay stripped (handler already does this).
- Tier discipline: hub/data/code = Tier 1 (build, hold deploy). GHL webhook config =
  Tier 2 (confirm first). Supabase migration apply / deploy = Tier 3 (Ben's verb).
- Schema-first: verify columns before every query (the 1000-row cap + column traps).

## Verification log
- (to fill as Phase 1 lands)

## Changelog
- 2026-06-02 — Plan created; recon established the mirror already exists; Phase 1 scoped to hub + Vercel feed.
