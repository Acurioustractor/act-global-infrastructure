# Receipt System — End-to-End Audit
**Date:** 2026-04-09
**Goal:** Verify the receipt system is correct and complete before any further build. Surface every issue that could cause a real receipt to slip through and never reconcile against a Xero transaction.

---

## TL;DR

- **The receipt system has structural integrity issues, not data loss.** Receipts on disk are accounted for; Xero has the receipts that count for BAS. But the linkage tables are incoherent, which makes the matcher and BAS reports unreliable.
- **The real BAS gap is ~697 SPEND transactions worth $53,152** in Q2+Q3 (excluding BASEXCLUDED, excluding bank transfers). That's the universe of "missing receipts" worth chasing.
- **The matcher is currently producing zero useful auto-matches** because of OCR junk in the candidate pool and a missing amount-mismatch penalty.
- **903 receipts (49% of dext source) are stranded** with `status='uploaded'` but no Xero linkage. They are most likely already in Xero via Dext's direct integration, but we have no way to prove that without backfilling the linkage column.

---

## System map (verified)

```
SOURCES                  →  receipt_emails              →  Xero
─────────────────────────    ────────────────────────       ──────────────────
Dext (1640 → 1639 files)     dext_import: 1640 rows         xero_invoices (ACCPAY bills)
                                                            xero_transactions (SPEND bank txns)
Xero ME (96 files)           xero_me: 96 rows
                                                            Each side has has_attachments flag
Gmail (4 mailboxes)          gmail: 99 rows
                                                            Receipt files live on either bill OR bank txn
Manual upload                manual_upload: 8 rows

                             TOTAL: 1843 rows
```

---

## Layer 1 — Source acquisition (mostly OK)

| Source | Rows | Files on disk | Notes |
|---|---|---|---|
| dext_import | 1640 | 1639 in `receipt-attachments/dext-import/` | 1 row missing attachment_url; 0 duplicates by `dext_item_id` ✅ |
| xero_me | 96 | 96 in `receipt-attachments/xero-me/` | All linked, all uploaded ✅ |
| gmail | 99 | mixed | 4 mailboxes via Google service account |
| manual_upload | 8 | mixed | Small cohort, mostly matched |

**No source acquisition bug found.** Dext file count (1639) matches `receipt_emails` row count (1640) within 1.

---

## Layer 2 — OCR / metadata extraction (gaps)

**213 of 1843 rows (12%) have NO `amount_detected` or `amount_detected = 0`.**

Sampling shows these fall into two clusters:
- **OCR junk** — marketing emails (Squarespace renewals, AWS notifications, GitHub messages, Xero feature announcements, Google AI Studio, Kiro pricing notices). These should be marked junk and excluded from matching.
- **Genuine receipts where OCR failed** — booking confirmations without itemised totals, blank PDFs, ATO forms, direct-debit agreements.

**12 rows have no `vendor_name` at all.**

### Why this matters
The matcher requires `vendor_name IS NOT NULL` to consider a row. So 12 rows are completely invisible to it. The 213 with $0 amount get matched on vendor + date alone, which is what's polluting the ambiguous bucket.

**Fix:** add a `is_junk` boolean column (or use `status='junk'`) and a one-pass classifier that flags marketing/notification emails. Easy heuristic: subject contains "your subscription", "expiring", "price change", "feature update", "notification", "marketing".

---

## Layer 3 — Status taxonomy (broken — needs normalization)

The `status` column has different meanings depending on `source`:

| source | status | count | What it actually means |
|---|---|---|---|
| dext_import | uploaded | **1218** | "Imported from Dext into receipt_emails" — does NOT mean uploaded to Xero |
| dext_import | review | 288 | Match candidate, needs human eyeball |
| dext_import | captured | 103 | OCR done, awaiting matching |
| dext_import | failed | 17 | OCR/upload failure |
| dext_import | matched | 14 | Linked to Xero entity |
| xero_me | uploaded | 96 | Synced from Xero ME (already in Xero) |
| gmail | matched | 52 | Linked but not necessarily pushed to Xero |
| gmail | uploaded | 17 | Pushed to Xero by our script |
| gmail | captured | 15 | OCR done |
| gmail | review | 15 | Awaiting eyeball |
| manual_upload | matched | 6 | Linked but not pushed |
| manual_upload | review | 1 | Eyeball |
| manual_upload | captured | 1 | OCR done |

### The core problem
`status='uploaded'` for dext_import does NOT mean "in Xero with attachment." It means "imported from Dext to our DB." Whereas for `gmail` and `xero_me`, `uploaded` means "actually pushed to Xero."

### The blast radius
- `match-receipts-to-xero.mjs` only re-checks `status IN ('captured','no_match','review')` — so the 903 stranded dext_import "uploaded" rows are invisible to it forever.
- BAS reports that count "uploaded" as "this receipt is in Xero" will be wrong by ~903 receipts.

### Proposed fix
Two columns instead of one ambiguous status:
- `pipeline_status` ∈ `imported|captured|review|matched|junk|failed`
- `xero_uploaded_at` timestamp (NULL if not in Xero)

OR rename current statuses to be source-aware:
- `imported` (dext only), `captured`, `review`, `matched_local`, `pushed_to_xero`, `failed`, `junk`

---

## Layer 4 — Xero linkage (903-row gap)

**903 dext_import rows have `status='uploaded'` and ZERO Xero linkage** (all three of `xero_transaction_id`, `xero_bank_transaction_id`, `xero_invoice_id` are NULL).

### Spot check
Sampled the most recent 10. The first one (Avis $483.60 / 2026-03-10) matches a Xero SPEND transaction (Avis $483.60 / 2026-03-11) with `has_attachments=true`. The receipt is in Xero, just not linked in our mirror.

The 2nd–4th rows (Reddy Express $68.38, Umu Kitchen $13.72) both showed up in this morning's mirror-drift probe as ACCPAY bills with confirmed attachments. These are Dext's direct-to-Xero pushes from before we built the receipt_emails tracking.

### Risk
Without the linkage, we cannot:
- Programmatically prove these 903 receipts are reconciled in Xero
- Detect double-uploads (matcher could re-push something already in Xero)
- Generate clean BAS evidence linking each Xero attachment back to its source receipt

### Fix
**Build `backfill-stranded-dext-links.mjs`:**
1. For each dext_import row with `status='uploaded'` and no linkage
2. Search xero_transactions + xero_invoices for vendor + amount (exact) + date (±2 days)
3. If exactly one match AND that match has `has_attachments=true`, populate the linkage
4. Otherwise flag for review

Expected outcome: ~80% should backfill cleanly. The remaining ~20% are receipts that don't have a current Xero counterpart (cancelled, refunded, never reconciled) and need investigation.

---

## Layer 5 — Matching (broken — 0 auto-matches)

`match-receipts-to-xero.mjs --apply` currently:
- Loads 411 unmatched receipts (status in captured/review/no_match)
- Loads 4089 Xero match targets (last 18 months SPEND/ACCPAY)
- Auto-matches: **0** at ≥80% confidence
- Ambiguous: 154 at 40-79%
- No match: 257

### Why zero auto-matches
1. **OCR junk floods candidates.** $0.00 marketing emails get vendor-name + date hits with random Xero txns and accumulate scores in the 60-77 range without ever needing the amount to be right.
2. **The scorer formula** weights `vendor 0.40 + date 0.30 + amount 0.30` when amount is present, but `vendor 0.55 + date 0.45` when amount is NULL. So a $0.00 OCR-junk receipt gets evaluated as if it had no amount info — which inflates the score dramatically.
3. **No amount-mismatch penalty.** A receipt with $148 is happy to match a Xero txn with $-228 because vendor + date are close. The amount is part of the score but a bad amount only reduces, never disqualifies.

### Fix
Update the scorer in three steps:
1. Treat `amount_detected = 0` differently from `amount_detected IS NULL`. Zero is OCR junk, not "unknown".
2. Add a hard amount-mismatch disqualifier: if both sides have amounts and they differ by >5% AND >$2, return score 0 regardless of vendor/date match.
3. Run the junk-classifier (Layer 2 fix) BEFORE matching so we never load known-junk into the candidate pool.

**Expected impact:** auto-matches should jump from 0 to ~80-120 of the current 411 unmatched.

---

## Layer 6 — Failed uploads (16 stuck)

16 rows with `status='failed'` are linked to a Xero entity but have an error message:
```
Xero Attachments API 500: {"Title":"An error occurred",...}
```

Vendors: Webflow, Uber (multiple), AGL, etc.

### What this is
Persistent Xero 500s on specific transaction IDs (noted in handoff item #5). Some are Xero-side bugs that need a support ticket; others might succeed on retry after Xero internals settle.

### Fix
1. Build `retry-failed-uploads.mjs` that re-attempts the PUT once per row with a 30s timeout
2. For rows that fail on retry, capture the Xero `Instance` ID and emit a `xero-support-tickets.md` report
3. Mark genuinely stuck rows as `status='failed_xero_bug'` so they don't get retried indefinitely

---

## Layer 7 — Reverse coverage (the real BAS gap)

For Q2+Q3 FY26, excluding BASEXCLUDED owner drawings:

| Type | Unreceipted count | Total value | Notes |
|---|---|---|---|
| SPEND (bank txns) | **697** | **$53,152** | The actual chase target |
| SPEND-TRANSFER | 42 | $314,284 | Bank transfers — manual UI reconciliation |
| ACCPAY bills | 4 | $695 | Tiny tail |

### The chase target
697 unreceipted bank transactions worth $53k. After the layer-4 backfill, layer-5 scorer fix, and layer-6 retry, this number should drop substantially. The receipts to chase against this gap are the ~411 currently unmatched in `receipt_emails`.

---

## Issues that could pop up (preemptive checklist)

These are all the failure modes I'd be worried about as we extend the system:

1. **Double-uploads to Xero.** No idempotency guard. If a receipt is already on a Xero txn and we run `upload-receipts-to-xero.mjs` against it, we'd push a duplicate. **Fix:** before PUT, check the target's existing attachments via API and skip if FileName matches.

2. **Storage orphans.** Files in `receipt-attachments/` with no `receipt_emails` row. Not yet checked. Could happen if a row got deleted but file wasn't. **Fix:** nightly diff job.

3. **Receipt orphans.** `receipt_emails` rows pointing to a Xero ID that has been deleted or voided. Would show as "linked but not really". **Fix:** weekly link-validity scan.

4. **Multi-line bills.** A single Xero bill with multiple line items shouldn't be matched to a single small receipt. The matcher currently ignores line item structure entirely.

5. **Refunds and credit notes.** Negative-amount transactions. The current scorer compares `Math.abs(total)` so a $50 refund matches a $50 charge. Should treat sign-mismatch as a strong signal it's the wrong txn.

6. **FX transactions.** USD/AUD on the same vendor + date with amount mismatch. Currently no FX awareness in the scorer.

7. **Receipts spanning multiple Xero txns.** A monthly statement covering 5 individual charges. Currently no "one-to-many" matching.

8. **Duplicate vendor names.** "Apple", "Apple Pty Ltd", "Apple Australia" — same vendor, different `contact_id` in Xero. Vendor alias map exists (547 entries) but isn't comprehensive.

9. **Calendar drift between OCR date and Xero date.** Receipt OCR'd date vs bank-feed date can differ by ±5 days for credit-card transactions. Current ±14 day window is generous but might cause false matches.

10. **Receipts in foreign currency.** The `currency` column exists but matcher doesn't normalize to AUD before comparing amounts.

11. **Token rotation race.** If two scripts run concurrently and both refresh Xero tokens, one will get an `invalid_grant`. Already a known issue, mitigated but not solved.

12. **Storage `.list()` 1000-cap regression.** Any new script that lists `receipt-attachments` and forgets to paginate will silently skip files past 1000.

13. **Phantom vendors from OCR.** Gemini sometimes returns "?" or "Unknown Supplier" as vendor_name. Currently a free pass through the matcher.

14. **Bills paid via multiple bank txns.** Split payments — single bill = N bank txns. Matcher would only link one.

15. **Scheduled `sync-xero-to-supabase.mjs` race vs matching.** If sync runs mid-match, the matcher's view of Xero state is partially stale.

---

## Proposed remediation order

If we want a clean, trustworthy receipt system:

### Phase A — data integrity (≤ 1 hour, no Xero writes)
1. Build `backfill-stranded-dext-links.mjs` (Layer 4) — populates linkage on the 903 stranded rows
2. Build `flag-junk-receipts.mjs` (Layer 2) — marks 213 OCR-junk rows as `status='junk'`
3. Run both. Confirm `receipt_emails` row counts make sense.

### Phase B — matcher quality (≤ 30 min, code change)
4. Fix scorer in `match-receipts-to-xero.mjs` (Layer 5):
   - Hard disqualifier on amount mismatch
   - Treat $0 differently from NULL
   - Skip junk
5. Re-run matcher. Expect 80-120 auto-matches.

### Phase C — Xero pushes (Xero writes, requires care)
6. Run `upload-receipts-to-xero.mjs` against newly auto-matched
7. Build `retry-failed-uploads.mjs` (Layer 6) for the 16 stuck
8. Run mirror refresh

### Phase D — verification (proves it's correct)
9. Re-run full audit script
10. Confirm: every Xero SPEND in Q2+Q3 with `has_attachments=true` has at least one `receipt_emails` row linked to it
11. Confirm: every `receipt_emails` row with `status` in {matched, uploaded} has a non-null xero linkage
12. Re-run `prepare-bas.mjs` and confirm the gap dropped

### Phase E — guardrails (so this doesn't drift again)
13. Add idempotency check to upload script (Issue #1)
14. Add nightly orphan-detection cron (Issues #2, #3)
15. Add `xero_attachments_synced` materialized view to make BAS reports trivial

---

## What I am NOT going to touch yet

Until you sign off on the above plan:
- I will not modify the `status` column semantics (could break existing scripts)
- I will not push anything new to Xero
- I will not delete any rows from `receipt_emails`
- I will not change the OCR pipeline (Gemini is good, leave it)

Awaiting direction on which phase to execute first.
