# Provenance: Xero Files Library Scan

Report: thoughts/shared/reports/xero-files-library-2026-05-15.md
Generated: 2026-05-15T05:25:02.538Z

## Data Sources Queried
- Xero Files API `GET /Files`.
- Xero Files API `GET /Folders`.
- Supabase `xero_transactions` for unreceipted SPEND transaction names.
- Supabase `xero_tokens` for token refresh persistence if required.

## Mutations
- No Xero accounting or Files Library mutation was performed.
- OAuth token mirrors may be rotated and persisted when the access token is expired.

## Verified
- File/folder counts come from live Xero Files API responses.
- Missing-vendor comparisons use current Supabase Xero transaction mirror rows.

## Inferred
- Vendor matches are filename heuristics only; amount/date must be checked before linking.

## Unknown
- Whether a floating file is the correct receipt until a human confirms image/PDF content.

## Reproduce
```bash
node scripts/xero-files-library-scan.mjs
```
