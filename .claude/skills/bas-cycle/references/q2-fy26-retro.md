# Q2 FY26 — BAS Retrospective
**Generated:** 2026-04-09T01:20:12.039Z
**Quarter range:** 2025-10-01 → 2025-12-31

## Final coverage (6-path model)

| Path | Count | Value | % count | % value |
|---|---:|---:|---:|---:|
| DIRECT | 103 | $69941.34 | 30.3% | 60.9% |
| BILL_LINKED | 0 | $0.00 | 0.0% | 0.0% |
| NO_RECEIPT_NEEDED | 112 | $21692.74 | 32.9% | 18.9% |
| MISSING | 125 | $23159.70 | 36.8% | 20.2% |
| **TOTAL** | **340** | **$114793.78** | 100% | 100% |

**Covered (paths 1-3):** 215 / 340 = **63.2%** by count
**Covered value:** $91634.08 / $114793.78 = **79.8%** by value

## Zombie state
- DELETED/VOIDED txns in mirror: 258
- Value: $182841.16
- Status: ⚠ needs patching via sync-deleted-xero-state.mjs or status filter

## Top unreceipted vendors (real gap)

| Vendor | Txns | Value | Pattern | Next-time action |
|---|---:|---:|---|---|
| Qantas | 33 | $19016.35 | avg $576.25, connector bill exists | Xero UI Find & Match |
| Uber | 89 | $3443.86 | avg $38.70, frequent small | Bulk bill-to-txn sync; enable Uber Business |
| Chris Witta | 1 | $591.00 | mixed | Chase vendor |
| Telstra | 1 | $80.00 | one-off small, under GST threshold | Chase vendor |
| Amazon | 1 | $28.49 | one-off small, under GST threshold | Chase vendor |

## By bank account

| Account | Missing txns | Missing value |
|---|---:|---:|
| NAB Visa ACT #8815 | 124 | $22568.70 |
| NJ Marchesi T/as ACT Everyday | 1 | $591.00 |

## Patterns the next quarter should apply

- 258 DELETED/VOIDED txns were in the mirror — ensure status filter is applied in every downstream query
- Largest vendor gap: Qantas ($19016.35) — bulk reconciliation pattern needed
- Connector vendors with unreceipted bank txns: 2 vendors, $22460.21 — run sync-bill-attachments-to-txns.mjs next quarter earlier in the cycle
- 109 bank-fee txns were correctly excluded — classification rules working
- 3 owner-drawing txns excluded (BASEXCLUDED) — filter working correctly

## Appendix — full MISSING chase list

| Date | Vendor | Amount | Bank |
|---|---|---:|---|
| 2025-10-28 | Qantas | $1549.09 | NAB Visa ACT #8815 |
| 2025-10-28 | Qantas | $1549.09 | NAB Visa ACT #8815 |
| 2025-10-28 | Qantas | $1549.09 | NAB Visa ACT #8815 |
| 2025-10-28 | Qantas | $1418.45 | NAB Visa ACT #8815 |
| 2025-11-18 | Qantas | $1199.29 | NAB Visa ACT #8815 |
| 2025-11-20 | Qantas | $868.14 | NAB Visa ACT #8815 |
| 2025-11-20 | Qantas | $868.14 | NAB Visa ACT #8815 |
| 2025-11-20 | Qantas | $766.65 | NAB Visa ACT #8815 |
| 2025-11-20 | Qantas | $766.65 | NAB Visa ACT #8815 |
| 2025-11-20 | Qantas | $766.65 | NAB Visa ACT #8815 |
| 2025-10-30 | Qantas | $746.71 | NAB Visa ACT #8815 |
| 2025-10-30 | Qantas | $746.71 | NAB Visa ACT #8815 |
| 2025-10-02 | Qantas | $688.20 | NAB Visa ACT #8815 |
| 2025-10-28 | Qantas | $629.10 | NAB Visa ACT #8815 |
| 2025-10-28 | Qantas | $629.10 | NAB Visa ACT #8815 |
| 2025-10-20 | Chris Witta | $591.00 | NJ Marchesi T/as ACT Everyday |
| 2025-11-20 | Qantas | $508.18 | NAB Visa ACT #8815 |
| 2025-11-20 | Qantas | $508.18 | NAB Visa ACT #8815 |
| 2025-11-21 | Qantas | $443.30 | NAB Visa ACT #8815 |
| 2025-10-29 | Qantas | $438.97 | NAB Visa ACT #8815 |
| 2025-10-15 | Qantas | $289.27 | NAB Visa ACT #8815 |
| 2025-11-21 | Qantas | $281.70 | NAB Visa ACT #8815 |
| 2025-11-21 | Qantas | $281.70 | NAB Visa ACT #8815 |
| 2025-12-19 | Qantas | $259.16 | NAB Visa ACT #8815 |
| 2025-11-11 | Qantas | $249.00 | NAB Visa ACT #8815 |
| 2025-12-19 | Qantas | $242.23 | NAB Visa ACT #8815 |
| 2025-12-09 | Uber | $177.48 | NAB Visa ACT #8815 |
| 2025-12-18 | Qantas | $130.00 | NAB Visa ACT #8815 |
| 2025-10-15 | Qantas | $113.02 | NAB Visa ACT #8815 |
| 2025-10-15 | Qantas | $110.00 | NAB Visa ACT #8815 |
| 2025-10-15 | Qantas | $110.00 | NAB Visa ACT #8815 |
| 2025-10-29 | Qantas | $110.00 | NAB Visa ACT #8815 |
| 2025-10-15 | Qantas | $110.00 | NAB Visa ACT #8815 |
| 2025-11-03 | Uber | $99.76 | NAB Visa ACT #8815 |
| 2025-12-08 | Uber | $91.83 | NAB Visa ACT #8815 |
| 2025-11-12 | Uber | $90.45 | NAB Visa ACT #8815 |
| 2025-12-01 | Uber | $81.60 | NAB Visa ACT #8815 |
| 2025-12-18 | Telstra | $80.00 | NAB Visa ACT #8815 |
| 2025-10-21 | Uber | $78.48 | NAB Visa ACT #8815 |
| 2025-11-11 | Uber | $75.07 | NAB Visa ACT #8815 |
| 2025-12-10 | Uber | $74.48 | NAB Visa ACT #8815 |
| 2025-10-01 | Uber | $71.25 | NAB Visa ACT #8815 |
| 2025-10-14 | Uber | $69.33 | NAB Visa ACT #8815 |
| 2025-12-08 | Uber | $68.55 | NAB Visa ACT #8815 |
| 2025-12-08 | Uber | $67.50 | NAB Visa ACT #8815 |
| 2025-11-11 | Uber | $65.52 | NAB Visa ACT #8815 |
| 2025-11-17 | Uber | $65.17 | NAB Visa ACT #8815 |
| 2025-10-27 | Uber | $64.72 | NAB Visa ACT #8815 |
| 2025-10-21 | Uber | $64.37 | NAB Visa ACT #8815 |
| 2025-11-04 | Uber | $60.43 | NAB Visa ACT #8815 |
| 2025-12-09 | Uber | $58.63 | NAB Visa ACT #8815 |
| 2025-10-01 | Uber | $57.88 | NAB Visa ACT #8815 |
| 2025-11-17 | Uber | $57.04 | NAB Visa ACT #8815 |
| 2025-12-01 | Uber | $56.98 | NAB Visa ACT #8815 |
| 2025-12-19 | Qantas | $56.37 | NAB Visa ACT #8815 |
| 2025-10-01 | Uber | $51.24 | NAB Visa ACT #8815 |
| 2025-10-16 | Uber | $48.99 | NAB Visa ACT #8815 |
| 2025-12-01 | Uber | $47.51 | NAB Visa ACT #8815 |
| 2025-12-09 | Uber | $47.44 | NAB Visa ACT #8815 |
| 2025-12-10 | Uber | $46.22 | NAB Visa ACT #8815 |
| 2025-10-29 | Uber | $46.00 | NAB Visa ACT #8815 |
| 2025-12-01 | Uber | $45.07 | NAB Visa ACT #8815 |
| 2025-10-27 | Uber | $44.08 | NAB Visa ACT #8815 |
| 2025-10-27 | Uber | $42.79 | NAB Visa ACT #8815 |
| 2025-10-28 | Uber | $42.48 | NAB Visa ACT #8815 |
| 2025-10-03 | Uber | $42.29 | NAB Visa ACT #8815 |
| 2025-10-27 | Uber | $42.20 | NAB Visa ACT #8815 |
| 2025-12-09 | Uber | $39.37 | NAB Visa ACT #8815 |
| 2025-10-14 | Uber | $37.43 | NAB Visa ACT #8815 |
| 2025-10-30 | Uber | $36.99 | NAB Visa ACT #8815 |
| 2025-10-03 | Uber | $36.28 | NAB Visa ACT #8815 |
| 2025-10-07 | Uber | $35.99 | NAB Visa ACT #8815 |
| 2025-10-01 | Uber | $35.00 | NAB Visa ACT #8815 |
| 2025-10-15 | Qantas | $34.21 | NAB Visa ACT #8815 |
| 2025-10-16 | Uber | $32.95 | NAB Visa ACT #8815 |
| 2025-12-01 | Uber | $32.84 | NAB Visa ACT #8815 |
| 2025-12-09 | Uber | $32.07 | NAB Visa ACT #8815 |
| 2025-10-27 | Uber | $31.87 | NAB Visa ACT #8815 |
| 2025-10-20 | Uber | $31.56 | NAB Visa ACT #8815 |
| 2025-10-15 | Uber | $30.97 | NAB Visa ACT #8815 |
| 2025-10-13 | Uber | $30.73 | NAB Visa ACT #8815 |
| 2025-10-23 | Uber | $30.62 | NAB Visa ACT #8815 |
| 2025-10-31 | Uber | $29.38 | NAB Visa ACT #8815 |
| 2025-10-21 | Uber | $28.80 | NAB Visa ACT #8815 |
| 2025-10-08 | Amazon | $28.49 | NAB Visa ACT #8815 |
| 2025-10-20 | Uber | $28.17 | NAB Visa ACT #8815 |
| 2025-12-02 | Uber | $27.27 | NAB Visa ACT #8815 |
| 2025-12-09 | Uber | $26.62 | NAB Visa ACT #8815 |
| 2025-10-21 | Uber | $26.17 | NAB Visa ACT #8815 |
| 2025-12-02 | Uber | $26.08 | NAB Visa ACT #8815 |
| 2025-10-22 | Uber | $25.79 | NAB Visa ACT #8815 |
| 2025-10-07 | Uber | $25.00 | NAB Visa ACT #8815 |
| 2025-12-05 | Uber | $24.85 | NAB Visa ACT #8815 |
| 2025-12-01 | Uber | $24.54 | NAB Visa ACT #8815 |
| 2025-12-02 | Uber | $24.11 | NAB Visa ACT #8815 |
| 2025-10-21 | Uber | $24.00 | NAB Visa ACT #8815 |
| 2025-10-30 | Uber | $23.48 | NAB Visa ACT #8815 |
| 2025-10-22 | Uber | $22.99 | NAB Visa ACT #8815 |
| 2025-10-24 | Uber | $22.50 | NAB Visa ACT #8815 |
| 2025-10-01 | Uber | $22.40 | NAB Visa ACT #8815 |
| 2025-10-24 | Uber | $21.90 | NAB Visa ACT #8815 |
| 2025-10-02 | Uber | $21.64 | NAB Visa ACT #8815 |
| 2025-10-22 | Uber | $21.42 | NAB Visa ACT #8815 |
| 2025-10-22 | Uber | $21.10 | NAB Visa ACT #8815 |
| 2025-10-24 | Uber | $20.22 | NAB Visa ACT #8815 |
| 2025-10-20 | Uber | $19.81 | NAB Visa ACT #8815 |
| 2025-10-20 | Uber | $19.76 | NAB Visa ACT #8815 |
| 2025-10-23 | Uber | $19.73 | NAB Visa ACT #8815 |
| 2025-11-25 | Uber | $19.33 | NAB Visa ACT #8815 |
| 2025-10-31 | Uber | $18.67 | NAB Visa ACT #8815 |
| 2025-10-23 | Uber | $17.83 | NAB Visa ACT #8815 |
| 2025-12-10 | Uber | $17.77 | NAB Visa ACT #8815 |
| 2025-10-15 | Uber | $17.36 | NAB Visa ACT #8815 |
| 2025-10-27 | Uber | $16.12 | NAB Visa ACT #8815 |
| 2025-12-08 | Uber | $15.50 | NAB Visa ACT #8815 |
| 2025-10-27 | Uber | $14.95 | NAB Visa ACT #8815 |
| 2025-10-03 | Uber | $14.32 | NAB Visa ACT #8815 |
| 2025-12-08 | Uber | $12.69 | NAB Visa ACT #8815 |
| 2025-10-20 | Uber | $11.45 | NAB Visa ACT #8815 |
| 2025-11-10 | Uber | $9.99 | NAB Visa ACT #8815 |
| 2025-12-08 | Uber | $9.99 | NAB Visa ACT #8815 |
| 2025-10-13 | Uber | $9.94 | NAB Visa ACT #8815 |
| 2025-10-31 | Uber | $9.44 | NAB Visa ACT #8815 |
| 2025-12-01 | Uber | $8.28 | NAB Visa ACT #8815 |
| 2025-11-11 | Uber | $5.00 | NAB Visa ACT #8815 |