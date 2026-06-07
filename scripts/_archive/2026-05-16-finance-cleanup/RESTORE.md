# Restore notes — 2026-05-16 finance script archive

Two scripts archived. Full rationale: `thoughts/shared/handoffs/2026-05-16-money-audit/decisions.md`.

| Archived | Why | Restore |
|---|---|---|
| `audit-all-secrets.mjs` | 5 months untouched — stalest finance-adjacent script. If revived, cross-check with the env-secrets-manager skill. | `git mv scripts/_archive/2026-05-16-finance-cleanup/audit-all-secrets.mjs scripts/` |
| `receipt-pipeline.mjs` | 9w stale; superseded by the 3-stage chain `capture-receipts.mjs` → `match-receipts-to-xero.mjs` → `push-receipts-to-xero.mjs` | `git mv scripts/_archive/2026-05-16-finance-cleanup/receipt-pipeline.mjs scripts/` |
