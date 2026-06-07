# Finance Nit-Fix Confirmation Review — 2026-06-01

**Verdict: CONFIRMED**

Fresh-context confirmation that the two latent risks flagged by the prior clean-context
APPROVE-WITH-NITS review (on commits `fd47762` + `c1b401b`) are correctly fixed with no regression.

## Commit reviewed

> Note: the prompt named commit `47ff3f7`, which does not exist in this repo. The actual
> nit-fix commit is **`9aec8ae`** — "harden(finance): NULL-safe DELETED guards + tighten
> card-payoff regex (review nits)" — touching exactly the three named files
> (`workbench.ts`, `ledger.ts`, `calculate-project-monthly-financials.mjs`). Reviewed `9aec8ae`.

## Nit 1 — NULL-status safety — CONFIRMED

The fix replaced the non-NULL-safe DELETED guards with NULL-safe forms on every money surface
named in the nit. Verified by reading the diff and grepping the tree:

| Surface | Before | After (in `9aec8ae`) | Status |
|---|---|---|---|
| workbench summary SQL (xero_project_gaps, invoice_project_gaps, act_in_review ×2, rd_review, rd_eligible_spend) | `status <> 'DELETED'` | `status IS DISTINCT FROM 'DELETED'` | CONFIRMED |
| workbench loader — xero_transactions (`loadWorkbenchRawRows`) | `.neq('status','DELETED')` | `.or('status.is.null,status.neq.DELETED')` | CONFIRMED |
| workbench loader — xero_invoices | `.neq('status','DELETED')` | `.or('status.is.null,status.neq.DELETED')` | CONFIRMED |
| ledger.ts `spendPage` | `.neq('status','DELETED')` | `.or('status.is.null,status.neq.DELETED')` | CONFIRMED |
| ledger.ts `receivePage` | `.neq('status','DELETED')` | `.or('status.is.null,status.neq.DELETED')` | CONFIRMED |
| monthly-rollup fetch (`calculate-project-monthly-financials.mjs`) | `.neq('status','DELETED')` | `.or('status.is.null,status.neq.DELETED')` | CONFIRMED |

**(a) AND-combination is correct — Verified.** In supabase-js / PostgREST, a top-level `.or(...)`
is AND-combined with all other top-level filters (`.gte`/`.lte`/`.in`/`.eq`). The OR groups only its
two own conditions (`status IS NULL` OR `status <> 'DELETED'`), giving NULL-safe "not DELETED". The
date/type filters are preserved as AND. The SQL `IS DISTINCT FROM` form is the direct three-valued-
logic-safe equivalent and remains AND-joined inside each subquery WHERE clause. Confirmed by reading
the full filter chains at `workbench.ts:686-695` (tx), `:699-708` (invoices), `ledger.ts:129-141`.

**(b) No stale guards remain on money surfaces — Verified.** Grep across
`apps/command-center/src` + `scripts/calculate-project-monthly-financials.mjs`:
- `<> 'DELETED'` (SQL): **NONE**.
- `.neq('status','DELETED')` on the in-scope money-total / R&D surfaces: **NONE**.
- Remaining `.neq('status','DELETED')` hits are all in *out-of-scope* peripheral scripts
  (`match-receipts-to-xero`, `bas-completeness`, `bas-retrospective`, `audit-money-*`,
  `xero-suggest-matches`, `sync-*-to-notion`, `link-ghl-to-xero-and-win`, and one `_archive/`
  file). These are receipt-matching / BAS-completeness / Notion-sync surfaces, NOT the core
  money totals or the 43.5% R&D claim basis the nit targeted. Not a regression; not in scope of
  `9aec8ae`. (Optional future hardening, not required for this confirmation.)

**Bills path note:** `ledger.ts:123` filters bills with `.in('status', ['AUTHORISED','PAID'])` — an
explicit allowlist that already excludes DELETED *and* NULL. Correct as-is, no change needed.

## Nit 2 — CARD_PAYOFF_RE tightened — CONFIRMED

`workbench.ts:294-296`:
```
const CARD_PAYOFF_RE = /internet payment|credit card payment|card repayment|linked acc|bpay/i
```
- Bare `transfer` / `payment received` / `payment thank` — **removed**. Verified.
- Anchored phrases `internet payment|credit card payment|card repayment|linked acc|bpay` — **kept**. Verified.
- Still classifies all current card payoffs as transfers: live payoffs read "INTERNET PAYMENT ..." /
  "...Linked Acc ..." which match `internet payment` / `linked acc`. Regression-confirmed empirically
  by the live count below (transfer 48 unchanged) and by unit test #4.

## Regression checks — all Verified (queried live shared DB `tednluwflfhxyucgwigh`)

Probe imported `getOrgLedger` (`ledger.ts`) + `getFinanceWorkbench` (`workbench.ts`), ran via
`node --import tsx --env-file=.env.local`, then deleted. Results identical to pre-nit:

| Check | Expected (pre-nit) | Observed | Status |
|---|---|---|---|
| getOrgLedger FY26 — rdEligibleSpend | 508914 | 508914 | Verified — unchanged |
| getOrgLedger FY26 — cashSpent | 944292 | 944292 | Verified — unchanged |
| workbench bank_lines — xeroProjectGaps | 0 | 0 | Verified — unchanged |
| workbench bank_lines — rdEligibleSpend | 294186 | 294186.18 | Verified — unchanged |
| bank items — income | 0 | 0 | Verified — unchanged |
| bank items — transfer | 48 | 48 | Verified — unchanged |
| bank items — refund | 28 | 28 | Verified — unchanged |

(bank totalItems = 1618; refund counted via `item.isRefund === true`, transfer/income via
`item.direction`. One paged sub-fetch surfaced a transient Supabase Cloudflare 520 in stderr on the
first run; a clean re-run reproduced all three result lines identically — not a code issue.)

- Unit tests: `node --import tsx --test src/lib/finance/workbench.test.ts` → **5/5 pass** (includes
  test #4 "interprets credit-card credits as transfers/refunds, not income"). Verified.
- Type check: `npx tsc --noEmit` in `apps/command-center` → **exit 0, clean**. Verified.

## New findings

None blocking. One optional, out-of-scope observation: the peripheral scripts listed under Nit 1(b)
still use the non-NULL-safe `.neq('status','DELETED')`. They don't feed the canonical money totals
or the R&D claim, so they're harmless today (0 NULL-status rows live), but a follow-up sweep could
apply the same `.or('status.is.null,status.neq.DELETED')` form for consistency if any later feeds a total.

## Conclusion

Both nits correctly fixed, NULL-safe AND-combination verified, no `<> 'DELETED'` / non-NULL-safe
`.neq` left on any in-scope money surface, regex tightened without losing live-payoff classification,
all seven regression numbers unchanged, tests 5/5, tsc clean. **CONFIRMED.**
