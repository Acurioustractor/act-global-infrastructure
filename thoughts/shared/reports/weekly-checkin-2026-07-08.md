# Weekly Finance Check-in — Week of 2026-07-08

First pass of the new cadence (`wiki/finance/weekly-finance-checkin.md`). Read-only
status pulled live from Xero + the Supabase mirror. **The reconcile clicks below
are Xero UI-only — this pass prepares the worklist; the clicks stay with Ben/SL.**

## Context
- **FY27** (1 Jul 2026 – 30 Jun 2027), 8 days in. **FY26 closed.**
- **Standard Ledger just lodged the last two BAS** (per Ben) → books clean through
  FY26. Q4 FY25-26 marked `filed` in `compliance-calendar.md` (⚠ confirm exact
  lodge date + which two quarters with SL).
- Xero still connected to the **sole-trader org** (Nicholas Marchesi) — Pty cutover
  hasn't switched Xero yet.
- **Cash $129,579 · receivables $598,036 · payables $312,888** (payables still
  carry unreconciled/phantom AP — the accrual figure, not real debt).

## Nearest deadline
**BAS Q1 FY26-27 (Jul–Sep 2026) — due 28 Oct 2026**, first Pty Ltd BAS. T-112.
No pressure yet; the job now is to keep the new quarter clean from day one.

## Reconcile worklist — 29 open NAB Visa #8815 lines (all have receipts attached)

**Only the reconcile click is missing.** ~15 min in Xero. Work newest-first.

**4 lines need a project code first** (tag on `/finance/tagger-v2`, then reconcile):
| Date | Vendor | Amount | Suggested code |
|---|---|---:|---|
| 2026-07-06 | Apple Pty Ltd | $14.99 | ACT-IN (or Drawings if personal — confirm) |
| 2026-07-02 | Hugging Face | $13.06 | ACT-IN (AI/infra) |
| 2026-07-01 | Qantas Group Accommodation | $440.00 | ACT-EL (NT field trip) |
| 2026-06-23 | Qantas | $1,492.66 | ACT-EL (NT field trip) |

**25 lines already coded** — reconcile as-is. Dominated by the **NT Empathy Ledger
field trip (ACT-EL)**: Elliott Store, Arlparra, Diplomat Motel, Nyinkka Cafe,
Sportspower/Woolworths/IGA/Kmart Alice Springs, Alice Springs Telegraph. Plus
ACT-GD (Supercheap, Furniture Discounts, Pigglys, GM Taxipay), ACT-IN (HighLevel×3),
ACT-CN (Australia Post, Officeworks), ACT-HV (IGA Witta ×2). Residual FY26: Qantas
$1,492.66, Supercheap $310.94, Officeworks $116.30, HighLevel $139.26, IGA ×2, etc.

## Receipts / Dext state
- **Dext: 1,539 / 1,550 linked (99.3%)** — the rail is healthy.
- **Orphan pile to clear (systemic):** Gmail `review` 275 · Gmail `captured` 97 ·
  Gmail `failed` 17 · Dext `review` 39. → see `dext-xero-ai-alignment.md` (demote
  the Gmail publisher to a gap-detector; forward real gaps into Dext).

## Log entry (mirrors into weekly-finance-checkin.md §4)
- **Nearest deadline + movement:** Q1 FY27 BAS T-112; FY26 closed & lodged → nothing at risk.
- **Receipts:** Dext 99.3% linked; 428-item Gmail/Dext review backlog identified for pipeline fix.
- **Card:** 29 open Visa lines, all receipted → clicks pending in Xero UI (~15 min); 4 need coding.
- **Mirror caveat:** `is_reconciled` counts are mirror-side (single-GET is truth); expect small drift.
- **Learned / filed:** built `dext-xero-ai-alignment.md` — three-rail → one-rail plan.
- **Human minutes:** ~0 (agent status pass); ~20 min of clicks queued for Ben/SL.
