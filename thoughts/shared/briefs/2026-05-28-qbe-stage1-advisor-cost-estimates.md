---
title: Tailored Advisory brief — Production Cost Estimates
program: QBE Catalysing Impact 2026, Stage 1
enterprise: Goods on Country (under A Curious Tractor Pty Ltd; transitioning to gifted DGR charity)
prepared: 2026-05-28
prepared_by: Ben Knight (Founder)
deliverable_due: by 15 August 2026 (4 weeks before QBE Stage 2 submission deadline)
---

# Tailored Advisory brief: Production Cost Estimates

## What you're walking into

Goods on Country (GOC) makes a polyethylene-and-steel bed and a refurbished washing-machine line, built to last in Aboriginal communities where commercial furniture fails inside 12 months. Around 520 beds and 41 washing machines have been delivered into ~96 communities to date. The largest single sale is 107 beds to Centrecorp Foundation at $801/bed.

GOC is applying to QBE Catalysing Impact 2026 Stage 2 (Sept 2026 deadline) for a grant of up to $400K, which must be matched by at least $400K of external investment. Matching capital is most strongly valued by QBE when it is repayable (debt, PRI, or investment) rather than further grants. The cost model has to defend the unit economics + ramp + capital deployment + repayment capability for both a financial Steering Committee and Indigenous-led community partners.

## What we're asking for

A worked-through, defensible Production Cost Model that survives Steering Committee scrutiny on three questions:

1. **What does a bed actually cost to produce**, today and at target volume, across each viable supply path?
2. **How does that cost decay** as volume rises, and what capital investment unlocks each step down?
3. **What margin is available** at $750–$1,000 retail to service matching capital + sustain community co-ops + cover ACT overhead?

Format: revised cost-model JSON + 2–3 page narrative explainer + sensitivity table on the five most load-bearing assumptions.

## Where to start: the existing v5 cost model

We've spent the last 3 months building a verified-from-invoices Bill of Materials and a 4-state supply model. Source files:

- `goods-asset-tracker/v2/src/lib/data/cost-model-scenarios.json` — full v5 model (canonical)
- `goods-asset-tracker/v2/src/lib/data/supplier-quotes.ts` — verified BOM ($469.79 direct materials, Defy Kits path)
- Live interactive explorer: goodsoncountry.com/admin/cost-model
- Raw OCR of all supplier invoices: `act-global-infrastructure/thoughts/shared/analysis/2026-05-28-*.json`

**Verified BOM (do not re-doubt):**
| Component | Cost | Source |
|---|---|---|
| HDPE bed kit (Defy, cut + finished) | $344.05 | INV-1602 + INV-1732 |
| Steel poles | $27.00 | DNA Steel Direct, Alice Springs (Notion BK) |
| Canvas cover | $93.50 | Centre Canvas, 270 covers verified |
| End caps × 4 | $3.20 | Hardware supplier |
| Screws × 16 | $1.04 | Coastal Fasteners RB20247673190 |
| Bolts × 2 (est) | $1.00 | Coastal Fasteners |
| **Direct materials total** | **$469.79** | |

**4 supply paths in v5 (direct cost at current ~100 beds/yr):**
| Path | Direct $ | Margin at $750 | %  |
|---|--:|--:|--:|
| Defy Kits (today's reality) | $534.79 | $215.21 | 29% |
| Defy Panels (worst value) | $584.07 | $165.93 | 22% |
| Factory in-house (proposed target) | $275.74 | $474.26 | 63% |
| Community satellite (vision) | $140.74 | $609.26 | 81% |

**Musk first-principles floor:** $128.99/bed if every input bought at raw market rate. Gap to current ($534.79) = $405.80/bed of supply-chain markup capturable in-house at scale. This is the headline number for the capital-investment case.

## Open revisions the advisor will need to work through

Five known weaknesses in v5 that we surface up-front:

1. **Community state has labour = $0.** The model treats community labour as free. After internal pressure-testing the position is now that community labour should be paid at fair wage ($30–40/hr × 3–4 hrs assembly = $100–160/bed). The community-state direct cost rises from $140.74 to ~$200–240. Still below factory ($275.74); still well below commercial counterfactual ($1,500–$2,000). The hero number framing has to shift from "$140 cheapest" to "honest cost + dignified work + community ownership of margin".

2. **Standalone per-site capex isn't in the model.** v5 shows `capital_added: 30000` for community state, but that's the marginal cost on top of a central factory. The actual question is: what does ONE standalone community kit + site setup cost? Working assumption is $100–150K per site (medium kit: industrial shredder + heated platen press + small CNC + jig + workspace fit-out + 4-week training). We need 3 vendor quotes per major component to lock this.

3. **Production model has shifted from "factory then community" to "community-first (3 sites)".** v5 was built around state_4 factory as target. The current direction is 3 community co-op sites with no central factory. Per-site throughput in v5 is 5 beds/day = ~1,250 beds/yr capacity per site at 100% utilisation. Ramp curve targets: Yr1 150 beds, Yr2 400 beds, Yr3 600 beds.

4. **Demand mix is now segmented.** Cost model has been supply-side only. Demand splits across four–five buyer segments (institutional community-controlled buyers + govt procurement with NT Housing $4B as anchor + corporate RAP procurement + humanitarian + possibly D2C). Each segment has different price points, cycle times, and freight implications that the cost model has not absorbed.

5. **Brokerage / margin waterfall not modelled.** The community-co-op + ACT-support framing means co-ops keep most of the per-bed margin, with ACT taking a brokerage / IP licence / supply chain fee. The defensible rate is between $60–500/bed depending on what ACT actually delivers. Needs to be a slider with a base-case anchor.

## Context the advisor will need

- **Legal entity:** Goods on Country is being established as a gifted DGR charity (separate from A Curious Tractor Pty Ltd). Roadmap landing in the next few months. The model should assume the GOC DGR is the borrower / contracting entity.

- **Founder time modelled at $140K/yr replacement rate**, with sensitivity matrix across 25 / 50 / 75 / 100% FTE. Ben + Nic to confirm actual FTE split.

- **Cashflow buffer policy in 4 states** (NEGATIVE / BELOW_FLOOR / BELOW_TARGET / OK) with defer / slow / accelerate decisions per state. Working capital sizing should respect these states.

- **Three scenario shape** (Base / Upside / Downside) with operational decisions per state and 36-month cashflow troughs. Cost model needs to underpin each scenario.

- **Mistags pending retag** (~$135K of ACT-GD spend that's incorrectly tagged + needs to come out of bed-COGS): Centre Canvas $14,915 mistag, Defy washing-machine cladding $25K, R M Tanner triple-axle $19,950 (different project), Zinus $28,690 (Basket Bed v1 discontinued), etc. Full list in v5 JSON `mistags_to_fix[]`.

- **Open question for Defy:** volume quote at 100 / 500 / 1,000 / 5,000 beds/yr. We are pursuing this externally with Sam at Defy. The current $344.05 HDPE kit price is at ~100/yr volume; we expect material reduction at higher volume.

## What success looks like

By 15 August 2026, the advisor delivers:

1. A validated, community-first cost model (revising the 5 weaknesses above) that ACT can put in front of a CDFI / PRI fund and have it underwritten.
2. A defensible per-bed cost at the 600 beds/yr target across 3 community sites.
3. A brokerage / margin waterfall that lets ACT service ~$400–700K of matching debt without crushing community margin.
4. A sensitivity table showing what breaks if the five most load-bearing assumptions move ±20%.
5. A 1-page narrative we can put in the QBE Stage 2 pitch deck.

## Kick-off

Happy to scope a kick-off call whenever the advisor is ready. Suggested 60 min:
1. Walk through v5 cost model + the 5 open revisions (15 min)
2. Constraints + non-negotiables (15 min) — fair-wage labour, community margin, DGR structure
3. Working agreement + deliverable shape + cadence (15 min)
4. Open questions either side (15 min)

Files we can share on request: full v5 JSON, OCR'd invoice raw data, Defy quote history, Notion BK with supplier data.

---

**Single point of contact:** Ben Knight (ben@actuallyactsforeveryone.com.au / Founder)
**Background reading (optional):** the V4 diagnostic from Mal + Matt; the /impact provenance audit (https://www.notion.so/35eebcf981cf811bb820edfdb4986d52); the AI / Human-in-loop policy (https://www.notion.so/365ebcf981cf812495fcf0781ec7f9c6).
