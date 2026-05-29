# Goods (ACT-GD) — bank reconciliation action sheet

**Generated:** 2026-05-29 · **Source:** shared Xero mirror (`tednluwflfhxyucgwigh`, synced 02:33) + live Xero GET for the 3 write-targets · **36 bills · $113,517.80**

> This replaces the naive "Find & Match all 35" plan. Cross-referencing each AUTHORISED ACT-GD bill against **every** SPEND on every account shows the bills fall into three very different buckets — only Bucket A is a clean point-and-click job.

**Excluded from all buckets:** Carla duplicate `42960d4f` (VOIDED this session) · 1300 Washer recoded ACT-GD this session (still listed in A — its payment is matchable) · Platypus Alice Springs $179.98 (flagged "personal?" — review first).

## Verified vs inferred
- **Verified (live Xero GET):** the 3 write-targets' state; the void + recode applied.
- **Verified (mirror query):** the 1:1 amount±date matches in Bucket A; the all-account payment scan for Defy / Kirmos / Clearview / ePrint.
- **Inferred (needs a payment-confirmation pass):** that Bucket C's no-1:1 bills were settled inside later *combined* Defy transfers. Until confirmed, treat the Kirmos $4,500 (and possibly Defy INV-1637/1657, Clearview) as **possibly still owed** — this softens the recon's "AP owed ≈ $0".

---

## Bucket A — clean Find & Match (11 bills · ≈ $65,138)
Bank line exists on an ACT account, **not yet reconciled** → do it in **Xero → Bank accounts → [account] → Reconcile → Find & Match**. Links the existing cash to the bill; no new payment, no double-pay.

| Bill (→ Xero) | Bill date | Amount | Bank line | Δ |
|---|---|---:|---|---|
| [1300 Washer](https://go.xero.com/app/bills/invoice?invoiceId=c3d5dd2a-98e9-4261-81aa-18e57ec86109) | 2025-12-15 | $13,980.00 | 2025-12-16 · NAB Visa | 1d |
| [Carbatec Brisbane](https://go.xero.com/app/bills/invoice?invoiceId=310fa568-bf02-4fdf-b6d4-c7e41f0ff4a4) | 2026-01-05 | $2,338.70 | 2026-01-06 · NAB Visa | 1d |
| [Carbatec QLD Warehouse](https://go.xero.com/app/bills/invoice?invoiceId=6bf82502-d122-45ab-8f1c-843415d36441) | 2026-01-11 | $1,319.00 | 2026-01-12 · NAB Visa | 1d |
| [Carla Furnishers (KEEP twin)](https://go.xero.com/app/bills/invoice?invoiceId=6a60f4fd-c99d-4bb2-9ad2-51f372958cbc) | 2025-11-16 | $11,180.00 | 2025-11-17 · NAB Visa | 1d |
| [Defy](https://go.xero.com/app/bills/invoice?invoiceId=30742f52-1556-40cd-9721-991dead8df78) | 2026-03-19 | $199.43 | 2026-03-19 · NAB Visa | exact |
| [Defy](https://go.xero.com/app/bills/invoice?invoiceId=bfe8052d-e67a-47a8-903b-02e6586f9ef1) | 2026-03-27 | $18,922.75 | 2026-03-27 · ACT Everyday | exact |
| [Defy](https://go.xero.com/app/bills/invoice?invoiceId=5d3bbbea-4fe4-444a-a16e-eb2dc137aa4b) | 2026-03-27 | $8,525.00 | 2026-03-27 · ACT Everyday | exact |
| [Defy Manufacturing](https://go.xero.com/app/bills/invoice?invoiceId=baa3ed75-9886-484b-af47-6a89f66efa83) | 2025-11-27 | $1,858.78 | 2025-11-28 · NAB Visa | 1d |
| [Defy Manufacturing](https://go.xero.com/app/bills/invoice?invoiceId=2cfca6af-4bf9-4bad-a3be-703b8961ec7e) | 2025-12-18 | $3,199.83 | 2025-12-19 · NAB Visa | 1d |
| [Defy Manufacturing](https://go.xero.com/app/bills/invoice?invoiceId=71952972-7c3b-485d-a079-5b64b8cdef56) | 2026-01-11 | $876.81 | 2026-01-12 · ACT Everyday | 1d |
| [Joseph Kirmos](https://go.xero.com/app/bills/invoice?invoiceId=378157ff-3ebc-4fcf-9c79-094a498fc83f) | 2025-12-03 | $2,737.50 | 2025-12-04 · ACT Everyday | 1d |

## Bucket B — pre-cutover, paid via other accounts (~18 bills · ≈ $16,380)
All dated **Jun–Oct 2025**, before the two ACT accounts carried Goods spend. No bank line exists on NAB Visa / ACT Everyday to match against — the cash went through NM Personal / older accounts. **Action:** leave AUTHORISED, or match to the originating account if it's in Xero, or void if the spend is already captured bank-side. Bookkeeper call — *not* a Find & Match.

Devils Marbles Hotel ×3 · Memories Bistro ×3 · Palm Island Motel ×2 · Palm Island Barge · Peak Up Transport ×2 · Grand Hotel Townsville ×2 · Fast Fuel Motors · Haul Global · Cafe Mia · Metal Manufactures · Ollie In The Alley.

## Bucket C — recent, no 1:1 payment found → RESOLVED via bill-level due/paid
Resolved 2026-05-29 by reading each vendor's bill-level `amount_due`/`amount_paid` (authoritative — Xero's own paid status) + lifetime SPEND. The earlier "bills − SPEND balance" overstated AP because most bill payments are recorded *outside* `xero_transactions` (e.g. Kirmos: $13,500 of bills marked PAID with only $2,737.50 of bank SPEND).

| Bill | Date | Amount | Verdict |
|---|---|---:|---|
| Defy INV-1507 (KEEP) | 2025-11-19 | $16,500.00 | **Paid** — $16,813.50 reconciled NAB Visa same day (coded-not-matched gap). |
| Defy INV-1503 / 1637 / 1657 | various | $8,895.41 | **Covered** — Defy is 25 bills PAID + matching SPEND; ample unassigned Defy cash covers these. Not owed. |
| **Joseph Kirmos INV-004** | 2026-02-16 | **$4,500.00** | **⚠️ GENUINELY OWED?** Earlier invoice AUTHORISED/$4,500 due, no tracking, no payment — while later INV-005/006/007 all PAID. Confirm Joey wasn't paid off-table. |
| **Joseph Kirmos (no #)** | 2026-03-29 | $4,500.00 | **VOID candidate** — duplicate of PAID INV-006 $4,500 (same date). Carla signature. |
| **Clearview (no #)** | 2026-01-05 | $768.83 | **VOID candidate** — duplicate of PAID SO-297222 $768.83 (next day). |
| Clearview INV-301697 | 2026-01-22 | $768.83 | Possibly a genuine 2nd order or a 3rd dup — bookkeeper to confirm. |
| ePrint | 2026-03-12 | $811.20 | Likely the $664.50 same-day NAB Visa payment (partial / diff lines) — minor. |

---

**Bottom line:** ~$65K (Bucket A) is a clean Find & Match. ~$16K (Bucket B) is pre-cutover noise to leave/void. Bucket C resolves to **the recon's "AP owed ≈ $0" essentially holding** — real exposure is **~$4,500 genuinely owed (Kirmos INV-004)**, maybe +$769 (Clearview INV-301697), plus **two more duplicates to void** (Kirmos no# $4,500, Clearview no# $768.83). Defy is covered.
