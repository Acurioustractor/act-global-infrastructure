---
title: GHL pipelines + supporter intelligence integration
slug: ghl-pipelines-supporter-integration-2026-05-23
status: shipped-mvp
canonical_slug: ghl-pipelines-supporter-integration-2026-05-23
created: 2026-05-23
owner: ben
related:
  - act-communication-pipeline-2026-05-23-locked
  - supporters-intelligence-2026-05-23
---

# GHL pipelines + supporter intelligence integration

**TL;DR.** 9 GHL pipelines exist. 491 opportunities, $286M total. Headline: $147M of grant pipeline was untagged — but **141 of 153 untagged grants were bot-scraped ARC/AHO research grants on a watchlist, not actively pursued**. After backfill: real project pipeline is ~$50M across 5 active projects.

## What exists today (verified 2026-05-23)

### Pipelines (9 total, 491 opportunities, $286M)

| Pipeline | Stages | Open | Won | Total $ |
|---|---|---:|---:|---:|
| **Grants** | Identified → In Progress → Submitted → Declined | 212 | 0 | $174.8M |
| **Goods — Demand Register** | Signal | 110 | 0 | $16.0M |
| **Goods — Buyer Pipeline** | Outreach → Proposed → Invoiced → Paid | 19 | 11 | $0.84M |
| **A Curious Tractor** (org-level) | Composting → Germination → Growth → Graduation → Harvest | 7 | 17 | $1.11M |
| **Empathy Ledger** | Identified | 21 | 0 | $0 |
| **Universal Inquiry** | New → Routed → Assessment | 18 | 0 | $0 |
| **Festivals** | Lead → Contacted → Closed | 10 | 0 | $0 |
| **ACT Events** | Invited | 3 | 0 | $0 |
| **Mukurtu Node Activation** | Scoping | 5 | 0 | $0 |

### Per-project pipeline value (post-backfill)

| Project | Open opps | Open $ | Won opps | Won $ | Pipelines |
|---|---:|---:|---:|---:|---|
| **ACT-GD** Goods | 130 | $16,867,671 | 7 | $810K | Goods-Buyer + Goods-Demand + Grants + A Curious Tractor |
| **ACT-HV** Harvest | 47 | $11,965,450 | 0 | $0 | Grants + Universal Inquiry |
| **ACT-CORE** | 16 | $11,376,702 | 9 | $1.08M | Grants + A Curious Tractor |
| **ACT-MR** Mukurtu | 5 | $1,638,692 | 0 | $0 | Grants + Mukurtu Node |
| **ACT-JH** JusticeHub | 6 | $1,080,000 | 0 | $0 | Grants |
| **ACT-CA** | 0 | $0 | 9 | $839K | A Curious Tractor (paid) |
| **ACT-PI** Palm Island | 1 | $100K | 1 | $14K | Grants + A Curious Tractor |
| **ACT-OO** Oonchiumpa | 1 | $100K | 0 | $0 | Grants |
| **WATCH** | 124 | $146M | 0 | $0 | Grants (research watchlist — not active) |

## What changed this session

### 1. supporters_intelligence now includes GHL opportunity data

New columns on `supporters_intelligence`:
- `open_opp_count`, `open_opp_value_aud`
- `won_opp_count`, `won_opp_value_aud`
- `pipelines text[]`
- `latest_stage`, `latest_stage_pipeline`

7 of 53 supporters matched to GHL contacts via email-domain + name-slug fallback. Examples:
- **Snow Foundation**: $271K paid + $132K outstanding + **$132K in open Goods opp + $352K already-won across 6 opps**
- **Centrecorp Foundation**: $123K paid + $265K outstanding + **$84.7K open + $300K won**
- **Dusseldorp Forum**: $16.5K paid + $15K won in A Curious Tractor pipeline

The 46 unmatched supporters either have no GHL contact match or GHL contacts without consistent email-domain naming. **Improvement path**: add manual `ghl_contact_id` override field to `funders.json` for the highest-value supporters.

### 2. New `project_pipelines` table (rollup)

Materialized rollup of GHL opportunities by `project_code × pipeline_name`. Updates daily 06:10am via `build-project-pipelines.mjs`.

Schema:
```sql
project_pipelines (project_code, pipeline_name, open_count, won_count, lost_count,
                   open_value_aud, won_value_aud, earliest_open_at, latest_activity_at,
                   stages_present[], contacts_count, computed_at)
v_project_pipeline_totals — per-project sum across pipelines
```

Reports written to `thoughts/shared/reports/project-pipelines-latest.{json,md}`.

### 3. Watchlist classification (`project_code = 'WATCH'`)

141 bot-scraped ARC/AHO/government research grants ($146M of value) were polluting the "untagged" pipeline. They're scraped opportunities ACT is *not* actively pursuing — created by a watchlist scraper with contact `benjamin+test.*@act.place`.

Tagged as `WATCH` so they:
- Remain searchable
- Don't inflate per-project pipeline value
- Can be reviewed/promoted to active project tracking if any become real opportunities

### 4. New cron: `project-pipelines` (06:10am daily)

Added to `ecosystem.config.cjs` between `supporters-to-notion` (06:05) and existing `notion-daily-focus` (07:00).

## What still needs human attention

| # | Item | Why | Owner |
|---|---|---|---|
| 1 | 21 grant opps still untagged ($1.05M) | Real-but-untagged Grants that don't fit a heuristic | Ben — manual review |
| 2 | 46 supporters with no GHL contact match | Email-domain match misses some — needs `ghl_contact_id` field in funders.json | Future session |
| 3 | ~~Backfill push-back to GHL~~ — **shipped 2026-05-23** | Added `project:ACT-*` tags to 184 linked contacts in GHL. Manifest: `thoughts/shared/handoffs/ghl-pushback-manifest-2026-05-23.json`. Revert: `node scripts/pushback-ghl-project-tags.mjs --revert <manifest>`. 27 failed due to stale contacts (deleted in GHL since last sync). | ✅ done |
| 4 | Goods — Demand Register vs ACT-GD | 109 demand-register entries dominate ACT-GD count — could split | Ben — Notion view |
| 5 | A Curious Tractor pipeline reuse | Org-level pipeline mixed with project pipelines — keep or sunset? | Ben — design call |
| 6 | Empathy Ledger pipeline has only "Identified" stage | Storyteller intake needs proper stages (Identified → OCAP signed → Recorded → Published) | Future session |

## Design decisions logged

| # | Decision | Rationale |
|---|---|---|
| D1 | **Don't create new per-project pipelines** | 9 is already too many. Per-project view via `project_code` filter, not new pipelines. |
| D2 | **Bot-scraped watchlist → `project_code='WATCH'`, not removal** | Keeps history searchable. Filters out of project value. Reversible if any become real opps. |
| D3 | **Match supporters to opps by email-domain + name-slug fallback** | Best-effort. Add `ghl_contact_id` override to funders.json for high-value misses. |
| D4 | **Roll up to `project_pipelines` table daily, not real-time** | Reads cheap. Avoids GHL API hammering. Daily refresh fine for human cadence. |
| D5 | **GHL stays source of truth; Supabase mirrors + augments** | We tag in Supabase, sync back to GHL in a separate dedicated session (Tier 3 write to GHL). |

## Files added/changed

- `scripts/build-supporters-intelligence.mjs` — added paginated GHL contact pull + opp aggregation + multi-key matching
- `scripts/build-project-pipelines.mjs` — new (38 lines + report writer)
- `scripts/backfill-grant-project-codes.mjs` — new (149 updates applied)
- `scripts/sync-supporters-to-notion.mjs` — added 6 new property mappings
- `ecosystem.config.cjs` — added `project-pipelines` cron at 06:10
- `supporters_intelligence` Supabase migration — 7 new columns
- `project_pipelines` Supabase table + `v_project_pipeline_totals` view — new
- Supporters Notion DB — 6 new columns

## Surface map (where to look for what)

| Question | Surface |
|---|---|
| "What's in my supporter pipeline for ACT-GD right now?" | Notion **Supporters** DB → filter "Projects contains ACT-GD" |
| "How much money is in play for ACT-HV?" | `thoughts/shared/reports/project-pipelines-latest.md` § ACT-HV |
| "Who has paid me + has open opps?" | Notion **Supporters** DB → sort "Open opp value AUD" desc, filter Tier=PAID |
| "What pipelines is Snow Foundation in?" | Notion **Supporters** → Snow page → Pipelines column |
| "Show me the watchlist of unpursued grants" | Supabase `ghl_opportunities WHERE project_code='WATCH'` |
| "What untagged grants need human review?" | Supabase `ghl_opportunities WHERE project_code IS NULL` (21 remain) |

## What this unlocks (operational view)

Before: per-project pipeline lived in Ben's head + scattered across GHL UI. To answer "how much grant money is in flight for ACT-HV?" needed a manual GHL query.

After: one Supabase rollup, one Notion view per supporter, one markdown report per project. Refreshes daily. The newsletter pipeline can now answer "which supporters are warm with active opps?" automatically.

Next step worth taking after a break: ACT-GD command-center finance page (`/finance/projects/ACT-GD`) can pull `project_pipelines WHERE project_code='ACT-GD'` and render the pipeline view alongside the spend audit.
