---
title: Cost model v6 — advisor prep doc
program: QBE Catalysing Impact 2026, Stage 2
companion_to: 2026-05-28-qbe-stage1-advisor-cost-estimates.md
prepared: 2026-05-29
prepared_by: Ben Knight (Founder), via Claude
purpose: Single technical handoff the Production Cost Estimates advisor can pick up cold without needing the V4 diagnostic, the /grill-me transcript, or the brief separately.
status: ready for advisor kickoff (after Ben sanity-checks the 6 flagged calls in the companion brief)
---

# Cost model v6 — what the advisor is working from

## 1. The shape of the job

v5 is verified-from-invoices for the supply side. v6 lifts it to a **community-first, 3-site, demand-aware, repayable-capital-ready** model that holds up under QBE Steering Committee + CDFI/PRI underwriting scrutiny. v6 is not a rewrite. It revises 5 known v5 weaknesses, absorbs 11 strategic decisions already locked, and lands a 3-sensitivity deliverable.

The Stage 2 pitch needs to defend three things end-to-end: per-bed cost at ramp, the capital case for the step-down between paths, and the margin waterfall that lets ACT service ~$400K-$700K of matching debt without crushing community margin.

## 2. v5 baseline (anchors. do not redo.)

Everything in this section is verified from invoices or otherwise confidence-tagged. The advisor should treat these as load-bearing constants and revise them only with a stronger source.

### 2a. Bill of materials, per bed (Defy Kits path, today's reality)

| Component | Cost | Source | Confidence |
|---|--:|---|---|
| HDPE bed kit (Defy, cut + finished) | $344.05 | Defy INV-1602 + INV-1732 | verified |
| Steel poles | $27.00 | DNA Steel Direct, Alice Springs (Notion BK) | verified |
| Canvas cover | $93.50 | Centre Canvas (270 covers across 3 invoices 2026) | verified |
| End caps × 4 | $3.20 | Hardware supplier ($0.80 ea) | verified |
| Screws × 16 | $1.04 | Coastal Fasteners RB20247673190 ($0.065 ea) | verified |
| Bolts × 2 | $1.00 | Coastal Fasteners ($0.50 est) | inferred |
| **Direct materials total** | **$469.79** | | |

Defy assembly labour is $55.95/bed (2026-03-19 line, verified). Defy delivery is $0.75/kg verified from INV-1731 ($900 / 1200kg).

### 2b. The four supply paths (v5)

Direct cost per bed at ~100/yr volume, then margin at $750 retail:

| Path | Direct $ | Margin @ $750 | % | Capital added | Capital cumulative | Beds/day |
|---|--:|--:|--:|--:|--:|--:|
| State 2: Defy Kits (today) | $534.79 | $215.21 | 29% | $2,000 | $2,000 | 10 |
| State 3: Defy Panels | $584.07 | $165.93 | 22% | $38,000 | $40,000 | 4 |
| State 4: Factory in-house (v5 target) | $275.74 | $474.26 | 63% | $160,000 | $200,000 | 4 |
| State 5: Community (v5 vision, **needs rework**) | $140.74 | $609.26 | 81% | $30,000 | $230,000 | 5 |

State 5 is the one v6 must rework. See §3, decision 5.

### 2c. Musk first-principles floor

What a bed could cost if every input was bought at raw-market rate:

| Element | Qty | Raw rate | Cost |
|---|---|---|--:|
| HDPE plastic raw shred | 20 kg | $2/kg | $40.00 |
| Galvanised steel pipe raw | 1.88 m | $5.50/m | $10.34 |
| Cotton 12oz canvas raw | 2.1 m | $15-20/m | $35.00 |
| End caps bulk | 4 | $0.50 ea | $2.00 |
| Screws + bolts | 16 + 2 | $0.065 + $0.30 ea | $1.65 |
| Operator labour @ 10 beds/day | 0.1 day | $400/day | $40.00 |
| **Floor per bed** | | | **$128.99** |

Current Defy-kit direct = $469.79. **Gap = $340.80/bed of supply-chain markup capturable in-house at scale.** That is the headline capital-investment case.

The Idiot Index by line shows where the capital case actually pays off: HDPE plastic kit at index 8.6 (biggest), Defy panels at 10.0 (worst — buy raw shred or finished kits, never panels), canvas at 2.1-2.9, steel at 1.8-2.6, hardware ~1.0. Shred + press + CNC in-house is the lever; everything else is rounding.

### 2d. Overhead per volume (v5)

| Volume | Kirmos $ | Founder prod $ | Admin $ | Field travel $ | Long-haul freight $ | Overhead total |
|---|--:|--:|--:|--:|--:|--:|
| 100/yr (today) | 270 | 300 | 147 | 510 | 150 | $1,377 |
| 500/yr (v5 target) | 54 | 60 | 29 | 100 | 100 | $343 |
| 1,000/yr (v5 vision) | 27 | 30 | 15 | 50 | 80 | $202 |

### 2e. Capex to reach State 4 (v5)

| Asset | Low | High |
|---|--:|--:|
| Shredder | $15,000 | $30,000 |
| Hot press line | $80,000 | $150,000 |
| CNC router | $15,000 | $40,000 |
| Workbench + tools | $2,000 | $2,000 |
| **Capex total** | **$112,000** | **$222,000** |
| Already invested (facility) | $100,000 | $100,000 |
| Already invested (Carbatec tooling) | $10,046 | $10,046 |
| **New capital ask** | **$90,000** | **$200,000** |

v6 has to either rework this to 3-site standalone capex, or stack standalone-site capex on top of it. See §3, decision 7.

### 2f. Founder time allocation (v5)

$1,000/day × 150 days/yr split: 30 days production-related → bed overhead. 50 days fundraising → funding-side offset. 25 days commercialisation → funding-side offset. 45 days governance/strategy/comms/brand → ACT-wide overhead. Sensitivity matrix across 25/50/75/100% FTE pending Ben + Nic to confirm actual split.

### 2g. The counterfactual

Commercial steel-frame bed in remote AU 2026 = $1,500-$2,000 (inferred, retail furniture / contract supply market scan). Goods at any state beats this. The bed is not the question. The question is whether the unit economics service repayable capital while keeping community margin.

## 3. The 11 grill decisions that revise v5

These are locked. The advisor should treat them as constraints, not as choices.

| # | Decision | Choice | Implication for v6 |
|---|---|---|---|
| 1 | Cost-model purpose | Defends QBE Stage 2 pitch (±10% BOM precision, ±20% volume) | The model is a funder-grade artifact, not internal ops |
| 2 | QBE position in stack | $400K **grant** (not repayable), catalytic, ≥1:1 matched | Match capital is the repayable layer the model must support |
| 3 | Capital stack size | Medium: $1.5M-$2.5M total (QBE = 16-27% of stack) | Model the stack at $1.5M and $2.5M as bracketing scenarios |
| 4 | Production model | **Community satellite, 3 sites, no central factory** | State 5 is the canonical case. State 4 retires as primary target. See §4 weakness 3 |
| 5 | Community labour | **Paid fair wage**, $30-40/hr × 3-4 hrs ≈ $100-160/bed | State 5 direct cost rises from $140.74 to ~$200-240. See §4 weakness 1 |
| 6 | Margin ownership | Community co-op + ACT support. Co-op keeps the per-bed margin. ACT takes brokerage/IP/supply-chain fee | Margin waterfall is a model output, not a single number. See §4 weakness 5 |
| 7 | Per-site capex | Medium kit ~$100-150K per site → 3 sites = $300-450K | Standalone, not marginal. See §4 weakness 2 |
| 8 | Volume ramp | **150 → 400 → 600 beds/yr** across years 1-3 (1,150 over 3yr) | This replaces the v5 100/500/1,000 ramp |
| 9 | Demand mix | 40% institutional procurement / 40% retail-corp gift / 20% community. Supports $690-920K cash revenue across 3yr | Each segment has different price points, cycle times, and freight implications. See §4 weakness 4 |
| 10 | ACT brokerage rate | Modelled as a slider $60-$500/bed. Lock once co-funder requirements are known | Default base case is in there as a placeholder, not a recommendation |
| 11 | Impact-measurement framework | Indigenous-led / community-defined (Lowitja, IDS) with a translation layer for non-specialist Steering Committee | The cost model doesn't carry impact metrics, but the deliverable narrative does need the translation layer |

## 4. Five v5 weaknesses for v6 to close

These mirror the advisor brief but are spelled out with the model surface they touch.

### Weakness 1: Community state has labour = $0

v5 `state_5_community.components` has `Labour (volunteer / CDP / community) = $0.00` and `Community-collected plastic = $0.00`. After decision 5, community labour pays fair wage. v6 changes:

- Replace `Labour ($0)` with `Labour ($100-160/bed)` as a banded line. Pick base $130 for the headline model.
- Community-collected plastic stays at $0 only if there is a CDP / volunteer collection path. If volunteers are getting community-economic-development funding for the plastic collection, that's not free, that's a separate revenue line. v6 should make this explicit.
- Direct total: $140.74 → ~$270-310 (band). Margin at $750 retail drops from 81% to ~58-64%. Still beats State 4 ($474.26 / 63%) only at the low end of the labour band.
- **The hero number framing shifts** from "$140 cheapest" to "honest cost + dignified work + community ownership of margin". This is a narrative call as much as a model call.

### Weakness 2: Standalone per-site capex isn't in the model

v5 `state_5_community.capital_added: 30000` is the marginal cost on top of a central factory. Decision 4 retires the central factory. v6 needs:

- A new section `standalone_site_capex` with low/medium/high kits.
- Working assumption (verify with vendor quotes): medium kit = $100-150K per site. Components: industrial shredder, heated platen press, small CNC, jig, workspace fit-out, 4-week training.
- 3 sites = $300-450K capex up-front.
- Compare against v5's `capex_required_to_reach_state_4.total_low/high` = $112-222K (single facility). The standalone case is 1.5-2x the single-factory case. That's the trade-off the model has to make legible.

### Weakness 3: Production model has shifted to community-first

v5 was built around State 4 factory as the target. Decision 4 inverts this. v6 changes:

- State 4 retires as primary scaling path. Keep it as a comparator / fallback only.
- State 5 (revised per weakness 1) becomes the canonical scaling path.
- Per-site throughput in v5 is 5 beds/day, equivalent to ~1,250 beds/yr at 100% utilisation. Ramp targets (decision 8) are 150/400/600 across 3 sites — that's well below per-site capacity, which means the model needs a **utilisation curve**, not a throughput cap.
- The Year-1 case (150 beds across 3 sites = ~50 beds/site/yr ≈ 20% utilisation) is the hardest cell to defend. v6 must show what's driving low Year-1 utilisation and how it ramps.

### Weakness 4: Demand mix isn't in v5

v5 is supply-side only. Decision 9 names the segments. v6 needs:

| Segment | % of volume | Indicative price | Cycle time | Freight footprint |
|---|--:|---|---|---|
| Institutional procurement (Centrecorp benchmark) | 40% | $750-$801 | 90-180 days | Anchor delivery (low $/bed) |
| Govt procurement (NT Housing $4B remit, IAS, ABA) | (subset of 40%) | TBD, expect $700-1,200 | 180-365 days, contract | Multi-site freight |
| Corporate RAP procurement | 40% | $750-$1,500 gift-shaped | 60-120 days | Could be city-staging |
| Humanitarian / community | 20% | Subsidised, ~$300-500 effective | Ad hoc | High $/bed (low-volume + remote) |
| D2C (optional) | 0-5% | $1,500-$2,000 | E-comm | High $/bed retail logistics |

Revenue benchmark: Centrecorp = $801/bed (107 beds @ $85,712, INV-0291, verified). Use this as the institutional anchor. Corporate RAP gift price is the biggest unknown; the advisor should triangulate against current RAP procurement spend benchmarks.

Decision 9 supports $690-920K cash revenue across 3yr. v6 must make that triangulation explicit so the advisor can stress-test it.

### Weakness 5: Brokerage / margin waterfall not modelled

The community-co-op + ACT-support framing means the per-bed margin tree branches. v6 needs:

```
Retail price ($750-$1,500)
  ├── COGS (Bill of Materials + freight + community labour)
  ├── Community co-op margin (retained)
  ├── ACT brokerage / IP / supply-chain fee ($60-$500/bed slider)
  └── Buffer (cashflow per the 4-state policy)
```

ACT brokerage is the slider. $60/bed is "thin coordination fee only". $500/bed is "ACT does sales, logistics, customer relationship, brand, training and ongoing support". The defensible rate depends on what ACT actually delivers and what the co-funder requires for repayment. v6 picks a base case (suggest $200/bed for a balanced split), then shows the sensitivity in §6.

The waterfall must support the debt-service question: at 600 beds/yr × $200 ACT brokerage = $120K/yr to ACT. At $250K-$500K of matching debt with 5-7% effective cost = $12.5-35K/yr service. The brokerage covers it. v6 has to make that math survive 80% utilisation downside.

## 5. Six calls flagged for Ben to sanity-check before advisor kickoff

These are in the companion advisor brief (`2026-05-28-qbe-stage1-advisor-cost-estimates.md`). They affect v6 framing.

1. **Soften or keep the "5 known weaknesses" framing in the brief.** The candid framing builds advisor trust; could read as fragility to a non-Goods reader.
2. **Confirm GOC DGR is the borrower/contracting entity for v6.** v6 assumes this. If the Pty Ltd is borrower instead, the model needs a tax-treatment delta.
3. **Confirm Centrecorp tranche-2 + the philanthropic partner ranking** in the hackathon brief. Affects the demand-mix anchor (§4 weakness 4).
4. **Hackathon day shape** — Social Impact Hub may have their own structure.
5. **Confirm Ben's email** — drafts used `ben@actuallyactsforeveryone.com.au` and need verification.
6. **Cross-check the 6 priority area names** against the V4 diagnostic. v6 narrative should align to V4 language.

## 6. Five sensitivity dials for the v6 deliverable

The Steering Committee + CDFI underwriter will stress-test the model. v6 must include a sensitivity table on the five most load-bearing assumptions. Each ±20% on its own, plus a 3-way joint downside.

| Dial | Base case | -20% / +20% | What breaks |
|---|---|---|---|
| Volume Year-3 | 600 beds | 480 / 720 | Utilisation, overhead per bed, debt service |
| Community labour rate | $130/bed | $104 / $156 | State 5 margin, community share |
| Institutional price | $801/bed | $641 / $961 | Top-line revenue, brokerage |
| Per-site capex | $125K | $100K / $150K | Capital ask, runway |
| Defy HDPE kit at volume | $344.05 | $275 / $400 | Direct COGS at ramp |

The 3-way joint downside (volume -20%, price -20%, labour +20%) is the one that matters. If v6 survives this, it's underwritable.

## 7. Open questions for Defy (Ben → Sam)

Existing v5 list (verbatim):

1. Volume quote at 100 / 500 / 1,000 / 5,000 beds/yr. What does $344.05/bed kit become?
2. Build-to-supply: cheaper if ACT sources steel (DNA Steel) + canvas (Centre Canvas) direct and supplies to Defy for kit-assembly only?
3. In-house assembly payback: at what volume does taking the $55.95/bed assembly in-house pay back the $90K-$200K capex?
4. Confirm INV-1731 freight (3 × $450 = $1,350) Sydney → Sunshine Coast for 1200kg shred + 20 panels.

v6 cannot lock material economics at volume without (1). The model can ship in the ±20% sensitivity band and tighten when the quote lands.

## 8. Mistags to retag (clean before reporting)

v5 carries a `mistags_to_fix[]` list. About $135K of ACT-GD spend is incorrectly tagged. The retag is queued as a Tier 2 work session. v6 reporting should note that the underlying Xero ACT-GD spend total ($424,620 against 253 bills with attachments, live) is **pre-retag**.

Key mistags affecting bed COGS:

| Item | Amount | Current | Correct |
|---|--:|---|---|
| Centre Canvas (3 bills) | $14,915 | ACT-IN | ACT-GD |
| Defy Washing Machine Cladding | $25,000 | ACT-GD | ACT-FM |
| Defy Coasters | $10,000 | ACT-GD | ACT-EL |
| Defy Design/R&D | $7,000 | ACT-GD bed-COGS | ACT-GD capital/R&D |
| Utopia trip flights/accom | $24,507 | ACT-IN | ACT-GD |
| 1300 Washer | $13,980 | ACT-GD | ACT-FM |
| Carla Furnishers duplicate | $11,180 | ACT-GD | VOID DUPLICATE |
| R M Tanner Triple Axle | $19,950 | ACT-GD | Different project |
| Zinus Australia (Basket Bed v1) | $28,690 | ACT-GD | ACT-GD-archive |

Net effect on ACT-GD bed-COGS after retag: estimated **-$70K to -$90K** (washing-machine, Coasters, R&D, retail-furniture moves out; canvas + Utopia moves in). v6 needs to use the post-retag number, or hold a clear "pre vs post retag" reconciliation.

## 9. What "done" looks like (advisor deliverable, by 15 August 2026)

1. v6 cost-model JSON in the same shape as `cost-model-scenarios.json`, additions slotted into the existing keys, no breaking schema changes (the explorer at goodsoncountry.com/admin/cost-model reads this file).
2. A 2-3 page narrative explainer the advisor signs.
3. The §6 sensitivity table.
4. A 1-page narrative for the QBE Stage 2 pitch deck.
5. A 1-page brokerage/margin waterfall the CDFI/PRI underwriter can read in 5 minutes.

## 10. Provenance + linked artifacts

- **v5 cost model (canonical):** `Goods Asset Register/v2/src/lib/data/cost-model-scenarios.json`
- **Verified BOM:** `Goods Asset Register/v2/src/lib/data/supplier-quotes.ts`
- **Interactive explorer:** goodsoncountry.com/admin/cost-model
- **Raw OCR of supplier invoices:** `thoughts/shared/analysis/2026-05-28-*.json`
- **Cost-evidence funder-artifact plan:** `thoughts/shared/plans/2026-05-28-goods-cost-evidence-funder-artifact.md`
- **Grill-session handoff:** `thoughts/shared/handoffs/2026-05-28-qbe-cost-model-grill-session.md`
- **Stage 1 advisor brief (companion to this doc):** `thoughts/shared/briefs/2026-05-28-qbe-stage1-advisor-cost-estimates.md`
- **QBE deal-structure memory:** `~/.claude/projects/-Users-benknight-Code-act-global-infrastructure/memory/qbe-catalysing-impact-2026.md`
- **/impact provenance audit:** https://www.notion.so/35eebcf981cf811bb820edfdb4986d52
- **AI / Human-in-loop policy:** https://www.notion.so/365ebcf981cf812495fcf0781ec7f9c6
- **V4 diagnostic (Social Impact Hub, Mal + Matt):** PDF supplied separately by Ben

## 11. Confidence ledger

| Claim | Confidence | Source |
|---|---|---|
| BOM at $469.79 direct materials | Verified | Invoices INV-1602/INV-1732, Centre Canvas 3 bills, Coastal Fasteners, DNA Steel Notion |
| Musk floor at $128.99/bed | Inferred (raw-rate components verified, blend is a model) | v5 first_principles_floor |
| State 4 capex $112-222K | Inferred (vendor band, no quote per component yet) | v5 capex_required_to_reach_state_4 |
| State 5 community at fair wage = $270-310 direct | Inferred (decision 5 + v5 BOM) | This doc, §4 weakness 1 |
| Standalone site capex $100-150K | **Unverified** — needs 3 vendor quotes per kit component | This doc, §4 weakness 2 |
| 3-yr revenue $690-920K | Inferred from decision 9 demand mix + Centrecorp $801 anchor | Grill handoff |
| Counterfactual $1,500-$2,000 | Inferred (mid-2026 AU retail/contract supply scan) | v5 counterfactual |
| Founder time $140K/yr replacement rate | Inferred (Ben's reply to Mal + Matt) | Grill reality-check section |
| Centrecorp $801/bed | Verified | INV-0291 (107 beds @ $85,712) |

Anything in this doc tagged "verified" is sourceable to an invoice or first-party document. Anything "inferred" needs the advisor to either confirm or revise during v6.

---

**Single point of contact:** Ben Knight (Founder).
**Next step:** Ben sanity-checks the 6 calls in §5, then sends this + the companion brief to the Tailored Advisory provider (PIN) for kickoff scoping.
