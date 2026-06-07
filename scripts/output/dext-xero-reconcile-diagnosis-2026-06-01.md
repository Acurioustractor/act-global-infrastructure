# Dext → Xero reconciliation diagnosis — NAB Visa #8815 (Oct–Dec 2025)
**Source:** `nicholas-marchesi-2026-06-01.csv` (501 card receipts) vs live Xero (`tednluwflfhxyucgwigh`). **2026-06-01.**

## TL;DR — your receipts ARE in Xero. Dext worked.
Of 501 Dext card receipts: **498 are in Xero** (231+ as **bills/ACCPAY**, 267 as spend-money txns). Only **3** are truly missing. The problem isn't a Dext publish failure — it's that the card **bank lines were never matched to the bills**, and clicking "Create" instead of "Match" created **duplicates**.

## What actually happened
1. Dext published each receipt to Xero — **mostly as a BILL (ACCPAY)** with the coding + receipt image attached.
2. The card bank statement lines were **never reconciled against those bills**. Xero's reconcile panel defaults to **"Create"** — every time that was clicked instead of **Find & Match → the bill**, a *second* copy of the purchase was created.
3. Result: bills sitting unmatched + duplicate spend-lines = double-counting.

## Bill states (Oct–Dec ACCPAY)
| Status | Count | Value | Meaning |
|---|---|---|---|
| PAID | 398 | $180,848 | done (reconciled) |
| AUTHORISED | 111 | $431,028 | approved, **awaiting match to a bank line** |
| DRAFT | 71 | $9,270 | **not approved yet** — approve before matching |
| VOIDED/DELETED | 44 | — | excluded |

## 🔴 The 12 double-books ($47,363) — same amount+date as BOTH a bill AND a card txn
Keep the **bill** (has receipt + coding); remove the duplicate card spend-line.
| Date | $ | Vendor | Bill status | Card txn |
|---|---|---|---|---|
| 2025-11-11 | 26,845.65 | RNM Carpentry | AUTHORISED | unreconciled — **biggest** |
| 2025-11-26 | 6,865.65 | RNM Carpentry | PAID | unreconciled |
| 2025-11-27 | 4,621.18 | Airbnb | PAID | unreconciled |
| 2025-11-11 | 2,475.91 | Home To Holiday / Airbnb | AUTHORISED | unreconciled |
| 2025-10-09 | 2,240.82 | Stratco | DRAFT | unreconciled |
| 2025-11-08 | 1,494.92 | Bunnings | AUTHORISED | unreconciled |
| 2025-11-08 | 1,468.28 | Bunnings | PAID | unreconciled |
| 2025-10-27 | 1,100.00 | Trybe Collective | PAID | reconciled (verify) |
| 2025-10-01 | 74.00 | Qantas | AUTHORISED | unreconciled |
| 2025-10-21 | 64.37 | Supabase / Uber | PAID | reconciled (coincidental?) |
| 2025-10-28 | 56.00 | Dialpad | AUTHORISED | unreconciled |
| (12th) | — | — | — | — |

## ❌ The 3 truly missing from Xero (capture fresh)
- 2025-12-21 · Booking.com · $89
- 2025-10-23 · Railway Corporation · $5
- 2025-10-03 · Warp · $18

## The fix is in XERO (backlog), Dext config (prevention)
**Backlog — Xero:** (1) approve the 71 DRAFT bills; (2) reconcile each card line via **Find & Match → the existing bill**, never Create; (3) delete the duplicate card spend-line on the 12 double-books.
**Prevention — Dext:** check the publish setting (publishing as *bills* is what forces the manual match) + kill any bank rule that auto-creates a second spend-line.
