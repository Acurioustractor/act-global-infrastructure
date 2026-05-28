# 04 — Bank Reconciliation: Proposed Matches

**Date:** 2026-05-29 · **For:** Standard Ledger · **Org:** "Nicholas Marchesi" sole-trader (NJ Marchesi T/as ACT), Xero `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`
**Period:** 2025-10-01 → 2026-03-31 (FY26 Q2 + Q3)
**Scope:** the unreconciled `xero_transactions` (`is_reconciled=false`, `status='AUTHORISED'`) on the two ACT bank accounts only — `NAB Visa ACT #8815` and `NJ Marchesi T/as ACT Everyday`. Excludes `NM Personal` and `NJ Marchesi T/as ACT Maximiser`.
**Status:** Nothing written to Xero. Proposed matches for SL review/execution. All figures queried live from Supabase `tednluwflfhxyucgwigh` (read-only).

> **Companion docs:** prep pack §B → `thoughts/shared/reviews/2026-05-29-standard-ledger-recon-recode-prep-pack.md`; GE recode worklist → `scripts/output/ge-recode-worklist.csv`.

---

## Summary — the unreconciled $894,887 in four buckets

| Bucket | Lines | Amount | Nature / action |
|---|---:|---:|---|
| **1. Internal transfers** (mechanical) | 57 | **$483,517.38** | Pair Everyday transfer ↔ already-reconciled card leg. Pure plumbing, nets to zero. |
| **2a. SPEND → PAID bill** | 113 | **$145,581.26** | Bill already marked PAID. The unreconciled bank spend IS that payment → reconcile against the bill. Low risk. |
| **2b. SPEND → AUTHORISED bill** ⚠️ | 66 | **$164,281.38** | Bill still shows as **owing** AND there's a matching bank spend. **Double-count / double-pay risk** — reconcile spend→bill (closes the payable) OR it's a genuine duplicate. SL eyes needed. |
| **3. SPEND, no bill** | 182 | **$101,507.45** | Real card/bank spend with no matching ACCPAY bill. **All 182 already carry a receipt attachment** → categorisation only, no receipt-hunt. |
| **Total** | **418** | **$894,887.47** | Reconciles to prep-pack §B (~$895K). |

**Matching rule used:** an unreconciled SPEND is "matched to a bill" if an ACCPAY bill exists with the **same contact (case-insensitive)**, the **exact same total**, and a bill date **within ±14 days** of the spend date. 179 of 361 real-spend lines matched ($309,862.64); 182 did not.

---

## 1. Internal transfers — 57 pairs, $483,517.38 (mechanical, nets to zero)

Every unreconciled Everyday transfer leg has an **exact-amount, same-date** counterpart on the NAB Visa card that is **already reconciled** (`day_gap = 0` on all 57). Reconcile each Everyday leg as a Transfer to/from the card. No P&L impact.

### 1a. Everyday → Card pay-downs — 46 pairs, $471,478.93
`Everyday SPEND-TRANSFER` (unreconciled) ↔ `NAB Visa RECEIVE-TRANSFER` (already reconciled).

| Date | Amount | | Date | Amount |
|---|---:|---|---|---:|
| 2025-10-06 | 9,883.63 | | 2025-12-01 | 30,000.00 |
| 2025-10-13 | 1,709.35 | | 2025-12-23 | 15,000.00 |
| 2025-10-13 | 6,000.00 | | 2025-12-29 | 10,000.00 |
| 2025-10-14 | 5,000.00 | | 2025-12-30 | 10,000.00 |
| 2025-10-20 | 5,409.00 | | 2026-01-05 | 10,000.00 |
| 2025-10-21 | 10,000.00 | | 2026-01-06 | 10,000.00 |
| 2025-10-21 | 15,060.00 | | 2026-01-12 | 10,000.00 |
| 2025-10-27 | 10,000.00 | | 2026-01-21 | 20,000.00 |
| 2025-11-03 | 6,015.00 | | 2026-02-02 | 1,111.21 |
| 2025-11-04 | 9,800.00 | | 2026-02-02 | 7,000.00 |
| 2025-11-11 | 1,497.50 | | 2026-02-09 | 15,000.00 |
| 2025-11-11 | 23,875.00 | | 2026-02-18 | 10,000.00 |
| 2025-11-17 | 15,000.00 | | 2026-02-19 | 7,923.16 |
| 2025-11-19 | 5,000.00 | | 2026-02-23 | 12,500.00 |
| 2025-11-19 | 6,000.00 | | 2026-03-02 | 12,000.00 |
| 2025-11-19 | 6,295.93 | | 2026-03-02 | 20,000.00 |
| 2025-11-19 | 10,000.00 | | 2026-03-05 | 7,000.00 |
| 2025-11-21 | 6,159.00 | | 2026-03-09 | 1,000.00 |
| 2025-11-24 | 30,000.00 | | 2026-03-09 | 9,000.00 |
| 2025-11-26 | 1,974.50 | | 2026-03-13 | 2,302.19 |
| 2025-11-26 | 5,163.46 | | 2026-03-16 | 6,000.00 |
| 2025-11-27 | 20,000.00 | | 2026-03-17 | 10,800.00 |
| | | | 2026-03-25 | 10,000.00 |
| | | | 2026-03-31 | 15,000.00 |

*(46 lines; left + right columns are one continuous list. Sum = $471,478.93.)*

### 1b. Card → Everyday transfers in — 11 pairs, $12,038.45
`Everyday RECEIVE-TRANSFER` (unreconciled) ↔ `NAB Visa SPEND-TRANSFER` (already reconciled).

| Date | Amount |
|---|---:|
| 2025-10-23 | 623.70 |
| 2025-10-24 | 2,000.00 |
| 2025-10-24 | 3,500.00 |
| 2025-10-27 | 1,100.00 |
| 2025-10-30 | 360.00 |
| 2025-11-04 | 152.59 |
| 2025-11-04 | 202.16 |
| 2026-01-23 | 3,000.00 |
| 2026-03-09 | 100.00 |
| 2026-03-09 | 200.00 |
| 2026-03-18 | 800.00 |

**Transfer total: $483,517.38** (471,478.93 + 12,038.45). All 57 pairs are 1:1, exact-amount, same-date.

---

## 2. Real SPEND matched to an ACCPAY bill — 179 lines, $309,862.64

### 2a. Matched to a PAID bill — 113 lines, $145,581.26 (low risk)
The bill is already PAID; the unreconciled bank spend is the cash that paid it. **Action:** reconcile each bank spend by matching it to the existing PAID bill (or, if the bill's payment was recorded against a different bank line, this spend is the duplicate side — verify there's only one payment). No new categorisation needed; the account code comes from the bill. Largest examples (all PAID-bill matches, gap −1 to 0 days):

| Spend date | Contact | Amount | Account | Project |
|---|---|---:|---|---|
| 2025-12-23 | Telford Smith Engineering | 19,800.00 | Everyday | ACT-GD |
| 2025-12-23 | Telford Smith Engineering | 19,800.00 | Everyday | ACT-GD |
| 2025-12-29 | Bionic Self Storage | 12,375.00 | NAB Visa | ACT-GD |
| 2026-03-31 | Defy | 8,686.98 | NAB Visa | ACT-GD |
| 2025-11-26 | RNM Carpentry | 6,865.65 | NAB Visa | ACT-OO |
| 2025-01-30 | Centre Canvas & Upholstery | 4,715.00 | NAB Visa | ACT-GD |
| 2025-11-27 | Airbnb | 4,621.18 | NAB Visa | ACT-PI |
| 2026-01-06 | Carbatec Brisbane | 4,575.65 | NAB Visa | ACT-GD |
| 2026-01-05 | Total Tools East Brisbane | 4,546.55 | Everyday | ACT-HV |
| 2026-01-06 | RW Pacific Traders | 4,200.00 | NAB Visa | ACT-GD |

> ⚠️ **The two Telford Smith $19,800 spends are the confirmed double-pay** (prep-pack §C1): two PAID bills dated 2025-12-22 **and** two bank spends dated 2025-12-23, all $19,800. That is one $19,800 job recorded and paid twice = $39,600 each side. **Do not simply reconcile both** — verify against the actual invoice; if a duplicate, void the phantom bill and recover/credit one payment.

### 2b. Matched to an AUTHORISED (still-owing) bill — 66 lines, $164,281.38 ⚠️ DOUBLE-COUNT RISK
For each of these the **bill still shows as owing** in payables, yet a matching bank spend already left the account. Two possibilities per line: (i) the spend pays the bill → reconcile spend→bill, which closes the payable (correct, removes the phantom liability); or (ii) the spend AND the bill are two records of the same transaction → genuine duplicate, remove one side. **SL judgement needed.** Items ≥ $1,500:

| Spend date | Contact | Amount | Account | Project | Bill date |
|---|---|---:|---|---|---|
| 2025-11-11 | RNM Carpentry | 26,845.65 | NAB Visa | ACT-OO | 2025-11-11 |
| 2025-11-11 | Hatch Electrical | 19,947.13 | Everyday | ACT-PI | 2025-11-10 |
| 2025-10-09 | Oonchiumpa Consultancy & Services | 19,305.00 | Everyday | ACT-GD | 2025-10-09 |
| 2025-12-16 | 1300 Washer | 13,980.00 | NAB Visa | ACT-GD | 2025-12-15 |
| 2025-11-17 | Carla Furnishers | 11,180.00 | NAB Visa | ACT-GD | 2025-11-16 |
| 2025-10-19 | Sunshine Glamping Co | 9,250.00 | NAB Visa | ACT-DL | 2025-10-18 |
| 2025-12-08 | Kennards Hire | 6,616.00 | NAB Visa | ACT-MY | 2025-12-07 |
| 2025-12-05 | Container Options | 5,802.50 | NAB Visa | ACT-MY | 2025-12-04 |
| 2025-12-27 | AAMI | 5,483.95 | NAB Visa | ACT-GD | 2025-12-26 |
| 2025-11-27 | Airbnb | 4,621.18 | NAB Visa | ACT-PI | 2025-11-26 |
| 2025-12-11 | Hatch Electrical | 3,677.34 | NAB Visa | ACT-PI | 2025-12-10 |
| 2025-12-19 | Defy Manufacturing | 3,199.83 | NAB Visa | ACT-GD | 2025-12-18 |
| 2025-12-04 | Joseph Kirmos | 2,737.50 | Everyday | ACT-GD | 2025-12-03 |
| 2026-01-07 | Smartwood | 2,665.03 | Everyday | ACT-GD | 2026-01-06 |
| 2026-01-06 | Carbatec Brisbane | 2,338.70 | NAB Visa | ACT-GD | 2026-01-05 |
| 2025-11-26 | Airbnb | 2,324.80 | NAB Visa | ACT-PI | 2025-11-25 |
| 2025-12-09 | The Sand Yard | 1,968.00 | NAB Visa | ACT-MY | 2025-12-08 |
| 2025-11-26 | Allclass | 1,948.90 | Everyday | ACT-FM | 2025-11-25 |
| 2025-11-26 | Allclass | 1,948.90 | NAB Visa | ACT-FM | 2025-11-25 |
| 2025-11-28 | Defy Manufacturing | 1,858.78 | NAB Visa | ACT-GD | 2025-11-27 |
| 2025-11-26 | Allclass | 1,587.45 | NAB Visa | ACT-FM | 2025-11-25 |
| 2025-11-26 | Allclass | 1,587.45 | Everyday | ACT-FM | 2025-11-25 |

> ⚠️ **Allclass** shows as **two pairs** of same-amount spends on two different accounts on the same day (1,948.90 ×2 and 1,587.45 ×2, one each on NAB Visa and Everyday). Likely a genuine duplicate where one job was paid from both accounts, or the same line imported twice. Verify against the Allclass statement.
>
> The remaining ~44 sub-$1,500 lines in this bucket are smaller (SaaS / minor materials) — apply the same reconcile-vs-duplicate test, lower materiality.

---

## 3. Real SPEND with no matching bill — 182 lines, $101,507.45 (categorise; receipts already attached)

No ACCPAY bill exists for these (same contact + exact amount + ±14 days). **Key finding: all 182 lines already carry a receipt attachment in Xero** — so this bucket needs **categorisation only, not a receipt hunt.** Top contacts (≥ $800):

| Contact | Lines | Amount | Likely treatment |
|---|---:|---:|---|
| Defy Manufacturing | 4 | 33,147.18 | 446 Materials & Supplies (Goods, R&D) |
| Qantas | 27 | 22,474.28 | 493 Travel-National |
| Elders Insurance | 1 | 8,361.21 | 433 Insurance |
| Nicholas Marchesi | 1 | 3,875.00 | Founder — confirm (related-party, see §D of prep pack) |
| Imprint5 | 1 | 3,715.73 | 461 Printing / 412 Consulting — verify |
| Longara | 1 | 3,155.00 | 446 Materials (crates) — confirm use |
| Avis | 4 | 2,715.41 | 493 Travel-National (car hire) |
| Stratco | 1 | 2,240.82 | 446 Materials & Supplies |
| Thrifty | 3 | 2,130.82 | 493 Travel-National (car hire) |
| RW Pacific Traders | 1 | 2,000.00 | 446 Materials & Supplies (Goods) |
| Qantas Group Accommodation | 6 | 1,698.88 | 493 Travel-National |
| Northern Territory Government | 1 | 1,459.25 | REVIEW |
| Uber | 34 | 1,413.93 | 452 Parking/Tolls/Taxis |
| Fisher's Oysters | 1 | 1,120.00 | 423 Catering — confirm |
| Department of Transport & Main Roads | 1 | 1,058.20 | REVIEW (rego/tolls) |
| TJ's Imaging Centre | 1 | 931.41 | REVIEW |

The remaining ~50 lines are sub-$800 (mostly Uber/Qantas micro-charges and small SaaS), low materiality, receipts attached.

---

## Reconciliation worklist — suggested order for SL

1. **Bucket 1 — transfers (57 pairs, $483,517).** Reconcile each Everyday leg as a Transfer against its already-reconciled card counterpart. Pure plumbing, do first to clear the noise.
2. **Bucket 2b — AUTHORISED-bill matches (66, $164,281).** Highest-risk. For each, decide reconcile-vs-duplicate. Start with Telford Smith (§C1), RNM Carpentry $26,845, Hatch $19,947, Oonchiumpa $19,305, and the two Allclass pairs.
3. **Bucket 2a — PAID-bill matches (113, $145,581).** Apply each bank spend to its PAID bill; confirm no bill has two payments recorded.
4. **Bucket 3 — no-bill spend (182, $101,507).** Categorise (receipts already attached). Defy / Qantas / insurance / travel dominate; map to the chart, flag Defy & RW Pacific as R&D.

---

## Open questions only Ben / SL can answer

- **Telford Smith $19,800 ×2 (§2a):** genuine duplicate (void + recover one) or two real stages of a $39,600 job? Need the actual invoice.
- **Allclass duplicate pairs (§2b):** why two same-amount spends per item across both accounts on the same day — double-pay or double-import?
- **The 66 AUTHORISED-bill matches:** for each, is the bank spend the payment of that bill (→ reconcile, close payable) or a separate duplicate record (→ remove one)? Wrong call either double-counts the expense or leaves a phantom payable.
- **Nicholas Marchesi $3,875 no-bill spend:** founder draw / reimbursement / R&D? (related-party — ties to the §D Director's Loan restructure).
- **ACT-OO / ACT-PI / ACT-DL project codes** appear on several matched lines but aren't in the standard code list given — confirm these map to real projects (OO/PI/DL) before the recode locks them in.

---

*Reproduce: queries run read-only against Supabase `tednluwflfhxyucgwigh`, tables `xero_transactions` + `xero_invoices`, period 2025-10-01..2026-03-31, ACT accounts only. Match rule = same contact (lower/trim) + exact total + bill date within ±14 days. Nothing was written to Xero, GHL, Notion, or the DB.*
