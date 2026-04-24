# BAS Completeness — Q3 FY26
**Generated:** 2026-04-20T22:52:56.872Z

## The 7-path model
Each SPEND transaction falls into one of 7 coverage paths. Paths 1-6 are all "covered" (receipt exists or isn't needed). Only path 7 is a genuine chase target.

| Path | Count | Value | % by count | % by value |
|---|---:|---:|---:|---:|
| 🟢 DIRECT | 214 | $62381.57 | 52.7% | 30.6% |
| 🟡 BILL_LINKED | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 FILES_LIBRARY | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 POOL_MATCH | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 GMAIL_RAW | 0 | $0.00 | 0.0% | 0.0% |
| 🟡 NO_RECEIPT_NEEDED | 150 | $139367.28 | 36.9% | 68.3% |
| 🔴 MISSING | 42 | $2420.18 | 10.3% | 1.2% |
| **TOTAL** | **406** | **$204169.03** | 100.0% | 100.0% |

## The real metric
**Covered (paths 1-6):** 364 / 406 txns = **89.7%**
**Covered value:** $201748.85 / $204169.03 = **98.8%**

**Genuine gap (path 7):** 42 txns, $2420.18

## Path 6 breakdown (NO_RECEIPT_NEEDED)
- bank_transfer: 18 txns
- bank_fee: 128 txns
- owner_drawing: 4 txns

## Path 7 (MISSING) — the real chase list

Grouped by vendor (top 30 by value):

| Vendor | Txns | Value | Recommended action |
|---|---:|---:|---|
| Uber | 22 | $618.48 | Bulk bill→txn sync if bills exist |
| Claude.AI | 2 | $573.52 | SaaS — check vendor portal or Gmail |
| Bunnings | 1 | $571.10 | Chase vendor for duplicate |
| LinkedIn Singapore | 2 | $149.98 | Chase vendor for duplicate |
| Squarespace | 3 | $96.50 | Chase vendor for duplicate |
| Flight Bar Witta | 1 | $88.95 | Chase vendor for duplicate |
| Xero | 1 | $75.00 | Under GST threshold — bank line OK |
| Mighty Networks | 1 | $71.72 | Under GST threshold — bank line OK |
| Anthropic | 4 | $56.84 | SaaS — check vendor portal or Gmail |
| OpenAI | 2 | $44.11 | SaaS — check vendor portal or Gmail |
| Webflow | 1 | $38.41 | SaaS — check vendor portal or Gmail |
| Only Domains | 1 | $19.79 | Under GST threshold — bank line OK |
| Linktree | 1 | $15.78 | Under GST threshold — bank line OK |

## Full chase list (per-txn)

| Date | Vendor | Amount | Account | Xero ID |
|---|---|---:|---|---|
| 2026-02-26 | Bunnings | $571.10 | NAB Visa ACT #8815 | `b5f22367-7513-4c18-8c55-120446b52398` |
| 2026-02-06 | Claude.AI | $287.07 | NAB Visa ACT #8815 | `c0cbc54b-02fb-405f-a724-8b974b93edf6` |
| 2026-03-06 | Claude.AI | $286.45 | NAB Visa ACT #8815 | `aebd511b-0a2d-432d-a975-7bba660a18a5` |
| 2026-02-05 | Flight Bar Witta | $88.95 | NAB Visa ACT #8815 | `9f7f0456-4f57-496c-b2b4-74b3ebfb0daa` |
| 2026-02-13 | Xero | $75.00 | NAB Visa ACT #8815 | `459d3fa9-3635-4e02-9c98-e5a769be2363` |
| 2026-02-06 | LinkedIn Singapore | $74.99 | NAB Visa ACT #8815 | `f5058092-ff69-43f0-9754-82c72784fedc` |
| 2026-03-06 | LinkedIn Singapore | $74.99 | NAB Visa ACT #8815 | `fd477b12-5b81-4f7e-9562-bb9d771cbfed` |
| 2026-01-30 | Squarespace | $72.90 | NAB Visa ACT #8815 | `9601e29a-2b79-41bb-94aa-cf697d9b979d` |
| 2026-01-27 | Mighty Networks | $71.72 | NAB Visa ACT #8815 | `ce31c263-ba28-45c8-a6bf-e55418c7862b` |
| 2026-03-24 | Uber | $70.06 | NAB Visa ACT #8815 | `5acaca4a-453f-42b1-9302-028abd4c0b33` |
| 2026-03-27 | Uber | $51.05 | NAB Visa ACT #8815 | `47cad072-0dff-4f68-b4a6-523458b0f6c8` |
| 2026-03-25 | Uber | $49.96 | NAB Visa ACT #8815 | `73492c35-a108-472f-abd1-1554b5481111` |
| 2026-03-30 | Uber | $49.65 | NAB Visa ACT #8815 | `b6f717ad-5d11-44be-8acb-c0b47b5b3cd0` |
| 2026-03-17 | Uber | $44.56 | NAB Visa ACT #8815 | `911b2f8c-cd69-4dee-aa09-a24e6feb35a4` |
| 2026-03-30 | Uber | $41.55 | NAB Visa ACT #8815 | `d50749aa-b1ea-4e81-9f26-9f27f7ab8b50` |
| 2026-03-18 | Uber | $41.36 | NAB Visa ACT #8815 | `aba60631-31f5-474d-8ef2-37036adaf24b` |
| 2026-03-27 | Webflow | $38.41 | NAB Visa ACT #8815 | `056e1784-d0f3-41cc-9e69-9e8639016b2f` |
| 2026-03-31 | Uber | $37.40 | NAB Visa ACT #8815 | `e816c37c-4507-43d4-8b39-898c49a5f58e` |
| 2026-03-16 | Uber | $34.53 | NAB Visa ACT #8815 | `d802dec1-3c71-4219-ba19-4415f032c409` |
| 2026-03-06 | OpenAI | $30.00 | NAB Visa ACT #8815 | `3e558571-79af-4ee5-a5a0-54aa83587455` |
| 2026-03-30 | Uber | $29.91 | NAB Visa ACT #8815 | `76fe7fba-b838-4eef-991c-19d2bf8e7f8b` |
| 2026-02-23 | Only Domains | $19.79 | NAB Visa ACT #8815 | `b5321743-911b-437d-ab06-b0e6fc775758` |
| 2026-03-30 | Uber | $18.31 | NAB Visa ACT #8815 | `d437eb26-8367-4b0a-8e46-4cb38af00157` |
| 2026-03-27 | Uber | $17.84 | NAB Visa ACT #8815 | `6cf7463a-384b-4e87-a27e-262f50425562` |
| 2026-03-30 | Uber | $17.57 | NAB Visa ACT #8815 | `ebcffa4d-36f4-45d7-99d9-2b65298b3112` |
| 2026-03-30 | Uber | $16.53 | NAB Visa ACT #8815 | `760568fe-6b60-4671-8ff9-5b72ebe64d03` |
| 2026-03-30 | Uber | $16.05 | NAB Visa ACT #8815 | `029145b7-97bf-4ffe-8590-27ad6ce73242` |
| 2026-02-02 | Anthropic | $15.85 | NAB Visa ACT #8815 | `524b5704-9be1-4e52-a55e-05a8fd1504e1` |
| 2026-03-30 | Uber | $15.79 | NAB Visa ACT #8815 | `559e27fc-b0bc-4a37-858e-d8bdd85ece0a` |
| 2026-02-02 | Linktree | $15.78 | NAB Visa ACT #8815 | `c7607b0c-e349-4a77-852a-80ceca04eeb9` |
| 2026-03-09 | Anthropic | $15.77 | NAB Visa ACT #8815 | `de74dfc4-fc11-4d67-bfb0-bff6c084539d` |
| 2026-02-16 | Anthropic | $15.76 | NAB Visa ACT #8815 | `0c23b283-377b-4d7a-9509-0263b8e068c7` |
| 2026-03-30 | Uber | $14.79 | NAB Visa ACT #8815 | `6b23ff7d-3948-4723-bfc2-dfc8cf12ef89` |
| 2026-03-02 | OpenAI | $14.11 | NAB Visa ACT #8815 | `64e1e8a6-f2be-4bba-b039-cdec3af316da` |
| 2026-03-30 | Uber | $13.44 | NAB Visa ACT #8815 | `6e70ccad-2cc5-4478-9f5e-2d7ef771ecb1` |
| 2026-03-30 | Uber | $12.39 | NAB Visa ACT #8815 | `43ba9d84-573f-47c7-82a1-54b92aefa277` |
| 2026-03-23 | Squarespace | $11.80 | NAB Visa ACT #8815 | `f225ad9f-98b9-4dea-aef0-795db86a19e1` |
| 2026-02-23 | Squarespace | $11.80 | NAB Visa ACT #8815 | `4b133013-3895-4345-8e95-8d0cc9b756a3` |
| 2026-03-10 | Anthropic | $9.46 | NAB Visa ACT #8815 | `8633f3bb-97ad-479b-ae18-bee27c192a12` |
| 2026-03-27 | Uber | $9.17 | NAB Visa ACT #8815 | `bc27a0e8-941d-4044-92ec-903fe9448cde` |
| 2026-03-26 | Uber | $9.00 | NAB Visa ACT #8815 | `10939e37-a255-4cd6-8ca8-668614685771` |
| 2026-03-30 | Uber | $7.57 | NAB Visa ACT #8815 | `f200088a-e615-453e-a45e-f4681187fcb0` |

## Next steps
1. For path 2 (BILL_LINKED): run `node scripts/sync-bill-attachments-to-txns.mjs --apply` to copy receipts from bills to bank txns
2. For path 4 (POOL_MATCH): run `node scripts/upload-receipts-to-xero.mjs` to push pool receipts to Xero
3. For path 7 (MISSING): run `node scripts/gmail-deep-search.mjs Q3` to hunt raw Gmail for missed receipts
4. For path 7 (MISSING): run `node scripts/xero-files-library-scan.mjs` to check Xero's Files library
5. For vendors with persistent gaps: check `.claude/skills/bas-cycle/references/vendor-patterns.md` for known playbooks