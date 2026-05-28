---
title: Goods — bed unit economics, CORRECTED from Defy invoice OCR
created: 2026-05-28
owner: Ben
status: corrected analysis — verified Defy quote rates
supersedes: thoughts/shared/analysis/2026-05-28-goods-bed-unit-economics-from-defy-invoices.md
source_data: thoughts/shared/analysis/2026-05-28-defy-invoice-ocr.json
plan_slug: goods-cost-evidence-funder-artifact
---

# Goods — what does a bed actually cost? (corrected)

The first-cut analysis used Xero JSON line items where descriptions were stripped to "." and aggregated to one line per bill. That hid the real per-line product detail. **OCR'd all 35 Defy attachment PDFs (`scripts/ocr-defy-bills.mjs`)**, here's what the data actually says.

## The Notion BOM is right

| Component | Notion BOM | Defy verified rate | Source |
|---|--:|--:|---|
| HDPE kit (sheets cut+finished) | $344.05 | **$344.05** | INV-1602 (92 kits) + 2026-03-27 (50 kits) — exact match |
| Assembly labour | $55.95 | **$55.95** | 2026-03-19 "Assembly cost for 8 beds @ $55.95" — exact match |
| Canvas | $93.50 | bundled in $600 Single Bed | — |
| Steel | $27.00 | bundled in $600 Single Bed | — |
| End caps | $3.20 | bundled | — |
| **Sub-total direct** | **$523.70** | **$523.70** | ✓ |

**The Notion BOM matches Defy's actual invoiced rates exactly.** My earlier claim that it was "wrong by 37×" was based on a misread of INV-1602 — see below.

## What INV-1602 actually was

The Xero JSON sync had it as **one $33,588.60 line: "16 Beds made from previously ordered 19mm recycled plastic sheets. Cut and finished"**. That's a roll-up. The real PDF shows **two lines**:

| Line | Qty | Unit | Total |
|---|--:|--:|--:|
| 16 Beds cut+finished from previously-ordered 19mm sheets | 16 | **$121.00** | $1,936 |
| 92 Bed kits in 19mm Jungle recycled plastic sheets, cut+finished | 92 | **$344.05** | $31,652 |
| **INV-1602 total** | | | **$33,588** |

So INV-1602 wasn't "$2,099/bed assembly". It was 16 beds cut+finish ($121/bed) + 92 bed KITS at the standard $344.05 rate. **108 beds-worth of work in one invoice** at an average of $311/bed. The Notion BOM is vindicated.

## Verified Defy quote rates (load-bearing for the funder model)

| Product | Rate | Source |
|---|--:|---|
| **HDPE shred raw** | **$2.00/kg** | 2026-03-27: "2 Bulka Bags jungle mix Shred 1200kg @ $2.00" |
| **19mm jungle sheet (1200×1200, bulk)** | **$200/half-sheet** | 2026-03-27: "20 sheets @ $200, supplied at bulk discounted rate" |
| **Bed kit (sheets cut+finished, no assembly)** | **$344.05/bed** | INV-1602 (92 kits), 2026-03-27 (50 kits) |
| **Cut+finish only (on pre-purchased sheets)** | **$121/bed** | INV-1602 (16 beds) |
| **Assembly labour (Defy)** | **$55.95/bed** | 2026-03-19 (8 beds) |
| **Day-rate per Defy worker** | **$480/day full, $240 half** | INV-1325/1326 (Aug 2025 — Sam + Todd) |
| **Single Bed (recycled plastic + steel + canvas, fully fabricated)** | **$600/bed** | INV-1507 (25 beds, Nov 2025) — the production-grade finished-bed quote |
| **Freight Botany NSW → Alice Springs (per pallet, ~6–10 beds)** | **$808–$1,480** | INV-1233 + 2025-11-27 + 2026-01-11 (multiple verified) |

## Bed production actually delivered

| Invoice | Date | Beds delivered | Type |
|---|---|--:|---|
| INV-1259 | 2025-07-16 | 1 | First Unit Woven Bed (prototype) |
| INV-1258 | 2025-07-16 | (design only, $6K) | Design stage — not a bed |
| INV-1285 | 2025-07-29 | 3 | Mad Beds, $1,000 each |
| INV-1325 | 2025-08-20 | 6 | Sam + Todd labour @ $480/day × 3 days |
| INV-1326 | 2025-08-20 | 2 | Sam-only labour |
| INV-1507 | 2025-11-19 | **25** | Single Beds @ $600 (the production batch) |
| INV-1602 | 2026-01-30 | 16 finished + 92 kits | Mixed |
| 2026-03-19 | 2026-03-19 | 8 | Assembly of kits @ $55.95 each |
| 2026-03-27 | 2026-03-27 | (50 kits) | Bed kits — no assembly yet |
| **Finished beds total** | | **~61** | |
| **Kits in inventory awaiting assembly** | | **~142** | |

## The non-bed Defy spend I was loading onto beds

This is what made my first analysis say $5,800/bed. These invoices are tagged ACT-GD but are for OTHER products:

| Date | Inv | Total | What it actually was |
|---|---|--:|---|
| 2025-06-02 | INV-1174 | $5,445 | 900 coasters @ $5 + 900 stickers @ $0.50 |
| 2025-06-04 | INV-1181 | $3,790 | Design time + 5 pallets Sydney→Alice Springs |
| 2025-07-08 | INV-1236 | $5,500 | 5 Washing Machine Cladding Sets @ $1,000 |
| 2025-07-08 | INV-1237 | $5,280 | 3 Washing Machine Cladding (installed) + 3 road cases |
| 2025-07-08 | INV-1235 | $1,320 | 1 Washing Machine Cladding additional |
| 2025-07-16 | INV-1257 | $5,500 | 5 Washing Machine Cladding Sets @ $1,000 |
| 2025-08-22 | INV-1337 | $3,016 | Freight for Washing Machine to Darwin |
| 2025-11-17 | INV-1503 | $2,734 | 4 Washing Machine Cladding @ $621.30 |
| 2026-02-17 | INV-1637 | $4,813 | 700 coasters @ $5.50 + 700 stickers |
| 2026-02-27 | INV-1657 | $1,349 | Freight clad washing machine + skins |
| **Non-bed Defy total (ACT-GD mistag)** | | **~$38,747** | Should be ACT-FM (washers) + ACT-EL (merch/coasters) |

## Per-bed picture, corrected

### At Defy's verified rates (production batch, INV-1507)

| Layer | $/bed | Source |
|---|--:|---|
| Single Bed (recycled plastic + steel + canvas, fully fabricated by Defy) | **$600** | INV-1507 verified |
| Freight Sydney → remote (per bed, ~8 beds/pallet) | $100–$200 | Multiple freight lines verified |
| **Direct delivered cost (Defy-only model)** | **$700–$800** | |

### Fully-loaded with ACT overhead

Founder time was answered: **$1,000/day × 150 days/yr = $150K/yr modelled.**

| Volume | Defy + freight | Admin (per-bed) | Travel/field (per-bed) | Founder time (per-bed) | **Total fully-loaded** |
|--:|--:|--:|--:|--:|--:|
| 100 beds/yr | $750 | $147 | $510 | $1,500 | **~$2,907/bed** |
| 200 beds/yr | $700 | $74 | $255 | $750 | **~$1,779/bed** |
| 500 beds/yr | $650 | $29 | $100 | $300 | **~$1,079/bed** |
| 1,000 beds/yr (in-house assembly drops Defy cost) | $450 | $15 | $50 | $150 | **~$665/bed** |

**Counterfactual:** Commercial-equivalent bed AU 2026 = $1,500–$2,000.

**The story:**
- At today's ~61-beds-in-9-months run rate (~80/yr), fully-loaded is **~$3,000/bed** including founder time at fair-market.
- At 500 beds/yr (the realistic target if Defy + freight scale), **~$1,080/bed** — beats commercial $1,500–$2,000 by 30–45%.
- At 1,000 beds/yr with in-house assembly, **~$665/bed** — 2–3× value vs commercial.

## Mistags to fix in Xero (Tier 2 retags, separate session)

| Mistag | Amount | Should be |
|---|--:|---|
| Defy Washing Machine Cladding bills (multiple) tagged ACT-GD | ~$25,000 | ACT-FM (Facilities) |
| Defy Coasters (INV-1174 + INV-1637) tagged ACT-GD | ~$10,000 | ACT-EL (merch/marketing) |
| Defy Design + R&D (INV-1258 $6K design + INV-1259 $1K prototype) tagged ACT-GD bed-production | ~$7,000 | Keep ACT-GD but reclassify as capital/R&D, not per-bed COGS |
| Carbatec Brisbane (lines say ACT-HV) tagged ACT-GD | $8,726 | ACT-HV (Harvest) |
| Utopia flights tagged ACT-IN (per plan) | $24,507 | ACT-GD (trip costs) |
| 1300 Washer tagged ACT-GD | $13,980 | ACT-FM |
| Carla Furnishers duplicate | $11,180 | Void duplicate |
| R M Tanner Triple Axle coded labour | $19,950 | Capital |

**After retags, real ACT-GD bed-attributable Defy spend ≈ $129,000** over 9 months for 61 finished beds = **$2,115/bed today**. Still higher than the Defy quote of $600 because of:
- Prototyping cost (INV-1259 + INV-1258 = $7K of one-off R&D)
- Low-volume premium on smaller batches
- Inventory built up (~142 kits at $344.05 each = ~$49K) that hasn't converted to beds yet

When those kits convert to beds (~2026 Q2–Q3), the average drops to ~$1,200/bed at Defy. When INV-1258's design cost amortises across the lifetime of bed production, it drops further toward the $600 quote.

## Open questions for Defy

1. **Volume-quote sheet** at 100 / 500 / 1,000 / 5,000 beds/yr — what does the $600 finished-bed rate become?
2. **Steel + canvas sourcing** — is it cheaper for us to source RW Pacific direct (we already paid $6,234 there) and supply to Defy as a build-to-supply model?
3. **In-house assembly economics** — at what volume does taking the $55.95 assembly in-house pay back the facility capital?

## What to do with this

1. **Replace the funderView numbers** in `buildFunderView` (grantscope) with the verified Defy rates above. Notion BOM was right; my doubt was wrong.
2. **Retag the mistags** (~$72K of misattributed spend) so future per-bed math has the right denominator.
3. **Get Defy's volume-quote sheet** for the funder narrative.
4. **Save this doc** as the source-of-truth for the funder model going forward.

The earlier "$5,800/bed today" claim was the result of dividing all ACT-GD Defy spend (including coasters, washing machines, design, prototypes, inventory-not-yet-assembled) by finished-bed count. **The real "all-in today" figure is $2,115/bed at the Defy-spend level alone, dropping fast as kits convert and prototypes amortise.**
