# Goods bed cost model v3 — Sheets-ready CSV bundle

Exported 2026-05-28 from `thoughts/shared/analysis/2026-05-28-goods-bed-cost-model-v3.json`.

## How to import into Google Sheets

1. Create a new Google Sheet (or open an existing one for this model).
2. For each CSV in this folder, **File → Import → Upload → `<csv-file>` → Insert new sheet(s)**.
3. Rename each new tab to match the file (e.g. `01 build states`, `02 idiot index`).
4. Done — the workbook now mirrors the v3 model and you can edit any cell.

## To push changes back to the model

If you change a number in Sheets and want it to drive the live cost-model
page in CivicScope, edit the JSON at `thoughts/shared/analysis/2026-05-28-goods-bed-cost-model-v3.json`
to match, then commit. The grantscope service `apps/web/src/lib/data/goods-bed-cost-model.json`
is a mirror — keep them in sync (or have a script reconcile them).

## What's in each tab

| File | Purpose |
|---|---|
| `01-build-states.csv` | The 5 build-state scenarios (Defy-everything → all in-house) with per-component cost lines and cumulative capex. |
| `02-idiot-index.csv` | Markup-ratio table — where Defy's pricing leaves room for in-house cost reduction. |
| `03-volume-scenarios.csv` | Fully-loaded per-bed cost at 100/500/1000 beds/yr for each build state. |
| `04-founder-allocation.csv` | Founder time split: production (onto beds) vs fundraising (offset) vs ACT-wide. |
| `05-fundraising-offset.csv` | How dollars raised per founder-day subsidise bed cost. |
| `06-wage-scenarios.csv` | 4 wage tiers × 6 beds/day → $/bed labour. |
| `07-community-plastic.csv` | 4 pay-rate tiers for community-collected HDPE. |
| `08-defy-verified-rates.csv` | Every OCR-verified Defy invoice rate (the load-bearing data). |
| `09-mistags-to-fix.csv` | ~$120K of ACT-GD spend that's actually for other projects. |
| `10-open-questions-for-defy.csv` | What we still need from Defy to lock the model. |

## Verified data lineage

All rates in tab 08 come from `scripts/ocr-defy-bills.mjs` (Gemini 2.5 Flash Lite
OCR of every Defy invoice attachment in Xero), output in
`thoughts/shared/analysis/2026-05-28-defy-invoice-ocr.json`. Re-run that script
when Defy issues new invoices to refresh the verified-rate set.

Plan: `goods-cost-evidence-funder-artifact`.
