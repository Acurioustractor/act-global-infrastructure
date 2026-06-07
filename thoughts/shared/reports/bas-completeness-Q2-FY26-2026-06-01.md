# BAS Completeness — Q2 FY26
**Generated:** 2026-06-01T11:30:20.412Z

## The 7-path model
Each SPEND transaction falls into one of 7 coverage paths. Paths 1-6 are all "covered" (receipt exists or isn't needed). Only path 7 is a genuine chase target.

| Path | Count | Value | % by count | % by value |
|---|---:|---:|---:|---:|
| 🟢 DIRECT | 421 | $397059.00 | 69.6% | 56.4% |
| 🟡 BILL_LINKED | 1 | $23.16 | 0.2% | 0.0% |
| 🟡 FILES_LIBRARY | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 POOL_MATCH | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 GMAIL_RAW | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 NO_RECEIPT_NEEDED | 145 | $304473.56 | 24.0% | 43.2% |
| 🔴 MISSING | 38 | $2543.61 | 6.3% | 0.4% |
| **TOTAL** | **605** | **$704099.33** | 100.0% | 100.0% |

## The real metric
**Covered (paths 1-6):** 567 / 605 txns = **93.7%**
**Covered value:** $701555.72 / $704099.33 = **99.6%**

**Genuine gap (path 7):** 38 txns, $2543.61

## Path 6 breakdown (NO_RECEIPT_NEEDED)
- bank_transfer: 33 txns
- owner_drawing: 3 txns
- bank_fee: 109 txns

## Path 2 (BILL_LINKED) — 1 txns
These SPEND txns have a matching ACCPAY bill with a receipt attached. Run `sync-bill-attachments-to-txns.mjs --apply` to copy the attachment from bill → bank txn in Xero.

Sample (first 10):
- 2025-12-19 Uber $23.16 ← bill 954a7a53 (PAID)

## Path 7 (MISSING) — the real chase list

Grouped by vendor (top 30 by value):

| Vendor | Txns | Value | Recommended action |
|---|---:|---:|---|
| Chris Witta | 1 | $591.00 | Contractor — chase invoice |
| Descript | 1 | $447.62 | Chase vendor for duplicate |
| Uber | 21 | $388.60 | Bulk bill→txn sync if bills exist |
| Virgin Australia | 1 | $385.79 | Chase vendor for duplicate |
| Qantas | 1 | $281.70 | Run Find & Match in Xero UI — bills exist |
| Superbase | 1 | $119.77 | Chase vendor for duplicate |
| Telstra | 1 | $80.00 | Under GST threshold — bank line OK |
| LinkedIn Singapore | 1 | $74.99 | Under GST threshold — bank line OK |
| Codeguide | 1 | $44.84 | Under GST threshold — bank line OK |
| Belong | 1 | $35.00 | Under GST threshold — bank line OK |
| EZVIZ INTERNATIONAL | 2 | $29.98 | Under GST threshold — bank line OK |
| SQUARESPACE | 1 | $23.50 | Under GST threshold — bank line OK |
| Linktree | 2 | $16.25 | Under GST threshold — bank line OK |
| DocPlay | 1 | $9.99 | Small — consider write-off |
| Railway Corporation | 1 | $7.72 | Small — consider write-off |
| Gremlin Grounds | 1 | $6.86 | Small — consider write-off |


## Next steps
1. For path 2 (BILL_LINKED): run `node scripts/sync-bill-attachments-to-txns.mjs --apply` to copy receipts from bills to bank txns
2. For path 4 (POOL_MATCH): run `node scripts/upload-receipts-to-xero.mjs` to push pool receipts to Xero
3. For path 7 (MISSING): run `node scripts/gmail-deep-search.mjs Q2` to hunt raw Gmail for missed receipts
4. For path 7 (MISSING): run `node scripts/xero-files-library-scan.mjs` to check Xero's Files library
5. For vendors with persistent gaps: check `.claude/skills/bas-cycle/references/vendor-patterns.md` for known playbooks