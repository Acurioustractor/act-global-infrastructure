---
title: Goods cost-model + dashboard rebuild session
date: 2026-05-28
session_duration: ~6 hours
repos_touched: [goods-asset-tracker, grantscope, act-global-infrastructure]
prs_merged: 9
plan_slug: goods-cost-evidence-funder-artifact
---

# 2026-05-28 — Goods cost-model + admin rebuild

Long session that started as "build Phase 1 of the cost-evidence plan" (cherry-pick Goods cost-allocation files from grantscope) and ended with the entire Goods admin restructured around a verified cost model with QBE-ready sliders.

## 9 PRs merged in order

### grantscope (3 PRs)
| # | SHA | What |
|---|---|---|
| 46 | `ae25ebe` | Phase 1 cost-allocation table + Phase 2 data-quality flags + Phase 3 funder artifact (later partly backed out) |
| 47 | `fc42b91` | **Back-out** the funder artifact from grantscope — wrong place, Goods v2 is canonical |

### act-infra (1 PR)
| # | SHA | What |
|---|---|---|
| 122 | `4be5c32` | Analysis docs + OCR scripts (`ocr-defy-bills.mjs` + `ocr-bed-supplier-bills.mjs` + `ocr-bed-elements-deep.mjs`) + Sheets export bundle |

### goods-asset-tracker (6 PRs)
| # | SHA | What |
|---|---|---|
| 29 | `9ec727d` | v3 cost-model scenarios card on /admin/production |
| 30 | `710429e` | v4 4-path supply model (Notion BK locked) |
| 31 | `2be2448` | v5 interactive cost-model explorer at /admin/cost-model |
| 32 | `8a7f208` | Sidebar align — cost-model + 3 missing routes added |
| 33 | `0ca11c3` | Musk-5 sidebar restructure (35 items → 12 visible + collapsible More) |
| 34 | `7505274` | Dashboard hero redesign + safe-default `pnpm dev` script |

## The Big Lessons (load every future session)

### 1. The cost work belongs on Goods v2, not grantscope
First-pass shipped to grantscope. Then realised the canonical BOM already lived in
`v2/src/lib/data/supplier-quotes.ts`. Moved it. **Rule: bed cost = Goods v2;
cross-org funding transparency = grantscope.**

### 2. Xero JSON sync strips descriptions to "."
The `xero_invoices.line_items` JSONB column has stripped descriptions for most
suppliers. To get real line-item detail you have to OCR the Xero attachment PDFs
via Gemini. Three OCR scripts live in act-infra/scripts/.

### 3. `pnpm dev` in Goods v2 used to silently hit the wrong DB
Shell env vars override `.env.local`. PR #34 baked `env -u` into the dev script
as the default. **`pnpm dev` is now safe; `pnpm dev:shell-env` is the escape hatch.**

## Canonical Stretch Bed cost model (v5, verified)

### Direct cost per bed (4 supply paths, $750 retail margin)
| Path | Direct | Margin | % |
|---|--:|--:|--:|
| Defy Kits (today) | $534.79 | $215.21 | 29% |
| Defy Panels (worst value) | $584.07 | $165.93 | 22% |
| **Factory in-house (target)** | **$275.74** | **$474.26** | **63%** |
| **Community (vision)** | **$140.74** | **$609.26** | **81%** |

### BOM (verified from actual invoices)
- HDPE kit (Defy): $344.05 — INV-1602 + INV-1732
- Steel poles (DNA Steel): $27.00 — Notion canonical
- Canvas (Centre Canvas): $93.50 — 3 invoices, 270 covers
- End caps: $3.20 (4 × $0.80)
- Screws: $1.04 (16 × $0.065, Coastal Fasteners verified)
- Bolts: $1.00 (2 × $0.50 est)
- HDPE shred raw: $2.00/kg + $0.75/kg delivery = $2.75/kg landed
- 20kg HDPE per bed (Ben confirmed)

### Musk first-principles floor
**$128.99/bed** if every input bought at raw-market rate + assembled at industry-low labour. We currently pay $534.79 via Defy Kits → **$405.80 of supply-chain markup capturable in-house at scale**. That's the QBE capital-investment case.

### Volume scenarios (fully-loaded)
| Volume | Factory | Defy Kits | Community |
|--:|--:|--:|--:|
| 100/yr today | $1,653 | $1,912 | $1,518 |
| 500/yr target | $619 | $878 | $484 |
| 1,000/yr vision | $478 | $737 | $343 |

Commercial counterfactual: $1,500–$2,000.

### What changed v3 → v5
- v3 (morning): generic Idiot Index + scenarios
- v4 (locked w/ Ben Q&A): 20kg HDPE/bed, $27 steel canonical, $95 canvas
- v5 (after deep OCR): Canvas $95 → $93.50 verified, screws $1.04, +bolts $1.00, removed state_1 (Defy fully-fab was Weave Bed, discontinued)

## Mistags surfaced (~$135K to retag — Tier 2 work)

| Supplier | $ | Current tag | Correct tag |
|---|--:|---|---|
| Centre Canvas (3 bills, $14,915) | 14915 | ACT-IN | ACT-GD |
| Defy Washing Machine Cladding | 25000 | ACT-GD | ACT-FM |
| Defy Coasters | 10000 | ACT-GD | ACT-EL marketing |
| Defy Design/R&D | 7000 | ACT-GD bed-COGS | ACT-GD capital |
| Utopia trip flights/accom | 24507 | ACT-IN | ACT-GD |
| 1300 Washer | 13980 | ACT-GD | ACT-FM |
| Carla Furnishers duplicate | 11180 | ACT-GD | VOID DUPLICATE |
| R M Tanner Triple Axle | 19950 | ACT-GD | Different project (not Goods) |
| Zinus Australia (Basket Bed v1) | 28690 | ACT-GD | ACT-GD-archive (discontinued) |

## Admin restructure — Musk-5

35-item sidebar → 12 visible + collapsible "More" drawer:

```
TODAY (1)        MAKE (3)          PLACE (3)             STORY (3)            MONEY (3)
  Dashboard       Production         Communities          Photos               Funders
                  Cost model         Trip preflight       Stories (EL)         Deals
                  Assets             Install              Storytellers         Xero recon

+ More drawer (14): Bed signals · Install checklist · Scans · Trip receipts · Field notes
  · Reach out · Funder reports · Deck preview · Orders · Requests · Fleet · Library
  · Browse photos · (others)
```

**Hidden from nav** (still work via URL): compassion, messages, products, brand, team, announcements, alice-fill.

## Dashboard rebuild — 4 hero cards

Old `/admin` was 35 facts of equal weight. New `/admin` answers "system status + today's call" in 5 seconds:

1. **Beds in motion** — kanban: making/ready/allocated/on Country + raw plastic stock
2. **Money** — overdue $ in red + pipeline + won
3. **Today's call** — auto-computed priority (overdue / silent / community ready / all clean)
4. **Cost trajectory** — $535 → $276 + Idiot Index 8.6× + capex ask

## Open work for next session

| Priority | Work | Who |
|---|---|---|
| 1 | Ask Defy (Sam) volume-quote sheet at 100/500/1000/5000 beds/yr | Ben (external) |
| 2 | Confirm INV-1731 freight ($1,350) with Sam | Ben (external) |
| 3 | Retag the $135K of misattributed ACT-GD spend | Tier 2 retag session |
| 4 | Pull DNA Steel + Centre Canvas invoices from Notion to verify against actuals | Claude (Notion MCP) |
| 5 | Bolt rate verify when next Coastal Fasteners invoice arrives | Claude (re-run OCR) |
| 6 | Page-level merges (Photos hub with tabs, Stories hub with source filter, Install hub) | Claude |
| 7 | 5th hero card for bank balance / runway (if Xero connection feeds it) | Claude |
| 8 | Stale-5 cleanup decision (delete or keep) — compassion/messages/products/brand/team | Ben + Claude |

## Source-of-truth files

| File | Lives in | What |
|---|---|---|
| `v2/src/lib/data/supplier-quotes.ts` | goods-asset-tracker | Canonical BOM ($469.79 direct materials) |
| `v2/src/lib/data/cost-model-scenarios.json` | goods-asset-tracker | v5 model — 4 paths + Idiot Index + scenarios + QBE inputs |
| `v2/src/lib/data/cost-model-scenarios.ts` | goods-asset-tracker | Typed accessors + reconciliation |
| `v2/src/app/admin/cost-model/cost-model-explorer.tsx` | goods-asset-tracker | Interactive sliders + matrix |
| `v2/src/components/production/cost-model-scenarios-card.tsx` | goods-asset-tracker | Production-page card |
| `v2/src/app/admin/page.tsx` | goods-asset-tracker | New dashboard with 4 hero cards |
| `v2/src/app/admin/admin-sidebar.tsx` | goods-asset-tracker | Musk-5 nav |
| `thoughts/shared/analysis/2026-05-28-defy-invoice-ocr.json` | act-global-infrastructure | Raw OCR — 35 Defy bills |
| `thoughts/shared/analysis/2026-05-28-bed-elements-deep-ocr.json` | act-global-infrastructure | Canvas + Bunnings + INV-1507 OCR |
| `thoughts/shared/analysis/2026-05-28-bed-supplier-ocr-FULL.json` | act-global-infrastructure | 41 bed-supplier bills OCR |
| `scripts/ocr-defy-bills.mjs` | act-global-infrastructure | Re-runnable Defy OCR |
| `scripts/ocr-bed-supplier-bills.mjs` | act-global-infrastructure | Re-runnable all-supplier OCR |
| `scripts/ocr-bed-elements-deep.mjs` | act-global-infrastructure | Re-runnable canvas/hardware OCR |
| `scripts/export-bed-cost-model-to-sheets.mjs` | act-global-infrastructure | 10-CSV bundle generator |

## What NOT to redo

- **Don't OCR Defy bills again** unless new invoices arrive — output saved to `defy-invoice-ocr.json`
- **Don't doubt the Notion BOM** — verified line-by-line ($344 HDPE, $55.95 assembly, $27 steel, $93.50 canvas)
- **Don't add INV-1507 $600/bed back to model** — was Weave Bed (discontinued)
- **Don't add Zinus to bed BOM** — was Basket Bed v1 (discontinued)
- **Don't divide all-product Defy spend by bed count** — the original flaw that led to "$5,800/bed" nonsense
