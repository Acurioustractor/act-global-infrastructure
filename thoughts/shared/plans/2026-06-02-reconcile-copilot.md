# Reconcile Co-pilot — build plan (2026-06-02)

> Extend `/finance/reconcile` into a read-only co-pilot that mirrors Xero's reconcile screen line-for-line, so Ben transcribes instead of decides. Grounded in `RECONCILE-PLAYBOOK.md` §3c/§4 and the verified ceiling (no API reconcile — the click stays in Xero, forever).

## Why
The 467-line #8815 reconcile is all judgement, no automation possible. The co-pilot precomputes every judgement (Match this txn / Create with this code / Transfer from ACT Everyday / Void-skip / DANGER) and shows it beside Xero. Read-only; zero added risk.

## Current state (what exists)
`apps/command-center/src/lib/finance/reconcile.ts` — pure, TDD'd engine: `classifyLine` cascade (duplicate/approve_draft/match_bill/match_txn/already_reconciled/create), surcharge math, learned project, `buildReconcileResponse`, loaders that page past the 1000-cap. Route `api/finance/reconcile/route.ts`, page `app/finance/reconcile/page.tsx`. **Gap: debit-only.** `loadCardLines` filters `direction='debit'` — the entire credit side (repayments → Transfer, refunds → offset) is absent, and there's no `danger` flag or Xero-mirror ordering.

## Verified constraints (do not violate)
- API CANNOT set IsReconciled (Xero policy, declined 6 May 2026). Read-only; the reconcile click stays in Xero.
- Mirror lies on `is_reconciled` / status — page-load shows mirror value + a staleness note; never claim "live" without a per-line GET.
- Money math is TDD'd — every new total (transferValue, refundValue) needs a failing test first. A $40K repayment misclassified as income is the expensive failure.

## Phases

### Phase 1 — Engine: the credit side + danger flag + mirror order (TDD-first) ← THIS PR
- `CardLine.direction: 'debit' | 'credit'`; load BOTH directions.
- New actions `transfer` (repayment: particulars ~ "INTERNET PAYMENT" → Transfer from NJ Marchesi T/as ACT Everyday) and `refund` (merchant credit → offset a same-amount debit / match a credit note).
- `ReconcileLineResult.danger: boolean` — true when matched bill is AUTHORISED (unpaid): real-payment-vs-phantom, needs per-line judgement.
- Summary: add `transferCount/Value`, `refundCount/Value`.
- `ReconcileFilters.sort: 'action' | 'date'` — 'date' mirrors Xero's screen order.
- Tests in `reconcile.test.ts`: repayment→transfer, merchant→refund-with-offset, AUTHORISED-bill→danger, summary totals, debit path unchanged (no regression).
- Gate: `npx tsc --noEmit` clean + tests pass. Commit at boundary.

### Phase 2 — API route
- Surface direction, danger, sort, new summary fields. Sign receipt URLs (existing pattern). Keep response back-compat.

### Phase 3 — UI co-pilot
- Rows ordered to mirror Xero (date sort default), each showing: recommended ACTION pill (MATCH/CREATE/TRANSFER/REFUND/VOID-SKIP), matched `BankTransactionID` (copyable), mirror `is_reconciled` + staleness note, receipt thumbnail/link, **DANGER badge** on the AUTHORISED-bill cluster. Vendor search + action filter (exist). A "what to type in Xero" line per row.
- Two-column read-down-in-lockstep layout note.

### Phase 4 — polish (later)
- Per-line "verify live" button (single GET, rate-limited) for the danger cluster only.
- Bank-rule pack export (top vendors → copy-paste rule defs).

## Out of scope (verified off-limits)
- Any API write that reconciles. Playwright RPA on money. Touching partner-org books (that's the platform, a separate decision).
