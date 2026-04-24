---
title: Vignette & Media Workflows
status: Active
---

> Generated legacy mirror for command-center.
> Source of truth: `wiki/technical/vignette-workflows.md`.
> Regenerated: `2026-04-21T03:19:53.973Z` via `node scripts/wiki-sync-command-center-snapshot.mjs`.

# Vignette & Media Workflows

> How to create, update, and manage story vignettes with media integration from Empathy Ledger.

## Overview

Story vignettes are the compendium's unit of impact evidence — short, structured documents that link a consented community story to [[alma|ALMA]] signals, project context, and media. They are static markdown files with rich YAML frontmatter, sourced from Empathy Ledger and built into the compendium.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EMPATHY LEDGER V2                        │
│  stories table, media_items table, media_storytellers       │
│  DB Functions: extract_descript_id(), generate_embed()      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  MANUAL/SYNC PROCESS                        │
│  1. Query EL for stories with project_slugs                 │
│  2. Check consent status (only process if granted)          │
│  3. Extract Descript video IDs                              │
│  4. Update vignette YAML frontmatter                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   COMPENDIUM (STATIC)                       │
│  Markdown files with YAML frontmatter                       │
│  Descript iframes (conditional on consent_scope)            │
│  Photo URLs (Supabase storage)                              │
└─────────────────────────────────────────────────────────────┘
```

## Workflow 1: Creating a New Vignette

### Prerequisites
- Story exists in Empathy Ledger with proper consent
- ALMA signals have been assessed (see [[transcription-workflow|Transcription Workflow]])
- Cultural review status is known
- Media assets are uploaded (if applicable)

### Steps

1. **Check Empathy Ledger record** — verify consent is granted, note the `empathy_ledger_id` UUID, review linked media
2. **Copy vignette template** to the appropriate category folder: `[number]-[slug].md`
3. **Update frontmatter:**
   - Set `title`, `slug`, `vignette_number`, `category`
   - Link `empathy_ledger_id`
   - Set `consent_scope` (INTERNAL / EXTERNAL-LITE / EXTERNAL)
   - Set `cultural_review_status` and related fields
   - Add `project_slugs` array
   - Set `place_country`, `voice_owner`, `voice_role`
   - Score all 6 ALMA signals (1–5)
   - Set `lcaa_stage` and `lcaa_shift`
   - Add media references if available
4. **Write content** — opening quote, story summary, ALMA reflection, cultural notes, provenance
5. **Update index** — add to `vignettes/index.md` in appropriate category table

## Workflow 2: Adding Media

### Adding a Descript Video

1. Get Descript share URL: `https://share.descript.com/view/{VIDEO_ID}`
2. Extract video ID (last segment of URL)
3. Update frontmatter:
   ```yaml
   media:
     descript_video_id: "7IJdp8r9FgE"
     descript_url: "https://share.descript.com/view/7IJdp8r9FgE"
   ```
4. Add iframe embed in content (for EXTERNAL-LITE or EXTERNAL consent only):
   ```html
   <iframe
     src="https://share.descript.com/embed/7IJdp8r9FgE"
     width="100%" height="400" frameborder="0" allowfullscreen>
   </iframe>
   ```

### Adding Photos

1. Upload to Empathy Ledger Media Library with full metadata, set consent_status to granted
2. Get Supabase storage URL
3. Update frontmatter:
   ```yaml
   media:
     photos:
       - id: "el-media-uuid-1"
         url: "https://your-project.supabase.co/storage/v1/object/public/media/path/photo.jpg"
         alt: "Description of photo"
         consent_status: "granted"
   ```

## Workflow 3: Updating ALMA Signals

Update when: after community story review, when new evidence emerges, during periodic compendium audits.

```yaml
alma_signals:
  evidence_strength: 4       # 1-5
  community_authority: 5     # 1-5
  harm_risk_inverted: 3      # 1-5 (5 = lowest risk)
  implementation_capability: 4
  option_value: 4
  community_value_return: 5
  overall_score: 4.2         # Average
```

## Workflow 4: Managing Consent Status

| Scope | Meaning | Media Behavior |
|-------|---------|----------------|
| **INTERNAL** | Team only | Video/photos show placeholder |
| **EXTERNAL-LITE** | Shareable with review | May need cultural review |
| **EXTERNAL** | Fully cleared | Full media access |

### Changing Consent Status

1. Update in Empathy Ledger first (source of truth)
2. Update vignette frontmatter to match
3. Add or remove embeds/images accordingly
4. Move in consent scope index table

### If Consent is Withdrawn

1. Immediately set `consent_scope: "INTERNAL"` in vignette
2. Update Empathy Ledger record
3. Remove all embeds, replace with placeholders
4. Remove identifying details from content
5. Consider archiving the vignette entirely

## Workflow 5: Cultural Review

**When required:** All Palm Island content, First Nations youth stories, stories involving sacred sites or ceremonies, stories with `cultural_sensitivity_level: sensitive` or higher.

**Who reviews:** For Palm Island — PICC Elders Council. For Oonchiumpa — relevant cultural advisors. For other projects — project-specific Elders.

**Process:** Prepare draft (not full compendium), share proposed media, note intended use. Conduct review in-person where possible for sensitive content. Document outcome in frontmatter.

## Workflow 6: Bidirectional Project Linking

```yaml
# In vignette frontmatter
project_slugs:
  - oonchiumpa
  - justicehub
  - empathy-ledger

# In project page
linked_vignettes:
  - 15-m-homelessness-independent
  - 16-community-recognition-referrals
```

After linking, recalculate project ALMA aggregate scores (avg across all linked vignettes).

## File Naming Conventions

```
vignettes/[category]/[number]-[slug].md
```

Category folders: `platform-methodology/`, `palm-island/`, `justice-youth/`, `oonchiumpa/`, `system-outcomes/`

## Verification Checklist

Before publishing a new or updated vignette:

- [ ] Consent verified in Empathy Ledger
- [ ] Cultural review completed (if required)
- [ ] ALMA signals scored (all 6)
- [ ] All frontmatter fields populated
- [ ] Content respects consent scope
- [ ] Media embeds appropriate for scope
- [ ] Index updated
- [ ] Project page(s) updated
- [ ] Cross-links working

## URL Reference

| Source | Pattern |
|--------|---------|
| Descript view | `https://share.descript.com/view/{VIDEO_ID}` |
| Descript embed | `https://share.descript.com/embed/{VIDEO_ID}` |
| Supabase storage | `https://{PROJECT}.supabase.co/storage/v1/object/public/{BUCKET}/{PATH}` |

## Backlinks

- [[transcription-workflow|Transcription Workflow]] — how transcripts become ALMA analysis
- [[alma|ALMA Framework]] — the signal model embedded in vignette frontmatter
- [[governance-consent|Governance & Consent]] — consent rules that govern every step
- [[visual-system|Visual System]] — photography and video guidelines for media
