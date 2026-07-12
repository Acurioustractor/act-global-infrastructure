# Provenance — SL clean-up answered CSV

**Artifact:** `ACT_Nicholas Marchesi - Unreconciled Transactions - ANSWERED.csv`
**Generated:** 2026-06-23
**Source sheet:** `Clean up_ ACT_Nicholas Marchesi  - Unreconciled Transactions.csv` (Standard Ledger), 66 lines, period 1 Oct 2025 – 31 May 2026.
**Accounts:** NJ Marchesi T/as ACT Everyday (bank) + NAB Visa ACT #8815 (card) — the two ACT business accounts (sole trader, ABN 21 591 780 066).

## How it was produced (reproducible)
1. `scripts/sl-cleanup-reconcile.mjs` — parses the SL sheet; matches each line against the Supabase mirror (`bank_statement_lines`, `xero_transactions`, `xero_invoices`, `finance_receipt_documents`) by amount + date window + vendor token. → `grounded.json`.
2. `scripts/sl-cleanup-gmail-hunt.mjs` — raw Gmail API search across the 4 delegated ACT mailboxes (`benjamin/nicholas/hi/accounts @act.place`) by vendor + date for the receipt-gap lines. → augments `grounded.json`.
3. `thoughts/shared/handoffs/sl-cleanup/classify-workflow.mjs` — 8 classifier agents + 28 adversarial verifier agents (36 total). Each line classified for nature / project / Xero account / GST treatment / receipt status; income, drawings, ≥$1,000, and receipt-mismatch lines independently refuted. → `verdicts.json`.
4. `scripts/sl-cleanup-build-csv.mjs` — writes the answers into the "Your Comments" column, preserving every original row verbatim. → the answered CSV.

## Totals (tie-out)
- Spent: **$131,485.48** · Received: **$179,613.03** — both reconcile to the sum of the parsed SL lines (received total verified line-by-line against the index map).

## Confidence levels
- **Verified (queried directly):** project codes (from `bank_statement_lines.project_code`, set by prior tagging); existing Xero account/tax codes where a real txn/bill matched (line_items); the 6 ON_FILE receipts; the Gmail candidate subjects/senders (raw Gmail API).
- **Inferred (domain reasoning, not source-confirmed):**
  - Income classifications (TFN → Grants Received; Catalysing Impact → Grants Received; Humanitix → ticket revenue) — based on known funder/platform identity, **not** a per-payment grant agreement on file.
  - GST treatments — based on vendor domicile + transaction type; not confirmed against an actual tax invoice except where a receipt is on file.
  - "Nicholas Marchesi Su…" = superannuation — inferred from the truncated descriptor; not confirmed.
- **Unverified / open (needs Ben or a document):** 28 lines flagged `needs_ben`. Specific open items called out in the comments: Humanitix gross-vs-net split + sole-trader GST-registration status for the period; whether each P2P transfer was a reimbursement / honorarium / contractor (PAYG-withholding implications); the project a $20K Ross Built and $32,780 Circularity payment belong to.

## Known traps handled
- **Coincidental-amount false receipts** rejected: 3 lines (Christopher Dods $2,000, Shane Bloomfield "Bunnings" $200 → Woolworths receipt, Marcus Travers $200 → Woolworths receipt) were amount-only matches with no vendor alignment → marked `RECEIPT_VENDOR_MISMATCH`, no receipt claimed.
- **GST not claimable without a valid tax invoice** — the Bunnings reimbursement was downgraded from "GST on Expenses" to GST-free pending the actual invoice (adversarial verifier correction).
- **Original rows preserved** — the malformed Catalysing Impact row (particulars duplicated into the Spent column) is left as SL exported it; only column 6 is populated.

## Deep-hunt receipt recovery (2026-06-24 — appended)
A second-pass Gmail hunt (`scripts/sl-cleanup-gmail-deephunt.mjs`, wider ±40-day window + curated
vendor queries + sender-domain guesses + body-amount confirmation across all 4 mailboxes), with
attachment-level confirmation (`scripts/sl-cleanup-confirm-receipt.mjs`), recovered receipts for
**6 lines** that were previously GAP/mismatch. Applied via `scripts/sl-cleanup-apply-receipts.mjs`.
GAP count: **30 → 26**.

- **Verified (vendor-exact + invoice PDF or amount-tie-in-body):**
  - #47 Carla Furnishers −$4,816 — tax invoice **26-00000151.pdf** (`pos@retailexpress.com.au`, nicholas@, 28 Jan 2026; also on Adrian Venturin's "Goods Project" thread). **GST now claimable** — upgraded receipt_status to `GMAIL_FOUND`.
  - #64 Colemans Printing −$240.05 — tax invoice **Invoice-CA120130.pdf** (`alice.office@colemanprint.com.au`, benjamin@, 20 May 2026).
  - #44 Colyton Hotel −$436.24 — booking #5406236, amount $436.24 confirmed in body (nicholas@).
  - #39, #45 Audible −$16.45 ×2 — `donotreply@audible.com.au` "order complete", $16.45 confirmed (benjamin@). (#39 still `needs_ben` — office-vs-Drawings call.)
- **Lead (booking confirmation, amount in attachment/portal — folio to confirm on forward):**
  - #53 Tullah Lakeside Lodge −$374.07 — `GMAIL_LEAD`.
- **Rejected (kept as GAP — receipt-trap discipline):** #55/#57/#59 ADGE Hotel (generic "Booking Confirmed" emails, no amounts, dates don't map to the Feb/Mar/Apr charges — a real ADGE corporate relationship exists in benjamin@ but no per-charge folio); #26 JMC No2 (only Maleny Hardware / Budget Rental candidates — vendor mismatch); Kogan #51 amount-only hit was a marketing email (`store-news@e.kogan.com`) — false positive, rejected.

## Not done (scope boundary)
- No writes to Xero. This is a read-only advisory draft for Ben to review, decide the flagged calls, and send back to Standard Ledger. No `IsReconciled`/coding changes were made.
- **Still GAP (26 lines)** — mostly small travel/meal card purchases (Guzman, Maple St, Scopri, Orso, Big W, BearPep, Hertz, Bargain Car, Steelmart, etc.) where the receipt is a paper/card slip not in email. These need the **fresh Dext export** to close (Dext snapshot is stale for Apr/May — see HANDOFF blocker 1).
