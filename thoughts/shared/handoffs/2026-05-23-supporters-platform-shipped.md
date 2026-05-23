# Handoff — Supporters platform shipped (2026-05-23)

**Commit:** `07c7336` on `main`, pushed → Vercel auto-deploys to https://command.act.place

## What ships in this commit

### Three new command-center surfaces

| URL | What |
|---|---|
| **`/supporters`** | 158 supporters (was 53). Tier + paid + outstanding + open opps + last touch + briefs. Filter by project / tier / search / needs-reply. CSV export. Drilldown drawer per row. |
| **`/finance/projects/[code]`** | Adds 3 panels: GHL Pipelines · Supporters funding this project · Funder Briefs (Snow + QBE) |
| **`/finance/overview`** | Adds Supporters glance card with needs-reply + critical-outstanding counts |

### Five new Supabase tables/views

- `supporters_intelligence` — extended to 158 rows (Xero ACCREC + RECEIVE + GHL-tagged)
- `project_pipelines` — 49 rows of (project × pipeline) rollup
- `supporter_comms_summary` — 807 rows of per-domain communications summary
- `funder_briefs` — 2 seeded (Snow × Goods, QBE × Goods)
- `v_project_pipeline_totals` view

### Daily cron schedule (PM2)

```
06:00  supporters-intelligence      build-supporters-intelligence.mjs
06:05  supporters-to-notion         sync-supporters-to-notion.mjs --apply
06:10  project-pipelines            build-project-pipelines.mjs
06:15  supporter-comms              build-supporter-comms.mjs
07:15  supporters-nudge             nudge-supporters-critical.mjs
```

### GHL push-back done

184 contacts tagged in GHL with `project:ACT-GD` / `project:ACT-CE` / etc. Manifest at `thoughts/shared/handoffs/ghl-pushback-manifest-2026-05-23.json` — supports `--revert` via `pushback-ghl-project-tags.mjs`. 25 stale contacts soft-deleted with `gone-from-ghl-2026-05-23` tag.

### Funder briefs — QBE-HQ pattern generalised

Two seeded:
- **Snow Foundation × ACT-GD** — WARN alignment, 7 open asks from Sally's Feb 2026 review, $120K ask, 2026-03-15 next-due (overdue)
- **QBE × ACT-GD** — PASS alignment, 4 open asks, cohort intake submitted, Notion HQ linked

Pattern documented at `thoughts/shared/plans/funder-briefs-overlay-2026-05-23.md`. To add new briefs: edit `scripts/seed-funder-briefs.mjs`, copy a block, run.

## Numbers (post-deploy)

- 158 supporters total: 64 PAID · 4 OUTSTANDING · 20 WARM · 62 PROSPECT · 8 COLD
- $1.61M lifetime paid · $602K outstanding · $340K open opps
- 3 CRITICAL outstanding (Centrecorp $265K, Snow $132K, Rotary $82.5K)
- 7 supporters needs-reply (waiting_for_response ≥ 3 or CRITICAL silent 14d+)
- 9 GHL pipelines · 491 opportunities · $146M correctly classified as WATCH (research watchlist)

## What needs human attention next

| # | Item | Why |
|---|---|---|
| 1 | Add Minderoo × ACT-GD brief | $900K Lucy Stronach ask — pattern ready, just need to fill in |
| 2 | Add Centrecorp × ACT-GD brief | 107 beds approved Jan 2026, $265K outstanding |
| 3 | Verify "needs reply" supporter count tomorrow | Telegram nudge fires 07:15 — confirm working |
| 4 | Resolve 21 untagged grants ($1.05M) | `supabase WHERE project_code IS NULL` — human review needed |
| 5 | Resolve bed-count discrepancy (369 vs 389 vs 140) | Snow review noted — affects QBE + Snow narrative |
| 6 | Build /briefs index page | If Path A scales: a single page listing all briefs across funders/projects |

## Files added in this commit

```
apps/command-center/src/app/api/funder-briefs/route.ts
apps/command-center/src/app/api/supporters/route.ts
apps/command-center/src/app/supporters/page.tsx
apps/command-center/src/components/finance/SupportersGlanceCard.tsx
scripts/backfill-grant-project-codes.mjs
scripts/build-project-pipelines.mjs
scripts/build-supporter-comms.mjs
scripts/clean-stale-ghl-contacts-from-manifest.mjs
scripts/nudge-supporters-critical.mjs
scripts/pushback-ghl-project-tags.mjs
scripts/seed-funder-briefs.mjs
thoughts/shared/plans/funder-briefs-overlay-2026-05-23.md
thoughts/shared/plans/ghl-pipelines-supporter-integration-2026-05-23.md
thoughts/shared/handoffs/ghl-pushback-manifest-2026-05-23.json
```

## Files modified

```
apps/command-center/src/app/api/finance/projects/[code]/route.ts
apps/command-center/src/app/finance/overview/page.tsx
apps/command-center/src/app/finance/projects/[code]/page.tsx
apps/command-center/src/lib/nav-data.ts
ecosystem.config.cjs
scripts/build-supporters-intelligence.mjs
scripts/sync-supporters-to-notion.mjs
```

## How to verify deploy

```bash
# Vercel auto-deploys from origin/main — wait ~3 min then:
curl -s https://command.act.place/api/supporters | python3 -c "import json,sys; print(json.load(sys.stdin)['summary'])"
# Expect: total=158, criticalOutstanding=3, needsReply=7
```

## Resume entry point for next session

```
/clear → read this handoff → check command.act.place/supporters renders → continue
```
