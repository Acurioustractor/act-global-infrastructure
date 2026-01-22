# ACT Database Consolidation Review

**Date:** 2026-01-20
**Author:** Claude (ACT AI Analysis)
**Status:** Ready for Decision

---

## Executive Summary

ACT has **8 Supabase databases** but only **2 are actively used**:

| Database | Project ID | Purpose | Status |
|----------|------------|---------|--------|
| **Empathy Ledger (Main)** | tednluwflfhxyucgwigh | CRM, GHL sync, storytellers | ACTIVE - Primary |
| **ACT Farmhand** | bhwyqqbovcjoefezgfnq | AI/RAG, Gmail sync, Xero | ACTIVE - Intelligence |
| Barkly Backbone | gkwzdnzwpfpkvgpcbeeq | Legacy | DORMANT |
| Empathy Ledger Enhanced | yvnuayzslukamizrlhwb | Legacy | DORMANT |
| Palm Island Server | uaxhjzqrdotoahjnxmbj | Community specific | LOW USE |
| SMART Connect | gokmsihcbejttzimbrlw | Project specific | LOW USE |
| Goods | cwsyhpiuepvdjtxaozwf | Project specific | LOW USE |
| barkly-research-db | xnifhejavwvbdkcakakn | Vercel/research | DORMANT |

**Recommendation:** Consolidate to **ONE primary database** (Main) with Farmhand's intelligence features migrated in.

---

## Current Architecture

### Main ACT Database (tednluwflfhxyucgwigh)
**Location:** Sydney | **Tables:** 442 | **Active Tables:** ~50

#### Active Data
| Table | Rows | Purpose |
|-------|------|---------|
| `ghl_contacts` | 847 | Primary contact database |
| `ghl_opportunities` | 45 | Pipeline opportunities |
| `organizations` | 471 | Organization records |
| `storytellers` | 226 | Empathy Ledger storytellers |
| `notion_projects` | 78 | Projects synced from Notion |
| `articles` | 39 | Published articles |
| `communications_history` | 0 | NEW - Ready for data |
| `relationship_health` | 0 | NEW - Ready for data |
| `user_identities` | 2 | Team members (ben, nic) |

#### Issues
- 390+ empty tables from abandoned features
- Duplicate media tables (25+ across 7 systems)
- No Gmail content, only `last_contact_date` timestamps
- No AI/RAG capabilities

---

### ACT Farmhand Database (bhwyqqbovcjoefezgfnq)
**Location:** Mumbai | **Tables:** ~15 | **Purpose:** AI Intelligence Hub

#### Schema (from migrations)
| Table | Purpose | Value |
|-------|---------|-------|
| `knowledge_chunks` | RAG with OpenAI embeddings (1536-dim) | HIGH |
| `contact_communications` | Gmail email sync with metadata | HIGH |
| `communication_history` | Follow-up tracking | MEDIUM |
| `calendar_events` | Google Calendar sync | HIGH |
| `conversation_context` | Chatbot session memory | MEDIUM |
| `sync_state` | Incremental sync tracking | HIGH |
| `entity_relationships` | Contact/project graph | MEDIUM |
| `entities` + `entity_mappings` | Canonical entity resolution | HIGH |
| `xero_invoices` | Accounts receivable/payable | HIGH |
| `xero_financial_snapshots` | Financial trend tracking | MEDIUM |
| `xero_financial_alerts` | Overdue/due alerts | MEDIUM |
| `recommendation_outcomes` | AI recommendation tracking | MEDIUM |
| `learned_thresholds` | ML threshold learning | LOW |

#### Key Features
1. **RAG Search** - Vector similarity search across all content
2. **Gmail Sync** - Full email content and metadata
3. **Calendar Sync** - Event awareness for scheduling
4. **Entity Resolution** - One person, one view across systems
5. **Xero Integration** - Financial health tracking
6. **AI Feedback Loop** - Track recommendation effectiveness

---

## Overlap Analysis

### Communication Tables (DUPLICATED)

| Main Database | Farmhand | Resolution |
|---------------|----------|------------|
| `communications_history` (NEW) | `contact_communications` | Migrate Farmhand → Main |
| `communications_history` (NEW) | `communication_history` | Same purpose, merge |
| `relationship_health` (NEW) | - | Keep in Main |
| - | `entity_relationships` | Migrate → Main |

### Schema Differences

| Feature | Main | Farmhand | Decision |
|---------|------|----------|----------|
| Contact ID format | `ghl_id` (GHL native) | Email or UUID | Standardize on `ghl_id` |
| Embedding model | None | OpenAI ada-002 (1536-dim) | Use all-MiniLM-L6-v2 (384-dim) - faster, cheaper |
| Calendar sync | Via GHL (limited) | Direct Google API | Use direct sync |
| Email sync | Via GHL (limited) | Direct Gmail API | Use direct sync |

---

## Consolidation Plan

### Recommended: Single Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│            CONSOLIDATED ACT DATABASE (Main)                      │
│                 tednluwflfhxyucgwigh                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  CRM LAYER      │  │  INTELLIGENCE   │  │  CONTENT        │ │
│  │  (existing)     │  │  (from Farmhand)│  │  (existing)     │ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤ │
│  │ ghl_contacts    │  │ knowledge_chunks│  │ storytellers    │ │
│  │ ghl_opportunities│  │ calendar_events │  │ stories         │ │
│  │ ghl_pipelines   │  │ sync_state      │  │ articles        │ │
│  │ communications_ │  │ entities        │  │ notion_projects │ │
│  │   history       │  │ xero_invoices   │  │ organizations   │ │
│  │ relationship_   │  │ xero_snapshots  │  │                 │ │
│  │   health        │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Migration Steps

#### Phase 1: Migrate Intelligence Tables (Week 1)

```sql
-- 1. Create knowledge_chunks in Main (change to 384-dim embeddings)
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(384),  -- Changed from 1536 to 384 (all-MiniLM-L6-v2)
  source_type TEXT NOT NULL,
  source_id TEXT,
  project_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create entities tables in Main
-- (Copy from Farmhand migration 20260108010000)

-- 3. Create calendar_events in Main
-- (Copy from Farmhand migration 20260105000000)

-- 4. Create xero tables in Main
-- (Copy from Farmhand migration 20260107000000)
```

#### Phase 2: Migrate Data (Week 1-2)

```javascript
// scripts/migrate-farmhand.mjs

// 1. Export from Farmhand
const { data: comms } = await farmhand.from('contact_communications').select('*');
const { data: events } = await farmhand.from('calendar_events').select('*');
const { data: entities } = await farmhand.from('entities').select('*');

// 2. Transform and import to Main
for (const comm of comms) {
  await main.from('communications_history').upsert({
    ghl_contact_id: comm.ghl_contact_id, // May need email→ghl_id lookup
    channel: comm.comm_type,
    direction: comm.direction,
    subject: comm.subject,
    content_preview: comm.summary,
    occurred_at: comm.occurred_at,
    source_system: comm.source,
    source_id: comm.source_id,
  });
}
```

#### Phase 3: Update Services (Week 2)

| Service | Current DB | Change |
|---------|------------|--------|
| `gmail-sync.mjs` | Farmhand | → Main `communications_history` |
| `calendar-sync.mjs` | Farmhand | → Main `calendar_events` |
| `rag-retrieval.mjs` | Farmhand | → Main `knowledge_chunks` |
| `xero-sync.mjs` | Farmhand | → Main `xero_*` tables |
| `entity-resolver.mjs` | Farmhand | → Main `entities` |

#### Phase 4: Cleanup (Week 3)

1. Update all service connection strings to Main
2. Verify all data migrated correctly
3. Archive Farmhand database (don't delete yet)
4. Remove 390+ empty tables from Main
5. Consolidate 7 media systems into 1

---

## Embedding Model Decision

### Current: OpenAI ada-002 (Farmhand)
- Dimensions: 1536
- Cost: $0.10/1M tokens
- Quality: High
- Size: ~6KB per embedding

### Recommended: all-MiniLM-L6-v2 (Local)
- Dimensions: 384
- Cost: FREE (local)
- Quality: Good (90% of ada-002 for most tasks)
- Size: ~1.5KB per embedding

**Rationale:** For ACT's scale (< 10K documents), the quality difference is negligible but cost and privacy benefits are significant.

---

## Data to Preserve

### From Farmhand (HIGH PRIORITY)
1. **Gmail communications** - Email history with contacts
2. **Calendar events** - Meeting history
3. **Sync state** - Don't lose incremental sync tokens
4. **Xero invoices** - Financial records
5. **Entity mappings** - Who is who across systems

### From Main (KEEP AS-IS)
1. **GHL contacts** - Primary contact database
2. **Storytellers** - Empathy Ledger core
3. **Organizations** - Partner/collaborator records
4. **Cultural protocols** - NEVER migrate, NEVER expose

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | HIGH | Full backup before migration |
| Service downtime | MEDIUM | Run in parallel, switch over |
| Embedding model change | LOW | Re-embed incrementally |
| Connection string updates | LOW | Environment variable change |

---

## Timeline

| Week | Task |
|------|------|
| 1 | Create migration scripts, backup both databases |
| 1 | Create new tables in Main (intelligence layer) |
| 1-2 | Migrate data from Farmhand → Main |
| 2 | Update all services to use Main |
| 2 | Testing and verification |
| 3 | Archive Farmhand, cleanup empty Main tables |
| 3 | Documentation update |

---

## Cost Impact

### Before Consolidation
- 2 Supabase Pro databases: ~$50/month
- OpenAI embeddings: ~$5/month (small scale)
- **Total: ~$55/month**

### After Consolidation
- 1 Supabase Pro database: ~$25/month
- Local embeddings: $0/month
- **Total: ~$25/month**

**Savings: ~$30/month ($360/year)**

---

## Decision Required

**Question:** Should we consolidate ACT Farmhand into the main Empathy Ledger database?

**Options:**
1. **YES - Full consolidation** (Recommended)
   - One source of truth
   - Lower costs
   - Simpler architecture
   - Better cross-feature integration

2. **NO - Keep separate**
   - If Mumbai region latency needed for specific features
   - If complete isolation required
   - If team prefers current architecture

3. **HYBRID - Partial consolidation**
   - Move communications and calendar to Main
   - Keep knowledge_chunks in Farmhand (AI-specific)
   - More complex but allows specialized optimization

---

## Next Steps

1. [ ] Review this document
2. [ ] Decide on consolidation approach
3. [ ] Create backup scripts
4. [ ] Create migration scripts
5. [ ] Schedule migration window
6. [ ] Execute migration
7. [ ] Verify and test
8. [ ] Archive old database

---

## Appendix: Farmhand Migrations

```
20260105000000_knowledge_hub_schema.sql
  - knowledge_chunks (RAG)
  - entity_relationships
  - contact_communications
  - conversation_context
  - calendar_events
  - sync_state

20260106000000_match_knowledge_chunks_function.sql
  - Vector similarity search function

20260106100000_communication_history.sql
  - communication_history table
  - unanswered_communications view
  - contact_communication_summary view

20260106200000_add_xero_sync_type.sql
  - sync_state xero type

20260107000000_xero_financial_data.sql
  - xero_invoices
  - xero_financial_snapshots
  - xero_financial_alerts
  - Financial health views

20260108000000_create_recommendation_outcomes.sql
  - recommendation_outcomes table

20260108010000_create_entities_tables.sql
  - entities
  - entity_mappings
  - Entity resolution functions

20260108020000_create_learned_thresholds_table.sql
  - learned_thresholds

20260108030000_contact_enrichment.sql
  - Contact enrichment features
```
