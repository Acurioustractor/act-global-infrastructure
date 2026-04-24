# BAS Completeness — Q2 FY26 + Q3 FY26
**Generated:** 2026-04-20T22:52:29.254Z

## The 7-path model
Each SPEND transaction falls into one of 7 coverage paths. Paths 1-6 are all "covered" (receipt exists or isn't needed). Only path 7 is a genuine chase target.

| Path | Count | Value | % by count | % by value |
|---|---:|---:|---:|---:|
| 🟢 DIRECT | 414 | $154044.77 | 55.5% | 48.3% |
| 🟡 BILL_LINKED | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 FILES_LIBRARY | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 POOL_MATCH | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 GMAIL_RAW | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 NO_RECEIPT_NEEDED | 262 | $161060.02 | 35.1% | 50.5% |
| 🔴 MISSING | 70 | $3858.02 | 9.4% | 1.2% |
| **TOTAL** | **746** | **$318962.81** | 100.0% | 100.0% |

## The real metric
**Covered (paths 1-6):** 676 / 746 txns = **90.6%**
**Covered value:** $315104.79 / $318962.81 = **98.8%**

**Genuine gap (path 7):** 70 txns, $3858.02

## Path 6 breakdown (NO_RECEIPT_NEEDED)
- owner_drawing: 7 txns
- bank_fee: 237 txns
- bank_transfer: 18 txns

## Path 7 (MISSING) — the real chase list

Grouped by vendor (top 30 by value):

| Vendor | Txns | Value | Recommended action |
|---|---:|---:|---|
| Uber | 47 | $1103.62 | Bulk bill→txn sync if bills exist |
| Chris Witta | 1 | $591.00 | Contractor — chase invoice |
| Claude.AI | 2 | $573.52 | SaaS — check vendor portal or Gmail |
| Bunnings | 1 | $571.10 | Chase vendor for duplicate |
| Qantas | 1 | $281.70 | Run Find & Match in Xero UI — bills exist |
| LinkedIn Singapore | 2 | $149.98 | Chase vendor for duplicate |
| Squarespace | 3 | $96.50 | Chase vendor for duplicate |
| Flight Bar Witta | 1 | $88.95 | Chase vendor for duplicate |
| Telstra | 1 | $80.00 | Under GST threshold — bank line OK |
| Xero | 1 | $75.00 | Under GST threshold — bank line OK |
| Mighty Networks | 1 | $71.72 | Under GST threshold — bank line OK |
| Anthropic | 4 | $56.84 | SaaS — check vendor portal or Gmail |
| OpenAI | 2 | $44.11 | SaaS — check vendor portal or Gmail |
| Webflow | 1 | $38.41 | SaaS — check vendor portal or Gmail |
| Only Domains | 1 | $19.79 | Under GST threshold — bank line OK |
| Linktree | 1 | $15.78 | Under GST threshold — bank line OK |


## Next steps
1. For path 2 (BILL_LINKED): run `node scripts/sync-bill-attachments-to-txns.mjs --apply` to copy receipts from bills to bank txns
2. For path 4 (POOL_MATCH): run `node scripts/upload-receipts-to-xero.mjs` to push pool receipts to Xero
3. For path 7 (MISSING): run `node scripts/gmail-deep-search.mjs Q2` to hunt raw Gmail for missed receipts
4. For path 7 (MISSING): run `node scripts/xero-files-library-scan.mjs` to check Xero's Files library
5. For vendors with persistent gaps: check `.claude/skills/bas-cycle/references/vendor-patterns.md` for known playbooks