# Provenance — Goods AP recon + expense de-dup (2026-05-29)

**Report:** `2026-05-29-goods-ap-recon-dedup.md`

## Sources
- **Shared Xero mirror** — Supabase project `tednluwflfhxyucgwigh`, tables `xero_invoices` + `xero_transactions`. Queried directly via MCP `execute_sql` on 2026-05-29.
- Mirror freshness at query time: `synced_at` 2026-05-29T02:33 (matches command-center sync-freshness `maxSyncedAt`; the incremental If-Modified-Since sync is current).

## Verified (queried directly)
- ACT-GD ACCPAY by status: PAID 214 = $296,251.43 (due $0); AUTHORISED 38 = $124,877.78 (due $124,877.78, paid $0); DRAFT 1 = $2,000; VOIDED 2 = $1,491.09.
- ACT-GD ACCREC by status: PAID 16 = $649,710.79; AUTHORISED 1 = $82,500 (Rotary); VOIDED 9 = $639,200.11; DELETED 2 = $86,900; DRAFT 1 = $0.
- ACT-GD bank SPEND by account: NAB Visa ACT #8815 = $177,633.08 (149); NJ Marchesi T/as ACT Everyday = $145,472.54 (23); **NM Personal = none**.
- Vendor payment cross-check (Defy/Carla/1300 Washer/Peak Up/Kirmos): all from the two ACT accounts; 1300 Washer $13,980 (NAB Visa 2025-12-16) and Carla $11,180 (NAB Visa 2025-11-17) matched 1:1 to AUTHORISED bills.
- Rotary $82,500: no RECEIVE txn `~rotary` or in $82,000–83,000 → genuinely outstanding AR.
- SPEND de-dup buckets (amount ±$1, date ±45d): PAID-match 39/$53,249.48; AUTHORISED-match 14/$65,442.56; bill-less 119/$204,413.58 (sums to $323,105.62 = total SPEND).

## Inferred / modelled (not directly verified here)
- Expense ≈ $585K: derived from verified components via accrual (real bills + bill-less spend) and a cash cross-check. The **bill↔SPEND matching is heuristic** (amount+date), so bill-less spend ($204K) carries ±a few % error — both buckets reconcile to the SPEND total, which bounds it.
- Defy INV-1507 $16,500: **confirmed by Ben 2026-05-29 — NOT the discontinued Weave Bed**; it's ongoing Goods bed + washing-machine production cost. Kept in the expense figure.
- 1300 Washer $13,980: **confirmed Goods by Ben 2026-05-29** (washing machines for the Goods project). **Data conflict found:** Supabase mirror = ACT-GD, but the Xero line tracks "ACT-FM — The Farm" (description "1300 Washer — Operations — ACT-FM"), account 429. Kept in Goods for the model (expense → $614K); flagged for a Xero retag (ACT-FM→ACT-GD) + 429 recode so the source matches. Line-item verified via direct query of `xero_invoices.line_items` (id 395c3f3a…).
- Capex ~$110K, R&D ~$80K/yr, GST ~$29.7K — carried from the prior Goods model; not re-verified in this pass.

## Gaps / caveats
- Heuristic matching may both over- and under-match; treat the $585K as a tight range ($566K–$600K), not a point estimate.
- AUTHORISED-bill "match to existing payment" assumes a 1:1 card/bank payment exists for each; verified for the top vendors, assumed for the long tail of small travel/meal bills.
- All figures are pre-cutover sole-trader (Nicholas Marchesi) entity; Pty cutover is 30 Jun 2026.

## Reproduce
Re-run the five `execute_sql` queries against `tednluwflfhxyucgwigh` filtering `project_code='ACT-GD'` (ACCPAY/ACCREC by status; SPEND by bank_account; vendor cross-check; SPEND-vs-bill classification CTE). All in the session transcript 2026-05-29.
