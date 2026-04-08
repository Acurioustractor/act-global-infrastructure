# Wiki Overlap Analysis: Command Center vs. Main Tractorpedia

**Date:** 2026-04-07  
**CC Wiki:** 56 files | **Main Wiki:** 126 files

---

## Executive Summary

The Command Center wiki (`/apps/command-center/public/wiki/`) is a **rich, detailed operational reference** for the ecosystem—high-fidelity project specs, consent metadata, health monitoring, and runbooks. The main wiki (`/wiki/`) is a **knowledge base** focused on storytelling, meaning-making, and conceptual framing.

**Recommendation:** These serve different audiences and purposes. Rather than merge, **establish a sync strategy**: core project metadata flows from CC wiki → main wiki articles, while CC wiki captures the operational detail.

---

## Content Overlap by Project

### Strong Overlap (Covered in Both)

1. **Empathy Ledger**
   - CC: 293 lines, detailed frontmatter (infrastructure, integrations, health metrics, data tables, RLS policies, deployment)
   - Main: ~176 lines, conceptual framing (OCAP principles, consent architecture, "Third Reality" positioning)
   - **Gap:** Main wiki lacks operational stack details; CC wiki missing philosophical context
   - **Action:** Link from main article to CC reference for infrastructure; cite CC health status in main article

2. **ACT Farm / The Harvest**
   - CC: Two separate indexes (farm 163 lines, harvest shorter)
   - Main: `act-farm.md` (regenerative ag focus) + `the-harvest.md` (regenerative ag, cultural preservation)
   - **Gap:** CC treats as operational base; main frames as land-practice projects
   - **Action:** CC farm index should reference/link to main wiki's land practice framing

3. **LCAA Methodology**
   - CC: `/act/lcaa.md` (operating rhythm, decision-making guide)
   - Main: `/concepts/lcaa-method.md` (framework definition, ecosystem mapping)
   - **Similarity:** 85% content alignment, nearly identical structure
   - **Action:** Consolidate—main wiki version is the authoritative source; CC can link to it

4. **Goods on Country, JusticeHub**
   - Both wikis have articles; **no deep analysis of overlap from sampling**
   - Likely pattern: CC = operational detail; main = conceptual positioning

---

## Format & Metadata Differences

### CC Wiki Format (Observed)

```yaml
---
title: "Empathy Ledger"
slug: "empathy-ledger"
website_path: /projects/empathy-ledger
excerpt: "..."
category: "core-platform"
status: "active"
last_updated: "2026-01-26"
shareability: "PUBLIC"

# Infrastructure
infrastructure:
  local_path: "/Users/benknight/Code/empathy-ledger-v2"
  github_repo: "act-now-coalition/empathy-ledger-v2"
  deployed_url: "https://empathyledger.com"
  tech_stack:
    framework: "Next.js 14.2.32"
    language: "TypeScript"
    ...

# Data Connections
data_connections:
  supabase_tables: 207
  rls_policies: 364
  ...

# Health Monitoring
health:
  status: "critical"
  health_score: 47
  ...
---
```

**Characteristics:**
- Rich operational metadata (repos, deployed URLs, tech stacks, supabase instance IDs)
- Integration specs (GHL pipeline, Xero tracking codes)
- Health monitoring + error thresholds
- Data structure tables (RLS policies, function counts)
- Medium word count (~200-300 lines per major project)

### Main Wiki Format

```yaml
---
title: Empathy Ledger
status: Active
code: ACT-EL
tier: Ecosystem
---

# Empathy Ledger
> Definition and strategic positioning

## Core Principles
## The Central Role
## How Stories Drive Capital
## Technical Architecture (high-level only)
## Cultural Protocols & Consent Infrastructure
## Backlinks
```

**Characteristics:**
- Backlinks to related concepts (OCAP, consent-as-infrastructure, Third Reality)
- Narrative-driven, philosophy-first
- Very light on operational detail (e.g., no RLS policy counts, no health scores)
- Longer average (~150-176 lines), but concept-focused
- No infrastructure metadata

---

## Unique Content (CC Wiki Only)

1. **Stories directory** (32 files, vignette-based storytelling)
   - Format: YAML frontmatter with `empathy_ledger_id`, `consent_scope`, `lcaa_stage`, `media_needs`
   - Sample: `building-empathy-ledger.md` (85 lines, internal-only story with ALMA signals)
   - **Purpose:** Document community narratives with granular consent tracking
   - **Missing from main wiki:** Stories are separate from project documentation

2. **Operational playbooks** in `/act/` subdirs:
   - `identity/` (mission, principles, LCAA, voice guide)
   - `appendices/` (vignette workflows)
   - **Purpose:** Runbooks for internal teams
   - **Main wiki equivalent:** Concepts directory (philosophy), but CC is team-facing

3. **Infrastructure audit detail**
   - Supabase instance IDs, RLS policy counts, function inventories
   - Health monitoring (response time, uptime, scores)
   - GHL/Xero integration specs
   - **Main wiki:** No operational dashboards

---

## Unique Content (Main Wiki Only)

1. **Conceptual frameworks**
   - `[[third-reality|The Third Reality]]`, `[[consent-as-infrastructure|Consent as Infrastructure]]`
   - `[[indigenous-data-sovereignty|Indigenous Data Sovereignty]]`, `[[civic-world-model|Civic World Model]]`
   - **CC wiki:** None of these concept articles

2. **People directory** (4 people articles)
   - Full bios, philosophy, contact info
   - **CC wiki:** No people section

3. **Communities** (place-based articles)
   - Palm Island, Mount Isa relationships and sovereignty history
   - **CC wiki:** No community directory

4. **Research & decisions**
   - Sector analysis, op-eds, philanthropy critiques, global precedents
   - **CC wiki:** No research section

5. **35+ projects** in main wiki vs. **5 dedicated project folders** in CC wiki
   - Main wiki catalogs every ACT project; CC wiki focuses on core platforms

---

## Duplicate Content Quality Assessment

| Content | CC Quality | Main Quality | Recommendation |
|---------|-----------|-------------|-----------------|
| LCAA | Excellent (practical) | Excellent (conceptual) | Consolidate: main = authoritative, CC links |
| Empathy Ledger | Superior (operational) | Strong (philosophical) | Keep both; cross-link |
| ACT Farm | Operational baseline | Land-practice framing | Clarify: CC = ops base, main = philosophy |
| Mission/Identity | Practical | Narrative | Keep main as single source of truth |

---

## Sync Strategy (Proposed)

**Direction:** Main wiki is the knowledge base; CC wiki is the operational reference.

1. **Core projects** (Empathy Ledger, JusticeHub, Goods)
   - CC wiki: Add backlinks to main wiki articles at top
   - Main wiki: Add operational note + link to CC reference for infrastructure details
   - Sync: Main wiki metadata updated when CC health monitoring changes status

2. **LCAA & Concepts**
   - Make `/wiki/concepts/lcaa-method.md` the single source
   - Remove duplicates from CC wiki (or link to main)

3. **Stories directory**
   - Evaluate: Are these meant for editorial/content management or knowledge base?
   - If editorial: Keep in CC wiki (makes sense for Empathy Ledger content hub)
   - If knowledge: Consider syncing to main wiki as a `stories/` directory with less granular metadata

4. **Operational metadata**
   - CC wiki continues as source of truth for: repos, deployed URLs, tech stacks, health scores
   - Quarterly sync: main wiki updates project status when CC health changes

---

## File Structure Observations

**CC Wiki Strengths:**
- Clear project organization by domain (act/, empathy-ledger/, goods/, justicehub/, etc.)
- Frontmatter enables rich integration with platforms (GHL, Xero, Supabase)
- Stories collection with consent metadata is sophisticated

**Main Wiki Strengths:**
- Comprehensive backlink structure (using `[[...]]` wikilink syntax)
- Concept-forward organization enables knowledge discovery
- Captures research, decisions, and people (not in CC wiki)

---

## Observations on CC Wiki Format

- **Frontmatter is asset:** Rich metadata (deployments, health scores, integrations) is valuable; main wiki could adopt subset
- **No backlinks:** CC wiki is flat; add wikilinks to connect concepts
- **Stories are separate:** Good for editorial workflow, but creates sync burden
- **ALMA signals:** CC wiki uses these in stories; main wiki doesn't—consider standardizing

---

## Conclusion

**These are complementary, not redundant.** CC wiki serves operational teams; main wiki serves knowledge workers and community. The overlap (LCAA, core projects) can be managed via cross-linking and periodic sync, rather than consolidation.

**Next steps:**
1. Add backlinks from CC → main wiki articles in project frontmatter
2. Consolidate LCAA to single source (main wiki)
3. Define "health status" update frequency (monthly? quarterly?)
4. Evaluate stories sync strategy with editorial team
