---
title: Finance Cutover Review Workflow
status: Live working playbook
date: 2026-05-05
parent: act-entity-migration-checklist-2026-06-30
purpose: One simple end-to-end pass to get FY26 sole-trader books cutover-ready — bank match, receipt match, project tag, R&D tag, mapping export.
---

# Finance Cutover Review Workflow

> **Goal.** Walk every FY26 sole-trader transaction through five gates so by 30 June 2026 the books are: bank-reconciled, receipt-attached, project-tagged, R&D-flagged, and Standard-Ledger-ready. One workflow, five steps, existing tools.
>
> **When to run:** weekly until the untagged review queue is below 50 lines, then monthly through 30 June 2026.
> **Owner:** Ben (with Nic input on farm/place lines and ambiguous founder draws).
> **Time budget:** ~90 minutes per weekly pass once the rhythm is established.

---

## The five gates (run in order)

Each gate has one tool, one decision, and one done-condition. Don't move to the next gate until the current one is below threshold.

### Gate 1 — Bank reconciliation match

**What:** every Xero `SPEND` / `RECEIVE` line should match a bank statement entry. Drift means either Xero has invented something or the bank entry isn't ingested.

**Tool:** `/finance/reconciliation` (Spending Intelligence v3 page) — already shows reconciled vs unreconciled at a glance.

**Decision:** for each unreconciled line:
- Bank statement says it happened → reconcile in Xero (mark `is_reconciled = true`).
- Bank statement disagrees → flag in `out/` notes for Standard Ledger; don't delete or edit.

**Done-condition:** unreconciled count < 1% of total transactions (currently ~95.3% reconciled per memory; target 99%+).

---

### Gate 2 — Receipt match

**What:** every expense over $82.50 (the GST-claim threshold) needs a receipt or tax invoice attached. Without it, GST credit + R&D claim are at audit risk.

**Tool:** `/finance/receipts-triage` for the queue, `/finance/tagger-v2` for batch tagging.

**Decision:** for each missing-receipt line:
- Recurring vendor (Stripe, Vercel, Anthropic, etc.) → run `node scripts/gmail-to-xero-pipeline.mjs` to forward fresh receipts.
- One-off vendor → search Gmail manually; if not found, mark for hunt.
- Sub-$82.50 → fine without receipt, just confirm the project tag.

**Done-condition:** `has_attachments = true` rate above 95% on lines >$82.50 (currently ~95.3% per memory).

---

### Gate 3 — Project tag (ACT-XX)

**What:** every line gets a project code so the cutover spreadsheet knows where it belongs in the new Pty.

**Tool:** `/finance/tagger-v2` — already shows vendor + amount + suggested project + confidence + sibling count.

**Decision rules** (apply in order):
1. Auto-applied via `vendor_project_rules` → trust, move on.
2. Vendor matches an existing rule with confidence ≥ 80% → confirm one click.
3. Ambiguous vendor (e.g. Bunnings — could be ACT-FM or ACT-HV or ACT-CORE) → check description/notes/date for clues; tag based on context.
4. Unknown vendor with $-value < $200 → tag ACT-CORE (overhead) and move on; ROI on deeper triage is low.
5. Unknown vendor with $-value ≥ $200 → ask Nic if it's farm/Harvest/something else; don't guess.

**Don't auto-apply** anything until you've reviewed at least the top 12 untagged contacts by absolute total (use `/finance/money-alignment` review queue panel as the worklist).

**Done-condition:** untagged transactions <20, untagged invoices <20 (snapshot 2026-05-01: 244 untagged total, target ≈ 0 by mid-June 2026).

---

### Gate 4 — R&D flag

**What:** mark each line as R&D-eligible or not, so the FY26 R&D claim through the Pty (Path C) has a clean source.

**Tool:** `/finance/tagger-v2` already shows the R&D-eligible projects in lime, and `vendor_project_rules.rd_eligible` carries the flag forward. For lines tagged ACT-IN, ACT-EL, ACT-DO, ACT-JH (core R&D codes per `wiki/finance/rdti-claim-strategy.md`) the default should be R&D-eligible.

**Decision rules:**
- Tagged ACT-IN / ACT-EL / ACT-DO / ACT-JH → `rd_eligible = true` (core R&D code).
- Tagged ACT-GD / ACT-CP / ACT-MY → `rd_eligible = true` only if the line description ties to a registered supporting R&D activity.
- Tagged ACT-FM / ACT-HV / ACT-CORE / ACT-MD → `rd_eligible = false` by default (operational/place/overhead).
- SaaS/API spend (Anthropic, OpenAI, Supabase, Vercel, Cloudflare) → `rd_eligible = true` regardless of project tag (supporting R&D infrastructure), portion to be apportioned by R&D consultant.

**Done-condition:** every line has a non-null `rd_eligible` field (true or false explicitly, not blank).

---

### Gate 5 — Cutover mapping export

**What:** generate the sole-trader → Pty reallocation spreadsheet for Standard Ledger to journal-entry across.

**Tool:** `node scripts/export-sole-trader-to-pty-mapping.mjs`

**Decision rules** (already encoded in the script):
- Tagged `ACT-XX` (except `ACT-FM`/`ACT-BV`) → `reallocate_to_pty = Y`.
- Tagged `ACT-FM` / `ACT-BV` → `reallocate_to_pty = N` (stays with Nic / farm).
- Untagged → `reallocate_to_pty = REVIEW` (means Gate 3 isn't done yet).

**Done-condition:** REVIEW count = 0; CSV emailed to Standard Ledger for journal-entry review.

---

## Weekly cadence (60-90 min)

| When | Step | Tool | Time |
|---|---|---|---|
| Mon 8am | Sync runs (cron) | `scripts/sync-xero-to-supabase.mjs` + `scripts/weekly-reconciliation.mjs` | auto |
| Tue or Wed | Gate 1 — bank match | `/finance/reconciliation` | 15 min |
| Tue or Wed | Gate 2 — receipt hunt | `/finance/receipts-triage` + `gmail-to-xero-pipeline.mjs` | 20 min |
| Tue or Wed | Gate 3 — project tag | `/finance/tagger-v2` | 30 min |
| Tue or Wed | Gate 4 — R&D flag | `/finance/tagger-v2` (R&D toggle) | 10 min |
| Tue or Wed | Gate 5 — cutover export | `node scripts/export-sole-trader-to-pty-mapping.mjs` | 5 min |
| End of week | Health snapshot | `/finance/money-alignment` | 5 min review only |

---

## Monthly cadence (additional, end of each month)

- BAS preparation: `node scripts/prepare-bas.mjs` → `/finance/board` → review draft → file when due.
- Gate-completion summary: paste the `/finance/money-alignment` numbers into Notion HQ for Nic + Standard Ledger.
- Founder pay allocation: end-of-month journal that splits the $10K/mo base across project codes per Ben's actual time split (per [migration checklist §11.2](act-entity-migration-checklist-2026-06-30.md#d112--founder-payroll-cadence-10kmo-base--director-loan--eoy-settle)).

---

## Critical: Supabase mirror gap

**The Supabase `xero_transactions` and `xero_invoices` tables only contain data from 2025-01-27 onwards.** Anything older (FY24 and earlier-FY25) lives only in live Xero. Verified 2026-05-05: `MIN(date) = 2025-01-27` in both tables; live Xero contains invoices going back to 2023-10.

**Implications:**
- The `/finance/money-alignment` cockpit and `scripts/export-sole-trader-to-pty-mapping.mjs` only show post-2025-01-27 data.
- For "everything Knight Photography has ever invoiced" or any historical audit, **use the live Xero API**, not Supabase.
- `scripts/search-xero-knight-photography.mjs` is the pattern — `createXeroClient()` then page through `Invoices?ContactIDs=...` and `BankTransactions?where=...`.
- Before the final cutover spreadsheet for Standard Ledger, decide whether to also pull the pre-2025-01-27 invoices/transactions or treat them as "out of cutover scope" (since the Pty starts 1 July 2026 and FY24-25 R&D is forfeited regardless).

If Standard Ledger needs the full sole-trader history, run a one-off Xero-API export script and merge with the Supabase-derived FY26 data.

---

## What to fix when something is off

| Symptom | Likely cause | Fix |
|---|---|---|
| Reconciliation drift | Bank feed broke or Xero attribute drift | Re-auth NAB feed in Xero; refresh `xero_transactions.has_attachments` via `scripts/sync-bill-attachments-to-txns.mjs` |
| Receipt count drops | Gmail forward filter died | Check `dext_forwarded_emails` last run; re-run `node scripts/gmail-to-xero-pipeline.mjs` |
| Tagger suggests wrong project | Vendor rule outdated | Update `vendor_project_rules` directly in Supabase or via `/finance/vendor-rules-suggest` |
| R&D flag missing on rules | `vendor_project_rules.rd_eligible` was never set | Bulk-set via SQL: `UPDATE vendor_project_rules SET rd_eligible = true WHERE project_code IN ('ACT-IN','ACT-EL','ACT-DO','ACT-JH')` |
| Mapping export shows REVIEW lines | Gate 3 untagged queue not cleared | Go back to Gate 3 |
| Mapping export totals don't match Xero P&L | Multi-counting (invoice + payment for same money) | Standard Ledger handles dedup at journal level — flag, don't fix in script |

---

## Cross-reference

- [Sole trader → Pty cutover migration checklist](act-entity-migration-checklist-2026-06-30.md) — the master action ledger
- [ACT Money Alignment Snapshot 2026-05-01](../reports/act-money-alignment-2026-05-01.md) — current state baseline
- [Sole Trader → Pty Cutover Strategy](../../wiki/finance/sole-trader-pty-cutover-strategy.md) — the why behind the moves
- [R&DTI Claim Strategy FY26](../../wiki/finance/rdti-claim-strategy.md) — R&D maths and founder-invoicing lever
- [Standard Ledger meeting decisions](act-entity-migration-checklist-2026-06-30.md#11-meeting-decisions-from-2026-05-05-standard-ledger-conversation) — §11
