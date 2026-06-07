# Plan: Pipeline consolidation — retire/re-light the legacy pipeline tables (blueprint Phase 4)

> Slug: `pipeline-consolidation`
> Created: 2026-05-27
> Status: draft — awaiting Ben's decisions (marked ⬜ below)
> Owner: Ben + Claude
> Parent: `thoughts/shared/plans/2026-05-26-act-operating-picture-blueprint.md` §6 Phase 4

## Objective

Blueprint Phase 4 says "retire `relationship_pipeline`/`fundraising_pipeline` → `opportunities_unified`."
Investigation shows the two legacy tables are in **different situations**, and the naive "merge both into
opportunities_unified" is only half-right. This plan documents what's actually true and the decisions
needed before any code moves — because two of the 11 affected routes are **money surfaces**
(`/finance/runway`, `/business/scoreboard`) where a wrong column mapping = wrong numbers, and the
schema-contract checker can't catch a semantic mis-map (the columns all exist).

## What's actually true (verified 2026-05-27 against the live shared DB)

**`opportunities_unified` is the canonical, fresh, aggregated READ-model** — 15,549 rows, updated daily by
`scripts/sync-opportunities-to-unified-pipeline.mjs`. It pulls from 6+ sources:

| source_system / type | rows |
|---|---|
| grant_opportunities / grant | 14,326 |
| grantscope / grant | 685 |
| ghl_opportunities / deal | 500 |
| manual / deal+grant+revenue | 21 |
| **fundraising_pipeline** / donation+grant | **14** |
| xero / deal | 2 |

**`fundraising_pipeline`** (14 rows, frozen 2026-03-06) — a manual WRITE-model that **already feeds
opportunities_unified** (its 14 rows are in there as `source_system='fundraising_pipeline'`). So it is
*not* abandoned-dead; it's a low-volume, stale input. The active funding pipeline today is GHL
(`ghl_opportunities`, 500 rows in opps_unified).

**`relationship_pipeline`** (1,170 rows, frozen 2026-03-12) — a **different domain**: a relationship-CRM
kanban with `love_score / money_score / strategic_score / urgency_score / color / next_action`. It is
**NOT a source of opportunities_unified** and `opportunities_unified` has no score columns. Merging it
into opportunities would lose its whole reason for existing. This is a "retire the feature or re-light
its populator" decision, **not** a consolidation.

## Decisions needed (⬜ = needs Ben)

- ⬜ **D1 — fundraising reads → opportunities_unified?** The 6 read routes (below) could read
  `opportunities_unified` filtered to `source_system='fundraising_pipeline'` (or `opportunity_type IN
  ('donation','grant','fundraising')`) instead of the raw table, for one canonical pipeline. But the data
  is 14 stale rows; low payoff. **Recommendation:** yes for consistency, but low priority — do it only as
  part of a broader "all pipeline reads go through opportunities_unified" pass.
- ⬜ **D2 — fundraising WRITE model.** `/api/opportunities` + `/api/opportunities/update` are the CRUD for
  `fundraising_pipeline` (writes then sync to opps_unified). Keep `fundraising_pipeline` as the write-model
  (recommended — opps_unified is derived, never write to it directly), or migrate fundraising CRUD onto
  GHL/another store. **Recommendation:** keep as write-model; don't break it.
- ✅ **D3 — DECIDED (Ben 2026-05-27): KEEP the `/pipeline` kanban.** BUT the investigation found there
  is **no populator** — `relationship_pipeline` was created by migration `20260312000000` (table only,
  no seed) and **nothing in the codebase writes to it**; its 1,170 rows are a one-time March load,
  frozen since. So "make it healthy" is not a re-light (there's no light) — it needs a populator
  **built** (compute `love/money/strategic/urgency` scores per entity from relationship_health +
  opportunities + comms). That's a net-new design task → see **D3a** below. The kanban stays; it shows
  the frozen March snapshot until a populator exists.
- ✅ **D3a — DONE (2026-05-27): built the relationship_pipeline populator.** `scripts/populate-relationship-pipeline.mjs`
  (`--dry-run` default, `--apply` writes) — scope **cultivation + active deals** (Ben): 430 active deals +
  400 top aligned grants + 628 engaged foundations (foundations behind grants we track, not all 11,010).
  Documented score formulas: money=value bucket, urgency=expected_close proximity, strategic=project-align
  + fit, love=relationship_health temperature (0-100 bucketed). **Applied** (cleared 1,170 untouched stale
  auto-rows, inserted 1,458 fresh — verified 0 manual edits to lose) + daily 8am PM2 cron
  `relationship-pipeline-populate` (after pipeline-sync 6:30 + relationship-health 3:15). Manual-edit
  preservation: clears/updates only untouched-auto rows (no `next_action`, no Notion sync, `updated_at`
  within 60s of `created_at`); human-curated cards survive.
  **Known limitation:** `love_score=0` for all — `opportunities_unified.contact_ids` is empty across every
  row, so there's no contact link to pull warmth from. The lookup is built and lights up automatically if
  that field ever populates.
- ✅ **D4 — DONE (2026-05-27): relationship_health re-lit.** Ran `relationship-health.mjs update`
  (refreshed → 1,197 rows, fresh now) + added a daily `15 3 * * *` PM2 cron entry (`relationship-health`)
  to `ecosystem.config.cjs`, `pm2 start` + `pm2 save`. Root cause was the populator was never scheduled
  (only the Fri consumer was).

## Per-route migration map (the 11 refs)

### fundraising_pipeline (6 refs) — if D1 = yes, repoint reads to opportunities_unified
opps_unified mapping: `name→title`, `funder→contact_name`, `amount→value_mid`, `status→stage`,
`probability→probability`, `expected_date→expected_close`, `actual_date→actual_close`,
`deadline→metadata`, `project_codes→project_codes`, `contact_id→contact_ids[]`, filter
`source_system='fundraising_pipeline'`.

| Route | Select today | Surface | Action |
|---|---|---|---|
| `app/api/opportunities/route.ts:52` | full (`id,name,funder,type,amount,status,probability,expected_date,deadline,project_codes,created_at,contact_id`) | opportunities list | read → opps_unified (or keep raw as the write-model's own list) |
| `app/api/opportunities/update/route.ts:123` | **WRITE** | CRUD | **keep `fundraising_pipeline`** (write-model, D2) |
| `app/api/projects/[code]/financials/route.ts:141` | `name,amount,status,project_codes` | project financials | read → opps_unified (⚠️ money surface — verify amount→value_mid) |
| `app/api/business/scoreboard/route.ts:26` | `*` | **exec scoreboard (money)** | read → opps_unified (⚠️ verify all fields used) |
| `app/api/finance/runway/route.ts:65` | `name,amount,status,project_codes` | **runway (money)** | read → opps_unified (⚠️ verify amount→value_mid) |
| `lib/tools/projects.ts:201` | `name,deadline,expected_date,status,project_codes` | bot project tool | read → opps_unified |

### relationship_pipeline (5 refs) — blocked on D3 (retire vs re-light)
| Route | Action (if RETIRE) | Action (if RE-LIGHT) |
|---|---|---|
| `app/api/pipeline/route.ts:13,64` | archive route + `/pipeline` page | re-light populator; no code change |
| `app/api/pipeline/[id]/route.ts:15,36` | archive | no change |
| `app/api/pipeline/search/route.ts:46` | drop the rel-pipeline source from search | no change |

## Risks
- **Money surfaces (runway, scoreboard, project financials):** `amount` (single number) → opps_unified has
  `value_low/value_mid/value_high`. Mapping `amount→value_mid` must be confirmed per route; a wrong choice
  shifts displayed pipeline value. The schema-contract test will NOT catch this (all columns exist).
- **Never write to opportunities_unified** — it's overwritten by the daily sync. Writes go to the source
  table (fundraising_pipeline).
- `fundraising_pipeline` data is 14 rows / stale since March → low value; the migration is about *one
  canonical pipeline*, not fixing live numbers (the live funding pipeline is GHL).

## Recommended sequence (once decisions land)
1. D4 (relationship_health recompute) — cheapest, isolated PM2 entry.
2. D3 (relationship_pipeline) — if retire, archive the 3 `/pipeline` routes + page (like the §H archive).
3. D1/D2 (fundraising reads → opps_unified) — last, lowest payoff; do the money-surface routes one at a
   time with live-data verification of `amount→value_mid`.

## Provenance
- Verified vs live shared DB (`tednluwflfhxyucgwigh`) 2026-05-27: table freshness, opps_unified
  source_system distribution, the 11 route `.from()/.select()` refs, the `ecosystem.config.cjs` cron set.
- relationship_health populator analysis: `scripts/relationship-health.mjs` (only writer, line 288) is
  absent from `ecosystem.config.cjs`; `weekly-relationship-review` (Fri 6pm) only reads it.
- Generated by: Claude (investigation), pending Ben's D1–D4.
