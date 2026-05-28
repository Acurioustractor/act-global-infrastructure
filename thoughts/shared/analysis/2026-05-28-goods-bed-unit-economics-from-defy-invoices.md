---
title: Goods — bed unit economics, worked backwards from Defy invoices
created: 2026-05-28
owner: Ben
status: SUPERSEDED — flawed methodology (do not trust the per-bed numbers below)
source_of_truth_for: NONE (kept as a record of the wrong approach)
plan_slug: goods-cost-evidence-funder-artifact
---

> ⚠ **2026-05-28 correction.** This analysis divided all-product Defy spend +
> all-project overhead by bed count alone. That's wrong: Goods produces
> multiple products (beds, sheds, coasters, samples, prototypes) and only ONE
> Xero line (INV-1602) explicitly names beds. The per-bed numbers below
> ($5,800 today, etc.) are **inflated by every non-bed product loaded onto
> the bed denominator**. The Notion BOM's $523.70/bed direct is the correct
> per-bed stack for a *standard* bed; INV-1602's $2,099/bed is either a
> special-finish batch or a volume effect, not evidence the BOM is wrong by 37×.
>
> The correct next step is **per-product unit economics**: identify which
> Defy invoices are for beds vs sheds vs coasters vs prototypes, then compute
> per-bed cost using only bed-attributable lines.
>
> Kept on file as a record of the wrong approach; **do not cite the numbers below**.

# Goods — what does a bed actually cost?

This walks through Ben's 12 questions (2026-05-28) using the real ACT-GD Xero data instead of the planning numbers in the Notion BOM. **Verified ⇒ a real Xero line; Inferred ⇒ derived from data but not directly confirmed; Modelled ⇒ no source yet, assumption-only.**

## Source data (verified 2026-05-28)

- **35 Defy bills**, $179,936 incl GST / $171,394 ex GST, 2025-06-02 → 2026-03-31. (Two contacts: `Defy Manufacturing` 22 bills $114,888 + `Defy` 13 bills $65,048 — same vendor, merge in Xero.)
- **Total ACT-GD spend, all suppliers:** $391K ex GST across 253 bills.
- **Only one Xero line carries an explicit bed count: INV-1602 (2026-01-30):** *"16 Beds made from previously ordered 19mm recycled plastic sheets. Cut and finished"* — $33,588.60 (ex GST) on Xero account 412.

This single line is the load-bearing data point for almost every per-bed claim below.

---

## Q1. Plastic shreds from Defy — what do we pay for the raw input?

**Xero account 429 ("Defy Manufacturing — Materials & Supplies — ACT-GD") — all 11 Defy bills:**

| Date | Amount (ex GST) |
|---|--:|
| 2025-11-27 | $1,858.78 |
| 2025-11-28 | $1,894.10 |
| 2025-12-18 | $3,199.83 |
| 2025-12-18 | $3,260.63 |
| 2025-12-22 | $3,598.09 |
| 2026-01-11 | $876.81 |
| 2026-01-11 | $893.47 |
| 2026-03-19 | $199.43 |
| 2026-03-27 | $8,525.00 |
| 2026-03-27 | $18,922.75 |
| 2026-03-31 | $8,686.98 |
| **Defy materials total** | **$51,914.87** |

**Account 429 across all ACT-GD suppliers:** $99,884 (Defy is ~52% of this).

**The gap.** Defy's 429 lines have no description beyond "Materials & Supplies" and no qty/$ unit breakdown. We can't tell from Xero alone whether $X bought *shredded HDPE*, *finished sheets*, or *finished kits*. We need a Defy invoice attachment or quote sheet to know $/kg of shred vs $/m² of sheet.

- **Verified:** Total Defy materials spend over 10 months: $51,915.
- **Inferred (from INV-1602):** The Nov 2025 → Jan 2026 materials bills ($14,778) plausibly fed the 16-bed Jan-2026 batch → **~$924/bed in raw sheet material**.
- **Open question for Defy:** What's your $/kg shred rate? What's your $/m² for finished 19mm recycled-HDPE sheet? Does the price step at 100kg / 500kg / 1t / 5t volumes?

---

## Q2. Defy build cost — assembly only vs full kit

**The one clean signal — INV-1602 (2026-01-30), account 412:**

> "16 Beds made from previously ordered 19mm recycled plastic sheets. Cut and finished" — **$33,588.60 ex GST**

That works out to **$2,099 per bed** for cut + finish labour, on already-purchased sheets.

**Other account-412 lines (no bed count given):**

| Invoice | Date | Amount | Likely interpretation |
|---|---|--:|---|
| INV-1233 | 2025-07-08 | $1,051.51 | Pre-production / prototype |
| INV-1235 | 2025-07-08 | $1,320.00 | Pre-production |
| INV-1236 | 2025-07-08 | $5,500.00 | Pre-production batch |
| INV-1237 | 2025-07-08 | $5,280.00 | Pre-production batch |
| INV-1291 | 2025-07-30 | $1,457.17 | ? |
| INV-1325 | 2025-08-20 | $2,640.00 | ? |
| INV-1326 | 2025-08-20 | $1,320.00 | ? |
| INV-1637 | 2026-02-17 | $4,375.00 | ? |
| INV-1657 | 2026-02-27 | $1,226.54 | ? |
| **INV-1602 (the only one with a bed count)** | 2026-01-30 | **$33,588.60** | **16 beds @ $2,099/bed** |
| **Account-412 total** | | **$57,759** | |

**The $55.95/bed assembly figure in the Notion BOM is contradicted by the only invoice that names a bed count.** Either INV-1602 is a special-case complex finish, or the Notion BOM number is aspirational. **Ask Defy: what's your standard cut+finish labour quote for a single bed at batch sizes of 1 / 16 / 50 / 100 / 250?**

- **Verified:** Defy charged $2,099/bed for cut+finish on 16 beds in Jan 2026.
- **Verified:** Notion BOM says $55.95/bed assembly is "Verified, Defy" — but this number is **not** in any Xero line we can find. Treat as **unverified** until a Defy quote sheet is attached.

### Account 400 — the "mixed" Defy bucket

$61,720 ex GST on Defy bills coded 400. Includes the early INV-1174 (June 2025): *"coasters in 8mm Atlantis with custom engraving — 900 @ $5.50 = $4,950 + sourcing/applying sticker 900 @ $0.55 = $495"*. So account 400 has **non-bed product work** (coasters, samples, prototypes) mixed in with bed work. Cannot attribute to bed unit cost without a line-level audit.

- **Action:** Categorise each account-400 Defy line manually (Ben + Defy together) into `bed-related` vs `non-bed product` so the funder model uses only bed lines.

---

## Q3. Defy shipping — does Defy charge freight?

**Defy bills, none of them, contain an explicit freight line.** Defy doesn't ship — we pay separate carriers.

**Account 425 (Freight & delivery) — ACT-GD only:**

| Supplier | Bills | Total | What they ship |
|---|--:|--:|---|
| Peak Up Transport | 4 | $18,912 | Bulk road freight (July 2025 — Utopia trip prep) |
| Sea Swift | 1 | $2,554 | Barge to remote / Torres Strait |
| Sendle | 7 | $1,961 | Small parcel courier (Bri-Syd-Melb) |
| AJ Couriers & Haulage | 1 | $1,546 | "10x pallet from Alice Springs Bunnings to Tennant Creek" |
| ePrint | 2 | $1,743 | (Mis-coded as 425; actually printing) |
| **Freight total (ex ePrint)** | | **~$24,973** | |

**Per-bed freight:**
- If the July-2025 Peak Up batch ($18,912) shipped the Utopia trip (~100 beds, est) → **~$189/bed for remote-road**.
- Sendle/parcel rates: $50–$200/bed depending on weight & destination.
- Sea Swift barge: $2,554 for one shipment to remote QLD/Torres Strait — bed count unknown.

- **Verified:** $25K freight on ACT-GD over 9 months across 4 carriers.
- **Inferred:** Road freight ~$189/bed for the Utopia trip distance.
- **Open question:** What's the actual bed count on each freight invoice? Need Peak Up's manifest / weight × bed weight to back out per-bed cost cleanly.

---

## Q4. Per-element cost — poles, canvas, caps

**Canvas — RW Pacific Traders (Australian rope/canvas/marine supplier):**
- 2026-01-05: $4,200 ex GST (no description)
- 2026-01-14: $2,034 ex GST (payment for INV-0368)
- **Total: $6,234** over 2 bills

If those canvas rolls covered ~50 beds → $125/bed canvas. (Close to the Notion BOM $93.50 estimate.) But we need RW Pacific's actual invoice attachments to confirm what was bought.

**Steel — Steelmart:**
- 2026-04-07: $1,321 ex GST (one bill, only one we can find)
- **Total: $1,453 incl GST**

That's ONE steel bill in 10 months. If steel poles are part of every bed, either:
- Defy supplies the steel as part of the kit (most likely — explains the high 412 line)
- Or we sourced steel from elsewhere not tagged ACT-GD

**End caps / fittings:**
- No supplier identified in the data. Notion BOM has $3.20/bed — likely bundled in Defy's 429 materials.

**Summary of per-element confidence:**

| Element | Notion BOM | Xero evidence | Confidence |
|---|---|---|---|
| HDPE kit / plastic sheets | $344.05 | ~$924/bed inferred from INV-1602 batch | **Notion BOM is too low** |
| Canvas | $93.50 | RW Pacific $6,234 / ? beds | needs allocation |
| Assembly (Defy) | $55.95 | $2,099/bed from INV-1602 | **Notion BOM is too low** |
| Steel | $27.00 | $1,321 single bill — likely bundled by Defy | unclear |
| End caps | $3.20 | none found | likely bundled |

The Notion BOM understates by ~5× on materials and ~37× on Defy assembly. **The Notion BOM cannot be used as the funder-grade cost source until Ben + Defy reconcile.**

---

## Q5. Quantity-discount scaling

**We don't have the data.** The only batch-with-bed-count is INV-1602 (16 beds @ $2,099/bed assembly). To answer "what does a bed cost at 100 / 500 / 1,000 / 5,000 per year" we need:

1. A Defy quote schedule (price per bed at each volume tier).
2. A model of how facility overhead amortises across volume (Kirmos $4,500/mo / 100 beds = $45/bed; / 500 beds = $9/bed).
3. A freight model — bulk Peak Up at 500 beds vs ad-hoc Sendle at 5 beds.

**Modelled** (assuming Defy's quote follows a typical small-batch fabrication curve):

| Annual volume | Estimated Defy cut+finish $/bed | Notes |
|--:|--:|---|
| 16 beds (actual, low volume) | $2,099 | INV-1602 verified |
| 100 beds | $700–$1,200 | One-shift continuous run |
| 500 beds | $300–$600 | Two-shift, jigs paid down |
| 1,000+ beds | $150–$350 | Dedicated line, capital-amortised |

These are **modelled only**. **Action: ask Defy for a written volume-quote sheet.**

---

## Q6. Internal wages — 1 person making 6 beds a day

We have no internal wages data in ACT-GD yet (Joseph Kirmos is the only labour line, $4,500/month for facility — not per-bed assembly).

**Modelled** at Australian award rates for skilled fabrication (MA000010 Manufacturing Modern Award):

| Pay scenario | $/hr | $/8hr-day | $/bed at 6 beds/day |
|---|--:|--:|--:|
| Award C13 (entry fabricator) | $26 | $208 | **$35** |
| Award C10 + super (mid) | $32 | $256 + 12% = $287 | **$48** |
| Fair-market replacement (skilled trade) | $45 | $360 + 12% = $403 | **$67** |
| Indigenous community wage + super | $35 | $280 + 12% + cultural loading | **$50–$55** |

So: **somewhere between $35 and $67 per bed in pure assembly labour**, depending on what we pay.

That's **dramatically less than Defy's $2,099/bed** — which is the whole investment case for moving assembly in-house once volume justifies the facility.

---

## Q7. DIY cost — buy shreds, build the bed ourselves

**Modelled** using industry rates (HDPE shred is a commodity input):

| Input | Cost basis | $/bed |
|---|---|--:|
| HDPE shred (~30kg/bed × $2–4/kg AU recycled HDPE) | Polymer Processors Australia retail | $60–$120 |
| Sheet pressing / forming (in-house) | Modest energy + machine wear | $10–$25 |
| Canvas (RW Pacific or similar) | Actual Xero rate | $80–$130 |
| Steel poles | $1,321 / 50 beds @ Steelmart price | $25–$50 |
| End caps + fittings | Industrial supplier | $5–$10 |
| Assembly labour @ 6 beds/day fair-market | Q6 above | $50–$70 |
| **DIY direct cost (no facility, no admin)** | | **$230–$405/bed** |

That excludes:
- Facility overhead (Kirmos $4,500/mo + utilities + rent)
- Capital amortisation (Carbatec $10K tooling, facility build $100K)
- Freight to community
- Admin / project management / governance

**Add facility overhead at 100 beds/year:** Kirmos $54K/yr + utilities + rent ≈ $80K/yr / 100 beds = **+$800/bed**.
**At 500 beds/year:** $80K / 500 = **+$160/bed**.

So **DIY fully-loaded:**
- @ 100 beds/yr → **$1,030–$1,205/bed**
- @ 500 beds/yr → **$390–$565/bed**
- @ 1,000 beds/yr → **$310–$485/bed**

---

## Q8. Community plastic collection — pay community per kg

**Modelled** using community-recycling benchmarks (Plastic Free July collection programs, Boomerang Alliance precedents):

| Pay rate to community ($/kg HDPE) | $/bed @ 30kg | Notes |
|--:|--:|---|
| $0.20 | $6 | Bottom of municipal kerbside rate |
| $0.50 | $15 | Mid — typical community-coop rate |
| $1.00 | $30 | High — premium "ocean plastic" branding |
| $2.00 | $60 | What we'd pay a remote community for clean sorted HDPE |

**At $1/kg community pay rate**, 100 beds/yr = $3,000 in community payments — significant for a remote community, trivial for the per-bed cost line.

**BUT** community-collected plastic needs processing before it becomes sheet stock:
- Cleaning + drying + colour-sorting
- Shredding (Carbatec-class equipment, $10K up)
- Sheet pressing (high-capex — $50K+ for a small hot-press line)

So community-collection only makes sense **alongside** in-house processing, which is the next capex decision after the $100K facility.

- **Inferred:** $6–$60/bed in community-pay plastic.
- **Open question:** Is the value proposition the **dollar cost** (it's cheap) or the **story value** (community participation in their own infrastructure)? The story value almost certainly justifies a higher pay rate than the dollar cost would.

---

## Q9. Admin costs

**Account 413 + 421 + 485 + Byo Group (bookkeeping/software) — ACT-GD share:**

| Line | $ (ex GST) | What |
|---|--:|---|
| Byo Group bookkeeping/BAS | $6,648 | 14 bills |
| Dext software (via Byo) | $1,415 | Recurring |
| Account 421 (small admin) | $2,896 | 71 lines across 50 bills |
| Account 449 (govt fees / small ops) | $1,714 | 18 lines |
| Account 432 / 448 / 420 small ops | ~$2,000 | Misc |
| **Admin total identified** | **~$14,673** | |

**Per-bed admin:** If we delivered ~100 beds in the year, admin = **$147/bed**. At 500 beds/yr it drops to **$29/bed**.

**Action:** Pull admin from the parent ACT (ACT-EL) and allocate a fair share — Goods doesn't carry its own R&D / legal / governance overhead directly; that sits in the operating entity.

---

## Q10. Travel costs

**Account 493 (Field travel & accommodation) — ACT-GD:** $8,765 over 49 lines across 39 bills.

**Account 451 (Vehicle / mechanical):** $10,242
**Account 447 (Equipment / field gear):** $7,922

**Off-ledger (per plan):** $24,507 of Utopia flights + accommodation tagged ACT-IN that should be ACT-GD. Once retagged, **total travel + field is ~$51K over 10 months**.

**Per-bed travel:** $51K / 100 beds = **$510/bed for the trip-heavy phase** (Utopia, Palm Island, Tennant Creek deliveries). Drops to **$102/bed** at 500 beds if delivery trips are batched.

This is a **delivery model** cost. A buyer-pickup model (council picks up the bed from the workshop) eliminates almost all of it.

---

## Q11. Founder time

**Not booked anywhere in ACT-GD.** Per the diagnostic non-negotiable: cost founder time at fair-market replacement rate even if not drawn.

**Modelled scenarios** (fair-market replacement for a CEO/founder of a $1M-revenue social enterprise):

| Days/yr on Goods | Rate | Modelled cost | $/bed @ 100 beds | $/bed @ 500 beds |
|--:|--:|--:|--:|--:|
| 100 | $800/day | $80,000 | $800 | $160 |
| 150 | $1,000/day | $150,000 | $1,500 | $300 |
| 200 | $1,200/day | $240,000 | $2,400 | $480 |

This is the line that makes funders take the program seriously — it shows you understand the **true** cost of founder commitment, even when not drawn.

**Action: Ben to confirm $/day rate and days-on-Goods estimate. Once set, this becomes a permanent line in the funder model.**

---

## Q12. Other expenses I might not have thought about

**From the Xero data + ACT operating context:**

| Line | Why it matters | Likely $/bed range |
|---|---|--:|
| **Insurance** (public liability, product liability, vehicle) | Sits in ACT-EL; product-liability premium scales with units shipped | $10–$30 |
| **R&D / design iteration** | Endless Parks $7,700 (design + 250-unit intro batch) — first instance only; future iterations? | $5–$50 |
| **Tooling depreciation** (Carbatec $10K + future) | Capital amortised over life | $5–$25 |
| **Warranty / field repair reserve** | Bed in remote location breaks; cost to replace or send labour | $20–$80 |
| **Quality control / failed batches** | First-batch yields are never 100% | $30–$100 |
| **Branding / signage / decals** (NQ Clothing, Trademutt, ePrint) | $7,012 over the year — partly merch, partly per-bed | $5–$30 |
| **Compliance** (AS/NZS test certification, fire rating if used in remote housing) | One-off but reduces buyer-risk objections | $5–$15 (amortised) |
| **Storage / warehousing** (between build and delivery) | Free now in the facility; will scale | $10–$30 |
| **Tax & accounting (R&D tax incentive 43.5%)** | Reduces cost if R&D claim succeeds | **credit** |
| **Bad-debt / collections reserve** | Buyers may not pay on time | $5–$15 |
| **Carbon offsets / sustainability certification** (B-Corp, etc.) | Sometimes funder-required | $5–$20 |

**Sum of "other" at mid-range: ~$130–$390/bed at 100 beds/year**, dropping to ~$50–$150 at 500/year.

---

## What this means for the funder view

**The current `buildFunderView` numbers are wrong.** They use the Notion BOM ($524/bed direct, $600/bed fully-loaded) which the Defy invoice data contradicts by 4–5×.

**The real picture, at the current ~100-bed annual run rate:**

| Layer | $/bed (mid-case) | Confidence |
|---|--:|---|
| Defy materials (sheets) | $924 | Inferred from INV-1602 batch attribution |
| Defy cut+finish | $2,099 | Verified (INV-1602 line) |
| Canvas | $125 | Inferred (RW Pacific) |
| Steel / end caps | $50 | Mostly bundled in Defy 429 |
| Freight (remote road) | $189 | Inferred (Peak Up Utopia trip) |
| Travel/field overhead | $510 | Verified (account 493 + Utopia mistag) |
| Admin overhead | $147 | Verified (Byo + small accounts) |
| Founder time (modelled, 150d @ $1K) | $1,500 | Modelled |
| Other (Q12, mid) | $260 | Modelled |
| **Fully-loaded delivered, ~100/yr** | **~$5,800** | High confidence on Defy lines, lower on overheads |

**At 500 beds/year** (with in-house assembly + bulk freight + amortised facility):

| Layer | $/bed |
|---|--:|
| HDPE shred (DIY) | $90 |
| Canvas | $105 |
| Steel + caps | $40 |
| In-house assembly labour | $50 |
| Facility overhead | $160 |
| Freight (bulk) | $90 |
| Admin | $29 |
| Founder time | $300 |
| Other | $150 |
| **Fully-loaded at 500/yr** | **~$1,014** |

**At 1,000 beds/year** (community-collected plastic + in-house everything):

| Layer | $/bed |
|---|--:|
| Community plastic + processing | $50 |
| Canvas + steel + caps | $135 |
| In-house assembly | $50 |
| Facility overhead | $80 |
| Freight | $50 |
| Admin | $15 |
| Founder time | $150 |
| Other | $80 |
| **Fully-loaded at 1,000/yr** | **~$610** |

**Counterfactual** (commercial-equivalent bed, AU retail/contract market 2026): **$1,500–$2,000**.

So the program:
- **Loses money on every bed at today's volume** (vs the $801/bed Centrecorp pays).
- **Breaks even around 200–250 beds/yr** if in-house assembly works.
- **Generates 2–3× value per dollar at 500+** vs commercial.
- **Crosses into "community wealth created"** when local labour + community plastic become the inputs.

This is the real story for funders. It's not "$600/bed". It's "**we're at $5,800/bed today because we're learning; we need capital to get to $1,000/bed at scale, where the program creates 1.5–2× the value of buying commercial.**"

---

## What to do with this

1. **Reconcile with Defy.** The 16-bed INV-1602 attribution explains the gap to the Notion BOM — but Ben needs to confirm whether $2,099/bed assembly is a one-off, a learning-curve baseline, or the real number.
2. **Get Defy's volume quote sheet.** Without it, scenarios 5 and 7 above are modelled, not evidenced.
3. **Update `buildFunderView`** to present three scenarios (current 100/yr, target 500/yr, vision 1,000/yr) with confidence grades, not one hardcoded hero number.
4. **Decide founder-time rate.** Once Ben picks a $/day and days-on-Goods, it goes into every future funder doc as a permanent line.
5. **Retag the ACT-IN / ACT-FM / Carbatec ACT-HV mistags.** Each mistag distorts the per-bed cost denominator.

This document is the source-of-truth for the funder-view numbers. Update it when Defy gives a quote sheet or when retagging changes the totals.
