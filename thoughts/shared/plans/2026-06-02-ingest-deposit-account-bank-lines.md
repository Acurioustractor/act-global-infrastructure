# Ingest the ACT Everyday deposit account into bank_statement_lines

**Created:** 2026-06-01 · **Status:** approach chosen (2026-06-01) — DERIVE from xero_transactions · NOT yet implemented (needs a fresh-context tracer-bullet — Tier-3 write + double-count risk)

## Update 2026-06-01 — chosen approach + de-risking (do these in a fresh context)
**Ben chose: derive deposit-account bank lines from `xero_transactions`** (no external statement file). Findings before implementing:
- **Real volume: 222 ACT Everyday FY26 txns, NOT 106** — my first count hit the PostgREST 1000-row cap (the `.select().limit(5000)` truncated). Composition (status≠DELETED): **65 SPEND ($419K, 23 no-receipt)** · **57 RECEIVE ($283K)** · 80 SPEND-TRANSFER ($779K) · 20 RECEIVE-TRANSFER ($26K).
- **The value is the 65 SPEND** (23 lack receipts → real receipt-gap coverage the deposit account is missing) **+ the 57 RECEIVE** (makes the bank-line "Incoming" view show real deposit income — the done-criterion). The 100 transfers add no receipt/reconciliation value.
- **⚠️ DOUBLE-COUNT RISK (must verify first):** these SPEND/RECEIVE rows are ALREADY visible in the workbench via `source=xero_transactions` / `source=all`. Deriving `bank_statement_lines` rows for the same underlying txns will show them TWICE unless the workbench's bank-line-vs-transaction dedup (via `xero_transaction_id` / `matched_xero_transaction_id`, the way the NAB Visa's ~1,618 lines reconcile against its 891 txns) correctly collapses them. **Trace this before any bulk insert.**
- **Transfer handling:** `bankLineToItem` only special-cases credit-CARD credits — it does NOT treat a deposit-account SPEND-TRANSFER/RECEIVE-TRANSFER as a transfer, so a derived transfer row would mis-classify as spend/income. **Either skip the 100 transfer rows in the derive (recommended — they're handled via the xero_transactions source already) or extend `bankLineToItem` to read the txn type.**
- **Schema (`bank_statement_lines` cols):** id, date, type, payee, particulars, reference, amount, direction (credit/debit), source, status, bank_account, xero_transaction_id, matched_xero_transaction_id, project_code, project_source, rd_eligible, receipt_match_status, … — map xero_transactions → these; set `xero_transaction_id` (pre-linked) + status `reconciled`; carry `project_code`/`rd_eligible`.
- **Tracer-bullet FIRST (CLAUDE.md money rule):** derive ONE deposit SPEND row, confirm it shows once (no double-count) in the workbench + lands in the right receipt-gap queue, THEN bulk. The bulk INSERT is a **Tier-3** write into a shared table → explicit go.
- **Dependency note:** Plan 1's deposit class (credit=income) already works for this account (`accountClass('NJ Marchesi T/as ACT Everyday')` → `deposit`, shipped `c7bc7e0`).

## Implementation spec (turnkey — verified 2026-06-01 against the live DB `tednluwflfhxyucgwigh`)

**✅ Double-count question RESOLVED (safe to derive):** `v_finance_bank_line_evidence` is purely `bank_statement_lines` (LEFT JOIN to receipt links only — NO join to xero_transactions). Bank lines and transactions are SEPARATE item streams that already coexist for the NAB Visa (only **15 of 1,618** NAB lines even carry `xero_transaction_id`), and `buildFinanceWorkbenchResponse` concatenates sources with no dedup. So deriving deposit lines adds a SECOND list representation in `source=all` (same as the NAB Visa today) but does **NOT** double any SUMMARY metric: gap counts are per-source, the deposit SPEND/RECEIVE are already tagged (not in `xero_project_gaps`), and the derived rows carry `project_code` (not in `bank_project_gaps`). `evidence_status` is receipt-based (from `receipt_match_status` + receipt-link candidates), NOT reconciliation-based — so a derived SPEND with no receipt correctly surfaces as a receipt-gap even when `status='reconciled'`.

**Derive ONLY the 122 real rows; SKIP the 100 transfers.** Source: `xero_transactions WHERE bank_account='NJ Marchesi T/as ACT Everyday' AND status IS DISTINCT FROM 'DELETED' AND type IN ('SPEND','RECEIVE')` (65 SPEND + 57 RECEIVE). Do NOT derive `SPEND-TRANSFER`/`RECEIVE-TRANSFER` — `bankLineToItem` only special-cases credit-CARD credits, so a deposit transfer row would mis-classify as spend/income; they add no receipt value and are already correct via the `xero_transactions` source.

**Field map (xero_transactions → bank_statement_lines):**
- `bank_account` = `'NJ Marchesi T/as ACT Everyday'` · `date` = txn.date · `amount` = abs(txn.total) · `direction` = SPEND→`'debit'`, RECEIVE→`'credit'`
- `type` (NOT NULL) = txn.type · `payee` = txn.contact_name · `particulars` = first line-item desc / contact_name · `reference` = txn ref if any
- `xero_transaction_id` = txn.xero_transaction_id · `status` = `'reconciled'` (keeps them out of the unreconciled queue) · `source` = `'xero_derived'` (distinguish from raw-statement rows)
- `project_code` = txn.project_code · `project_source` = txn.project_code_source · `rd_eligible` = txn.rd_eligible
- `receipt_match_status`: RECEIVE → `'no_receipt_needed'`; SPEND with `has_attachments` → `'matched'`; SPEND without → leave NULL (→ evidence_status `'uncovered'` → receipt-gap; these are the 23 deposit SPEND we WANT surfaced)

**Schema-first (verified):** NOT NULL no-default cols = `date, type, amount, direction`. Idempotency: `upsert(rows, { onConflict: 'date,payee,amount,direction,particulars', ignoreDuplicates: true })` (the table's UNIQUE key; same as `ingest-statement-lines-raw.mjs:223`) — re-runs are safe.

**Tracer-bullet FIRST (CLAUDE.md money rule), THEN bulk:**
1. Insert ONE derived line for a single deposit SPEND with no receipt (one of the 23).
2. On `/finance/workbench source=all`: confirm it appears ONCE as a bank line in the Receipt-gaps queue, carries its project_code, is NOT flagged needs_project; confirm `bank_receipt_gaps` +1 while `xero_project_gaps`/`invoice_project_gaps` are unchanged (no metric double-count).
3. Confirm a derived deposit RECEIVE shows `direction='income'` (via accountClass=deposit) and needs no receipt.
4. THEN bulk the 122. **Tier-3 write → Ben's explicit go before the bulk.** Verify attempted-vs-inserted counts (no silent truncation).

**Script home:** new `scripts/derive-deposit-bank-lines.mjs` (dry-run default, `--apply` to write) OR generalise `ingest-statement-lines-raw.mjs` to be multi-account (the plan's "importer no longer hardcodes a single account name" done-criterion — matters for the cutover's NAB business accounts).

---


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
