# Provenance — Xero Health + Q2/Q3 Reconciliation Review (2026-05-29)

## Sources

| Data | Source | Method | Confidence |
|---|---|---|---|
| Bank balances | Supabase `xero_bank_accounts` (balance_updated_at 2026-05-27 20:00 UTC) | SQL | **Verified** |
| Cash position / working capital | live Xero via `mcp__claude_ai_Xero__get_cash_position` (refreshed 2026-05-28 17:15 UTC) | MCP | **Verified** |
| P&L Oct–Mar | live Xero `get_profit_and_loss` (tool period 2025-09-30→2026-03-30) | MCP | **Verified** (note period boundary shift) |
| Reconciliation status | Supabase `xero_transactions.is_reconciled`, AUTHORISED, ACT accounts, 2025-10-01..2026-03-31 | SQL | **Verified** (reflects sync as of synced_at; Xero may have moved since) |
| Spend / receipt coverage / R&D flags | Supabase `xero_transactions` (type=SPEND, status=AUTHORISED) | SQL | **Verified** |
| Bill/invoice status | Supabase `xero_invoices` grouped by type+status | SQL | **Verified** |
| Duplicates | Supabase `xero_transactions` group-by date+contact+total HAVING count>1 | SQL | **Verified** (candidates; legitimacy not confirmed) |
| Telford Smith detail | Supabase `xero_transactions` line_items jsonb | SQL | **Verified** (tax codes differ; not confirmed dup) |
| Integration scopes | `node scripts/refresh-xero-token.mjs` endpoint test 2026-05-29 | script | **Verified** |
| Migration context (Pty ACN, Remco actions, SL items) | MEMORY.md / prior handoffs | recall | **Inferred** — confirm with Standard Ledger / Remco |

## Key reconciliations / sanity checks
- NAB Visa AUTHORISED SPEND splits 551(Q2)+482(Q3)=1,033 ✓ and $258,555+$120,459=$379,014 ✓.
- Everyday SPEND 20+15=35 ✓, $162,746+$42,490=$205,236 ✓.
- Net ACT bank +$130,056 = Everyday $303,982 − Visa $173,925 ✓ (matches prior-session $130K figure).
- Cash balance $303,981.73 = Everyday account balance ✓.

## Known gaps / caveats
- **Two tables for bank txns:** `xero_transactions` (3,682 rows, current to 2026-05-28) is authoritative. `xero_bank_transactions` (5,661 rows, 2022→2025-11) is a stale/legacy table — NOT used in this review.
- **Everyday bank statement not imported** into `bank_statement_lines` (only NAB Visa present) → statement-line analysis is card-only.
- `is_reconciled` reflects the last Xero→Supabase sync, not necessarily this instant.
- Duplicate "excess" ($40K) is a nominal upper bound, mostly false positives (Qantas).
- P&L is the commingled sole-trader org — not ACT's standalone economics.
- R&D-eligible flags ($92.7K on bank spend) are system-tagged, not accountant-confirmed; real R&D base also includes ACCPAY bills + wages.

## Reproduce
- Org: Xero `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0` ("Nicholas Marchesi"); Supabase `tednluwflfhxyucgwigh`.
- Refresh token + verify scopes: `node scripts/refresh-xero-token.mjs`.
- All SQL run via Supabase MCP `execute_sql` against `public` schema; queries scoped to 2025-10-01..2026-03-31 and the two ACT accounts.
