---
title: Cost model v6 — worked numbers
program: QBE Catalysing Impact 2026, Stage 2
companion_to: 2026-05-29-cost-model-v6-prep.md (the advisor spec) + 2026-05-28-qbe-stage1-advisor-cost-estimates.md
prepared: 2026-05-29
prepared_by: Ben Knight (Founder), via Claude
purpose: Execute the v6 prep spec into actual numbers — the computed model the explorer (and the PIN advisor) consume. Base case + ±20% bands, every figure sourced or flagged.
status: draft for Ben — slot into cost-model-scenarios.json once the live Goods explorer session settles (see §9)
---

# Cost model v6 — worked numbers

This runs the v6 prep spec (`2026-05-29-cost-model-v6-prep.md`) to actual numbers: the revised community state, standalone per-site capex, the utilisation ramp, demand-mix revenue, the margin/brokerage waterfall, debt-service, and the sensitivity table. **It does not change the Goods repo** — a live session was rebuilding the explorer when this was written (cost-model files modified 21:15, 2026-05-29), so these numbers are staged here to slot into `cost-model-scenarios.json` once that settles (§9).

Confidence tags: **Verified** (invoice/first-party) · **Inferred** (modelled from verified inputs) · **Unverified** (needs a quote/decision). The headline economics are Inferred from a Verified BOM; the per-site capex is Unverified pending vendor quotes.

## 1. Headline (base case)
- **Community-state bed, paid fair wage: $270.74 direct** (band $240.74–$300.74). Margin at $750 retail = **$479.26 (64%)** — economic parity with the in-house factory ($275.74 / 63%), but the margin stays in the community.
- **3-site standalone capex: ~$375K** (band $300K–$450K). *Unverified — needs vendor quotes.*
- **3-year volume 1,150 beds** (150/400/600), site utilisation **20% → 53% → 80%**.
- **3-year revenue ~$828K** (band $759K–$1,035K) on the 40/40/20 demand mix.
- **ACT brokerage at base $200/bed services the matching debt 2–8×.** The binding constraints are the *community* margin (the downside shock-absorber) and a **~$100/bed brokerage floor** if carrying the full $500K debt.

## 2. Revised community state (Decision 5 / Weakness 1)
v5 State 5 had labour **and** plastic at $0 → $140.74 direct. v6 pays a fair wage.

| Component | v6 amount | Source / confidence |
|---|--:|---|
| Community-collected plastic | $0.00 | free waste input — *if collection is CDP-funded, that funding is a separate revenue line, not a bed cost* |
| Diesel (generator) | $15.00 | v5, verified context |
| Steel poles | $27.00 | DNA Steel, verified |
| Canvas | $93.50 | Centre Canvas, verified |
| Hardware (caps+screws+bolts) | $5.24 | Coastal Fasteners, verified |
| **Community labour (fair wage)** | **$130.00** | Decision 5: $30–40/hr × 3–4 hrs. Base $130; band $100–$160 |
| **Direct total** | **$270.74** | band **$240.74 – $300.74** |

Margin at $750 retail = **$479.26 (64%)**; band $449.26 (60%) – $509.26 (68%). At the institutional $801 price → $530.26 (66%).

> **Reconciliation:** the prep doc estimated this two different ways (§3 "~$200–240", §4 "~$270–310"). Both were rough. Computed from components it is **$270.74 base** ($240.74–$300.74). v6 uses the computed figure.
>
> **Narrative shift:** the hero number is no longer "$140 cheapest." It is **"economic parity with the factory, margin retained by community, and dignified paid work."** State 5 base ($270.74) is ~$5 *below* State 4 factory ($275.74); only at the top of the labour band (+$160) does it cost ~$25 more — the "dignified-work premium."

## 3. Standalone per-site capex (Decision 7 / Weakness 2) — UNVERIFIED
Decision 4 retires the central factory; each community site is standalone. Indicative kit (needs 3 vendor quotes per line — the gating action):

| Component | Low | Medium | High |
|---|--:|--:|--:|
| Industrial shredder | 15,000 | 20,000 | 25,000 |
| Heated platen press (community-scale) | 50,000 | 65,000 | 75,000 |
| Small CNC router | 15,000 | 18,000 | 22,000 |
| Jigs + workbench + tools | 5,000 | 6,000 | 8,000 |
| Workspace fit-out (power, shelter) | 10,000 | 12,000 | 15,000 |
| 4-week training | 5,000 | 4,000 | 5,000 |
| **Per-site total** | **$100,000** | **$125,000** | **$150,000** |
| **× 3 sites** | **$300,000** | **$375,000** | **$450,000** |

vs v5 single-factory $112K–$222K → the 3-site standalone case is **1.5–2×** the single facility. That is the capital trade-off the model must make legible: 3× the resilience/sovereignty/jobs for ~1.7× the capex.

## 4. Volume ramp + utilisation (Decision 8 / Weakness 3)
Community-site sustainable throughput assumed at **~250 beds/yr/site** (≈1 bed/day, part-time community labour + training — *deliberately lower than the factory's 5/day=1,250/yr; flag as a modelling assumption to confirm*).

| Year | Beds | Per site (÷3) | Utilisation |
|---|--:|--:|--:|
| 1 | 150 | 50 | **20%** |
| 2 | 400 | 133 | 53% |
| 3 | 600 | 200 | 80% |

Year-1 20% is the hardest cell to defend (site setup + training + demand ramp). **Alternative framing for the pitch:** open sites sequentially (1 → 2 → 3) so each *active* site runs at higher utilisation earlier — same totals, a more defensible per-site story. Flag for the advisor.

## 5. Demand mix + 3-year revenue (Decision 9 / Weakness 4)
40% institutional procurement / 40% retail-corp gift / 20% community, applied to each year's volume.

| Segment | 3yr beds | Base price | Source / confidence |
|---|--:|--:|---|
| Institutional procurement | 460 | $801 | Centrecorp INV-0291 (107 @ $85,712), **verified** anchor |
| Retail-corp RAP gift | 460 | $800 | gift-shaped $750–$1,500; base held at $800, **biggest unknown** |
| Community / humanitarian | 230 | $400 | subsidised effective $300–500, inferred |

**Revenue by year** (base prices):

| Year | Inst | Gift | Community | Year total |
|---|--:|--:|--:|--:|
| 1 (150) | $48,060 | $48,000 | $12,000 | $108,060 |
| 2 (400) | $128,160 | $128,000 | $32,000 | $288,160 |
| 3 (600) | $192,240 | $192,000 | $48,000 | $432,240 |
| **3yr** | **$368,460** | **$368,000** | **$92,000** | **$828,460** |

Band: **$759K** (all segments low) – **$1,035K** (gift at $1,200). Cross-checks the prep doc's $690–920K — base $828K sits inside; the upside only clears $920K if corporate RAP gift prices land high (triangulate against RAP procurement benchmarks).

## 6. Margin / brokerage waterfall (Decision 6 / Weakness 5)
Per bed at an **institutional $801 sale**, base case, community production:

```
Sale price                          $801.00
  − COGS (community direct, base)   $270.74   (incl $130 community labour)
  − Freight (remote delivery, est)  $100.00
  = Landed margin available         $430.26
      → ACT brokerage (slider, base $200)     $200.00   → ACT (covers overhead + debt service)
      → Cashflow buffer (4-state policy)       $30.00
      → Community co-op margin (retained)     $200.26   → community
```

**Community total benefit/bed = $130 labour + $200.26 co-op margin = $330.26.** ACT/bed = $200 brokerage. The "community keeps the margin" claim holds: community captures ~$330 of every $801 institutional sale; ACT takes ~$200 to fund coordination + repay capital.

## 7. Debt-service check
Only the revenue-generating segments (institutional + gift = 80% of volume) pay brokerage; the 20% community/humanitarian is subsidised by that cross-flow + grants.

| Case | Y3 rev beds | ACT brokerage income | Debt service ($250–500K @ 5–7%) | Coverage |
|---|--:|--:|--:|--:|
| Base ($200/bed) | 480 | $96,000/yr | $12,500–$35,000 | 2.7×–7.7× |
| Volume −20% | 384 | $76,800/yr | $12,500–$35,000 | 2.2×–6.1× |
| Thin brokerage ($60) + vol −20% | 384 | $23,040/yr | $12,500–$35,000 | 0.66×–1.8× |

**Finding — brokerage floor:** to service the *full $500K* debt at downside volume, brokerage must be **≥ $35,000 / 384 = ~$91/bed**. The $60 "thin coordination fee" only works with ≤$250K of debt. **Set the brokerage base no lower than ~$100/bed if carrying the full $500K matching tranche.**

## 8. Sensitivity (§6 dials) + the 3-way downside
Each dial ±20% on the base, then the joint downside.

| Dial | Base | −20% | +20% | What moves |
|---|--:|--:|--:|---|
| Volume Y3 | 600 | 480 | 720 | ACT income $96K → $76.8K / $115.2K |
| Community labour | $130 | $104 | $156 | Community direct $270.74 → $244.74 / $296.74 |
| Institutional price | $801 | $641 | $961 | Landed margin $430 → $270 / $590 per inst bed |
| Per-site capex | $125K | $100K | $150K | 3-site ask $375K → $300K / $450K |
| Defy HDPE kit | $344 | $275 | $413 | **Affects Defy paths (2/3) only — NOT community State 5** |

> **Insight:** the Defy HDPE kit dial has **zero effect on the community state** (it uses free collected plastic). At community scale the model **decouples from Defy supply-chain pricing** — a structural de-risking, not just a cost saving.

**3-way joint downside (volume −20%, institutional price −20%, labour +20%):**
- Landed margin/inst bed = $641 − $296.74 − $100 = **$244.26**.
- ACT brokerage $200 + buffer $30 → **community co-op margin collapses to ~$14/bed**.
- ACT debt is still serviced ($76.8K > $35K), **but the community is the residual claimant that absorbs the shock.**
- **Finding — the brokerage slider must flex DOWN in a downside.** A fixed $200 brokerage protects ACT and crushes the community in the joint downside. For an equity-aligned, underwritable model, brokerage should be a **downside-flexing instrument** (e.g. step to ~$100 when margin/bed falls below a floor), so community margin doesn't go to zero. This is the single most important design point for both the CDFI underwriter (debt still serviced) and the community partners (margin protected).

## 9. How this slots into the explorer (for when the live session settles)
Add to `Goods Asset Register/v2/src/lib/data/cost-model-scenarios.json` (+ the `.ts` mirror), no breaking schema changes:
- `build_states.state_5_community` → revise: labour `$130` (banded), direct `270.74`; keep `state_4_factory` as comparator.
- New `standalone_site_capex` → low/med/high per-site + ×3 (§3).
- New `volume_ramp_v6` → 150/400/600 + per-site capacity 250 + utilisation 20/53/80 (§4).
- New `demand_mix` → 3 segments, prices, 3yr beds + revenue (§5).
- New `margin_waterfall` → the §6 tree with the `act_brokerage` slider (default 200, range 60–500) + a `downside_flex` flag.
- New `debt_service` → the §7 table + the ~$100/bed floor.
- Revise `sensitivity`/add the §8 table incl. the 3-way downside.
- `meta.version` → `v6`, `supersedes` → v5.

## 10. Inputs that tighten this (still open)
- **Defy volume quote** (100/500/1k/5k) — only moves Defy-path states; community state is already decoupled. Lower priority than the prep doc implied.
- **3 vendor quotes per per-site capex line** — the one Unverified block (§3); the gating item for the capital ask.
- **Corporate RAP gift price** — the biggest revenue unknown (§5); triangulate vs RAP procurement benchmarks.
- **The 6 Ben sanity-check calls** (prep doc §5) — borrower entity (GOC DGR vs Pty) changes tax treatment; the rest are framing.
- **Community-site throughput (250/yr)** and **freight ($100/bed)** — modelling assumptions to confirm.

## 11. Confidence ledger
| Claim | Confidence | Basis |
|---|---|---|
| Community direct $270.74 (band $240–301) | Inferred | v5 verified BOM + Decision 5 labour band |
| Margin parity with factory | Inferred | computed vs v5 State 4 $275.74 |
| 3-site capex $300–450K | **Unverified** | needs vendor quotes (§3) |
| Utilisation 20/53/80% | Inferred | Decision 8 ÷ assumed 250/site capacity |
| 3yr revenue $828K (band $759K–$1,035K) | Inferred | Decision 9 mix × Centrecorp $801 verified anchor + held gift/community prices |
| Waterfall (community $330 / ACT $200 per inst bed) | Inferred | §6 from base inputs |
| Brokerage floor ~$100/bed for $500K debt | Inferred | §7 downside arithmetic |
| Brokerage must flex down in downside | Inferred (load-bearing) | §8 joint-downside arithmetic |
| Centrecorp $801/bed | Verified | INV-0291 |
| BOM $469.79 / community BOM lines | Verified | invoices (see prep doc §2a) |
