# Archived: dead-table API routes (2026-05-27)

These API routes (and one UI page) query Supabase tables that **no longer exist in the live
shared DB** (`tednluwflfhxyucgwigh`). Each was a silent zero — the query 400s, the UI shows
empty data that *looks* real. Surfaced by the schema-contract checker
(`scripts/check-schema-contract.mjs`, trust-map §H) and archived per the "honest by construction"
P3 phase (`thoughts/shared/plans/2026-05-27-command-center-p3-honest-by-construction.md`, task 2).

`_archived/` is invisible to Next.js routing (underscore-prefixed segment) **and** to the
schema-contract scanner (`SKIP_DIRS`), so these are preserved-but-inert. Baseline 70 → 47.

## What moved here

| Archived path | Dead table(s) |
|---|---|
| `api/agent/autonomy/route.ts` | `agent_autonomy_transitions` |
| `api/agent/learning/route.ts` | `agent_confidence_calibration`, `agent_learnings`, `agent_mistake_patterns` |
| `api/agent/procedures/route.ts` | `procedural_memory` |
| `api/assets/route.ts` | `assets`, `asset_maintenance`, `lodgings`, `properties` |
| `api/business-dev/route.ts` | `business_initiatives` |
| `api/compliance/route.ts` | `compliance_items`, `tracked_documents` (superseded by the file-based compliance calendar, G-audit) |
| `api/debt/route.ts` | `debts`, `debt_payments`, `debt_scenarios`, `properties` |
| `api/notion-agent/trials/route.ts` | `notion_agent_trials`, `v_notion_agent_reliability` |
| `api/pipeline/unified/route.ts` | `opportunity_stage_history` (zero references anywhere) |
| `api/receipts/achievements/route.ts` | `receipt_gamification_stats` |
| `api/subscriptions/alerts/route.ts` | `subscription_alerts` (the `subscriptions` table itself is live) |
| `api/team/route.ts` | `seasonal_demand` |
| `api/webhooks/stripe/route.ts` | `revenue_stream_entries` (Stripe confirmed not wired — Ben, 2026-05-27) |
| `team/page.tsx` | the UI page; fetched only `/api/team`, not in `nav-data.ts` (orphan) |

## Why these and not the other dead-table routes

The trust-map §H Category-1 list was larger. Tracing `lib/api.ts` helper → page consumption showed
**most "dead-table" routes are still fetched by LIVE pages** (they render empty sections, but archiving
the route would turn empty → a 404 *error*). Those were **left in place** and reclassified to
fix-don't-archive (Cat-3 column work): `intelligence/actions` (action-feed + quick-stats),
`intelligence/feed/[id]` (intelligence page), `finance/cashflow-explained` (finance/board),
`development/{overview,contacts}` (development page), `knowledge/stats` (ecosystem + knowledge pages),
`communications/pending` (today widget), `receipts/score` (finance/accountant). Their dead-table refs
remain in the schema baseline until the data backend is fixed or the feature is removed deliberately.

## Known leftovers (deferred, not blocking)

- **`app/agent/page.tsx`** still fetches `/api/agent/{autonomy,learning,procedures}` (now archived → 404).
  The page is a 4-panel multi-component file (~830 lines) with one live panel (`/api/agent/proposals`)
  and is not in the main nav (`nav-data.ts`). Those 3 panels were already broken (dead-table 500s →
  now 404s, no user-facing change). Removing the 3 panel components is hygiene deferred to avoid risky
  surgery; do it when next touching that page.
- **Dead `lib/api.ts` helpers** (`getAssets`, `getBusinessDev`, `getCompliance`, `getDebt`,
  `getReceiptAchievements`, `getSubscriptionAlerts`, `getTeam`) — HTTP `fetch()` wrappers (not Supabase
  queries, so invisible to the schema checker), zero callers. Left as dead code; prune opportunistically.

## How to restore

```bash
cd apps/command-center/src/app
git mv _archived/2026-05-27-dead-table-routes/api/<route> api/<route>
# (and team/ for the page) — then recreate the missing table(s) first, or the route 400s again.
```
The underlying tables must exist again for a restored route to return data.
