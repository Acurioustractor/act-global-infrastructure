# BAS Completeness — Q3 FY26
**Generated:** 2026-06-01T11:30:50.953Z

## The 7-path model
Each SPEND transaction falls into one of 7 coverage paths. Paths 1-6 are all "covered" (receipt exists or isn't needed). Only path 7 is a genuine chase target.

| Path | Count | Value | % by count | % by value |
|---|---:|---:|---:|---:|
| 🟢 DIRECT | 317 | $159396.95 | 60.7% | 43.8% |
| 🟡 BILL_LINKED | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 FILES_LIBRARY | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 POOL_MATCH | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 GMAIL_RAW | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 NO_RECEIPT_NEEDED | 156 | $201367.28 | 29.9% | 55.4% |
| 🔴 MISSING | 49 | $2939.60 | 9.4% | 0.8% |
| **TOTAL** | **522** | **$363703.83** | 100.0% | 100.0% |

## The real metric
**Covered (paths 1-6):** 473 / 522 txns = **90.6%**
**Covered value:** $360764.23 / $363703.83 = **99.2%**

**Genuine gap (path 7):** 49 txns, $2939.60

## Path 6 breakdown (NO_RECEIPT_NEEDED)
- bank_transfer: 24 txns
- bank_fee: 128 txns
- owner_drawing: 4 txns

## Path 7 (MISSING) — the real chase list

Grouped by vendor (top 30 by value):

| Vendor | Txns | Value | Recommended action |
|---|---:|---:|---|
| Uber | 22 | $618.48 | Bulk bill→txn sync if bills exist |
| Claude.AI | 2 | $573.52 | SaaS — check vendor portal or Gmail |
| Bunnings | 1 | $571.10 | Chase vendor for duplicate |
| Superbase | 2 | $249.06 | Chase vendor for duplicate |
| Qantas | 1 | $150.00 | Run Find & Match in Xero UI — bills exist |
| LinkedIn Singapore | 2 | $149.98 | Chase vendor for duplicate |
| SQUARESPACE | 3 | $96.50 | Chase vendor for duplicate |
| Flight Bar Witta | 1 | $88.95 | Chase vendor for duplicate |
| Notion Labs | 1 | $75.39 | SaaS — check vendor portal or Gmail |
| Xero | 1 | $75.00 | Under GST threshold — bank line OK |
| Mighty Networks | 1 | $71.72 | Under GST threshold — bank line OK |
| Anthropic | 4 | $56.84 | SaaS — check vendor portal or Gmail |
| EZVIZ INTERNATIONAL | 3 | $44.97 | Under GST threshold — bank line OK |
| OpenAI | 2 | $44.11 | SaaS — check vendor portal or Gmail |
| Webflow | 1 | $38.41 | SaaS — check vendor portal or Gmail |
| Only Domains | 1 | $19.79 | Under GST threshold — bank line OK |
| Linktree | 1 | $15.78 | Under GST threshold — bank line OK |


## Next steps
1. For path 2 (BILL_LINKED): run `node scripts/sync-bill-attachments-to-txns.mjs --apply` to copy receipts from bills to bank txns
2. For path 4 (POOL_MATCH): run `node scripts/upload-receipts-to-xero.mjs` to push pool receipts to Xero
3. For path 7 (MISSING): run `node scripts/gmail-deep-search.mjs Q3` to hunt raw Gmail for missed receipts
4. For path 7 (MISSING): run `node scripts/xero-files-library-scan.mjs` to check Xero's Files library
5. For vendors with persistent gaps: check `.claude/skills/bas-cycle/references/vendor-patterns.md` for known playbooks