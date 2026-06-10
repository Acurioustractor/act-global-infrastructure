---
title: "BAS, Receipt and Reconciliation Automation Engine Plan Provenance"
status: Draft
date: 2026-06-10
type: provenance
tags:
  - provenance
  - verification
  - audit
source_packet_id: wf_1a52bcc6-f2b
canonical_entity: bas-reconciliation-automation-engine
---

# BAS, Receipt and Reconciliation Automation Engine Plan Provenance

## Purpose

- Output: plan document (`thoughts/shared/plans/2026-06-10-bas-reconciliation-automation-engine.md`)
- Intended destination: working plan for Q4 FY26 BAS automation + 30 Jun Pty cutover; backlog feeds GitHub Issues
- Why it was generated: Ben asked (2026-06-10) for a review of the last 2 quarters of Xero/BAS reconciliation agent work, a full sweep of the Xero API/MCP opportunity, and a workflow + cadence that minimises human steps with no duplicates.

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| Supabase mirror `tednluwflfhxyucgwigh` (`xero_transactions`, `receipt_emails`) | runtime ledger | FY26 2025-07-01..2026-06-10; Q4 2026-04-01..2026-06-10 | Live baseline (section 3): 8 SQL aggregate queries, no row dumps |
| developer.xero.com (banktransactions, bankstatements, attachments, webhooks, oauth2/limits, finance API, bankfeeds) | vendor docs, live scrape | 2026-06-10 | Capability matrix (section 4); pages are live SPAs, not date-stamped |
| github.com/XeroAPI/xero-mcp-server, XeroAPI/Xero-OpenAPI | vendor source | 2026-06-10 | MCP tool coverage; IsReconciled schema flag |
| help.dext.com (Data Health & Insights API) | vendor docs | 2026-06-10 | Dext API verdict: aggregate metrics only, no item-level API |
| blog.xero.com (JAX automatic bank reconciliation) | vendor announcement | updated 2025-11-26, read 2026-06-10 | JAX beta status; no API surface |
| `ecosystem.config.cjs` | repo config | commit state 2026-06-10 | Verified the three unattended Xero-write crons (lines ~497, ~828, ~834) + `xero-project-tag --apply` |
| Memory topic files (xero-q2q3-recon-recode, nab-visa-reconcile-prep, dext-duplicate-resolution, reconcile-autocoding-traps, command-center-finance-truth, eofy-burndown-tracker) + `thoughts/shared/handoffs/money-state-of-play/current.md` | session evidence | Apr–Jun 2026 | Last-2-quarters review (section 1); trap constraints |
| Repo: `scripts/`, `scripts/lib/`, `.claude/skills/{bas-cycle,reconcile-cycle,find-receipt,tag-transactions,scan-subscriptions}`, `~/.claude/skills/reconcile`, `.claude/references/finance-surfaces.md`, `apps/command-center` finance pages | code | 2026-06-10 | Current-state inventory (section 2); surface UX review |

## Verification Status

- `Verified:` baseline metrics 1–6 against the mirror (SQL below); Xero capability claims marked verified-true/false in plan section 4 with source URLs; the three unattended Xero-write cron entries in `ecosystem.config.cjs`.
- `Inferred:` mirror-vs-Xero fidelity of `is_reconciled` and `has_attachments` (known drift; single-GET is the only truth); Q2 BAS lodged values (pending Standard Ledger re-baseline); ~145-action April BAS cycle count (from session records, not re-counted).
- `Unverified:` ACT's Xero app rate-limit tier; `Reference` set/search behaviour on SPEND BankTransactions; `manual%` guard presence in 2 of 3 taggers; JAX toggle availability on ACT's org; statement-CSV stable line IDs. Each is a named pre-build check in the plan's Verification Log — none is load-bearing without it.

## Human Decisions / Gates

- Editorial review: pending (Ben)
- Cultural review: not-required (internal finance ops)
- Consent review: not-required
- Release approval: pending — plan is draft; day-zero cron stop is a Tier 2 ask; all Xero writes stay Tier 3 day-shift

## Known Gaps And Assumptions

- Statement-line matching backlog last counted ~373 — re-baseline before trusting (plan section 1).
- `has_attachments` false means "flag not set", not "no receipt exists"; the 95.3% Spending Intelligence v3 figure uses a receipt-evidence definition, not this raw flag.
- Duplicate candidates (44 groups / 103 txns) include legitimate repeats (per-seat SaaS, split fares); keeper-receipt verification required before treating any as a true dupe.
- Q2/Q3 golden totals cannot be pinned until Standard Ledger rulings land (Q2 revision vs Q4 roll-in, GST basis).
- The Everyday account's $745K unreconciled sum is transfer-dominated; `total` is unsigned (direction lives in `type`).

## Reproduction Steps

1. Workflow run `wf_1a52bcc6-f2b` (15 agents: 7 readers, 3 designers, 3 adversarial verifiers + completeness critic, 1 synthesizer). Script: `~/.claude/projects/-Users-benknight-Code-act-global-infrastructure/4f11fa05-15f3-4e2f-86c3-a98d63c23f65/workflows/scripts/bas-recon-automation-review-wf_1a52bcc6-f2b.js`; full result: task `wiqy80z3a` output.
2. Baseline SQL (run via `mcp__supabase__execute_sql` on `tednluwflfhxyucgwigh`; aggregates are not subject to the 1000-row dump truncation):

```sql
-- Metric 1: FY26 recon state per ACT account
SELECT bank_account, status, is_reconciled, COUNT(*) AS txn_count, ROUND(SUM(total),2) AS sum_total
FROM xero_transactions
WHERE bank_account IN ('NAB Visa ACT #8815','NJ Marchesi T/as ACT Everyday')
  AND date >= '2025-07-01' AND date <= '2026-06-10'
GROUP BY bank_account, status, is_reconciled ORDER BY bank_account, status, is_reconciled;

-- Metric 2: FY26 untagged by type (AUTHORISED only)
SELECT type, COUNT(*) AS untagged_count, ROUND(SUM(total),2) AS untagged_dollars
FROM xero_transactions
WHERE bank_account IN ('NAB Visa ACT #8815','NJ Marchesi T/as ACT Everyday')
  AND date >= '2025-07-01' AND date <= '2026-06-10' AND status = 'AUTHORISED'
  AND (project_code IS NULL OR btrim(project_code) = '')
GROUP BY type ORDER BY untagged_dollars DESC;

-- Metric 3: tag provenance top 10
SELECT COALESCE(project_code_source,'(null)') AS source, COUNT(*) AS n
FROM xero_transactions
WHERE bank_account IN ('NAB Visa ACT #8815','NJ Marchesi T/as ACT Everyday')
  AND date >= '2025-07-01' AND date <= '2026-06-10' AND status = 'AUTHORISED'
GROUP BY 1 ORDER BY n DESC LIMIT 10;

-- Metric 4: receipt coverage (SPEND attachment flag + receipt_emails by status)
SELECT type, has_attachments, COUNT(*) AS n, ROUND(SUM(total),2) AS dollars
FROM xero_transactions
WHERE bank_account IN ('NAB Visa ACT #8815','NJ Marchesi T/as ACT Everyday')
  AND date >= '2025-07-01' AND date <= '2026-06-10' AND status = 'AUTHORISED'
  AND type IN ('SPEND','SPEND-OVERPAYMENT','SPEND-PREPAYMENT')
GROUP BY type, has_attachments ORDER BY type, has_attachments;
SELECT COALESCE(status,'(null)') AS status, COUNT(*) AS n FROM receipt_emails GROUP BY 1 ORDER BY n DESC;

-- Metric 5: Q4-to-date per ACT account
SELECT bank_account, COUNT(*) AS q4_txns,
  COUNT(*) FILTER (WHERE is_reconciled = false) AS unreconciled,
  COUNT(*) FILTER (WHERE project_code IS NULL OR btrim(project_code) = '') AS untagged,
  COUNT(*) FILTER (WHERE has_attachments = false) AS no_attachment_all,
  COUNT(*) FILTER (WHERE has_attachments = false AND type = 'SPEND') AS no_attachment_spend
FROM xero_transactions
WHERE bank_account IN ('NAB Visa ACT #8815','NJ Marchesi T/as ACT Everyday')
  AND date >= '2026-04-01' AND date <= '2026-06-10' AND status = 'AUTHORISED'
GROUP BY bank_account ORDER BY bank_account;

-- Metric 6: duplicate-candidate groups (FY26 AUTHORISED SPEND)
SELECT COUNT(*) AS dup_groups, SUM(n) AS txns_in_dup_groups
FROM (SELECT date, total, bank_account, COUNT(*) AS n
      FROM xero_transactions
      WHERE bank_account IN ('NAB Visa ACT #8815','NJ Marchesi T/as ACT Everyday')
        AND date >= '2025-07-01' AND date <= '2026-06-10'
        AND status = 'AUTHORISED' AND type = 'SPEND'
      GROUP BY date, total, bank_account HAVING COUNT(*) > 1) g;
```

3. Verify the cron claim: `grep -n -iE 'push-ai-tracking|receipt-upload|receipt-match' ecosystem.config.cjs` then read the blocks (schedules `7,37 8-18 * * 1-5`, `0 7 * * *` with `--apply --ai`, `0 8 * * *`).
4. Capability claims: re-fetch the source URLs listed in plan section 4 / Verification Log.

## Linked Artifacts

- Source packet: workflow run `wf_1a52bcc6-f2b` (task `wiqy80z3a`)
- Output artifact: `thoughts/shared/plans/2026-06-10-bas-reconciliation-automation-engine.md`
- Validation log: plan section 13 Verification Log (seed)
