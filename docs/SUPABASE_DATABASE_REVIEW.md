# ACT Supabase Database Review
**Date:** 2026-01-20
**Project:** `tednluwflfhxyucgwigh` (single database for all ACT systems)

---

## Executive Summary

You have **one Supabase database** with **442 tables**, but only **~50 tables contain significant data**. Many tables were created for systems that were never fully implemented.

### Key Findings

| Metric | Value |
|--------|-------|
| Total Tables | 442 |
| Tables with Data | ~50 |
| Empty Tables | ~390 |
| GHL Contacts | 847 |
| Storytellers | 226 |
| Organizations | 471 |
| Notion Projects | 78 |

---

## Active Data (Tables with Content)

### Core CRM Data
| Table | Rows | Purpose |
|-------|------|---------|
| `ghl_contacts` | 847 | Primary contact database |
| `ghl_opportunities` | 45 | Pipeline opportunities |
| `organizations` | 471 | Organization records |
| `storytellers` | 226 | Empathy Ledger storytellers |

### Content & Projects
| Table | Rows | Purpose |
|-------|------|---------|
| `notion_projects` | 78 | Projects synced from Notion |
| `articles` | 39 | Published articles |
| `projects` | 11 | Local project records |
| `user_identities` | 2 | Team members (ben, nic) |
| `stories` | 1 | Story records |
| `gmail_messages` | 25 | Gmail sync (limited) |

### Empty Tables (Never Populated)
These were created but never used:
- `communications_history` - 0 rows
- `contact_communications` - 0 rows
- `knowledge_chunks` - 0 rows
- `alma_embeddings` - 0 rows
- `activities` - 0 rows
- `interactions` - 0 rows
- `voice_notes` - 0 rows
- `relationship_health` - 0 rows

---

## System Analysis

### 1. GHL (GoHighLevel) Integration - ACTIVE
**Tables:** 6 | **Status:** Working
```
ghl_contacts (847 rows) - Primary CRM
ghl_opportunities (45 rows) - Pipelines
ghl_pipelines - Pipeline definitions
ghl_tags - Tag definitions
ghl_sync_log - Audit trail
ghl_engagement_metrics - Empty
```
**Verdict:** Keep and maintain. Core CRM system.

### 2. ALMA Research Platform - PARTIALLY ACTIVE
**Tables:** 50+ | **Status:** Infrastructure exists, minimal data
```
alma_* tables - Research/evidence system
Most are empty or have minimal data
```
**Verdict:** Review if still needed. Large footprint with low usage.

### 3. Empathy Ledger Integration - ACTIVE
**Tables:** 10+ | **Status:** Has data via separate EL database
```
storytellers (226 rows) - Active
stories (1 row) - Minimal
normalized_stories (0 rows) - Empty
```
**Verdict:** Keep. EL has its own Supabase; this syncs subsets.

### 4. Gmail Integration - MINIMAL
**Tables:** 5 | **Status:** Started but limited
```
gmail_messages (25 rows) - Very few emails
gmail_sync_state - Sync tracking
gmail_auth_tokens - Auth
```
**Verdict:** New `sync-events` edge function should replace this.

### 5. Knowledge System - NOT ACTIVE
**Tables:** 10+ | **Status:** Created but never populated
```
knowledge_chunks (0 rows)
knowledge_sources (0 rows)
entity_relationships (0 rows)
```
**Verdict:** Was planned but never implemented. Could be removed or used with new communications system.

### 6. Notion Integration - ACTIVE
**Tables:** 9 | **Status:** Syncing projects
```
notion_projects (78 rows) - Active
notion_organizations
notion_people
```
**Verdict:** Keep. Working integration.

### 7. Media Systems - FRAGMENTED
**Tables:** 25+ across 7 systems | **Status:** Duplicated
```
media_assets, media_items, media_library
platform_media_*, ce_media_assets
partner_photos, storyteller_media, etc.
```
**Verdict:** Consolidate to single media system.

### 8. Billing (Stripe) - INACTIVE
**Tables:** 12 | **Status:** Structure only
```
billing_customers (0 rows)
billing_subscriptions (0 rows)
```
**Verdict:** Keep structure for future use, or remove if not planned.

---

## Recommendations

### Immediate Actions

1. **Use the New Communications System**
   - `communications_history` table is now ready
   - `sync-events` edge function deployed
   - Gmail/Calendar Apps Scripts created
   - GHL webhook handler updated

2. **Don't Create More Databases**
   - One database is fine for your scale
   - 847 contacts + 226 storytellers + 471 orgs = small dataset
   - No need for database separation

3. **Start Populating Communications**
   - Deploy Gmail Apps Script → emails flow to `communications_history`
   - Deploy Calendar Apps Script → events flow in
   - GHL webhooks now sync messages

### Short-term Cleanup (Month 1)

1. **Archive Legacy Tables**
   ```sql
   -- Safe to archive (verify first)
   events_old_backup
   migration_email_templates
   migration_rate_limits
   ```

2. **Consolidate Media Tables**
   - 25+ tables → 5 core tables
   - Use `context_type` field instead of separate tables

3. **Remove Duplicate Communication Tables**
   - `contact_communications` is empty → can be removed
   - Use `communications_history` as single source

### Medium-term (Quarter 1)

1. **Review ALMA System**
   - 50 tables with minimal data
   - Determine if still needed
   - Archive or fully implement

2. **Populate Knowledge System**
   - `knowledge_chunks` could store conversation context
   - `entity_relationships` could track contact connections
   - Or remove if not needed

3. **Consolidate Services Tables**
   - 5 service-related tables
   - Merge into unified services table

---

## One Database vs Two?

**Recommendation: Keep One Database**

### Why One is Better for ACT:

1. **Scale is small** - 847 contacts, 226 storytellers
2. **Easier joins** - Cross-reference contacts with stories
3. **Single source of truth** - No sync complexity
4. **Cost efficient** - One Supabase project
5. **Simpler backups** - One backup strategy

### When to Consider Two:

- If Empathy Ledger needs complete data isolation (OCAP compliance)
- If you have >100k rows and performance issues
- If different teams need separate billing

**Current state:** EL already has its own Supabase for its public platform. The ACT database stores synced subsets. This is a good pattern.

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  ACT SUPABASE DATABASE                       │
│               (tednluwflfhxyucgwigh)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ ghl_contacts│    │ storytellers│    │ organizations│    │
│  │    847      │    │     226     │    │     471      │    │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                   │            │
│         └──────────────────┼───────────────────┘            │
│                            │                                │
│              ┌─────────────▼─────────────┐                  │
│              │ communications_history    │                  │
│              │  (NEW - ready to populate)│                  │
│              └─────────────┬─────────────┘                  │
│                            │                                │
│         ┌──────────────────┼──────────────────┐            │
│         ▼                  ▼                  ▼            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Gmail     │    │  Calendar   │    │ GHL Messages│    │
│  │ (via sync)  │    │ (via sync)  │    │ (webhook)   │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                            │
└────────────────────────────────────────────────────────────┘
                              ▲
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────┴────┐          ┌────┴────┐          ┌────┴────┐
   │ Notion  │          │  GHL    │          │   EL    │
   │   MCP   │          │  API    │          │Supabase │
   └─────────┘          └─────────┘          └─────────┘
```

---

## Next Steps

1. **Deploy Gmail/Calendar Apps Scripts**
   - Files created: `apps-scripts/gmail-sync.gs`, `apps-scripts/calendar-sync.gs`
   - Need to add to Google Apps Script and configure

2. **Test Communications Flow**
   - Send test email → verify it appears in `communications_history`
   - Create calendar event → verify sync

3. **Run Backfill**
   - Use `backfillLast30Days()` in Apps Scripts
   - Populate `communications_history` with historical data

4. **Update Morning Brief**
   - `generate-morning-brief.mjs` updated to use new data
   - Will show communications once populated

---

## Full Audit Report

See: `.claude/cache/agents/scout/supabase-audit.md`

Contains:
- All 442 tables categorized
- Duplication analysis
- Media consolidation plan
- SQL queries for finding unused tables
