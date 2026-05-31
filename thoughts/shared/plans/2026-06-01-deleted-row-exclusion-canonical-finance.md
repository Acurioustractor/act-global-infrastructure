# DELETED-row exclusion on canonical finance surfaces

**Created:** 2026-06-01 · **Status:** queued (do in a clean context — this is canonical R&D-claim money code)
**Precedent:** workbench fix shipped `a09b7ea` on `wip/opus-4-8-prompting-2026-05-31` (same bug, display surface). Memory: `command-center-finance-truth.md` → DELETED bullet.

## Problem (verified 2026-06-01 via direct SQL on shared DB `tednluwflfhxyucgwigh`)

Voided Xero rows stay in `xero_transactions` / `xero_invoices` with `status='DELETED'`. FY26 (2025-07-01..2026-06-30):
- **309 DELETED txns ($429K)**, incl. **249 DELETED `SPEND` rows ($32,288)**, of which **205 are `rd_eligible` ($31,761)**.
- These inflate spend totals AND the 43.5% R&D-eligible-spend figure. On the workbench, the headline read **$325,947** when the true (authorised-only) figure is **$294,186** — a $31,761 / ~10% overstatement feeding a ~$13.8K refund line.

The workbench is fixed. **Two canonical surfaces still inherit the bug** (both confirmed by reading the code — neither filters `status`):

### 1. `apps/command-center/src/lib/finance/ledger.ts` — `getOrgLedger`
- `spendPage` (~line 128) and `receivePage` (~line 135) read `xero_transactions` filtered by `type` + `date` only — **no status filter**. DELETED `SPEND` rows flow into `cashSpent` and `rdEligibleSpend` (~line 179).
- Bills are already safe (`billPage` filters `.in('status',['AUTHORISED','PAID'])`).
- Transfers already safe (`SPEND_TYPES = ['SPEND','SPEND-OVERPAYMENT']` excludes `-TRANSFER`).
- This feeds `/company` P&L context + is the **R&D claim basis** (`rdEligibleSpend`, `rdPotentialRefund` @ `RD_REFUND_RATE = 0.435`).

### 2. `scripts/calculate-project-monthly-financials.mjs` — populates `project_monthly_financials`
- Line ~50-55 reads `xero_transactions` with `date` only — **no status filter**. DELETED `type==='SPEND'` rows (~$32K) get bucketed into `expenses` (line ~153).
- Transfers already safe (exact `type === 'SPEND'` / `=== 'RECEIVE'` match excludes `-TRANSFER`).
- ACCREC invoices already safe (`.eq('status','PAID')`).
- `project_monthly_financials` is the headline accrual P&L for `/strategy`, `/company` (via `getMonthlyPL`), `reports/*`, and `sync-finance-to-notion.mjs`.

## Fix (TDD-first per the money-math rule)

1. **`ledger.ts`** — add `.neq('status','DELETED')` to `spendPage` + `receivePage`. Write a failing unit test first asserting `rdEligibleSpend` excludes a DELETED rd_eligible SPEND fixture. (No vitest in repo — run tests with `node --import tsx --test <file>`; `tsx` is at root `node_modules`. The project test runner is `node --test scripts/tests/*.test.mjs`.)
2. **`calculate-project-monthly-financials.mjs`** — add `.neq('status','DELETED')` to the `xero_transactions` fetch (line ~50-55).
3. **Repopulate (⚠️ Tier-2 data write — get the explicit go-ahead):** re-run `node scripts/calculate-project-monthly-financials.mjs` to rebuild `project_monthly_financials` without the DELETED rows. This shifts headline expenses ~$32K down. Cross-check the new totals against the bank before trusting.

## Verification / done criteria
- ledger.ts unit test green; `getOrgLedger().rdEligibleSpend` drops by the DELETED rd-eligible amount (≈ up to $31.7K — confirm exact, ledger adds rd-vendor bills on top).
- After repopulate, `project_monthly_financials` FY26 expenses drop ~$32K; `/company` + `/strategy` net rises accordingly. Re-verify net reconciles with bank.
- `tsc --noEmit` clean in `apps/command-center`.
- Update `command-center-finance-truth.md` memory: move ledger.ts + rollup from "UNFIXED" to fixed.

## Guards
- Two-account rule (NAB Visa #8815 + NJ Marchesi T/as ACT Everyday only).
- Don't touch auto-tagger `manual%` guard.
- This is canonical R&D-claim code → review the diff in a clean context, not the implementing one.
