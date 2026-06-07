---
title: Notion page inventory — money / four-lanes / soul-stack pages
slug: notion-page-inventory-money-stack
status: active
date: 2026-05-07
tags: [decision, notion, inventory, money, four-lanes, soul-stack]
audience: [Ben, Nic, Claude]
---

# Notion page inventory — money / four-lanes / soul-stack

The pile of Notion pages built in service of the money + soul-stack work. Built up across many sessions; this doc catalogues them in one place so alignment can happen before Ben goes to list/share/finalise.

Companion doc: `wiki/decisions/notion-page-policy.md` (which pages are read-only vs editable).

All page IDs live in `config/notion-database-ids.json`. Below: the **25 money/finance/soul-stack pages**, grouped by role.

## 1. The hub

| Key | Role | Owner script |
|---|---|---|
| `moneyFramework` | The top-level money dashboard. Hub for everything below. KPI callouts (bank, runway, FY26 net, days to cutover), nav grid linking out to every sub-page. | `sync-money-dashboard-hub.mjs` |

## 2. Cash + forecasting

| Key | Role | Owner script |
|---|---|---|
| `cashForecast` | 13-week + 24-month cash projection. | `sync-cash-forecast-to-notion.mjs` |
| `cashScenarios` | Base / Upside / Downside scenarios with explicit drivers. | `sync-cash-scenarios-to-notion.mjs` |
| `budgetActual` | Budget vs actuals each month. | `sync-budget-vs-actual-to-notion.mjs` |

## 3. KPIs + metrics

| Key | Role | Owner script |
|---|---|---|
| `kpisPage` | KPI page with the tracked numbers. | `sync-kpis-to-notion.mjs` |
| `moneyMetricsDb` + `moneyMetricsDataSource` | Database of metric snapshots over time. | `sync-money-metrics-to-notion.mjs` |

## 4. Money in / out alignment

| Key | Role | Owner script |
|---|---|---|
| `moneyInAlignment` | Money-in (revenue, grants, invoices) reconciled against project + claim. | (linked from hub; built piecemeal) |
| `moneyOutAlignment` | Money-out (spend, R&D-eligible, pile classification) reconciled. | (linked from hub) |

## 5. Pile mix (Voice / Flow / Ground / Grants)

| Key | Role | Owner script |
|---|---|---|
| `pilePage_voice` | Voice pile detail (recurring revenue from work that is voice-led). | `sync-pile-pages-to-notion.mjs` |
| `pilePage_flow` | Flow pile detail (services + sponsorship pipeline). | same |
| `pilePage_ground` | Ground pile detail (asset / Country-based earnings). | same |
| `pilePage_grants` | Grants pile detail (grant pipeline + active rounds). | same |

## 6. Decision + action logs

| Key | Role | Owner script |
|---|---|---|
| `decisionsLog` + `decisionsLogDataSource` | Money-related decisions log. | `sync-money-dashboard-hub.mjs` (links + creates rows) |
| `actionItems` + `actionItemsDataSource` | Money-related action items. | same |

## 7. Stakeholders + foundations

| Key | Role | Owner script |
|---|---|---|
| `stakeholders` + `stakeholdersDataSource` | People who hold money relationships (funders, accountants, advisors). | `sync-money-dashboard-hub.mjs` |
| `foundationsDb` + `foundationsDbDataSource` | Foundation/funder profiles for outreach + pipeline. | same |
| `ledgerQA` + `ledgerQADataSource` | Standard Ledger Q&A log (accountant questions + answers). | same |

## 8. Opportunities + grants

| Key | Role | Owner script |
|---|---|---|
| `opportunitiesDb` + `opportunitiesDataSource` | All funding opportunities (grants + non-grant) tracked here. | `sync-opportunities-to-notion-db.mjs` |
| `grantPipeline` | Grant-specific pipeline view. | (linked, not directly written) |

## 9. Entity migration

| Key | Role | Owner script |
|---|---|---|
| `entityHub` + `entityHubDataSource` | Sole-trader → Pty cutover hub: 30 Jun 2026 checklist, status per item, drafts. | `sync-entity-hub-to-notion.mjs` |

## 10. Strategy + cadence

| Key | Role | Owner script |
|---|---|---|
| `cy26StrategyPlan` | The CY26 strategy plan in Notion (synced from `thoughts/shared/plans/`). | `sync-strategy-doc-to-notion.mjs` |
| `planningRhythm` | Daily / weekly / quarterly planning rhythm doc. | `sync-planning-rhythm-to-notion.mjs` |
| `weeklyDigest` | The Monday weekly digest landing page. | (target of the digest cron, not yet auto-written) |
| `moneySyncPage` | The free-form Money Sync working page (capture). Friday Digest reads from it. | `init-money-sync-page.mjs` |

## 11. Soul-stack four-lanes card

| Key | Role | Owner script |
|---|---|---|
| `fourLanesCard` (NOT YET CREATED) | Soul-stack live card: Q snapshot of To Us / To Down / To Grow / To Others + LCAA-by-spend ratio + soul-check. | `sync-four-lanes-card-to-notion.mjs` (shipped 2026-05-07, fail-soft until page id added) |

## 12. Finance design / walkthrough

| Key | Role | Owner script |
|---|---|---|
| `financeOverview` | High-level finance overview page (likely overlap with `moneyFramework`). | (linked from hub) |
| `financeSurfaceDesign` | Design notes on what each finance page should carry. | (manual, not auto-synced) |
| `dashboardWalkthrough` | A walkthrough explaining the dashboard for a viewer. | (manual) |

---

## Where alignment is needed before Ben lists / shares

**1. Hub-page redundancy.** `moneyFramework` and `financeOverview` may overlap. Decide which is the front door and link the other under it. Same for `weeklyDigest` and the Friday-Digest workflow.

**2. Pile-mix sync state.** Memory has the pile mix as a target FY27 ratio (Voice/Flow/Ground/Grants). The four `pilePage_*` pages were built but I haven't verified what each currently shows vs the target. Before sharing, check that each pile page renders today's actual mix + the FY27 target side by side.

**3. Money-in/out alignment vs alignment-loop syntheses.** `moneyInAlignment` and `moneyOutAlignment` are Notion-side dashboards, but the canonical truth lives in `wiki/synthesis/funder-alignment-YYYY-MM-DD.md` (Q1 of the alignment loop). Decide whether the Notion pages mirror the synthesis output or carry their own narrative.

**4. Decision + action logs vs `wiki/decisions/`.** `decisionsLog` in Notion vs `wiki/decisions/*.md` in the repo. Both are decision stores. The repo is canonical for load-bearing facts (`act-core-facts.md`, this inventory, the policy doc); Notion is the working layer. Make sure the same decision isn't tracked in both with different states.

**5. Foundations DB vs `wiki/narrative/funders.json`.** Notion's `foundationsDb` is the working CRM-ish view; `funders.json` is the canonical narrative source. These are designed to differ (one is operational, one is narrative) but the funder list should match. The funder-alignment synthesis (`funder-alignment-2026-05-07.md`) flags 3 funders with paid invoices missing from `funders.json` — same gap likely applies to `foundationsDb`.

**6. Entity hub vs `act-entity-migration-checklist-2026-06-30.md`.** Notion's `entityHub` is the dashboard; the plan is canonical. The 2026-05-07 entity-migration synthesis already cross-references both — but the Notion page may show an older snapshot. Refresh before sharing.

**7. Four lanes card not yet wired.** Until you create the Notion page and add `"fourLanesCard": "<page-id>"` to `config/notion-database-ids.json`, the soul-stack card stays in the wiki only.

---

## What sits outside the money stack (one-liner)

For completeness — the other ~38 keys in `config/notion-database-ids.json` cover: command-center / operations hub / mission-control / live-alerts (operations dashboards), sprint + velocity + weekly-reports + yearly-goals (planning cycles), peopleDirectory + GHL-mirror (relationships), githubIssues + deployments (engineering), contentHub + mukurtuNodeMap (knowledge + cultural), agentArchitecture + notionAiPrompts (Claude/AI infra), subscriptionTracking (subs audit). These are NOT part of the money stack — different process, different alignment work if you want it.

## Maintenance

- Add a row to this doc when a new `sync-*-to-notion.mjs` script ships that's part of the money stack.
- Move a row to `notion-page-policy.md` if a page changes from outbound-only to bidirectional.
- Re-run `git grep "cfg\\." scripts/*.mjs | grep -E "cfg\\.[a-zA-Z]"` if you want to refresh the owner-script mapping in one shot.
