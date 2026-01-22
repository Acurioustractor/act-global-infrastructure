# ACT Relationship Management Consolidation Plan

**Date:** 2026-01-21
**Status:** Analysis Complete - Ready for Decision

---

## Problem Statement

The ACT ecosystem has **fragmented relationship data** across multiple tables and two databases, causing:
1. **Duplicate processes** on the dashboard (Contacts, People, Relationships tabs)
2. **Inconsistent data** - Some scripts use one source, others use another
3. **Broken scripts** - `relationship-health.mjs` references empty tables
4. **No single source of truth** for contact/relationship data

---

## Current State Analysis

### Two Supabase Databases

| Database | Project ID | Key Tables | Status |
|----------|------------|------------|--------|
| **Farmhand** | bhwyqqbovcjoefezgfnq | `contact_communications` (8,289), `relationship_health` (1,336), `entities` (63) | MCP Connected |
| **Main (EL)** | tednluwflfhxyucgwigh | `ghl_contacts` (847), `communications_history` (0), `storytellers` (226) | Disconnected |

### Data Flow Issues

```
CURRENT (BROKEN):

  Gmail ──→ Farmhand.contact_communications (8,289 emails)
                ↓
        relationship_health (1,336 - email-based names)
                ↓
        Dashboard shows "John Smith" extracted from john.smith@example.com

  GHL ──→ Main.ghl_contacts (847 contacts with proper names, tags, company)
                ↓
        NOT visible to Dashboard (different database!)
```

### Table Analysis

| Table | Database | Rows | Purpose | Issues |
|-------|----------|------|---------|--------|
| `contact_communications` | Farmhand | 8,289 | Gmail sync | Uses `ghl_contact_id` but has emails as IDs |
| `communication_history` | Farmhand | 0 | Follow-up tracking | EMPTY - never populated |
| `relationship_health` | Farmhand | 1,336 | Temperature scores | Names derived from emails, not GHL |
| `entities` | Farmhand | 63 | Entity resolution | Only 63 of 847 contacts resolved |
| `entity_mappings` | Farmhand | 61 | Cross-system links | Minimal coverage |
| `contact_review_decisions` | Farmhand | 1,155 | Contact review workflow | Has `ghl_contact_id` links |
| `ghl_contacts` | Main | 847 | Master contact list | **NOT accessible from Dashboard** |
| `communications_history` | Main | 0 | Unified comms | EMPTY - prepared but unused |

### Script Issues

| Script | References | Problem |
|--------|------------|---------|
| `relationship-health.mjs` | `communications_history` | Table is EMPTY |
| `contact-manager.mjs` | Multiple tables | Inconsistent sources |
| `cultivator-agent.mjs` | `relationship_health` | Works but missing GHL data |
| API server | `relationship_health` | Works but names are email-derived |

---

## Root Causes

### 1. Two-Database Architecture
- **Farmhand** has Gmail sync and intelligence features
- **Main** has GHL contacts and core CRM
- Dashboard connects to Farmhand only

### 2. Incomplete Entity Resolution
- Only 63/847 contacts have canonical entities
- Email ↔ GHL ID mapping is incomplete
- Names aren't linked to proper contact records

### 3. Divergent Table Schemas
- `contact_communications.ghl_contact_id` = email addresses
- `relationship_health.contact_id` = email addresses
- `ghl_contacts.id` = actual GHL IDs
- No consistent foreign key

---

## Proposed Solution: Single Source of Truth

### Target Architecture

```
PROPOSED (UNIFIED):

  Gmail ──┬──→ contact_communications (raw emails)
          │
  GHL ────┼──→ contacts (847 master records) ◄─── SINGLE SOURCE
          │         ↓
Calendar ─┘    relationships (derived from contacts)
                    ↓
               Dashboard (unified view)
```

### New Table: `contacts` (Unified Master)

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (pick one as canonical)
  ghl_id TEXT UNIQUE,
  email TEXT,
  phone TEXT,

  -- Name
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  company TEXT,

  -- Relationship
  relationship_type TEXT CHECK (relationship_type IN ('partner', 'client', 'collaborator', 'community', 'prospect', 'other')),
  tags TEXT[],

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),

  -- Source tracking
  sources JSONB DEFAULT '{}',  -- {"ghl": true, "gmail": true, "notion": false}

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for lookups
CREATE INDEX idx_contacts_ghl_id ON contacts(ghl_id);
CREATE INDEX idx_contacts_email ON contacts(email);
```

### New Table: `relationships` (Health Tracking)

```sql
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,

  -- Health metrics
  temperature INTEGER DEFAULT 50 CHECK (temperature >= 0 AND temperature <= 100),
  trend TEXT CHECK (trend IN ('rising', 'stable', 'falling')),

  -- Activity
  last_contact_date TIMESTAMPTZ,
  last_contact_type TEXT,  -- 'email', 'meeting', 'call', 'message'
  next_action TEXT,
  next_action_date TIMESTAMPTZ,

  -- Scoring components
  recency_score INTEGER,
  frequency_score INTEGER,
  engagement_score INTEGER,
  reciprocity_score INTEGER,

  -- Context
  notes TEXT,
  cultural_considerations JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(contact_id)
);
```

### Migration Plan

#### Phase 1: Create Unified Tables (Day 1)
1. Create `contacts` table in Farmhand
2. Create `relationships` table in Farmhand
3. Keep existing tables until migration complete

#### Phase 2: Sync GHL Contacts (Day 1-2)
```javascript
// sync-ghl-contacts.mjs
// Fetch from Main.ghl_contacts → Farmhand.contacts
const { data: ghlContacts } = await mainSupabase.from('ghl_contacts').select('*');
for (const contact of ghlContacts) {
  await farmhandSupabase.from('contacts').upsert({
    ghl_id: contact.id,
    email: contact.email,
    first_name: contact.firstName,
    last_name: contact.lastName,
    display_name: `${contact.firstName} ${contact.lastName}`.trim(),
    company: contact.companyName,
    tags: contact.tags,
    sources: { ghl: true }
  });
}
```

#### Phase 3: Build Relationships (Day 2)
```javascript
// build-relationships.mjs
// For each contact, calculate relationship health from communications
const { data: contacts } = await supabase.from('contacts').select('*');
for (const contact of contacts) {
  const comms = await getContactCommunications(contact.ghl_id || contact.email);
  const health = calculateRelationshipHealth(comms);
  await supabase.from('relationships').upsert({
    contact_id: contact.id,
    temperature: health.temperature,
    trend: health.trend,
    last_contact_date: health.lastContact,
    // ... other fields
  });
}
```

#### Phase 4: Update Dashboard (Day 3)
1. Update API endpoints to use `contacts` + `relationships` tables
2. Replace Contacts/People tabs with unified view
3. Update Relationships tab to show proper names

#### Phase 5: Cleanup (Week 2)
1. Archive old tables (don't delete yet)
2. Update all scripts to use new tables
3. Remove duplicate processes

---

## Dashboard Changes

### Current Tabs (Duplicate)
- **Contacts** - Lists entities (63)
- **Relationships** - Shows relationship_health (1,336 with email-derived names)

### Proposed Tabs (Unified)
- **Contacts** - Shows unified contacts (847+) with:
  - Name, company, tags from GHL
  - Relationship temperature
  - Last contact date
  - Quick actions
- **Relationships** - Health analysis view:
  - Temperature trends
  - Attention needed
  - Overdue follow-ups
  - Engagement metrics

---

## API Endpoint Changes

### Current
```
GET /api/relationships/health    → relationship_health table
GET /api/relationships/list      → relationship_health table
GET /api/knowledge/entities      → entities table (63 records)
```

### Proposed
```
GET /api/contacts                → contacts table (847+)
GET /api/contacts/:id            → contact + relationship data
GET /api/contacts/:id/comms      → communication history
GET /api/relationships           → relationships table (health view)
GET /api/relationships/attention → needs follow-up
GET /api/relationships/overdue   → no contact > 60 days
```

---

## Benefits

| Benefit | Impact |
|---------|--------|
| **Single source of truth** | No more data confusion |
| **Proper names** | Dashboard shows real names, not emails |
| **Complete coverage** | All 847 GHL contacts visible |
| **Consistent APIs** | All scripts use same tables |
| **Simpler architecture** | Fewer tables to maintain |
| **Better relationships** | Accurate health scores based on all data |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss | Full backup before migration |
| Service disruption | Keep old tables until verified |
| Script breakage | Update scripts incrementally |
| Dashboard issues | Test in dev first |

---

## Decision Required

**Option 1: Full Consolidation** (Recommended)
- Create unified `contacts` + `relationships` tables
- Migrate all data
- Update all services
- **Effort:** 2-3 days

**Option 2: Quick Fix**
- Sync GHL contact names to existing `relationship_health`
- Keep current architecture
- **Effort:** 1 day
- **Downside:** Technical debt remains

**Option 3: Database Migration First**
- Complete Farmhand → Main consolidation first
- Then unify relationship management
- **Effort:** 1-2 weeks
- **Downside:** Delays immediate needs

---

## Recommended Immediate Action

**Start with Option 2 (Quick Fix) to unblock dashboard, then pursue Option 1:**

1. **Today:** Sync GHL contact names into `relationship_health`:
```sql
UPDATE relationship_health rh
SET contact_name = COALESCE(
  (SELECT CONCAT(first_name, ' ', last_name)
   FROM contact_review_decisions crd
   WHERE crd.ghl_contact_id = rh.contact_id),
  rh.contact_name
)
WHERE contact_id IN (SELECT ghl_contact_id FROM contact_review_decisions);
```

2. **This Week:** Create unified `contacts` table and migration script

3. **Next Week:** Complete consolidation and update all services

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/act-dashboard/api-server.mjs` | New contact endpoints |
| `Intelligence.tsx` | Unified contacts view |
| `scripts/relationship-health.mjs` | Use correct tables |
| `scripts/contact-manager.mjs` | Use unified contacts |
| Database migrations | New tables |

---

## Summary

The relationship management is fragmented because data lives in two databases with no proper joins. The solution is to:
1. **Short-term:** Enrich existing data with GHL names
2. **Medium-term:** Create unified `contacts` table in Farmhand
3. **Long-term:** Complete database consolidation (Farmhand → Main)

This will give the dashboard consistent, complete, and accurate relationship data.
