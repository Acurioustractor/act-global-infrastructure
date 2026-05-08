---
title: "ACT Money Alignment 2026-05-01 Provenance"
status: Live
date: 2026-05-01
type: provenance
tags:
  - provenance
  - finance
  - audit
source_packet_id: na
canonical_entity: a-curious-tractor-pty-ltd
---

# ACT Money Alignment 2026-05-01 Provenance

## Purpose

- Output: management snapshot report (`act-money-alignment-2026-05-01.md`) + live cockpit (`/finance/money-alignment`).
- Intended destination: bookkeeper review queue, Standard Ledger conversation pack, sole trader → Pty Ltd cutover spreadsheet.
- Why generated: bridge between Xero live ledger and the cutover decision logs (Notion + wiki) so reviewers see one current truth.

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `apps/command-center/src/app/api/finance/money-alignment/route.ts` (`allocationSnapshot`) | hand-curated array reflecting Xero project-allocation export | 2026-05-01 | Drives the "Project allocation snapshot" table. |
| Supabase `xero_transactions` | runtime ledger mirror | FY26 YTD (`2025-07-01` → `2026-04-30`) | Coverage, tagging counts, untagged review queue. |
| Supabase `xero_invoices` | runtime ledger mirror | FY26 YTD | Coverage, tagging counts, top untagged contacts. |
| Supabase `xero_bank_transactions` | runtime ledger mirror | snapshot only | Freshness signal — flagged stale. |
| Supabase `vendor_project_rules`, `invoice_project_overrides`, `location_project_rules` | rules tables | live | Tagging rule counts and R&D flags. |
| Supabase `project_monthly_financials` | cached monthly P&L | last refresh stamp | Freshness signal — flagged stale. |
| `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | cutover checklist | live | Cross-link to cutover obligations and meeting decisions. |
| `wiki/finance/rdti-claim-strategy.md` | strategy doc | 2026-04-12 | Cross-link to R&D positioning. |
| `wiki/decisions/act-core-facts.md` | canonical facts | 2026-04-25 | Entity ABN/ACN, sole trader vs Pty cutover date. |

## Verification Status

- `Verified:`
  - Allocation table values match `allocationSnapshot` array in `route.ts` line-for-line on 2026-05-01.
  - Sole trader ABN, Pty ACN, cutover date confirmed against `wiki/decisions/act-core-facts.md`.
  - Cockpit endpoint reads from the ACT shared Supabase project (`tednluwflfhxyucgwigh`) at runtime; no static data path beyond the allocation snapshot.
- `Inferred:`
  - Snapshot totals (revenue ~$1.48M, expenses ~$1.42M, net ~$66K) computed by summing the allocation array; <1% rounding tolerance against live Xero P&L.
  - Coverage figures (~97.5% transactions, ~81.8% invoices) reflect typical post-Spending-Intelligence-v3 levels; cockpit pulls live numbers at render time.
- `Unverified:`
  - GST/BAS treatment line-by-line.
  - Standard Ledger sign-off on the project-code → tracking-category mapping.
  - Whether all "fund with controls" projects have signed contracts or just management-tagged revenue.
  - Whether ACT-CE (Capital / Enterprise) and ACT-FM (Farm) deficits reflect coding errors or genuine under-recovery.

## Human Decisions / Gates

- Editorial review: pending (Ben to read once before Standard Ledger pack assembly)
- Cultural review: not-required (no cultural-content surface)
- Consent review: not-required (internal-only management snapshot)
- Release approval: pending (Ben + Standard Ledger; Nic for tracking-category decisions)

## Known Gaps And Assumptions

- **No live numbers refresh.** The allocation array in the API is hand-curated from a 2026-05-01 Xero export. Should be regenerated weekly via a script that reads from `xero_transactions` and `xero_invoices` directly so the cockpit and report drift together rather than apart.
- **`project_monthly_financials` is stale.** Cached P&L stops before the snapshot — needs refresh after tagging cleanup so future reports can pull from a single materialised view.
- **Untagged 69 transactions / 175 invoices** are aggregate counts; the actual identity of those lines lives in the cockpit's `reviewQueue` arrays, not in this report.
- **Harvest split.** ACT-HV revenue/expense includes both the Harvest building lease side and the Harvest trading entity side. Until the Harvest subsidiary is incorporated (see [decision](../../wiki/decisions/2026-05-harvest-subsidiary-structure.md)), the split is judgement-call.
- **R&D allocation not in this report.** R&D-eligibility lives in the rules tables and the FY26 R&D package (`thoughts/shared/plans/rd-tax-incentive-fy26-package.md`); not duplicated here.

## Reproduction Steps

1. Open `apps/command-center/src/app/api/finance/money-alignment/route.ts` — the `allocationSnapshot` array is the source of truth for the project allocation table.
2. Live coverage and freshness can be re-queried from Supabase via the SQL in the same route (lines 450–593).
3. To refresh the snapshot itself, export the latest Xero project allocation report on 2026-05-01 (or current date), regenerate the array, and write a new dated report file.
4. After refresh, update `SNAPSHOT_DATE`, `SNAPSHOT_TO`, `REPORT_PATH`, and `PROVENANCE_PATH` constants at the top of `route.ts`.

## Linked Artifacts

- Output report: `thoughts/shared/reports/act-money-alignment-2026-05-01.md`
- Live cockpit: `apps/command-center/src/app/finance/money-alignment/page.tsx`
- API route: `apps/command-center/src/app/api/finance/money-alignment/route.ts`
- Migration checklist: `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`
- New-entity Xero playbook: `thoughts/shared/plans/new-entity-xero-launch-playbook.md`
- Harvest subsidiary decision: `wiki/decisions/2026-05-harvest-subsidiary-structure.md`
- Notion HQ: <https://app.notion.com/p/298eb5c6335a4be6a6f428c1626a81f8>
- Notion Gates: <https://app.notion.com/p/99cac124177640e3943e353acbc7e4f7>
