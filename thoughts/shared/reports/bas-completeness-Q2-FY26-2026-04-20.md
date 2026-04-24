# BAS Completeness — Q2 FY26
**Generated:** 2026-04-20T22:52:55.912Z

## The 7-path model
Each SPEND transaction falls into one of 7 coverage paths. Paths 1-6 are all "covered" (receipt exists or isn't needed). Only path 7 is a genuine chase target.

| Path | Count | Value | % by count | % by value |
|---|---:|---:|---:|---:|
| 🟢 DIRECT | 200 | $91663.20 | 58.8% | 79.9% |
| 🟡 BILL_LINKED | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 FILES_LIBRARY | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 POOL_MATCH | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 GMAIL_RAW | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 NO_RECEIPT_NEEDED | 112 | $21692.74 | 32.9% | 18.9% |
| 🔴 MISSING | 28 | $1437.84 | 8.2% | 1.3% |
| **TOTAL** | **340** | **$114793.78** | 100.0% | 100.0% |

## The real metric
**Covered (paths 1-6):** 312 / 340 txns = **91.8%**
**Covered value:** $113355.94 / $114793.78 = **98.7%**

**Genuine gap (path 7):** 28 txns, $1437.84

## Path 6 breakdown (NO_RECEIPT_NEEDED)
- owner_drawing: 3 txns
- bank_fee: 109 txns

## Path 7 (MISSING) — the real chase list

Grouped by vendor (top 30 by value):

| Vendor | Txns | Value | Recommended action |
|---|---:|---:|---|
| Chris Witta | 1 | $591.00 | Contractor — chase invoice |
| Uber | 25 | $485.14 | Bulk bill→txn sync if bills exist |
| Qantas | 1 | $281.70 | Run Find & Match in Xero UI — bills exist |
| Telstra | 1 | $80.00 | Under GST threshold — bank line OK |

## Full chase list (per-txn)

| Date | Vendor | Amount | Account | Xero ID |
|---|---|---:|---|---|
| 2025-10-20 | Chris Witta | $591.00 | NJ Marchesi T/as ACT Everyday | `453ffe3a-b0bb-454e-b109-9f9c5030893e` |
| 2025-11-21 | Qantas | $281.70 | NAB Visa ACT #8815 | `18475d78-ee58-4087-8e70-736c0f0a2c02` |
| 2025-12-18 | Telstra | $80.00 | NAB Visa ACT #8815 | `615e0a73-48a2-4532-8032-e7c99448e07b` |
| 2025-12-09 | Uber | $39.37 | NAB Visa ACT #8815 | `5ab8d417-54a3-4e3e-8924-4cd7560608bb` |
| 2025-12-09 | Uber | $32.07 | NAB Visa ACT #8815 | `eb0f7671-a670-429c-8988-c797b561f255` |
| 2025-12-02 | Uber | $27.27 | NAB Visa ACT #8815 | `eaa53ad6-845e-4308-b761-f0615df11932` |
| 2025-12-09 | Uber | $26.62 | NAB Visa ACT #8815 | `326acfb8-f198-4d83-ab8c-f3cfcddfa756` |
| 2025-12-02 | Uber | $26.08 | NAB Visa ACT #8815 | `30032f99-a77b-4964-84fe-aa82bd42105b` |
| 2025-12-05 | Uber | $24.85 | NAB Visa ACT #8815 | `e34e689e-941e-410a-85f9-3fa536e2de9d` |
| 2025-12-01 | Uber | $24.54 | NAB Visa ACT #8815 | `66b4a7b6-5912-47bc-b542-0b4dc54cf4de` |
| 2025-12-02 | Uber | $24.11 | NAB Visa ACT #8815 | `18780363-aa0f-45d9-8cce-32b41aa26560` |
| 2025-10-24 | Uber | $21.90 | NAB Visa ACT #8815 | `2f5062ed-8750-4fe1-8f0e-4208ae6ba725` |
| 2025-10-22 | Uber | $21.42 | NAB Visa ACT #8815 | `0ac79cc0-193f-4cd5-a4a7-92d08a7bd27d` |
| 2025-10-22 | Uber | $21.10 | NAB Visa ACT #8815 | `5ec7cfe1-d803-476c-82af-f1735ce08da9` |
| 2025-10-24 | Uber | $20.22 | NAB Visa ACT #8815 | `268e6793-1e7f-46aa-9f67-c7a24a4ce6d8` |
| 2025-10-20 | Uber | $19.81 | NAB Visa ACT #8815 | `8cdc9b41-516a-40eb-9dc7-ed0e7b13c0ad` |
| 2025-10-20 | Uber | $19.76 | NAB Visa ACT #8815 | `f5dc2898-a79e-46f1-a259-e4f5eebfc533` |
| 2025-10-23 | Uber | $19.73 | NAB Visa ACT #8815 | `378b6a1a-1397-466b-958f-b061dc5832ee` |
| 2025-10-23 | Uber | $17.83 | NAB Visa ACT #8815 | `06f3d30d-8c0d-4591-b815-8a53af19bb68` |
| 2025-10-27 | Uber | $16.12 | NAB Visa ACT #8815 | `23915e0b-4c9b-488a-b7ef-0ede694efcdd` |
| 2025-12-08 | Uber | $15.50 | NAB Visa ACT #8815 | `f8198ae4-e4f0-4f81-975c-34641cf1795f` |
| 2025-12-08 | Uber | $12.69 | NAB Visa ACT #8815 | `398e173e-6176-4f0c-ac9b-6d4b9a0fcde5` |
| 2025-10-20 | Uber | $11.45 | NAB Visa ACT #8815 | `c846b1c9-43c0-4279-b231-6daeecd1e251` |
| 2025-11-10 | Uber | $9.99 | NAB Visa ACT #8815 | `ce249c48-40c6-4938-b515-2b8f917001f7` |
| 2025-12-08 | Uber | $9.99 | NAB Visa ACT #8815 | `465238a8-2764-4626-97ef-7589770c01a5` |
| 2025-10-31 | Uber | $9.44 | NAB Visa ACT #8815 | `5c0912cd-995d-446d-b109-6aec7abf441d` |
| 2025-12-01 | Uber | $8.28 | NAB Visa ACT #8815 | `1dd644b4-64ea-4cb4-8577-e458ad90a68d` |
| 2025-11-11 | Uber | $5.00 | NAB Visa ACT #8815 | `2756fa40-d8c8-4b2f-97ca-67c26a53964f` |

## Next steps
1. For path 2 (BILL_LINKED): run `node scripts/sync-bill-attachments-to-txns.mjs --apply` to copy receipts from bills to bank txns
2. For path 4 (POOL_MATCH): run `node scripts/upload-receipts-to-xero.mjs` to push pool receipts to Xero
3. For path 7 (MISSING): run `node scripts/gmail-deep-search.mjs Q2` to hunt raw Gmail for missed receipts
4. For path 7 (MISSING): run `node scripts/xero-files-library-scan.mjs` to check Xero's Files library
5. For vendors with persistent gaps: check `.claude/skills/bas-cycle/references/vendor-patterns.md` for known playbooks