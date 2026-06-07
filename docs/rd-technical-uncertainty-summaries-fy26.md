# R&D Tax Incentive — Technical Uncertainty Summaries FY2025-26

**Entity:** A Curious Tractor (transitioning to ACT Ventures Pty Ltd)
**ABN:** 21 591 780 066
**Financial Year:** 2025-26
**Prepared:** 2026-03-29

---

## Activity 1: ACT-CG — CivicGraph Cross-Government Entity Resolution Platform

**Project code:** ACT-CG
**R&D category:** Core R&D
**Principal researchers:** Benjamin Knight (Co-Founder / Systems Designer, 20% allocation)

### Description of R&D activity

Development of a novel entity resolution and cross-government data linking platform that unifies records from 8+ heterogeneous Australian government datasets (ATO, AusTender, ACNC, ABR, state procurement registers, political donation registers, lobbying registers, and justice funding databases) into a single identity graph of 559,000+ entities linked by 1.5M+ relationships.

### Technical uncertainty

The core technical uncertainty was whether N-way probabilistic entity resolution could achieve greater than 85% linkage accuracy across Australian government datasets at scale, without labelled training pairs, given that:

1. **Existing tools are insufficient:** Commercial entity resolution tools (Splink, Dedupe.io, OpenRefine) assume bilateral dataset linkage with supervised training data. Our problem required N-way linkage across 8+ datasets simultaneously, where the primary identifier (ABN) is absent in approximately 40% of records, and entity names follow different conventions across registers (e.g., "The Smith Foundation Ltd" in ACNC vs "SMITH FOUNDATION" in AusTender vs "Smith Foundation Pty Ltd as Trustee for Smith Foundation" in ABR).

2. **Name collision suppression at scale:** With 559,000+ entities, naive fuzzy matching produces false positive rates exceeding 30%. Our hypothesis was that a 2-10 entity cap on shared-director pair generation, combined with ABR type-code mapping (including ORIC Indigenous corporation codes not covered by any commercial service), would suppress collision artifacts while preserving genuine links.

3. **Cross-system influence scoring:** No existing commercial product computes cross-system power concentration metrics for the Australian social and government sector. The technical uncertainty was whether materialized view-based scoring across 7 government systems could produce meaningful, non-spurious influence rankings — specifically whether the signal-to-noise ratio would be sufficient for procurement and allocation intelligence.

### New knowledge generated

- A 5-phase mega-linker algorithm (`link-entities-mega.mjs`) that produced 95,000+ new edges in a single run, achieving 91.8% ABN linkage for justice funding records (up from 46%)
- An 18-field enrichment scorer for dedup survivor selection that considers relationship graph degree alongside record completeness
- Cross-system power index scoring across 7 government systems (82,962 entities scored), revealing that community-controlled organisations average 2.15 systems of oversight but receive only 3.2% of procurement dollars
- Empirically-derived junk detection patterns for government data ingestion, discovered from production failure data across 92 data pipeline agents

### Evidence

- Git repository: `github.com/acurioustractor/grantscope` — 500+ commits with timestamped evidence of experimental iterations
- Key scripts: `link-entities-mega.mjs`, `dedup-entities.mjs`, `engine-entity-resolution.mjs`, `link-alma-v4.mjs`
- Materialized views: `mv_entity_power_index`, `mv_revolving_door`, `mv_board_interlocks`, `mv_funding_deserts`
- Database: 559,555 entities, 1,525,714 relationships across 10 relationship types

---

## Activity 2: ACT-EL — Empathy Ledger Data Sovereignty and AI Analysis Platform

**Project code:** ACT-EL
**R&D category:** Core R&D
**Principal researchers:** Benjamin Knight (Co-Founder / Systems Designer, 25% allocation)

### Description of R&D activity

Development of a novel consent-gated AI analysis platform for qualitative community impact data, implementing OCAP principles (Ownership, Control, Access, Possession) in a way that does not exist in any commercial CMS, storytelling platform, or NLP pipeline.

### Technical uncertainty

1. **Culturally-specific impact extraction:** No existing NLP framework includes an Indigenous Australian impact taxonomy. The technical uncertainty was whether an AI analysis pipeline could extract culturally-specific impact dimensions (not generic sentiment polarity) from qualitative transcripts with sufficient fidelity for community trust and Elder approval.

2. **Hallucination rejection for quotes:** AI-generated summaries of community stories must maintain quote veracity — fabricated quotes would destroy community trust irreversibly. The technical uncertainty was whether fuzzy-matching AI-extracted quotes against source transcript text could achieve zero false-positive rate for attributed quotations.

3. **Consent as hard prerequisite:** The platform requires per-story, per-destination consent with cultural permission levels and Elder approval workflows. The uncertainty was whether this consent architecture could be enforced across AI processing pipelines without creating bottlenecks that make the system unusable.

### New knowledge generated

- An 8-category Indigenous impact taxonomy with Elder review gates, designed through community consultation rather than derived from existing frameworks
- A hallucination rejection technique using fuzzy matching of AI-extracted quotes against source transcripts
- Per-transcript AI processing consent as a hard prerequisite (not soft preference), enforced at the API layer
- Cultural protocols table with JSONB rules and enforcement levels for community-controlled data governance

### Evidence

- Git repository: `github.com/acurioustractor/act-global-infrastructure` — Empathy Ledger module commits
- Key files: `src/types/database/indigenous-impact.ts`, `src/types/database/cultural-sensitivity.ts`, consent dashboard API, batch transcript processor
- Community consultation records for impact taxonomy design

---

## Activity 3: ACT-IN — Autonomous Agent Orchestration and Financial Attribution Engine

**Project code:** ACT-IN
**R&D category:** Core R&D
**Principal researchers:** Benjamin Knight (Co-Founder / Systems Designer, 15% allocation)

### Description of R&D activity

Development of a novel multi-agent orchestration system coordinating 92 autonomous data pipeline agents with crash recovery, adaptive retry, and a calendar-contextualised financial transaction classification engine for ATO-defensible R&D expense attribution.

### Technical uncertainty

1. **Agent orchestration without commercial broker:** The technical uncertainty was whether autonomous agent scheduling with crash recovery could achieve reliable data freshness across 92 heterogeneous pipeline agents using only a Supabase table with PostgreSQL `FOR UPDATE SKIP LOCKED` optimistic locking — without requiring Airflow, Dagster, or other dedicated workflow infrastructure that cannot execute arbitrary Node.js scraping/analysis scripts.

2. **Calendar-contextualised transaction classification:** No accounting add-on or commercial bookkeeping tool provides temporal disambiguation of vendor transactions against calendar context. The uncertainty was whether fetching calendar events matching vendor name × transaction date could improve ML-assisted project attribution accuracy sufficiently for ATO-defensible R&D expense categorisation.

3. **Crash recovery and adaptive retry:** With 92 agents running on a 6-hour cron cycle, the system must handle partial failures, stuck tasks, and cascading timeouts. The uncertainty was whether exponential backoff (1min × 4^retry) with startup-time stuck-task reset could maintain >95% eventual completion rate without manual intervention.

### New knowledge generated

- A `claim_next_task()` RPC pattern enabling distributed agent coordination via Supabase without a dedicated message broker
- A vendor-rule-based R&D project attribution system with 57 vendor rules and automatic `rd_category` classification
- An agent registry pattern where adding a new agent is a single-file change with automatic orchestrator integration
- Watcher agents (4 active) that monitor board changes, funding anomalies, entity changes, and data quality on 6-24 hour cycles with discovery severity classification

### Evidence

- Git repositories: both `grantscope` and `act-global-infrastructure`
- Key files: `scripts/agent-orchestrator.mjs`, `scripts/lib/agent-registry.mjs`, `scripts/scheduler.mjs`
- Database: `agent_runs` table (run history), `agent_schedules` table, `discoveries` table
- Finance engine: `scripts/lib/finance/` (7 modules), transaction tagger, receipt pipeline

---

## Activity 4: ACT-JH — JusticeHub Evidence Scoring and Intervention Linkage (ALMA)

**Project code:** ACT-JH
**R&D category:** Core R&D
**Principal researchers:** Benjamin Knight (Co-Founder / Systems Designer, 15% allocation)

### Description of R&D activity

Development of ALMA-governed JusticeHub evidence records — an evidence database of 1,155 justice and social sector interventions with a novel 6-dimensional review taxonomy that deliberately includes community-led research alongside RCTs, cross-referenced with live funding data to surface defunded evidence gaps.

### Technical uncertainty

1. **Multi-strategy fuzzy entity linkage for interventions:** The technical uncertainty was whether a multi-phase linker could achieve >85% entity linkage for ALMA interventions against a 160,000+ entity graph, given that intervention names contain embedded organisation names, parent organisation references, and state government seeding artifacts requiring distinct resolution strategies per phase.

2. **Topic classification discipline:** The uncertainty was whether automated topic tagging by program name (not organisation cross-reference) could avoid a known false-positive pattern where organisations tagged with a topic contaminate intervention records — requiring a specific exclusion discipline (`topicFilter()` excludes `austender-direct` which is 95% noise).

3. **Cross-dataset evidence assembly:** No existing tool combines ALMA intervention evidence, justice funding allocations, and ROGS time-series data in a single query. The uncertainty was whether evidence packs crossing these three sources could be assembled with consistent entity linkage and meaningful provenance tracking.

### New knowledge generated

- A 6-phase entity linker for ALMA with Phase 0 junk detection patterns empirically derived from production scraping failures
- PostgreSQL `pg_trgm` trigram similarity for ABN cross-reference (Phase 4), achieving linkage rates not possible with exact matching
- Topic tagging discipline: tag by `program_name` only, never by organisation cross-reference — a rule discovered through production false-positive analysis
- Evidence pack assembly API crossing ALMA, justice funding, and ROGS data with per-source provenance

### Evidence

- Git repository: `github.com/acurioustractor/grantscope`
- Key files: `scripts/link-alma-v4.mjs`, evidence pack pages, topic filter utilities
- Database: `alma_interventions` (1,155 records, 51 columns), `alma_evidence` (570 records), `alma_outcomes` (506 records)
- 63.6% of ALMA interventions linked to CivicGraph entities

---

## Activity 5: ACT-GD — Goods Procurement Intelligence and Community Demand Matching

**Project code:** ACT-GD
**R&D category:** Supporting R&D
**Principal researchers:** Benjamin Knight (Co-Founder / Systems Designer, 10% allocation), Nicholas Marchesi (Co-Founder / Operations, 25% allocation — field testing, user research, community validation)

### Description of R&D activity

Development of a novel procurement intelligence platform that cross-references NDIS thin market flags, government contract history, and community asset deployment data to produce procurement match scores for Indigenous and remote community goods and services needs.

### Technical uncertainty

1. **Multi-source procurement matching:** The technical uncertainty was whether cross-referencing NDIS thin market flags, government contract history from AusTender/state registers, and community asset deployment data could produce procurement match scores with sufficient signal-to-noise ratio for field sales decisions — no existing tool combines these three data sources.

2. **4-mode search paradigm:** The uncertainty was whether the same underlying procurement data could be meaningfully surfaced through 4 different stakeholder lenses (need-led, buyer-led, capital-led, partner-led) using a single data model — existing procurement tools offer only vendor-centric or buyer-centric views.

3. **AI-generated demand signals with provenance:** Using Claude Haiku as a hybrid knowledge plugin for government portals that block scraping creates a novel challenge: how to distinguish AI-inferred grant/procurement opportunities from verified ones. The uncertainty was whether a `confidence: 'llm_knowledge'` provenance tag could maintain trust downstream when mixed with registry-verified data.

### New knowledge generated

- A `SearchMode` type system (need-led | buyer-led | capital-led | partner-led) enabling 4 stakeholder lenses on common procurement data
- Per-entity, per-community `fit_score` and `product_fit[]` cross-joining CivicGraph entity data with goods-specific demand context
- Source agent provenance tracking for AI-generated demand signals
- Hybrid LLM knowledge plugin for portal data with explicit confidence tagging

### Evidence

- Git repository: `github.com/acurioustractor/grantscope`
- Key files: Goods workspace client, procurement entity types, grant engine LLM knowledge source
- Database: NT community procurement data, goods buyer leads, crosswalk matching tables

---

## Summary of R&D Expenditure

| Activity | Code | Category | Benjamin (% × salary) | Nicholas (% × salary) | Non-salary spend |
|----------|------|----------|----------------------|----------------------|-----------------|
| CivicGraph | ACT-CG | Core | 20% | 5% | Macrocosmos, Supabase (shared) |
| Empathy Ledger | ACT-EL | Core | 25% | — | TJ's Imaging |
| Infrastructure | ACT-IN | Core | 15% | — | Anthropic, OpenAI, Cursor, Vercel, GitHub, Supabase |
| JusticeHub/ALMA | ACT-JH | Core | 15% | 10% | — |
| Goods | ACT-GD | Supporting | 10% | 25% | Goods field operations |
| **R&D Total** | | | **85%** | **40%** | **$177,716** |

**Estimated total R&D expenditure:** $427,716 – $538,616 (depending on final wage payments)
**Estimated 43.5% refund:** $186,057 – $234,298
