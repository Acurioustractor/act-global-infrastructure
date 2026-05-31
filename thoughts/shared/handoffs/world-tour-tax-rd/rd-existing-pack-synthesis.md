---
title: "R&D existing-pack synthesis (read-only)"
date: 2026-05-31
source_pack: thoughts/shared/rd-pack-fy26/ + wiki/projects/*/rd-activity-register.md
pack_last_updated: 2026-05-07
purpose: World-tour tax/R&D synthesis. Captures the four registers, salary CSV structure, and Standard Ledger posture from the existing FY26 R&D pack. No new figures invented — every dollar traced to the source file.
---

# R&D existing-pack synthesis

## Pack-level facts (from README + audit-trail + receipt attestation)

- **Registrant:** A Curious Tractor Pty Ltd, ACN 697 347 676. FY25-26 (1 Jul 2025 – 30 Jun 2026).
- **Path:** Path C. FY24-25 forfeited (sole-trader period ineligible). 30 Apr 2026 deadline does NOT apply. FY26 is first eligible year; lodgement window Jul 2026 – 30 Apr 2027.
- **Refund rate:** 43.5% refundable offset (sub-$20M aggregated turnover, base-rate entity).
- **Pack total (four core registers):** AUD **$354,047**. Expected refund range **$130,910 – $154,010** (low = 0.435 × claim × 0.85 receipt threshold; high = 0.435 × claim).
- **Money Framework wider estimate:** ~$627K R&D-eligible spend / realistic refund **$180–250K** (rebuttal doc says $180–220K). The four registers cover ~58% of that; residual ~42% is untagged ACT-IN core (agent system, ALMA, governed proof, platform infra) + founder personnel on those.
- **Pack status:** "Assembling — WARN" (62 per the SL-scope doc), ceiling is structural; 3 of 4 warnings closed.
- **ACT-OO (Oonchiumpa):** deliberately NO claim attached — technical components TBD with Kristy Bloomfield + Tanya Turner; logged as a structural gap, not a claim, to avoid overclaim before community alignment.

---

## ACT-CG — CivicGraph ($61,500 claim · expected refund ~$26,753 · lead Ben · status in_progress)

**Core activity:** Cross-source organisational entity resolution.
**Hypothesis:** Entities from GHL, Xero, GrantConnect + AU registers (ASIC/ACNC/ORIC) can be resolved to a single canonical record at ≥92% precision / ≥85% recall via deterministic-rules-first + LLM-fallback, where fuzzy-match libs (fuzzywuzzy, recordlinkage) plateau at ~70% precision on AU data.
**Technical uncertainty:** ABN-vs-ACN dup, trading-as mismatch, ACNC↔ASIC charity twins, ORIC corps with only an ICN, privacy-scrubbed ACNC bulk export. Can AU-context rules + LLM fallback hit >90% precision at <$0.001/pair on a 46%-pollution starting set (8,826 rows)?
**Supporting activities (subsumed in core, no separate $):** S1 Tier-1.5 ACNC undocumented-API discovery (cbc67fe); S2 website-scrape contact extraction (c910fad); S3 Tier-3 agent-research enrichment (Anthropic SaaS line $14,000); S4 gs_entities 3-pass DQ sweep (f8d5f0c).
**Dollar figures:** $47,500 Ben personnel (≈20% of ACT-IN bucket × $250K × 95% R&D) + $14,000 Anthropic+Supabase = $61,500.
**Status/outcomes (interim):** DQ sweep 8,826→4,729 rows, pollution 46%→0%. Tier-1.5 ACNC enrichment 99.4% per-charity yield; email 44%, phone 41% (both 0 at start). Tier-2 scrape 80% yield; Tier-3 agent 92% resolution.
**Gaps:** 200-row gold set NOT assembled → precision/recall not citable; end-to-end cost-per-pair not computed; controls (fuzzywuzzy baseline) not run; provenance sidecar TBD; **project-code ambiguity ACT-CG vs ACT-CS (wiki header) unresolved**. Note: CivicGraph spend is bundled into ACT-IN at bill level — no separate ACT-CG bill in xero_invoices (surfaces only in xero_transactions).

## ACT-EL — Empathy Ledger ($79,750 claim · expected refund ~$34,691 · lead Ben · status in_progress)

**Core activity:** OCAP-respecting consent capture + multi-tenant story ledger.
**Hypothesis:** A consent-capture system in an OCAP context can use the recording itself as the audit trail (not a paper signature) at ≥99% verifiability (any third-party reviewer locates moment/conditions/withdrawal of consent in <60s). **Sub-hypothesis:** a multi-tenant ledger can hold org-scoped read paths AND cross-org gallery sharing (via `act_project_code` ecosystem key) without leaking provenance or breaking consent.
**Technical uncertainty:** OCAP/CARE literature describes rights, not a verifiable schema; standard tools (OneTrust etc.) assume consent=form-click, identifiable subject — none hold (verbal consent in language, no email, posthumous-naming protocol).
**Supporting activities (subsumed):** S1 multi-tenant schema migration; S2 cross-org photo manager (ddbc9d3c); S3 hide-empty-projects toggle; S4 wiki living library + OCAP governance (e3a0728); S5 consent-in-action dashboard (4fff285); S6 live-consent placeholder replacement (4856e13).
**Dollar figures:** $30,000 Nic (15% × $200K) + $23,750 Ben (10% × $250K × 95%) + $26,000 Anthropic+Supabase+storage = $79,750. (Note: direct ACT-EL bills are only $1,304; the larger SaaS spend is bundled in ACT-IN at bill level.)
**Status/outcomes (interim):** Multi-tenancy schema live (43 projects, 412 storytellers, 91 galleries, 3,793 associations, 5,039 media_assets, verified 2026-04-06). Cross-org photo manager working. Gallery paginated to 3,018 items.
**Gaps:** the <60s third-party-reviewer audit NOT run (needs community elder + outside lawyer + ~10-story sample); read-path p95 latency not benchmarked; no automated cross-org-leakage=0 test; provenance sidecar TBD; OCAP framing to be confirmed with community partners. Ground truth = 4 live approvals (Oonchiumpa, BG Fit, Mounty Yarns, PICC).

## ACT-GD — Goods on Country ($188,250 claim · expected refund ~$81,889 · lead Nic · status in_progress)

**Core activity:** Buyer-supplier matching + demand-side procurement infrastructure.
**Hypothesis:** A multi-criteria scoring algorithm (geo proximity + supplier delivery-ceiling profile + buyer spend velocity + IPP compliance signal) produces matches with ≥40% first-order conversion vs ~12% manual baseline, on-time delivery within 5pp of baseline.
**Technical uncertainty:** Existing products (Supply Nation directory, GovERP, ATO Indigenous Business Directory) are static directory queries; no dynamic delivery-ceiling profiling under sparse history (<5 orders/supplier breaks collaborative filtering). What confidence threshold for human review? Can IPP signal travel without becoming a gameable checkbox?
**Supporting activities (subsumed):** S1 Demand Register schema + GHL "Signal" pipeline; S2 A1 Procurement Analyst agent stub (5610fe3); S3 A2 second agent stub; S4 Goods CRM kanban + Xero↔GHL reconciler (0db21ce, b6ca767, 52c9f8b); S5 pipeline measurement dedup (119f479, 2026-05-07); S6 shared receipt automation (cross-ref ACT-EL S5/S6).
**Dollar figures:** $50,000 Nic (25% × $200K) + $23,750 Ben (10% × $250K × 95%) + $42,000 algorithm-engineering contractor + $72,500 cloud+LLM = $188,250. (DB-attested ACT-GD bills total $247,837 across 154 bills at 99.5% receipt coverage — the register claim is conservative vs DB.)
**Status/outcomes (interim):** Demand Register live in GHL; migrate-goods-demand-signals.mjs dry-run tested (not yet run in prod); A1 stub committed, production deploy pending PM2; CRM kanban + reconciler live; pipeline dedup corrected 97→27 opps, $138.9M→$1.46M weighted.
**Gaps:** NO conversion-rate measurement yet (treatment cohort not run); A1 top-3 acceptance rate unmeasured (not in prod); Demand Register retention rate unmeasured (only dry-run); on-time delivery unmeasured for either cohort; provenance sidecar TBD; IPP phrasing to confirm with First Australians Capital + Supply Nation.

## ACT-JH — JusticeHub ($24,547 claim · expected refund ~$10,678 · lead Ben · status in_progress)

**Core activity:** Federated community-led-services evidence layer.
**Hypothesis:** Community-led justice-alternative programs can be mapped to government procurement codes (Crown Commercial equivalents, IPP categories, justice-reinvestment line items) at ≥80% match rate via deterministic-rules-first + LLM-fallback, where existing registries assume central authority and can't represent community-controlled services without breaching sovereignty. **Sub-hypothesis:** the same layer routes impact-evidence (EL v2 transcripts + CivicGraph cost-per-outcome) into one funder-readable object without community data leaving its consent boundary.
**Technical uncertainty:** Crown Commercial / GSA Schedules / AusTender treat catalog as central authority. Need a federated schema that lets a community org publish service descriptions without ceding data, lets a funder query fit without retrieving underlying data, maps to procurement codes on the funder's side, carries revocable consent. Crosses three data systems (JH catalog, EL v2, CivicGraph).
**Supporting activities:** S1 evidence DB population (430 models); S2 cross-EL integration (6329d53); S3 Brave Ones digital field pack (6eb2c93); S4 service catalog + degrade-to-empty resilience (c7a59c2, 7a127b9); S5 Centre of Excellence rewrite (1da8f83); S6 funding regression smoke + schema alignment.
**Dollar figures:** $23,750 Ben (10% × $250K × 95%) + $701 ACT-JH bills + ~$96 ACT-JH transactions = $24,547.
**Status/outcomes (interim):** JH platform live — 1,000+ alternative models mapped, 430 with evidence data, $94.6B funding tracked, 98,418 orgs indexed. Cross-EL hero-photo fetch working. Brave Ones field pack shipped. **601 FY26 commits live in the separate `/Users/benknight/Code/JusticeHub` repo** (not in this repo's git history).
**Gaps:** 100-row procurement-code gold set NOT assembled; precision/recall not benchmarked; cost-per-mapping not measured; 0%-leakage assertion test not written; **wider JH team's personnel cost NOT yet R&D-allocated** (open with JH team + SL); provenance sidecar TBD.

---

## salary-allocations.csv — exact column structure

**Header (8 columns):**
```
staff,project_code,period_start,period_end,percentage,personnel_basis_aud,rd_eligible_aud,evidence
```

- `staff` — person or vendor/cost line (e.g. "Benjamin Knight", "Nicholas Marchesi", "Algorithm engineering contractor + cloud + LLM (ACT-GD aggregate)").
- `project_code` — ACT-CG / ACT-EL / ACT-JH / ACT-GD / ACT-DO / ACT-CORE / ACT-IN, plus TOTAL / pseudo-rows ("FOUNDERS COMBINED", "PACK TOTAL").
- `period_start`, `period_end` — ISO dates (all rows 2025-07-01 → 2026-06-30).
- `percentage` — free-text allocation basis (e.g. "10% × 95% R&D", "25%", "~20% of ACT-IN bucket × 95% R&D").
- `personnel_basis_aud` — base salary/invoicing figure (250000 Ben, 200000 Nic, "—" for vendor lines).
- `rd_eligible_aud` — the claimed R&D-eligible dollar amount.
- `evidence` — quoted free-text citing the Money Framework decision log + DB attestation.

**Key rows:** Ben TOTAL 95% = $237,500; Nic TOTAL 40% = $80,000; FOUNDERS COMBINED $317,500; ACT-GD vendor aggregate $247,837; ACT-IN SaaS $224,144; ACT-EL direct bills $1,304; PACK TOTAL (four registers) $354,047.

---

## Standard Ledger — current scope/posture + open asks

(from `thoughts/shared/plans/2026-05-17-standard-ledger-scope-alignment.md`)

- **SL is now also the R&D consultant** (confirmed 2026-05-17) — no separate R&D consultant engagement needed. This removed §3 (R&D consultant selection) from the migration checklist.
- **24 workstreams** total: 18 confirmed engaged, 3 newly confirmed (R&D + Goods charity + Farm lease), 3 advisory/parallel. R&D-specific: #5 R&D consulting, #19 R&D FY26 claim lodgement via Pty (Aug-Oct 2026), #20 AusIndustry R&D registration for FY27 (Jul-Aug 2026).
- **Primary SL contact: still "TBD"** across the entire doc — top open ask is to name one contact.

**Open asks ON Standard Ledger (R&D-relevant):**
- R&D engagement scope confirmation IN WRITING — pricing + deliverables for (a) FY26 pack validation vs ATO/AusIndustry rules, (b) FY26 claim lodgement, (c) FY27 registration.
- Fair-market salary determination for Nic FY26 ($200K range) — directly sets the R&D-eligible base ($80K at 40%). Plus Ben's Knight Photography PSI/PSB risk assessment.
- Knight Photography GST backdating decision (1 Jul 2025 or not).
- Goods charity Option A/B/C structural advice (recommendation is C).
- Farm lease market-rate guidance (affects R&D-supporting expense defensibility).

**Open asks SL has ON us (R&D-relevant):**
- R&D pack at PASS grade — currently **WARN/62**; "3 of 4 warnings closed; ceiling structural".
- Untagged transaction queue cleared (~69 transactions + 175 invoices).
- Cross-entity mapping spreadsheet re-run after untagged clear (first run 2026-05-05, 246 REVIEW lines).

**R&D risk on the engagement:** "SL underestimates R&D consultant workload + we end up needing a separate one anyway" → mitigation = confirm R&D scope in writing this week with specific deliverable list + pricing.

---

## Notable gaps / discrepancies found

1. **Canonical Path C plan file is MISSING.** `thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md` is referenced by the README, all four registers, and the SL-scope doc, but **does not exist** at that path. The only on-disk R&D-plan artefacts are archived: `thoughts/shared/plans/_archive/2026-05/rd-tax-incentive-fy26-package.md` (status: archive, dated 2026-03-27, uses the superseded "ACT Foundation / ABN 21 591 780 066" entity framing — pre-Path-C) and `...rd-tax-incentive-comprehensive-report.md`. The live Path-C decision content survives only inside the README's "Path C decision context" section. **If a reviewer follows the cross-references, the plan link is broken.**
2. **Internal total inconsistency in README.** Header/exec-summary say pack total $354,047 (refund $130,910–$154,010), but a mid-document note still cites an older "$147,250 / $180-220K" framing — left un-reconciled.
3. **AusIndustry registration not yet submitted** — listed as the #1 hard-rule gating item before lodgement.
4. **All four registers are `in_progress`** — none has a closed-out actual outcome; every one is blocked on assembling a hand-labelled gold set (200-row CG, 100-row JH) or running the treatment cohort (GD) / third-party audit (EL). The hypotheses and experiment designs are written, but no success-criterion has been measured against ground truth yet.
5. **No provenance sidecars exist** for any of the four registers (all marked TBD).
