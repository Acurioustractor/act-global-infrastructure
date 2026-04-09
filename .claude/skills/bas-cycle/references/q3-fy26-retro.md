# Q3 FY26 — BAS Retrospective
**Generated:** 2026-04-09T01:20:12.444Z
**Quarter range:** 2026-01-01 → 2026-03-31

## Final coverage (6-path model)

| Path | Count | Value | % count | % value |
|---|---:|---:|---:|---:|
| DIRECT | 159 | $42526.64 | 41.2% | 21.7% |
| BILL_LINKED | 0 | $0.00 | 0.0% | 0.0% |
| NO_RECEIPT_NEEDED | 150 | $139367.28 | 38.9% | 71.1% |
| MISSING | 77 | $14014.50 | 19.9% | 7.2% |
| **TOTAL** | **386** | **$195908.42** | 100% | 100% |

**Covered (paths 1-3):** 309 / 386 = **80.1%** by count
**Covered value:** $181893.92 / $195908.42 = **92.8%** by value

## Zombie state
- DELETED/VOIDED txns in mirror: 5
- Value: $240.00
- Status: ⚠ needs patching via sync-deleted-xero-state.mjs or status filter

## Top unreceipted vendors (real gap)

| Vendor | Txns | Value | Pattern | Next-time action |
|---|---:|---:|---|---|
| Qantas | 7 | $10237.60 | avg $1462.51, connector bill exists | Xero UI Find & Match |
| Uber | 37 | $1252.31 | avg $33.85, frequent small | Bulk bill-to-txn sync; enable Uber Business |
| Claude.AI | 2 | $573.52 | SaaS, avg $286.76 | Gmail deep search |
| Bunnings | 1 | $571.10 | mixed | Chase vendor |
| HighLevel | 3 | $317.87 | mixed | Chase vendor |
| Hinterland Aviation | 1 | $187.68 | mixed | Chase vendor |
| Webflow | 3 | $150.18 | SaaS, avg $50.06 | Gmail deep search |
| LinkedIn Singapore | 2 | $149.98 | mixed | Chase vendor |
| Squarespace | 4 | $115.40 | mixed | Chase vendor |
| Flight Bar Witta | 1 | $88.95 | mixed | Chase vendor |
| Xero | 1 | $75.00 | one-off small, under GST threshold | Chase vendor |
| Mighty Networks | 1 | $71.72 | one-off small, under GST threshold | Chase vendor |
| Anthropic | 4 | $56.84 | SaaS, avg $14.21 | Gmail deep search |
| OpenAI | 2 | $44.11 | SaaS, avg $22.05 | Gmail deep search |
| Figma | 1 | $31.58 | one-off small, under GST threshold | Chase vendor |
| Budget | 1 | $22.79 | one-off small, under GST threshold | Chase vendor |
| DocPlay | 2 | $19.98 | mixed | Chase vendor |
| Only Domains | 1 | $19.79 | one-off small, under GST threshold | Chase vendor |
| Linktree | 1 | $15.78 | one-off small, under GST threshold | Chase vendor |
| Railway Corporation | 1 | $7.32 | one-off small, under GST threshold | Write-off accept |
| Smarte Carte | 1 | $5.00 | one-off small, under GST threshold | Write-off accept |

## By bank account

| Account | Missing txns | Missing value |
|---|---:|---:|
| NAB Visa ACT #8815 | 77 | $14014.50 |

## Patterns the next quarter should apply

- 5 DELETED/VOIDED txns were in the mirror — ensure status filter is applied in every downstream query
- Largest vendor gap: Qantas ($10237.60) — targeted chase
- Connector vendors with unreceipted bank txns: 3 vendors, $11640.09 — run sync-bill-attachments-to-txns.mjs next quarter earlier in the cycle
- 128 bank-fee txns were correctly excluded — classification rules working
- 4 owner-drawing txns excluded (BASEXCLUDED) — filter working correctly

## Appendix — full MISSING chase list

| Date | Vendor | Amount | Bank |
|---|---|---:|---|
| 2026-03-03 | Qantas | $2001.71 | NAB Visa ACT #8815 |
| 2026-03-03 | Qantas | $2001.71 | NAB Visa ACT #8815 |
| 2026-03-03 | Qantas | $2001.71 | NAB Visa ACT #8815 |
| 2026-03-03 | Qantas | $2001.71 | NAB Visa ACT #8815 |
| 2026-03-04 | Qantas | $1366.51 | NAB Visa ACT #8815 |
| 2026-02-26 | Bunnings | $571.10 | NAB Visa ACT #8815 |
| 2026-03-04 | Qantas | $432.52 | NAB Visa ACT #8815 |
| 2026-01-27 | Qantas | $431.73 | NAB Visa ACT #8815 |
| 2026-02-06 | Claude.AI | $287.07 | NAB Visa ACT #8815 |
| 2026-03-06 | Claude.AI | $286.45 | NAB Visa ACT #8815 |
| 2026-02-17 | Hinterland Aviation | $187.68 | NAB Visa ACT #8815 |
| 2026-01-27 | HighLevel | $143.68 | NAB Visa ACT #8815 |
| 2026-02-24 | HighLevel | $138.31 | NAB Visa ACT #8815 |
| 2026-01-08 | Uber | $128.73 | NAB Visa ACT #8815 |
| 2026-02-05 | Flight Bar Witta | $88.95 | NAB Visa ACT #8815 |
| 2026-02-13 | Xero | $75.00 | NAB Visa ACT #8815 |
| 2026-03-06 | LinkedIn Singapore | $74.99 | NAB Visa ACT #8815 |
| 2026-02-06 | LinkedIn Singapore | $74.99 | NAB Visa ACT #8815 |
| 2026-01-30 | Squarespace | $72.90 | NAB Visa ACT #8815 |
| 2026-01-27 | Mighty Networks | $71.72 | NAB Visa ACT #8815 |
| 2026-03-24 | Uber | $70.06 | NAB Visa ACT #8815 |
| 2026-03-16 | Webflow | $66.22 | NAB Visa ACT #8815 |
| 2026-03-18 | Uber | $62.68 | NAB Visa ACT #8815 |
| 2026-03-18 | Uber | $57.77 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $55.38 | NAB Visa ACT #8815 |
| 2026-03-31 | Uber | $54.46 | NAB Visa ACT #8815 |
| 2026-03-27 | Uber | $51.05 | NAB Visa ACT #8815 |
| 2026-03-25 | Uber | $49.96 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $49.65 | NAB Visa ACT #8815 |
| 2026-03-23 | Webflow | $45.55 | NAB Visa ACT #8815 |
| 2026-03-17 | Uber | $44.56 | NAB Visa ACT #8815 |
| 2026-02-09 | Uber | $42.96 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $41.55 | NAB Visa ACT #8815 |
| 2026-03-18 | Uber | $41.36 | NAB Visa ACT #8815 |
| 2026-01-07 | Uber | $38.58 | NAB Visa ACT #8815 |
| 2026-03-27 | Webflow | $38.41 | NAB Visa ACT #8815 |
| 2026-03-31 | Uber | $37.40 | NAB Visa ACT #8815 |
| 2026-02-06 | HighLevel | $35.88 | NAB Visa ACT #8815 |
| 2026-03-16 | Uber | $34.53 | NAB Visa ACT #8815 |
| 2026-02-09 | Uber | $34.25 | NAB Visa ACT #8815 |
| 2026-02-09 | Uber | $34.20 | NAB Visa ACT #8815 |
| 2026-03-02 | Uber | $32.43 | NAB Visa ACT #8815 |
| 2026-02-06 | Figma | $31.58 | NAB Visa ACT #8815 |
| 2026-02-09 | Uber | $30.81 | NAB Visa ACT #8815 |
| 2026-03-06 | OpenAI | $30.00 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $29.91 | NAB Visa ACT #8815 |
| 2026-03-19 | Budget | $22.79 | NAB Visa ACT #8815 |
| 2026-02-23 | Uber | $22.62 | NAB Visa ACT #8815 |
| 2026-02-23 | Only Domains | $19.79 | NAB Visa ACT #8815 |
| 2026-03-02 | Uber | $18.98 | NAB Visa ACT #8815 |
| 2026-02-16 | Squarespace | $18.90 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $18.31 | NAB Visa ACT #8815 |
| 2026-03-27 | Uber | $17.84 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $17.57 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $16.53 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $16.05 | NAB Visa ACT #8815 |
| 2026-02-02 | Anthropic | $15.85 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $15.79 | NAB Visa ACT #8815 |
| 2026-02-02 | Linktree | $15.78 | NAB Visa ACT #8815 |
| 2026-03-09 | Anthropic | $15.77 | NAB Visa ACT #8815 |
| 2026-02-16 | Anthropic | $15.76 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $14.79 | NAB Visa ACT #8815 |
| 2026-03-02 | OpenAI | $14.11 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $13.44 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $12.39 | NAB Visa ACT #8815 |
| 2026-02-23 | Squarespace | $11.80 | NAB Visa ACT #8815 |
| 2026-03-23 | Squarespace | $11.80 | NAB Visa ACT #8815 |
| 2026-01-08 | Uber | $9.99 | NAB Visa ACT #8815 |
| 2026-03-03 | DocPlay | $9.99 | NAB Visa ACT #8815 |
| 2026-02-09 | Uber | $9.99 | NAB Visa ACT #8815 |
| 2026-02-03 | DocPlay | $9.99 | NAB Visa ACT #8815 |
| 2026-03-10 | Anthropic | $9.46 | NAB Visa ACT #8815 |
| 2026-03-27 | Uber | $9.17 | NAB Visa ACT #8815 |
| 2026-03-26 | Uber | $9.00 | NAB Visa ACT #8815 |
| 2026-03-30 | Uber | $7.57 | NAB Visa ACT #8815 |
| 2026-01-27 | Railway Corporation | $7.32 | NAB Visa ACT #8815 |
| 2026-03-24 | Smarte Carte | $5.00 | NAB Visa ACT #8815 |