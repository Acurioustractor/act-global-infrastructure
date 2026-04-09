# Q1 FY26 — BAS Retrospective
**Generated:** 2026-04-09T02:56:09.325Z
**Quarter range:** 2025-07-01 → 2025-09-30

## Final coverage (6-path model)

| Path | Count | Value | % count | % value |
|---|---:|---:|---:|---:|
| DIRECT | 75 | $85050.14 | 17.2% | 17.5% |
| BILL_LINKED | 3 | $159.80 | 0.7% | 0.0% |
| NO_RECEIPT_NEEDED | 149 | $354237.44 | 34.2% | 73.0% |
| MISSING | 209 | $45691.04 | 47.9% | 9.4% |
| **TOTAL** | **436** | **$485138.42** | 100% | 100% |

**Covered (paths 1-3):** 227 / 436 = **52.1%** by count
**Covered value:** $439447.38 / $485138.42 = **90.6%** by value

## Zombie state
- DELETED/VOIDED txns in mirror: 15
- Value: $47754.76
- Status: ⚠ needs patching via sync-deleted-xero-state.mjs or status filter

## Top unreceipted vendors (real gap)

| Vendor | Txns | Value | Pattern | Next-time action |
|---|---:|---:|---|---|
| Samuel Hafer | 1 | $19500.00 | one-off large payment | Contractor — chase invoice PDF |
| Chris Witta | 6 | $2939.00 | recurring small | Chase vendor |
| DIY Blinds | 1 | $2935.85 | one-off large payment | Contractor — chase invoice PDF |
| Flight Bar Witta | 23 | $2400.97 | recurring small | Chase vendor |
| Qantas | 11 | $1965.88 | avg $178.72, connector bill exists | Xero UI Find & Match |
| Booking.com | 1 | $1632.33 | one-off large payment | Contractor — chase invoice PDF |
| Webflow | 18 | $1489.99 | SaaS, avg $82.78 | Gmail deep search |
| Izzy Mobile | 1 | $1485.47 | one-off large payment | Contractor — chase invoice PDF |
| Uber | 39 | $1165.63 | avg $29.89, frequent small | Bulk bill-to-txn sync; enable Uber Business |
| Ruma Films | 1 | $1000.00 | mixed | Chase vendor |
| Amazon | 11 | $792.89 | recurring small | Chase vendor |
| Mighty Networks | 6 | $769.61 | recurring small | Chase vendor |
| AGL | 1 | $573.27 | mixed | Chase vendor |
| Pure Pest | 1 | $440.00 | mixed | Chase vendor |
| Notion Labs | 3 | $404.54 | mixed | Gmail deep search |
| Thrifty | 1 | $396.41 | mixed | Chase vendor |
| ChatGPT | 6 | $376.31 | recurring small | Chase vendor |
| Claude.AI | 2 | $341.15 | SaaS, avg $170.57 | Gmail deep search |
| Bunnings Warehouse | 1 | $341.04 | mixed | Chase vendor |
| Cath Mansfield | 1 | $300.00 | mixed | Chase vendor |
| Orange Sky Laund | 1 | $288.00 | mixed | Chase vendor |
| Avis | 1 | $260.68 | mixed | Chase vendor |
| LinkedIn Singapore | 3 | $224.97 | mixed | Chase vendor |
| Budget Rent a Car | 1 | $220.44 | mixed | Chase vendor |
| Riley Hardwood | 1 | $220.00 | mixed | Chase vendor |

## By bank account

| Account | Missing txns | Missing value |
|---|---:|---:|
| NJ Marchesi T/as ACT Everyday | 13 | $24048.53 |
| NAB Visa ACT #8815 | 196 | $21642.51 |

## Patterns the next quarter should apply

- 15 DELETED/VOIDED txns were in the mirror — ensure status filter is applied in every downstream query
- Largest vendor gap: Samuel Hafer ($19500.00) — targeted chase
- Connector vendors with unreceipted bank txns: 4 vendors, $6253.83 — run sync-bill-attachments-to-txns.mjs next quarter earlier in the cycle
- 88 bank-fee txns were correctly excluded — classification rules working
- 32 owner-drawing txns excluded (BASEXCLUDED) — filter working correctly
- 3 txns had a matching bill but weren't auto-copied — run sync-bill-attachments-to-txns.mjs --apply to close the loop

## Appendix — full MISSING chase list

| Date | Vendor | Amount | Bank |
|---|---|---:|---|
| 2025-09-11 | Samuel Hafer | $19500.00 | NJ Marchesi T/as ACT Everyday |
| 2025-09-24 | DIY Blinds | $2935.85 | NAB Visa ACT #8815 |
| 2025-08-08 | Booking.com | $1632.33 | NAB Visa ACT #8815 |
| 2025-09-15 | Izzy Mobile | $1485.47 | NAB Visa ACT #8815 |
| 2025-09-16 | Ruma Films | $1000.00 | NJ Marchesi T/as ACT Everyday |
| 2025-09-29 | Chris Witta | $822.00 | NJ Marchesi T/as ACT Everyday |
| 2025-09-19 | Chris Witta | $666.00 | NJ Marchesi T/as ACT Everyday |
| 2025-09-15 | Chris Witta | $611.00 | NJ Marchesi T/as ACT Everyday |
| 2025-07-18 | Qantas | $577.98 | NAB Visa ACT #8815 |
| 2025-09-10 | AGL | $573.27 | NAB Visa ACT #8815 |
| 2025-08-20 | Flight Bar Witta | $502.92 | NAB Visa ACT #8815 |
| 2025-08-20 | Flight Bar Witta | $500.00 | NAB Visa ACT #8815 |
| 2025-07-21 | Webflow | $468.88 | NAB Visa ACT #8815 |
| 2025-08-14 | Qantas | $445.21 | NAB Visa ACT #8815 |
| 2025-08-14 | Qantas | $445.21 | NAB Visa ACT #8815 |
| 2025-07-25 | Pure Pest | $440.00 | NAB Visa ACT #8815 |
| 2025-08-27 | Thrifty | $396.41 | NAB Visa ACT #8815 |
| 2025-08-04 | Chris Witta | $360.00 | NJ Marchesi T/as ACT Everyday |
| 2025-07-29 | Bunnings Warehouse | $341.04 | NAB Visa ACT #8815 |
| 2025-08-18 | Chris Witta | $340.00 | NJ Marchesi T/as ACT Everyday |
| 2025-09-15 | Cath Mansfield | $300.00 | NJ Marchesi T/as ACT Everyday |
| 2025-09-03 | Orange Sky Laund | $288.00 | NAB Visa ACT #8815 |
| 2025-07-08 | Avis | $260.68 | NAB Visa ACT #8815 |
| 2025-08-21 | Flight Bar Witta | $258.19 | NAB Visa ACT #8815 |
| 2025-09-01 | Budget Rent a Car | $220.44 | NAB Visa ACT #8815 |
| 2025-07-09 | Riley Hardwood | $220.00 | NJ Marchesi T/as ACT Everyday |
| 2025-09-12 | Bob Brown Foundation | $209.50 | NAB Visa ACT #8815 |
| 2025-08-06 | Jaycar | $206.00 | NAB Visa ACT #8815 |
| 2025-08-25 | Alice Spring Hotel | $189.00 | NAB Visa ACT #8815 |
| 2025-08-14 | Mighty Networks | $182.68 | NAB Visa ACT #8815 |
| 2025-07-14 | Mighty Networks | $181.57 | NAB Visa ACT #8815 |
| 2025-09-15 | Mighty Networks | $179.54 | NAB Visa ACT #8815 |
| 2025-08-04 | Claude.AI | $171.42 | NAB Visa ACT #8815 |
| 2025-09-03 | Claude.AI | $169.73 | NAB Visa ACT #8815 |
| 2025-09-22 | Original Mattress | $168.00 | NAB Visa ACT #8815 |
| 2025-08-11 | Notion Labs | $142.09 | NAB Visa ACT #8815 |
| 2025-07-10 | Notion Labs | $141.98 | NAB Visa ACT #8815 |
| 2025-08-22 | Flight Bar Witta | $140.51 | NAB Visa ACT #8815 |
| 2025-07-28 | Aliyun | $140.09 | NAB Visa ACT #8815 |
| 2025-08-25 | Chris Witta | $140.00 | NJ Marchesi T/as ACT Everyday |
| 2025-07-04 | Flight Bar Witta | $134.62 | NAB Visa ACT #8815 |
| 2025-09-11 | Amazon | $127.99 | NAB Visa ACT #8815 |
| 2025-09-11 | Amazon | $127.99 | NAB Visa ACT #8815 |
| 2025-08-15 | Webflow | $125.60 | NAB Visa ACT #8815 |
| 2025-09-10 | Notion Labs | $120.47 | NAB Visa ACT #8815 |
| 2025-09-18 | Amazon | $119.99 | NAB Visa ACT #8815 |
| 2025-08-19 | Junction 9 | $119.15 | NAB Visa ACT #8815 |
| 2025-08-27 | Webflow | $117.35 | NAB Visa ACT #8815 |
| 2025-07-28 | Webflow | $115.88 | NAB Visa ACT #8815 |
| 2025-09-10 | Amazon | $114.95 | NAB Visa ACT #8815 |
| 2025-08-19 | Flight Bar Witta | $105.66 | NAB Visa ACT #8815 |
| 2025-09-04 | ASIC | $104.00 | NAB Visa ACT #8815 |
| 2025-07-02 | Flight Bar Witta | $102.67 | NAB Visa ACT #8815 |
| 2025-08-08 | The Leea Resort | $99.98 | NAB Visa ACT #8815 |
| 2025-09-03 | Qantas | $99.00 | NAB Visa ACT #8815 |
| 2025-08-27 | Qantas | $99.00 | NAB Visa ACT #8815 |
| 2025-09-17 | Umart | $93.93 | NAB Visa ACT #8815 |
| 2025-08-12 | ChatGPT | $92.32 | NAB Visa ACT #8815 |
| 2025-07-14 | ChatGPT | $91.55 | NAB Visa ACT #8815 |
| 2025-09-12 | ChatGPT | $91.05 | NAB Visa ACT #8815 |
| 2025-09-01 | NightOwl | $90.88 | NAB Visa ACT #8815 |
| 2025-08-08 | The Leea Resort | $89.32 | NAB Visa ACT #8815 |
| 2025-09-03 | BCC Resource | $86.42 | NAB Visa ACT #8815 |
| 2025-09-10 | Amazon | $83.50 | NAB Visa ACT #8815 |
| 2025-09-10 | Amazon | $83.50 | NAB Visa ACT #8815 |
| 2025-09-02 | Flight Bar Witta | $82.27 | NAB Visa ACT #8815 |
| 2025-09-22 | Supabase | $80.66 | NAB Visa ACT #8815 |
| 2025-09-03 | Qantas | $80.00 | NAB Visa ACT #8815 |
| 2025-08-18 | Sealink | $77.97 | NAB Visa ACT #8815 |
| 2025-09-24 | Webflow | $76.72 | NAB Visa ACT #8815 |
| 2025-07-07 | Cursor AI | $76.44 | NAB Visa ACT #8815 |
| 2025-08-25 | Mighty Networks | $76.42 | NAB Visa ACT #8815 |
| 2025-09-15 | Xero | $75.00 | NAB Visa ACT #8815 |
| 2025-07-14 | Xero | $75.00 | NAB Visa ACT #8815 |
| 2025-09-08 | LinkedIn Singapore | $74.99 | NAB Visa ACT #8815 |
| 2025-08-06 | LinkedIn Singapore | $74.99 | NAB Visa ACT #8815 |
| 2025-07-07 | LinkedIn Singapore | $74.99 | NAB Visa ACT #8815 |
| 2025-07-25 | Mighty Networks | $74.92 | NAB Visa ACT #8815 |
| 2025-09-25 | Mighty Networks | $74.48 | NAB Visa ACT #8815 |
| 2025-09-17 | Flight Bar Witta | $74.16 | NAB Visa ACT #8815 |
| 2025-09-03 | Qantas | $72.21 | NAB Visa ACT #8815 |
| 2025-09-24 | Stradbroke Flyer Gold Cats | $70.00 | NAB Visa ACT #8815 |
| 2025-09-16 | Webflow | $69.68 | NAB Visa ACT #8815 |
| 2025-09-15 | Uber | $64.61 | NAB Visa ACT #8815 |
| 2025-07-04 | Flight Bar Witta | $64.48 | NAB Visa ACT #8815 |
| 2025-09-08 | Uber | $64.33 | NAB Visa ACT #8815 |
| 2025-09-08 | Flight Bar Witta | $63.70 | NAB Visa ACT #8815 |
| 2025-07-04 | Cabcharge | $62.05 | NAB Visa ACT #8815 |
| 2025-07-08 | Cabcharge | $58.76 | NAB Visa ACT #8815 |
| 2025-09-19 | Bralinda | $58.64 | NAB Visa ACT #8815 |
| 2025-08-11 | Flight Bar Witta | $57.90 | NAB Visa ACT #8815 |
| 2025-09-01 | KWM | $54.93 | NAB Visa ACT #8815 |
| 2025-07-28 | Aliyun | $54.91 | NAB Visa ACT #8815 |
| 2025-07-04 | Cabcharge | $53.96 | NAB Visa ACT #8815 |
| 2025-07-14 | Uber | $53.61 | NAB Visa ACT #8815 |
| 2025-07-01 | Flight Bar Witta | $52.86 | NAB Visa ACT #8815 |
| 2025-09-15 | Demek | $51.46 | NJ Marchesi T/as ACT Everyday |
| 2025-09-25 | Uber | $51.38 | NAB Visa ACT #8815 |
| 2025-09-08 | Uber | $50.63 | NAB Visa ACT #8815 |
| 2025-08-19 | Flight Bar Witta | $49.95 | NAB Visa ACT #8815 |
| 2025-08-22 | Webflow | $49.75 | NAB Visa ACT #8815 |
| 2025-09-04 | Uber | $49.71 | NAB Visa ACT #8815 |
| 2025-08-18 | Webflow | $49.21 | NAB Visa ACT #8815 |
| 2025-07-09 | Webflow | $49.17 | NAB Visa ACT #8815 |
| 2025-07-22 | Webflow | $49.11 | NAB Visa ACT #8815 |
| 2025-08-11 | Webflow | $49.05 | NAB Visa ACT #8815 |
| 2025-09-09 | Webflow | $48.76 | NAB Visa ACT #8815 |
| 2025-09-22 | Webflow | $48.46 | NAB Visa ACT #8815 |
| 2025-09-15 | Uber | $48.37 | NAB Visa ACT #8815 |
| 2025-09-08 | Uber | $47.38 | NAB Visa ACT #8815 |
| 2025-09-22 | Uber | $46.29 | NAB Visa ACT #8815 |
| 2025-07-11 | Uber | $45.73 | NAB Visa ACT #8815 |
| 2025-08-25 | Webflow | $45.23 | NAB Visa ACT #8815 |
| 2025-08-13 | Codeguide | $44.62 | NAB Visa ACT #8815 |
| 2025-07-24 | Webflow | $44.34 | NAB Visa ACT #8815 |
| 2025-09-24 | Webflow | $44.08 | NAB Visa ACT #8815 |
| 2025-09-15 | Codeguide | $44.01 | NAB Visa ACT #8815 |
| 2025-09-16 | Qantas | $43.86 | NAB Visa ACT #8815 |
| 2025-07-02 | Flight Bar Witta | $42.69 | NAB Visa ACT #8815 |
| 2025-08-25 | Uber | $40.57 | NAB Visa ACT #8815 |
| 2025-07-10 | Uber | $40.40 | NAB Visa ACT #8815 |
| 2025-08-20 | Flight Bar Witta | $38.80 | NAB Visa ACT #8815 |
| 2025-09-29 | Amazon | $38.11 | NAB Visa ACT #8815 |
| 2025-09-29 | Qantas | $37.00 | NAB Visa ACT #8815 |
| 2025-09-29 | Qantas | $37.00 | NAB Visa ACT #8815 |
| 2025-08-18 | Uber | $36.87 | NAB Visa ACT #8815 |
| 2025-08-04 | Uber | $35.10 | NAB Visa ACT #8815 |
| 2025-09-04 | Belong | $35.00 | NAB Visa ACT #8815 |
| 2025-08-04 | Belong | $35.00 | NAB Visa ACT #8815 |
| 2025-07-04 | Belong | $35.00 | NAB Visa ACT #8815 |
| 2025-08-29 | ChatGPT | $33.85 | NAB Visa ACT #8815 |
| 2025-07-29 | ChatGPT | $33.79 | NAB Visa ACT #8815 |
| 2025-09-29 | ChatGPT | $33.75 | NAB Visa ACT #8815 |
| 2025-09-08 | Uber | $33.55 | NAB Visa ACT #8815 |
| 2025-08-21 | Flight Bar Witta | $32.29 | NAB Visa ACT #8815 |
| 2025-08-29 | OpenAI | $30.96 | NAB Visa ACT #8815 |
| 2025-08-19 | Cursor AI | $30.85 | NAB Visa ACT #8815 |
| 2025-08-11 | Cursor AI | $30.75 | NAB Visa ACT #8815 |
| 2025-09-19 | Cursor AI | $30.12 | NAB Visa ACT #8815 |
| 2025-09-29 | Microsoft | $29.99 | NAB Visa ACT #8815 |
| 2025-08-05 | Flight Bar Witta | $29.87 | NAB Visa ACT #8815 |
| 2025-08-07 | Uber | $29.64 | NAB Visa ACT #8815 |
| 2025-09-03 | Qantas | $29.41 | NAB Visa ACT #8815 |
| 2025-09-19 | Flight Bar Witta | $28.76 | NAB Visa ACT #8815 |
| 2025-09-15 | Uber | $28.74 | NAB Visa ACT #8815 |
| 2025-09-24 | Uber | $28.51 | NAB Visa ACT #8815 |
| 2025-09-08 | Uber | $28.38 | NAB Visa ACT #8815 |
| 2025-09-15 | Uber | $28.32 | NAB Visa ACT #8815 |
| 2025-09-15 | Uber | $28.26 | NAB Visa ACT #8815 |
| 2025-08-27 | Amazon | $27.99 | NAB Visa ACT #8815 |
| 2025-07-21 | Cursor AI | $27.89 | NAB Visa ACT #8815 |
| 2025-09-15 | Uber | $26.18 | NAB Visa ACT #8815 |
| 2025-07-02 | BP Complex Tennant Creek | $25.99 | NJ Marchesi T/as ACT Everyday |
| 2025-09-12 | Amazon | $25.89 | NAB Visa ACT #8815 |
| 2025-07-25 | Only Domains | $25.84 | NAB Visa ACT #8815 |
| 2025-07-07 | Uber | $25.00 | NAB Visa ACT #8815 |
| 2025-09-15 | Uber | $23.47 | NAB Visa ACT #8815 |
| 2025-09-15 | Uber | $23.24 | NAB Visa ACT #8815 |
| 2025-08-18 | Webflow | $22.06 | NAB Visa ACT #8815 |
| 2025-09-10 | Amazon | $21.98 | NAB Visa ACT #8815 |
| 2025-09-08 | Uber | $21.93 | NAB Visa ACT #8815 |
| 2025-08-27 | Only Domains | $21.44 | NAB Visa ACT #8815 |
| 2025-09-15 | Amazon | $21.00 | NAB Visa ACT #8815 |
| 2025-08-19 | Only Domains | $19.79 | NAB Visa ACT #8815 |
| 2025-07-28 | Uber | $19.37 | NAB Visa ACT #8815 |
| 2025-08-08 | Cloudflare | $18.77 | NAB Visa ACT #8815 |
| 2025-08-21 | Midjourney Inc | $17.06 | NAB Visa ACT #8815 |
| 2025-07-21 | Midjourney Inc | $16.99 | NAB Visa ACT #8815 |
| 2025-08-01 | OpenRouter | $16.81 | NAB Visa ACT #8815 |
| 2025-07-14 | Anthropic | $16.78 | NAB Visa ACT #8815 |
| 2025-09-15 | Uber | $16.74 | NAB Visa ACT #8815 |
| 2025-09-22 | Midjourney Inc | $16.71 | NAB Visa ACT #8815 |
| 2025-09-10 | Webflow | $16.66 | NAB Visa ACT #8815 |
| 2025-09-08 | Uber | $16.55 | NAB Visa ACT #8815 |
| 2025-08-15 | Sunset Snack | $16.00 | NAB Visa ACT #8815 |
| 2025-08-11 | Bunnings | $15.98 | NAB Visa ACT #8815 |
| 2025-09-16 | Uber | $15.80 | NAB Visa ACT #8815 |
| 2025-09-03 | Uber | $15.42 | NAB Visa ACT #8815 |
| 2025-07-21 | Uber | $14.72 | NAB Visa ACT #8815 |
| 2025-09-08 | Uber | $14.50 | NAB Visa ACT #8815 |
| 2025-07-18 | Squarespace Ireland | $14.00 | NAB Visa ACT #8815 |
| 2025-08-20 | Flight Bar Witta | $13.80 | NAB Visa ACT #8815 |
| 2025-07-08 | Vidzflow | $13.76 | NAB Visa ACT #8815 |
| 2025-08-22 | BCC On street Parking | $12.80 | NAB Visa ACT #8815 |
| 2025-07-24 | Zemek | $12.08 | NJ Marchesi T/as ACT Everyday |
| 2025-07-22 | Squarespace Ireland | $11.80 | NAB Visa ACT #8815 |
| 2025-08-22 | Squarespace | $11.80 | NAB Visa ACT #8815 |
| 2025-09-22 | Squarespace | $11.80 | NAB Visa ACT #8815 |
| 2025-09-25 | Uber | $11.45 | NAB Visa ACT #8815 |
| 2025-08-04 | Uber | $11.14 | NAB Visa ACT #8815 |
| 2025-08-20 | Flight Bar Witta | $10.50 | NAB Visa ACT #8815 |
| 2025-08-22 | Cabcharge | $10.40 | NAB Visa ACT #8815 |
| 2025-09-08 | Uber | $10.06 | NAB Visa ACT #8815 |
| 2025-07-07 | ASP Alice Springs | $9.99 | NAB Visa ACT #8815 |
| 2025-09-02 | DocPlay | $9.99 | NAB Visa ACT #8815 |
| 2025-08-01 | DocPlay | $9.99 | NAB Visa ACT #8815 |
| 2025-08-04 | Uber | $9.56 | NAB Visa ACT #8815 |
| 2025-08-21 | Flight Bar Witta | $9.50 | NAB Visa ACT #8815 |
| 2025-07-01 | Linktree | $8.43 | NAB Visa ACT #8815 |
| 2025-09-01 | Linktree | $8.29 | NAB Visa ACT #8815 |
| 2025-08-01 | Linktree | $8.25 | NAB Visa ACT #8815 |
| 2025-09-10 | Uber | $7.12 | NAB Visa ACT #8815 |
| 2025-07-18 | Goget | $6.83 | NAB Visa ACT #8815 |
| 2025-09-09 | Cursor AI | $6.36 | NAB Visa ACT #8815 |
| 2025-07-23 | Muzz Buzz | $6.20 | NAB Visa ACT #8815 |
| 2025-09-04 | Flight Bar Witta | $4.87 | NAB Visa ACT #8815 |
| 2025-07-29 | Uber | $3.00 | NAB Visa ACT #8815 |
| 2025-08-05 | OpenAI | $2.74 | NAB Visa ACT #8815 |
| 2025-08-01 | Provender Holdings | $2.70 | NAB Visa ACT #8815 |