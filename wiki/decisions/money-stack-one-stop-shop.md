---
title: Money stack — one-stop-shop design
slug: money-stack-one-stop-shop
status: active
date: 2026-05-07
tags: [decision, design, notion, money, soul-stack, ux]
audience: [Ben, Nic, Claude]
---

# Money stack — one-stop-shop

How to see everything in the money stack simply, review with little fuss, and stay on top of all of it. Companion docs:

- `wiki/decisions/notion-page-inventory-money-stack.md` — what every page does
- `wiki/decisions/notion-page-policy.md` — which pages are safe to edit
- `thoughts/shared/plans/strategy-from-soul.md` — the soul-stack work order

## The pattern: one front door, three review modes, one command

```
                          ╔════════════════════════════════════════╗
                          ║        moneyFramework (Notion)         ║
                          ║         the only front door            ║
                          ╚════════════════╦═══════════════════════╝
                                           ║
            ┌──────────────┬───────────────┼───────────────┬──────────────┐
            ▼              ▼               ▼               ▼              ▼
      Today's snapshot  Cash + forecast  Pile mix       Pipeline       Cycle work
      ┌─────────┐       ┌─────────┐      ┌─────────┐    ┌─────────┐    ┌─────────┐
      │ four    │       │ cash    │      │ pile_   │    │ opps DB │    │ money   │
      │ lanes   │       │ forecast│      │ voice   │    │         │    │ sync    │
      │ today   │       │ scenarios│     │ flow    │    │ grants  │    │ weekly  │
      │ KPIs    │       │ budget v│      │ ground  │    │ founds  │    │ digest  │
      │ in/out  │       │ actual  │      │ grants  │    │ stake'  │    │ rhythm  │
      │ align   │       │         │      │         │    │         │    │ strategy│
      └─────────┘       └─────────┘      └─────────┘    └─────────┘    └─────────┘
                                           ║
                                           ▼
                                     Logs (decisions, actions, ledger Q&A)
                                     Infrastructure (metrics DB, entity hub, design docs)
```

## The recommended Notion hierarchy

The 25 pages in the money stack should sit in this hierarchy under the **moneyFramework** hub. Today they are mostly flat siblings linked from the hub via `sync-money-dashboard-hub.mjs`. Moving them into a hierarchy lets Notion's sidebar work as a real navigation tree.

**Top: moneyFramework** (the hub — KPI callouts + nav grid, already built)

```
moneyFramework
├── 1. Today's snapshot
│   ├── fourLanesCard            (NEW — soul-stack live card, pending Ben to create)
│   ├── kpisPage                 (KPIs)
│   ├── moneyInAlignment
│   └── moneyOutAlignment
├── 2. Cash + forecasting
│   ├── cashForecast
│   ├── cashScenarios
│   └── budgetActual
├── 3. Pile mix
│   ├── pilePage_voice
│   ├── pilePage_flow
│   ├── pilePage_ground
│   └── pilePage_grants
├── 4. Pipeline
│   ├── opportunitiesDb
│   ├── grantPipeline
│   ├── foundationsDb
│   └── stakeholders
├── 5. Logs
│   ├── decisionsLog
│   ├── actionItems
│   └── ledgerQA
├── 6. Cycle work
│   ├── moneySyncPage            (capture — safe to edit)
│   ├── weeklyDigest
│   ├── planningRhythm
│   └── cy26StrategyPlan
└── 7. Infrastructure
    ├── moneyMetricsDb
    ├── entityHub
    ├── financeOverview          (DEPRECATE — fold into moneyFramework)
    ├── financeSurfaceDesign     (design doc)
    └── dashboardWalkthrough     (onboarding doc)
```

**The DEPRECATE call**: `financeOverview` looks redundant with `moneyFramework`. Move any unique content out, then archive `financeOverview` so it stops being a fork in the road. (Confirm via `audit-notion-money-stack.mjs` once the Notion token is rotated.)

## Three review modes

### A. Daily glance (15 seconds)

Open Notion, go to `moneyFramework`. Read the four KPI callouts at the top: bank balance, runway, FY26 net, days to cutover.

That's it. If everything looks fine, close.

### B. Weekly review (10 minutes, Monday morning)

Two artefacts arrive Monday 8am:

1. **Telegram digest** — `weekly-reconciliation.mjs` runs Monday 8am AEST. Carries: project tagging update, receipt match update, four-lanes snapshot, LCAA-by-spend ratio, soul-check (lane most behind + question), voice scan over recent drafts, R&D pack score.
2. **Updated Notion pages** — Sunday's automated syncs refresh `moneyFramework` body, `weeklyDigest` page, all 17 outbound dashboards. Open Monday morning — they're current.

Click through ONLY into the lane / pile / page the digest flagged. No need to scan everything.

### C. Pre-share / pre-funder check (1 minute)

Before any "share with Nic" or "talk to a funder" moment:

```bash
node scripts/money-status.mjs
```

Runs in 5 seconds (or ~30s if Notion audit is enabled). Output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Money status — 2026-05-07
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Four lanes (90d):  To Us $0 · To Down $461 · To Grow $112,933 · To Others $0
  Alignment:         DRIFT 1 · NOT-WIRED 1 · STALE 0 · IN-SYNC 1 · INFO 1 · DEFERRED 4 · BLOCKED 0
  Notion audit:      (audit skipped — NOTION_TOKEN not set)

  Full report: wiki/cockpit/money-status-2026-05-07.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Three numbers tell you: where the money lanes are, whether anything has drifted, whether Notion is fresh. If all three look fine, share. If anything's red, the full report names the fix.

## The one command

`node scripts/money-status.mjs` is the one command. It composes:

| Step | Component | Cost | Purpose |
|---|---|---|---|
| 1 | `four-lanes-snapshot.mjs` | <1s | Refresh `wiki/cockpit/four-lanes-today.md` from Supabase lane/phase tags |
| 2 | `check-money-stack-alignment.mjs` | <1s | Drift detection: funders.json vs synthesis, entity hub freshness, four-lanes-card wiring |
| 3 | `audit-notion-money-stack.mjs --money-only` | ~30s | Per-page Notion audit: archived / orphaned / stale / fresh — needs working `NOTION_TOKEN` |
| 4 | Aggregator | <1s | Single markdown at `wiki/cockpit/money-status-YYYY-MM-DD.md` + 5-line terminal summary |

Flags:
- `--skip-audit` — skip the slow Notion call, ~3s total
- `--quiet` — minimal terminal output (3 lines)

The terminal lines map to the three review modes above. The full markdown gives you the click-through detail.

## The five-question discipline

Every Monday's review should answer five questions. The one-stop-shop tells you the answer to each:

1. **Where did the money go this week?** → Four-lanes snapshot
2. **Is anything drifted from canonical?** → Alignment check
3. **Are the Notion dashboards fresh, or are some pages going stale?** → Notion audit
4. **What does the soul-check question ask of me right now?** → The Telegram digest's `🌱 *Soul check:*` line
5. **What's the next thing I have to do?** → `actionItems` Notion DB OR Standard-Ledger Q&A log

If you can answer all five in under 10 minutes, the system is doing its job.

## What to do when something is red

| Status | Meaning | Action |
|---|---|---|
| **DRIFT** | A repo-canonical source disagrees with Notion / its sibling | Run the named fix (e.g. add funders to `funders.json`) |
| **NOT-WIRED** | A page or sync was designed but the wire is missing | Add the missing config / env var |
| **STALE** | A synthesis or Notion page hasn't refreshed in >7d | Re-run the relevant sync script |
| **ORPHANED** | A Notion page exists but has no children and hasn't been edited in >30d | Decide: archive, delete, or recover |
| **MISSING** | A cfg key references an id that no longer exists in Notion | Remove the cfg key, or restore the page |
| **DEFERRED** | A check needs the Notion API but token is dead/expired | Rotate `NOTION_TOKEN` in `.env.local` and re-run |

## Cron integration

`money-status.mjs` runs once a day from a GitHub Action (suggested addition to `.github/workflows/`), and the resulting markdown gets posted to the `weeklyDigest` Notion page. Future-Claude task — not yet wired. Today the script is invoked manually before any share moment.

`weekly-reconciliation.mjs` (Monday 8am cron) already runs steps 1+2 internally; it does NOT yet run the Notion audit. Adding the audit step requires the `NOTION_TOKEN` to be rotated in CI secrets first.

## Failure modes to remember

- **Notion token rotation**: when `NOTION_TOKEN` expires (which is happening now per 2026-05-07), every `sync-*-to-notion` and the audit script silently fail or noisily 401. Symptom: weekly review opens Notion and sees stale dashboards. Fix: rotate the token at https://www.notion.so/my-integrations and update `.env.local` + GitHub Actions secret.
- **Schema-version skew**: `synthesize-*` scripts emit `schema_version: 1` in frontmatter (since 2026-05-07). The alignment-check has a fallback for older syntheses but newer scripts will rely on the metric block. If you bump the schema version, update `scripts/lib/synthesis-schema.mjs` AND the parsers in `check-money-stack-alignment.mjs`.
- **Drift between this doc and reality**: when a new page is added to the money stack, update the inventory doc (`notion-page-inventory-money-stack.md`) AND this hierarchy diagram. Otherwise the one-stop-shop reports against an outdated taxonomy.

## Why this is the answer

You asked for "the one stop shop way that we can see everything simply and understand how to review things and align with little fuss but be super on top of all things."

The answer is not a new dashboard, a new database, or a new abstraction. It's three small things working together:

1. **One front door** in Notion (`moneyFramework`) — already built, just needs the hierarchy applied.
2. **One review cadence** (Telegram + Notion every Monday, ad-hoc `money-status.mjs` command) — both already wired, the script shipped 2026-05-07.
3. **One alignment voice** (the alignment check + Notion audit) — drift named explicitly, not buried in twenty pages.

The pages already exist. The data already flows. What was missing was a single command that collapses all of it into a five-line terminal summary you can read before any decision.

That command is `node scripts/money-status.mjs`. That is the one stop shop.
