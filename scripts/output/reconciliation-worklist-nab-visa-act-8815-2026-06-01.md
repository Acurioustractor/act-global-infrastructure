# Reconciliation worklist — NAB Visa ACT #8815
**Generated:** 2026-06-01 02:47 · **FY:** 2025-07-01 → 2026-06-30
**Source:** `xero_transactions` mirror (last Xero sync 2026-06-01 02:00) — confirm live in Xero before acting.

> Work top-down. Re-run `node scripts/reconciliation-worklist.mjs "NAB Visa ACT #8815"` to refresh — cleared items drop off.

## Summary
| Lane | Count | Amount | Where |
|---|---|---|---|
| 🔁 Reconcile as transfer | 0 | $0.00 | Xero UI — match other-account leg |
| 🧾 Reconcile (receipt attached) | 400 | $306,250.28 | Xero UI — just match the feed line |
| 📎 Reconcile (NO receipt) | 0 | $0.00 | Xero UI — attach receipt if a real purchase |
| 💵 Income still unreconciled | 0 | $0.00 | Xero UI — match the deposit |
| 🧮 Coding review → Standard Ledger | 3 | $5,575.00 | SL — drawings vs expense vs R&D |
| ⚠️ Possible duplicates → Standard Ledger | 31 | $35,081.72 | SL — confirm before reconciling |
| ✅ Already reconciled (clean) | 1402 | $1,012,784.53 | — |

---

## 🔁 Reconcile as transfer (0 · $0.00)
Internal movements between ACT's own accounts. In Xero, reconcile via **Transfer** (match the opposite leg). No receipt needed.
_none_

## 🧾 Reconcile — receipt already attached (400 · $306,250.28)
Real vendor bills with the receipt already on the Xero transaction. Just **match the bank-feed line** — no receipt hunt.
_400 lines — reconcile chronologically in Xero. By month:_

| Month | Count | Amount |
|---|---|---|
| 2025-10 | 59 | $24,110.38 |
| 2025-11 | 74 | $99,474.15 |
| 2025-12 | 71 | $74,822.09 |
| 2026-01 | 42 | $30,256.67 |
| 2026-02 | 22 | $17,615.70 |
| 2026-03 | 64 | $32,865.23 |
| 2026-04 | 42 | $16,175.83 |
| 2026-05 | 26 | $10,930.23 |

**Eyeball these (untagged · possible duplicate · ≥ $2,000): 37**
- [ ] 2025-10-09 · **$2,240.82** · Stratco · ACT-GD
- [ ] 2025-10-19 · **$9,250.00** · Sunshine Glamping Co · ACT-DL
- [ ] 2025-10-26 · **$4,647.27** · Qantas · ACT-OO
- [ ] 2025-11-11 · **$3,875.00** · Nicholas Marchesi · ACT-FM
- [ ] 2025-11-11 · **$26,845.65** · RNM CARPENTRY · ACT-OO
- [ ] 2025-11-11 · **$2,475.91** · Airbnb · ACT-PI
- [ ] 2025-11-13 · **$5,500.00** · Defy Manufacturing · ACT-GD
- [ ] 2025-11-15 · **$2,398.58** · Qantas · ACT-IN
- [ ] 2025-11-17 · **$11,180.00** · Carla Furnishers · ACT-GD
- [ ] 2025-11-26 · **$6,865.65** · RNM CARPENTRY · ACT-OO
- [ ] 2025-11-26 · **$2,324.80** · Airbnb · ACT-PI
- [ ] 2025-11-26 · **$3,536.35** · Allclass · ACT-FM
- [ ] 2025-11-27 · **$4,621.18** · Airbnb · ACT-PI
- [ ] 2025-11-28 · **$3,745.00** · Kennards Hire · ACT-PI
- [ ] 2025-12-05 · **$5,802.50** · Container Options · ACT-MY
- [ ] 2025-12-08 · **$6,616.00** · Kennards Hire · ACT-MY
- [ ] 2025-12-11 · **$3,677.34** · Hatch Electrical · ACT-PI
- [ ] 2025-12-16 · **$13,980.00** · 1300 Washer · ACT-GD
- [ ] 2025-12-19 · **$3,199.83** · Defy Manufacturing · ACT-GD
- [ ] 2025-12-19 · **$3,260.63** · Defy · ACT-GD
- [ ] 2025-12-23 · **$3,598.09** · Defy · ACT-GD
- [ ] 2025-12-27 · **$5,483.95** · AAMI · ACT-GD
- [ ] 2025-12-29 · **$12,375.00** · Bionic Self Storage · ACT-GD
- [ ] 2026-01-06 · **$2,338.70** · Carbatec Brisbane · ACT-GD
- [ ] 2026-01-06 · **$4,575.65** · Carbatec Brisbane · ACT-GD
- [ ] 2026-01-06 · **$4,200.00** · RW Pacific Traders · ACT-GD
- [ ] 2026-01-07 · **$2,710.34** · Smartwood · ACT-GD
- [ ] 2026-01-14 · **$2,000.00** · RW Pacific Traders · ACT-GD
- [ ] 2026-01-30 · **$4,715.00** · Centre Canvas And Upholstery · ACT-GD
- [ ] 2026-02-09 · **$8,361.21** · Elders Insurance · ACT-FM
- [ ] 2026-02-23 · **$3,155.00** · Longara · ACT-HV
- [ ] 2026-03-13 · **$3,832.02** · Qantas · ACT-IN
- [ ] 2026-03-20 · **$3,715.73** · Imprint5 · ACT-SM
- [ ] 2026-03-31 · **$8,686.98** · Defy · ACT-GD
- [ ] 2026-04-15 · **$5,130.95** · Defy Manufacturing · ACT-GD
- [ ] 2026-04-24 · **$8,594.91** · Kennedy's · ACT-HV
- [ ] 2026-05-11 · **$2,228.78** · Qantas · ACT-IN

## 📎 Reconcile — NO receipt on file (0 · $0.00)
_none — every unreconciled purchase already has a receipt_

## 💵 Income still unreconciled (0 · $0.00)
_none — all deposit income is reconciled_

## 🧮 Coding review → Standard Ledger (3 · $5,575.00)
Payments to the founder from this account. Confirm **drawings vs expense vs wages** — drawings should sit in equity, **excluded from project spend and from R&D**. Several are tagged ACT-CORE + R&D today.
- [ ] 2025-07-24 · **$500.00** · Nicholas Marchesi · ACT-CORE
- [ ] 2025-11-07 · **$1,200.00** · Nicholas Marchesi · ACT-OO · (also unreconciled)
- [ ] 2025-11-11 · **$3,875.00** · Nicholas Marchesi · ACT-FM · (also unreconciled)

## ⚠️ Possible duplicates → Standard Ledger (31 · $35,081.72)
Same date + amount + payee, ≥ $500.00, more than once. On a card these are usually legit (group travel / recurring) — confirm only the lumpy ones aren't a double-pay before reconciling.
- [ ] 2025-07-18 · **$577.98** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-07-18 · **$577.98** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-07-18 · **$577.98** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-09-04 · **$840.09** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-09-04 · **$840.09** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-10-28 · **$629.10** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-10-28 · **$629.10** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-10-28 · **$1,549.09** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-10-28 · **$1,418.45** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-10-28 · **$1,549.09** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-10-28 · **$1,549.09** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-10-28 · **$1,418.45** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-10-30 · **$746.71** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-10-30 · **$746.71** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-11-18 · **$1,199.29** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-11-18 · **$1,199.29** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-11-20 · **$508.18** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-11-20 · **$766.65** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-11-20 · **$868.14** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-11-20 · **$766.65** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-11-20 · **$508.18** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-11-20 · **$868.14** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2025-11-20 · **$766.65** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2026-03-03 · **$2,001.71** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2026-03-03 · **$2,001.71** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2026-03-03 · **$2,001.71** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2026-03-03 · **$2,001.71** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2026-03-17 · **$1,916.01** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2026-03-17 · **$1,916.01** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2026-05-13 · **$1,070.89** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
- [ ] 2026-05-13 · **$1,070.89** · Qantas · ACT-IN · ⚠️ POSSIBLE DUPLICATE
