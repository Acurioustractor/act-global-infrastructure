---
title: Plans triage proposal — 118 plans → review and mark up
date: 2026-05-08
purpose: Bulk triage of thoughts/shared/plans/ to reach ≤25 active plans. Mark each row with FINAL action.
---

# Plans triage proposal

**118 plans** in thoughts/shared/plans/.
**Status distribution:** review-needed=110, active=7, blocked=1.

## How to use this

Each row has a **suggested action**. Mark up with your final call:
- `KEEP` — leave as active/blocked/monitoring
- `ARCHIVE` — move to thoughts/shared/plans/_archive/2026-05/
- `SUPERSEDED BY <slug>` — supersession chain
- `MERGE INTO <slug>` — consolidate into another plan

Once marked up, run scripts/apply-plans-triage.mjs (TBD) to execute.

## Auto-detected version chains

### `unified-financial-overview` chain (2 plans)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `unified-financial-overview-v2` | 2026-03-27 | review-needed | **KEEP latest** |
| `unified-financial-overview` | 2026-03-21 | review-needed | superseded by `unified-financial-overview-v2` |

## By topic cluster

### finance (23)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `finance-cutover-review-workflow` | 2026-05-05 | active | keep active |
| `bas-perfection-to-annual-plan-roadmap` | 2026-04-24 | review-needed | review — likely active |
| `spending-intelligence-expert-review` | 2026-04-24 | review-needed | review — likely active |
| `spending-intelligence-v4-full-automation` | 2026-04-24 | review-needed | review — likely active |
| `spending-intelligence-system` | 2026-04-20 | review-needed | review — likely active |
| `financial-cockpit-plan` | 2026-03-27 | review-needed | review — likely archive |
| `fy27-financial-strategy` | 2026-03-27 | review-needed | review — likely archive |
| `project-financial-workspaces` | 2026-03-27 | review-needed | review — likely archive |
| `revenue-acceleration-model` | 2026-03-27 | review-needed | review — likely archive |
| `grant-ceremony-and-process` | 2026-03-23 | review-needed | review — likely archive |
| `financial-operations-system-design` | 2026-03-21 | review-needed | review — likely archive |
| `funding-pipeline-strategy` | 2026-03-21 | review-needed | review — likely archive |
| `grantscope-profile-strategy` | 2026-03-21 | review-needed | review — likely archive |
| `project-financial-clarity-review` | 2026-03-21 | review-needed | review — likely archive |
| `xero-agentic-system-and-bas-closeout` | 2026-03-21 | review-needed | review — likely archive |
| `xero-bill-matching-fix` | 2026-03-21 | review-needed | review — likely archive |
| `zero-friction-finance-build` | 2026-03-21 | review-needed | review — likely archive |
| `act-finance-engine-review` | 2026-03-17 | review-needed | review — likely archive |
| `grantscope-notion-bidirectional-sync` | 2026-03-12 | review-needed | review — likely archive |
| `finance-flow-dashboard-plan` | 2026-03-11 | review-needed | review — likely archive |
| `finance-intelligence-system` | 2026-03-11 | review-needed | review — likely archive |
| `financial-review-2026-02-09` | 2026-02-10 | review-needed | archive (Feb cluster, likely stale) |
| `receipt-reconciliation-intelligence-plan` | 2026-02-09 | review-needed | archive (Feb cluster, likely stale) |

### rd_tax (7)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `knight-photography-fy26-invoice-proposal` | 2026-05-05 | active | keep active |
| `act-entity-alignment-2026-04` | 2026-04-24 | review-needed | review — likely active |
| `act-entity-migration-checklist-2026-06-30` | 2026-04-24 | review-needed | review — likely active |
| `rd-tax-incentive-fy26-package` | 2026-03-27 | review-needed | review — likely archive |
| `pty-ltd-transition-and-rd-strategy` | 2026-03-21 | review-needed | review — likely archive |
| `rd-activity-register-fy2025` | 2026-03-21 | review-needed | review — likely archive |
| `rd-tax-incentive-comprehensive-report` | 2026-02-28 | review-needed | archive (Feb cluster, likely stale) |

### minderoo (3)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `minderoo-reloop-50-to-7` | 2026-04-20 | active | keep active |
| `minderoo-verified-candidates-and-contact-enrichment` | 2026-04-20 | active | keep active |
| `minderoo-prototype-strategy` | 2026-04-18 | active | keep active |

### alignment (5)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `act-alignment-loop` | 2026-04-24 | review-needed | review — likely active |
| `alma-health-diagnosis-and-fix` | 2026-04-20 | active | keep active |
| `ecosystem-alignment-launch` | 2026-04-13 | review-needed | review — likely active |
| `projects-alignment-plan` | 2026-04-08 | review-needed | review — likely active |
| `ecosystem-deep-alignment-plan` | 2026-02-10 | review-needed | archive (Feb cluster, likely stale) |

### brain_cockpit (8)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `act-brain-expansion` | 2026-04-25 | review-needed | review — likely active |
| `act-brain-phase-2a-multi-repo-q2` | 2026-04-25 | review-needed | review — likely active |
| `act-ceo-cockpit` | 2026-04-25 | review-needed | review — likely active |
| `act-knowledge-system-idea` | 2026-04-08 | review-needed | review — likely active |
| `catalysing-impact-roadmap` | 2026-03-27 | review-needed | review — likely archive |
| `act-data-sovereignty-charter` | 2026-03-21 | review-needed | review — likely archive |
| `catalysing-impact-strategy` | 2026-03-21 | review-needed | review — likely archive |
| `company-intelligence-layer` | 2026-03-21 | review-needed | review — likely archive |

### goods (6)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `goods-crm-upgrade` | 2026-04-24 | review-needed | review — likely active |
| `goods-agent-architecture` | 2026-04-23 | review-needed | review — likely active |
| `goods-ceo-6-month-plan` | 2026-04-23 | review-needed | review — likely active |
| `goods-ceo-6-month-plan.provenance` | 2026-04-23 | review-needed | review — likely active |
| `goods-civicgraph-review` | 2026-03-21 | review-needed | review — likely archive |
| `goods-opportunity-pipeline` | 2026-03-21 | review-needed | review — likely archive |

### justicehub (1)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `justicehub-revenue-strategy` | 2026-03-06 | review-needed | review — likely archive |

### empathy_ledger (2)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `el-for-organisations-pitch` | 2026-03-09 | review-needed | review — likely archive |
| `empathy-ledger-product-vision` | 2026-02-28 | review-needed | archive (Feb cluster, likely stale) |

### picc (1)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `picc-product-spec` | 2026-02-28 | review-needed | archive (Feb cluster, likely stale) |

### notion (8)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `notion-agent-design` | 2026-03-27 | review-needed | review — likely archive |
| `notion-agent-readiness-audit` | 2026-03-27 | review-needed | review — likely archive |
| `notion-database-audit-and-agent-plan` | 2026-03-21 | review-needed | review — likely archive |
| `notion-custom-agent-instructions` | 2026-03-09 | review-needed | review — likely archive |
| `notion-agents-alignment-strategy` | 2026-02-28 | review-needed | archive (Feb cluster, likely stale) |
| `notion-workers-experiment-plan` | 2026-02-28 | review-needed | archive (Feb cluster, likely stale) |
| `notion-workers-scenarios-flows` | 2026-02-28 | review-needed | archive (Feb cluster, likely stale) |
| `notion-agent-trial-guide` | 2026-02-26 | review-needed | archive (Feb cluster, likely stale) |

### wiki (3)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `wiki-viewer-generator-bugs` | 2026-04-21 | review-needed | review — likely active |
| `wiki-living-library-review` | 2026-04-18 | active | keep active |
| `wiki-hybrid-search` | 2026-04-13 | review-needed | review — likely active |

### website (1)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `act-living-website-build-reset` | 2026-04-20 | review-needed | review — likely active |

### campaigns_grants (9)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `opportunity-landscape-deep-research-2026` | 2026-03-21 | review-needed | review — likely archive |
| `relationship-flywheel-engine` | 2026-03-21 | review-needed | review — likely archive |
| `mannifera-2026-grant-draft` | 2026-03-09 | review-needed | review — likely archive |
| `mannifera-2026-theory-of-change` | 2026-03-09 | review-needed | review — likely archive |
| `pfi-goods-on-country-eoi` | 2026-03-09 | review-needed | review — likely archive |
| `ila-grant-draft-responses-gdoc` | 2026-02-28 | review-needed | archive (Feb cluster, likely stale) |
| `ila-grant-draft-responses` | 2026-02-28 | review-needed | archive (Feb cluster, likely stale) |
| `ila-grant-palm-island-elders` | 2026-02-28 | review-needed | archive (Feb cluster, likely stale) |
| `real-innovation-fund-eoi-draft` | 2026-02-28 | review-needed | archive (Feb cluster, likely stale) |

### agents_tools (4)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `agent-tools-audit-and-consolidation` | 2026-03-21 | review-needed | review — likely archive |
| `ai-innovation-landscape-2026` | 2026-03-21 | review-needed | review — likely archive |
| `autoresearch-round1-synthesis` | 2026-03-21 | review-needed | review — likely archive |
| `batch-api-candidates` | 2026-03-21 | review-needed | review — likely archive |

### comms (1)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `communications-intelligence-system` | 2026-02-09 | review-needed | archive (Feb cluster, likely stale) |

### ops (14)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `act-this-week-2026-04-24` | 2026-04-24 | review-needed | review — likely active |
| `new-entity-xero-launch-playbook` | 2026-04-24 | review-needed | review — likely active |
| `act-fear-setting-2026-04-20` | 2026-04-20 | review-needed | review — likely active |
| `pipeline-autopilot` | 2026-03-27 | review-needed | review — likely archive |
| `command-center-review-2026-03-20` | 2026-03-21 | review-needed | review — likely archive |
| `phase1-sprint-plan` | 2026-03-06 | review-needed | review — likely archive |
| `command-center-v2-plan` | 2026-02-09 | review-needed | archive (Feb cluster, likely stale) |
| `goals-health-monitoring-plan` | 2026-02-09 | review-needed | archive (Feb cluster, likely stale) |
| `layered-memory-system` | 2026-02-09 | review-needed | archive (Feb cluster, likely stale) |
| `learning-system` | 2026-02-09 | review-needed | archive (Feb cluster, likely stale) |
| `mono-repo-consolidation` | 2026-02-09 | review-needed | archive (Feb cluster, likely stale) |
| `realtime-integration-layer` | 2026-02-09 | review-needed | archive (Feb cluster, likely stale) |
| `subscription-discovery-plan` | 2026-02-09 | review-needed | archive (Feb cluster, likely stale) |
| `ux-overhaul-single-dashboard` | 2026-02-09 | review-needed | archive (Feb cluster, likely stale) |

### uncategorised (20)

| Plan | Date | Status | Suggested |
|---|---|---|---|
| `ceo-money-cockpit-2026-05-07` | 2026-05-07 | review-needed | review — likely active |
| `managed-agents-adoption-2026-05-07` | 2026-05-07 | review-needed | review — likely active |
| `supabase-health-2026-04-29` | 2026-04-30 | review-needed | review — likely active |
| `supabase-schema-reorg` | 2026-04-30 | blocked | keep blocked |
| `strategy-from-soul` | 2026-04-28 | review-needed | review — likely active |
| `act-revenue-compendium` | 2026-03-27 | review-needed | review — likely archive |
| `ceo-codebase-review-2026-03-14` | 2026-03-21 | review-needed | review — likely archive |
| `grantscope-strategic-review` | 2026-03-21 | review-needed | review — likely archive |
| `harvest-farm-founder-vision` | 2026-03-21 | review-needed | review — likely archive |
| `ila-letter-act-inkind-support` | 2026-03-21 | review-needed | review — likely archive |
| `ila-letter-allan-palm-island` | 2026-03-21 | review-needed | review — likely archive |
| `ila-letter-elders-group` | 2026-03-21 | review-needed | review — likely archive |
| `ila-letter-picc-financial-support` | 2026-03-21 | review-needed | review — likely archive |
| `ila-quote-benjamin-knight-act` | 2026-03-21 | review-needed | review — likely archive |
| `ila-quote-james-davidson` | 2026-03-21 | review-needed | review — likely archive |
| `innovation-studio-research-2026` | 2026-03-21 | review-needed | review — likely archive |
| `mounty-yarns-cost-breakdown` | 2026-03-21 | review-needed | review — likely archive |
| `nonprofit-discount-tracker` | 2026-03-21 | review-needed | review — likely archive |
| `act-ecosystem-runway-strategy` | 2026-03-06 | review-needed | review — likely archive |
| `INDEX` | 2026-02-09 | review-needed | archive (Feb cluster, likely stale) |

## Summary counts

- Plans in version chains: 2
- Plans by topic: uncategorised=20, alignment=5, brain_cockpit=8, rd_tax=7, ops=14, finance=23, website=1, agents_tools=4, comms=1, empathy_ledger=2, goods=6, campaigns_grants=9, justicehub=1, minderoo=3, notion=8, picc=1, wiki=3
