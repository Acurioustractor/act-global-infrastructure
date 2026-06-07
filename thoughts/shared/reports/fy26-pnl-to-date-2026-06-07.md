---
title: ACT FY26 P&L — year to date (1 Jul 2025 → 7 Jun 2026)
status: Final (point-in-time snapshot)
date: 2026-06-07
type: financial-report
provenance: fy26-pnl-to-date-2026-06-07.md.provenance.md
---

# ACT FY26 P&L — year to date

> Snapshot as of **7 Jun 2026**, queried live from the canonical accrual ledger
> (`project_monthly_financials`) with a cash-side cross-check from `xero_transactions`
> under the two-account rule. Every figure's source and filter is in the provenance
> sidecar. Audience: Ben + Nic + Standard Ledger (EOFY cutover prep, 30 Jun 2026).

## Org P&L (canonical accrual)

| | FY26 to 7 Jun |
|---|---|
| **Revenue** | **$1,905,445** |
| **Expenses** | **$1,090,085** |
| **Net** | **+$815,360** |
| Active projects | 30 |

## By project

| Project | Revenue | Expenses | Net |
|---|---|---|---|
| ACT-GD (Goods) | $483,627 | $220,196 | **+$263,432** |
| ACT-PI (PICC) | $365,200 | $28,973 | **+$336,227** |
| ACT-CORE | $271,644 | $264,064 | +$7,581 |
| ACT-HQ | $268,308 | $244,042 | +$24,266 |
| ACT-HV (Harvest) | $170,601 | $55,466 | +$115,135 |
| ACT-JH (JusticeHub) | $117,655 | $1,071 | +$116,584 |
| ACT-OO (Oonchiumpa) | $103,100 | $37,091 | +$66,009 |
| ACT-SM | $65,200 | $5,977 | +$59,223 |
| ACT-IN (internal) | $744 | $154,567 | **−$153,823** |
| ACT-FM (Farm) | $7,048 | $34,701 | −$27,653 |
| ACT-MY (Mounty Yarns) | $0 | $15,746 | −$15,746 |
| ACT-DL | $0 | $10,561 | −$10,561 |
| ACT-UA | $0 | $9,898 | −$9,898 |
| ACT-DO | $0 | $3,476 | −$3,476 |

(Projects with zero movement in FY26 omitted; 30 codes carried movement in total.)

## Monthly shape

| Month | Revenue | Expenses |
|---|---|---|
| 2025-07 | $217,063 | $231,452 |
| 2025-08 | $311,386 | $67,266 |
| 2025-09 | $255,537 | $132,375 |
| 2025-10 | $138,449 | $149,678 |
| 2025-11 | $552,956 | $185,603 |
| 2025-12 | $49,500 | $99,056 |
| 2026-01 | $6,765 | $24,506 |
| 2026-02 | $87,000 | $22,023 |
| 2026-03 | $76,265 | $78,380 |
| 2026-04 | $0 | $55,491 |
| 2026-05 | $210,524 | $44,061 |
| 2026-06 | $0 | $194 |

Reading: revenue is grant-shaped — front-loaded and lumpy (Nov 2025 peak $553K), a lean
Dec–Feb (~$48K/month average), recovering Mar and May. Expense discipline tightened hard
from Jan 2026 (~$22–78K/month vs $99–231K/month in H1). June 2026 is a partial month plus
sync lag, not a signal.

## Cash-side cross-check (two-account rule)

Accounts: **NAB Visa ACT #8815** + **NJ Marchesi T/as ACT Everyday** only, `AUTHORISED` only.

| Measure | Value |
|---|---|
| Cash SPEND | $848,454 across 1,649 lines |
| Cash RECEIVE | $284,297 — undercounts by design: settlements land as RECEIVE-TRANSFER; accrual revenue above is canonical |
| Accrual − cash spend | $241,631 ≈ ACT-HQ's $244,042 — ACT-HQ expenses are the accrual/bills layer that never crosses the two bank accounts as SPEND lines *(inferred; reconciles to ~$2.4K)* |
| Per-project agreement | ACT-CORE ($264,064) and ACT-GD ($220,196) match cash-to-accrual to the dollar — the tagging layer is coherent |

## Pipeline health

| Gauge | FY26 state |
|---|---|
| Tagged | 99.8% by dollars — 9 untagged lines, $1,525 total |
| Reconciled flag | 1,341/1,649 (81%) — ⚠ mirror `is_reconciled` reads low; per-transaction single-GET is the only truth |
| Receipted flag | 880/1,649 (53%) — ⚠ stale mirror (`has_attachments` drifts); Spending Intelligence's refreshed measure reads 95.3% |
| Deleted rows excluded | 444 DELETED FY26 rows filtered out (June 2026 reconciliation clean-up) |

## Caveats (read before quoting any figure onward)

1. **Founder drawings sit outside this P&L** (account 880 Drawings). They are 81% of the
   FY26 R&D-eligible flag — the realistic R&D basis is ~$55K of direct spend, not the
   headline flag of $238K.
2. **Point-in-time:** figures reflect the last Xero→Supabase sync before 7 Jun 2026
   04:55 UTC. June 2026 has barely landed.
3. **Income by cash is not comparable** to accrual revenue (RECEIVE-TRANSFER settlement
   pattern) — never quote the $284K as "income".
4. **ACT-IN** is the internal/ops cost pool — its −$154K is structural, not a failing
   project.
5. This is the **operational** project P&L. The statutory P&L for tax/BAS purposes is
   Xero itself; this report's pipeline exists to make Xero trustworthy, not replace it.
