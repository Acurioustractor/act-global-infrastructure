---
title: wiki/finance — index
status: active
date: 2026-05-09
last_verified: 2026-05-09
purpose: Map of every page in wiki/finance/ so the brain knows the money. Read this first if you arrived cold.
---

# wiki/finance — what lives here

The brain's finance source-of-truth layer. Live operational data lives in the Command Center at `/finance/overview` and `/finance/money-alignment` — these pages capture the **thinking, decisions, and structure** that frame those numbers.

## Read first (if you arrived cold)

| File | What it holds |
|---|---|
| [act-money-framework.md](./act-money-framework.md) | **Canonical working document.** The unified ACT money strategy — Voice/Flow/Ground/Grants pile mix, FY27 target, concentration rules. Updated with Standard Ledger + R&D consultant in the loop. |
| [knight-family-act-pay-and-entity-setup.md](./knight-family-act-pay-and-entity-setup.md) | Bridge from Knight Finances into ACT: Ben/Carla/children pay setup, Knight Family Trust role, Knight Photography routing, PSI guardrails, Witta/Harvest/Farm wealth path. |
| [fy26-27-money-philosophy-and-plan.md](./fy26-27-money-philosophy-and-plan.md) | Working strategy: how the money should move, what the founders are paid, what gets reinvested. |
| [sole-trader-pty-cutover-strategy.md](./sole-trader-pty-cutover-strategy.md) | The 30 Jun 2026 cutover plan from sole trader to A Curious Tractor Pty Ltd. Companion to `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`. |

## R&D Tax Incentive (Path C, FY25-26 claim)

| File | What it holds |
|---|---|
| [rdti-claim-strategy.md](./rdti-claim-strategy.md) | The actual R&D claim strategy + CPA conversation prep. Action: founders invoice retroactively + receipt backlog cleanup. |
| [founder-pay-and-rd-thesis-fy26-fy27.md](./founder-pay-and-rd-thesis-fy26-fy27.md) | Founder pay structure + R&D-claimable allocation thesis (Live working thesis). |
| [money-framework-decision-log-2026-04-15.md](./money-framework-decision-log-2026-04-15.md) | Decision log for R&D salary allocations (draft). |

## Thesis discussion (with Standard Ledger + Nic)

| File | What it holds |
|---|---|
| [act-money-thesis-discussion.md](./act-money-thesis-discussion.md) | Full discussion document — for Ben + Nic + Standard Ledger to walk through together. |
| [act-money-thesis-rebuttal.md](./act-money-thesis-rebuttal.md) | Adversarial review of the founder-pay-and-rd thesis. Flags Subdiv 328-G, small business CGT, IPP JV, PSI/PSB, realistic R&D refund range. |
| [five-year-cashflow-model.md](./five-year-cashflow-model.md) | FY26 actuals + FY27-30 projections supporting the five-year plan (working draft). |

## Operational analysis

| File | What it holds |
|---|---|
| [fy26-voice-flow-gap-analysis.md](./fy26-voice-flow-gap-analysis.md) | Live finding: where the Voice/Flow pile mix sits vs target, and what conversation it forces with Nic. |
| [ghl-cleanup-and-fill-2026-05-06.md](./ghl-cleanup-and-fill-2026-05-06.md) | GHL pipeline hygiene findings + round-1 fixes applied. |
| [ghl-pipeline-hygiene-2026-05-06.md](./ghl-pipeline-hygiene-2026-05-06.md) | Companion: full GHL pipeline review + actions. |

## Tooling + dashboards (the surface that displays the money)

| File | What it holds |
|---|---|
| [act-money-agent-architecture.md](./act-money-agent-architecture.md) | Architecture + how to use the money agents (act-money-brain plugin). |
| [notion-finance-surface-design.md](./notion-finance-surface-design.md) | Spec for the Notion workspace design (the "front door" for money). |
| [notion-dashboard-walkthrough.md](./notion-dashboard-walkthrough.md) | User-facing setup guide for the Notion finance dashboard. |
| [notion-ai-prompts.md](./notion-ai-prompts.md) | Reference card — useful Notion AI prompts for the money workspace. |

## Where the live numbers live (NOT here)

| Surface | Path | What it shows |
|---|---|---|
| Command Center cockpit | `/finance/overview` | Bank balance, founder pay, receipt automation, 7-pill anchor strip |
| Command Center alignment | `/finance/money-alignment` | Pile mix vs target, concentration risk, recommendations |
| Notion money dashboard | `moneyFramework` page | Front door for stakeholders (Standard Ledger, R&D consultant) |
| Telegram weekly digest | Mon 8am | `weekly-reconciliation.mjs` output: voice scan, R&D pack score, money status |
| R&D evidence pack | `thoughts/shared/rd-pack-fy26/` | 4 registers (ACT-CG, ACT-EL, ACT-GD, ACT-JH) + provenance sidecars |

## Edit policy

Files in this directory hold **structural decisions and working documents**, not live numbers. If a file contains a $ figure, it should:
1. Cite its source (table / API / report)
2. Carry a `last_verified` date
3. Link to the live surface that supersedes it

For live numbers, point readers to `/finance/overview` rather than copy-pasting that day's value.

## Related

- [Sole trader → Pty cutover plan](../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md) (30 Jun 2026)
- [act-core-facts.md](../decisions/act-core-facts.md) (entity, key people, naming source-of-truth)
- [Strategic decisions log](../decisions/strategic-decisions-log.md)
