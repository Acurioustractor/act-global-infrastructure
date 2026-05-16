# Provenance: Xero Expense Drafts Smoke

Report: thoughts/shared/reports/xero-expense-drafts-smoke-2026-05-15/summary.md
Generated: 2026-05-15T05:15:32.062Z

## Data Sources Queried
- Supabase `xero_tokens` via `scripts/lib/finance/xero-client.mjs` for OAuth token resolution/refresh.
- Xero Accounting API `GET /Organisation`.
- Xero Accounting API `GET /Receipts`.
- Xero Accounting API `GET /ExpenseClaims`.

## Mutations
- No Xero accounting data mutation was performed.
- OAuth token mirrors may have been rotated and persisted to Supabase, `.xero-tokens.json`, and `.env.local` as part of normal Xero authentication.

## Verified
- Endpoint success/failure statuses in the report came from live Xero API responses.
- Receipt/claim counts came from live Xero API response bodies.

## Inferred
- Triple Bull candidate relevance is inferred from amount/date/text matching.

## Unknown
- Whether every Xero web/mobile draft expense appears in the classic Accounting API Receipts/ExpenseClaims endpoints.
- Whether any visible candidate should be submitted/approved/reconciled; that requires human/accounting approval.

## Reproduce
```bash
node scripts/xero-expense-drafts-smoke.mjs
```
