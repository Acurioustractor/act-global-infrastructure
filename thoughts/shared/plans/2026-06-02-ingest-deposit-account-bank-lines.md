# Ingest the ACT Everyday deposit account into bank_statement_lines

**Created:** 2026-06-01 · **Status:** queued (systemic follow-up)

## Problem

`bank_statement_lines` is **100% the NAB Visa #8815** (verified 2026-06-01: 1,618 rows, all that account), written by `scripts/ingest-statement-lines-raw.mjs` which hardcodes `bank_account: 'NAB Visa ACT #8815'`. Consequences:
- The deposit account **`NJ Marchesi T/as ACT Everyday`** — where ACT's real income and most spend land — has **no bank-line evidence**, so receipt-matching + reconciliation in the workbench only cover the credit card.
- The workbench bank-line "Incoming" view is necessarily empty (a credit card has no income), which is correct but only because the income-bearing account isn't ingested.

## Fix

1. Obtain the **ACT Everyday statement source** (CSV/export or Xero bank-feed mirror). NOTE: `ingest-statement-lines-raw.mjs` parses a specific NAB Visa text format — the deposit-account export is likely a different shape; the parser will need generalising or a sibling importer.
2. Ingest with the **correct account name** and **deposit-account direction semantics** (credit = income, debit = spend — the default convention; this is already correct in `workbench.ts` once the account is classed as `deposit`, see [[2026-06-02-account-class-credit-card-detection]]).
3. Generalise the importer to be **multi-account** (don't hardcode the account name) — this matters for the **30 Jun 2026 Pty cutover**, which adds new accounts (NAB business etc.).

## Dependencies / ordering
- Do [[2026-06-02-account-class-credit-card-detection]] FIRST (or together) so the deposit account is correctly classed and its credits read as income, not refund.

## Done criteria
- `bank_statement_lines` contains both the NAB Visa and ACT Everyday (and reconciles row-count vs the source statements).
- Workbench bank-line "Incoming" shows real deposit-account income; receipt/reconciliation coverage spans both accounts.
- Importer no longer hardcodes a single account name.

## Guards
- Two-account rule: ingest only the two ACT accounts (exclude NM Personal + ACT Maximiser).
- Verify attempted vs actual inserted row counts (no silent truncation); dedupe on the existing `onConflict` key.
- No double-count: the deposit-account "Internet Payment" debits paying the Visa are the OTHER leg of the card payoffs already seen as Visa credits — class them as transfers (consistent with `c1b401b`).
