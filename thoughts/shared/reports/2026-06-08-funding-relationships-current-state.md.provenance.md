---
title: "ACT Funding-Relationship Map — Current State Provenance"
status: Draft
date: 2026-06-08
type: provenance
tags:
  - provenance
  - verification
  - audit
  - funding
source_packet_id: na
canonical_entity: act-funding-relationships
---

# ACT Funding-Relationship Map — Current State Provenance

## Purpose

- Output: report — ACT's current-state funding-relationship map (3 lanes: philanthropy, procurement, partners) + warm→cold ladder + adjacency recipes.
- Intended destination: `thoughts/shared/reports/2026-06-08-funding-relationships-current-state.md`
- Why it was generated: Ben needs the warm base to lead the funding picture so warm→cold pipelines (adjacency search for new options) can be built on top of it.

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| `xero_invoices` (Supabase `tednluwflfhxyucgwigh`, Xero mirror) | runtime ledger | queried 2026-06-08; FY26 = 2025-07-01…2026-06-30 | Authoritative "who pays us" — ACCREC PAID grouped by contact; AUTHORISED for in-flight; all-time for lapse gap. Filter `type='ACCREC' status='PAID'` (NOT `amount_due=0`). |
| `foundation_relationship_signals` | derived signals table | snapshot 2026-06-08 (47 act_* rows applied 2026-06-07) | act_funded (10, $630,790.79 all-time), act_pipeline (36, auto-discovered), act_email_contact (1), funder_grantee (8). Dollars from `metadata->>'total_paid'`, source_url `act://xero/invoices`. |
| `ghl_opportunities` | CRM mirror (live money fields) | snapshot 2026-06-08 | Won/open relationship pipeline by status & pipeline_name; monetary_value, stage_name, pile, project_code. Separated curated pipelines from the auto-discovered "Grants" pipeline. |
| `austender_contracts` | gov procurement mirror | full table, 806,713 rows | Searched ACT's 3 entity ABNs + supplier names → zero matches (no federal footprint). |
| `v_act_procurement_buyers` (view) | derived target ranker | view def via `pg_views`; top-10 by total_relevant_spend | Procurement TARGETS (not relationships) — topic-scored gov buyers ≥$25k, last 3 yrs, ≥2 contracts. |
| `foundations` / `foundation_people` / `foundation_grantees` / `foundation_power_profiles` / `foundation_geo_focus` / `foundation_category_assignments` | foundation graph | schema verified 2026-06-08; 10,114 power profiles; Snow co-funder count run | Column names for adjacency recipes (R1–R4); Snow shares grantees with 8 foundations (verified). |
| `wiki/concepts/act-business-architecture.md` | canonical note | commit-current 2026-06-07 | Canonical partner list (Partnership trajectory) + FY26 per-project net. |
| `wiki/concepts/ecosystem-value-exchange.md` | canonical note | commit-current 2026-06-07 | Community-line / OCAP-holds–CARE-owes rule keeping the partner lane out of the funnel. |
| `thoughts/shared/field-decisions.jsonl` | Ben's relational decisions | 100 lines, latest ts 2026-06-06 | Field warmth rings (5/15/50/150) for funder/partner-attached people. |
| `scripts/foundation-shortlist.mjs` | read-only ranker (pointer) | header read 2026-06-08 | The cold-discovery tool the ladder points to (not executed here). |
| `config/notion-database-ids.json` | config | current | `grantTranchesDb` id — confirms tranche ledger lives in Notion, no DB table. |
| MEMORY.md (`ghl-money-alignment` topic) | memory note | 2026-06-08 session context | Grant-tranche total $592,211.79 / 11 tranches / 4 funders (Inferred, not re-queried). |

## Verification Status

- `Verified` (queried source directly this session):
  - FY26 ACCREC PAID = **$1,307,339.40 / 46 invoices**; per-funder breakdown (Snow $247,544.88 FY26 / $402,929.79 all-time; Centrecorp $123,332; VFFF $50,000; Regional Arts $33,000; Social Impact Hub $26,730; Dusseldorp $16,500; Red Dust $15,950; Brisbane Powerhouse $7,150; StreetSmart $5,500 FY26 / $9,400 all-time; Paul Ramsay $3,069 FY26 / $7,469 all-time; John Villiers $1,200).
  - Lane-2 payers: PICC $365,200; Sonas $118,580; Ingkerreke $103,099.70; SMART Recovery $59,700; Just Reinvest $27,500; Green Fox $27,000; Julalikari $19,800; Dept of Housing $1,500; Minjerribah Moorgumpin $1,155.
  - AUTHORISED in-flight: Rotary Eclub $82,500; Homeland School $44,000; Regional Arts $16,500; BG Fitness $15,400; Aleisha Keating $5,850.
  - `act_funded` all-time sum = $630,790.79 (10 foundations).
  - GHL: won 28 / $1,506,431.25; pipeline totals by name (Grants $272.3M, Goods Demand $16.37M, Goods Supporter $5.28M, Goods Buyer $2.60M, A Curious Tractor $1.11M); headline open asks REAL Innovation Fund $2.0M, WHSAC $1.7M.
  - AusTender: 806,713 rows, **0** matches for ACT's 3 ABNs/names → no federal procurement footprint.
  - `v_act_procurement_buyers` top-10 spend figures + view definition (keyword topic-scoring).
  - Foundation graph column names; Snow shares grantees with 8 foundations; 10,114 power profiles.
  - Connected project = `tednluwflfhxyucgwigh` (confirmed via env URL on every query).
- `Inferred` (derived from verified inputs or single memory source):
  - Grant-tranche ledger $592,211.79 / 11 / 4 funders — from MEMORY.md, Notion not re-queried (DB-only scope). Reconcile against Xero §1a before quoting externally.
  - Procurement-relevance scores in `v_act_procurement_buyers` are the view's keyword heuristic, not ground-truth fit.
  - Snow FY26-vs-all-time $155k gap attributed to pre-FY26 invoices (consistent with date filter; not line-itemised here).
- `Unverified`:
  - GHL contact tag arrays (`circle:gsd-alliance`, `partner-drip`) — `ghl_contacts` tag fields not queried this pass (budget); inner-circle membership must be read before acting.
  - GHL open-pipeline monetary values are entered amounts, not probability-weighted; stage discipline not audited.

## Human Decisions / Gates

- Editorial review: pending (Ben).
- Cultural review: not-required for this internal map; BUT the community-line rule is embedded — any downstream use that touches community partners (Oonchiumpa, Goods communities, storytellers) must pass `consent-check` and respect OCAP before external sharing.
- Consent review: n/a (no storyteller content published here).
- Release approval: internal report; not for external distribution as-is.

## Known Gaps And Assumptions

- Tranche ledger is Notion-resident and was taken from memory, not re-queried — single-source until reconciled against Xero.
- `v_act_procurement_buyers` top-10-by-spend over-weights mega-buyers (Defence/ATO, topic ~1.0); recipe R5 re-sorts for fit. The view also doesn't dedupe state vs federal naming.
- GHL "Grants" pipeline ($272M) is GrantScope auto-discovery, explicitly excluded from "relationships"; if treated as warm it would massively inflate the picture.
- Community-line GHL violation (Kristy Bloomfield / Tanya Turner in funder/partner-drip) noted but NOT fixed — out of this report's read-only scope; needs a gated Tier-2 GHL write.
- Dollar figures are cash-basis from the Xero mirror; mirror freshness depends on last `sync-xero-to-supabase.mjs` run (not checked this session).

## Reproduction Steps

1. Env: read `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`; confirm URL = `https://tednluwflfhxyucgwigh.supabase.co`.
2. Run each query via the `exec_sql` RPC, **sequentially** (never `Promise.all` — pooler exhaustion incident 2026-06-07); on Cloudflare 522 / ECHECKOUTTIMEOUT back off 60s, retry once. exec_sql is NOT 1000-row capped.
   - Lane 1: `SELECT contact_name, SUM(total), count(*), MAX(date) FROM xero_invoices WHERE type='ACCREC' AND status='PAID' AND date BETWEEN '2025-07-01' AND '2026-06-30' GROUP BY contact_name ORDER BY 2 DESC;`
   - `SELECT foundation_name, (metadata->>'total_paid')::numeric, (metadata->>'invoices')::int FROM foundation_relationship_signals WHERE signal_type='act_funded' ORDER BY 2 DESC;`
   - GHL: `SELECT status, count(*), SUM(monetary_value) FROM ghl_opportunities GROUP BY status;` and `… GROUP BY pipeline_name;`
   - Lane 2: `SELECT count(*) FROM austender_contracts WHERE replace(coalesce(supplier_abn,''),' ','') IN ('36697347676','22155132684','21591780066');` (expect 0); `SELECT definition FROM pg_views WHERE viewname='v_act_procurement_buyers';`
   - Lane 3: read the two wiki concept files + `field-decisions.jsonl`.
3. Verify: re-run the FY26 ACCREC PAID grand total — must equal **$1,307,339.40 / 46 invoices**. If it drifts, the Xero mirror was re-synced; re-pull per-funder rows.

## Linked Artifacts

- Output artifact: `thoughts/shared/reports/2026-06-08-funding-relationships-current-state.md`
- Cold-discovery ranker: `scripts/foundation-shortlist.mjs`
- Canonical partner source: `wiki/concepts/act-business-architecture.md`
- Community-line rule: `wiki/concepts/ecosystem-value-exchange.md`
- Tranche ledger (Notion): `grantTranchesDb` = `f8204bd0-abcd-42e6-b349-c33d6ac80ade`
