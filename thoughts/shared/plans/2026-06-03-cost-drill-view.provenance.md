# Provenance — Cost-Drill view numbers

**Report:** `thoughts/shared/plans/2026-06-03-cost-drill-view.md` + the `/finance/cost-drill` view
**As-of:** 2026-06-03 (after `node scripts/calculate-project-monthly-financials.mjs` refresh)
**Supabase instance:** Shared operational DB `tednluwflfhxyucgwigh` (env `NEXT_PUBLIC_SUPABASE_URL`)

## Sources
- **`project_monthly_financials`** — the maintained per-project/month rollup `{revenue, expenses, net}`, built from PAID ACCREC invoices + bank `xero_transactions` (NOT AUTHORISED invoices). Rebuilt this session via `scripts/calculate-project-monthly-financials.mjs` (idempotent): *132 monthly records upserted from 145 buckets; 2146 transactions processed.*
- **Fold map** (`LEGACY_WRAPPERS`, from `scripts/lib/project-resolver.mjs`): `ACT-HQ→ACT-CORE`, `ACT-CG→ACT-CS`, `ACT-PC→ACT-PI`. The rollup stores legacy codes separately; this view folds them.
- **Reproducer:** `node scripts/cost-drill-ground-truth.mjs` (committed) — selects FY26 (`2025-07-01..2026-06-30`), folds, prints per-project + totals.

## Verified (queried the source directly)
Folded FY26 per-project P&L, by expenses desc (146 rows; AUD, rounded):

| code | revenue | expenses | net |
|---|--:|--:|--:|
| ACT-CORE | 539,952 | 508,106 | 31,847 |
| ACT-GD | 483,627 | 220,196 | 263,432 |
| ACT-IN | 744 | 154,567 | **−153,823** |
| ACT-HV | 170,601 | 55,466 | 115,135 |
| ACT-OO | 103,100 | 37,091 | 66,009 |
| ACT-FM | 7,048 | 34,701 | −27,653 |
| ACT-PI | 365,200 | **28,973** | 336,227 |
| ACT-JH | 117,655 | **1,071** | 116,584 |
| **TOTAL** | **1,905,445** | **1,090,085** | **815,360** |

- **Legacy fold verified:** only `ACT-HQ` has FY26 rows (rev 268,308 / exp 244,042 / net 24,266) → merged into `ACT-CORE`. `ACT-CG`/`ACT-PC` have no FY26 rows currently.
- **Key insight confirmed:** revenue is attributed, expenses are not. JH ($1,071 exp on $117,655 rev), PICC ($28,973 on $365,200), and the ACT-IN −$153,823 overhead pool are the targets for reassignment.

## Inferred / caveats
- These totals are a **moving target** — every reassignment via this view changes them (that is the point). The Phase-1 fold **unit test pins fixture data, NOT these live numbers**, so it stays deterministic. This table is the as-of snapshot, not a test oracle.
- The ledger's prior snapshot read exp $1.19M / net $719k; the refresh moved it to **$1.09M / $815k** as June + current tags landed. Difference is expected (new tags + June rows), not a discrepancy.
- `project_monthly_financials` has no `entity_code` column (all ACT-ST today).

## Gaps
- Drill lines come from `xero_invoices` (ACCPAY AUTHORISED/PAID) + `xero_transactions` (SPEND) per project; bill-payments deduped (vendor+amount+date±14d). Income/RECEIVE shown but not the reassignment focus.
- Receipt flag = `has_attachments` (drifts on txns per known trap; accurate on invoices).
