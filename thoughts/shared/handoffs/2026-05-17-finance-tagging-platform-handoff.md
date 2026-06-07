---
date: 2026-05-17
session_type: handoff
status: paused
topic: Finance tagging platform · ACT-HV audit · transactions explorer
next_session_pickup: thoughts/shared/handoffs/2026-05-17-finance-tagging-platform-handoff.md
---

# Finance tagging platform + ACT-HV audit — handoff 2026-05-17 (+ 2026-05-18 followups)

Read this first when resuming. Then check open tasks (TaskList tool) and the URLs below to see the live state.

## 🔒 CRITICAL: Only TWO ACT accounts in active use

All ACT business spend must come from one of these two accounts. Treat anything else as out-of-scope and DO NOT count it as ACT spend in any totals/reports.

| Account | Type | Use |
|---|---|---|
| **NAB Visa ACT #8815** | Credit card | Day-to-day operational spend |
| **NJ Marchesi T/as ACT Everyday** | Bank account | Bills, transfers, larger payments |

Other Xero-connected accounts to **exclude** from ACT totals:
- `NM Personal` — Nic's personal account (pre-cutover history; sole-trader era)
- `NJ Marchesi T/as ACT Maximiser` — savings, quiet, not for spend

Apply this filter to any project-cost rollup. NM Personal rows tagged to ACT projects should be reviewed and likely untagged (most pre-Jan-2026 ones already are, but post-Jan-2026 NM Personal tags need checking per project).

## What's now in production (local dev: http://localhost:3002)

| URL | What it does |
|---|---|
| `/finance/transactions` | Cross-project transaction explorer. Defaults to UNTAGGED. Bulk select + bulk retag. Vendor suggestions (735+ vendors). Audit notes, audit-only filter, presets, OCR-on-demand button (📎), inline note field. |
| `/finance/vendors` | Index of all 864 vendors with totals, untagged count, suggested project + confidence. Click vendor → sidebar with project distribution + bulk-tag-untagged. |
| `/finance/projects/[code]` | Per-project P&L. Now shows **real expense total** (bills + bank spend, deduped), an **audit-alerts panel** (duplicates, miscoded, RNM-flagged, etc), **notable findings** (St Mary's), and proper `−` for outflows in Recent Transactions. Works for any project code. |
| `/finance/projects/[code]/transactions` | Per-project chronological ledger with inline project retag dropdown (green=current, amber=retagged-out, red=untagged). |
| `/finance/audit` (new 2026-05-18) | **Cross-project audit + spend overview.** Audit alerts, notable findings, top vendors, by-project/bank/source stats. **Project review panel** lists all 81 canonical codes with status, tier, spend, last activity, and a `keep / review / archive-candidate / unknown-code` recommendation. Filterable. Defaults to ACT-accounts only. Linked from sidebar nav (Money State section). |

## Sidebar nav updated 2026-05-18

Added to `apps/command-center/src/lib/nav-data.ts` (Finance section):
- **Receipts & spending:** "All Transactions" (`/finance/transactions`, Search icon) + "Vendors" (`/finance/vendors`, Building2 icon)
- **Money state:** "Spend Audit" (`/finance/audit`, AlertOctagon icon) above the CEO Cockpit entry

## Xero push-back — DEDICATED SESSION required

All retags are Supabase-only. Pushing them back to Xero will affect ~1,200 rows of live accounting records — Tier 3, hard to reverse. Don't do this mixed with other work. **Plan:** `thoughts/shared/plans/2026-05-18-xero-pushback-dedicated-session.md` — covers pre-flight checklist, phased push (1 row → 5 → 20 → batch), reconciled-bank-txn handling, risk register. Estimated 90-180 min, requires xero-sync cron stopped (✓ currently is).

## API endpoints added

- `GET /api/finance/transactions` — cross-project list + project filter + UNTAGGED bucket
- `PATCH /api/finance/transactions` — bulk re-tag (items[]) or single (id, source)
- `GET /api/finance/transactions/vendor-suggestions` — vendor → most-common project + confidence
- `POST /api/finance/transactions/note` — write to `line_items[0]._note`
- `POST /api/finance/transactions/ocr` — fetch Xero attachment → Gemini 2.5 Flash Lite → write `line_items[0]._ocr`
- `GET /api/finance/vendors` — all-vendor aggregates (864 rows)
- `GET /api/finance/vendors/[name]` — single-vendor profile + history
- `GET /api/finance/projects/[code]/transactions` — project-scoped ledger (now returns Supabase `id` + `projectCode`)
- `GET /api/finance/projects/[code]` — now returns `auditAlerts`, `notableFindings`, `realExpenseTotal`, `realTopVendors`, `ocrFindings`

## Component extracted

- `apps/command-center/src/components/finance/VendorSidebar.tsx` — reused on both `/finance/transactions` and `/finance/vendors`. Click vendor anywhere → slide-out with project history + bulk-tag + per-row inline retag.

## Scripts added (reusable, project-agnostic)

- `scripts/ocr-bank-txn-attachments.mjs` — bulk OCR Xero bank-txn attachments via Gemini, write `_ocr` blob to Supabase mirror, optionally `--push-xero` line description back. Filters: `--project`, `--ids`, `--missing-desc`, `--include-all`, `--limit`, `--apply`, `--push-xero`, `--report`.
- `scripts/ocr-carbatec-bills.mjs` — one-off: OCR specific invoices to surface their line items.
- `scripts/build-harvest-ledger.mjs` — consolidated bills + spend ledger to Markdown.
- `scripts/build-harvest-by-vendor.mjs` — top-10 vendors line-by-line.
- `scripts/build-harvest-jan26-onwards.mjs` — Kennards/Bunnings Jan-2026+ filtered, all other vendors line-by-line.
- `scripts/build-harvest-jan26-fulldump.mjs` — every ACT-HV row Jan-2026+ chronological.
- `scripts/build-harvest-ledger-compact.mjs` — narrow-column text dump.

## Sync hardening (critical for tag persistence)

Three layers of auto-tagging would silently revert manual user untags before today's patches:

| Script | Risk | Patch |
|---|---|---|
| `scripts/sync-xero-to-supabase.mjs` L794 | Re-applies Xero's tracking value on bank-txn upsert | Pre-checks Supabase `project_code_source`; skips overwrite if starts with `'manual'` |
| `scripts/tag-xero-transactions.mjs` L233 | Vendor-rule auto-tagger picked up `project_code IS NULL` rows and re-tagged | Added `.not('project_code_source','like','manual%')` |
| `scripts/tag-transactions-by-vendor.mjs` L223 + L364 | Same pattern, txns + invoices | Same guard on both |

`scripts/tag-statement-lines.mjs` doesn't need a guard (bank_statement_lines has no `project_code_source` column; manual untags happen on xero_transactions/xero_invoices only).

All four manual sources are now respected: `manual`, `manual-untagged-pre-jan26`, `manual-duplicate-of-*`. **Discovered when checking bank-account coverage** — 115 of my 125 pre-Jan untags had silently come back via the vendor-rule auto-tagger. Re-ran untag (62 bills + 53 spends) and the guards now hold.

xero-sync PM2 entry is currently **stopped/disabled** — patches are pre-emptive for when it's re-enabled.

## ACT-HV audit findings (canonical reference)

### Before today
ACT-HV had 229 rows totalling raw $212,065 — but the cockpit only showed $71k expenses because it read bank-txn-only data.

### Findings & actions taken

| # | Finding | Action | Status |
|---|---|---|---|
| 1 | **St Mary's Cathedral decking** — 12.5 tonnes for $8,750 embedded in Kennedy's invoices (10t on 2026-04-24, 2.5t on 2026-05-07) | Discovered via OCR of bank-txn attachments | ✓ documented in task #1 |
| 2 | **Kennedy's 2026-04-24 duplicate $8,525** — same invoice charged twice, real paid amount = $8,594.91 (other row, incl. CC surcharge) | Untagged from ACT-HV in Supabase (project_code = NULL, source = `manual-duplicate-of-kennedys-9ae29a04`) | ✓ done — Xero still has both, not voided |
| 3 | **Maleny Landscaping "Hardwood Chip /m³"** mis-flagged as timber in audit | Confirmed correct in Xero (line desc = "Hardwood Chip /m3", AccountCode 446) — narrative issue only | ✓ closed |
| 4 | **Claire Marchesi $8,888 (2025-04-22)** — no description, no receipt | Pre-Jan-2026 so now UNTAGGED via bulk op — pending purpose confirmation | ⏳ task #4 |
| 5 | **Flight Bar Witta** — 24 NT/SA/Melb/HK travel rows totalling $2,489.92 miscoded to ACT-HV. Bank-feed auto-tagged wrong contact. Should be ACT-OO. | Pre-Jan-2026 (mostly) so now UNTAGGED — re-tag scope pending | ⏳ task #5 |
| 6 | **Longara milk crates** — 3 deliveries totalling $9,400.96 ("2nd hand assorted milk crate colours as per discussions with Nicholas") | Confirmed legitimate Harvest spend, just unusual category | ⏳ task #6 |
| 7 | **Carbatec maybe-duplicates** — router table $2,338.70 AUTHORISED appears as line in $4,575.65 PAID invoice; bandsaw $1,319 AUTHORISED appears as line in $1,811.70 PAID invoice. Total potential dup = $3,657.70. | OCR confirmed both line items appear in both invoices — needs Carbatec to confirm | ⏳ task #11 |
| 8 | **Maleny Hotel $111.10 meal** — likely team meal not Harvest | Awaiting Ben's call | ⏳ task #8 |
| 9 | **RNM Carpentry $33,711.30** — Ben said "not part of Harvest" | Pre-Jan-2026 spend now UNTAGGED via bulk op. The $26,845 AUTHORISED bill from 2025-11-11 will need to either be retagged elsewhere or remain unpaid | ⏳ |
| 10 | **Bunnings line desc says "ACT-IN"** but project_code says ACT-HV — Dext auto-classification mismatch on ~$5k of pre-Jan rows | Pre-Jan rows now UNTAGGED. Post-Jan rows (~$5,076) still tagged ACT-HV — verify which branch | ⏳ |
| 11 | **Project start date** — Ben said "Harvest didn't start until Jan 2026". 125 pre-Jan-2026 rows ($109,450.59) bulk-untagged from ACT-HV with source `manual-untagged-pre-jan26`. | ✓ done | |

### Current ACT-HV state (after audit)

- **109 rows** post-Jan-2026 (down from 229)
- **Raw real cost: ~$115,738.75** (down from $212,065)
- Earliest: 2026-01-04 (bills) · 2026-01-21 (spend)
- Latest: 2026-05-15
- Sub-total breakdown (rough): timber + workshop fit-out ~$30k; mulch/landscape ~$15k; milk crates $9.4k; gardening (Sophie Hickey) $16.3k; design (Thais Pupio) $16.9k; ongoing hardware/materials ~$15-25k. See `thoughts/shared/handoffs/act-hv-jan26-fulldump-2026-05-17.md` for the 104-row line-by-line dump.

## Other audit issue surfaced (final question of session)

**Homeland School INV-0303 — phantom $40,000 payment.** Invoice shows PAID in Xero but no $40k deposit from Homeland School exists. Xero's "payment" is reconciled to NAB Visa #8815 on 2025-12-10 — that credit is actually a "Linked Acc Trns" (internal transfer between user's own NAB accounts). The $40,000 is still genuinely outstanding. Fix is in Xero UI: un-reconcile the payment, revert invoice to AUTHORISED, re-reconcile the Visa $40k credit against the correct BankTransfer. Task #21 logged.

→ Risk: this kind of phantom-payment miscoding could affect other invoices. Untouched scan for similar patterns offered but not yet run.

## Project names + project review (2026-05-18)

Tagging UI used to show bare codes (`ACT-HV`) in every dropdown — hard to recognise. Now the page reads from the `projects` table (canonical: `code`, `name`, `status`, `tier`) and renders `The Harvest Witta (ACT-HV)` in:

- `/finance/transactions` — project filter, bulk-retag dropdown, per-row retag dropdown, vendor-sidebar suggested-project + bulk-tag dropdown, "by project" stat chips, smart-suggestion chip per row.
- `/finance/projects/[code]/transactions` — inline retag dropdown + page title.
- `/finance/audit` — "By project" panel.

The new **Project review panel** on `/finance/audit` answers Ben's "way too many" concern. Run sweep on 2026-05-18:

| Bucket | Count | What it means |
|---|---|---|
| keep | 31 | Active with recent spend — the real active set. |
| review | 17 | Borderline (sunsetting status w/ recent spend, or active status w/ no recent spend). |
| archive-candidate | 33 | Already archived/transferred/sunsetting in `projects` table AND inactive in audit window. Safe to archive the Xero tracking option too. |
| unknown-code | 0 | Codes in Xero that aren't in `projects` table (none currently — good). |

Filter the panel by bucket. Each row shows code, name, status, tier, spend in window, row count, last activity, and a one-line reason.

→ Next pass: walk through the 33 archive-candidates with Ben, archive the Xero tracking options for any confirmed dead, then through the 17 reviews.

## Open tasks (pending → in priority order)

1. **#21** Fix Homeland School INV-0303 phantom payment (Xero UI, ~5 min)
2. **#14** Build Xero push-back step for Supabase-side retags (mirror→Xero one-way push, batched, respects reconciled-bank-txn block)
3. Walk through 33 archive-candidate projects on `/finance/audit` → archive in Xero tracking
4. Walk through 17 review-bucket projects on `/finance/audit`
5. **#5** Decide Flight Bar Witta re-tag destination (ACT-OO most likely)
6. **#4** Confirm Claire Marchesi $8,888 purpose
7. **#11** Verify Carbatec duplicate-billing with Carbatec
8. **#8** Re-tag Maleny Hotel $111.10 (meal review)
9. **#6** Reconcile Longara milk crate spend (confirm count/use)
10. Decide if Thais Pupio Design $16,920 belongs to Harvest

## Key decisions logged

- **Harvest project start: 2026-01-01** (Ben confirmed). Everything before is not Harvest.
- **RNM Carpentry** is not part of Harvest (Ben confirmed).
- **Maleny Landscaping "Hardwood Chip"** is mulch not timber. Don't flag as timber in narrative.
- **Tag operations write to Supabase only** for now. Xero stays as-is until push-back (task #14) is built.
- **Audit notes are heuristics in code** at `/api/finance/transactions/route.ts` `auditNote()` and `/api/finance/projects/[code]/route.ts` (project-specific findings). Extend per project as findings accrue.

## Resume checklist

When picking back up:

```bash
# 1. Are servers up?
lsof -i :3002 | grep LISTEN  # command-center

# 2. Open the dashboard
open http://localhost:3002/finance/transactions
open http://localhost:3002/finance/vendors
open http://localhost:3002/finance/projects/ACT-HV

# 3. Pending tasks
# Use TaskList tool to see #4, #5, #6, #8, #11, #14, #21
```

## Files changed (uncommitted)

- `apps/command-center/src/app/api/finance/projects/[code]/route.ts` (audit alerts + real expenses)
- `apps/command-center/src/app/finance/projects/[code]/page.tsx` (audit panel + outflow signs)
- `scripts/sync-xero-to-supabase.mjs` (manual-tag guard)

## Files added (uncommitted)

- New page routes: `/finance/transactions/page.tsx`, `/finance/vendors/page.tsx`, `/finance/projects/[code]/transactions/page.tsx`
- New API routes: `/api/finance/transactions/*`, `/api/finance/vendors/*`, `/api/finance/projects/[code]/transactions/`
- Component: `components/finance/VendorSidebar.tsx`
- 7 scripts under `scripts/build-harvest-*.mjs`, `scripts/ocr-*.mjs`
- 7 handoff documents under `thoughts/shared/handoffs/act-hv-*.md`

## Pointers to detailed working docs

- `thoughts/shared/handoffs/act-hv-jan26-fulldump-2026-05-17.md` — 104 rows Jan 2026+ chronological with audit notes
- `thoughts/shared/handoffs/act-hv-by-vendor-2026-05-17.md` — top 10 vendors line-by-line
- `thoughts/shared/handoffs/act-hv-final-ledger-2026-05-17.md` — full 226-row consolidated ledger
- `thoughts/shared/handoffs/act-hv-ocr-2026-05-17.md` — OCR dry-run report (19 rows, all confidence high)
- `thoughts/shared/handoffs/act-hv-ocr-push-2026-05-17.md` — Kennedy's push success + Savage reconciled-block failures
- `thoughts/shared/handoffs/act-hv-rest-and-jan26-2026-05-17.md` — Kennards/Bunnings Jan-2026+ filter + 44 other-vendor breakdown
