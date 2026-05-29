# Goods (ACT-GD) — AP reconciliation + expense de-dup

**Date:** 2026-05-29 · **Source:** shared Xero mirror (Supabase `tednluwflfhxyucgwigh`, synced 02:33 today) · **Status:** verified by direct query. Feeds the Goods finance model (v0.2) and the QBE pack.

## Bottom line

- **No overdue-supplier problem and no director loan.** All ACT-GD bank spend came from ACT's two business accounts (NAB Visa ACT #8815 $177,633 + NJ Marchesi T/as ACT Everyday $145,473). **$0 from NM Personal.**
- The **$124,878 of AUTHORISED bills** is a **Xero payment-matching gap** — bills paid from ACT accounts but never *applied* to the bill, so they sit AUTHORISED while the cash sits as a separate bank SPEND. This creates a double-count, not a liability.
- **Revenue:** $732,210.79 billed / **$649,710.79 received** / **$82,500 genuinely outstanding** (Rotary — confirmed no matching receipt exists).

## Expense de-dup (the model number)

ACT-GD bank SPEND = **$323,105.62** (172 txns). Classified vs bills (amount ±$1, date ±45d):

| Bucket | Txns | Amount |
|---|---:|---:|
| Matches a PAID bill | 39 | $53,249.48 |
| Matches an AUTHORISED bill (double-count) | 14 | $65,442.56 |
| No bill — genuine bill-less spend | 119 | $204,413.58 |

**Clean accrual expense:**
```
PAID bills $296,251 + AUTHORISED $124,878            = $421,129
  − Carla duplicate (void)                            −  11,180
  [1300 Washer $13,980 KEPT in Goods — confirmed 2026-05-29]
  [Defy INV-1507 $16,500 KEPT — legit Goods production, confirmed]
  = real bills                                          $409,949
+ bill-less bank spend                                 +204,414
= ACT-GD expense ≈ $614,363
```
**Cash cross-check:** bank SPEND $323,106 + PAID-bill payments not in SPEND ($296,251 − $53,249) = **$566,108**.
→ Lock the model at **≈ $614K** P&L expense (cash-out basis ≈ $566K for the cashflow statement).

> **DATA CONFLICT — 1300 Washer $13,980 (Xero `c3d5dd2a-98e9-4261-81aa-18e57ec86109`).** Ben confirms it's washing machines for the **Goods** project. But the Xero line still tracks it to **"ACT-FM — The Farm"** (description "1300 Washer — Operations — ACT-FM") and codes it to **account 429** (catch-all). The Supabase mirror already has it as ACT-GD. **Fix in Xero:** retag the line ACT-FM → ACT-GD and recode 429 → the right Goods account, so Xero stops attributing $13,980 to The Farm. (Bookkeeper Xero write — authorisation required.)

> Supersedes the Day-3 "$86,499 bank-only" figure — bill-less spend is materially larger (~$204K, 119 txns: field travel, fuel, materials, meals).

## Bookkeeper actions (Xero writes — require authorisation)

**Void:**
- Carla Furnishers $11,180 (2025-11-16) — Xero `42960d4f-49e3-4f9a-a378-af8fde24704c` (no-attachment duplicate; keep `6a60f4fd-c99d-4bb2-9ad2-51f372958cbc`).

**Retag in Xero → ACT-GD + recode 429 (confirmed Goods):**
- 1300 Washer $13,980 (2025-12-15) — Xero `c3d5dd2a-98e9-4261-81aa-18e57ec86109` (paid NAB Visa ACT 2025-12-16). Washing machines for the Goods project (Ben confirmed). Xero currently tracks it "ACT-FM — The Farm" / account 429 — retag the line to ACT-GD and recode off 429 so Xero matches the mirror and The Farm stops carrying it.

**Keep (confirmed legit):**
- Defy Manufacturing INV-1507 $16,500 (2025-11-19) — Xero `8bd2dd9a-a8c4-4624-a301-f2ef5b00ef81`. Ongoing Goods bed + washing-machine production cost (NOT the discontinued Weave Bed) — confirmed 2026-05-29. Match to its ACT-account payment.

**Match to existing ACT-account payment (do NOT re-pay):** the remaining ~35 AUTHORISED bills below.

### All 38 AUTHORISED ACT-GD bills (status = AUTHORISED, amount_paid = $0 in Xero)

| Contact | Date | Total | Xero InvoiceID | Note |
|---|---|---:|---|---|
| 1300 Washer | 2025-12-15 | 13,980.00 | c3d5dd2a-98e9-4261-81aa-18e57ec86109 | **Goods (keep); retag in Xero ACT-FM→ACT-GD + recode 429** |
| Cafe Mia | 2025-10-21 | 23.30 | a84b74a0-9af7-4728-91dd-322f447aaa01 | match |
| Carbatec Brisbane | 2026-01-05 | 2,338.70 | 310fa568-bf02-4fdf-b6d4-c7e41f0ff4a4 | match (tooling) |
| Carbatec QLD Warehouse | 2026-01-11 | 1,319.00 | 6bf82502-d122-45ab-8f1c-843415d36441 | match (tooling) |
| Carla Furnishers | 2025-11-16 | 11,180.00 | 42960d4f-49e3-4f9a-a378-af8fde24704c | **VOID (dup, no attach)** |
| Carla Furnishers | 2025-11-16 | 11,180.00 | 6a60f4fd-c99d-4bb2-9ad2-51f372958cbc | match |
| Clearview Accessories | 2026-01-22 | 768.83 | 7a06d5d6-67af-42e2-b729-8ed5e83397a6 | match |
| Defy | 2026-03-19 | 199.43 | 30742f52-1556-40cd-9721-991dead8df78 | match |
| Defy | 2026-03-27 | 18,922.75 | bfe8052d-e67a-47a8-903b-02e6586f9ef1 | match |
| Defy | 2026-03-27 | 8,525.00 | 5d3bbbea-4fe4-444a-a16e-eb2dc137aa4b | match |
| Defy Manufacturing | 2025-11-17 | 2,733.72 | 7f55164d-7077-4788-952b-b4a61d53b6ba | match (INV-1503) |
| Defy Manufacturing | 2025-11-19 | 16,500.00 | 8bd2dd9a-a8c4-4624-a301-f2ef5b00ef81 | KEEP (legit Goods bed+washer production) |
| Defy Manufacturing | 2025-11-27 | 1,858.78 | baa3ed75-9886-484b-af47-6a89f66efa83 | match |
| Defy Manufacturing | 2025-12-18 | 3,199.83 | 2cfca6af-4bf9-4bad-a3be-703b8961ec7e | match |
| Defy Manufacturing | 2026-01-11 | 876.81 | 71952972-7c3b-485d-a079-5b64b8cdef56 | match |
| Defy Manufacturing | 2026-02-17 | 4,812.50 | a34f34fb-f8be-4dde-9286-5cce6995a327 | match (INV-1637) |
| Defy Manufacturing | 2026-02-27 | 1,349.19 | 652d3079-b92a-4921-a4e9-57320742b94a | match (INV-1657) |
| Devils Marbles Hotel | 2025-06-25 | 138.80 | d4e99b7b-9420-4159-8579-09b282701f9f | match (travel) |
| Devils Marbles Hotel | 2025-07-02 | 63.75 | 3176b138-0fee-4c10-9c9c-e9446d95c455 | match (travel) |
| Devils Marbles Hotel | 2025-08-20 | 138.91 | 317ace0c-ff30-41e1-b83b-19b2c3cb1fba | match (travel) |
| ePrint | 2026-03-12 | 811.20 | 0be890c7-aeee-4428-90fa-1553f386ffae | match |
| Fast Fuel Motors | 2025-08-20 | 111.90 | 127d1358-3b89-49c3-a560-ae3385edfdc1 | match (fuel) |
| Grand Hotel Townsville | 2025-08-06 | 760.24 | 5c1d0e6b-5c87-4f76-899e-36f0b46e2277 | match (travel) |
| Grand Hotel Townsville | 2026-02-16 | 158.84 | f348b6b3-1bdf-4621-90fd-dcfc107419d3 | match (travel) |
| Haul Global | 2025-09-09 | 1,241.69 | bdb51be9-ca76-4810-98f1-6b33c68be266 | match (freight) |
| Joseph Kirmos | 2025-12-03 | 2,737.50 | 378157ff-3ebc-4fcf-9c79-094a498fc83f | match (labour) |
| Joseph Kirmos | 2026-02-16 | 4,500.00 | af1435ea-0b97-4887-bfb2-10f4acebf3a6 | match (INV-004, labour) |
| Memories Bistro | 2025-06-29 | 52.00 | 7ba18893-c4d1-40fb-bc51-d2b3e5c6a26d | match (meal) |
| Memories Bistro | 2025-06-30 | 101.00 | a136299a-263f-4e4c-a0ba-b398449e1e8d | match (meal) |
| Memories Bistro | 2025-08-19 | 254.00 | d6d21f84-6179-4ca2-8a85-53227e759f35 | match (meal) |
| Metal Manufactures Pty Ltd | 2025-10-06 | 182.23 | 84f6b3eb-a036-462b-a258-fd925f07eb0f | match (materials) |
| Ollie In The Alley | 2025-09-03 | 4.80 | c66812a6-4119-41ca-975b-70eb3809d3fa | match (meal) |
| Palm Island Barge | 2025-08-08 | 1,033.78 | 72bee726-6f0e-4563-bbca-d8bb8f12f838 | match (freight) |
| Palm Island Motel | 2025-08-20 | 400.00 | 270eb2ba-ec33-4167-a19e-ab7618cfd5e7 | match (travel) |
| Palm Island Motel | 2025-09-02 | 514.00 | 503b4d00-d757-4fec-a858-f66fb8c07d0e | match (travel) |
| Peak Up Transport | 2025-07-16 | 6,861.50 | 0c4dad3e-f2ea-4338-a131-3355ae3afad1 | match (freight, 12475) |
| Peak Up Transport | 2025-07-25 | 4,863.82 | c71af0f1-4566-4628-a35a-5eef0ec7d677 | match (freight, 12519) |
| Platypus Alice Springs | 2025-03-10 | 179.98 | 1be0d117-e619-41d6-b2b7-a1d304682e93 | **review — flagged "personal?"** |

## Corrected model inputs (v0.2)

- Revenue: **$649,711 received + $82,500 real AR** (Rotary). Exclude voided $639K / deleted $87K.
- Expense: **≈ $614K** P&L (de-duped; Defy INV-1507 + 1300 Washer both kept in Goods). Cash-out basis ≈ $566K.
- AP genuinely owed: **≈ $0** (matching gap, not debt). **Drop the working-capital-squeeze and director-loan framings.**
- Capex ~$110K · R&D ~$80K/yr · GST ~$29.7K net — as previously modelled (not re-verified here).
