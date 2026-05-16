# Xero Draft Approval Queue - Q2 + Q3 FY26

Generated: 2026-05-15T06:04:51.290Z
Supabase: https://tednluwflfhxyucgwigh.supabase.co

## What This Queue Means

These are unreconciled spend bank lines where the ACT mirror has no Xero accounting target yet.
That usually means one of three things: a Xero Expenses/Xero Me draft exists but has not been approved, a spend-money transaction still needs to be created, or the Xero mirror has not been resynced after manual work.

## Summary

- Rows missing mirrored Xero target: 459
- Value: $257,139.18
- Local receipt already ready: 182 ($169,116.68)
- Candidate receipt to review: 107 ($12,757.42)
- Under threshold: 88 ($2,635.78)
- Missing receipt: 82 ($72,629.30)

## Fast Workflow

1. Open Xero Expenses drafts.
2. Search each priority 1/2 row by amount, date, or vendor.
3. Approve/create the Xero transaction with the project/R&D context shown in `queue.csv`.
4. Reconcile the matching NAB Visa bank-feed line in Xero.
5. Rerun `node scripts/sync-xero-to-supabase.mjs transactions` and refresh `/finance/workbench?status=xero_drafts`.

## Top Rows

| Priority | Quarter | Date | Amount | Vendor | Receipt state | Project | Xero next step |
|---:|---|---|---:|---|---|---|---|
| 1 | Q2 | 2025-11-24 | $27,201.35 | Hatch Electrical | local_receipt_ready | ACT-PI | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-11-12 | $20,244.64 | Hatch Electrical | local_receipt_ready | ACT-PI | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-24 | $19,800.00 | Telford Smith Engineering | local_receipt_ready | ACT-FM | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-09 | $5,904.05 | Container Options | local_receipt_ready | ACT-MY | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-02-02 | $4,715.00 | Centre Canvas And Upholstery | local_receipt_ready | ACT-GD | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-01-22 | $4,705.00 | Bionic Group | local_receipt_ready | ACT-HV | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-01 | $4,621.18 | Airbnb | local_receipt_ready | ACT-HV | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-01-07 | $4,575.65 | Carbatec Brisbane | local_receipt_ready | ACT-HV | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-01 | $3,745.00 | Kennards Hire | local_receipt_ready | ACT-MY | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-12 | $3,732.43 | Hatch Electrical | local_receipt_ready | ACT-PI | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-24 | $3,598.09 | Defy | local_receipt_ready | ACT-GD | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-22 | $3,260.63 | Defy | local_receipt_ready | ACT-GD | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-04 | $2,885.90 | Bunnings Warehouse | local_receipt_ready | ACT-HV | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-11-20 | $2,785.66 | Defy Manufacturing | local_receipt_ready | ACT-GD | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-03-09 | $2,413.17 | Diggermate Franchising | local_receipt_ready | ACT-HV | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-02-26 | $2,161.19 | ADGE Hotel OPI Surry Hills | local_receipt_ready | ACT-IN | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-01-15 | $2,034.00 | RW Pacific Traders | local_receipt_ready | ACT-HV | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-03-18 | $1,995.00 | MALENY LANDSCAPING SUPPLIES | local_receipt_ready | ACT-FM | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-10-14 | $1,820.69 | Hatch Electrical | local_receipt_ready | ACT-PI | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-01-13 | $1,811.70 | Carbatec Brisbane | local_receipt_ready | ACT-HV | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-01-21 | $1,738.03 | Sunshine Coast Council | local_receipt_ready | ACT-FM | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-11 | $1,614.88 | BUNNINGS WAREHOUSE | local_receipt_ready | ACT-MY | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-02-19 | $1,443.03 | Hatch Electrical | local_receipt_ready | ACT-PI | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-03-19 | $1,305.00 | Maleny Landscaping Supplies | local_receipt_ready | ACT-FM | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-08 | $1,268.37 | apple | local_receipt_ready | ACT-IN | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-10-21 | $1,243.59 | Loadshift Sydney | local_receipt_ready | ACT-MY | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-11 | $1,182.18 | Bunnings Warehouse | local_receipt_ready | ACT-MY | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-02-05 | $1,126.60 | THRIFTY AS CITY ALICE SPRINGS | local_receipt_ready | ACT-GD | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-11 | $1,068.00 | The Sand Yard | local_receipt_ready | ACT-MY | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-12 | $1,029.00 | The Sand Yard | local_receipt_ready | ACT-MY | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-03-23 | $931.41 | ePrint | local_receipt_ready | ACT-IN | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-03-09 | $895.00 | MALENY LANDSCAPING SUPPLIES | local_receipt_ready | ACT-FM | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-01-13 | $883.07 | Hydraulink Brisbane North | local_receipt_ready | ACT-FM | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-01-14 | $784.43 | Hatch Electrical | local_receipt_ready | ACT-PI | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-03-04 | $771.00 | Wholesale Canvas Australia | local_receipt_ready | ACT-IN | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-02-02 | $736.64 | Thrifty | local_receipt_ready | ACT-GD | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q2 | 2025-12-08 | $717.50 | Cactus Jacks Bar and Grill | local_receipt_ready | ACT-HV | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-03-30 | $687.02 | GREEN MOTION SLOVENIJA BRNIK - AEROD | local_receipt_ready | ACT-IN | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-03-20 | $652.50 | Maleny Landscaping Supplies | local_receipt_ready | ACT-FM | Approve matching Xero Expenses draft or create spend-money, then reconcile. |
| 1 | Q3 | 2026-03-16 | $635.03 | NRMA Insurance | local_receipt_ready | ACT-IN | Approve matching Xero Expenses draft or create spend-money, then reconcile. |

## Output Files

- thoughts/shared/reports/xero-draft-approval-queue-2026-05-15/queue.csv

## Verification Status

verified: Queried live Supabase v_finance_bank_line_evidence for unreconciled debit bank lines and Xero target IDs.
verified: This script performed no Supabase writes and no Xero writes.
inferred: Xero draft likelihood is inferred from unreconciled bank lines with no mirrored Xero accounting target.
unverified: Xero UI draft existence and final bank-feed reconciliation state were not checked by this script.
