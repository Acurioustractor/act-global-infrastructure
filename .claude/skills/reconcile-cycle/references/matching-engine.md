# Matching engine — how a card line gets its verdict

Canonical implementation: `apps/command-center/src/lib/finance/reconcile.ts` (typed, unit-tested
in `reconcile.test.ts`). The CLI co-pilot `scripts/reconcile-line-lookup.mjs` shares the same logic.
This file explains it so you can read a verdict critically — don't trust a fuzzy match blind.

## Inputs

- **Card lines** (what we reconcile): `bank_statement_lines` where `bank_account ILIKE '%8815%'`,
  `direction='debit'`, `status='unreconciled'`, in the FY window. vendor = payee/particulars; amount = ABS.
- **Bills**: `xero_invoices` `type='ACCPAY'`, not DELETED/VOIDED.
- **Card txns**: `xero_transactions` `type LIKE 'SPEND%'` on #8815, not DELETED.
- **Receipt coding** (project + image): `receipt_emails` (vendor_name, amount_detected, project_code,
  attachment_url). This is the live pipeline — NOT the point-in-time Dext CSV the early script used.
  Trade-off: gives project + receipt image, but **no account category** (accounts fall to a heuristic).

All loads page past the PostgREST 1000-row cap (`fetchAllRows`). Bills ~1.5k, txns ~1.7k, receipts ~2.4k.

## The three gates (ALL must pass for a match)

1. **Amount closeness** — `exact` (|Δ| < $0.005) OR `surcharge` (|Δ| ≤ $15 **and** ≤ 6% of the
   reference). Exact beats surcharge. The dual cap is deliberate: $20 never passes (too big in dollars);
   $1 on a $6 coffee never passes (too big in %). Card surcharges are small in both senses.
2. **Date** — within ±12 days.
3. **Vendor token overlap** — normalise (strip `SQ*`/`UBER*`/digits/`PTY LTD`/punctuation), drop
   stopwords (`THE`, `SALES`, `AUSTRALIA`, `CENTRE`…), require ≥1 shared significant token.
   **Amount alone NEVER matches** — this is the "stricter vendor gate" (commit adba653); without it
   every $50 line matches every other $50 line.

Ties break: exact-amount first, then nearest date.

## The cascade (first rule that fires wins)

```
bill AND txn match     → DUPLICATE          (match bill, delete the duplicate txn)
bill, status=DRAFT     → APPROVE_DRAFT       (approve, then match)
bill (approved/paid)   → MATCH_BILL          (+ surcharge as Adjustment)
txn, !is_reconciled    → MATCH_TXN
txn (reconciled/null)  → ALREADY_RECONCILED  (already entered in Xero — do NOT create, would duplicate)
else, receipt match    → CREATE              (project + receipt image from receipt_emails)
else, learned project  → CREATE              (most-common project for this vendor in the pipeline)
else                   → CREATE              (keyword/location heuristic — "code by hand, confirm")
```

**Why ALREADY_RECONCILED matters:** MATCH_TXN only fires for *unreconciled* txns. Without the
ALREADY_RECONCILED branch, a line whose only match is an already-reconciled txn falls through to CREATE
and recommends creating a duplicate of a charge already in Xero — the recurring-subscription trap (Belong
$35/mo). The tracer-bullet caught ~20 such lines. summarizeReconcile counts it as its own bucket, so the
invariant is **match + duplicate + already_reconciled + create = total lines**.

## Surcharge

`surcharge = bank_amount − matched_reference_amount`, rounded to 2dp; shown as a badge when ≥ half a
cent. Positive = the card added a fee on top of the receipt → in Xero, match the bill and **add an
Adjustment line** for the difference (so the bank line clears to zero). Example: Centre Trailer bank
$424.91 vs bill $420.00 → $4.91 surcharge.

## Summary money-math (the TDD'd invariant)

`summarizeReconcile` must satisfy: **match + duplicate + create counts = total lines**, and their dollar
values sum to total value. If that doesn't hold, the classifier is dropping or double-counting — stop and
investigate. (This is the class of bug a single pinned-total test catches; see `reconcile.test.ts`.)

## Reading a verdict critically

The match is a heuristic (vendor + amount + date). The cockpit shows the **receipt image** precisely so a
human eyeballs it before acting. False positives are possible — that's why the skill is read-only and the
reconcile click stays in Xero. When a verdict looks wrong, capture the correction in
`vendor-aliases.md` (bad vendor match) or `confirmed-duplicates.md` (a flagged dup that wasn't one).
