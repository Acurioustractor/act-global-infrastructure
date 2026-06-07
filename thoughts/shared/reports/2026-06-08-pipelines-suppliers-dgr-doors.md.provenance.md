---
title: "Funding Relationships — Pipelines, Suppliers, DGR Doors Provenance"
status: Draft
date: 2026-06-08
type: provenance
tags:
  - provenance
  - verification
  - audit
source_packet_id: na
canonical_entity: na
---

# Funding Relationships — Pipelines, Suppliers, DGR Doors Provenance

## Purpose

- Output: report (three-lane extension of the funding-relationship map)
- Intended destination: `thoughts/shared/reports/2026-06-08-pipelines-suppliers-dgr-doors.md`
- Why it was generated: Ben added three funding-relationship lanes (pipelines/email-spine, suppliers-as-relationships, DGR doors via Butterfly). Companion to the concurrently-authored `2026-06-08-funding-relationships-current-state.md`, which it must not duplicate.

## Data Sources Queried

All queries against shared Supabase project `tednluwflfhxyucgwigh` (confirmed via env `NEXT_PUBLIC_SUPABASE_URL` host) on **2026-06-08**, through the `exec_sql` RPC (not subject to the PostgREST 1000-row cap). Queries run sequentially. Every column verified against `information_schema.columns` before use.

| Source (table/view) | Type | Snapshot | How it was used |
|---|---|---|---|
| `ghl_opportunities` (771 rows) | runtime mirror | 2026-06-08 | Pipeline counts, stage breakdown, named active opps + buyer deals (Lane A1/A2). Cols: `pipeline_name, stage_name, status, monetary_value, last_stage_change_at, name` |
| `ghl_contacts` (2,572 rows) | runtime mirror | 2026-06-08 | Funder-funnel contacts + community-line violation scan (Lane A3/A5). Cols: `full_name, company_name, tags[], last_contact_date` |
| `ghl_pipelines` (15 rows) | runtime mirror | 2026-06-08 | Pipeline inventory cross-check |
| `supporter_comms_summary` (848 rows) | materialised view | 2026-06-08 (`computed_at`) | Email-spine mining — active money conversations, **subjects only** (Lane A4). Cols: `domain, last_touch_at, last_touch_direction, last_touch_subject, total_365d` |
| `foundations` (11,042 rows) | GrantScope mirror | 2026-06-08 | Corroborate spine domains; DGR foundation counts (Lane A4 join, Lane C4). Cols: `name, website, has_dgr, target_recipients[], thematic_focus[], description, application_tips` |
| `xero_transactions` (3,721 rows) | runtime ledger | 2026-06-08 | Top suppliers by SPEND, FY26, two-account rule (Lane B1). Cols: `contact_name, total, date, type, bank_account` |
| `xero_invoices` (2,227 rows) | runtime ledger | 2026-06-08 | Top suppliers by paid ACCPAY bills, FY26 (Lane B2). Cols: `type, status, contact_name, total, date` |
| `grant_opportunities` (25,048 rows; 2,960 open) | GrantScope mirror | 2026-06-08 | DGR/Indigenous/charity open-grant counts + named examples (Lane C1–C3). Cols: `status, dgr_required, accepts_charity, eligibility_criteria, description, requirements, name, provider, target_recipients[]` |

## Verification Status

- `Verified:` All row counts and per-row facts queried directly from the named tables. GHL pipeline counts, stage breakdowns, named opportunities/buyer deals, funder-funnel contacts, community-line violations, supplier frequency/total/recency (both Xero tables), `foundations.has_dgr=true` count (551), Indigenous-targeted open grant count (318, name/desc floor), and all named grant/foundation examples.
- `Inferred:` DGR-required open-grant count (11) and charity/NFP open-grant count (97) — derived from free-text keyword matching because the structured `dgr_required` field is populated for only 8 rows and `accepts_charity` for 433. DGR-foundation Indigenous focus (131) and any-Indigenous-focus (1,900) — text match on `thematic_focus`/`target_recipients`/`description`. Spine→foundation domain join (Lane A4 corroboration) — fuzzy host match.
- `Unverified:` The Grants-pipeline aggregate value ($272.3M) — flagged as discovery-dump noise, not a real ask. The exact additive supplier totals across SPEND + ACCPAY (overlap for connector-billed vendors — bill row and card-settlement row are separate; treated as complementary views, not summed).

## Human Decisions / Gates

- Editorial review: pending (Ben)
- Cultural review: **action required** — Lane A5 lists 3 confirmed community-line violations (Kristy Bloomfield, Shaun Fisher, Rachel Atkinson) inside funder/partner drips. Remediation is a gated Tier-2 GHL write, deliberately NOT performed by this read-only report.
- Consent review: not-required (no storyteller content published; email subjects only, no bodies; community people flagged as violations, not promoted)
- Release approval: pending

## Known Gaps And Assumptions

- **Email spine not in raw form in this DB.** `gmail_messages` = 25 rows, `messages` = 1 — the 27,201-comms / ~13.6k-Gmail spine is NOT materialised as message rows here. The only mineable surface is the `supporter_comms_summary` materialised view (848 domains, subject-line level). "Last contact" and 365d touch counts are reliable; full-thread body mining requires the upstream source (Beeper/Gmail), which was out of scope and not touched.
- **DGR-gate counts under-count.** Structured `dgr_required` near-empty (8/25,048); free-text keyword match is a floor, not the true population. Same for charity-only and "foundations that only fund DGR orgs" (10 explicit = floor).
- **Supplier table overlap.** Vendors billed via connectors (Defy, Qantas, Bunnings, Airbnb, Kennards) appear in BOTH `xero_transactions` SPEND and `xero_invoices` ACCPAY. The two tables are NOT additive for those vendors; frequency + recency are the relationship signal.
- **Two-account rule applied** — only `NAB Visa ACT #8815` + `NJ Marchesi T/as ACT Everyday`; excluded `NM Personal` (note trailing space in DB value) + `NJ Marchesi T/as ACT Maximiser`. "Nicholas Marchesi" ($226K SPEND) flagged as founder drawings/reimbursement, not a supplier.
- **Spine→foundation join is fuzzy** (host ILIKE). `google.com`/`acnc.gov.au` over-matched and were excluded; corroboration matches marked Inferred.
- **Tag hygiene noise.** `role:community` mis-applied to funder staff (FRRR, Paul Ramsay) inflates community counts; the 3 A5 violations are the genuine community-storyteller breaches.

## Reproduction Steps

1. Set env from repo `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Use the `exec_sql` RPC idiom from `scripts/analyze-untagged.mjs` (a Supabase JS client `.rpc('exec_sql', { query })`). On Cloudflare 522 / ECHECKOUTTIMEOUT / fetch-failed, back off 60s and retry once.
2. Lane A: query `ghl_opportunities` grouped by `pipeline_name` and (filtered to Grants) by `stage_name`; pull `status IN ('Application In Progress','Grant Submitted','Grant Declined')` and `Goods — Buyer Pipeline` open opps. Query `ghl_contacts` where funnel tag = ANY(tags) and `last_contact_date >= now()-interval '12 months'`. Violation scan: `('role:storyteller'=ANY(tags) OR 'lane:community'=ANY(tags)) AND (funder/partner-drip tags)`. Spine: `supporter_comms_summary` where `last_touch_at >= now()-interval '12 months'` and `last_touch_subject` ILIKE money keywords OR `total_365d >= 5` on funder/gov domains.
3. Lane B: `xero_transactions` `type='SPEND'` AND `bank_account IN (two accounts)` AND `date BETWEEN '2025-07-01' AND '2026-06-30'`, GROUP BY `contact_name`, ORDER BY `sum(abs(total))`. Repeat on `xero_invoices` `type='ACCPAY' AND status='PAID'` same date range.
4. Lane C: counts on `grant_opportunities` `status='open'` with the keyword predicates in the report tables; foundation counts on `foundations` `has_dgr` + text focus match. Pull named examples with the same predicates + LIMIT.
5. Verify: re-run any count query; spot-check named rows by `name`/`contact_name`.

## Linked Artifacts

- Output artifact: `thoughts/shared/reports/2026-06-08-pipelines-suppliers-dgr-doors.md`
- Companion (not authored here): `thoughts/shared/reports/2026-06-08-funding-relationships-current-state.md`
- Query idiom reference: `scripts/analyze-untagged.mjs`
- Validation log: this file
