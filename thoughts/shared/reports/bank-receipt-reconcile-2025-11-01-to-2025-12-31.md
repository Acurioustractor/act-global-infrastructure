# Bank ↔ Receipt Reconciliation — 2025-11-01 to 2025-12-31
**Generated:** 2026-04-10T01:02:42.560Z
**Source:** Live Xero API + Supabase receipt_emails pool

## Per-account activity (live Xero)

| Bank Account | Type | Count | Total |
|---|---|---:|---:|
| NJ Marchesi T/as ACT Everyday | RECEIVE | 14 | $140668.43 |
| NJ Marchesi T/as ACT Everyday | SPEND-TRANSFER | 10 | $104642.43 |
| NAB Visa ACT #8815 | RECEIVE-TRANSFER | 10 | $104642.43 |
| NAB Visa ACT #8815 | SPEND | 305 | $30320.71 |
| NJ Marchesi T/as ACT Everyday | SPEND | 3 | $27159.00 |
| NAB Visa ACT #8815 | RECEIVE | 1 | $71.50 |

## ACCPAY bills

- Total bills in window: 171
- Total value: $83386.45
- Paid: $25111.86
- Open (AUTHORISED): $58274.59

## Money flow summary (bank only, excludes transfers)

- Total SPEND from ACT bank accounts: $57479.71
- Total RECEIVE into ACT bank accounts: $140739.93

## Receipt pool (Supabase receipt_emails)

- Total receipts in window: 508
- Matched to bank txns or bills: 236
- Unmatched: 272

### By status

| Status | Count | Total value |
|---|---:|---:|
| captured | 86 | $292897.30 |
| review | 75 | $189002.56 |
| uploaded | 346 | $142338.52 |
| matched | 1 | $29.00 |

## 🔴 Receipts WITHOUT a matching bank txn or bill

These are receipts in our pool that don't correspond to any actual ACT bank transaction or ACCPAY bill in the period. Possible causes:

1. **Paid via personal account/card** — bank feed not in Xero (e.g. Up Bank stopped syncing)
2. **Forwarded by someone else** — receipt landed in ACT inbox but isn't ACT's obligation
3. **Quote/notification only** — never actually purchased
4. **Receipt arrived in window but bank txn happens in a different period**

### Top 50 unmatched vendors by value

| Vendor | Count | Total | Sample dates |
|---|---:|---:|---|
| The Funding Network | 2 | $144558.00 | 2025-12-17, 2025-11-27 |
| The Plasticians | 2 | $59600.00 | 2025-12-17, 2025-12-17 |
| Telford Smith Engineering | 2 | $39600.00 | 2025-12-22, 2025-12-22 |
| RNM CARPENTRY | 1 | $26845.65 | 2025-11-11 |
| Defy | 4 | $25566.32 | 2025-12-22, 2025-12-18, 2025-11-28 |
| AAMI | 2 | $25483.95 | 2025-12-27, 2025-12-26 |
| Hatch Electrical | 2 | $23624.47 | 2025-12-10, 2025-11-10 |
| Bionic Self Storage | 2 | $14795.00 | 2025-12-29, 2025-12-28 |
| Airbnb | 6 | $14564.00 | 2025-11-26, 2025-11-25, 2025-11-25 |
| 1300 Washer | 1 | $13980.00 | 2025-12-15 |
| Carla Furnishers | 1 | $11180.00 | 2025-11-16 |
| Allclass | 5 | $10609.05 | 2025-11-25, 2025-11-25, 2025-11-25 |
| Defy Manufacturing | 3 | $10558.61 | 2025-11-27, 2025-12-18, 2025-11-12 |
| Kennards Hire | 7 | $10096.50 | 2025-12-03, 2025-11-11, 2025-12-11 |
| Nicholas Marchesi | 3 | $7049.50 | 2025-11-06, 2025-11-10, 2025-11-24 |
| RNM Carpentry | 1 | $6865.65 | 2025-11-26 |
| The Matnic Trust | 1 | $6441.74 | 2025-12-14 |
| A Curious Tractor | 1 | $6226.00 | 2025-11-10 |
| Bunnings Warehouse | 12 | $6152.13 | 2025-12-16, 2025-11-30, 2025-11-29 |
| Container Options | 3 | $6005.60 | 2025-12-04, 2025-12-04, 2025-12-04 |
| Oonchiumpa Consultancy And Services | 1 | $5940.00 | 2025-12-15 |
| Qantas | 11 | $4593.71 | 2025-11-22, 2025-11-18, 2025-12-09 |
| The Sand Yard | 3 | $3385.96 | 2025-12-08, 2025-12-09, 2025-12-08 |
| TNT Plastering & Maintenance | 2 | $3200.00 | 2025-12-02, 2025-11-29 |
| Joseph Kirmos | 1 | $2737.50 | 2025-12-03 |
| Oonchiumpa Consultancy and Services | 1 | $2700.00 | 2025-12-11 |
| Home To Holiday | 1 | $2475.91 | 2025-11-11 |
| Adriana Beach | 1 | $2000.00 | 2025-12-08 |
| BUNNINGS WAREHOUSE | 1 | $1494.92 | 2025-11-08 |
| Avis | 1 | $1247.62 | 2025-11-08 |
| Loadshift Sydney | 1 | $1243.59 | 2025-12-10 |
| AR Equipment | 1 | $1166.00 | 2025-11-26 |
| Humanitix | 1 | $1150.00 | 2025-11-04 |
| Budget | 4 | $1141.18 | 2025-12-08, 2025-11-20, 2025-11-20 |
| Unknown Supplier | 1 | $1012.56 | 2025-11-07 |
| BP | 9 | $934.78 | 2025-12-17, 2025-12-25, 2025-12-19 |
| Edmonds Landscaping Supplies | 4 | $912.00 | 2025-12-02, 2025-12-02, 2025-12-02 |
| BOE Design | 1 | $750.00 | 2025-12-23 |
| Woodford Folk Festival | 1 | $725.73 | 2025-12-27 |
| Maleny Hardware And Rural Supplies | 8 | $682.62 | 2025-11-27, 2025-12-30, 2025-11-16 |
| Auto Sparky | 1 | $674.00 | 2025-11-26 |
| Izzy Mobile | 1 | $671.90 | 2025-12-18 |
| AGL | 2 | $609.20 | 2025-12-03, 2025-11-03 |
| Webflow | 19 | $600.50 | 2025-11-23, 2025-11-21, 2025-12-08 |
| POLOLA | 1 | $549.05 | 2025-11-29 |
| QANTAS | 2 | $543.67 | 2025-11-21, 2025-11-02 |
| Shorehouse Townsville | 1 | $486.19 | 2025-11-28 |
| Uber | 6 | $452.97 | 2025-11-08, 2025-11-10, 2025-12-07 |
| Tennant Creek Retreat | 1 | $370.00 | 2025-12-11 |
| WizBang Technologies | 2 | $331.96 | 2025-11-07, 2025-12-13 |
| ... | | | 78 more |

## 🟡 ACT bank txns/bills WITHOUT a matching receipt

These are real ACT money-out events where we don't have a receipt linked. Most are probably just unprocessed receipts that exist but the matcher didn't find — worth running gmail-to-xero-pipeline.mjs.

Total unmatched bank events: 143 totalling $36493.26

### Top 30 by value

| Vendor | Count | Total |
|---|---:|---:|
| Nicholas | 2 | $21159.00 |
| Qantas | 11 | $6186.12 |
| Nicholas Marchesi | 1 | $6000.00 |
| Webflow | 10 | $535.07 |
| Cognition AI | 3 | $458.76 |
| Descript | 1 | $446.46 |
| HighLevel | 2 | $292.37 |
| Notion Labs | 2 | $241.68 |
| NAB Fee | 80 | $199.90 |
| Uber | 12 | $198.96 |
| Mighty Networks | 1 | $182.12 |
| Zapier | 3 | $151.42 |
| SideGuide Technologies | 4 | $115.04 |
| OpenAI | 1 | $90.39 |
| Figma | 2 | $66.65 |
| Vercel | 2 | $60.13 |
| Napkin AI | 2 | $36.74 |
| Anthropic | 2 | $34.02 |
| Cursor AI | 1 | $30.86 |
| Railway Corporation | 1 | $7.57 |

## Mounty-tagged events (project tracking = ACT-MY or Mounty)

- Total Mounty-tagged events in Xero: 5
- Total value: $221.97

| Date | Type | Vendor | Amount | Account/Status |
|---|---|---|---:|---|
| 2025-12-09 | SPEND | Product Of Italy Minchoury | $61.00 | NAB Visa ACT #8815 |
| 2025-12-09 | BILL | Cup Of Eden Cafe | $39.41 | PAID |
| 2025-12-10 | BILL | Thai Hanuman | $65.59 | PAID |
| 2025-12-10 | BILL | Bunnings Warehouse | $44.96 | PAID |
| 2025-12-10 | BILL | Ritual Espresso | $11.01 | PAID |

## Full ledger (every bank event in the period, by date)

Marker key: 🟢 has receipt | 🟡 no receipt | ⚫ transfer/owner | 🚫 deleted

| Date | Acct | Type | Vendor | Amount | Receipt | Tracking |
|---|---|---|---|---:|---|---|
| 🟢 2025-11-01 | NAB Visa ACT | SPEND | Zapier | $50.42 | ✓ Xero |  |
| 🟢 2025-11-02 | BILL | PAID | Cognition AI | $153.12 | ✓ Xero |  |
| 🟢 2025-11-02 | BILL | PAID | Cognition AI | $152.59 | ✓ Xero |  |
| 🟢 2025-11-02 | BILL | PAID | BP | $165.02 | ✓ dex | Goods. |
| ⚫ 2025-11-03 | Everyday | RECEIVE | Nicholas Marchesi | $6000.00 | — |  |
| 🚫 2025-11-03 | NAB Visa ACT | SPEND | Google | $51.54 | — |  |
| 🚫 2025-11-03 | NAB Visa ACT | SPEND | Uber | $99.76 | — |  |
| 🚫 2025-11-03 | NAB Visa ACT | SPEND | DocPlay | $9.99 | — |  |
| 🚫 2025-11-03 | NAB Visa ACT | SPEND | Claude.AI | $153.12 | — |  |
| 🚫 2025-11-03 | Everyday | SPEND-TR | ? | $6015.00 | — |  |
| 🚫 2025-11-03 | NAB Visa ACT | RECEIVE-TR | ? | $6015.00 | — |  |
| 🚫 2025-11-03 | NAB Visa ACT | SPEND | Linktree | $8.05 | — |  |
| 🚫 2025-11-03 | NAB Visa ACT | SPEND | NAB International Fee | $0.64 | — |  |
| 🚫 2025-11-03 | NAB Visa ACT | SPEND | NAB International Fee | $2.63 | — |  |
| 🚫 2025-11-03 | NAB Visa ACT | SPEND | NAB International Fee | $5.36 | — |  |
| 🟢 2025-11-03 | NAB Visa ACT | SPEND | Zapier | $50.33 | ✓ dex |  |
| 🟢 2025-11-03 | NAB Visa ACT | SPEND | Uber | $99.76 | ✓ gma | A Curious Tractor |
| 🟡 2025-11-03 | NAB Visa ACT | SPEND | NAB Fee | $5.36 | — | A Curious Tractor |
| 🟡 2025-11-03 | NAB Visa ACT | SPEND | NAB Fee | $2.63 | — | A Curious Tractor |
| 🟡 2025-11-03 | NAB Visa ACT | SPEND | NAB Fee | $0.64 | — | A Curious Tractor |
| 🟢 2025-11-03 | BILL | PAID | Taxi Receipt | $53.23 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-03 | BILL | PAID | United | $185.05 | ✓ dex | Goods. |
| 🟢 2025-11-03 | BILL | PAID | United | $219.99 | ✓ dex | Goods. |
| 🟢 2025-11-03 | BILL | PAID | Banh Mi Express | $131.88 | ✓ dex | Goods. |
| 🟢 2025-11-03 | BILL | PAID | Zapier | $50.51 | ✓ Xero |  |
| 🟢 2025-11-03 | BILL | PAID | Kennards Hire | $1308.00 | ✓ dex |  |
| 🟢 2025-11-03 | BILL | PAID | Bunnings Warehouse | $2797.38 | ✓ dex | Goods. |
| 🟢 2025-11-03 | BILL | PAID | Bunnings Warehouse | $1845.51 | ✓ dex | Goods. |
| 🟢 2025-11-03 | BILL | PAID | Napkin AI | $18.37 | ✓ Xero | A Curious Tractor |
| 🟢 2025-11-03 | BILL | PAID | Team Thrive No 2 | $440.00 | ✓ dex |  |
| 🟢 2025-11-03 | BILL | PAID | Page 27 | $82.72 | ✓ dex | Goods. |
| ⚫ 2025-11-04 | Everyday | RECEIVE | Nicholas Marchesi | $10000.00 | — |  |
| 🚫 2025-11-04 | NAB Visa ACT | SPEND | Uber | $60.43 | — |  |
| 🚫 2025-11-04 | Everyday | SPEND-TR | ? | $9800.00 | — |  |
| 🚫 2025-11-04 | NAB Visa ACT | RECEIVE-TR | ? | $9800.00 | — |  |
| 🚫 2025-11-04 | NAB Visa ACT | SPEND | Belong | $35.00 | — | A Curious Tractor |
| 🚫 2025-11-04 | NAB Visa ACT | SPEND | NAB | $0.84 | — |  |
| 🟢 2025-11-04 | NAB Visa ACT | SPEND | Qantas | $65.00 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-04 | NAB Visa ACT | SPEND | Uber | $60.43 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-04 | NAB Visa ACT | SPEND | Qantas | $260.00 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-04 | BILL | PAID | Maleny Hardware And Rural Supp | $285.20 | ✓ dex | Farm Activities |
| 🚫 2025-11-05 | NAB Visa ACT | SPEND | NAB International Fee | $1.77 | — |  |
| 🟡 2025-11-05 | NAB Visa ACT | SPEND | NAB Fee | $1.77 | — | A Curious Tractor |
| 🚫 2025-11-06 | NAB Visa ACT | SPEND | LinkedIn Singapore | $74.99 | — |  |
| 🟢 2025-11-06 | NAB Visa ACT | SPEND | Amazon | $16.45 | ✓ dex |  |
| 🟡 2025-11-07 | Everyday | RECEIVE | Aleisha J Keating | $147.50 | — |  |
| 🚫 2025-11-07 | NAB Visa ACT | SPEND | Audible | $16.45 | — |  |
| 🟢 2025-11-08 | BILL | PAID | Woolworths | $14.95 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-08 | BILL | PAID | Qantas | $260.00 | ✓ Xero |  |
| 🟢 2025-11-08 | BILL | PAID | WizBang Technologies | $5.08 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-09 | NAB Visa ACT | SPEND | Webflow | $44.68 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-09 | NAB Visa ACT | SPEND | Qantas | $1913.31 | ✓ Xero |  |
| 🟢 2025-11-09 | BILL | AUTHORISED | Amazon | $25.89 | ✓ dex |  |
| 🟢 2025-11-09 | BILL | PAID | Anthropic | $17.01 | ✓ Xero |  |
| 🟢 2025-11-09 | BILL | PAID | Anthropic | $17.01 | ✓ Xero |  |
| 🟢 2025-11-09 | BILL | PAID | Taxi Receipt | $45.15 | ✓ dex | Goods. |
| 🟢 2025-11-09 | BILL | PAID | Page 27 | $6.92 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-09 | BILL | PAID | Lasseters Centre Of Entertainm | $4.57 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-09 | BILL | PAID | Webflow | $49.34 | ✓ Xero | A Curious Tractor |
| 🟢 2025-11-09 | BILL | PAID | Webflow | $49.34 | ✓ Xero | A Curious Tractor |
| 🟢 2025-11-09 | BILL | PAID | Webflow | $49.15 | ✓ Xero | A Curious Tractor |
| 🚫 2025-11-10 | NAB Visa ACT | SPEND | Uber | $9.99 | — |  |
| 🚫 2025-11-10 | NAB Visa ACT | SPEND | Apple Pty Ltd | $14.99 | — |  |
| 🚫 2025-11-10 | NAB Visa ACT | SPEND | Webflow | $49.34 | — |  |
| 🚫 2025-11-10 | NAB Visa ACT | SPEND | Webflow | $44.86 | — |  |
| 🚫 2025-11-10 | NAB Visa ACT | SPEND | Anthropic | $17.01 | — |  |
| 🚫 2025-11-10 | NAB Visa ACT | SPEND | NAB International Fee | $5.72 | — |  |
| 🚫 2025-11-10 | NAB Visa ACT | SPEND | NAB International Fee | $0.60 | — |  |
| 🚫 2025-11-10 | NAB Visa ACT | SPEND | NAB International Fee | $1.73 | — |  |
| 🚫 2025-11-10 | NAB Visa ACT | SPEND | NAB International Fee | $1.57 | — |  |
| 🚫 2025-11-10 | NAB Visa ACT | SPEND | Notion Labs | $163.34 | — |  |
| 🟢 2025-11-10 | NAB Visa ACT | SPEND | Qantas | $348.41 | ✓ Xero | A Curious Tractor |
| 🟢 2025-11-10 | NAB Visa ACT | SPEND | Uber | $9.99 | ✓ dex | A Curious Tractor |
| 🟡 2025-11-10 | NAB Visa ACT | SPEND | NAB Fee | $1.57 | — | A Curious Tractor |
| 🟡 2025-11-10 | NAB Visa ACT | SPEND | NAB Fee | $1.73 | — | A Curious Tractor |
| 🟡 2025-11-10 | NAB Visa ACT | SPEND | NAB Fee | $0.60 | — | A Curious Tractor |
| 🟡 2025-11-10 | NAB Visa ACT | SPEND | NAB Fee | $5.72 | — | A Curious Tractor |
| 🟢 2025-11-10 | BILL | AUTHORISED | Ezymart Felix | $20.28 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-10 | BILL | PAID | Notion Labs | $161.78 | ✓ Xero | Farm Activities |
| ⚫ 2025-11-11 | Everyday | RECEIVE | Nicholas Marchesi | $20000.00 | — |  |
| ⚫ 2025-11-11 | Everyday | RECEIVE | Nicholas Marchesi | $20000.00 | — |  |
| 🚫 2025-11-11 | NAB Visa ACT | SPEND | Uber | $13.30 | — |  |
| 🚫 2025-11-11 | Everyday | SPEND-TR | ? | $1497.50 | — |  |
| 🚫 2025-11-11 | NAB Visa ACT | RECEIVE-TR | ? | $1497.50 | — |  |
| 🚫 2025-11-11 | Everyday | SPEND-TR | ? | $23875.00 | — |  |
| 🚫 2025-11-11 | NAB Visa ACT | RECEIVE-TR | ? | $23875.00 | — |  |
| 🚫 2025-11-11 | NAB Visa ACT | SPEND | Uber | $65.52 | — |  |
| 🚫 2025-11-11 | NAB Visa ACT | SPEND | Uber | $75.07 | — |  |
| 🚫 2025-11-11 | NAB Visa ACT | SPEND | Uber | $5.00 | — |  |
| 🟡 2025-11-11 | NAB Visa ACT | SPEND | Uber | $5.00 | — | A Curious Tractor |
| 🟢 2025-11-11 | NAB Visa ACT | SPEND | Uber | $75.07 | ✓ gma | A Curious Tractor |
| 🟢 2025-11-11 | NAB Visa ACT | SPEND | Qantas | $1913.31 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-11 | NAB Visa ACT | SPEND | Uber | $65.52 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-11 | NAB Visa ACT | SPEND | Qantas | $249.00 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-11 | NAB Visa ACT | SPEND | Uber | $13.30 | ✓ Xero | A Curious Tractor |
| 🟢 2025-11-11 | NAB Visa ACT | SPEND | OpenAI | $92.01 | ✓ xer |  |
| 🟢 2025-11-11 | BILL | PAID | Bambino Espresso | $24.29 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-11 | BILL | PAID | Woolworths | $50.95 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-11 | BILL | PAID | Kmart | $59.00 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-11 | BILL | PAID | ASM MONSURUL HUQ | $26.40 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-11 | BILL | PAID | Mt Isa Service Station | $100.22 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-11 | BILL | PAID | Bambino Espresso | $7.08 | ✓ dex | A Curious Tractor |
| 🚫 2025-11-12 | NAB Visa ACT | SPEND | Uber | $90.45 | — |  |
| 🚫 2025-11-12 | NAB Visa ACT | SPEND | NAB International Fee | $3.22 | — |  |
| 🚫 2025-11-12 | NAB Visa ACT | RECEIVE | Kennards Hire | $71.50 | — |  |
| 🚫 2025-11-12 | NAB Visa ACT | SPEND | AGL | $319.09 | — |  |
| 🚫 2025-11-12 | NAB Visa ACT | SPEND | OpenAI | $92.14 | — |  |
| 🚫 2025-11-12 | NAB Visa ACT | SPEND | Uber | $40.99 | — |  |
| 🟢 2025-11-12 | NAB Visa ACT | SPEND | Uber | $90.45 | ✓ gma | A Curious Tractor |
| 🟢 2025-11-12 | NAB Visa ACT | SPEND | Uber | $40.99 | ✓ dex | A Curious Tractor |
| 🟡 2025-11-12 | NAB Visa ACT | SPEND | NAB Fee | $3.22 | — | A Curious Tractor |
| 🟢 2025-11-12 | BILL | PAID | SideGuide Technologies | $29.18 | ✓ Xero |  |
| 🟢 2025-11-12 | BILL | PAID | Bambino Espresso | $7.08 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-12 | BILL | PAID | Taxi Receipt | $31.40 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-12 | BILL | PAID | Woolworths | $55.80 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-12 | BILL | PAID | ZAMBRERO MT ISA | $42.20 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-12 | BILL | PAID | Reddy Express | $104.29 | ✓ dex | A Curious Tractor |
| 🚫 2025-11-13 | NAB Visa ACT | SPEND | Codeguide | $44.53 | — |  |
| 🚫 2025-11-13 | NAB Visa ACT | SPEND | Xero | $75.00 | — |  |
| 🚫 2025-11-13 | NAB Visa ACT | SPEND | NAB | $1.56 | — |  |
| 🚫 2025-11-13 | NAB Visa ACT | SPEND | NAB | $1.02 | — |  |
| 🟡 2025-11-13 | NAB Visa ACT | SPEND | NAB Fee | $1.02 | — | A Curious Tractor |
| 🟡 2025-11-13 | NAB Visa ACT | SPEND | NAB Fee | $1.56 | — | A Curious Tractor |
| 🟢 2025-11-13 | BILL | AUTHORISED | ISA Hotel | $355.68 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-13 | BILL | PAID | Adobe Systems Software | $56.73 | ✓ dex |  |
| 🟢 2025-11-13 | BILL | PAID | Taxi Receipt | $26.77 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-13 | BILL | PAID | Outback At Isa | $9.10 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-13 | BILL | PAID | SSP Australia Catering | $27.28 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-13 | BILL | PAID | Woolworths | $200.00 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-13 | BILL | PAID | The Coffee Club Mt Isa | $5.64 | ✓ dex | A Curious Tractor, BG Fit |
| 🟢 2025-11-14 | NAB Visa ACT | SPEND | Mighty Networks | $182.12 | ✓ Xero |  |
| 🟢 2025-11-14 | BILL | PAID | Webflow | $70.71 | ✓ Xero | A Curious Tractor |
| 🟢 2025-11-15 | NAB Visa ACT | SPEND | Telstra | $80.00 | ✓ dex |  |
| 🟢 2025-11-15 | BILL | PAID | GRAYZA | $105.10 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-15 | BILL | PAID | Officeworks | $47.98 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-16 | NAB Visa ACT | SPEND | Shenzhen Yuehai Electronic Com | $8.42 | ✓ dex | PICC Photo Studio |
| 🟢 2025-11-16 | NAB Visa ACT | SPEND | Webflow | $70.89 | ✓ xer | A Curious Tractor |
| 🟢 2025-11-16 | BILL | PAID | Webflow | $70.84 | ✓ Xero | A Curious Tractor |
| ⚫ 2025-11-17 | Everyday | RECEIVE | Nicholas Marchesi | $15000.00 | — |  |
| ⚫ 2025-11-17 | Everyday | RECEIVE | Nicholas Marchesi | $5500.00 | — |  |
| ⚫ 2025-11-17 | Everyday | RECEIVE | Nicholas Marchesi | $6000.00 | — |  |
| ⚫ 2025-11-17 | Everyday | SPEND | Nicholas Marchesi | $6000.00 | ✓ Xero |  |
| ⚫ 2025-11-17 | Everyday | SPEND | Nicholas | $15000.00 | — |  |
| 🚫 2025-11-17 | NAB Visa ACT | SPEND | Amazon Prime | $9.99 | — |  |
| 🚫 2025-11-17 | NAB Visa ACT | SPEND | Uber | $57.04 | — |  |
| 🚫 2025-11-17 | NAB Visa ACT | SPEND | Apple Pty Ltd | $11.99 | — |  |
| 🚫 2025-11-17 | NAB Visa ACT | SPEND | Webflow | $70.84 | — |  |
| 🚫 2025-11-17 | NAB Visa ACT | SPEND | Webflow | $71.05 | — |  |
| 🚫 2025-11-17 | NAB Visa ACT | SPEND | NAB | $13.78 | — |  |
| 🚫 2025-11-17 | NAB Visa ACT | SPEND | NAB | $7.16 | — |  |
| 🚫 2025-11-17 | NAB Visa ACT | SPEND | NAB | $2.48 | — |  |
| 🚫 2025-11-17 | NAB Visa ACT | SPEND | NAB | $2.49 | — |  |
| 🚫 2025-11-17 | NAB Visa ACT | SPEND | NAB | $6.39 | — |  |
| 🟢 2025-11-17 | NAB Visa ACT | SPEND | Amazon | $359.99 | ✓ dex | A Curious Tractor, PICC P |
| 🟢 2025-11-17 | NAB Visa ACT | SPEND | Qantas | $718.50 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-17 | NAB Visa ACT | SPEND | Qantas | $176.38 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-17 | NAB Visa ACT | SPEND | Qantas | $135.00 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-17 | NAB Visa ACT | SPEND | Uber | $65.17 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-17 | NAB Visa ACT | SPEND | Qantas | $275.00 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-17 | NAB Visa ACT | SPEND | Uber | $57.04 | ✓ dex | A Curious Tractor |
| 🟡 2025-11-17 | NAB Visa ACT | SPEND | NAB Fee | $6.39 | — | A Curious Tractor |
| 🟡 2025-11-17 | NAB Visa ACT | SPEND | NAB Fee | $2.49 | — | A Curious Tractor |
| 🟡 2025-11-17 | NAB Visa ACT | SPEND | NAB Fee | $2.48 | — | A Curious Tractor |
| 🟡 2025-11-17 | NAB Visa ACT | SPEND | NAB Fee | $7.16 | — | A Curious Tractor |
| 🟡 2025-11-17 | NAB Visa ACT | SPEND | NAB Fee | $13.78 | — | A Curious Tractor |
| 🟢 2025-11-17 | BILL | DRAFT | Qantas Airways Limited | $260.00 | ✓ gma |  |
| 🟢 2025-11-17 | BILL | DRAFT | Qantas Airways Limited | $195.00 | ✓ dex |  |
| 🟢 2025-11-17 | BILL | DRAFT | Qantas Airways Limited | $130.00 | ✓ dex |  |
| 🟢 2025-11-17 | BILL | AUTHORISED | Defy Manufacturing | $2733.72 | ✓ dex |  |
| 🟢 2025-11-18 | NAB Visa ACT | SPEND | Qantas | $1199.29 | ✓ gma | A Curious Tractor |
| 🟢 2025-11-18 | NAB Visa ACT | SPEND | Qantas | $1199.29 | ✓ Xero | A Curious Tractor |
| 🟢 2025-11-18 | BILL | AUTHORISED | Qantas | $1016.36 | ✓ dex |  |
| 🟢 2025-11-18 | BILL | AUTHORISED | Qantas | $1736.28 | ✓ dex |  |
| 🟢 2025-11-18 | BILL | AUTHORISED | Qantas | $2299.95 | ✓ dex |  |
| 🟢 2025-11-18 | BILL | PAID | Cursor AI | $30.86 | ✓ Xero | A Curious Tractor |
| 🟢 2025-11-18 | BILL | PAID | Urban Bites | $55.22 | ✓ dex |  |
| ⚫ 2025-11-19 | Everyday | RECEIVE | Nicholas Marchesi | $6295.93 | — |  |
| ⚫ 2025-11-19 | Everyday | RECEIVE | Nicholas Marchesi | $10000.00 | — |  |
| ⚫ 2025-11-19 | Everyday | RECEIVE | Nicholas Marchesi | $6000.00 | — |  |
| ⚫ 2025-11-19 | Everyday | RECEIVE | Nicholas Marchesi | $5000.00 | — |  |
| 🚫 2025-11-19 | NAB Visa ACT | SPEND | GoPayID | $0.64 | — |  |
| 🚫 2025-11-19 | NAB Visa ACT | SPEND | GoPayID | $1.06 | — |  |
| 🚫 2025-11-19 | Everyday | SPEND-TR | ? | $6000.00 | — |  |
| 🚫 2025-11-19 | NAB Visa ACT | RECEIVE-TR | ? | $6000.00 | — |  |
| 🚫 2025-11-19 | Everyday | SPEND-TR | ? | $5000.00 | — |  |
| 🚫 2025-11-19 | NAB Visa ACT | RECEIVE-TR | ? | $5000.00 | — |  |
| 🚫 2025-11-19 | Everyday | SPEND-TR | ? | $10000.00 | — |  |
| 🚫 2025-11-19 | NAB Visa ACT | RECEIVE-TR | ? | $10000.00 | — |  |
| 🚫 2025-11-19 | Everyday | SPEND-TR | ? | $6295.93 | — |  |
| 🚫 2025-11-19 | NAB Visa ACT | RECEIVE-TR | ? | $6295.93 | — |  |
| 🚫 2025-11-19 | NAB Visa ACT | SPEND | NAB | $0.02 | — |  |
| 🚫 2025-11-19 | NAB Visa ACT | SPEND | NAB | $0.04 | — |  |
| 🟢 2025-11-19 | NAB Visa ACT | SPEND | Updoc | $39.95 | ✓ dex |  |
| 🟡 2025-11-19 | NAB Visa ACT | SPEND | NAB Fee | $0.04 | — | A Curious Tractor |
| 🟡 2025-11-19 | NAB Visa ACT | SPEND | NAB Fee | $0.02 | — | A Curious Tractor |
| 🟢 2025-11-19 | BILL | DRAFT | Qantas Airways Limited | $109.86 | ✓ dex |  |
| 🟢 2025-11-19 | BILL | AUTHORISED | Defy Manufacturing | $16500.00 | ✓ dex |  |
| 🟢 2025-11-19 | BILL | AUTHORISED | Qantas | $563.40 | ✓ dex |  |
| 🟢 2025-11-19 | BILL | AUTHORISED | Qantas | $886.60 | ✓ dex |  |
| 🟢 2025-11-19 | BILL | PAID | Urban Bites | $12.86 | ✓ dex | Goods. |
| 🟢 2025-11-19 | BILL | PAID | Qantas | $621.65 | ✓ dex |  |
| 🟢 2025-11-19 | BILL | PAID | Qantas | $819.57 | ✓ dex |  |
| 🟢 2025-11-19 | BILL | PAID | Qantas Group Accommodation | $532.00 | ✓ dex |  |
| 🟢 2025-11-19 | BILL | PAID | Qantas | $458.28 | ✓ dex |  |
| 🟢 2025-11-19 | BILL | PAID | Qantas Group Accommodation | $122.00 | ✓ dex |  |
| 🟢 2025-11-19 | BILL | PAID | INTEX STAND CANGGU BALI | $69.32 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-19 | BILL | PAID | Qantas | $196.27 | ✓ Xero |  |
| 🟢 2025-11-19 | BILL | PAID | INDIGO A NEW EXPERIENCE | $199.17 | ✓ dex | Goods. |
| 🟢 2025-11-19 | BILL | PAID | Qantas Group Accommodation | $122.00 | ✓ dex |  |
| 🟢 2025-11-19 | BILL | PAID | Qantas Group Accommodation | $289.80 | ✓ dex |  |
| 🚫 2025-11-20 | NAB Visa ACT | SPEND | Updoc | $39.95 | — |  |
| 🚫 2025-11-20 | NAB Visa ACT | SPEND | Cursor AI | $30.86 | — | A Curious Tractor |
| 🚫 2025-11-20 | NAB Visa ACT | SPEND | NAB | $0.52 | — |  |
| 🚫 2025-11-20 | NAB Visa ACT | SPEND | NAB | $1.08 | — |  |
| 🚫 2025-11-20 | NAB Visa ACT | SPEND | NAB | $0.03 | — |  |
| 🚫 2025-11-20 | NAB Visa ACT | SPEND | NAB | $0.45 | — |  |
| 🟢 2025-11-20 | NAB Visa ACT | SPEND | Qantas | $766.65 | ✓ gma | A Curious Tractor |
| 🟢 2025-11-20 | NAB Visa ACT | SPEND | Qantas | $868.14 | ✓ gma | A Curious Tractor |
| 🟢 2025-11-20 | NAB Visa ACT | SPEND | Qantas | $766.65 | ✓ gma | A Curious Tractor |
| 🟢 2025-11-20 | NAB Visa ACT | SPEND | Qantas | $766.65 | ✓ gma | A Curious Tractor |
| 🟢 2025-11-20 | NAB Visa ACT | SPEND | Qantas | $868.14 | ✓ gma | A Curious Tractor |
| 🟢 2025-11-20 | NAB Visa ACT | SPEND | Qantas | $508.18 | ✓ gma | A Curious Tractor |
| 🟢 2025-11-20 | NAB Visa ACT | SPEND | Qantas | $508.18 | ✓ gma | A Curious Tractor |
| 🟡 2025-11-20 | NAB Visa ACT | SPEND | NAB Fee | $0.45 | — | A Curious Tractor |
| 🟡 2025-11-20 | NAB Visa ACT | SPEND | NAB Fee | $0.03 | — | A Curious Tractor |
| 🟡 2025-11-20 | NAB Visa ACT | SPEND | NAB Fee | $1.08 | — | A Curious Tractor |
| 🟡 2025-11-20 | NAB Visa ACT | SPEND | NAB Fee | $0.52 | — | A Curious Tractor |
| 🟢 2025-11-20 | BILL | PAID | The Conscious Society | $177.12 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-20 | BILL | PAID | Arthefact | $348.93 | ✓ dex | Goods. |
| 🟡 2025-11-21 | Everyday | RECEIVE | Aleisha J Keating | $725.00 | — |  |
| ⚫ 2025-11-21 | Everyday | SPEND | Nicholas | $6159.00 | — |  |
| 🚫 2025-11-21 | Everyday | SPEND-TR | ? | $6159.00 | — |  |
| 🚫 2025-11-21 | NAB Visa ACT | RECEIVE-TR | ? | $6159.00 | — |  |
| 🚫 2025-11-21 | NAB Visa ACT | SPEND | GoPayID | $1.29 | — |  |
| 🚫 2025-11-21 | NAB Visa ACT | SPEND | GoPayID | $1.48 | — |  |
| 🚫 2025-11-21 | NAB Visa ACT | SPEND | GoPayID | $1.48 | — |  |
| 🚫 2025-11-21 | NAB Visa ACT | SPEND | NAB | $4.85 | — |  |
| 🚫 2025-11-21 | NAB Visa ACT | SPEND | NAB | $0.05 | — |  |
| 🚫 2025-11-21 | NAB Visa ACT | SPEND | NAB | $0.05 | — |  |
| 🚫 2025-11-21 | NAB Visa ACT | SPEND | NAB | $2.43 | — |  |
| 🚫 2025-11-21 | NAB Visa ACT | SPEND | NAB | $1.93 | — |  |
| 🚫 2025-11-21 | NAB Visa ACT | SPEND | NAB | $0.05 | — |  |
| 🚫 2025-11-21 | NAB Visa ACT | SPEND | NAB | $6.97 | — |  |
| 🟢 2025-11-21 | NAB Visa ACT | SPEND | Qantas | $443.30 | ✓ gma | A Curious Tractor |
| 🟢 2025-11-21 | NAB Visa ACT | SPEND | Qantas | $443.30 | ✓ Xero | A Curious Tractor |
| 🟢 2025-11-21 | NAB Visa ACT | SPEND | Qantas | $281.70 | ✓ gma | A Curious Tractor |
| 🟢 2025-11-21 | NAB Visa ACT | SPEND | Qantas | $281.70 | ✓ Xero | A Curious Tractor |
| 🟡 2025-11-21 | NAB Visa ACT | SPEND | NAB Fee | $6.97 | — | A Curious Tractor |
| 🟡 2025-11-21 | NAB Visa ACT | SPEND | NAB Fee | $0.05 | — | A Curious Tractor |
| 🟡 2025-11-21 | NAB Visa ACT | SPEND | NAB Fee | $1.93 | — | A Curious Tractor |
| 🟡 2025-11-21 | NAB Visa ACT | SPEND | NAB Fee | $2.43 | — | A Curious Tractor |
| 🟡 2025-11-21 | NAB Visa ACT | SPEND | NAB Fee | $0.05 | — | A Curious Tractor |
| 🟡 2025-11-21 | NAB Visa ACT | SPEND | NAB Fee | $0.05 | — | A Curious Tractor |
| 🟡 2025-11-21 | NAB Visa ACT | SPEND | NAB Fee | $4.85 | — | A Curious Tractor |
| 🟢 2025-11-21 | NAB Visa ACT | SPEND | Descript | $446.46 | ✓ Xero | ACT-IN — ACT Infrastructu |
| 🟢 2025-11-21 | BILL | PAID | Supabase | $97.44 | ✓ dex |  |
| 🟢 2025-11-21 | BILL | PAID | Dext Software | $42.00 | ✓ dex |  |
| 🟢 2025-11-21 | BILL | PAID | Qantas Group Accommodation | $144.06 | ✓ dex |  |
| 🟢 2025-11-21 | BILL | PAID | Carriageworks | $224.98 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-22 | NAB Visa ACT | SPEND | Webflow | $49.47 | ✓ Xero | A Curious Tractor |
| 🟢 2025-11-22 | BILL | PAID | IGA | $17.49 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-11-22 | BILL | PAID | Little Rosebery Cafe | $11.15 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-22 | BILL | PAID | La Porchetta - Colac | $135.17 | ✓ dex |  |
| 🟢 2025-11-22 | BILL | PAID | Dar Tèta | $41.00 | ✓ dex | Goods. |
| 🟢 2025-11-23 | BILL | AUTHORISED | Hatch Electrical | $26801.70 | ✓ dex |  |
| 🟢 2025-11-23 | BILL | PAID | Delaware North Airport | $25.50 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-11-23 | BILL | PAID | BP | $50.92 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-11-23 | BILL | PAID | Railway Corporation | $1.60 | ✓ dex |  |
| 🟢 2025-11-23 | BILL | PAID | HighLevel | $166.23 | ✓ dex |  |
| ⚫ 2025-11-24 | Everyday | RECEIVE | Nicholas Marchesi | $30000.00 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | GoPayID | $1.57 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | GoPayID | $1.39 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | GoPayID | $1.39 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | GoPayID | $1.39 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | GoPayID | $1.20 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | GoPayID | $1.39 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | GoPayID | $1.44 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | Uber | $63.05 | — |  |
| 🚫 2025-11-24 | Everyday | SPEND-TR | ? | $30000.00 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | RECEIVE-TR | ? | $30000.00 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | Webflow | $45.18 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | Descript | $447.62 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | Webflow | $42.20 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | Webflow | $49.70 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $0.41 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $2.55 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $15.67 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $0.05 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $1.74 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $6.20 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $12.21 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $0.05 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $0.05 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $0.05 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $0.06 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $1.48 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $1.58 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $3.41 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $5.82 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $0.04 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $0.04 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $0.05 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | NAB | $0.05 | — |  |
| 🚫 2025-11-24 | NAB Visa ACT | SPEND | Webflow | $49.38 | ✓ Xero | A Curious Tractor |
| 🟢 2025-11-24 | NAB Visa ACT | SPEND | Uber | $63.05 | ✓ dex | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $1.58 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $1.48 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $0.06 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $0.05 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $0.05 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $0.05 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $12.21 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $6.20 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $1.74 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $0.05 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $0.05 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $0.04 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $0.04 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $5.82 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $3.41 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $0.05 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $15.67 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $2.55 | — | A Curious Tractor |
| 🟡 2025-11-24 | NAB Visa ACT | SPEND | NAB Fee | $0.41 | — | A Curious Tractor |
| 🟢 2025-11-24 | NAB Visa ACT | SPEND | Webflow | $49.38 | ✓ xer | A Curious Tractor |
| 🟢 2025-11-24 | NAB Visa ACT | SPEND | Webflow | $44.89 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-25 | NAB Visa ACT | SPEND | Uber | $19.33 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-25 | NAB Visa ACT | SPEND | Uber | $41.63 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-25 | NAB Visa ACT | SPEND | Qantas | $593.20 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-25 | NAB Visa ACT | SPEND | Qantas | $1636.08 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-25 | BILL | PAID | GoGet Carshare | $114.35 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-25 | BILL | PAID | United Carrara | $21.00 | ✓ dex | A Curious Tractor, Empath |
| 🟢 2025-11-26 | NAB Visa ACT | SPEND | Uber | $17.03 | ✓ gma | A Curious Tractor |
| 🟡 2025-11-26 | NAB Visa ACT | SPEND | NAB Fee | $2.67 | — | A Curious Tractor |
| 🟢 2025-11-26 | NAB Visa ACT | SPEND | Webflow | $40.60 | ✓ Xero | A Curious Tractor |
| 🟡 2025-11-28 | NAB Visa ACT | SPEND | NAB Fee | $1.43 | — | A Curious Tractor |
| 🟢 2025-11-29 | BILL | PAID | Dialpad | $56.00 | ✓ dex | A Curious Tractor |
| 🟢 2025-11-30 | BILL | PAID | Bunnings Warehouse | $398.43 | ✓ dex | A Curious Tractor, PICC C |
| 🟢 2025-11-30 | BILL | PAID | Sydney Tools | $2342.90 | ✓ dex | A Curious Tractor, PICC C |
| 🟢 2025-11-30 | BILL | PAID | Bunnings Warehouse | $1204.31 | ✓ dex | A Curious Tractor, PICC C |
| 🟢 2025-11-30 | BILL | PAID | Bloom Espresso | $9.65 | ✓ dex | A Curious Tractor, PICC C |
| 🟢 2025-11-30 | BILL | PAID | Figma | $33.75 | ✓ Xero | A Curious Tractor |
| 🟢 2025-12-01 | NAB Visa ACT | SPEND | Uber | $81.60 | ✓ gma | A Curious Tractor |
| 🟡 2025-12-01 | NAB Visa ACT | SPEND | Uber | $8.28 | — | A Curious Tractor |
| 🟢 2025-12-01 | NAB Visa ACT | SPEND | Uber | $56.98 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-01 | NAB Visa ACT | SPEND | Uber | $47.51 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-01 | NAB Visa ACT | SPEND | Uber | $32.84 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-01 | NAB Visa ACT | SPEND | Uber | $45.07 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-01 | NAB Visa ACT | SPEND | Uber | $42.66 | ✓ Xero | A Curious Tractor |
| 🟢 2025-12-01 | NAB Visa ACT | SPEND | Uber | $24.54 | ✓ dex | A Curious Tractor |
| 🟡 2025-12-01 | NAB Visa ACT | SPEND | NAB Fee | $1.18 | — | A Curious Tractor |
| 🟡 2025-12-01 | NAB Visa ACT | SPEND | NAB Fee | $1.18 | — | A Curious Tractor |
| 🟡 2025-12-01 | NAB Visa ACT | SPEND | NAB Fee | $1.96 | — | A Curious Tractor |
| 🟢 2025-12-01 | BILL | PAID | SSP Australia Catering | $19.27 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-01 | BILL | PAID | Sunset Snack Bar | $89.30 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-02 | NAB Visa ACT | SPEND | DTF Direct | $288.49 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-02 | NAB Visa ACT | SPEND | Uber | $27.27 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-02 | NAB Visa ACT | SPEND | Uber | $24.11 | ✓ dex | A Curious Tractor |
| 🟡 2025-12-02 | NAB Visa ACT | SPEND | Uber | $26.08 | — | A Curious Tractor |
| 🟢 2025-12-02 | NAB Visa ACT | SPEND | Qantas | $975.23 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-02 | NAB Visa ACT | SPEND | Bunnings Warehouse | $49.98 | ✓ dex | ACT-IN — ACT Infrastructu |
| 🟢 2025-12-02 | BILL | PAID | Bunnings Warehouse | $1288.68 | ✓ dex | A Curious Tractor, PICC C |
| 🟢 2025-12-02 | BILL | PAID | Officeworks | $536.97 | ✓ dex | A Curious Tractor, PICC C |
| 🟢 2025-12-02 | BILL | PAID | STARLINK INTERNET SERVICES | $108.00 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-02 | BILL | PAID | Cognition AI | $153.05 | ✓ Xero | A Curious Tractor |
| 🟢 2025-12-03 | NAB Visa ACT | SPEND | Uber | $55.61 | ✓ gma | A Curious Tractor |
| 🟡 2025-12-03 | NAB Visa ACT | SPEND | NAB Fee | $0.53 | — | A Curious Tractor |
| 🟢 2025-12-03 | NAB Visa ACT | SPEND | Cactus Jacks Bar and Grill | $708.85 | ✓ dex | ACT-UA — Uncle Allan Palm |
| 🟢 2025-12-03 | BILL | PAID | Coles Supermarkets | $88.64 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-03 | BILL | PAID | Uwei | $142.80 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-03 | BILL | PAID | Zapier | $50.49 | ✓ Xero | A Curious Tractor, Goods. |
| 🟢 2025-12-03 | BILL | PAID | Napkin AI | $18.37 | ✓ Xero | A Curious Tractor |
| 🟡 2025-12-04 | NAB Visa ACT | SPEND | NAB Fee | $5.36 | — | A Curious Tractor |
| 🟡 2025-12-04 | NAB Visa ACT | SPEND | NAB Fee | $0.64 | — | A Curious Tractor |
| 🟢 2025-12-04 | BILL | PAID | The Townsville Store | $43.62 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-04 | BILL | PAID | Nightowl Belgian Gardens | $47.60 | ✓ dex |  |
| 🟢 2025-12-04 | BILL | PAID | SPLASH BAR | $178.42 | ✓ dex |  |
| 🟢 2025-12-04 | BILL | PAID | Hermit Park - Good Morning Cof | $48.17 | ✓ dex |  |
| 🟢 2025-12-05 | NAB Visa ACT | SPEND | Uber | $24.85 | ✓ dex | A Curious Tractor |
| 🟡 2025-12-05 | NAB Visa ACT | SPEND | NAB Fee | $1.77 | — | A Curious Tractor |
| 🟢 2025-12-06 | NAB Visa ACT | SPEND | Amazon | $16.45 | ✓ dex |  |
| 🟢 2025-12-08 | NAB Visa ACT | SPEND | Uber | $91.83 | ✓ dex | A Curious Tractor |
| 🟡 2025-12-08 | NAB Visa ACT | SPEND | Uber | $15.50 | — | A Curious Tractor |
| 🟢 2025-12-08 | NAB Visa ACT | SPEND | Uber | $68.55 | ✓ gma | A Curious Tractor |
| 🟡 2025-12-08 | NAB Visa ACT | SPEND | Uber | $9.99 | — | A Curious Tractor |
| 🟡 2025-12-08 | NAB Visa ACT | SPEND | Uber | $12.69 | — | A Curious Tractor |
| 🟢 2025-12-08 | NAB Visa ACT | SPEND | Uber | $67.50 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-09 | NAB Visa ACT | SPEND | Uber | $47.44 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-09 | NAB Visa ACT | SPEND | Uber | $58.63 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-09 | NAB Visa ACT | SPEND | Uber | $3.94 | ✓ Xero | A Curious Tractor |
| 🟢 2025-12-09 | NAB Visa ACT | SPEND | Uber | $46.25 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-09 | NAB Visa ACT | SPEND | Uber | $177.48 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-09 | NAB Visa ACT | SPEND | Uber | $32.07 | ✓ dex | A Curious Tractor |
| 🟡 2025-12-09 | NAB Visa ACT | SPEND | Uber | $26.62 | — | A Curious Tractor |
| 🟢 2025-12-09 | NAB Visa ACT | SPEND | Uber | $39.37 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-09 | NAB Visa ACT | SPEND | Webflow | $43.66 | ✓ Xero | A Curious Tractor |
| 🟢 2025-12-09 | NAB Visa ACT | SPEND | Product Of Italy Minchoury | $61.00 | ✓ dex | A Curious Tractor, Mounty |
| 🟢 2025-12-09 | NAB Visa ACT | SPEND | Celebrants Australia Incorpora | $100.00 | ✓ dex |  |
| 🟢 2025-12-09 | BILL | PAID | Cup Of Eden Cafe | $39.41 | ✓ dex | A Curious Tractor, Mounty |
| 🟢 2025-12-10 | NAB Visa ACT | SPEND | Uber | $16.10 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-10 | NAB Visa ACT | SPEND | Uber | $46.22 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-10 | NAB Visa ACT | SPEND | Uber | $17.77 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-10 | NAB Visa ACT | SPEND | Uber | $74.48 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-10 | BILL | PAID | Notion Labs | $79.90 | ✓ Xero | Farm Activities |
| 🟢 2025-12-10 | BILL | PAID | Thai Hanuman | $65.59 | ✓ dex | Mounty |
| 🟢 2025-12-10 | BILL | PAID | Bunnings Warehouse | $44.96 | ✓ dex | A Curious Tractor, Mounty |
| 🟢 2025-12-10 | BILL | PAID | Ritual Espresso | $11.01 | ✓ dex | A Curious Tractor, Mounty |
| 🟡 2025-12-11 | NAB Visa ACT | SPEND | NAB Fee | $2.80 | — | A Curious Tractor |
| 🟡 2025-12-11 | NAB Visa ACT | SPEND | NAB Fee | $1.53 | — | A Curious Tractor |
| 🟢 2025-12-11 | NAB Visa ACT | SPEND | OpenAI | $90.39 | ✓ Xero |  |
| 🟢 2025-12-11 | BILL | PAID | Q Eats | $133.10 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-11 | BILL | PAID | Kmart | $9.50 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-11 | BILL | PAID | Alice Silver Passenger S | $40.00 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-12 | NAB Visa ACT | SPEND | Crowne Plaza Alice Springs Las | $147.25 | ✓ dex | ACT-GD — Goods |
| 🟢 2025-12-12 | BILL | PAID | SideGuide Technologies | $28.68 | ✓ Xero |  |
| 🟢 2025-12-12 | BILL | PAID | SideGuide Technologies | $28.68 | ✓ Xero |  |
| 🟢 2025-12-12 | BILL | PAID | SideGuide Technologies | $28.50 | ✓ Xero |  |
| 🟢 2025-12-12 | BILL | PAID | Virgin Australia | $407.27 | ✓ dex |  |
| 🟢 2025-12-12 | BILL | PAID | Lasseters Centre Of Entertainm | $4.57 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-13 | BILL | PAID | Adobe Systems Software | $56.73 | ✓ dex |  |
| 🟢 2025-12-13 | BILL | PAID | IGA | $41.28 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-13 | BILL | PAID | Bay Leaf Cafe | $31.00 | ✓ dex |  |
| 🟢 2025-12-13 | BILL | PAID | Tennant Creek Memorial Club | $6.00 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-14 | NAB Visa ACT | SPEND | Mighty Networks | $178.76 | ✓ xer |  |
| 🟢 2025-12-14 | NAB Visa ACT | SPEND | Webflow | $69.40 | ✓ xer | A Curious Tractor |
| 🟢 2025-12-14 | BILL | PAID | SSP Australia Catering | $21.30 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-14 | BILL | PAID | Apple Pty Ltd | $11.99 | ✓ dex |  |
| 🟢 2025-12-14 | BILL | PAID | Bay Leaf Cafe | $12.65 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-14 | BILL | PAID | Ti Tree Roadhouse | $156.97 | ✓ dex | A Curious Tractor, Goods. |
| 🟢 2025-12-14 | BILL | AUTHORISED | Uber | $70.71 | ✓ dex |  |
| 🟢 2025-12-15 | NAB Visa ACT | SPEND | Qantas | $135.00 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-15 | NAB Visa ACT | SPEND | Qantas | $171.00 | ✓ Xero | A Curious Tractor |
| 🟡 2025-12-15 | NAB Visa ACT | SPEND | NAB Fee | $3.17 | — | A Curious Tractor |
| 🟡 2025-12-15 | NAB Visa ACT | SPEND | NAB Fee | $6.28 | — | A Curious Tractor |
| 🟡 2025-12-15 | NAB Visa ACT | SPEND | NAB Fee | $1.53 | — | A Curious Tractor |
| 🟡 2025-12-15 | NAB Visa ACT | SPEND | NAB Fee | $2.44 | — | A Curious Tractor |
| 🟢 2025-12-15 | NAB Visa ACT | SPEND | Hanuman Alice Springs | $76.50 | ✓ xer | ACT-UA — Uncle Allan Palm |
| 🟢 2025-12-15 | BILL | PAID | Hinterland Aviation | $375.36 | ✓ dex |  |
| 🟢 2025-12-15 | BILL | PAID | Apple Pty Ltd | $119.99 | ✓ dex |  |
| 🟢 2025-12-15 | BILL | PAID | Mystery Transport | $28.50 | ✓ dex | A Curious Tractor, PICC A |
| 🟢 2025-12-15 | BILL | AUTHORISED | Uber | $11.98 | ✓ Xero |  |
| 🟢 2025-12-15 | BILL | AUTHORISED | Uber | $69.41 | ✓ dex |  |
| 🟢 2025-12-16 | NAB Visa ACT | SPEND | Qantas | $114.33 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-16 | NAB Visa ACT | SPEND | Webflow | $69.61 | ✓ Xero | A Curious Tractor |
| 🟢 2025-12-16 | NAB Visa ACT | SPEND | Telstra | $80.00 | ✓ xer | ACT-IN — ACT Infrastructu |
| 🟢 2025-12-16 | BILL | PAID | Qantas | $65.00 | ✓ Xero | A Curious Tractor, Goods. |
| 🟢 2025-12-16 | BILL | AUTHORISED | Uber | $22.92 | ✓ Xero |  |
| 🟢 2025-12-16 | BILL | AUTHORISED | Uber | $19.49 | ✓ gma |  |
| 🟡 2025-12-17 | NAB Visa ACT | SPEND | NAB Fee | $2.44 | — | A Curious Tractor |
| 🟢 2025-12-17 | NAB Visa ACT | SPEND | Beach Hotel | $8.00 | ✓ dex | ACT-PI — PICC |
| 🟢 2025-12-17 | BILL | PAID | Vercel | $29.90 | ✓ Xero |  |
| 🟢 2025-12-17 | BILL | PAID | Vercel | $30.23 | ✓ Xero |  |
| 🟢 2025-12-17 | BILL | PAID | POLOLA | $21.27 | ✓ dex | A Curious Tractor, PICC A |
| 🟢 2025-12-17 | BILL | PAID | Nightowl Flinders St | $11.69 | ✓ dex | A Curious Tractor, PICC A |
| 🟢 2025-12-17 | BILL | AUTHORISED | Uber | $66.12 | ✓ dex |  |
| 🟢 2025-12-18 | NAB Visa ACT | SPEND | Qantas | $130.00 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-18 | NAB Visa ACT | SPEND | Qantas | $65.00 | ✓ Xero | A Curious Tractor |
| 🟢 2025-12-18 | NAB Visa ACT | SPEND | Telstra | $80.00 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-19 | NAB Visa ACT | SPEND | Updoc | $39.95 | ✓ dex |  |
| 🟢 2025-12-19 | NAB Visa ACT | SPEND | Qantas | $242.23 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-19 | NAB Visa ACT | SPEND | Qantas | $56.37 | ✓ gma | A Curious Tractor |
| 🟢 2025-12-19 | NAB Visa ACT | SPEND | Qantas | $259.16 | ✓ dex | A Curious Tractor |
| 🟡 2025-12-19 | NAB Visa ACT | SPEND | NAB Fee | $1.06 | — | A Curious Tractor |
| 🟢 2025-12-19 | NAB Visa ACT | SPEND | Yianis Greek Restaurant | $137.00 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-19 | BILL | PAID | The Source Bulk Foods Maleny | $57.15 | ✓ dex | A Curious Tractor |
| 🚫 2025-12-21 | NAB Visa ACT | SPEND | Supabase | $79.01 | ✓ Xero |  |
| 🟢 2025-12-21 | BILL | PAID | Booking.com | $89.00 | ✓ dex |  |
| 🟢 2025-12-21 | BILL | PAID | Dext Software | $42.00 | ✓ dex |  |
| 🟢 2025-12-21 | BILL | AUTHORISED | Supabase | $79.01 | ✓ dex |  |
| 🟢 2025-12-21 | BILL | AUTHORISED | Booking.com | $21.00 | ✓ dex |  |
| 🟡 2025-12-22 | NAB Visa ACT | SPEND | NAB Fee | $1.69 | — | A Curious Tractor |
| 🟡 2025-12-22 | NAB Visa ACT | SPEND | NAB Fee | $4.19 | — | A Curious Tractor |
| 🟡 2025-12-22 | NAB Visa ACT | SPEND | NAB Fee | $0.41 | — | A Curious Tractor |
| 🟡 2025-12-22 | NAB Visa ACT | SPEND | NAB Fee | $7.70 | — | A Curious Tractor |
| 🟡 2025-12-22 | NAB Visa ACT | SPEND | NAB Fee | $3.12 | — | A Curious Tractor |
| 🟡 2025-12-22 | NAB Visa ACT | SPEND | NAB Fee | $0.52 | — | A Curious Tractor |
| 🟢 2025-12-22 | NAB Visa ACT | SPEND | Webflow | $48.14 | ✓ xer | A Curious Tractor |
| 🟢 2025-12-22 | BILL | AUTHORISED | Qantas | $115.24 | ✓ dex |  |
| 🟢 2025-12-22 | BILL | AUTHORISED | Booking.com | $89.00 | ✓ dex |  |
| 🟢 2025-12-23 | NAB Visa ACT | SPEND | Railway Corporation | $5.00 | ✓ dex | ACT-IN — ACT Infrastructu |
| 🟢 2025-12-23 | BILL | PAID | Railway Corporation | $7.57 | ✓ Xero |  |
| 🟢 2025-12-23 | BILL | PAID | HighLevel | $146.90 | ✓ Xero |  |
| 🟢 2025-12-23 | BILL | PAID | HighLevel | $145.47 | ✓ Xero | A Curious Tractor |
| 🟢 2025-12-24 | NAB Visa ACT | SPEND | Webflow | $43.22 | ✓ xer | A Curious Tractor |
| 🟢 2025-12-24 | NAB Visa ACT | SPEND | Webflow | $47.54 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-24 | BILL | PAID | Webflow | $42.35 | ✓ Xero | A Curious Tractor |
| 🟢 2025-12-24 | BILL | AUTHORISED | Woodfordia | $205.53 | ✓ dex |  |
| 🟢 2025-12-25 | NAB Visa ACT | SPEND | OpenAI | $14.91 | ✓ xer |  |
| 🟢 2025-12-26 | NAB Visa ACT | SPEND | Webflow | $39.37 | ✓ xer | A Curious Tractor |
| 🟢 2025-12-26 | NAB Visa ACT | SPEND | Piggyback | $158.70 | ✓ dex | ACT-GD — Goods |
| 🟢 2025-12-26 | BILL | PAID | Apple Pty Ltd | $29.99 | ✓ dex |  |
| 🟢 2025-12-26 | BILL | AUTHORISED | Qantas | $1242.84 | ✓ Xero |  |
| 🟢 2025-12-26 | BILL | AUTHORISED | Qantas | $1568.74 | ✓ dex |  |
| 🟢 2025-12-27 | BILL | AUTHORISED | Woodfordia | $1013.88 | ✓ dex |  |
| 🟢 2025-12-28 | NAB Visa ACT | SPEND | Dialpad | $56.00 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-28 | BILL | PAID | Woodfordia | $751.23 | ✓ dex |  |
| 🟢 2025-12-28 | BILL | PAID | Fresh & Save Food Warehouse | $12.78 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-28 | BILL | AUTHORISED | Woodfordia | $20.00 | ✓ dex |  |
| 🟢 2025-12-29 | NAB Visa ACT | SPEND | Qantas | $289.00 | ✓ dex | A Curious Tractor |
| 🟡 2025-12-29 | NAB Visa ACT | SPEND | NAB Fee | $0.52 | — | A Curious Tractor |
| 🟡 2025-12-29 | NAB Visa ACT | SPEND | NAB Fee | $1.53 | — | A Curious Tractor |
| 🟡 2025-12-29 | NAB Visa ACT | SPEND | NAB Fee | $2.58 | — | A Curious Tractor |
| 🟡 2025-12-29 | NAB Visa ACT | SPEND | NAB Fee | $1.38 | — | A Curious Tractor |
| 🟡 2025-12-29 | NAB Visa ACT | SPEND | NAB Fee | $5.14 | — | A Curious Tractor |
| 🟡 2025-12-29 | NAB Visa ACT | SPEND | NAB Fee | $0.26 | — | A Curious Tractor |
| 🟡 2025-12-29 | NAB Visa ACT | SPEND | NAB Fee | $1.15 | — | A Curious Tractor |
| 🟡 2025-12-29 | NAB Visa ACT | SPEND | NAB Fee | $1.68 | — | A Curious Tractor |
| 🟡 2025-12-29 | NAB Visa ACT | SPEND | NAB Fee | $1.96 | — | A Curious Tractor |
| 🟢 2025-12-29 | NAB Visa ACT | SPEND | Dialpad | $56.00 | ✓ xer | ACT-IN — ACT Infrastructu |
| 🟢 2025-12-29 | BILL | PAID | NUDE JUICE | $12.24 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-29 | BILL | AUTHORISED | Woodfordia | $24.00 | ✓ dex |  |
| 🟢 2025-12-30 | NAB Visa ACT | SPEND | Qantas | $1242.84 | ✓ dex | A Curious Tractor |
| 🟢 2025-12-31 | BILL | PAID | Google Australia | $67.98 | ✓ dex |  |
| 🟢 2025-12-31 | BILL | PAID | Figma | $32.90 | ✓ Xero | A Curious Tractor |

## Full unmatched receipt list

Every receipt in the pool with no matching bank txn or bill. This is what's most likely paid by personal account, forwarded from elsewhere, or noise.

| Date | Vendor | Amount | Source | Subject |
|---|---|---:|---|---|
| 2025-11-27 | The Funding Network | $89361.00 | dext_import | Receipt from The Funding Network |
| 2025-12-17 | The Funding Network | $55197.00 | dext_import | Receipt from The Funding Network |
| 2025-12-17 | The Plasticians | $29800.00 | dext_import | Receipt (imported from Dext) |
| 2025-12-17 | The Plasticians | $29800.00 | dext_import | Receipt (imported from Dext) |
| 2025-11-11 | RNM CARPENTRY | $26845.65 | dext_import | Receipt (imported from Dext) |
| 2025-12-27 | AAMI | $20000.00 | dext_import | Receipt (imported from Dext) |
| 2025-11-10 | Hatch Electrical | $19947.13 | dext_import | Receipt from Hatch Electrical |
| 2025-12-22 | Telford Smith Engineering | $19800.00 | dext_import | Receipt from Telford Smith Engineering |
| 2025-12-22 | Telford Smith Engineering | $19800.00 | dext_import | Receipt from Telford Smith Engineering |
| 2025-11-19 | Defy | $16813.50 | dext_import | Receipt (imported from Dext) |
| 2025-12-15 | 1300 Washer | $13980.00 | dext_import | Receipt from 1300 Washer |
| 2025-12-28 | Bionic Self Storage | $12375.00 | dext_import | Receipt from Bionic Self Storage |
| 2025-11-16 | Carla Furnishers | $11180.00 | dext_import | Receipt from Carla Furnishers |
| 2025-11-26 | RNM Carpentry | $6865.65 | dext_import | Receipt (imported from Dext) |
| 2025-12-07 | Kennards Hire | $6616.00 | dext_import | Receipt from Kennards Hire |
| 2025-12-14 | The Matnic Trust | $6441.74 | dext_import | Receipt from The Matnic Trust |
| 2025-11-10 | A Curious Tractor | $6226.00 | dext_import | Receipt (imported from Dext) |
| 2025-12-15 | Oonchiumpa Consultancy And Ser | $5940.00 | dext_import | Receipt from Oonchiumpa Consultancy And Services |
| 2025-12-04 | Container Options | $5802.50 | dext_import | Receipt from Container Options |
| 2025-11-12 | Defy Manufacturing | $5500.00 | dext_import | Receipt from Defy Manufacturing |
| 2025-12-26 | AAMI | $5483.95 | dext_import | Receipt from AAMI |
| 2025-11-26 | Airbnb | $4621.18 | dext_import | Receipt from Airbnb |
| 2025-11-27 | Airbnb | $4621.18 | dext_import | Receipt (imported from Dext) |
| 2025-11-10 | Nicholas Marchesi | $3875.00 | dext_import | Receipt from Nicholas Marchesi |
| 2025-11-27 | Kennards Hire | $3745.00 | dext_import | Receipt from Kennards Hire |
| 2025-12-10 | Hatch Electrical | $3677.34 | dext_import | Receipt from Hatch Electrical |
| 2025-12-22 | Defy | $3598.09 | dext_import | Receipt from Defy |
| 2025-11-25 | Allclass | $3536.35 | dext_import | Receipt from Allclass |
| 2025-12-18 | Defy | $3260.63 | dext_import | Receipt from Defy |
| 2025-12-18 | Defy Manufacturing | $3199.83 | dext_import | Receipt from Defy Manufacturing |
| 2025-11-30 | Bunnings Warehouse | $2885.90 | dext_import | Receipt from Bunnings Warehouse |
| 2025-12-03 | Joseph Kirmos | $2737.50 | dext_import | Receipt from Joseph Kirmos |
| 2025-12-11 | Oonchiumpa Consultancy and Ser | $2700.00 | dext_import | Receipt from Oonchiumpa Consultancy And Services |
| 2025-11-11 | Home To Holiday | $2475.91 | dext_import | Receipt (imported from Dext) |
| 2025-11-10 | Airbnb | $2475.91 | dext_import | Receipt from Airbnb |
| 2025-12-29 | Bionic Self Storage | $2420.00 | dext_import | Receipt from Bionic Self Storage |
| 2025-11-14 | Qantas | $2398.58 | dext_import | Receipt from Qantas |
| 2025-11-25 | Airbnb | $2324.80 | dext_import | Receipt from Airbnb |
| 2025-12-08 | Adriana Beach | $2000.00 | dext_import | Receipt from Adriana Beach |
| 2025-11-29 | TNT Plastering & Maintenance | $2000.00 | dext_import | Receipt from TNT Plastering & Maintenance |
| 2025-11-24 | Nicholas Marchesi | $1974.50 | dext_import | Receipt from Nicholas Marchesi |
| 2025-12-08 | The Sand Yard | $1968.00 | dext_import | Receipt from The Sand Yard |
| 2025-11-25 | Allclass | $1948.90 | dext_import | Receipt from Allclass |
| 2025-11-25 | Allclass | $1948.90 | dext_import | Receipt from Allclass |
| 2025-11-28 | Defy | $1894.10 | dext_import | Receipt from Defy |
| 2025-11-27 | Defy Manufacturing | $1858.78 | dext_import | Receipt from Defy Manufacturing |
| 2025-12-08 | Kennards Hire | $1714.00 | dext_import | Receipt from Kennards Hire |
| 2025-12-26 | Bunnings Warehouse | $1597.00 | dext_import | Receipt from Bunnings Warehouse |
| 2025-11-25 | Allclass | $1587.45 | dext_import | Receipt from Allclass |
| 2025-11-25 | Allclass | $1587.45 | dext_import | Receipt from Allclass |
| 2025-11-08 | BUNNINGS WAREHOUSE | $1494.92 | dext_import | Receipt (imported from Dext) |
| 2025-11-08 | Bunnings Warehouse | $1468.28 | dext_import | Receipt (imported from Dext) |
| 2025-11-08 | Avis | $1247.62 | dext_import | Receipt from Avis |
| 2025-12-10 | Loadshift Sydney | $1243.59 | dext_import | Receipt from Loadshift Sydney |
| 2025-11-09 | Kennards Hire | $1236.50 | dext_import | Receipt from Kennards Hire |
| 2025-11-06 | Nicholas Marchesi | $1200.00 | dext_import | Receipt from Nicholas Marchesi |
| 2025-12-02 | TNT Plastering & Maintenance | $1200.00 | dext_import | Receipt from TNT Plastering & Maintenance |
| 2025-11-26 | AR Equipment | $1166.00 | dext_import | Receipt from AR Equipment |
| 2025-11-04 | Humanitix | $1150.00 | dext_import | Receipt from Humanitix |
| 2025-11-10 | Qantas | $1070.14 | dext_import | Receipt from Qantas |
| 2025-12-08 | The Sand Yard | $1044.44 | dext_import | Receipt from The Sand Yard |
| 2025-11-07 | Unknown Supplier | $1012.56 | dext_import | Receipt from Unknown Supplier |
| 2025-12-23 | BOE Design | $750.00 | dext_import | Receipt from BOE Design |
| 2025-12-27 | Woodford Folk Festival | $725.73 | dext_import | Receipt from Woodford Folk Festival |
| 2025-11-26 | Auto Sparky | $674.00 | dext_import | Receipt from Auto Sparky |
| 2025-12-18 | Izzy Mobile | $671.90 | dext_import | Receipt from Izzy Mobile |
| 2025-11-29 | Bunnings Warehouse | $632.52 | dext_import | Receipt from Bunnings Warehouse |
| 2025-12-13 | Bunnings Warehouse | $596.96 | dext_import | Receipt from Bunnings Warehouse |
| 2025-11-29 | POLOLA | $549.05 | dext_import | Receipt from POLOLA |
| 2025-12-09 | Bunnings Warehouse | $548.81 | dext_import | Receipt from Bunnings Warehouse |
| 2025-11-10 | Budget | $518.18 | dext_import | Receipt from Budget |
| 2025-11-28 | Shorehouse Townsville | $486.19 | dext_import | Receipt from Shorehouse Townsville |
| 2025-11-29 | Maleny Hardware And Rural Supp | $485.61 | dext_import | Receipt from Maleny Hardware And Rural Supplies |
| 2025-11-11 | Kennards Hire | $424.00 | dext_import | Receipt from Kennards Hire |
| 2025-12-09 | The Sand Yard | $373.52 | dext_import | Receipt from The Sand Yard |
| 2025-12-11 | Tennant Creek Retreat | $370.00 | dext_import | Receipt from Tennant Creek Retreat |
| 2025-12-21 | Airbnb | $369.82 | dext_import | Receipt from Airbnb |
| 2025-12-02 | Edmonds Landscaping Supplies | $360.00 | dext_import | Receipt from Edmonds Landscaping Supplies |
| 2025-12-01 | Domino's Pizza Enterprises | $330.00 | dext_import | Receipt from Domino's Pizza Enterprises |
| 2025-11-02 | QANTAS | $325.00 | dext_import | Receipt (imported from Dext) |
| 2025-11-01 | Qantas | $325.00 | dext_import | Receipt from Qantas |
| 2025-11-03 | AGL | $319.09 | dext_import | Receipt from AGL |
| 2025-11-20 | Budget | $317.98 | dext_import | Receipt from Budget |
| 2025-12-20 | Blair Robertson - Oak & Anchor | $299.29 | dext_import | Receipt from Blair Robertson - Oak & Anchor Hotel |
| 2025-12-03 | AGL | $290.11 | dext_import | Receipt from AGL |
| 2025-11-20 | Descript | $288.00 | dext_import | Receipt from Descript |
| 2025-12-29 | Liberty Maleny | $277.34 | dext_import | Receipt from Liberty Maleny |
| 2025-12-02 | Edmonds Landscaping Supplies | $264.00 | dext_import | Receipt from Edmonds Landscaping Supplies |
| 2025-11-07 | WizBang Technologies | $249.79 | dext_import | Receipt from WizBang Technologies |
| 2025-11-09 | Qantas | $249.00 | gmail | Confirmation and E-Ticket Flight Itinerary for F6HOJ8 from B |
| 2025-12-02 | Edmonds Landscaping Supplies | $240.00 | dext_import | Receipt from Edmonds Landscaping Supplies |
| 2025-11-20 | Sunnymead Hotel | $238.70 | dext_import | Receipt from Sunnymead Hotel |
| 2025-12-09 | Qantas | $238.45 | dext_import | Receipt (imported from Dext) |
| 2025-11-18 | Qantas | $238.45 | dext_import | Receipt from Qantas |
| 2025-11-21 | QANTAS | $218.67 | dext_import | Receipt (imported from Dext) |
| 2025-11-14 | Qantas | $218.67 | dext_import | Receipt from Qantas |
| 2025-11-13 | Access Auto Electrics & Air Co | $218.00 | dext_import | Receipt from Access Auto Electrics & Air Conditioning |
| 2025-12-11 | Department of Housing | $200.00 | dext_import | Receipt from Department of Housing |
| 2025-12-15 | Happy Boy | $197.99 | dext_import | Receipt from Happy Boy |
| 2025-12-13 | Todd Tavern | $197.47 | dext_import | Receipt from Todd Tavern |
| 2025-12-08 | Budget Car and Truck Rental (N | $177.36 | dext_import | Receipt from Budget Car and Truck Rental (NT) |
| 2025-12-08 | Budget | $177.36 | dext_import | Receipt from Budget |
| 2025-12-21 | Mobil Mobil Hamilton | $159.74 | dext_import | Receipt from Mobil Mobil Hamilton |
| 2025-12-26 | Piggyback | $158.70 | xero_me | Xero ME receipt for Piggyback 19119158120.jpeg |
| 2025-12-19 | BP | $155.72 | dext_import | Receipt from BP |
| 2025-11-14 | BAR OLO | $155.00 | dext_import | Receipt (imported from Dext) |
| 2025-11-25 | Airbnb | $151.11 | dext_import | Receipt from Airbnb |
| 2025-11-11 | Chubb | $151.11 | dext_import | Receipt from Chubb Insurance Australia |
| 2025-11-21 | Budget Car and Truck Rental (N | $148.03 | dext_import | Receipt from Budget Car and Truck Rental (NT) |
| 2025-12-12 | Crowne Plaza Alice Springs Las | $147.25 | xero_me | Xero ME receipt for Crowne Plaza Alice Springs Lasseters 190 |
| 2025-12-18 | Super Publishing Co | $144.00 | dext_import | Receipt from Super Publishing Co |
| 2025-12-18 | Super Publishing Co | $144.00 | dext_import | Receipt from Super Publishing Co |
| 2025-12-17 | BP | $142.09 | dext_import | Receipt from BP |
| 2025-12-01 | Hermit Park - Good Morning Cof | $138.20 | dext_import | Receipt from Hermit Park - Good Morning Coffee |
| 2025-12-20 | Millicent Service Station | $138.07 | dext_import | Receipt from Millicent Service Station |
| 2025-12-11 | BP | $137.33 | dext_import | Receipt from BP |
| 2025-12-19 | Yianis Greek Restaurant | $137.00 | xero_me | Xero ME receipt for Yianis Greek Restaurant 19075699050.jpeg |
| 2025-11-14 | Lotte Duty Free | $131.69 | dext_import | Receipt from Lotte Duty Free |
| 2025-11-30 | Bunnings Warehouse | $131.58 | dext_import | Receipt from Bunnings Warehouse |
| 2025-12-22 | BP | $131.18 | dext_import | Receipt from BP |
| 2025-12-15 | Qantas | $130.00 | dext_import | Receipt from Qantas |
| 2025-11-20 | Budget | $127.66 | dext_import | Receipt from Budget |
| 2025-12-03 | Nighton Harvey | $124.79 | dext_import | Receipt from Nighton Harvey |
| 2025-12-11 | Reddy Express | $122.71 | dext_import | Receipt from Reddy Express |
| 2025-11-13 | Mighty Networks | $119.00 | dext_import | Receipt from Mighty Networks |
| 2025-12-13 | Mighty Networks | $119.00 | dext_import | Receipt from Mighty Networks |
| 2025-11-23 | Car Park | $119.00 | dext_import | Receipt from Car Park |
| 2025-11-08 | BP | $110.94 | dext_import | Receipt from BP |
| 2025-11-22 | HighLevel | $106.70 | dext_import | Receipt from HighLevel |
| 2025-12-11 | Kennards Hire | $106.00 | dext_import | Receipt from Kennards Hire |
| 2025-11-09 | Notion Labs | $105.60 | dext_import | Receipt from Notion Labs |
| 2025-12-04 | Container Options | $101.55 | dext_import | Receipt from Container Options |
| 2025-12-04 | Container Options | $101.55 | dext_import | Receipt from Container Options |
| 2025-12-02 | EG Fuelco (Australia) Limited | $101.45 | dext_import | Receipt (imported from Dext) |
| 2025-12-16 | Bunnings Warehouse | $100.00 | dext_import | Receipt from Bunnings Warehouse |
| 2025-12-01 | Cognition AI | $100.00 | dext_import | Receipt from Cognition AI |
| 2025-11-01 | Cognition AI | $100.00 | dext_import | Receipt from Cognition AI |
| 2025-11-01 | Cognition AI | $100.00 | dext_import | Receipt from Cognition AI |
| 2025-12-07 | Celebrants Australia Incorpora | $100.00 | dext_import | Receipt from Celebrants Australia Incorporated |
| 2025-12-22 | HighLevel | $97.00 | dext_import | Receipt from HighLevel |
| 2025-12-22 | HighLevel | $97.00 | dext_import | Receipt from HighLevel |
| 2025-12-25 | BP | $96.17 | dext_import | Receipt from BP |
| 2025-12-10 | Repco | $96.00 | dext_import | Receipt from Repco |
| 2025-12-14 | BP | $95.65 | dext_import | Receipt from BP |
| 2025-12-07 | Uber | $91.83 | gmail | [A Curious Tractor ] Your Sunday evening trip with Uber |
| 2025-11-10 | Uber | $90.45 | dext_import | Receipt from Uber |
| 2025-12-13 | WizBang Technologies | $82.17 | dext_import | Receipt from WizBang Technologies |
| 2025-12-11 | The Roastery Cafe | $81.97 | dext_import | Receipt from The Roastery Cafe |
| 2025-12-20 | Supabase | $79.01 | dext_import | Receipt from Supabase |
| 2025-12-21 | Supabase | $79.01 | xero_me | Xero ME receipt for Supabase 19111981910.pdf |
| 2025-12-12 | Memories Bistro | $77.22 | dext_import | Receipt from Memories Bistro |
| 2025-12-14 | Hanuman Alice Springs | $76.50 | dext_import | Receipt from Hanuman Alice Springs |
| 2025-12-14 | Uber | $74.48 | gmail | [A Curious Tractor ] Your Monday morning trip with Uber |
| 2025-12-11 | DuYu Coffee | $73.67 | dext_import | Receipt from DuYu Coffee |
| 2025-11-22 | Qantas | $73.16 | dext_import | Receipt (imported from Dext) |
| 2025-11-17 | Qantas | $73.16 | dext_import | Receipt from Qantas |
| 2025-11-29 | Google Australia | $67.98 | dext_import | Receipt from Google Australia |
| 2025-12-21 | BANK ST AND CO | $67.70 | dext_import | Receipt from BANK ST AND CO |
| 2025-11-08 | Uber | $65.52 | dext_import | Receipt from Uber |
| 2025-11-09 | Uber | $65.52 | gmail | [A Curious Tractor ] Your Sunday evening trip with Uber |
| 2025-11-13 | Uber | $65.17 | gmail | [A Curious Tractor ] Your Thursday evening trip with Uber |
| 2025-11-20 | Supabase | $62.69 | dext_import | Receipt from Supabase |
| 2025-11-06 | Maleny Hardware And Rural Supp | $62.05 | dext_import | Receipt from Maleny Hardware And Rural Supplies |
| 2025-12-31 | X Global LLC | $62.00 | dext_import | Receipt from X Global LLC |
| 2025-12-31 | X Global LLC | $62.00 | dext_import | Receipt from X Global LLC |
| 2025-12-02 | Liberty Idalia | $61.42 | dext_import | Receipt from Liberty Idalia |
| 2025-12-09 | Product Of Italy Minchoury | $61.00 | xero_me | Xero ME receipt for Product Of Italy Minchoury 18957862380.j |
| 2025-12-12 | Memories Bistro | $60.96 | dext_import | Receipt from Memories Bistro |
| 2025-11-10 | OpenAI | $60.00 | dext_import | Receipt from OpenAI |
| 2025-12-10 | OpenAI | $60.00 | dext_import | Receipt from OpenAI |
| 2025-11-29 | Little Pegs | $60.00 | dext_import | Receipt from Little Pegs |
| 2025-11-11 | Apple Pty Ltd | $59.99 | dext_import | Receipt (imported from Dext) |
| 2025-12-28 | Dialpad | $56.00 | xero_me | Xero ME receipt for Dialpad 19391082540.jpeg |
| 2025-12-28 | Dialpad | $56.00 | dext_import | Receipt from Dialpad |
| 2025-11-30 | Hermit Park - Good Morning Cof | $55.96 | dext_import | Receipt from Hermit Park - Good Morning Coffee |
| 2025-12-21 | Permewans Mitre 10 | $54.90 | dext_import | Receipt from Permewans Mitre 10 |
| 2025-12-09 | Notion Labs | $52.80 | dext_import | Receipt from Notion Labs |
| 2025-12-02 | Edmonds Landscaping Supplies | $48.00 | dext_import | Receipt from Edmonds Landscaping Supplies |
| 2025-12-13 | Webflow | $46.20 | dext_import | Receipt from Webflow |
| 2025-11-13 | Webflow | $46.20 | dext_import | Receipt from Webflow |
| 2025-12-21 | The Roxburgh House | $45.46 | dext_import | Receipt from The Roxburgh House |
| 2025-11-14 | Maleny Hardware And Rural Supp | $45.10 | dext_import | Receipt from Maleny Hardware And Rural Supplies |
| 2025-11-14 | Tripsim | $44.99 | dext_import | Receipt from Tripsim |
| 2025-12-01 | Sunshine Coast Council | $44.90 | dext_import | Receipt from Sunshine Coast Council |
| 2025-11-29 | Sunshine Coast Council | $44.90 | dext_import | Receipt from Sunshine Coast Council |
| 2025-11-14 | BP | $44.23 | dext_import | Receipt from BP |
| 2025-12-10 | Budget Petrol Mascot | $42.83 | dext_import | Receipt from Budget Petrol Mascot |
| 2025-12-19 | Updoc | $39.95 | xero_me | Xero ME receipt for Updoc 19391068150.pdf |
| 2025-12-14 | F V Snowdon And J R Rowden | $37.50 | dext_import | Receipt from F V Snowdon And J R Rowden |
| 2025-11-02 | Zapier | $32.99 | dext_import | Receipt from Zapier |
| 2025-12-02 | Zapier | $32.99 | dext_import | Receipt from Zapier |
| 2025-11-23 | Webflow | $31.90 | dext_import | Receipt from Webflow |
| 2025-11-21 | Webflow | $31.90 | dext_import | Receipt from Webflow |
| 2025-12-23 | Webflow | $31.90 | dext_import | Receipt from Webflow |
| 2025-12-21 | Webflow | $31.90 | dext_import | Receipt from Webflow |
| 2025-11-08 | Webflow | $31.90 | dext_import | Receipt from Webflow |
| 2025-11-08 | Webflow | $31.90 | dext_import | Receipt from Webflow |
| 2025-11-08 | Webflow | $31.90 | dext_import | Receipt from Webflow |
| 2025-11-25 | Apple Pty Ltd | $29.99 | dext_import | Receipt from Apple Pty Ltd |
| 2025-11-26 | Apple | $29.99 | dext_import | Receipt (imported from Dext) |
| 2025-12-08 | Webflow | $29.00 | dext_import | Receipt from Webflow |
| 2025-11-23 | Webflow | $29.00 | dext_import | Receipt from Webflow |
| 2025-11-08 | Webflow | $29.00 | dext_import | Receipt from Webflow |
| 2025-12-23 | Webflow | $29.00 | dext_import | Receipt from Webflow |
| 2025-12-23 | Webflow | $29.00 | dext_import | Receipt from Webflow |
| 2025-12-08 | Webflow | $29.00 | dext_import | Receipt from Webflow |
| 2025-11-23 | Webflow | $29.00 | dext_import | Receipt from Webflow |
| 2025-11-12 | Codeguide | $29.00 | manual_upload | Invoice USXBIUZS-0004 - Codeguide Monthly $29.00 USD - DISPU |
| 2025-12-12 | Codeguide | $29.00 | manual_upload | Invoice USXBIUZS-0005 - Codeguide Monthly $29.00 USD - DISPU |
| 2025-11-08 | Webflow | $29.00 | dext_import | Receipt from Webflow |
| 2025-11-25 | Webflow | $26.40 | dext_import | Receipt from Webflow |
| 2025-12-25 | Webflow | $26.40 | dext_import | Receipt from Webflow |
| 2025-12-18 | The Maleny Pie Guy | $25.40 | dext_import | Receipt from The Maleny Pie Guy |
| 2025-12-15 | DuYu Coffee | $22.26 | dext_import | Receipt from DuYu Coffee |
| 2025-11-29 | Figma | $22.00 | dext_import | Receipt from Figma |
| 2025-12-30 | Figma | $22.00 | dext_import | Receipt from Figma |
| 2025-12-11 | Kmart | $22.00 | dext_import | Receipt from Kmart |
| 2025-12-30 | Maleny Hardware And Rural Supp | $21.90 | dext_import | Receipt from Maleny Hardware And Rural Supplies |
| 2025-11-27 | Maleny Hardware And Rural Supp | $21.71 | dext_import | Receipt from Maleny Hardware And Rural Supplies |
| 2025-12-11 | BP | $21.47 | dext_import | Receipt from BP |
| 2025-12-11 | Kmart | $21.00 | dext_import | Receipt from Kmart |
| 2025-11-17 | Cursor AI | $20.00 | dext_import | Receipt from Cursor AI |
| 2025-12-16 | Vercel | $20.00 | dext_import | Receipt from Vercel |
| 2025-12-16 | Vercel | $20.00 | dext_import | Receipt from Vercel |
| 2025-11-16 | Maleny Hardware And Rural Supp | $19.25 | dext_import | Receipt from Maleny Hardware And Rural Supplies |
| 2025-12-11 | The Roastery Cafe | $19.23 | dext_import | Receipt from The Roastery Cafe |
| 2025-12-11 | SideGuide Technologies | $19.00 | dext_import | Receipt from SideGuide Technologies |
| 2025-11-11 | SideGuide Technologies | $19.00 | dext_import | Receipt from SideGuide Technologies |
| 2025-12-11 | SideGuide Technologies | $19.00 | dext_import | Receipt from SideGuide Technologies |
| 2025-12-11 | SideGuide Technologies | $19.00 | dext_import | Receipt from SideGuide Technologies |
| 2025-11-11 | SideGuide Technologies | $19.00 | dext_import | Receipt from SideGuide Technologies |
| 2025-11-11 | SideGuide Technologies | $19.00 | dext_import | Receipt from SideGuide Technologies |
| 2025-11-24 | Canva | $17.99 | dext_import | Receipt from Canva |
| 2025-12-20 | CONFESSION | $17.00 | dext_import | Receipt from CONFESSION |
| 2025-11-30 | X Global LLC | $15.00 | dext_import | Receipt from X Global LLC |
| 2025-11-30 | X Global LLC | $15.00 | dext_import | Receipt from X Global LLC |
| 2025-12-05 | Apple Pty Ltd | $14.99 | dext_import | Receipt from Apple Pty Ltd |
| 2025-11-05 | Maleny Hardware And Rural Supp | $14.15 | dext_import | Receipt from Maleny Hardware And Rural Supplies |
| 2025-11-03 | Maleny Hardware And Rural Supp | $12.85 | dext_import | Receipt from Maleny Hardware And Rural Supplies |
| 2025-12-02 | Napkin AI | $12.00 | dext_import | Receipt from Napkin AI |
| 2025-11-02 | Napkin AI | $12.00 | dext_import | Receipt from Napkin AI |
| 2025-11-13 | Apple Pty Ltd | $11.99 | dext_import | Receipt from Apple Pty Ltd |
| 2025-11-14 | Apple | $11.99 | dext_import | Receipt (imported from Dext) |
| 2025-12-31 | Anthropic | $11.00 | dext_import | Receipt from Anthropic |
| 2025-11-08 | Anthropic | $11.00 | dext_import | Receipt from Anthropic |
| 2025-11-08 | Anthropic | $11.00 | dext_import | Receipt from Anthropic |
| 2025-12-24 | OpenAI | $10.00 | dext_import | Receipt from OpenAI |
| 2025-12-17 | Beach Hotel | $8.00 | xero_me | Xero ME receipt for Beach Hotel 19044485610.jpeg |
| 2025-12-22 | Railway Corporation | $5.00 | dext_import | Receipt from Railway Corporation |
| 2025-12-23 | Railway Corporation | $5.00 | xero_me | Xero ME receipt for Railway Corporation 19111981570.pdf |
| 2025-11-22 | Railway Corporation | $1.03 | dext_import | Receipt from Railway Corporation |
| 2025-12-22 | Pholklore | $0.00 | dext_import | Receipt from Pholklore - Torquay |
| 2025-11-15 | QANTAS INSURANCE | $0.00 | dext_import | Receipt (imported from Dext) |
| 2025-11-21 | HUMANITIX | $0.00 | dext_import | Receipt from Humanitix |
| 2025-12-12 | Xero | $0.00 | dext_import | Receipt from Xero Australia |
| 2025-12-15 | Speed Queen | $0.00 | dext_import | Receipt (imported from Dext) |
| 2025-12-15 | Speed Queen | $0.00 | dext_import | Receipt from 1300 Washer |
| 2025-12-18 | Garmin | $0.00 | dext_import | Receipt from Garmin |
| 2025-12-11 | Virgin Australia | $0.00 | dext_import | Receipt from Virgin Australia |
| 2025-11-15 | Indonesia Arrival | $0.00 | dext_import | Receipt (imported from Dext) |
| 2025-11-15 | QANTAS INSURANCE | $0.00 | dext_import | Receipt from AIG Insurance |
| 2025-11-18 | Garmin | $0.00 | dext_import | Receipt from Garmin |
| 2025-11-25 | ALLCLASS Kubota | $0.00 | dext_import | Receipt from Unknown Supplier |
| 2025-12-11 | TENNANT CREEK CARAVAN PARK | $0.00 | dext_import | Receipt (imported from Dext) |
| 2025-11-01 | Google Cloud | $0.00 | dext_import | Receipt (imported from Dext) |
| 2025-11-08 | B & S Hardware | $-131.59 | dext_import | Receipt from B & S Hardware |
| 2025-11-08 | Bunnings Warehouse | $-135.70 | dext_import | Receipt from Bunnings Warehouse |
| 2025-12-14 | Bunnings Warehouse | $-228.64 | dext_import | Receipt from Bunnings Warehouse |
| 2025-11-18 | Qantas | $-420.90 | dext_import | Receipt from Qantas |
| 2025-12-02 | Bunnings Warehouse | $-501.62 | dext_import | Receipt from Bunnings Warehouse |
| 2025-12-09 | Bunnings Warehouse | $-942.96 | dext_import | Receipt from Bunnings Warehouse |
| 2025-12-03 | Kennards Hire | $-3745.00 | dext_import | Receipt from Kennards Hire |