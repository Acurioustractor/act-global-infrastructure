---
title: The Harvest (ACT-HV) — stage/zone budget-vs-actual + garden-area tracking
slug: harvest-stage-budget
status: awaiting-approval
created: 2026-05-26
owner: Ben
plan: harvest-stage-budget
related:
  - /Users/benknight/Code/The Harvest Website/docs/strategy/the-harvest-strategic-plan-notion.md
  - apps/command-center/src/app/finance/projects/[code]/page.tsx
  - apps/command-center/src/app/api/finance/projects/[code]/route.ts
---

# The Harvest — stage budget + garden-area tracking

## Goal

Give The Harvest (ACT-HV) a **budget-vs-actual broken down by build stage and zone**, aligned to
the website's site plan, with the **garden area** tracked as its own slice. Attribute spend to zones
via **vendor→zone auto-rules** so future spend lands in the right bucket automatically. Surface it on
the command-center project page (`/finance/projects/ACT-HV`).

## Non-goals

- Not pushing any retags back to Xero (Supabase-only, per the open task #14 dedicated-session rule).
- Not changing the existing FY26 project-level budget logic — adding a stage layer alongside it.
- Not a migration: config-file backed (small, static, version-controlled, Ben-editable).

---

## What's verified (sources)

**Actuals — Supabase `tednluwflfhxyucgwigh` (queried 2026-05-26):**
- ACT-HV bills (ACCPAY): **$115,715** / 116 bills, ~98% auto-tagged (vendor_rule / tracking_match).
- ACT-HV bank spend (SPEND): **$67,295** / 123 lines — overlaps bills where a bill was paid.
- The finance API already computes deduped `realExpenseRows` (bills + unmatched bank spend) — this is
  the clean actuals source to group by zone.
- Top garden vendors (bills): Sophie Hickey $16,264 · Maleny Landscaping $10,406 · Savage Landscape
  $2,796 · Savage Transport $300 → **~$29.8K garden bills alone**, before any Bunnings/Maleny Hardware share.

**Budget — `the-harvest-strategic-plan-notion.md` Infrastructure Roadmap (verified):**
| Roadmap line | Budget | Phase | Maps to zone | Website Work |
|---|---|---|---|---|
| Site-level base (bathrooms, utilities, signage) | $8,000 | 1 | Entrance / shared | — |
| **Garden beds Phase 1** | **$5,000** | 1 | **Garden Beds** | The Garden |
| Art Space setup | $5,000 | 1 | Outdoor Art Area | — |
| Event/programming infra (tables, PA, shade) | $3,000 | 1 | Community Gathering / Bocce | Milk Crate Pavilion |
| Commercial kitchen permit | $3,000 | 1 | Cafe / Pavilion | — |
| Kitchen fit-out | TBD (Fund or sub-op) | 1 | Cafe | — |
| Kitchen expansion | $10,000 | 2 | Cafe | — |
| **Garden centre retail setup** | **$5,000** | 2 | Tool Shed / Poly Tunnel | The Shop |
| Accessibility upgrades | $8,000 | 2 | shared | — |
| Event equipment expansion | $3,000 | 2 | Community Gathering | — |
| Accommodation build-out | $30–50K | 3 | (future) | — |
| Makerspace equipment | $10,000 | 3 | (future) | — |
| Reserve for opportunities | $15,000 | 3 | — | — |

- **Improvement Fund = $250K total** (lease clause 5); ~$50K allocated across Phase 1–2; ~$200K uncommitted.
- **Garden-area committed budget = ~$10K** (Garden beds $5K + Garden centre $5K).

**Website taxonomy (verified — `client/src/pages/SitePlan.tsx`, `client/src/data/works.ts`):**
- Stage-1 zones: Entrance, Cafe, Pavilion, Community Gathering, **Garden Beds**, Bocce, Tea Station, Parking.
- Stage-2 zones: Outdoor Art, **Tool Shed**, **Poly Tunnel**.
- Category tags: grow / eat / community / events / access / play / heritage.
- "Garden area" = the **grow** zones (Garden Beds, Tool Shed, Poly Tunnel) + Works *The Garden* & *The Garden Paths*.

---

## ⚠ Headline findings (to confirm with Ben before building budget side)

1. **Actuals ≫ planned capital.** ACT-HV has ~$115K+ in spend; planned Phase-1 capital is ~$24K.
   ACT-HV is clearly capturing more than the Improvement-Fund site-level scope (Radical Scoops build,
   ACT-owned equipment/tools, pre-commencement materials). The stage budget must decide what counts:
   **Fund-scope only**, or **all ACT Harvest spend**. → Open question Q1.
2. **Garden over the line already.** Garden bills ~$30K vs ~$10K budgeted. Either the budget is stale or
   garden scope grew (paths, Sophie's planting, landscaping). Worth a real number + a revised budget.
3. **DB budget row is stale.** `project_budgets` ACT-HV capital = `$150,000 / $44K drawn`. Lease says
   **$250K**, plan says ~$25K Phase-1 drawn. Correct the row as part of this work.
4. **Known miscodes still in ACT-HV actuals** (already surfaced by the page's audit alerts):
   RNM Carpentry (flagged not-Harvest), Flight Bar Witta (NT travel → ACT-OO), Kennedy's duplicate
   $8,525, Carbatec maybe-dup $3,657. These inflate the garden/site actuals until resolved.

---

## Architecture (config-backed, no migration)

### New files
1. `config/harvest-zones.json` — the budget side. One entry per zone: `{ id, label, stage, category,
   websiteSlug, work, budget, phase, notes }`. Edit here to change budgets. Marked DRAFT where inferred.
2. `config/harvest-vendor-zones.json` — vendor→zone map: `{ zone, vendors: [name, ...aliases] }`.
   Drives both actuals attribution and the going-forward auto-tag. Unmapped vendors → `unallocated`.

### API — `apps/command-center/src/app/api/finance/projects/[code]/route.ts`
- When `projectCode === 'ACT-HV'`: load both config files, group existing `realExpenseRows` (already
  deduped, line ~532) by vendor→zone, roll up to zone → stage → garden-vs-rest. Return new
  `stageBudget` field: `{ stages: [{ stage, budget, actual, variance, zones: [...] }], garden: {...},
  unallocated: {...} }`. No new query — reuses the clean actuals already computed.

### UI — `apps/command-center/src/app/finance/projects/[code]/page.tsx`
- New `StageBudget` section (gated on `data.stageBudget`): per-stage groups, each zone a budget/actual
  bar (green on-track / amber near / red over), **garden area pinned at top + highlighted**, an
  "unallocated" row prompting vendor-map additions. Mirrors the existing Funding-sources bar styling.

### Going-forward tagging ("tag the next spend")
- Add the garden/build vendors to `vendor_project_rules` so future spend auto-tags to ACT-HV (most
  already are). The **zone** comes from `harvest-vendor-zones.json` at read time — no per-row zone column.
- One-off: review **3 untagged Bunnings bills ~$5,796 (Nov–Dec 2025)** — tag to ACT-HV if Harvest
  (Tier 2 write, manual source `manual-harvest-2026-05-26`, only after Ben confirms).

---

## Build steps (phase-at-a-time, `tsc --noEmit` between)

1. **Config** — write `harvest-zones.json` (budgets from roadmap) + `harvest-vendor-zones.json`
   (vendor map from the verified ACT-HV vendor list). Ben reviews both before they're trusted.
2. **API** — add ACT-HV `stageBudget` block; verify totals reconcile to `realExpenseTotal`.
3. **UI** — add StageBudget section; `tsc --noEmit`; `pnpm build`.
4. **Verify** — load `/finance/projects/ACT-HV` locally (port 3002), screenshot, check garden number.
5. **Tagging** — confirm + apply the Bunnings one-off; confirm vendor rules cover garden vendors.
6. **Correct** the stale `project_budgets` capital row ($150K→$250K, drawn figure). (Tier 2.)
7. Commit with `Plan: harvest-stage-budget` trailer.

## What counts as Harvest spend (assumptions — Ben to confirm)

The "real count" depends on a definition. Working rule: **ACT-HV = money invested in the Witta site
(build + garden + labour + design), regardless of which Fund it draws from.**

**IN — Harvest:**
- Garden: planting, soil, landscaping, delivery (Sophie Hickey, Maleny Landscaping, Savage Landscape/Transport).
- Site build / structures: timber, decking, pavilion (Smartwood, Kennedy's). *St Mary's Cathedral
  timber IS Harvest* — it's the Garden Paths material (per `works.ts` Work 03).
- On-site trades (TNT Plastering), tools & equipment bought for the site (Total Tools, Carbatec — capex).
- Equipment hire used AT Witta (Kennards, Diggermate, Hydraulink) — *verify location, some hire may be NT*.
- Design & branding for Harvest (Thais Pupio).
- Materials/hardware — Harvest portion (Bunnings, Maleny Hardware).
- **Labour / work-time: Susie + Joey steward invoices** (Wednesday garden crew + event/site ops). ← the
  piece Ben flagged. Wednesday-crew time is largely **garden**. *No Joey/Susie contact in Xero yet —
  stewards' paid arrangement is TBC/Harvest-Pty-payroll per strategic plan. Need the invoicing name.*

**AMBIGUOUS — needs a rule:**
- Capex tools (reusable, ACT-owned) vs consumed site-improvement spend — both "invested in Harvest"
  but only the latter is Fund-eligible. Tag a `capex` vs `improvement` flag if the distinction matters.
- Flight Bar Witta $2,401 — Xero-tracking says Harvest; audit hypothesis says NT travel → ACT-OO. HOLD.
- Kennards Hire $29K — confirm all hires were Witta-site, not NT/other-project.
- Founder time (Ben/Nic) — director loan / unpaid, not invoiced → not in actuals.

**OUT — not Harvest:**
- RNM Carpentry (already removed). NT travel (Alice Springs/Tennant Creek) → ACT-OO. NM Personal account
  (Nic's pre-cutover, already excluded). ACT-wide opex not specific to the site.

## Decisions (Ben, 2026-05-26)

- **Q1 — scope: ALL ACT Harvest spend** (~$115K+), not just Fund site-level. Budget side reflects total
  investment in the site. Zones get revised budgets sized to reality, not just the $50K Fund roadmap.
- **Q2 — vendor map:** I draft; Ben confirms shared/ambiguous ones.
- **Q3 — garden budget: set a revised garden budget** (I propose from actuals + remaining work, Ben edits).
- **Q4 — miscodes: retag in Supabase now.** RNM Carpentry → untag (NULL, not Harvest); Flight Bar Witta
  → ACT-OO. Manual source (guard-protected). Supabase-only, no Xero push.

## 2026-05-26 execution log
- Re-authed Xero (token expired 2026-05-18); ran full sync → bank data current to 2026-05-25.
- **Swept 132 pre-Jan-2026 rows ($65,815) out of ACT-HV** (sync had re-tagged them via xero_tracking/vendor_rule). Stamped `manual-untagged-pre-jan26`. Pre-Jan keeps returning on sync until the Xero tracking categories are removed (push-back session).
- **Joey = Joseph Kirmos** (acct 486 "Provision of Labour"). Split his post-Jan labour **50/50**: $9K ACT-HV + $9K ACT-GD (`manual-joey-5050-2026-05-26`). Deduped the 29-Mar same-day/same-amount duplicate.
- Clean post-Jan **ACT-HV baseline ≈ $126,181** (gross, bills + bank spend). Category split: Garden & landscaping $37.8K · Timber/structures $26.5K · Materials/hardware $17.8K · Design $16.9K · Tools/equipment $12.9K · Labour (Joey 50%) $9K · Hospitality $4.1K · Fuel $1.1K.
- Picker `/finance/transactions` made **deep-linkable** (reads `project`/`since`/`accounts` from URL; fixed a mount race). Uncommitted.
- Shipped a shareable spend table to Notion.

## Decision log
- 2026-05-26 — Config-backed not DB-backed: data is small/static, avoids a migration, Ben can edit budgets in JSON. (vs BG Fit's `bgfit_budget_items` table — overkill here.)
- 2026-05-26 — Reuse API `realExpenseRows` for actuals: already deduped (bills + unmatched bank spend), avoids re-introducing the double-count.
