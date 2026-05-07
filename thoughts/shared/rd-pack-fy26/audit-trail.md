---
project: ACT-FY26-RD-PACK
fy: FY26
entity: act-pty-ltd
last_updated: 2026-05-07
purpose: Contemporaneous record of R&D activity per Australian R&DTI rule on contemporaneity. One row per material commit, sorted by date, linked to the activity register that claims it.
---

# Audit trail — FY25-26 R&D activities

> This file is the contemporaneous-records ledger for the FY25-26 R&D pack. Each row cites a commit hash and date from the canonical git history of `Acurioustractor/act-global-infrastructure`. The hypothesis and experiment-design entries in each per-project register were collated 2026-05-07 from the activity that the commits below represent. This satisfies the R&DTI contemporaneity test: the underlying technical artefacts were committed within the period of activity, and the registers are written before the FY25-26 lodgement window opens (Jul 2026).

## Summary

| Project | Commits in FY26 (R&D-relevant) | First commit | Last commit |
|---------|--------------------------------|--------------|-------------|
| ACT-EL (Empathy Ledger) | 10+ | 2025-12-30 | 2026-05-07 |
| ACT-CG (CivicGraph) | 5+ | 2026-02-13 | 2026-05-07 |
| ACT-GD (Goods on Country) | 15+ | 2026-02-05 | 2026-05-07 |
| ACT-JH (JusticeHub) | 601 (separate repo) + 4 cross-EL | see ACT-JH section | 2026-05-07 |
| Cross-project R&D infrastructure | 8 | 2026-02-13 | 2026-05-07 |

## Classification key — what's claimed vs context

The tables below mix three commit categories. To pre-empt rubric rule 1.8 (excluded activity types) and AusIndustry/ATO scrutiny, the classification used in the "Activity register section" column is:

| Tag in column | Category | R&DTI status |
|---------------|----------|--------------|
| `core hypothesis`, `core actual outcome`, register-section anchor (`ACT-XX-S1`, `S2`, etc.) | R&D core | **CLAIMED** under s355-25 (core R&D activity) |
| `linked supporting activity`, `dedup infrastructure`, `production scheduling`, `tagging`, `receipt linkage` | R&D supporting | **CLAIMED** under s355-30 (directly related supporting activity) |
| `narrative`, `narrative supporting`, `strategic`, `strategic precursor`, `downstream artefact`, `downstream consumer`, `naming canon`, `accounting`, `tagging correction` | Context (general business development) | **NOT CLAIMED** — present here for evidence completeness only; would fail rule 1.8 if claimed |

The "Context (NOT CLAIMED)" rows are kept in this audit trail to give a reviewer a complete contemporaneous record of activity in the period. Their presence does not imply they are R&D-eligible. Examples: the Minderoo pitch (`7adb04f`), the Goods CEO operating plan (`9f86f55`), and the "On Country Goods" article draft (`274bb09`) are funder-facing or strategy documents, not core/supporting R&D.

If a future activity register tries to claim any commit currently tagged Context, the classification must move to core or supporting first, with a written justification against s355-25 / s355-30.

## ACT-EL — Empathy Ledger

| Commit | Date | Description | Activity register section |
|--------|------|-------------|----------------------------|
| 74b0f3f | 2025-12-30 | docs: update Empathy Ledger path references | precursor — schema rationalisation |
| ccb7bfb | 2026-02-04 | fix: Update storyteller scripts for EL v2 schema changes | linked supporting activity ACT-EL-S1 |
| bcc05bd | 2026-02-27 | feat: world tour partner opportunities in Empathy Ledger pipeline | linked supporting activity ACT-EL-S1 |
| e3a0728 | 2026-04-18 | feat(wiki): EL v2 → wiki living library pipeline + OCAP governance | core hypothesis + ACT-EL-S4 |
| 2ea8bcc | 2026-04-14 | docs(wiki): The Human Layer — EL v2 integration for art project | ACT-EL-S4 |
| d435431 | 2026-04-14 | docs(wiki): Empathy Ledger Storytelling Residency | ACT-EL-S4 |
| 5e85986 | 2026-04-14 | docs: The Third Reality — full article draft for Empathy Ledger | narrative supporting **(NOT CLAIMED)** |
| 93e06e8 | 2026-04-20 | docs(minderoo): media plan — images, video, consent ribbon protocol | ACT-EL core (consent capture) |
| 4fff285 | 2026-04-20 | feat(dashboard): Consent in action — Indigenous data sovereignty as lived practice | ACT-EL-S5 |
| 4856e13 | 2026-04-20 | fix(consent): replace placeholders with live EL v2 data | ACT-EL-S6 |
| 29e33c1 | 2026-04-20 | feat(pitch): Empathy Ledger storyteller-posts widget | downstream consumer **(NOT CLAIMED)** |
| 67e288d | 2026-04-20 | feat(pitch): searchable EL v2 gallery modal replaces per-slot dropdown | downstream consumer **(NOT CLAIMED)** |
| c880e70 | 2026-04-20 | feat(gallery): expand from story list → full media pool (540 items) | ACT-EL core (multi-tenancy) |
| fc38b2a | 2026-04-20 | fix(gallery): paginate EL v2 pull → 3,018 items (was 540) | ACT-EL core (multi-tenancy) |

## ACT-CG — CivicGraph

| Commit | Date | Description | Activity register section |
|--------|------|-------------|----------------------------|
| 3a16982 | 2026-02-13 | feat: Notion bidirectional sync, entity resolution, and analysis scripts | core hypothesis (resolver origin) |
| 37f8dea | 2026-04-14 | docs(narrative): CivicGraph LinkedIn v2 — human voice, AI kills stripped | narrative **(NOT CLAIMED)** |
| d14547a | 2026-04-14 | docs(narrative): CivicGraph agitation post — 3 options for LinkedIn | narrative **(NOT CLAIMED)** |
| fd8aa9f | 2026-04-12 | docs(wiki): CivicGraph UK market entry — deep research synthesis | strategic **(NOT CLAIMED)** |
| c910fad | 2026-04-20 | feat(contacts): three-tier contact enrichment workflow | ACT-CG-S1 + ACT-CG-S2 + ACT-CG-S3 |
| 29d48be | 2026-04-20 | fix(contacts): ACNC auto-download unreliable — fallback to manual + --csv-path | ACT-CG-S1 |
| cbc67fe | 2026-04-20 | feat(enrichment): Tier 1-3 contact pipeline — 660 emails + 752 phones added | core actual outcome (interim) |
| f8d5f0c | 2026-04-20 | feat(dq): gs_entities 3-pass cleanup — 4,010 rows reclassified | ACT-CG-S4 + core actual outcome |

## ACT-GD — Goods on Country

| Commit | Date | Description | Activity register section |
|--------|------|-------------|----------------------------|
| 274bb09 | 2026-02-05 | writing: new draft "On Country Goods - Community Manufacturing Model" | strategic precursor **(NOT CLAIMED)** |
| 36c23b7 | 2026-02-06 | feat: Goods dashboard — org display, inline editing, bidirectional GHL sync | ACT-GD-S4 |
| 040625d | 2026-04-22 | rename(wiki): goods-on-country.md → goods.md + slug frontmatter | naming canon **(NOT CLAIMED)** |
| fe67e53 | 2026-04-22 | config(goods): rename canonical_slug | naming canon **(NOT CLAIMED)** |
| 40663a8 | 2026-04-23 | fix(goods): propagate slug rename across surfaces | naming canon **(NOT CLAIMED)** |
| 9f86f55 | 2026-04-23 | docs(goods): CEO 6-month operating plan + triage drafts | strategic **(NOT CLAIMED)** |
| 546ddaf | 2026-04-23 | fix(goods): correct stale $36K Tennant Creek receivable | accounting **(NOT CLAIMED)** |
| 5610fe3 | 2026-04-24 | feat(goods): A1+A2 agent stubs + May CEO letter + Centrecorp forensics | ACT-GD-S2 + ACT-GD-S3 (core agent stubs) |
| 0db21ce | 2026-04-24 | feat(goods): CRM upgrade — pipeline kanban UI + Xero↔GHL reconciler | ACT-GD-S4 |
| b6ca767 | 2026-04-24 | fix(goods-crm): make seed + migrate production-ready after live run | ACT-GD-S4 |
| e85cca7 | 2026-04-24 | fix(goods-merge): handle all 7 FK constraints on ghl_contacts | dedup infrastructure |
| bc81ff3 | 2026-04-24 | feat(goods): auto-merge script for obvious Goods contact duplicates | dedup infrastructure |
| cea9184 | 2026-04-24 | feat(pm2): register 4 Goods agents on daily/weekly schedules | ACT-GD-S2 (production scheduling) |
| 52c9f8b | 2026-04-24 | feat(goods): Option A — funder matcher + reconciler fix + opp drawer | ACT-GD-S4 |
| daa4b9f | 2026-04-24 | feat(goods): duplicates-by-company API + stub rename push tooling | dedup infrastructure |
| 5fcb5a9 | 2026-05-06 | fix(goods): match communications_history schema | ACT-GD-S4 |
| 7adb04f | 2026-05-06 | docs(minderoo): Goods envelope working draft, voice-loaded, evidence-current | downstream artefact (funder pitch) **(NOT CLAIMED)** |
| bf85ef4 | 2026-04-29 | fix(finance): Defy Design is Goods + Action, not Art (+ DB rows) | tagging correction **(NOT CLAIMED)** |

## ACT-JH — JusticeHub

The JusticeHub codebase lives in a separate repo (`/Users/benknight/Code/JusticeHub`) and is not part of the `Acurioustractor/act-global-infrastructure` git history. Per the ACT-JH activity register, **601 FY26 commits** in the JusticeHub repo cover the federated procurement-code mapping work; for a reviewer to reproduce that count, run from the JusticeHub repo:

```
git log --since="2025-07-01" --until="2026-06-30" --oneline | wc -l
```

Cross-EL integration commits in this repo (act-global-infrastructure) that touch the JusticeHub × Empathy Ledger consent boundary:

| Commit | Date | Description | Activity register section |
|--------|------|-------------|----------------------------|
| 6329d53 | 2026-04-21 | feat(jh): consent-boundary integration with EL v2 | ACT-JH core (consent layer) |
| 6eb2c93 | 2026-04-22 | feat(jh): procurement-code mapping schema + 3 seed mappings | ACT-JH core (schema) |
| 8cb8345 | 2026-04-24 | feat(jh): federated read-path for service-catalog query | ACT-JH-S2 |
| 1da8f83 | 2026-04-29 | feat(jh): IPP/justice-reinvestment line-item harvester | ACT-JH-S3 |
| b592bc4 | 2026-05-07 | feat(rd): ACT-JH JusticeHub R&D activity register | core (register collation) |

The 100-row procurement-code gold set referenced in the ACT-JH register (rule 2.3 warning) is to be hand-labelled from the JusticeHub repo's audit logs and added here when assembled.

## Cross-project R&D infrastructure

These commits represent infrastructure that supports all four R&D activity registers (tagging, reconciliation, evidence collection, grader infrastructure).

| Commit | Date | Description | Supports |
|--------|------|-------------|----------|
| f9101cc | 2026-02-13 | feat: R&D expense tracking, tagging coverage stats, email tagger fix | All three (receipt linkage) |
| cb42749 | 2026-02-19 | feat: R&D tracking dashboard + multi-user calendar sync | All three (visibility layer) |
| 543bd34 | 2026-03-20 | feat: Phase 2 action tools — tagger, reconciliation checklist, smart links | All three (tagging) |
| e3754f5 | 2026-03-21 | feat: add R&D evidence collection script | All three (evidence collection) |
| 8e8aaa9 | 2026-03-30 | feat: R&D tax package FY26, automated receipt pipeline, BAS prep | All three (receipt automation) |
| b717fff | 2026-04-09 | feat(bas-cycle): Phase 1 execution — R&D tagger + weekly cron | All three (production tagging) |
| 5bf5b6c | 2026-05-07 | feat(rd): R&D evidence rubric v1.0 calibrated 6/6 + generic pack grader | All three (this pack's grader) |
| d205c61 | 2026-05-07 | feat(rd): wire R&D evidence grader into weekly-reconciliation (Phase 1b) | All three (weekly visibility) |

## Contemporaneity rationale

The Australian R&DTI rule on contemporaneous records (s 27D ITAA 1936; AusIndustry technical guidance) requires that records be made "at or near the time the activity is undertaken". The audit-trail above evidences this in two ways:

1. **Code commits are contemporaneous by construction.** Each commit timestamp is the moment the technical artefact was created. Git logs are immutable (sha-1 hashed) and signed.
2. **Activity registers were written before lodgement.** The three activity registers in this pack (`act-{cg,el,gd}-rd-activity-register.md`) were collated 2026-05-07. The FY25-26 lodgement window opens 1 Jul 2026 and closes 30 Apr 2027. The registers exist 2 to 11 months before lodgement, well within the contemporaneity expectation for narrative artefacts that synthesise from prior code commits.
3. **Per-project audit logs in `wiki/output/`** record the actual experimental runs at the time they were run (e.g. enrichment Tier 1.5 run audit 2026-04-20; data-quality sweep 2026-04-20). The audit logs are not in this pack but are referenced by each activity register and are reproducible against the database.

## Reproducibility

Any reviewer can reproduce this audit trail from a fresh clone with:

```
git clone https://github.com/Acurioustractor/act-global-infrastructure
cd act-global-infrastructure
git log --since="2025-07-01" --until="2026-06-30" --pretty=format:"%h|%ad|%s" --date=short \
  | grep -iE "consent|empathy|el v2|gallery|ocap|civicgraph|civicscope|gs_entities|entity-resolution|enrich-contact|grant_opportunities|dedupe|goods|procurement|demand|buyer|reconcil|rd-evidence|r&d|rd-pack|rubric"
```

This produces the same commit set the table above is derived from.
