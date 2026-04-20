---
title: Descript Transcription & ALMA Workflow
status: Active
---

> Generated legacy mirror for command-center.
> Source of truth: `wiki/technical/transcription-workflow.md`.
> Regenerated: `2026-04-20T03:03:10.720Z` via `node scripts/wiki-sync-command-center-snapshot.mjs`.

# Descript Transcription & ALMA Workflow

> How transcribed stories move from Descript into Empathy Ledger and through the ALMA analysis pipeline.

## Overview

Empathy Ledger holds video stories recorded and shared via Descript. This workflow describes how transcripts are ingested, analyzed through [[alma|ALMA]], aggregated to storyteller profiles, and ultimately used to enrich compendium vignettes. It is a four-layer pipeline, each layer building on the last.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DESCRIPT VIDEOS                          │
│  URL Pattern: https://share.descript.com/view/{VIDEO_ID}    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  TRANSCRIPTION (LAYER 0)                    │
│  Source: Descript API or manual export                      │
│  Format: JSON with speaker timestamps                       │
│  Storage: empathy_ledger_v2.transcripts table               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI ANALYSIS (LAYER 1)                      │
│  Script: batch-analyze-transcripts-direct.ts                │
│  Extracts: Themes, quotes, ALMA signals, cultural flags     │
│  Output: transcript_analysis_results table                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  STORYTELLER ROLLUP (LAYER 2)               │
│  Script: backfill-storyteller-analysis.ts                   │
│  Output: storytellers.alma_analysis JSONB                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  COMPENDIUM VIGNETTES (LAYER 3)             │
│  Source: storytellers.alma_analysis                         │
│  Output: Vignette YAML frontmatter + content enrichment     │
└─────────────────────────────────────────────────────────────┘
```

## Workflow 1: Adding a New Descript Video to EL

1. Export transcript from Descript as JSON (with speaker timestamps)
2. Note the video ID from the share URL
3. Insert transcript record into `empathy_ledger_v2.transcripts`
4. Link story to transcript via `story_id`
5. Update story's `media_url` to the Descript share URL

## Workflow 2: Running ALMA Analysis

ALMA analysis extracts themes, quotes, impact scores, and cultural flags from transcripts.

Prerequisites: Transcript exists in database, `tenant_id` is correct, story is linked.

```bash
cd /Users/benknight/Code/empathy-ledger-v2

# Run batch analysis
npx tsx scripts/batch-analyze-transcripts-direct.ts 2>&1 | tee batch-analysis-$(date +%Y%m%d-%H%M%S).log

# Check progress
npx tsx scripts/check-analysis-status.ts

# Verify ALMA extraction
npx tsx scripts/verify-alma-extraction.ts

# Storyteller rollup (after batch completes)
npx tsx scripts/backfill-storyteller-analysis.ts
```

## What ALMA Analysis Extracts

| Field | Type | Use in Vignette |
|-------|------|-----------------|
| `themes` | Array | Tag cloud, categorization |
| `quotes` | Array | Pull quotes for content |
| `impact_assessment` | Object | ALMA signal scores |
| `cultural_flags` | Object | Consent gating, sensitivity |
| `quality_metrics` | Object | Confidence scores |

## Mapping Analysis to ALMA Signals

| Analysis Field | Vignette Signal | Mapping |
|----------------|-----------------|---------|
| `impact_assessment.evidence_strength` | `alma_signals.evidence_strength` | Direct (1–5) |
| `impact_assessment.community_relevance` | `alma_signals.community_authority` | Interpret context |
| `cultural_flags.sensitivity_level` | `alma_signals.harm_risk_inverted` | Invert (5 − level) |
| `impact_assessment.actionability` | `alma_signals.implementation_capability` | Direct |
| `impact_assessment.transferability` | `alma_signals.option_value` | Direct |
| `impact_assessment.community_benefit` | `alma_signals.community_value_return` | Direct |

## Current State (as of 2026-01-12)

| Metric | Count |
|--------|-------|
| Total transcripts | 251 |
| Analyzed | 1 (test) |
| Pending analysis | 250 |
| Videos in EL stories | 41 |
| Linked to vignettes | 6 |
| Total vignettes | 26 |
| Vignettes with EL ID | 6 |

## Known Linked Videos

| Video ID | Title | Vignette |
|----------|-------|----------|
| `2gxa5x40r9N` | Cliff speaks about beds | 05-community-innovation-beds |
| `yP3pzzo4JLU` | Life on Palm Island | 07-uncle-alan-palm-island |
| `FJZqnFWOM8U` | Power of Knowing Your Neighbor | 02-orange-sky-origins |
| `86vzBJSADxH` | Future of Oonchiumpa | 16-community-recognition |
| `S1ny8zWmmOU` | Heart of Tennant Creek | 17-school-partnership |
| `IB4aXUaQygc` | Beyond Laundry | 01-building-empathy-ledger |

## Next Steps

1. Run batch analysis on 250 transcripts (~4.2 hours, ~$7.50 in AI costs)
2. Storyteller rollup after batch completes
3. Build sync script to update vignette frontmatter automatically
4. Create new vignettes for orphan videos with strong content
5. Elder review for Palm Island and other culturally sensitive content

## Backlinks

- [[alma|ALMA Framework]] — the impact model this pipeline feeds
- [[vignette-workflows|Vignette Workflows]] — how analyzed stories become compendium content
- [[governance-consent|Governance & Consent]] — consent must be verified before analysis runs
- [[act-architecture|ACT Technical Architecture]] — database tables and Supabase instances
- [[transcript-analysis-method|Transcript Analysis Method]] — the governing method that defines what this workflow can and cannot do
