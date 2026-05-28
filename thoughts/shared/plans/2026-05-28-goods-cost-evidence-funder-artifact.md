---
title: Goods on Country — funder-grade cost evidence + artifact
status: approved (decisions locked 2026-05-28)
created: 2026-05-28
owner: Ben
plan_slug: goods-cost-evidence-funder-artifact
repos: [grantscope (apps/web — the tool), shared ACT DB (Xero data), act-infra (this plan)]
---

## DECISIONS LOCKED (2026-05-28)
- **A. Phase 1 scope:** Cost-allocation FIRST. Procurement deferred to a fast follow-on PR.
- **B. Artifact formats:** All three — web view (CivicScope) + printable one-pager (PDF) + Excel model (the SIH "user-editable assumptions" deliverable).
- **C. Source of truth:** Canonical per-bed BOM lives in the tool/DB, editable in-app, persisted, **seeded from Ben's Notion Bed-Inputs DB**. Notion stays the working scratchpad.

# Goods on Country — funder-grade cost evidence + artifact

## Goal
Land the recovered Goods **cost-allocation tool** and turn it into a **funder-grade cost-evidence engine** that produces a crystal-clear "what a bed costs" artifact — directly answering the Social Impact Hub diagnostic's #1 and #2 HIGH-priority recommendations (GOC-only financial model with *unit economics*; *detailed production cost estimates with sensitivity at scale*).

## Non-negotiable constraints (from the diagnostic, May 2026)
1. **Human-in-the-loop.** "No documents should be shared for another party to review unless they have been audited, understood and edited by a core member of the GOC team." → The tool surfaces sourced numbers for Ben to verify/author from; it does NOT auto-emit a funder document.
2. **Founder-authored, not AI-generated narrative.** AI for structuring/editing/summarising, not for generating original claims.
3. **Nothing aspirational presented as actual.** Every figure carries a confidence grade and a source. (Matches ACT's honest-by-construction principle.)
4. **Cost founder time at fair-market replacement rate** even if not drawn.
5. **Separate one-off capital (production plant) from per-unit delivery cost.**

## What already exists (verified this session)

### The live Xero data (shared ACT DB, `xero_invoices`, queried 2026-05-28)
- 253 non-voided ACCPAY bills tagged ACT-GD, **$424,620.30** ($296,251 paid / $126,878 due), 2025-01-28 → 2026-04-16.
- **253/253 have Xero attachments** (strong evidence base); 235/253 have line items.
- FY26 YTD expense (project_monthly_financials): $302,122.82.
- Dext receipt match: 1/167 — the weakest evidential link.

### Ben's Notion reconciliation (already structured correctly — provenance + confidence + per-bed + capital split)
- **`Bed Inputs & Production Facility Costs`** — verified per-bed component stack:
  HDPE kit $344.05 (Verified, Defy) · canvas $93.50 (Est, Notion BOM) · assembly $55.95 (Verified, Defy) · steel $27 (Est) · caps $3.20 (Est) = **$523.70/bed direct** (excl. freight + facility overhead). Capital separated: facility $100K invested-to-date (FRRR), Carbatec tooling $10,046, Defy facility materials $11,725, Kirmos facility labour $4,500/mo.
- **`Utopia Trip Costs — May 2026 (107 beds)`** — per-trip breakdown with Source + Confidence + Project Tag. Revenue benchmark: **Centrecorp $801.05/bed** (107 beds, $85,712, INV-0291). Costs spread across bed kits, flights, canvas, assembly, steel, travel.
- **`Defy Invoices — Core Records`** — master Defy supplier-invoice log.

### The recovered tool (grantscope `recovered/civicscope-may22-features`)
- `goods-cost-evidence.ts` reads `xero_invoices` (ACCPAY/ACT-GD) + `project_monthly_financials` + `xero_transactions` + `dext_receipts`; classifies by Xero account code then keyword; 5 categories; human decisions → `goods_cost_allocation_decisions` (LIVE table, 0 decisions recorded). `$600/bed` is a hardcoded planning constant (not computed).
- `goods-finance-ledger.ts` — ACT-GD income invoices + per-bed planning number.
- `GoodsCostAllocationTable` component + `/api/goods/cost-allocation` route. **Schema LIVE, code orphaned (not mounted).**

## Data-quality issues to resolve (the "could be better")
| Issue | $ | Source | Action |
|---|--:|---|---|
| Carla Furnishers duplicate (two identical AUTHORISED bills) | 11,180 | xero_invoices | de-dup |
| 1300 Washer tagged ACT-GD, line says ACT-FM | 13,980 | xero_invoices | retag ACT-FM |
| R M Tanner "Triple Axle Tiny House" coded labour | 19,950 | xero acct 486 | reclassify → **capital**, exclude from per-bed |
| Zinus Australia — purpose unconfirmed | 28,691 | xero ACT-GD | confirm: bed input or noise? |
| Account 429 unmapped in tool (~$80K Defy materials falls to "review") | ~99,884 | tool gap | **add 429 to category map** |
| Utopia flights/accommodation tagged ACT-IN | 24,507 | xero | retag ACT-GD (trip costs) |
| Canvas $10,285 invoice tagged ACT-IN | 10,285 | xero | retag / reconcile |
| Off-ledger: canvas + steel only in Notion BOM | per-bed | Notion | pull actual invoices → upgrade Est→Verified |
| Missing: bed freight Syd→Utopia ("TBC"), Oonchiumpa trip invoice | unknown | — | locate/raise |
| INV-1602 reconciliation: Notion "107 beds $36,947" vs Xero line "16 beds $33,589" | — | both | reconcile (naïve division → false $2,099/bed) |

## The real Goods cost model (from the data, to be validated)
- **Per-bed direct (verified-ish):** ~$524 (components + assembly).
- **+ Freight:** currently MISSING/TBC — the biggest gap to a credible fully-loaded number.
- **+ Facility overhead allocation:** Kirmos labour + facility materials, amortised per bed.
- **→ Fully-loaded:** ~$600–650 today (matches the planning figure); needs freight to close.
- **Capital (one-off, NOT per-bed):** facility ~$100K + tooling ~$10K (+ R M Tanner $20K if capital).
- **Revenue benchmark:** Centrecorp $801/bed. **Counterfactual:** commercial equivalent $1,500–2,000.

## Benchmark — how the best present cost-to-funder (charity:water, SecondBite, AMF, REDF, GiveWell, Bridgespan)
Devices that work: **hero number** ("$X delivers one community-made bed") · **cost-stack bar** · **capital-vs-per-unit split panel** · **$→beds conversion table** · **counterfactual anchor** ($1,500–2,000 commercial) · **provenance footnotes** (every figure → invoice/rate/time record) · **independent verification** as an assurance device.

## Plan (phased, each shippable)

### Phase 1 — Land the tool (#1)
- Fresh branch off current `origin/main` (grantscope). Cherry-pick the cost-allocation files (+ procurement, per the #1 ask — see Decision A) from `recovered/civicscope-may22-features`.
- Resolve modified-file conflicts (`grant-scout.ts`, `org-pipeline-service.ts`, `agent-registry.mjs` vs #45, `nightly-grant-pipeline.mjs`).
- Mount `GoodsCostAllocationTable` under `[projectSlug]` gated by `isGoodsProject()`.
- `pnpm build` + tsc clean. PR. **Outcome: tool live, reading real ACT-GD data.**

### Phase 2 — Make the cost data funder-grade
- Fix the **account-429 mapping gap** (and any other unmapped accounts) in `goods-cost-evidence.ts`.
- Auto-detect + surface the **data-quality flags** above as review items (dup, ACT-FM mis-tag, capital mis-code, Zinus confirm).
- **Reconcile against the verified per-bed component stack** (don't recompute blindly from Xero): import Ben's Bed-Inputs model as the canonical per-bed BOM with confidence grades; the tool reconciles Xero actuals against it and flags variance.
- **Separate capital from per-unit** (facility, tooling, R M Tanner) — mirror the Bed-Inputs Type field.
- Cost **founder time at fair-market rate** as a modelled (not-drawn) line.
- **Outcome: a sourced, confidence-graded, capital-separated cost model that reconciles Xero + Notion.**

### Phase 3 — The funder artifact
- A funder-facing cost-evidence view built on Phase 2, using the benchmark structure with Goods' REAL numbers:
  hero number · cost-stack bar (materials/build/freight/overhead) · capital-vs-per-unit panel · $→beds conversion · counterfactual ($1,500–2,000) · provenance footnotes (every figure → its invoice/rate, with confidence grade).
- **Human-in-the-loop by design:** outputs a *draft Ben edits + verifies*; every figure traceable; confidence grades visible; aspirational items excluded or clearly marked.
- Surfaces: web view in CivicScope + printable one-pager (PDF). Excel model (the SIH "user-editable assumptions" deliverable) per Decision B.
- **Outcome: a crystal-clear, sourced, founder-authored cost artifact for funders + the SIH advisory.**

## Decisions needed (see questions)
- **A. Phase 1 scope:** land Procurement + cost-allocation together (full #1), or cost-allocation first / procurement after?
- **B. Artifact format:** web view + printable one-pager; +Excel model (SIH deliverable)?
- **C. Canonical per-bed model source-of-truth:** keep Ben's Notion Bed-Inputs DB as source (tool mirrors), or move the model into the DB/tool?

## Verification / done criteria
- `pnpm build` + `tsc --noEmit` clean; tool live in CivicScope reading real ACT-GD data.
- Every figure in the artifact traces to an invoice/rate/time record with a confidence grade.
- Per-bed and capital numbers reconcile between Xero, the Notion model, and the artifact (no naïve division).
- The 4 data-quality issues are resolved or explicitly flagged.
- No aspirational figure presented as actual.
