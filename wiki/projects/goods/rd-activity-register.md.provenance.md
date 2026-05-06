---
title: "ACT-GD R&D Activity Register Provenance"
status: Draft
date: 2026-05-07
type: provenance
tags:
  - provenance
  - r-and-d
  - goods
  - audit
source_packet_id: rd-pack-fy26
canonical_entity: goods
---

# ACT-GD R&D Activity Register — Provenance

## Purpose

- Output: R&D activity register for project ACT-GD (Goods on Country)
- Intended destination: `wiki/projects/goods/rd-activity-register.md` (canonical) and `thoughts/shared/rd-pack-fy26/act-gd-rd-activity-register.md` (pack via symlink)
- Why generated: FY25-26 R&D Tax Incentive evidence pack assembly per Path C decision (2026-04-27).

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| Git log on `Acurioustractor/act-global-infrastructure` | source-of-truth | 2025-07-01 to 2026-05-07 | Real commit hashes (5610fe3, 0db21ce, b6ca767, 52c9f8b, daa4b9f, bc81ff3, e85cca7, cea9184, 119f479, 36c23b7) |
| `scripts/agents/agent-procurement-analyst.mjs` | source code | current | A1 stub; data-fetch layer; Sonnet tier ≤$0.04 per run; production deployment pending PM2 registration (per stub header comment) |
| `scripts/migrate-goods-demand-signals.mjs` | source code | current | Demand Register migration; idempotent; pattern `COMMUNITY — Goods Demand $XK` |
| Yesterday's handoff `thoughts/shared/handoffs/2026-05-07-end-of-day.md` | handoff | 2026-05-07 | Pipeline panel dedup metrics (97 → 27 unique on ACT-GD; $138.9M → $1.46M weighted) |
| `thoughts/shared/writing/drafts/goods-minderoo-pitch/` | draft pitch | 2026-05-07 (WARN/85 voice grade) | Funder-facing artefact this work supports |
| `wiki/finance/act-money-framework.md` | canonical finance doc | current | R&D refund rate 43.5% [V] |

## Verification Status — dollar figures

| Figure | Status | Evidence | Notes |
|---|---|---|---|
| Total claim AUD $184,500 | **Inferred** | Sum of below | Subject to Money Framework reconciliation |
| Nic Marchesi 25% × $200,000 = $50,000 | **Unverified** | Money Framework decision log 2026-04-15 (cited but not yet in pack) | Org-wide default 25% — at default |
| Ben Knight 10% × $200,000 = $20,000 | **Unverified** | Same | Org-wide default 10% — at default |
| Algorithm engineering contractor $42,000 | **Unverified** | Xero invoices to be back-tagged | Contractor identity not yet committed; line item is a placeholder for whichever vendor delivers the matching algorithm |
| Cloud + LLM consumption $72,500 | **Unverified** | Xero invoices to be back-tagged | Includes Anthropic + Supabase consumption attributable to ACT-GD |
| Salary base $200,000 | **Unverified** | See ACT-CG provenance | Will be re-applied to reconciled basis |
| Refund rate 43.5% | **Verified** | ATO RDTI rate schedule | `wiki/finance/act-money-framework.md` line 49 |

## Verification Status — non-dollar figures

| Figure | Status | Evidence |
|---|---|---|
| Pipeline panel dedup 97 → 27 unique opportunities (ACT-GD) | **Verified** | Yesterday's handoff; reproducible from `/finance/projects/[code]` after commit 119f479 |
| Pipeline weighted $138.9M → $1.46M | **Verified** | Same |
| 9,474 dupes deleted from `grant_opportunities` | **Verified** | Yesterday's session DB ops; partial unique index in DB |
| Manual baseline cohort of 30 buyer-supplier introductions | **Inferred** | Cited in register; specific data-capture method needs documentation pre-lodgement |
| A1 typical run cost ≤$0.04 (Sonnet tier) | **Verified** | `scripts/agents/agent-procurement-analyst.mjs` header comment |
| First-order conversion rate ≥40% | **Predicted** | Pre-experiment estimate |
| A1 top-3 acceptance rate ≥60% | **Predicted** | Pre-experiment estimate |
| Demand Register retention ≥80% | **Predicted** | Pre-experiment estimate |
| Anchor buyers list (12 communities) | **Verified** | `scripts/agents/agent-procurement-analyst.mjs` `ANCHOR_BUYERS` constant |

## Human Decisions / Gates

- Editorial review: pending Ben + Standard Ledger review before lodgement
- Cultural review: **required**. The IPP compliance signal phrasing must be confirmed with First Australians Capital and Supply Nation contacts. The phrase "demand-side infrastructure for First Nations enterprise" must be community-aligned before lodgement to avoid funder-side overclaim.
- Consent review: not applicable to the register itself
- Release approval (to ATO): pending — gated on AusIndustry registration + Money Framework decision log + Xero invoice back-tagging + cultural review
- Funder release (Minderoo Goods pitch is a separate artefact): the pitch lives at `thoughts/shared/writing/drafts/goods-minderoo-pitch/` and has a separate voice-grade gate (WARN/85 as of 2026-05-07).

## Known Gaps And Assumptions

- A1 has not yet entered production. The 8-Monday production-run requirement for measurement of top-3 acceptance rate is open.
- The Demand Register migration script has been dry-run only. The retention rate cannot be measured until production execution.
- The first-order conversion rate against the manual-pair baseline has not been measured. The treatment cohort has not been run because A1 is not yet in production.
- The "algorithm engineering contractor" line ($42,000) is a placeholder. No specific contractor has been engaged. This figure may shift up or down depending on the sourcing decision.
- AusIndustry registration is pending.
- The IPP compliance phrasing is a structural risk: if the activity description claims to "drive IPP compliance" but the actual mechanism is a checkbox interface, the funder-side overclaim risk is real. Standard Ledger or an external R&D consultant should review this before lodgement.

## Reproduction Steps

1. Re-run the commit history filter:
   ```
   git log --since="2025-07-01" --until="2026-06-30" --pretty=format:"%h|%ad|%s" --date=short \
     -- scripts/agents/agent-procurement-analyst.mjs scripts/migrate-goods-demand-signals.mjs apps/command-center/src/app/goods/
   ```
2. Verify the GHL pipelines exist:
   ```sql
   SELECT name, id FROM ghl_pipelines WHERE name ILIKE '%goods%';
   ```
3. Cross-check ACT-GD Xero invoices once tagged:
   ```sql
   SELECT count(*), sum(total) FROM xero_invoices WHERE project_code = 'ACT-GD';
   ```
4. Verify the partial unique index on `grant_opportunities`:
   ```sql
   SELECT indexname, indexdef FROM pg_indexes
   WHERE tablename = 'grant_opportunities' AND indexname = 'grant_opportunities_source_name_uniq';
   ```

## Status

Draft. Will be promoted to `status: final` only after AusIndustry registration, A1 production runs, cultural review, and Xero invoice back-tagging are complete.
