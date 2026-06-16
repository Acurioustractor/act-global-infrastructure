# QBE cost-model send package — 2026-06-10

**For:** Matt Allen (Social Impact Hub, production-cost model) + Malcolm Aikman (QA), per Jay Boolkin's 1 June request.
**Source of truth:** `Goods Asset Register/v2/src/lib/data/cost-model-scenarios.json` (meta.version **v6**, supersedes v5) — the same numbers as `thoughts/shared/briefs/2026-05-29-cost-model-v6-worked-numbers.md`.
**Regenerate after any model change:** `python3 build-package.py` (rebuilds the xlsx + csv/ from the JSON; the HTML tool carries the same base numbers inline — update its `NONLABOUR` constant + reference table if the BOM changes).

## What's in the package

| File | What it is | How the recipients use it |
|---|---|---|
| `goods-cost-model-v6.xlsx` | 9-tab workbook, **formula-live** (yellow cells = editable assumptions; totals/coverage recalculate) | Matt's working artifact — he can flex labour, prices, brokerage, debt terms and see everything move |
| `csv/` (8 files) | The same tables, machine-readable | For rebuilding in their own model |
| `goods-bed-cost-explorer.html` | Self-contained interactive tool (no install, no internet — open in any browser) | The conversation artifact — sliders for the 5 sensitivity dials + brokerage flex + amortising-vs-interest-only toggle; shows the load-bearing downside finding live |
| `email-draft-matt-allen.md` | Draft cover email | Ben to review, adjust, send |

## Why this shape (how advisors engage with data)

- **Excel is the lingua franca** — a finance advisor will not adopt our app; they will rebuild in their own workbook. Live formulas + labelled assumption cells means they can audit the logic, not just the outputs.
- **CSVs** remove transcription friction for whatever they build.
- **The HTML explorer is for the meeting, not the model** — it makes the two binding constraints (community margin floor, debt-coverage) visceral in 30 seconds, including the v6 load-bearing finding that a fixed brokerage crushes the community in the joint downside.
- **Everything carries the QBE claim taxonomy** (verified / inferred / unverified) so nothing in the pack can be quoted beyond its evidence.

## Sanity-check findings (2026-06-10, full arithmetic pass)

**Verified clean:** every v6 table ties — build-state BOM sums, demand-mix revenue ($828,460 = segment prices × ramp beds, year by year), waterfall ($801 − 270.74 − 100 − 200 − 30 = 200.26), debt coverage (96,000/35,000 = 2.74×), the 3-way downside (~$14/bed community margin), brokerage floor (35,000/384 = $91).

**Findings to hold in mind (all disclosed in the workbook READ ME):**
1. **Amortisation gap (the big one).** v6's coverage table is interest-only. $500K amortised over 5 yrs ≈ $122K/yr vs $96K/yr base brokerage income → coverage < 1×. Disclosed on sheet 6 with a live amortising formula. Repayable matching capital needs patient/bullet terms, longer tenor, or a smaller debt slice. Better we surface it than Mal finds it.
2. **3-site capex ($300–450K) is UNVERIFIED** — vendor quotes are the gating action (3 quotes per kit line).
3. **Freight base $100/bed sits at the bottom of the verified range** ($101–185/bed implied by Defy pallet lines, 8 beds/pallet Botany→Alice).
4. **Per-site throughput 250 beds/yr is an assumption**, not a demonstrated rate; Year-1 20% utilisation is the hardest cell to defend — sequential site-opening tells the same totals more defensibly.
5. **Corporate-RAP gift price ($800) is the biggest revenue unknown** — 40% of modelled revenue has no anchor.
6. **Xero mis-tags (~$155K across 10 lines, sheet 8) must be fixed before any "actual delivered unit cost (last 50 beds)" extract** — QBE's stated mandatory artifact. The current ACT-GD ledger overstates bed COGS (washer cladding, coasters, Carbatec, a duplicate) and understates it (Centre Canvas, Utopia freight mis-tagged elsewhere).
7. **Superseded numbers still live in two places** (internal hygiene, not in this pack): the explorer's `qbe_pitch_inputs` block still carries the v5 single-factory ask ($112–222K, 100/500/1000 volumes) contradicting v6's 3-site $300–450K + 150/400/600 ramp; and the older v3 CSV export (2026-05-28) uses retired labour ($46.67 ex-super) and a 40 kg/bed community-plastic line vs the 20 kg/bed physics. Fix before any demo of the cockpit.
8. **kg/bed reconciliation:** physics says 20 kg HDPE/bed; the public claim "2,660 kg diverted across 496 beds" implies ~5.4 kg/bed. Presumably the 2,660 kg counts a subset (Stretch-only HDPE component?) — reconcile before a reviewer divides our own numbers.

## What was deliberately left out
- Any QBE match estimate or the $400K cap (unconfirmed in writing — diagnostic Area 10 rule).
- Pipeline capital presented as committed (Area 10 rule).
- Audited-accounts language — everything is labelled management data.
