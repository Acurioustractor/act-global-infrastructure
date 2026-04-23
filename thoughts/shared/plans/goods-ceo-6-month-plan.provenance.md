# Provenance — Goods CEO 6-Month Plan

> Sidecar for: `thoughts/shared/plans/goods-ceo-6-month-plan.md`
> Generated: 2026-04-23
> Generator: Claude Opus 4.7 (1M context), multi-agent research

## Summary

This plan synthesises four sources into a single operating document. Every material claim traces back to a named file, table, or fetched resource. Financial and capital-stack figures in particular carry a verification tier below.

## Sources queried

### Wiki (ACT infrastructure repo)
- `wiki/projects/goods.md` — canonical Goods article, 345 lines. Read directly 2026-04-23.
- `apps/command-center/public/wiki/goods/index.md` — command-center mirror, 345 lines. Read directly 2026-04-23.
- Related wiki articles cross-referenced via scout agent: `oonchiumpa.md`, `picc/picc.md`, `empathy-ledger.md`, `civicgraph.md`, `designing-for-obsolescence.md`, `custodian-economy.md`, `lcaa-method.md`, `act-farm/experiences/artist-residency.md`, `act-studio/cars-and-microcontrollers.md`.

### Codebase (ACT infrastructure repo)
- Git log on branch `rename-goods-slug`: commits `fe67e53` (config slug rename), `040625d` (wiki file rename). Both dated 2026-04-22.
- Git log 60-day window for Goods-related commits.
- Script inventory: `scripts/goods-auto-tagger.mjs`, `goods-contact-hygiene.mjs`, `goods-network-discovery.mjs`, `goods-relationship-history.mjs`, `tag-statement-lines.mjs`, `auto-tag-fy26-transactions.mjs`, `tag-rd-eligibility.mjs`, `recode-xero-bills.mjs`, `add-tracking-to-bank-txns.mjs`, `generate-project-summaries.mjs`, `align-ghl-opportunities.mjs`, `weekly-reconciliation.mjs`.
- Command-center surfaces: `apps/command-center/src/app/goods/page.tsx`, `/api/goods/*` routes, `src/lib/wiki-files.ts`, `src/lib/nav-data.ts`, `src/app/projects/[code]/page.tsx`, `src/app/compendium/page.tsx`, `src/app/compendium/[project]/page.tsx`, `src/app/api/development/overview/route.ts`, `src/lib/webhooks/ghl-handler.ts`.
- Config files: `config/project-codes.json`, `config/active-projects.json`, `config/living-ecosystem-canon.json`.
- Plan files under `thoughts/shared/plans/`: `goods-civicgraph-review.md`, `fy27-financial-strategy.md`, `rd-tax-incentive-comprehensive-report.md`, `pty-ltd-transition-and-rd-strategy.md`.

### GrantScope (separate repo at /Users/benknight/Code/grantscope)
- Strategic: `MISSION.md`, `OPERATING_PLAN.md`.
- Goods-specific scripts: `seed-goods-decision-profile.mjs`, `seed-goods-communities.mjs`, `seed-goods-foundation-contacts.mjs`, `hydrate-goods-communities.mjs`, `hydrate-goods-procurement.mjs`, `estimate-goods-demand.mjs`, `goods-procurement-matcher.mjs`, `goods-supply-chain-analyst.mjs`, `goods-lifecycle-sync.mjs`, `fix-goods-coverage.mjs`, `check-contract-alerts.mjs`.
- General matching scripts: `act-partnership-scan.mjs`, `act-harvest-match.mjs`, `check-donor-contract-crossover.mjs`.
- Workspace route: `apps/web/src/app/goods-workspace/page.tsx` and `goods-workspace-client.tsx`.
- GHL push route: `apps/web/api/goods-workspace/ghl-push`.
- Database tables referenced: `goods_communities`, `goods_procurement_entities`, `goods_procurement_signals`, `foundations`, `grant_opportunities`, `v_nt_community_procurement_summary`, `ghl_opportunities`, `ghl_contacts`, `ghl_sync_log`, `austender_contracts` (672K rows), `goods_products`, `goods_supply_routes`, `goods_asset_lifecycle`, `mv_funding_by_postcode`, `mv_funding_by_lga`, `org_profiles`.

### Notion
- Page: Goods HQ (page ID `177ebcf981cf805fb111f407079f9794`), fetched via `mcp__claude_ai_Notion__notion-fetch` on 2026-04-23.
- Raw output saved to `tool-results/mcp-claude_ai_Notion-notion-fetch-1776939448980.txt` (62,473 chars).
- Embedded databases referenced: PPPP Dashboard, Actions, Knowledge Hub, Manufacturing Plant Handovers.
- Linked sub-pages: StretchBed HQ, Household Washer v2, On Country Goods Production HQ, QBE Catalysing Impact HQ, FRRR Grant, Tennant Creek Shed Grant, QBE Grant context, Goods Videos and Photos, Snow latest submission, Goods Interest Register, Goods Project Alignment, Snow Board impact report Sep-Nov 2025, QBE full opportunity page.

### Brand references
- `.claude/skills/act-brand-alignment/references/brand-core.md` — ACT identity, method, values, voice and tone.
- `.claude/skills/act-brand-alignment/references/writing-voice.md` — Curtis method, forbidden AI tells, rooms and bodies by project.

## Verification tiers

### Verified — queried a named source directly
- 389 products deployed (wiki)
- 8 communities served (wiki)
- 9,225kg plastic diverted (wiki)
- 33 Empathy Ledger storytellers (wiki)
- $445,685 philanthropic funding received (wiki summary; source breakdown: Snow $193,785 + Vincent Fairfax $50K + AMP Spark $21,900 + FRRR + TFN per Notion)
- $537,595 total revenue recorded (wiki, sourced from Xero ACT-GD — not re-queried on Xero today)
- Tennant Creek $36K unfunded cashflow gap (wiki)
- $16,566,450 open opportunities (Notion rollup)
- 103 open opportunities count (Notion)
- 11/11 overdue Notion actions as of 2026-03-27 (Notion Project Intelligence callout)
- Wiki slug rename state (git log + file content)
- `wiki-files.ts:121` still maps `goods → projects/goods-on-country` (direct read)
- Miwatj missing from `BUYER_ANCHOR_NAMES` (direct read of grantscope client)
- NT/QLD filter in Goods Workspace page query (direct read)
- Goods HQ Notion page structure and databases (MCP fetch)
- Advisory Board names and community contact names (Notion + wiki cross-check)
- Five capital-stack waterfall funder names and relative status (decision profile seed script + wiki)

### Inferred — derived from available data, not directly confirmed
- Goods wiki page 404 in command-center: inferred from file mapping state; needs browser verification
- FY26 R&D $65,516 direct / $87,355 apportioned: wiki-stated, not re-queried from Xero ACT-GD tagged transactions for this plan
- FY27 revenue $585K projection: sourced from `fy27-financial-strategy.md`, not re-modelled
- Six-month capital waterfall timing: synthesised from decision profile + wiki + published program timelines, not confirmed by each funder

### Unverified — taken on faith
- QBE Catalysing Impact timeline (shortlisted; August 2026 outcome date is indicative)
- REAL Innovation Fund decision date (EOI submitted March; grant decision date unknown)
- PFI $640K submission state ("submitted" per wiki; seeded from compendium, not DB-verified)
- Snow Round 4 $200K availability (stated in decision profile, not confirmed by Snow)
- Jinibara facility capital requirement (drawn from wiki unit economics, not re-modelled)

## Known data quality flags

- Notion Goods HQ `Revenue Actual: $50,000` and `Revenue Potential: $50,000` are stale against Xero $537K and capital pipeline $16.5M. Fields are unused, not refreshed.
- Goods HQ Project Intelligence callout is 27 days old (2026-03-27) as of plan creation (2026-04-23). Last Notion activity: 8 days ago at time of callout.
- `wiki/output/living-ecosystem-canon-latest.json:198` still carries stale `goods-on-country` path — the generated output has not been regenerated since the wiki rename.
- Two entries in `config/active-projects.json` for Goods-related EL records (lines 115 `goods-on-country` and 125 `goods`) — duplication needs resolution.
- `grantscope/scripts/goods-lifecycle-sync.mjs` hard-codes `/Users/benknight/Code/Goods Asset Register` — cron runs on other machines silently no-op.
- Buyer scoring is keyword-only; semantic embedding match for Goods foundations available via `act-harvest-match.mjs` pattern but not wired into the workspace.

## How to reproduce

1. Read `wiki/projects/goods.md` in full.
2. Fetch Notion page `177ebcf981cf805fb111f407079f9794` via `mcp__claude_ai_Notion__notion-fetch`.
3. Review grantscope strategic docs (`MISSION.md`, `OPERATING_PLAN.md`) and Goods scripts (list above).
4. Scan command-center surfaces for `goods` references via grep.
5. Check git log on `rename-goods-slug` branch for slug-rename state.
6. Cross-reference opportunity pipeline in Notion against GHL `ghl_opportunities` where `pipeline = 'Goods'`.
7. Verify capital stack status by pulling `org_profiles` in grantscope Supabase for the ACT org, reading the decision profile and foundation contact rows seeded by `seed-goods-decision-profile.mjs` and `seed-goods-foundation-contacts.mjs`.

## Consequences of claims in this plan

This plan drives capital pursuit for FY27 including $1.5M+ in confirmed + pipeline capital. Because philanthropic and impact-capital funders verify claims independently, any figure carried forward from this plan into a grant application, investment memorandum, or board report must be re-verified against live Xero/DB state on the day of use. This sidecar is the audit trail for the plan; a funder-facing document requires its own provenance sidecar generated from live queries, not from this one.
