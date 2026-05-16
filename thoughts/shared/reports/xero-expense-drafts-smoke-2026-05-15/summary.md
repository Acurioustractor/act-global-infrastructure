# Xero Expense Drafts Smoke

Generated: 2026-05-15T05:15:32.062Z

## Endpoint Access
- verified: Organisation returned HTTP 200.
- verified: Receipts returned HTTP 200.
- verified: ExpenseClaims returned HTTP 200.

## Counts
- Receipts endpoint rows: 0
- ExpenseClaims rows: 0
- Receipts embedded in expense claims: 0

## Receipt Status Counts
- none returned

## Expense Claim Status Counts
- none returned

## Triple Bull Candidate Search
Target bank line: 2026-03-25, $153.00, TRIPLE BULL CRONULLA.

_No matches._

## Operational Interpretation
- verified: Xero API exposes draft receipt records through the Receipts endpoint for this tenant/token.
- verified: Xero API exposes expense claim records through the ExpenseClaims endpoint for this tenant/token.
- inferred: the Triple Bull Xero Me item is not visible through the tested Accounting API receipt/claim endpoints, or its amount/date/text are too different for this search.

## Safety
- verified: this script only called Xero GET endpoints.
- unverified: no Xero UI draft submit/approve/reconcile action was attempted.
