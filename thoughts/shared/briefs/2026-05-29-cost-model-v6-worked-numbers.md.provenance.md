---
title: "Cost model v6 worked numbers — Provenance"
status: Generated
date: 2026-05-29
type: provenance
tags: [provenance, finance, qbe, cost-model, goods, audit]
---

# Cost model v6 worked numbers — Provenance

## Purpose
- Output: computed v6 cost model (base + ±20% bands) — `2026-05-29-cost-model-v6-worked-numbers.md`
- Intended destination: QBE Catalysing Impact 2026 Stage 2 pitch + PIN advisor kickoff + (later) `cost-model-scenarios.json` in the Goods explorer
- Why generated: Ben chose to advance cost-model v6; the live explorer was being rebuilt by a concurrent session (Goods repo files modified 21:15, 2026-05-29), so v6 was computed here collision-free instead of edited into the explorer

## Data Sources Queried
| Source | Type | Snapshot | How used |
|---|---|---|---|
| `Goods Asset Register/v2/src/lib/data/cost-model-scenarios.json` | v5 model (read-only) | working-tree at 2026-05-29 (note: had uncommitted edits) | v5 BOM, states, capex, overhead anchors |
| `thoughts/shared/briefs/2026-05-29-cost-model-v6-prep.md` | advisor spec | committed 890389d | the 11 decisions, 5 weaknesses, sensitivity dials |
| `thoughts/shared/handoffs/2026-05-28-qbe-cost-model-grill-session.md` | decision record | committed | locked decisions + reality-check |
| Centrecorp INV-0291 | invoice | verified (107 beds @ $85,712 = $801/bed) | institutional revenue anchor |

## Verification Status
- `Verified:` the BOM ($469.79 direct), community-state component costs (steel/canvas/hardware/diesel), and the Centrecorp $801/bed institutional anchor — all invoice-sourced (see worked-numbers §11).
- `Inferred:` the community-state revised total ($270.74), 3yr revenue ($828K), the margin waterfall, debt-service coverage, the brokerage floor (~$100/bed) and the downside-flex finding — all **computed** from verified inputs + the locked decisions. Arithmetic is shown inline and reproducible by hand.
- `Unverified:` standalone per-site capex ($100–150K/site) — needs 3 vendor quotes per component (the gating action). Corporate RAP gift price ($800 base) — biggest revenue unknown. Community-site throughput (250/yr) and freight ($100/bed) — modelling assumptions to confirm.

## Known Gaps And Assumptions
- The v5 JSON read had uncommitted edits from the concurrent explorer session; v5 anchors (BOM, states) are stable enough that this doesn't change v6, but the exact v5 baseline should be re-confirmed against the committed state before slotting v6 into the explorer.
- The prep doc gave two inconsistent estimates for the revised community state ($200–240 vs $270–310); v6 resolves to the computed $270.74 (§2 reconciliation).
- Community-site capacity (250 beds/yr/site) is set deliberately below the factory's 1,250/yr to reflect part-time community ops — an assumption, not a measurement.
- Borrower entity assumed GOC DGR (per prep doc); if the Pty Ltd borrows instead, a tax-treatment delta applies.

## Reproduction Steps
1. Read v5 anchors from `cost-model-scenarios.json` (committed state) + the 11 decisions from the v6 prep doc.
2. Community state: v5 $140.74 + fair-wage labour band ($100/$130/$160) → $240.74/$270.74/$300.74.
3. Revenue: 1,150 beds × 40/40/20 mix × segment prices ($801/$800/$400 base), by year on the 150/400/600 ramp.
4. Waterfall: $801 − community direct − $100 freight, split brokerage($200)/buffer($30)/community-margin(residual).
5. Debt service: revenue beds (80% of volume) × brokerage vs $250–500K @ 5–7%; solve the brokerage floor at downside volume.
6. Sensitivity: ±20% per dial; 3-way joint downside (vol −20%, price −20%, labour +20%).

## Linked Artifacts
- Output: `thoughts/shared/briefs/2026-05-29-cost-model-v6-worked-numbers.md`
- Advisor spec: `thoughts/shared/briefs/2026-05-29-cost-model-v6-prep.md`
- Slot-in target (when explorer session settles): `Goods Asset Register/v2/src/lib/data/cost-model-scenarios.json`
- QBE deal memory: `~/.claude/.../memory/qbe-catalysing-impact-2026.md`
