---
title: "Vignette & Media Workflows"
slug: "vignette-workflows"
website_path: null
excerpt: "How to create, update, and manage story vignettes with media integration"
status: published
last_updated: 2026-01-12
shareability: INTERNAL
---

# Vignette & Media Workflows

This document describes the workflows for creating, updating, and managing story vignettes in the ACT Compendium, including media integration from Empathy Ledger.

---

## Architecture Overview

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

---

## Workflow 1: Creating a New Vignette

### Prerequisites
- Story exists in Empathy Ledger with proper consent
- ALMA signals have been assessed
- Cultural review status is known
- Media assets are uploaded (if applicable)

### Steps

1. **Check Empathy Ledger record**
   - Verify story has consent granted
   - Note the `empathy_ledger_id` (UUID)
   - Review any linked media assets

2. **Create vignette file**
   ```bash
   # Copy template to appropriate category folder
   cp compendium/04-story/vignettes/_templates/vignette-template.md \
      compendium/04-story/vignettes/[category]/[number]-[slug].md
   ```

3. **Update frontmatter**
   - Set `title`, `slug`, `vignette_number`, `category`
   - Link `empathy_ledger_id`
   - Set `consent_scope` (INTERNAL / EXTERNAL-LITE / EXTERNAL)
   - Set `cultural_review_status` and related fields
   - Add `project_slugs` array
   - Set `place_country`, `voice_owner`, `voice_role`
   - Score all 6 ALMA signals (1-5)
   - Set `lcaa_stage` and `lcaa_shift`
   - Add media references if available

4. **Write content**
   - Opening quote
   - Story summary (respect consent scope)
   - ALMA reflection section
   - Cultural notes
   - Provenance information

5. **Update index**
   - Add to `compendium/04-story/vignettes/index.md`
   - Place in appropriate category table
   - Add to consent scope table if needed
   - Add to ALMA signal or LCAA stage lists if notable

---

## Workflow 2: Adding Media to a Vignette

### Adding a Descript Video

1. **Get Descript share URL**
   - In Descript: Share → Get link
   - Copy URL (format: `https://share.descript.com/view/VIDEO_ID`)

2. **Extract video ID**
   - Video ID is the last segment of the URL
   - Example: `https://share.descript.com/view/7IJdp8r9FgE` → ID is `7IJdp8r9FgE`

3. **Update vignette frontmatter**
   ```yaml
   media:
     descript_video_id: "7IJdp8r9FgE"
     descript_url: "https://share.descript.com/view/7IJdp8r9FgE"
   ```

4. **Add embed to content** (for EXTERNAL-LITE or EXTERNAL only)
   ```html
   <iframe
     src="https://share.descript.com/embed/7IJdp8r9FgE"
     width="100%"
     height="400"
     frameborder="0"
     allowfullscreen>
   </iframe>
   ```

5. **Update Empathy Ledger** (optional)
   - Set `media_url` field in stories table to Descript URL

### Adding Photos

1. **Upload to Empathy Ledger**
   - Use Media Library with full metadata
   - Link to storyteller record
   - Set `consent_status` to granted

2. **Get Supabase storage URL**
   - Format: `https://{PROJECT}.supabase.co/storage/v1/object/public/{BUCKET}/{PATH}`

3. **Update vignette frontmatter**
   ```yaml
   media:
     photos:
       - id: "el-media-uuid-1"
         url: "https://your-project.supabase.co/storage/v1/object/public/media/path/photo.jpg"
         alt: "Description of photo"
         consent_status: "granted"
   ```

4. **Add to content** (respect consent scope)
   ```markdown
   ![Alt text](URL)
   *Caption with context*
   ```

---

## Workflow 3: Updating ALMA Signals

### When to Update
- After story review with community
- When new evidence emerges
- During periodic compendium audits

### Steps

1. **Review with ALMA scoring guide**
   - See [ALMA Template](alma-template.md) for detailed scoring criteria

2. **Update frontmatter scores**
   ```yaml
   alma_signals:
     evidence_strength: 4      # 1-5
     community_authority: 5    # 1-5
     harm_risk_inverted: 3     # 1-5 (5 = lowest risk)
     implementation_capability: 4
     option_value: 4
     community_value_return: 5
     overall_score: 4.2        # Average of above
   ```

3. **Update ALMA reflection section** in content
   - Adjust signal scores table
   - Update notes explaining scores
   - Revise LCAA shift description if needed

4. **Sync back to Empathy Ledger** (optional)
   - Update ALMA scores in EL database for consistency

---

## Workflow 4: Managing Consent Status

### Consent Scopes

| Scope | Meaning | Media Behavior |
|-------|---------|----------------|
| **INTERNAL** | Team only | Video/photos show placeholder |
| **EXTERNAL-LITE** | Shareable with review | May need cultural review |
| **EXTERNAL** | Fully cleared | Full media access |

### Changing Consent Status

1. **Update in Empathy Ledger first**
   - Change consent status in stories table
   - Document reason for change

2. **Update vignette frontmatter**
   ```yaml
   consent_scope: "EXTERNAL"  # Updated from EXTERNAL-LITE
   cultural_review_status: "approved"
   elder_reviewed_by: "Elder Name"
   elder_reviewed_at: "2026-01-12"
   ```

3. **Update media handling**
   - If upgrading: Add embeds/images to content
   - If downgrading: Remove embeds, add placeholders

4. **Update index**
   - Move to appropriate consent scope table

### If Consent is Withdrawn

1. **Immediately update both systems**
   - Set `consent_scope: "INTERNAL"` in vignette
   - Update Empathy Ledger record

2. **Remove all media**
   - Replace embeds with placeholders
   - Remove photo references

3. **Revise content**
   - Remove any identifying details
   - Consider archiving the vignette entirely

---

## Workflow 5: Cultural Review Process

### When Cultural Review is Required
- All Palm Island content
- First Nations youth stories
- Stories involving sacred sites or ceremonies
- Stories with `cultural_sensitivity_level: sensitive` or higher

### Process

1. **Identify reviewers**
   - For Palm Island: PICC Elders Council
   - For Oonchiumpa: Relevant cultural advisors
   - For other projects: Project-specific Elders

2. **Prepare review materials**
   - Share vignette draft (not full compendium)
   - Include proposed media
   - Note intended usage (internal/external)

3. **Conduct review**
   - In-person preferred for sensitive content
   - Allow adequate time for consideration
   - Be prepared to make changes or withdraw

4. **Document outcome**
   ```yaml
   cultural_review_status: "approved"  # or "restricted"
   elder_reviewed_by: "Name if shareable"
   elder_reviewed_at: "2026-01-12"
   ```

5. **Update content as directed**
   - Remove or modify content as required
   - Note any ongoing restrictions

---

## Workflow 6: Linking Projects to Vignettes

### Bidirectional Linking Pattern

**In vignette frontmatter:**
```yaml
project_slugs:
  - oonchiumpa
  - justicehub
  - empathy-ledger
```

**In project page:**
```yaml
linked_vignettes:
  - 15-m-homelessness-independent
  - 16-community-recognition-referrals
```

### Adding a New Project Link

1. **Update vignette frontmatter**
   - Add project slug to `project_slugs` array

2. **Update project page**
   - Add vignette to `linked_vignettes` array
   - Add to "Linked Stories" section in content
   - Update ALMA aggregate scores

3. **Recalculate project ALMA aggregate**
   ```yaml
   alma_aggregate:
     avg_evidence: 4.3    # Average across linked vignettes
     avg_authority: 4.6
     total_vignettes: 14  # Count of linked vignettes
   ```

---

## URL Patterns Reference

| Source | URL Pattern |
|--------|-------------|
| **Descript Video (view)** | `https://share.descript.com/view/{VIDEO_ID}` |
| **Descript Video (embed)** | `https://share.descript.com/embed/{VIDEO_ID}` |
| **Supabase Storage** | `https://{PROJECT}.supabase.co/storage/v1/object/public/{BUCKET}/{PATH}` |

---

## File Naming Conventions

### Vignettes
```
[number]-[slug].md
```
Examples:
- `01-building-empathy-ledger.md`
- `15-m-homelessness-independent.md`

### Category Folders
```
platform-methodology/
palm-island/
justice-youth/
oonchiumpa/
system-outcomes/
```

### Project Pages
```
[project-slug].md
```
Examples:
- `oonchiumpa.md`
- `picc-storm-stories.md`

---

## Verification Checklist

Before publishing a new or updated vignette:

- [ ] Consent verified in Empathy Ledger
- [ ] Cultural review completed (if required)
- [ ] ALMA signals scored
- [ ] All frontmatter fields populated
- [ ] Content respects consent scope
- [ ] Media embeds appropriate for scope
- [ ] Index updated
- [ ] Project page(s) updated
- [ ] Cross-links working

---

*See also: [Vignettes Index](../04-story/vignettes/index.md) | [ALMA Template](alma-template.md) | [Cultural Protocols](../05-operations/cultural-protocols.md)*
