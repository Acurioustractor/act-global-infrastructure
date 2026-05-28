# Recovered WIP Review: Goods cost-allocation + Procurement + Foundations Landscape
Date reviewed: 2026-05-28
Worktree: /tmp/wt-gs-recovered

---

## 1. PROCUREMENT INTELLIGENCE

### What it does
Surfaces government buyers who have historically procured ACT-deliverable work (data, analytics, evaluation, evidence, storytelling, Indigenous engagement) from AusTender contracts data. Scores each buyer on a fit index (0–100) combining recency, scale of spend, and topic relevance. Heat-classifies them HOT/WARM/COOL/COLD. Enables adding a buyer to the org_pipeline as a procurement opportunity, and supports recording Qualify-Bid-Evaluate (QBE) stage and outcomes.

### User-facing surface
- **Page**: `/org/[slug]/procurement/opportunities` — card grid of buyer prospects, filterable by heat band and min spend. Shows buyer name, fit score, heat, 3y spend, contract count, top categories, and 3 recent contract titles.
- **API**: `POST /api/procurement/add-to-pipeline` — converts a buyer card into an org_pipeline entry (opportunity_type='procurement').
- **API**: `POST/PATCH/GET /api/procurement/qbe-result` — writes QBE evaluation outcomes (bid amount, score, won/lost, lessons learned) back to org_pipeline + qbe_evaluations audit table; PATCH advances the QBE stage while bid is in flight.

### Data dependencies
**Reads:**
- `v_act_procurement_buyers` (DB view — NOT YET APPLIED; created by `act-procurement-buyers-view.sql`). Aggregates `austender_contracts` (existing table assumed) into buyer-level spend + topic scores.

**Writes:**
- `org_pipeline` — new columns added by `act-alignment-foundation.sql` (APPLIED): `opportunity_type`, `qbe_stage`, `qbe_qualified_at`, `qbe_bid_amount`, `qbe_submitted_at`, `qbe_evaluated_at`, `qbe_outcome`.
- `qbe_evaluations` — new table from `act-alignment-foundation.sql` (APPLIED): bid audit log.
- `act_grant_recommendation_projects` — project lookup for dedup; also enriched by `act-alignment-foundation.sql`.

**Migration status:** `act-alignment-foundation.sql` (APPLIED — creates `qbe_evaluations`, adds QBE cols to `org_pipeline`). `act-procurement-buyers-view.sql` (NOT APPLIED — the view `v_act_procurement_buyers` does not exist in the DB).

### Wiring status
**Wired into top-level nav.** `ActSurfaceNav` (`apps/web/src/app/org/[slug]/_components/act-surface-nav.tsx`) lists 'Procurement' as a first-class surface alongside Today / Pipeline / Triage / Foundations. The page is reachable at `/org/act/procurement/opportunities`. The page itself also displays the ActSurfaceNav. The Today page and pipeline pages also load `getActSurfaceCounts` which feeds count badges into this nav.

### Completeness
**Partially broken — single DB blocker.** The UI and API are complete. The add-to-pipeline and QBE write-back endpoints are fully functional. The single blocker: `v_act_procurement_buyers` does not exist in the DB (its migration was never applied). The page will call `getProcurementBuyersData()`, get a Supabase error ("relation does not exist"), and return an empty buyer list with all zeros in the header stats. The page renders gracefully (empty grid, "No buyers match" message) rather than crashing.

**Fix effort: ~10 minutes.** Apply `scripts/migrations/act-procurement-buyers-view.sql` to DB. The view queries `austender_contracts` — if that table is populated, buyers will immediately appear.

### Practical value
ACT's Goods on Country program (beds, washing machines for remote communities) needs government procurement customers, not just grant funders. This surface turns AusTender contract history into a scored lead list of government departments that regularly buy data, evaluation, Indigenous engagement, and community-delivered services. The "Add to pipeline" action feeds these directly into the QBE bid management workflow. High value for Goods — specifically for identifying NIAA, state Housing departments, and NT/QLD government buyers who have procurement patterns matching Goods deliverables.

---

## 2. GOODS COST-ALLOCATION

### What it does
Provides ACT with a finance-backed, auditable unit-cost calculation for the Goods on Country "last 50 bed" batch. Reads all ACT-GD supplier bills from Xero (`xero_invoices` type=ACCPAY), expands their line items, categorises each line (Materials / Direct build / Freight / Labour / ACT shared-service support / Support and warranty), and presents a review table where Ben can assign each Xero line item a treatment decision: include in direct delivered cost, show separately (ACT overhead), exclude, needs receipt, or needs review. Decisions persist in `goods_cost_allocation_decisions` (APPLIED). The service also computes unit-cost estimates ($600/bed + route freight) and a "last 50 date window" proxy from bills dated 2025-10-08 to 2025-12-02. A separate ledger service (`goods-finance-ledger.ts`) tracks the income side: ACT-GD ACCREC invoices with paid/due/draft totals and who to chase.

### User-facing surface
- **Component**: `GoodsCostAllocationTable` (client component at `apps/web/src/app/org/[slug]/[projectSlug]/goods-cost-allocation-table.tsx`) — table of up to 18 Xero line items with inline action buttons (5 decisions × scope). Saves via `POST /api/goods/cost-allocation`.
- **API**: `POST /api/goods/cost-allocation` — upserts a decision row to `goods_cost_allocation_decisions` (conflict key: `project_code,line_fingerprint`).
- The table component and API are complete. However `getGoodsCostEvidence()` and `getGoodsFinanceLedger()` are defined but **not imported or called anywhere in the [projectSlug]/page.tsx or any other rendered page**. The allocation table component exists but is not mounted in any page.

### Data dependencies
**Reads:**
- `xero_invoices` (project_code='ACT-GD', type='ACCPAY') — supplier bills with line_items JSONB
- `project_monthly_financials` (project_code='ACT-GD') — FY YTD spend figure
- `xero_transactions` (project_code='ACT-GD') — for Dext receipt matching
- `dext_receipts` — receipt coverage check
- `goods_cost_allocation_decisions` (APPLIED migration) — previously saved decisions

**Writes:**
- `goods_cost_allocation_decisions` (APPLIED) — per-line treatment decisions

### Migration status
`20260506063430_goods_cost_allocation_decisions.sql` — APPLIED. Table exists with RLS policies, fingerprint unique constraint, updated_at trigger.

### Wiring status
**Orphaned — not mounted anywhere.** The `GoodsCostAllocationTable` component is defined but never imported in `[projectSlug]/page.tsx` (confirmed: no import of `goods-cost-evidence`, `goods-finance-ledger`, or `GoodsCostAllocationTable` in that 1924-line file). `getGoodsCostEvidence()` and `getGoodsFinanceLedger()` have no callers outside their own files. The project page imports from `goods-operating-system` but not from these cost/finance services.

### Completeness
**Partial — logic complete, integration incomplete.** The service layer (`goods-cost-evidence.ts`, `goods-finance-ledger.ts`), the DB migration, and the allocation table component are all production-quality. The API endpoint is wired. The missing piece is: neither service is called by any page, and the `GoodsCostAllocationTable` is not embedded in a page. The project page at `/org/act/act-gd` (or equivalent) would need a new section that calls `getGoodsCostEvidence()` and renders the table.

**Fix effort: ~1–2 hours.** Import and mount in [projectSlug]/page.tsx under an "ACT-GD Finance Evidence" section, gated by `isGoodsProject(project)`.

### Practical value
Directly critical for the Goods QBE bid process. Goods cannot quote a credible unit cost to Snow Foundation, SEFA, government buyers, or procurement tenders without a finance-backed direct cost figure. This tool gives ACT the ability to: (a) classify which Xero invoices are direct production costs vs ACT overhead, (b) produce a last-50-bed cost sheet with receipts, (c) distinguish the $600/bed planning estimate from an auditable actual. The income ledger side shows which ACT-GD invoices are paid, still due, or draft — actionable for cash flow.

---

## 3. FOUNDATIONS LANDSCAPE

### What it does
Two related surfaces:

**A. Foundation Landscape** (`/foundations/landscape`): A public/org-level read-only data dashboard showing the Australian philanthropic giving landscape segmented by category (First Nations, Housing, Health, etc.), geography (state, remoteness, place), and access mode (open application, relationship-led, invitation-only, unknown). Renders bar charts, a visual "capital lanes" overview, and a top-foundations table weighted by annual giving + observed grants. Also computes three "next move" action briefs: which categories have large capital but thin open-program density; how many funders have unknown/relationship-led access; which geographies have the highest giving concentration.

**B. Foundation Watchlist** (`/org/[slug]/foundations/watchlist`): ACT-specific funder CRM panel. Shows every foundation that is either in `org_pipeline` (opportunity_type='foundation') or has a paid Xero invoice history (`v_act_income_by_funder`). Enriches with `funder_context_snapshot` (thematic/geo focus, annual giving, grantees, website, days since last touch), `foundation_programs` (open program count), and a derived temperature score (WARM/TEPID/LIGHT/COLD based on lifetime paid amount + pipeline presence).

**Nudge endpoint** (`POST /api/foundations/nudge`): Logs outreach events to `funder_nudge_log`, and updates `funder_context_snapshot.most_recent_contact_at` so "days since last touch" resets in the watchlist.

### User-facing surface
- `/foundations/landscape` — standalone page, linked from `/foundations` (confirmed: `foundations/page.tsx` has `/foundations/landscape` link entries in the right-panel nav)
- `/org/[slug]/foundations/watchlist` — org-specific, reachable via ActSurfaceNav ('Foundations' tab)
- `POST /api/foundations/nudge` — called from watchlist or today surface when logging outreach

### Data dependencies
**Foundation Landscape reads (requires migration NOT APPLIED):**
- `mv_foundation_landscape_category` — materialized view (NOT APPLIED)
- `mv_foundation_landscape_geo` — materialized view (NOT APPLIED)
- `mv_foundation_landscape_access` — materialized view (NOT APPLIED)
- `mv_foundation_landscape_top_foundations` — materialized view (NOT APPLIED)
- These MVs require: `foundation_categories`, `foundation_category_assignments`, `foundation_geo_focus` tables (also created by the same migration), plus existing `foundations`, `foundation_programs`, `foundation_grantees` tables.

**Foundation Watchlist reads (no new migration needed):**
- `org_pipeline` (opportunity_type='foundation') — APPLIED
- `v_act_income_by_funder` — existing view
- `funder_context_snapshot` — existing table
- `foundation_programs` — existing table

**Foundation nudge writes:**
- `funder_nudge_log` — table status unclear (not in any migration reviewed; may pre-exist or may be missing)
- `funder_context_snapshot` — update existing row

**Migration status:**
- `foundation-landscape.sql` — NOT APPLIED. Creates: `foundation_categories`, `foundation_category_assignments`, `foundation_geo_focus` tables + 4 materialized views (`mv_foundation_landscape_category/geo/access/top_foundations`). Also seeds 16 category definitions. Required for the landscape page to show anything.
- The classifier script `classify-foundation-landscape.mjs` populates `foundation_category_assignments` and `foundation_geo_focus`. Must run after migration to populate MVs.
- `act-alignment-foundation.sql` — APPLIED. Adds `opportunity_type` to `org_pipeline` which is read by the watchlist.

### Wiring status
**Landscape page: reachable but broken (migration not applied).** The page at `/foundations/landscape` is accessible; it renders gracefully with an error banner ("Landscape views are not fully available yet. Run the foundation landscape migration and classifier.") when the MVs are missing.

**Watchlist: wired and likely functional.** The watchlist is linked from `ActSurfaceNav` (`/org/[slug]/foundations/watchlist`). It reads from existing tables (org_pipeline, v_act_income_by_funder, funder_context_snapshot), so it should render real data as long as those tables have rows. The `funder_nudge_log` table is not confirmed to exist.

### Completeness
- **Landscape page**: Partial — graceful degradation, but shows nothing useful until `foundation-landscape.sql` is applied AND `classify-foundation-landscape.mjs` is run. After that, fully functional.
- **Watchlist**: Likely complete and functional using existing data. The `funder_nudge_log` table for the nudge endpoint may be missing — not confirmed.
- **Classifier**: `classify-foundation-landscape.mjs` is complete, deterministic, supports `--dry-run`, `--limit`, `--foundation-id`. Ready to run.

### Practical value
**Landscape:** Gives ACT a live map of where foundation capital sits vs where the doors are open. The "access gate" visual (what % of classified foundations accept open applications) is the key strategic insight. For Goods specifically: identifies First Nations foundations with large giving pools and sparse open programs — the relationship-led funders Goods needs to get introduced to via Snow, Rotary, Centrecorp contacts.

**Watchlist:** Fills the CRM gap for foundation relationships. ACT has paid history with Snow, Rotary, Centrecorp, Ingkerreke etc — these show as WARM. "Days since last touch" signals which funders are cooling. The nudge endpoint closes the loop when outreach happens.

---

## SUMMARY TABLE

| Feature | Migration applied | UI complete | Wired into nav | Blocker |
|---------|---|---|---|---|
| Procurement: buyer prospect page | NO (v_act_procurement_buyers) | YES | YES (ActSurfaceNav) | Apply act-procurement-buyers-view.sql |
| Procurement: add-to-pipeline API | YES (act-alignment-foundation) | YES | — | None |
| Procurement: QBE result API | YES | YES | — | None |
| Goods cost allocation: DB | YES (goods_cost_allocation_decisions) | YES | NO (not mounted) | Mount in [projectSlug]/page.tsx |
| Goods finance ledger | YES (existing tables) | YES (service only) | NO | Mount alongside cost allocation |
| Foundations landscape | NO (foundation-landscape.sql) | YES (graceful error) | Partial (/foundations/landscape link) | Apply migration + run classifier |
| Foundations watchlist | YES (existing tables) | YES | YES (ActSurfaceNav) | Verify funder_nudge_log exists |
