---
project: ACT-CG
project_name: CivicGraph
fy: FY26
entity: act-pty-ltd
registrant: A Curious Tractor Pty Ltd
registrant_acn: 697 347 676
claim_total_aud: 61500
category: core
ausindustry_registration: pending_jul_2026
status: in_progress
last_updated: 2026-05-07
---

# ACT-CG core activity 1: Cross-source organisational entity resolution

## Executive summary

CivicGraph (project code ACT-CG; wiki article also notes the satellite tag ACT-CS for the CivicScope front-end) is the systemic data layer of The Third Reality: 587,390 entities and 1,535,772 relationships joined across 21 government and registry sources. The R&D-eligible work in FY26 is the resolver layer that takes raw rows from four operational sources (GHL, Xero, GrantConnect, ASIC/ACNC/ORIC) and produces a single canonical organisational record in `gs_entities`.

Total claim FY26: ~$61,500 (Ben Knight ACT-IN 20% allocation × $250K Knight Photography invoicing × 95% R&D = $47,500 + Anthropic + Supabase consumption $14,000 — figures preliminary, subject to Standard Ledger reconciliation per `wiki/finance/money-framework-decision-log-2026-04-15.md` Decision 4 Option A).
Expected refund at 43.5% offset: ~$26,753.
Lead: Ben Knight.
Provenance sidecar: `wiki/projects/civicgraph/rd-activity-register.md.provenance.md` (TBD).

## Hypothesis

Organisational entities sourced from GHL, Xero, GrantConnect, and the Australian regulatory registers (ASIC, ACNC, ORIC) can be resolved into a single canonical record at ≥92% precision and ≥85% recall using a deterministic-rules-first / LLM-fallback approach, where existing fuzzy-matching libraries (fuzzywuzzy, recordlinkage) plateau at ~70% precision on Australian-context data.

## Technical uncertainty

Standard fuzzy-matching libraries treat the problem as string similarity. Australian organisational data has additional collisions that are not addressed by those libraries:

- ABN-vs-ACN duplication (many orgs hold both numbers; some sources record one, some the other)
- Trading-as names that don't match the registered legal name
- Charitable-arm twins where the same body holds an ACNC charity record and an ASIC company record under near-identical names
- ORIC corporations (Indigenous corporations) that hold neither ABN nor ACNC registration, only an ICN
- ACNC bulk export is privacy-scrubbed of contact details by design — the contact data lives behind undocumented dynamic API endpoints

The unresolved technical question: can a small set of Australian-context deterministic rules (ABN canonicalisation, common trading-name suffixes, ACNC↔ASIC reconciliation, ORIC fallback) plus an LLM fallback for ambiguous cases produce >90% precision at <$0.001 per pair, on a starting set with ~46% pollution rate (3,984 deregistered ORIC corps, 24 government departments, 2 junk concatenations, 88 ORIC↔ACNC duplicates among an initial 8,826 rows)?

This is non-trivial because: (a) standard libraries fail on Australian-specific cases; (b) the data sources disagree on canonical form; (c) the initial state was 46% noise; (d) cost-per-pair must remain low enough to run nightly on a 4,729-row corpus.

## Experiment design

- **Variables**: rule weights for ABN exact match, ABN canonical match (after stripping spaces and check-digit corrections), name normalisation depth (1 = whitespace + case; 2 = + punctuation + suffix stripping; 3 = + abbreviation expansion); LLM-fallback threshold (cosine similarity < t triggers Haiku call)
- **Controls**: `fuzzywuzzy` token-set-ratio baseline at thresholds 80, 85, 90 against the same input set
- **Treatment**: deterministic-rules-first / Haiku-fallback resolver applied to 4,729 organisational records across 4 sources
- **Ground truth**: 200-row hand-labelled gold set (TBD — needs to be assembled from the audit logs in `wiki/output/contact-enrichment/`)
- **Success criteria**: ≥92% precision, ≥85% recall, <$0.001 average cost per pair, full 4,729-row run completes in <10 min wall clock
- **Data capture**: `gs_entities` table audit columns (`is_community_controlled`, `metadata.duplicate_of`, `duplicate_detected_via`, `duplicate_abn`, `duplicate_detected_at`)

## Expected outcome (in progress)

Pre-experiment estimate, dated 2026-04-20 (commit f8d5f0c):

- Precision 90–94% on the 200-row gold set
- Recall 80–88%
- Average cost ~$0.0008/pair (Haiku fallback engages on the ambiguous ~15%)

## Actual outcome (interim, as of 2026-05-07)

What's measured so far (interim, partial):

- After 3-pass DQ sweep (commit f8d5f0c, 2026-04-20): 8,826 → 4,729 rows. Removed 3,984 deregistered ORIC corps + 24 government departments + 2 junk concatenations + 88 ORIC↔ACNC duplicates. Pollution rate dropped 46% → 0%.
- After Tier 1.5 ACNC API enrichment (commit cbc67fe, completed 2026-04-20): 99.4% per-charity yield (1,441/1,449 candidates returned full contact blocks via the undocumented `/api/dynamics/search/charity?search=<ABN>` + `/api/dynamics/entity/<uuid>` endpoints). 2,093 / 4,729 (44%) now have email; 1,918 / 4,729 (41%) have phone — both were 0 at session start.
- After Tier 2 website scrape: 80% yield (796 / 997 candidates).
- After Tier 3 agent research (Haiku-driven): 92% resolution rate (22/24 with confidence ≥3) at ~60–75K tokens per 8-org batch.

What's not yet measured (this is why category is `in_progress`):

- 200-row hand-labelled gold set is not yet assembled. Without it, the precision/recall numbers cannot be cited as evidence.
- Cost-per-pair has not been calculated end-to-end. Per-tier costs are known; the resolver pipeline cost is not.
- Yesterday's `grant_opportunities` dedup (9,474 rows removed, 32,503 → 23,029, partial unique index `grant_opportunities_source_name_uniq` added) was a downstream consumer of the same resolver logic. This will be cited as a real-world validation case once the gold set is in place.

## Linked supporting activities

- ACT-CG-S1: Tier 1.5 ACNC API discovery — locating the undocumented private endpoints that bypass the privacy-scrubbed bulk export. Linked, supports this core via data ingestion.
- ACT-CG-S2: Tier 2 website-scrape contact extraction with regex + AU-specific phone normalisation. Linked, supports this core via contact enrichment.
- ACT-CG-S3: Tier 3 agent-research enrichment (`scripts/enrich-contacts-via-agent.mjs`), brief-emit + ingest pattern. Linked, supports the LLM-fallback portion of the core resolver.
- ACT-CG-S4: gs_entities 3-pass DQ sweep (`scripts/gs-entities-data-quality-sweep.mjs`). Linked, supports this core via input cleanup.

## Evidence trail

- Hypothesis recorded in this file (commit TBD on first commit of this register).
- DQ sweep commit: f8d5f0c (2026-04-20) "feat(dq): gs_entities 3-pass cleanup — 4,010 rows reclassified".
- Tier 1-3 enrichment commit: cbc67fe (2026-04-20) "feat(enrichment): Tier 1-3 contact pipeline — 660 emails + 752 phones added".
- Foundational pipeline commit: c910fad "feat(contacts): three-tier contact enrichment workflow".
- Per-tier audit logs: `wiki/output/contact-enrichment/<ts>-<tier>.md` (Tier 1 / 1.5 / 2 / 3).
- Data-quality audit logs: `wiki/output/data-quality/<ts>-*.md`.
- Research-brief and research-result fixtures: `wiki/output/contact-enrichment/research-{briefs,results}/<gs_entity_id>.md`.
- Production resolver source: `scripts/entity-resolution.mjs`.
- ACNC cache: `data/acnc-cache/acnc-register.csv` (14MB, 65,386 rows, 24h TTL).
- Linked invoices for cohort-cost tracking: `xero_invoices` filtered by `project_code = 'ACT-IN'` (CivicGraph is bundled in ACT-IN at the bill level per Money Framework decision log Decision 4) — 516 bills, $224,144 total, FY26.
- Receipt coverage attestation: **PASS — 98.5% by value on ACT-IN bills FY26** per `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md` (DB queried 2026-05-07).

## Salary allocation

| Staff | Project code | Period | % of personnel cost | Personnel basis | R&D-eligible | Evidence |
|-------|--------------|--------|---------------------|------------------|--------------|----------|
| Benjamin Knight | ACT-CG (subset of ACT-IN) | 2025-07-01 to 2026-06-30 | ~20% of $250K Knight Photography invoicing × 95% R&D allocation | $250,000 | $47,500 | Money Framework decision log 2026-04-15 Decisions 1, 2, 4 (Option A); thesis line 64 |
| Anthropic + Supabase | ACT-CG | 2025-07-01 to 2026-06-30 | — | — | $14,000 | Xero invoices tagged ACT-IN (CivicGraph spend bundled in ACT-IN per Money Framework decision log Decision 4); attestation in `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md` shows ACT-IN bills 98.5% receipt coverage by value (FY26) |

**Org-wide R&D reconciliation note**: Ben's total FY26 R&D allocation is 95% of his $250K Knight Photography invoicing = $237,500 R&D-eligible (per Money Framework decision log 2026-04-15 Decision 1, citing thesis line 72). The ACT-CG-specific portion above (~20% of his Knight Photography invoicing × 95% R&D = $47,500) is one slice of the broader ACT-IN bucket which represents 60% of his time (thesis line 64). The remaining 40% of his time / 95% R&D = ~$95K covers Empathy Ledger work, Goods work, and other ACT-IN core activities not yet split into discrete activity registers. Decision log: `wiki/finance/money-framework-decision-log-2026-04-15.md`.

## AusIndustry components confirmation

All four components for this core activity are present in this register:
- Hypothesis (above)
- Technical uncertainty (above)
- Experiment design (above)
- Expected vs actual outcome (above — actual is `in_progress`, will close out before Jul 2026 lodgement window)

AusIndustry registration: pending. Target window Jul 2026 – 30 Apr 2027 per `thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md`.

## Open items before lodgement

1. Assemble the 200-row hand-labelled gold set from existing audit logs.
2. Run the controls (`fuzzywuzzy` baseline at 3 thresholds) and record numbers.
3. Run the treatment end-to-end and record precision / recall / cost-per-pair.
4. Tag historical Xero invoices with `project_code = 'ACT-CG'` for receipt-coverage attestation.
5. Write the provenance sidecar (`wiki/projects/civicgraph/rd-activity-register.md.provenance.md`).
6. Confirm the project code with the wiki: ACT-CG (this register) vs ACT-CS (wiki article header). Pick one and update the other.
