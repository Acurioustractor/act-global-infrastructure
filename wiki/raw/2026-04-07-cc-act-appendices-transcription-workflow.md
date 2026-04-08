---
title: "Descript Transcription & ALMA Workflow"
slug: "transcription-workflow"
website_path: null
excerpt: "How to transcribe Descript videos and process them through the ALMA pipeline"
status: published
last_updated: 2026-01-12
shareability: INTERNAL
---

# Descript Transcription & ALMA Workflow

This document describes the workflow for transcribing Descript videos and processing them through the ALMA (Adaptive Learning & Media Assessment) pipeline in Empathy Ledger.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DESCRIPT VIDEOS                          │
│  41 videos with stories linked to Empathy Ledger            │
│  URL Pattern: https://share.descript.com/view/{VIDEO_ID}    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  TRANSCRIPTION (LAYER 0)                    │
│  Source: Descript API or manual export                      │
│  Format: JSON with speaker timestamps                       │
│  Storage: empathy_ledger_v2.transcripts table               │
│  Current: 251 transcripts available                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI ANALYSIS (LAYER 1)                      │
│  Process: Claude Sonnet 4.5 analysis                        │
│  Script: batch-analyze-transcripts-direct.ts                │
│  Extracts: Themes, quotes, ALMA signals, cultural flags     │
│  Output: transcript_analysis_results table                  │
│  Status: ✅ READY (schema fixed, tested)                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  STORYTELLER ROLLUP (LAYER 2)               │
│  Process: Aggregate analyses per storyteller                │
│  Script: backfill-storyteller-analysis.ts                   │
│  Output: storytellers.alma_analysis JSONB                   │
│  Status: ⏭️ PENDING (after batch completes)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  COMPENDIUM VIGNETTES (LAYER 3)             │
│  Process: Manual or sync script                             │
│  Source: storytellers.alma_analysis                         │
│  Output: Vignette YAML frontmatter + content enrichment     │
│  Status: 🔧 IN DEVELOPMENT                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Workflow 1: Adding a New Descript Video to EL

### Step 1: Get Descript Transcript

1. **Open Descript project** with the video
2. **Export transcript** as JSON or text
3. **Note the video ID** from the share URL

### Step 2: Create Transcript Record in EL

```sql
INSERT INTO transcripts (
  id,
  story_id,
  content,
  source_type,
  source_url,
  created_at
) VALUES (
  gen_random_uuid(),
  'story-uuid-here',
  '{"segments": [...]}',  -- JSON transcript content
  'descript',
  'https://share.descript.com/view/VIDEO_ID',
  NOW()
);
```

### Step 3: Link to Story

```sql
UPDATE stories
SET media_url = 'https://share.descript.com/view/VIDEO_ID'
WHERE id = 'story-uuid-here';
```

---

## Workflow 2: Running ALMA Analysis

### Prerequisites

- Transcript exists in `transcripts` table
- `tenant_id` is set correctly
- Story is linked via `story_id`

### Step 1: Run Batch Analysis

```bash
cd /Users/benknight/Code/empathy-ledger-v2
npx tsx scripts/batch-analyze-transcripts-direct.ts 2>&1 | tee batch-analysis-$(date +%Y%m%d-%H%M%S).log
```

### Step 2: Monitor Progress

```bash
watch -n 30 'npx tsx scripts/check-db-status.ts'
```

### Step 3: Verify Results

```bash
npx tsx scripts/verify-alma-extraction.ts
```

---

## Workflow 3: Extracting ALMA Evidence for Vignettes

### What ALMA Analysis Extracts

| Field | Type | Use in Vignette |
|-------|------|-----------------|
| `themes` | Array | Tag cloud, categorization |
| `quotes` | Array | Pull quotes for content |
| `impact_assessment` | Object | ALMA signal scores |
| `cultural_flags` | Object | Consent gating, sensitivity |
| `quality_metrics` | Object | Confidence scores |

### Query to Get Analysis for a Story

```sql
SELECT
  s.title,
  s.media_url,
  tar.themes,
  tar.quotes,
  tar.impact_assessment,
  tar.cultural_flags
FROM stories s
JOIN transcripts t ON t.story_id = s.id
JOIN transcript_analysis_results tar ON tar.transcript_id = t.id
WHERE s.id = 'story-uuid-here';
```

### Mapping to Vignette ALMA Signals

| Analysis Field | Vignette Signal | Mapping |
|----------------|-----------------|---------|
| `impact_assessment.evidence_strength` | `alma_signals.evidence_strength` | Direct (1-5) |
| `impact_assessment.community_relevance` | `alma_signals.community_authority` | Interpret context |
| `cultural_flags.sensitivity_level` | `alma_signals.harm_risk_inverted` | Invert (5 - level) |
| `impact_assessment.actionability` | `alma_signals.implementation_capability` | Direct |
| `impact_assessment.transferability` | `alma_signals.option_value` | Direct |
| `impact_assessment.community_benefit` | `alma_signals.community_value_return` | Direct |

---

## Workflow 4: Syncing Vignettes from EL

### Manual Sync Process

1. **Query EL** for story with analysis
2. **Extract ALMA scores** from `transcript_analysis_results`
3. **Update vignette frontmatter** with:
   - `empathy_ledger_id`: Story UUID
   - `alma_signals`: Mapped scores
   - `media.descript_video_id`: From story `media_url`

### Future: Automated Sync Script

Location: `compendium/scripts/sync-from-el.mjs`

```javascript
// Pseudocode for sync script
const stories = await supabase
  .from('stories')
  .select(`
    id, title, media_url,
    transcripts!inner(
      transcript_analysis_results!inner(
        themes, quotes, impact_assessment
      )
    )
  `)
  .not('media_url', 'is', null);

for (const story of stories) {
  const vignette = findVignetteByElId(story.id);
  if (vignette) {
    updateVignetteFrontmatter(vignette, story);
  }
}
```

---

## Current State (2026-01-12)

### Transcripts

| Metric | Count |
|--------|-------|
| Total transcripts | 251 |
| With content | 251 |
| Analyzed | 1 (test) |
| **Pending analysis** | **250** |

### Descript Videos

| Metric | Count |
|--------|-------|
| Videos in EL stories | 41 |
| Linked to vignettes | 6 |
| **Pending linking** | **35** |

### Vignettes

| Metric | Count |
|--------|-------|
| Total vignettes | 26 |
| With EL ID linked | 6 |
| With Descript embed | 6 |
| **Pending enrichment** | **20** |

---

## Descript Video → Vignette Mapping

See: [compendium/scripts/descript-vignette-mapping.json](../scripts/descript-vignette-mapping.json)

### Linked (6)

| Video ID | Title | Vignette |
|----------|-------|----------|
| `2gxa5x40r9N` | Cliff speaks about beds | 05-community-innovation-beds |
| `yP3pzzo4JLU` | Life on Palm Island | 07-uncle-alan-palm-island |
| `FJZqnFWOM8U` | Power of Knowing Your Neighbor | 02-orange-sky-origins |
| `86vzBJSADxH` | Future of Oonchiumpa | 16-community-recognition |
| `S1ny8zWmmOU` | Heart of Tennant Creek | 17-school-partnership |
| `IB4aXUaQygc` | Beyond Laundry | 01-building-empathy-ledger |

### Unmapped (12+ priority)

| Video ID | Title | Suggested Vignette |
|----------|-------|-------------------|
| `WOHo3Db941r` | Freddy on Orange Sky | New Orange Sky vignette |
| `aU14Gmm56Sl` | Community Responsibility | 03-storytelling-sovereignty |
| `oaRpFZmFnIZ` | Importance of Education | 23-educational-transformation |
| `bCbC9zXYSLU` | Foundation of Healthy Home | 05-community-innovation-beds |
| `7IJdp8r9FgE` | Life in Tennant Creek | Oonchiumpa vignette |

---

## Next Steps

1. **Run batch analysis** on 250 transcripts (~4.2 hours, ~$7.50)
2. **Storyteller rollup** after batch completes
3. **Build sync script** to update vignette frontmatter automatically
4. **Create new vignettes** for orphan videos with strong content
5. **Elder review** for Palm Island and sensitive content

---

## Commands Reference

### Empathy Ledger v2

```bash
cd /Users/benknight/Code/empathy-ledger-v2

# Run batch analysis
npx tsx scripts/batch-analyze-transcripts-direct.ts

# Check analysis status
npx tsx scripts/check-analysis-status.ts

# Verify ALMA extraction
npx tsx scripts/verify-alma-extraction.ts

# Storyteller rollup (after batch)
npx tsx scripts/backfill-storyteller-analysis.ts
```

### Compendium

```bash
cd /Users/benknight/Code/act-regenerative-studio/compendium

# Validate vignette frontmatter
find 04-story/vignettes -name "*.md" -exec head -60 {} \; | grep -A1 "empathy_ledger_id"

# Count linked vignettes
grep -r "empathy_ledger_id:" 04-story/vignettes --include="*.md" | grep -v "null" | wc -l
```

---

*See also: [Vignette Workflows](vignette-workflows.md) | [ALMA Model](../04-story/alma-model.md) | [Descript Mapping](../scripts/descript-vignette-mapping.json)*
