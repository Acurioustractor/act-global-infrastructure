# Weekly hygiene — the bas-cycle routine maintenance pass

The receipts/GST half of the [weekly finance check-in](../../../../wiki/finance/weekly-finance-checkin.md).
~10–15 min/week during a quarter. The card-line half is `reconcile-cycle`; the two
run back-to-back in one weekly sitting — see the unified check-in for the full
running order, deadline ladder, and log.

> **Why weekly, not monthly:** small batches = fewer errors, and receipts get
> harder to find the colder they get. Weekly capture is also the R&D evidence
> pass — every receipt kept on an R&D-project cost preserves the 43.5% offset.

## The pass (run from repo root)

```bash
# 1. Refresh — get onto live data (the mirror lags the last Xero click)
node scripts/sync-xero-to-supabase.mjs
node scripts/sync-xero-tokens.mjs --dry-run       # 3 token stores drift; confirm auth live

# 2. Process new receipts
node scripts/ocr-dext-processing.mjs --apply           # OCR new Dext rows
node scripts/match-receipts-to-xero.mjs --apply        # auto-match new receipts to txns
node scripts/sync-bill-attachments-to-txns.mjs --apply # copy bill receipts → bank txns

# 3. Check the trend for the LIVE quarter (swap Q4 for the current quarter)
node scripts/bas-completeness.mjs Q4
node scripts/bas-completeness.mjs Q4 --gap-only        # only the genuine missing receipts
```

## What "good" looks like

- **Coverage % climbs or holds every week.** If it *declines*, stop and
  investigate — something regressed (a sync break, a new unreceipted vendor, a
  batch of DELETED-shadow rows polluting the count). Don't just re-run and hope.
- **The gap list shrinks toward the sub-$82.50 / no-receipt-needed floor.**
  Above that floor, chase; at/below it, most are fees/transfers/drawings that
  legitimately need no receipt (path 6 of the 6-path model).

## Per-row fixes → the workbench, not the CLI

The scripts above are the *batch* auto-match. Per-row receipt/project assignment
happens on **`/finance/workbench`** (Receipt gaps card), which stamps
`manual_workbench` so the nightly auto-taggers don't overwrite your call. Do the
judgment calls there, not by hand-editing the mirror.

## Vendor playbooks (don't re-derive)

Before chasing a vendor's missing receipt, check
`references/vendor-patterns.md` — most recurring vendors have a known move:

- **Qantas / Uber / Webflow / Virgin / Booking.com** — connectors already create
  ACCPAY bills with PDFs attached. The receipt is in Xero on the *bill* side;
  it just needs Find & Match to the bank line. **Don't download from the vendor
  portal — it's already there, on the wrong side.**
- **SaaS relayed through Stripe** (Supabase, Descript, Anthropic) — the tight
  `from:domain` Gmail search misses these; use `receipt-broad-search.mjs`.

## Money guards (same as the whole suite)

Two-account rule (NAB Visa #8815 + NJ Marchesi T/as ACT Everyday only) · exclude
DELETED/VOIDED (NULL-safe) · sum GST in SQL not supabase-js (1000-row cap) ·
verify any GST figure against the accrual P&L (`project_monthly_financials`)
before it goes near a lodgement.

## Time budget

Spend no more than ~15 min/week here. This is *maintenance* — the deep work
(pre-close sweep, gmail deep-search, ambiguous resolution) belongs to the
`workflows/quarterly-checklist.md` phases 2–4, not the weekly pass. If the weekly
hygiene is taking longer every week, something upstream is broken — check before
blaming workload.

## Close the loop

Append the receipts line to the check-in weekly log, and add any new vendor quirk
to `references/vendor-patterns.md`. Next week starts one vendor smarter.
