# BAS Completeness — Q1 FY26 + Q2 FY26 + Q3 FY26
**Generated:** 2026-04-09T01:13:41.168Z

## The 7-path model
Each SPEND transaction falls into one of 7 coverage paths. Paths 1-6 are all "covered" (receipt exists or isn't needed). Only path 7 is a genuine chase target.

| Path | Count | Value | % by count | % by value |
|---|---:|---:|---:|---:|
| 🟢 DIRECT | 311 | $182962.23 | 26.8% | 23.0% |
| 🟡 BILL_LINKED | 3 | $159.80 | 0.3% | 0.0% |
| 🟡 FILES_LIBRARY | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 POOL_MATCH | 1 | $14.95 | 0.1% | 0.0% |
| 🟡 GMAIL_RAW | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 NO_RECEIPT_NEEDED | 411 | $515297.46 | 35.4% | 64.7% |
| 🔴 MISSING | 436 | $97406.18 | 37.5% | 12.2% |
| **TOTAL** | **1162** | **$795840.62** | 100.0% | 100.0% |

## The real metric
**Covered (paths 1-6):** 726 / 1162 txns = **62.5%**
**Covered value:** $698434.44 / $795840.62 = **87.8%**

**Genuine gap (path 7):** 436 txns, $97406.18

## Path 6 breakdown (NO_RECEIPT_NEEDED)
- owner_drawing: 39 txns
- bank_transfer: 47 txns
- bank_fee: 325 txns

## Path 2 (BILL_LINKED) — 3 txns
These SPEND txns have a matching ACCPAY bill with a receipt attached. Run `sync-bill-attachments-to-txns.mjs --apply` to copy the attachment from bill → bank txn in Xero.

Sample (first 10):
- 2025-09-29 Webflow $116.45 ← bill b64173fb (AUTHORISED)
- 2025-09-29 Uber $23.35 ← bill eb7b7ff5 (PAID)
- 2025-07-02 BP $20.00 ← bill 3cdbab5c (PAID)

## Path 4 (POOL_MATCH) — 1 txns
These bank txns are linked to a receipt_emails row. Run `upload-receipts-to-xero.mjs` to push the file to Xero.

## Path 7 (MISSING) — the real chase list

Grouped by vendor (top 30 by value):

| Vendor | Txns | Value | Recommended action |
|---|---:|---:|---|
| Qantas | 64 | $38623.28 | Run Find & Match in Xero UI — bills exist |
| Samuel Hafer | 1 | $19500.00 | Contractor — chase invoice |
| Uber | 164 | $5846.85 | Bulk bill→txn sync if bills exist |
| Chris Witta | 7 | $3530.00 | Contractor — chase invoice |
| DIY Blinds | 1 | $2935.85 | Chase vendor for duplicate |
| Flight Bar Witta | 24 | $2489.92 | Chase vendor for duplicate |
| Palm Island Barge | 1 | $2282.70 | Chase vendor for duplicate |
| Thrifty | 2 | $1774.66 | Chase vendor for duplicate |
| Talbot Sayer Pty Ltd | 1 | $1645.98 | Chase vendor for duplicate |
| Webflow | 21 | $1640.17 | SaaS — check vendor portal or Gmail |
| Booking.com | 1 | $1632.33 | Chase vendor for duplicate |
| Izzy Mobile | 1 | $1485.47 | Chase vendor for duplicate |
| Avis | 2 | $1248.71 | Chase vendor for duplicate |
| Ruma Films | 1 | $1000.00 | Chase vendor for duplicate |
| Claude.AI | 4 | $914.67 | SaaS — check vendor portal or Gmail |
| Mighty Networks | 7 | $841.33 | Chase vendor for duplicate |
| Amazon | 12 | $821.38 | Chase vendor for duplicate |
| Bunnings | 2 | $587.08 | Chase vendor for duplicate |
| AGL | 1 | $573.27 | Chase vendor for duplicate |
| Pure Pest | 1 | $440.00 | Chase vendor for duplicate |
| Notion Labs | 3 | $404.54 | SaaS — check vendor portal or Gmail |
| Hinterland Aviation | 2 | $389.64 | Chase vendor for duplicate |
| ChatGPT | 6 | $376.31 | Chase vendor for duplicate |
| LinkedIn Singapore | 5 | $374.95 | Chase vendor for duplicate |
| Kennards Hire | 2 | $348.40 | Chase vendor for duplicate |
| Bunnings Warehouse | 1 | $341.04 | Chase vendor for duplicate |
| HighLevel | 3 | $317.87 | Chase vendor for duplicate |
| Cath Mansfield | 1 | $300.00 | Chase vendor for duplicate |
| Xero | 4 | $300.00 | Chase vendor for duplicate |
| Orange Sky Laund | 1 | $288.00 | Chase vendor for duplicate |
| ... | | | 52 more vendors |


## Next steps
1. For path 2 (BILL_LINKED): run `node scripts/sync-bill-attachments-to-txns.mjs --apply` to copy receipts from bills to bank txns
2. For path 4 (POOL_MATCH): run `node scripts/upload-receipts-to-xero.mjs` to push pool receipts to Xero
3. For path 7 (MISSING): run `node scripts/gmail-deep-search.mjs Q1` to hunt raw Gmail for missed receipts
4. For path 7 (MISSING): run `node scripts/xero-files-library-scan.mjs` to check Xero's Files library
5. For vendors with persistent gaps: check `.claude/skills/bas-cycle/references/vendor-patterns.md` for known playbooks