# BAS Completeness — Q1 FY26 + Q2 FY26 + Q3 FY26
**Generated:** 2026-04-09T03:07:00.451Z

## The 7-path model
Each SPEND transaction falls into one of 7 coverage paths. Paths 1-6 are all "covered" (receipt exists or isn't needed). Only path 7 is a genuine chase target.

| Path | Count | Value | % by count | % by value |
|---|---:|---:|---:|---:|
| 🟢 DIRECT | 540 | $235815.37 | 46.5% | 29.6% |
| 🟡 BILL_LINKED | 1 | $20.00 | 0.1% | 0.0% |
| 🟡 FILES_LIBRARY | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 POOL_MATCH | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 GMAIL_RAW | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 NO_RECEIPT_NEEDED | 411 | $515297.46 | 35.4% | 64.7% |
| 🔴 MISSING | 210 | $44707.79 | 18.1% | 5.6% |
| **TOTAL** | **1162** | **$795840.62** | 100.0% | 100.0% |

## The real metric
**Covered (paths 1-6):** 952 / 1162 txns = **81.9%**
**Covered value:** $751132.83 / $795840.62 = **94.4%**

**Genuine gap (path 7):** 210 txns, $44707.79

## Path 6 breakdown (NO_RECEIPT_NEEDED)
- owner_drawing: 39 txns
- bank_transfer: 47 txns
- bank_fee: 325 txns

## Path 2 (BILL_LINKED) — 1 txns
These SPEND txns have a matching ACCPAY bill with a receipt attached. Run `sync-bill-attachments-to-txns.mjs --apply` to copy the attachment from bill → bank txn in Xero.

Sample (first 10):
- 2025-07-02 BP $20.00 ← bill 3cdbab5c (PAID)

## Path 7 (MISSING) — the real chase list

Grouped by vendor (top 30 by value):

| Vendor | Txns | Value | Recommended action |
|---|---:|---:|---|
| Samuel Hafer | 1 | $19500.00 | Contractor — chase invoice |
| Chris Witta | 7 | $3530.00 | Contractor — chase invoice |
| DIY Blinds | 1 | $2935.85 | Chase vendor for duplicate |
| Flight Bar Witta | 24 | $2489.92 | Chase vendor for duplicate |
| Booking.com | 1 | $1632.33 | Chase vendor for duplicate |
| Izzy Mobile | 1 | $1485.47 | Chase vendor for duplicate |
| Qantas | 6 | $1310.74 | Run Find & Match in Xero UI — bills exist |
| Uber | 53 | $1216.17 | Bulk bill→txn sync if bills exist |
| Ruma Films | 1 | $1000.00 | Chase vendor for duplicate |
| Claude.AI | 4 | $914.67 | SaaS — check vendor portal or Gmail |
| Mighty Networks | 7 | $841.33 | Chase vendor for duplicate |
| Webflow | 13 | $649.08 | SaaS — check vendor portal or Gmail |
| Bunnings | 2 | $587.08 | Chase vendor for duplicate |
| Pure Pest | 1 | $440.00 | Chase vendor for duplicate |
| Notion Labs | 3 | $404.54 | SaaS — check vendor portal or Gmail |
| Thrifty | 1 | $396.41 | Chase vendor for duplicate |
| LinkedIn Singapore | 5 | $374.95 | Chase vendor for duplicate |
| Bunnings Warehouse | 1 | $341.04 | Chase vendor for duplicate |
| Cath Mansfield | 1 | $300.00 | Chase vendor for duplicate |
| Orange Sky Laund | 1 | $288.00 | Chase vendor for duplicate |
| ChatGPT | 3 | $274.92 | Chase vendor for duplicate |
| Avis | 1 | $260.68 | Chase vendor for duplicate |
| Xero | 3 | $225.00 | Chase vendor for duplicate |
| Budget Rent a Car | 1 | $220.44 | Chase vendor for duplicate |
| Riley Hardwood | 1 | $220.00 | Chase vendor for duplicate |
| Jaycar | 1 | $206.00 | Chase vendor for duplicate |
| Cursor AI | 6 | $202.41 | Chase vendor for duplicate |
| Aliyun | 2 | $195.00 | Chase vendor for duplicate |
| The Leea Resort | 2 | $189.30 | Chase vendor for duplicate |
| Alice Spring Hotel | 1 | $189.00 | Chase vendor for duplicate |
| ... | | | 31 more vendors |


## Next steps
1. For path 2 (BILL_LINKED): run `node scripts/sync-bill-attachments-to-txns.mjs --apply` to copy receipts from bills to bank txns
2. For path 4 (POOL_MATCH): run `node scripts/upload-receipts-to-xero.mjs` to push pool receipts to Xero
3. For path 7 (MISSING): run `node scripts/gmail-deep-search.mjs Q1` to hunt raw Gmail for missed receipts
4. For path 7 (MISSING): run `node scripts/xero-files-library-scan.mjs` to check Xero's Files library
5. For vendors with persistent gaps: check `.claude/skills/bas-cycle/references/vendor-patterns.md` for known playbooks