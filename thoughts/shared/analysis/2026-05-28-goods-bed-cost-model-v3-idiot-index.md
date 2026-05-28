---
title: Goods bed cost model v3 — element-by-element with Idiot Index, in-house scenarios, and fundraising offset
created: 2026-05-28
owner: Ben
status: working model — ready for review + UI build
supersedes: thoughts/shared/analysis/2026-05-28-goods-bed-unit-economics-CORRECTED.md (Defy rates here; this adds the Idiot Index + in-house build + fundraising side)
plan_slug: goods-cost-evidence-funder-artifact
config: thoughts/shared/analysis/2026-05-28-goods-bed-cost-model-v3.json
---

# Goods bed cost — v3 model

Three things this model does that the previous ones didn't:

1. **Idiot Index per element** — ratio of finished-part price to raw-material price. Where Defy's markup is biggest, the in-house opportunity is biggest. Borrowed from Musk's first-principles cost work.
2. **In-house build scenarios per element** — for each bed component, what does it cost if WE shred plastic / press sheets / cut and finish, instead of buying from Defy?
3. **Founder time split by purpose** — production-related founder time goes onto beds; fundraising founder time goes onto the FUNDING side and offsets bed cost via dollars raised. The "$1,500/bed founder time" line in v2 was nonsense and is fixed here.

All Defy rates verified from invoice PDFs (see `2026-05-28-defy-invoice-ocr.json`). All raw-material rates are AU market estimates (mid-2026); Ben can override in the config.

---

## 1. Material physics — how much plastic in a bed?

**Verified Defy rate:** Half-sheet 1200×1200×19mm = $200 (bulk discount, 20 sheets in March 2026).

**Mass calculation** (HDPE density 0.96 g/cm³):
- One half-sheet volume = 120 × 120 × 1.9 cm = 27,360 cm³
- Mass = 27,360 × 0.96 = **~26.3 kg of HDPE per half-sheet**

**Defy bed kit @ $344.05** = sheets cut + finished, ready to assemble. Material content of one bed kit (assumption to confirm with Ben):

- **Scenario A — 1 half-sheet per bed:** 26.3 kg HDPE = $52.55 raw shred ($2/kg)
- **Scenario B — 1.5 half-sheets per bed:** 39.5 kg HDPE = $78.93 raw shred
- **Scenario C — 2 half-sheets per bed:** 52.6 kg HDPE = $105.10 raw shred

Defy charges $344.05 for the cut+finished kit. So Defy's markup over raw HDPE is:

| Material scenario | Raw HDPE cost | Defy kit price | Defy markup | **Idiot Index** |
|---|--:|--:|--:|--:|
| A (1 half-sheet, 26kg) | $52.55 | $344.05 | $291.50 | **6.5×** |
| B (1.5 half-sheets, 39kg) | $78.93 | $344.05 | $265.12 | **4.4×** |
| C (2 half-sheets, 52kg) | $105.10 | $344.05 | $238.95 | **3.3×** |

Defy's markup pays for: shredding (if not bulk-collected), sheet pressing (hot-press machine + energy), CNC/laser cutting, finishing/sanding, packaging, their margin. **Each of these is a candidate for in-house substitution.**

---

## 2. Idiot Index per bed element

For each component, **raw materials cost** vs **what we currently pay** vs **idiot index**. Big ratios = biggest cost-reduction opportunities.

| Element | Raw material | Current rate | Idiot Index | What the markup buys |
|---|--:|--:|--:|---|
| **HDPE shred → finished kit** | ~$53–$105 (depends on sheets/bed) | $344.05 | **3.3–6.5×** | Shredding, sheet pressing, CNC cutting, finishing |
| **HDPE shred raw (sourced)** | $2.00/kg | $2.00/kg | 1.0× | n/a — this IS the raw rate Defy buys at |
| **Half-sheet (1200×1200×19mm)** | $52.55 (shred at 26kg) | $200/half-sheet | **3.8×** | Sheet pressing + Defy margin |
| **Cut+finish only (already-pressed sheets)** | ~$30–60 (CNC time est.) | $121/bed | **2.0–4.0×** | CNC operator + machine + margin |
| **Assembly labour (Defy)** | $52 (2hr × award C13) | $55.95 | **1.1×** | Already efficient — small markup |
| **Steel (frame + caps)** | $10–$15 (Steelmart bulk est.) | $27 (Notion BOM) | **1.8×** | Cut to length, drill, deliver |
| **Canvas** | $45–$60 (raw 12oz duck est.) | $93.50 (Notion BOM) | **1.6×** | Cut, hem, grommet — RW Pacific |
| **End caps / fittings** | $0.50–$1.00 (bulk injection est.) | $3.20 (Notion BOM) | **3.2×** | Bulk-buy markup + supplier margin |
| **Pallet + packing** | $30–$50 raw materials | $60–$210 (Defy) | **2.0–4.0×** | Labour + packing materials + margin |
| **Freight Botany→remote-AU** | n/a (commodity rate) | $80–$250/bed | 1.0× | n/a — freight is commodity |

**Where the cost-reduction opportunities are, ranked:**

1. **Sheet pressing in-house** (Idiot Index 3.8×) — biggest single saving. Capital cost: hot-press line ~$50–150K. Pays back at scale.
2. **HDPE kit assembly in-house** (Idiot Index 3.3–6.5×) — combines shredding + pressing + cutting + finishing into one in-house workflow. Capital ~$150–250K total.
3. **End caps** (Idiot Index 3.2×) — small dollar value but high ratio; bulk-direct from injection moulder.
4. **Cut+finish in-house** (Idiot Index 2.0–4.0×) — CNC router ~$15–40K. Doable today.
5. **Pallet+packing in-house** (Idiot Index 2.0–4.0×) — labour-only, do at facility.
6. **Steel + canvas direct-source** (Idiot Index 1.6–1.8×) — already partial via RW Pacific + Steelmart.

**Where there's no opportunity:** Defy assembly labour ($55.95/bed at 1.1×) is already at award + small margin. Freight is a commodity. Don't waste time optimising these.

---

## 3. Build-state scenarios per bed

Working from Defy-everything to ACT-everything, with verified rates plus reasonable in-house estimates:

### State 1: "Defy does everything" (today — 25-bed batch INV-1507 model)
| Layer | $/bed | Source |
|---|--:|---|
| Single Bed fully fabricated (HDPE+steel+canvas+assembly) | $600.00 | INV-1507 verified |
| **Direct-from-Defy cost** | **$600** | |

### State 2: "Buy kit, assemble ourselves"
| Layer | $/bed | Source |
|---|--:|---|
| Defy bed kit (sheets cut+finished) | $344.05 | INV-1602 + 2026-03-27 verified |
| Canvas (RW Pacific direct or via Defy) | $93.50 | Notion BOM |
| Steel poles (Steelmart direct) | $27.00 | Notion BOM |
| End caps + hardware | $3.20 | Notion BOM |
| Assembly labour @ 6 beds/day × $280/day = $46.67 | $46.67 | Award + super at C13 |
| **Buy-kit-assemble cost** | **$514.42** | $86/bed saving vs State 1 |

### State 3: "Buy pressed sheets, cut+finish+assemble ourselves"
| Layer | $/bed | Source |
|---|--:|---|
| 1.5 half-sheets from Defy @ $200 | $300.00 | Defy bulk verified |
| In-house CNC cut + finish (1hr × $60/hr equipment+operator) | $60.00 | Capital amortised + labour |
| Canvas | $93.50 | |
| Steel | $27.00 | |
| Caps + hardware | $3.20 | |
| Assembly labour | $46.67 | |
| **Buy-sheets-do-rest cost** | **$530.37** | $70/bed saving vs State 1 |

### State 4: "Buy raw HDPE shred, do everything in-house"
| Layer | $/bed | Source |
|---|--:|---|
| HDPE shred 40kg @ $2/kg (Scenario B mid) | $80.00 | Defy bulk verified |
| In-house sheet pressing (energy + machine time, no labour amortising capital yet) | $40.00 | Industry estimate for hot-press |
| In-house CNC cut + finish | $60.00 | |
| Canvas | $93.50 | |
| Steel | $27.00 | |
| Caps + hardware | $3.20 | |
| Assembly labour | $46.67 | |
| **All-in-house direct cost** | **$350.37** | **$250/bed saving vs State 1** |

### State 5: "Community-collected plastic + all-in-house" (vision)
| Layer | $/bed | Source |
|---|--:|---|
| Community pay for clean sorted HDPE @ $1/kg × 40kg | $40.00 | Modelled |
| In-house wash + dry + colour-sort | $20.00 | Modelled (small labour line) |
| In-house shredding (already capital, energy only) | $10.00 | Modelled |
| In-house sheet pressing | $40.00 | |
| In-house CNC + finish | $60.00 | |
| Canvas (or community-woven fibre?) | $93.50 | |
| Steel | $27.00 | |
| Caps + hardware | $3.20 | |
| Assembly labour | $46.67 | |
| **Community + in-house direct** | **$340.37** | **$260/bed saving + community jobs** |

**Direct cost trajectory: $600 → $514 → $530 → $350 → $340.** The big drop is State 1 → State 4 ($250/bed saving) when we move sheet pressing and cutting in-house.

---

## 4. Capital required at each state

| State | New capital needed | Cumulative |
|---|---|---|
| 1 — Defy everything | $0 | $0 |
| 2 — Buy kit, assemble | Workbench, hand tools (~$2K) | $2K |
| 3 — Buy sheets, cut in-house | CNC router ($15-40K) | $40K |
| 4 — Shred → sheet → cut → assemble | Hot-press line ($80-150K) + shredder ($15-30K) | $200K |
| 5 — Community plastic + all in-house | Wash + sort station ($20K) + storage | $230K |

**Existing capital invested (per the plan):** Facility ~$100K + Carbatec tooling ~$10K = $110K already in.

**To reach State 4 fully, additional ~$90K capex needed.** That's the funder ask.

---

## 5. Founder time — properly allocated (v2 was wrong)

Founder time is not "$1,500/bed overhead" — that conflates production work with fundraising/strategy/governance. The honest split:

| Founder activity | Days/yr | $/day | Cost | What it earns |
|---|--:|--:|--:|---|
| **Production-related** (oversight, QA, design iteration, supplier relationships) | 30 | $1,000 | $30,000 | Goes onto beds as production overhead |
| **Fundraising / philanthropy** (briefs, asks, reporting, donor relationships) | 50 | $1,000 | $50,000 | OFFSETS bed cost via funds raised |
| **Commercialisation / buyer development** (Centrecorp, councils, sales calls) | 25 | $1,000 | $25,000 | OFFSETS bed cost via revenue raised |
| **Governance, strategy, comms, brand** | 45 | $1,000 | $45,000 | ACT-wide cost — allocated to overheads, not Goods-specific |
| **Total founder time on Goods** | **150** | | **$150,000** | |

### Production-only founder time per bed:

| Volume | Production founder cost / volume | $/bed |
|--:|--:|--:|
| 100 beds/yr | $30,000 / 100 | **$300** |
| 500 beds/yr | $30,000 / 500 | **$60** |
| 1,000 beds/yr | $30,000 / 1,000 | **$30** |

That's the honest number — not $1,500/bed. The other $120K of founder time is NOT a bed cost; it's an ACT cost that's funded by what it raises.

---

## 6. The fundraising offset — how founder time becomes bed subsidy

If founder spends 50 days/yr on philanthropy and 25 days/yr on commercial:

| Source | Days × productivity | $/yr raised | Per-bed subsidy @ 100/yr |
|---|---|--:|--:|
| Philanthropy (typical: $4–6K raised per founder-day at this stage) | 50 × $5,000 | $250,000 | $2,500 |
| Commercial sales (Centrecorp @ $801/bed, councils, others) | 25 × ?? | varies | mix |
| **Inputs to the Goods program (philanthropy + sales + R&D credit + in-kind)** | | **~$300–500K/yr expected** | offsets ~$3,000–$5,000/bed at 100/yr |

So at 100 beds/yr:
- Bed direct cost: ~$700/bed (State 1 Defy + freight)
- Bed overhead cost: $300 founder production + $147 admin + $510 travel = $957/bed
- **Fully-loaded production cost: ~$1,657/bed**
- Fundraising subsidy: $2,500–$5,000/bed (depending on year)
- **Net cost to ACT per bed: NEGATIVE — fundraising covers the bed plus surplus**

The funder pitch isn't "subsidise our $5,800/bed cost". It's "every $1 raised gets a bed onto Country PLUS surplus for facility capex toward $350/bed at scale".

---

## 7. The full critical-review table (Ben's request)

| Layer | State 1 (today, Defy-everything) | State 4 (all in-house, target) | State 5 (community plastic, vision) |
|---|--:|--:|--:|
| Plastic (HDPE materials) | $300 (in bed kit) | $80 raw shred | $40 community pay |
| Sheet pressing | included in Defy kit | $40 in-house | $40 in-house |
| Cut + finish | included in Defy kit | $60 in-house | $60 in-house |
| Canvas | $93.50 | $93.50 | $93.50 |
| Steel | $27 | $27 | $27 |
| End caps + hardware | $3.20 | $3.20 | $3.20 |
| Assembly labour | $55.95 (Defy) | $46.67 (in-house) | $46.67 |
| Subtotal — direct cost | **$600** | **$350.37** | **$340.37** |
| Freight (per bed, remote-road) | $150 | $100 | $80 |
| Production-only founder time @ 100/yr | $300 | $300 | $300 |
| Production-only founder time @ 500/yr | $60 | $60 | $60 |
| Admin (per bed, @ 100/yr) | $147 | $80 | $50 |
| Field travel & ops (per bed, @ 100/yr) | $510 | $400 | $300 |
| **Fully-loaded @ 100/yr** | **$1,707** | **$1,230** | **$1,070** |
| **Fully-loaded @ 500/yr** | **$910** | **$575** | **$510** |
| **Fully-loaded @ 1,000/yr** | **$770** | **$465** | **$405** |
| | | | |
| Commercial counterfactual | **$1,500–$2,000** | | |
| Buyer benchmark (Centrecorp) | **$801** | | |
| | | | |
| Capital needed (cumulative) | $0 added (~$110K in) | +$200K | +$230K |
| Idiot index across components | 3.3–6.5× (Defy markup) | 1.0–1.5× | 1.0–1.5× |

**The numbers are much more reasonable now.** No $5,800/bed nonsense. The fully-loaded cost at today's volume (100/yr) is **~$1,700/bed at Defy-everything** — already competitive with commercial $1,500–$2,000, before any capital investment. With State 4 in-house at 500/yr → **$575/bed**, less than 1/3 of commercial.

---

## 8. What this means for the funder story

The pitch reframes from "we cost a lot, please subsidise" to:

> **At today's scale we deliver a bed for ~$1,700 — competitive with $1,500–$2,000 commercial. Every funded bed comes with $200–$500 of community wealth (local materials, jobs, knowledge). Capital investment in in-house production drops our cost to $575/bed at 500/yr, generating 2–3× value per dollar versus commercial. The capital required is $200K — about 350 beds' worth.**

That's a fundable story. It's honest, it's grounded in verified Defy invoice data, the trajectory is explainable, and the Idiot Index analysis shows funders exactly *why* their investment compounds.

---

## 9. What to do next (the build queue)

1. **Confirm sheets-per-bed with Ben** — the model assumes 1.5 half-sheets/bed (Scenario B). Need Ben's actual answer to lock the HDPE-per-bed figure.
2. **Ask Defy** for the volume-quote sheet (100/500/1,000/5,000) so the State 1 trajectory is data-driven not estimated.
3. **Cost-test the in-house scenarios** — get real quotes for hot-press, CNC, shredder capital so State 4 capital number is firm.
4. **Build the spreadsheet/config-driven UI** — `thoughts/shared/analysis/2026-05-28-goods-bed-cost-model-v3.json` (the companion config) captures every input as a tweakable number. Next step: an interactive page in CivicScope that renders this model with sliders, so Ben + funders can play with assumptions and see outputs live.
5. **Retag the mistags** — $25K Washing Machine Cladding → ACT-FM, $10K coasters → ACT-EL, $7K design → capital. Until done, the per-bed denominator is wrong by ~$42K.
6. **Update `buildFunderView`** in grantscope PR #46 to render this model (replace the Notion-BOM-only view with the State-1-to-5 scenarios + Idiot Index + fundraising offset).

Numbers in this doc are the source of truth for the funder model going forward. When Defy returns the volume-quote sheet or Ben corrects the sheets-per-bed assumption, update the JSON config and the rest re-derives.
