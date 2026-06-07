# Standard Ledger handoff — NAB Visa #8815 reconcile + cutover payables

**Prepared:** 2026-06-02 · **Entity:** Nicholas Marchesi T/as A Curious Tractor (ABN 21 591 780 066), sole-trader → A Curious Tractor Pty Ltd cutover by 30 Jun 2026 · **Source:** synced Xero mirror (sync 2026-06-02 09:35) + multi-agent verification (3 independent reviewers converged).

## Context — what's already done
- **Q2 + Q3 FY26 BAS corrected.** 27 GST-bearing duplicate phantoms deleted (receipt-safe, verified per line). Net GST payable corrected **$14,632 → $15,350** — removed ~$719 of over-claimed input credits. Cash basis. Worksheet: `recon-pack/gst-duplicate-fix-worksheet.md`.
- Receipts are essentially complete: **1,994 of 2,015 live ACCPAY bills are receipted (99%).** Genuine receipt gap ≈ **41 lines / ~$29k** (16 bills $10.8k + 25 no-bill GST lines $18.5k), mostly **Qantas flights** (auto-billing → portal-recoverable). Note: `xero_transactions.has_attachments` drifts; re-sync before quoting a final coverage %.

## Verified diagnosis — it's a payment-matching gap, NOT mostly duplication
493 unreconciled NAB Visa lines decompose as:
- **91 tight PAID-bill phantoms ($82,608)** → safe dedup — **Ben is doing these** (worklist 3).
- **57 AUTHORISED-bill matches ($113,619)** → **NOT duplicates — real payments.** → **SL, item D below.**
- **324 no-bill lines ($114,515, 121 vendors)** → code-and-reconcile — **Ben is doing these** (worklist 2).
- **359 AUTHORISED bills total ($609,925)**; 57 overlap the danger cluster, leaving **~302 bills / ~$496k genuinely outstanding** (≈$463k stale 2025 payables) → **SL, item E below.**

**Rule throughout: MATCH-THEN-DEDUPE. Never bulk-delete the 169 amount-matches — ~57 are real payments.**

## What we need Standard Ledger to do

### D. Danger cluster — 57 lines, $113,619 (→ `recon-pack/worklist-1-SL-danger-cluster.md`)
Unreconciled NAB lines that match an **AUTHORISED (unpaid)** bill. For each pair, confirm open-vs-already-paid, then **MATCH the bank line to the bill** (flips it PAID, clears the line). **Do not delete** — deleting falsely un-pays a real bill and understates spend + BAS. This is the high-leverage, genuinely-ambiguous, BAS-affecting cluster.

### E. Outstanding AUTHORISED payables — ~302 bills, ~$496k (~$463k stale 2025)
Normal cutover period-close triage: are these genuinely unpaid, paid from another account, or duplicates to void? Not dedup noise — real payables review. All but 8 are receipted.

## What Ben is doing himself (do NOT double up at SL rates)
- **Worklist 2** — 324 no-bill lines, vendor-batched (Uber 38, NAB fees 38, Qantas 36…; 199 sub-$82.50). Code-and-reconcile by batch.
- **Worklist 3** — 91 safe-delete PAID-bill phantoms, in GST-bearing batches with a `prepare-bas.mjs` delta-check after each.
- **Receipt chase** — the ~41-line / ~$29k gap (Qantas + auto-billing portals).

## Guardrails (please hold these)
- ACT spend lives only in **NAB Visa #8815** + **NJ Marchesi T/as ACT Everyday**. Exclude NM Personal + ACT Maximiser.
- Manual-tagged rows (`project_code_source LIKE 'manual%'`) must not be clobbered by re-sync.
- Reconcile click is UI-only (Xero API cannot set IsReconciled).

## Provenance
Generated READ-ONLY by `scripts/reconcile-ground-truth.mjs`, `scripts/reconcile-worklists.mjs`, `scripts/reconcile-triage.mjs` against the mirror. Diagnosis verified by independent multi-agent review (workflow `reconcile-reality-review`, 2026-06-02). Full corrected method: memory `dext-duplicate-resolution`.
