# Implementation Plan: Communications Intelligence System

Generated: 2026-02-01
Status: Ready for implementation

## Goal

Build a fully automatic Communications Intelligence System that:
1. Auto-creates GHL contacts from unknown email senders
2. Automatically links communications to ACT projects via AI
3. Provides a real-time intelligence feed (replacing daily digest)
4. Aligns all knowledge sources (email, iMessage, projects, grants, finances) into a unified graph
5. Proactively surfaces contact suggestions and ecosystem insights

## Existing Codebase Analysis (VERIFIED)

### Scripts (scripts/)
- `sync-gmail-to-supabase.mjs` -- syncs Gmail, matches contacts via `ghl_contacts.email`, runs enrichment (summary, sentiment, topics) via `gpt-4o-mini`. Uses direct OpenAI, NOT the tracked `llm-client.mjs`. Inserts to `communications_history`.
- `sync-imessage.mjs` -- syncs iMessage from macOS chat.db, uses `trackedBatchEmbedding` and `trackedCompletion` from `llm-client.mjs`. Inserts to `communications_history` + `knowledge_chunks`.
- `embed-communications.mjs` -- generates embeddings for `communications_history` rows, inserts to `knowledge_chunks` with `source_type: 'communication'`.

### Libraries (scripts/lib/)
- `llm-client.mjs` -- tracked OpenAI + Anthropic completions with cost logging to `api_usage`. Exports: `embed`, `trackedEmbedding`, `trackedBatchEmbedding`, `complete`, `trackedCompletion`, `claudeComplete`, `trackedClaudeCompletion`.
- `knowledge-graph.mjs` -- KnowledgeGraph class with `addEdge`, `getNeighbors`, `getSubgraph`, `autoLinkDecision`, `autoLinkKnowledge`, `getConnectivityScore`. Valid node types: `knowledge_chunk`, `project_knowledge`, `decision_trace`, `agent_learning`, `entity`, `communication`.
- `episodic-memory.mjs` -- EpisodicMemory class, creates episodes of type: `project_phase`, `decision_sequence`, `interaction_arc`, `incident`, `learning_journey`, `campaign`, `grant_process`.
- `working-memory.mjs` -- agent working memory with decay scoring.

### Database (Supabase)
- `communications_history` -- columns include: `ghl_contact_id`, `channel`, `direction`, `subject`, `content_preview`, `source_system`, `source_id`, `source_thread_id`, `occurred_at`, `summary`, `sentiment`, `topics`, `waiting_for_response`, `response_needed_by`, `enriched_at`, `project_code`, `contact_name`, `contact_email`, `metadata`, `synced_at`. Unique on `(source_system, source_id)`.
- `ghl_contacts` -- columns include: `id` (uuid), `ghl_id`, `email`, `full_name`, `phone`, `company_name`, `tags`, `projects`, `engagement_status`, `last_contact_date`, `sync_source`, `ghl_created_at`.
- `knowledge_chunks` -- vector embeddings store, `source_type` includes `'communication'`.
- `knowledge_edges` -- graph edges between knowledge items. Source/target types include `'communication'`.
- `integration_events` -- Realtime-enabled event bus. Columns: `source`, `event_type`, `entity_type`, `entity_id`, `supabase_id`, `payload`, `triggered_by`, `latency_ms`.
- `memory_episodes` -- episodic memory with embedding search.
- `agent_working_memory` -- short-lived working memory for agents.
- `agent_feedback_records` -- learning system feedback.
- `agent_mistake_patterns` -- learned error patterns.

### Dashboard (apps/command-center/)
- `today/page.tsx` -- main dashboard with Morning Brief, Contact Today, Email stats, Live Activity Feed, Knowledge card. Uses `@tanstack/react-query` with 30s refresh.
- `live-activity-feed.tsx` -- subscribes to `integration_events` via Supabase Realtime. Shows source, event_type, entity info, latency.
- `lib/api.ts` -- typed fetch wrapper for all API calls. Exports: `getRelationships`, `getEmailStats`, `getRecentEmails`, `searchKnowledge`, etc.
- `lib/supabase.ts` -- server-side Supabase client.

### Key Patterns
- All sync scripts insert to `communications_history`, then optionally embed to `knowledge_chunks`.
- Contact matching uses email-to-`ghl_contacts` map. Unmatched emails get `ghl_contact_id: null`.
- `integration_events` is the Realtime bus -- any script can insert events and the dashboard picks them up instantly.
- The enrichment in `sync-gmail-to-supabase.mjs` uses OpenAI directly (NOT tracked). This should be migrated to `trackedCompletion`.

---

## Phase 1: Communication Intelligence

**Goal:** Auto-create contacts, auto-link to projects, enhance enrichment pipeline.

### 1.1 Auto-Create GHL Contacts from Unknown Emails

**New file:** `scripts/lib/contact-intelligence.mjs`

This module handles contact auto-creation and enrichment.

```javascript
// scripts/lib/contact-intelligence.mjs
// Exports:
//   autoCreateContact(supabase, email, name, metadata) -> ghl_contacts row
//   enrichContactFromEmail(supabase, contactId, emailData) -> updated contact
//   matchOrCreateContact(supabase, email, name, metadata) -> { contact, created }

import { trackedCompletion, trackedEmbedding } from './llm-client.mjs';
import { KnowledgeGraph } from './knowledge-graph.mjs';
```

**Logic for `matchOrCreateContact`:**
1. Check `ghl_contacts` for exact email match (existing behavior).
2. If no match, check for fuzzy name match within same domain (e.g., "John Smith" and email `john@company.com` might match existing "John" at `company.com`).
3. If still no match, create a new `ghl_contacts` row with:
   - `email` from the email address
   - `full_name` parsed from the email "From" header (e.g., `"John Smith <john@company.com>"` -> `"John Smith"`)
   - `sync_source: 'auto-created:gmail'`
   - `engagement_status: 'lead'`
   - `tags: ['auto-created']`
4. Filter out no-reply addresses: `noreply@`, `no-reply@`, `mailer-daemon@`, `notifications@`, `donotreply@`, `automated@`.
5. Fire an `integration_events` row: `{ source: 'gmail', event_type: 'contact.auto_created', entity_type: 'contact', entity_id: newContact.id, payload: { email, name, first_email_subject } }`.

**AI model:** None needed for contact creation itself. Name parsing is deterministic.

**Modify:** `scripts/sync-gmail-to-supabase.mjs`

Add an auto-creation pass after message transformation. The `transformMessage` function stays synchronous. A new async pass fills in missing contacts:

```javascript
import { matchOrCreateContact } from './lib/contact-intelligence.mjs';

// After all messages are transformed (around line 556):
const unmatchedInbound = transformed.filter(r => !r.ghl_contact_id && r.direction === 'inbound');
console.log(`[Auto-Create] ${unmatchedInbound.length} unmatched inbound emails`);

for (const record of unmatchedInbound) {
  const fromEmail = extractEmail(record.metadata.from);
  if (!fromEmail) continue;

  const fromName = record.metadata.from?.match(/^([^<]+)/)?.[1]?.trim() || fromEmail.split('@')[0];
  const { contact, created } = await matchOrCreateContact(supabase, fromEmail, fromName, {
    firstSeenVia: 'gmail',
    firstEmailSubject: record.subject,
  });

  record.ghl_contact_id = contact.ghl_id || contact.id;
  if (created) {
    stats.autoCreated = (stats.autoCreated || 0) + 1;
    // Update in-memory map for subsequent matches in this batch
    ghlContactMap.set(fromEmail, { ghl_contact_id: contact.ghl_id || contact.id, full_name: contact.full_name });
  }
}
```

### 1.2 Auto-Link Communications to Projects via AI

**New file:** `scripts/lib/project-linker.mjs`

```javascript
// scripts/lib/project-linker.mjs
// Exports:
//   linkCommunicationToProjects(commId, subject, content, contactProjects) -> links[]
//   batchLinkCommunications(commIds) -> { linked, skipped }

import { trackedCompletion } from './llm-client.mjs';
```

**AI prompt for project linking (gpt-4o-mini, ~200 tokens output):**

```
System: You are a project classifier for ACT (A Cooperative Thinker), a social enterprise.
Given an email's subject and content, determine which ACT project(s) it relates to.

ACT Projects:
- ACT-EL: Empathy Ledger - storytelling platform for First Nations communities
- ACT-JH: JusticeHub - legal technology platform
- ACT-HV: The Harvest - community food program
- ACT-FM: The Farm - regenerative agriculture
- ACT-ST: The Studio - creative production
- ACT-PC: PICC - community engagement
- ACT-ORG: ACT Organization - general admin, finance, legal, governance

Rules:
- Only assign projects you are confident about (>0.6)
- An email can relate to 0, 1, or multiple projects
- Consider the contact's existing project associations
- Return JSON only

User: Subject: {subject}
Preview: {content_preview}
Contact projects: {contact.projects}
Contact tags: {contact.tags}

Return: { "projects": [{ "code": "ACT-XX", "confidence": 0.8, "reasoning": "..." }] }
```

### 1.3 Unified Enrichment Pipeline

**New file:** `scripts/enrich-communications.mjs`

Dedicated enrichment script that runs async (separate from sync), handling:
1. Summary + sentiment (existing, but migrated to use `trackedCompletion`)
2. Project linking via `project-linker.mjs`
3. Knowledge graph edge creation via `knowledge-graph.mjs`
4. Integration event firing for dashboard updates

```javascript
// scripts/enrich-communications.mjs
// Processes communications_history rows where intelligence_version < CURRENT_VERSION
// Runs as a cron job every 5 minutes
// Usage: node scripts/enrich-communications.mjs [--dry-run] [--limit 20]

const CURRENT_VERSION = 1;

async function enrichBatch(limit = 20) {
  // Fetch unenriched or outdated communications
  const { data: comms } = await supabase
    .from('communications_history')
    .select('id, subject, content_preview, direction, ghl_contact_id, metadata, project_code')
    .or(`intelligence_version.is.null,intelligence_version.lt.${CURRENT_VERSION}`)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  for (const comm of comms) {
    // 0. Cultural protocol check
    if (isCulturallySensitive(comm.subject + ' ' + comm.content_preview)) {
      await markCulturallyProtected(comm.id);
      continue;
    }

    // 1. AI enrichment (summary, sentiment, topics) via trackedCompletion
    const enrichment = await aiEnrich(comm);

    // 2. Project linking
    const contact = comm.ghl_contact_id
      ? await getContactContext(comm.ghl_contact_id)
      : null;
    const projectLinks = await linkCommunicationToProjects(
      comm.id, comm.subject, comm.content_preview, contact
    );

    // 3. Update communications_history
    await supabase.from('communications_history').update({
      summary: enrichment.summary,
      sentiment: enrichment.sentiment,
      topics: enrichment.topics,
      waiting_for_response: enrichment.requires_response,
      project_codes: projectLinks.map(l => l.code),
      ai_project_confidence: Math.max(...projectLinks.map(l => l.confidence), 0),
      intelligence_version: CURRENT_VERSION,
      enriched_at: new Date().toISOString(),
    }).eq('id', comm.id);

    // 4. Insert project links to junction table
    for (const link of projectLinks) {
      await supabase.from('communication_project_links').upsert({
        communication_id: comm.id,
        project_code: link.code,
        confidence: link.confidence,
        linked_by: 'ai',
        reasoning: link.reasoning,
      }, { onConflict: 'communication_id,project_code' });
    }

    // 5. Knowledge graph edges
    const graph = new KnowledgeGraph();
    if (comm.ghl_contact_id) {
      await graph.addEdge('communication', comm.id, 'entity', comm.ghl_contact_id, 'about', {
        strength: 0.8, confidence: 0.9, createdBy: 'enrich-communications'
      });
    }
    for (const link of projectLinks) {
      await graph.addEdge('communication', comm.id, 'project_knowledge', link.code, 'context_for', {
        strength: link.confidence, confidence: link.confidence, createdBy: 'enrich-communications'
      });
    }

    // 6. Fire integration event for live dashboard
    await supabase.from('integration_events').insert({
      source: comm.metadata?.source_system || 'gmail',
      event_type: 'communication.enriched',
      entity_type: 'communication',
      entity_id: String(comm.id),
      payload: {
        summary: enrichment.summary,
        sentiment: enrichment.sentiment,
        projects: projectLinks.map(l => l.code),
        contact_id: comm.ghl_contact_id,
      },
      triggered_by: 'poll',
    });
  }
}
```

### 1.4 Fix Enrichment to Use Tracked LLM Client

**Modify:** `scripts/sync-gmail-to-supabase.mjs`

The `enrichEmails()` function (lines 312-404) currently creates its own `OpenAI` instance and calls it directly. Two options:

**Option A (recommended):** Remove `enrichEmails()` entirely from `sync-gmail-to-supabase.mjs` and let `enrich-communications.mjs` handle all enrichment. This keeps the sync script fast and focused.

**Option B:** Replace the direct OpenAI calls with `trackedCompletion`:

```javascript
// BEFORE (line ~349):
const openai = new OpenAI({ apiKey });
const response = await openai.chat.completions.create({...});

// AFTER:
import { trackedCompletion } from './lib/llm-client.mjs';
const raw = await trackedCompletion(messages, 'sync-gmail-to-supabase.mjs', {
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 300,
  operation: 'email-enrichment',
});
```

Recommended: **Option A**. The sync script focuses on speed (fetch + insert), and enrichment runs as a separate async pipeline.

### 1.5 Database Migration

**New file:** `supabase/migrations/20260202000000_communication_intelligence.sql`

```sql
-- Add project_codes (array) to communications_history for multi-project linking
ALTER TABLE communications_history
  ADD COLUMN IF NOT EXISTS project_codes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_project_confidence DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS linked_entity_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS intelligence_version INTEGER DEFAULT 0;

-- Add auto-creation tracking to ghl_contacts
ALTER TABLE ghl_contacts
  ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_created_from TEXT,
  ADD COLUMN IF NOT EXISTS first_seen_subject TEXT,
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending'
    CHECK (enrichment_status IN ('pending', 'basic', 'enriched', 'verified'));

-- Communication-project links (many-to-many with confidence)
CREATE TABLE IF NOT EXISTS communication_project_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  communication_id UUID NOT NULL,
  project_code TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  linked_by TEXT NOT NULL DEFAULT 'ai',
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_comm_project_unique
  ON communication_project_links(communication_id, project_code);
CREATE INDEX idx_comm_project_code
  ON communication_project_links(project_code);

-- Intelligence insights: AI-generated cross-domain insights
CREATE TABLE IF NOT EXISTS intelligence_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'new_contact', 'project_link', 'relationship_change',
    'follow_up_needed', 'cross_domain', 'pattern_detected',
    'contact_suggestion', 'grant_match', 'ecosystem_signal'
  )),
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL,
  source_id UUID,
  entity_type TEXT,
  entity_id UUID,
  related_ids JSONB DEFAULT '{}',
  confidence DECIMAL(3,2) DEFAULT 0.8,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'seen', 'acted', 'dismissed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  seen_at TIMESTAMPTZ,
  acted_at TIMESTAMPTZ
);

CREATE INDEX idx_insights_status ON intelligence_insights(status, created_at DESC);
CREATE INDEX idx_insights_type ON intelligence_insights(insight_type, created_at DESC);
CREATE INDEX idx_insights_entity ON intelligence_insights(entity_type, entity_id);

-- Enable Realtime on insights table
ALTER PUBLICATION supabase_realtime ADD TABLE intelligence_insights;

-- Auto-cleanup insights older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_insights()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM intelligence_insights
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('dismissed', 'acted');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

### Phase 1 File Summary

| Item | File | Action |
|------|------|--------|
| Contact intelligence module | `scripts/lib/contact-intelligence.mjs` | CREATE |
| Project linker module | `scripts/lib/project-linker.mjs` | CREATE |
| Enrichment pipeline | `scripts/enrich-communications.mjs` | CREATE |
| Gmail sync auto-create | `scripts/sync-gmail-to-supabase.mjs` | MODIFY (add auto-create pass, remove enrichEmails or keep as thin wrapper) |
| DB migration | `supabase/migrations/20260202000000_communication_intelligence.sql` | CREATE |

**What the user sees:** No dashboard changes yet in Phase 1. But the system starts automatically creating contacts and linking communications to projects. The existing Live Activity Feed on the Today page shows `contact.auto_created` and `communication.enriched` events in real time.

---

## Phase 2: Real-time Intelligence Feed

**Goal:** Replace the static Morning Brief with a live intelligence feed that surfaces cross-domain insights.

### 2.1 Intelligence Feed API

**New file:** `apps/command-center/src/app/api/intelligence/feed/route.ts`

```typescript
// GET /api/intelligence/feed?limit=20&status=new&type=all
// Returns intelligence_insights ordered by priority then recency.

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status') || 'new';
  const type = searchParams.get('type') || 'all';

  let query = supabase
    .from('intelligence_insights')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') query = query.eq('status', status);
  if (type !== 'all') query = query.eq('insight_type', type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ insights: data, count: data?.length || 0 });
}
```

**New file:** `apps/command-center/src/app/api/intelligence/feed/[id]/route.ts`

```typescript
// PATCH /api/intelligence/feed/[id]
// Update insight status: { status: 'seen' | 'acted' | 'dismissed' }
```

**New file:** `apps/command-center/src/app/api/intelligence/suggestions/route.ts`

```typescript
// GET /api/intelligence/suggestions?contact_id=xxx
// Returns contact suggestions based on internal data:
//   - contacts in same project who haven't been introduced
//   - contacts with similar topics/interests (vector similarity on knowledge_chunks)
//   - contacts who recently appeared in communications with shared context
```

### 2.2 Intelligence Feed Dashboard Component

**New file:** `apps/command-center/src/components/intelligence-feed.tsx`

A React component that:
- Fetches from `/api/intelligence/feed` via `@tanstack/react-query`
- Subscribes to `intelligence_insights` via Supabase Realtime for instant updates
- Shows insight cards with type-specific icons and colors
- Supports dismiss/act actions via PATCH to the API
- Has optional filter bar (by type, priority)

Insight type visual config:

| Type | Icon | Color | Label |
|------|------|-------|-------|
| `new_contact` | UserPlus | blue | New Contact |
| `project_link` | Link2 | purple | Project Link |
| `relationship_change` | TrendingUp | orange | Relationship |
| `follow_up_needed` | Clock | amber | Follow Up |
| `cross_domain` | Layers | violet | Cross-Domain |
| `pattern_detected` | Brain | pink | Pattern |
| `contact_suggestion` | Users | emerald | Suggestion |
| `grant_match` | DollarSign | green | Grant Match |
| `ecosystem_signal` | Globe | cyan | Ecosystem |

Each insight card shows:
- Type icon + colored badge
- Title (bold)
- Description (1-2 lines)
- Related entities as clickable pills (contact name -> /people/{id}, project -> /compendium/{code})
- Timestamp (relative: "2m ago", "1h ago")
- Dismiss button (X) and Act button (checkmark)

### 2.3 Cross-Domain Insight Generator

**New file:** `scripts/generate-insights.mjs`

Runs every 5 minutes via cron. Generates insights by querying across domains:

```javascript
// scripts/generate-insights.mjs
// Cron: */5 * * * *
// Usage: node scripts/generate-insights.mjs [--dry-run]

// Insight generators (each produces 0-N insights per run):

// 1. Follow-up detector (pure SQL, no AI)
async function generateFollowUpInsights() {
  // Query: inbound emails where waiting_for_response = true
  //        AND no outbound to same contact in last 3 days
  // Insert: follow_up_needed insight
}

// 2. Relationship change detector (pure SQL, no AI)
async function generateRelationshipInsights() {
  // Query: contacts where temperature dropped
  //        OR days_since_contact exceeds threshold
  // Insert: relationship_change insight
}

// 3. Cross-domain pattern detector (AI-assisted)
async function generateCrossDomainInsights() {
  // Fetch last 24h: communications, calendar events, grant updates
  // Ask claude-3-5-haiku to identify cross-domain patterns
  // Model: claude-3-5-haiku-20241022, ~400 tokens output
  // Insert: cross_domain insight

  const prompt = `You are an intelligence analyst for ACT, a social enterprise.
Identify 0-3 cross-domain insights from these recent events:

Communications (24h): ${JSON.stringify(recentComms.map(c => ({
  direction: c.direction, channel: c.channel, subject: c.subject,
  contact: c.contact_name, projects: c.project_codes, sentiment: c.sentiment
})))}

Calendar (48h): ${JSON.stringify(recentCalendar.map(e => ({ title: e.title, time: e.start_time })))}

Grants: ${JSON.stringify(recentGrants.map(g => ({ name: g.name, status: g.status })))}

Return JSON array: [{ "type": "cross_domain"|"follow_up_needed"|"pattern_detected",
  "title": "...", "description": "...", "priority": "normal"|"high",
  "related": { "contacts": [], "projects": [], "communications": [] } }]
Return [] if nothing meaningful.`;

  const result = await trackedClaudeCompletion(prompt, 'generate-insights.mjs', {
    model: 'claude-3-5-haiku-20241022',
    maxTokens: 800,
    operation: 'cross-domain-insights',
  });
}

// 4. New contact insight (fires from contact-intelligence.mjs, no work needed here)

// 5. Contact suggestion generator (vector similarity, no AI)
async function generateContactSuggestions() {
  // For each active project, find contacts who:
  // - Are tagged with the project AND haven't been contacted in 14+ days
  // - Have similar communication topics (vector similarity on knowledge_chunks)
  // Insert: contact_suggestion insight
}

// Deduplication: before inserting any insight, check if a similar one
// (same type + entity_id + created in last 24h) already exists
async function insertInsightIfNew(insight) {
  const { data: existing } = await supabase
    .from('intelligence_insights')
    .select('id')
    .eq('insight_type', insight.insight_type)
    .eq('entity_id', insight.entity_id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (existing?.length > 0) return null; // Already exists
  return supabase.from('intelligence_insights').insert(insight).select().single();
}
```

### 2.4 Dashboard Integration

**Modify:** `apps/command-center/src/app/today/page.tsx`

Replace the "Morning Brief" section (lines 578-685) with the Intelligence Feed component. The Morning Brief currently shows 3 cards: Agent Approvals, Relationship Alerts, Key Metrics. The Intelligence Feed replaces the entire block:

```typescript
// Import at top:
import { IntelligenceFeed } from '@/components/intelligence-feed';

// Replace Morning Brief div with:
<IntelligenceFeed maxItems={8} />

// Keep the stat cards row below (lines 688-731) -- just add a new stat:
// After the existing 6 StatCards, no changes needed.
// The intelligence feed IS the morning brief now.
```

**Modify:** `apps/command-center/src/lib/api.ts`

Add new API client functions:

```typescript
// Intelligence Feed
export interface IntelligenceInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  source_type: string;
  entity_type?: string;
  entity_id?: string;
  related_ids: Record<string, string[]>;
  confidence: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'new' | 'seen' | 'acted' | 'dismissed';
  created_at: string;
}

export async function getIntelligenceFeed(limit = 20, status = 'new') {
  return fetchApi<{ insights: IntelligenceInsight[]; count: number }>(
    `/api/intelligence/feed?limit=${limit}&status=${status}`
  );
}

export async function updateInsight(id: string, status: string) {
  return fetchApi<{ insight: IntelligenceInsight }>(
    `/api/intelligence/feed/${id}`,
    { method: 'PATCH', body: JSON.stringify({ status }) }
  );
}

export interface ContactSuggestion {
  contact_id: string;
  contact_name: string;
  reason: string;
  project_code?: string;
  similarity_score?: number;
}

export async function getContactSuggestions(contactId?: string) {
  const params = contactId ? `?contact_id=${contactId}` : '';
  return fetchApi<{ suggestions: ContactSuggestion[] }>(
    `/api/intelligence/suggestions${params}`
  );
}
```

### Phase 2 File Summary

| Item | File | Action |
|------|------|--------|
| Intelligence feed API | `apps/command-center/src/app/api/intelligence/feed/route.ts` | CREATE |
| Intelligence feed update API | `apps/command-center/src/app/api/intelligence/feed/[id]/route.ts` | CREATE |
| Contact suggestions API | `apps/command-center/src/app/api/intelligence/suggestions/route.ts` | CREATE |
| Intelligence feed component | `apps/command-center/src/components/intelligence-feed.tsx` | CREATE |
| Insight generator script | `scripts/generate-insights.mjs` | CREATE |
| Today page integration | `apps/command-center/src/app/today/page.tsx` | MODIFY (replace Morning Brief with IntelligenceFeed) |
| API client functions | `apps/command-center/src/lib/api.ts` | MODIFY (add intelligence types + functions) |

**What the user sees:** The Today page Morning Brief is replaced by a live Intelligence Feed showing real-time insights: new contacts created, project links discovered, follow-ups needed, cross-domain connections. Each insight card can be dismissed or acted upon. Supabase Realtime pushes new insights to the feed within seconds of generation.

---

## Phase 3: Knowledge Alignment Engine

**Goal:** Unify all knowledge sources into a coherent graph, add external research, and generate proactive intelligence.

### 3.1 Cross-Source Knowledge Alignment

**New file:** `scripts/lib/knowledge-aligner.mjs`

```javascript
// scripts/lib/knowledge-aligner.mjs
// Aligns knowledge across: email, iMessage, projects, grants, finances, calendar

import { KnowledgeGraph } from './knowledge-graph.mjs';
import { trackedBatchEmbedding, trackedCompletion } from './llm-client.mjs';

export class KnowledgeAligner {
  constructor(options = {}) {
    this.graph = new KnowledgeGraph(options);
    this.supabase = options.supabase;
  }

  /**
   * Align a communication with related knowledge items.
   * Uses vector similarity + entity matching + temporal proximity.
   */
  async alignCommunication(communicationId) {
    // 1. Get the communication's embedding from knowledge_chunks
    const { data: chunk } = await this.supabase
      .from('knowledge_chunks')
      .select('id, embedding, source_type, source_id')
      .eq('source_type', 'communication')
      .eq('source_id', String(communicationId))
      .single();

    if (!chunk?.embedding) return [];

    // 2. Find similar knowledge items across ALL source types
    const { data: similar } = await this.supabase.rpc('search_knowledge_chunks', {
      query_embedding: chunk.embedding,
      match_threshold: 0.7,
      match_count: 10,
    });

    // 3. Filter to cross-source matches (not same communication)
    const crossSource = (similar || []).filter(s =>
      s.source_type !== 'communication' && s.id !== chunk.id
    );

    // 4. Create graph edges for strong matches
    for (const match of crossSource) {
      if (match.similarity >= 0.75) {
        await this.graph.addEdge(
          'communication', String(communicationId),
          match.source_type, match.source_id,
          'related_to',
          {
            strength: match.similarity,
            confidence: 0.7,
            createdBy: 'knowledge-aligner',
            reasoning: `Cross-source similarity: ${match.similarity.toFixed(3)} (${match.source_type})`
          }
        );
      }
    }

    return crossSource;
  }

  /**
   * Run full alignment pass across all recent knowledge.
   */
  async runAlignment(hoursBack = 24) {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    const { data: recentChunks } = await this.supabase
      .from('knowledge_chunks')
      .select('id, source_type, source_id')
      .gte('created_at', since)
      .eq('source_type', 'communication');

    let aligned = 0;
    for (const chunk of recentChunks || []) {
      const matches = await this.alignCommunication(chunk.source_id);
      if (matches.length > 0) aligned++;
    }

    return { total: recentChunks?.length || 0, aligned };
  }

  /**
   * Detect knowledge clusters using graph connectivity.
   * Returns groups of items connected across multiple sources.
   */
  async detectClusters(minSize = 3) {
    // Query knowledge_edges for highly connected nodes
    // Group by shared connections using a simple union-find
    // Return clusters with theme labels
  }
}
```

### 3.2 Extend Knowledge Graph Types

**Modify:** `scripts/lib/knowledge-graph.mjs`

```javascript
// Line 24 - Add new valid node types:
const VALID_NODE_TYPES = [
  'knowledge_chunk', 'project_knowledge', 'decision_trace',
  'agent_learning', 'entity', 'communication',
  'calendar_event', 'grant', 'finance_item'  // NEW
];

// Line 29 - Add new valid edge types:
const VALID_EDGE_TYPES = [
  'derived_from', 'supports', 'contradicts', 'supersedes',
  'related_to', 'caused_by', 'about', 'decided_in',
  'learned_from', 'context_for',
  'mentioned_in', 'funded_by', 'scheduled_for', 'follows_up'  // NEW
];
```

### 3.3 External Research Agent

**New file:** `scripts/lib/external-research.mjs`

```javascript
// scripts/lib/external-research.mjs
// Researches contacts and organizations using internal data + AI analysis.

import { trackedClaudeCompletion } from './llm-client.mjs';
import { KnowledgeGraph } from './knowledge-graph.mjs';

export class ExternalResearcher {
  constructor(options = {}) {
    this.supabase = options.supabase;
    this.graph = new KnowledgeGraph(options);
  }

  /**
   * Research a contact for ecosystem relevance.
   * Gathers all internal data, then asks AI for analysis.
   */
  async researchContact(contactId) {
    const context = await this.gatherInternalContext(contactId);

    const prompt = `Given this ACT ecosystem contact profile, analyze:
1. Which ACT projects they could contribute to and why
2. Grant opportunities that align with their expertise/interests
3. Other ACT contacts they should be connected with
4. The single best next action for this relationship

Contact: ${context.contact?.full_name || 'Unknown'}
Email: ${context.contact?.email || 'N/A'}
Company: ${context.contact?.company_name || 'N/A'}
Projects: ${JSON.stringify(context.contact?.projects || [])}
Tags: ${JSON.stringify(context.contact?.tags || [])}

Recent communications (${context.communications?.length || 0}):
${(context.communications || []).slice(0, 10).map(c =>
  `- ${c.occurred_at}: ${c.subject} (${c.sentiment}, topics: ${(c.topics||[]).join(',')})`
).join('\n')}

Graph connections: ${JSON.stringify(context.graphNeighbors?.slice(0, 5) || [])}
Episodes: ${JSON.stringify((context.episodes || []).map(e => e.title))}

Return JSON: {
  "project_fit": [{ "code": "ACT-XX", "confidence": 0.8, "reasoning": "..." }],
  "connect_with": [{ "contact_name": "...", "reason": "..." }],
  "next_action": { "action": "...", "urgency": "normal"|"high", "reasoning": "..." },
  "key_interests": ["topic1", "topic2"]
}`;

    const result = await trackedClaudeCompletion(prompt, 'external-research.mjs', {
      model: 'claude-3-5-haiku-20241022',
      maxTokens: 600,
      operation: 'contact-research',
    });

    return JSON.parse(result);
  }

  /**
   * Gather all internal knowledge about a contact.
   */
  async gatherInternalContext(contactId) {
    const [contact, communications, graphNeighbors, episodes] = await Promise.all([
      this.supabase.from('ghl_contacts').select('*').eq('id', contactId).single(),
      this.supabase.from('communications_history')
        .select('subject, summary, sentiment, topics, project_codes, occurred_at')
        .eq('ghl_contact_id', contactId)
        .order('occurred_at', { ascending: false })
        .limit(20),
      this.graph.getNeighbors('entity', contactId, { limit: 10 }),
      this.supabase.from('memory_episodes')
        .select('title, summary, episode_type')
        .contains('entity_ids', [contactId])
        .limit(5),
    ]);

    return {
      contact: contact.data,
      communications: communications.data,
      graphNeighbors,
      episodes: episodes.data,
    };
  }
}
```

### 3.4 Cultural Protocol Guard

**New file:** `scripts/lib/cultural-guard.mjs`

```javascript
// scripts/lib/cultural-guard.mjs
// NEVER syncs, enriches, or shares sacred/culturally sensitive data.

const SACRED_INDICATORS = [
  'sacred', 'ceremony', 'cultural protocol', 'sorry business',
  'men\'s business', 'women\'s business', 'dreaming', 'songline',
  'initiation', 'restricted', 'culturally sensitive',
  'secret sacred', 'traditional knowledge', 'indigenous intellectual property',
];

const NOREPLY_PATTERNS = [
  /^noreply@/i, /^no-reply@/i, /^donotreply@/i, /^do-not-reply@/i,
  /^mailer-daemon@/i, /^postmaster@/i, /^notifications@/i,
  /^automated@/i, /^bounce@/i, /^info@.*\.noreply\./i,
];

export function isCulturallySensitive(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SACRED_INDICATORS.some(indicator => lower.includes(indicator));
}

export function isNoReplyAddress(email) {
  if (!email) return false;
  return NOREPLY_PATTERNS.some(pattern => pattern.test(email));
}

export function filterSensitiveContent(items) {
  return items.filter(item => {
    const text = [item.subject, item.content_preview, item.summary]
      .filter(Boolean).join(' ');
    return !isCulturallySensitive(text);
  });
}
```

### 3.5 Enhanced Insight Generator

**Modify:** `scripts/generate-insights.mjs`

Add Phase 3 generators:

```javascript
// Add to generate-insights.mjs:

import { KnowledgeAligner } from './lib/knowledge-aligner.mjs';
import { ExternalResearcher } from './lib/external-research.mjs';

// 6. Ecosystem signal detector (new in Phase 3)
async function generateEcosystemSignals() {
  // Count topic frequency across different contacts in the last 7 days
  const { data: recentTopics } = await supabase
    .from('communications_history')
    .select('topics, ghl_contact_id, project_codes')
    .gte('occurred_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .not('topics', 'is', null);

  const topicMap = {};
  for (const comm of recentTopics || []) {
    for (const topic of comm.topics || []) {
      if (!topicMap[topic]) topicMap[topic] = new Set();
      if (comm.ghl_contact_id) topicMap[topic].add(comm.ghl_contact_id);
    }
  }

  // Topics mentioned by 3+ different contacts = ecosystem signal
  return Object.entries(topicMap)
    .filter(([_, contacts]) => contacts.size >= 3)
    .map(([topic, contacts]) => ({
      insight_type: 'ecosystem_signal',
      title: `Emerging topic: "${topic}" (${contacts.size} contacts)`,
      description: `Multiple contacts are discussing "${topic}". This may indicate an emerging opportunity.`,
      source_type: 'cross-domain',
      priority: contacts.size >= 5 ? 'high' : 'normal',
      related_ids: { contacts: [...contacts] },
      confidence: 0.7,
    }));
}

// 7. Knowledge alignment insights (new in Phase 3)
async function generateAlignmentInsights() {
  const aligner = new KnowledgeAligner({ supabase });
  const { total, aligned } = await aligner.runAlignment(24);

  // Only generate insight if significant new connections found
  if (aligned >= 3) {
    return [{
      insight_type: 'cross_domain',
      title: `${aligned} new cross-domain connections discovered`,
      description: `Knowledge alignment found ${aligned} connections across ${total} recent items.`,
      source_type: 'knowledge-aligner',
      priority: 'normal',
      confidence: 0.75,
    }];
  }
  return [];
}

// 8. Contact research insights (new in Phase 3, runs less frequently)
async function generateResearchInsights() {
  // Pick 1-2 contacts per run that haven't been researched recently
  const { data: contacts } = await supabase
    .from('ghl_contacts')
    .select('id, full_name, enrichment_status')
    .in('enrichment_status', ['pending', 'basic'])
    .order('last_contact_date', { ascending: false })
    .limit(2);

  const researcher = new ExternalResearcher({ supabase });
  const insights = [];

  for (const contact of contacts || []) {
    const research = await researcher.researchContact(contact.id);

    if (research.next_action?.urgency === 'high') {
      insights.push({
        insight_type: 'contact_suggestion',
        title: `Research insight: ${contact.full_name}`,
        description: research.next_action.reasoning,
        source_type: 'external-research',
        entity_type: 'contact',
        entity_id: contact.id,
        related_ids: {
          projects: research.project_fit?.map(p => p.code) || [],
        },
        confidence: 0.7,
        priority: 'high',
      });
    }

    // Update enrichment status
    await supabase.from('ghl_contacts')
      .update({ enrichment_status: 'enriched' })
      .eq('id', contact.id);
  }

  return insights;
}
```

### 3.6 Intelligence Page

**New file:** `apps/command-center/src/app/intelligence/page.tsx`

A dedicated page with:
- Full intelligence feed with type/priority filters
- Contact suggestion panel (right sidebar)
- Ecosystem signals panel
- Stats: insights generated, acted upon, dismissed

```typescript
'use client';

import { IntelligenceFeed } from '@/components/intelligence-feed';
// Additional sub-components for suggestions, signals, clusters

export default function IntelligencePage() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <header className="mb-8 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Intelligence Center
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Cross-domain insights and knowledge alignment
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <IntelligenceFeed maxItems={30} showFilters={true} />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <ContactSuggestionsPanel />
          <EcosystemSignals />
        </div>
      </div>
    </div>
  );
}
```

**Modify:** `apps/command-center/src/components/top-nav.tsx`

Add "Intelligence" link to the navigation, between "Knowledge" and "Finance":

```typescript
{ name: 'Intelligence', href: '/intelligence', icon: Zap }
```

### Phase 3 File Summary

| Item | File | Action |
|------|------|--------|
| Knowledge aligner module | `scripts/lib/knowledge-aligner.mjs` | CREATE |
| External research module | `scripts/lib/external-research.mjs` | CREATE |
| Cultural guard module | `scripts/lib/cultural-guard.mjs` | CREATE |
| Extend knowledge graph types | `scripts/lib/knowledge-graph.mjs` | MODIFY (add node + edge types) |
| Add ecosystem/research generators | `scripts/generate-insights.mjs` | MODIFY (add 3 generators) |
| Intelligence page | `apps/command-center/src/app/intelligence/page.tsx` | CREATE |
| Navigation update | `apps/command-center/src/components/top-nav.tsx` | MODIFY (add Intelligence link) |

**What the user sees:** A new "Intelligence" page in the nav showing the full intelligence feed with type/priority filters, contact suggestions based on internal research, and ecosystem signals showing emerging topics across contacts.

---

## Testing Strategy

### Phase 1 Testing
1. **Contact auto-creation:** Run `sync-gmail-to-supabase.mjs --dry-run --days 3`. Verify unmatched inbound emails would trigger auto-creation. Then run live with `--days 3`.
2. **No-reply filtering:** Verify no contacts created for `noreply@`, `notifications@`, etc.
3. **Project linking:** Run `enrich-communications.mjs --dry-run --limit 10`. Manually verify AI classifications against known emails.
4. **LLM cost tracking:** After enrichment, run `node scripts/lib/llm-client.mjs costs` and verify all calls are tracked.
5. **Integration events:** Check that `contact.auto_created` and `communication.enriched` events appear in `integration_events`.

### Phase 2 Testing
1. **API:** `curl localhost:3001/api/intelligence/feed` -- verify JSON response structure.
2. **Realtime:** Open Today page, insert test `intelligence_insights` row via Supabase SQL editor, verify it appears in feed within 2 seconds.
3. **Insight generation:** Run `node scripts/generate-insights.mjs --dry-run` and verify output.
4. **Deduplication:** Run generator twice within 1 hour, verify no duplicate insights.

### Phase 3 Testing
1. **Knowledge alignment:** Run alignment, then check `knowledge_edges` for cross-source edges.
2. **Cultural guard:** Test with known sacred content strings -- verify they are filtered and marked as `culturally_protected`.
3. **External research:** `node scripts/lib/external-research.mjs --contact-id {known_id}` and verify the research JSON is reasonable.

---

## Risks and Considerations

1. **AI cost:** Enrichment + insights estimated at ~$2-5/day at current email volume (~100 emails/day). Monitor via `llm-client.mjs costs`.

2. **Contact pollution:** Auto-creation could create contacts from spam/newsletters. Mitigations: no-reply filter, domain blocklist, minimum email length check.

3. **Project linking accuracy:** Start with confidence threshold 0.7. The `reasoning` field enables manual review. Track accuracy via `agent_feedback_records`.

4. **Cultural protocols:** Keyword-based guard is a baseline. Review and expand periodically. Add manual `culturally_protected` flag for edge cases.

5. **Realtime scaling:** `intelligence_insights` fires Realtime for every INSERT. Add TTL cleanup (30 days for dismissed/acted). Use client-side filtering if volume grows.

6. **Enrichment backlog:** First run may have hundreds of unenriched communications. Use `--limit` flag and run in batches over several hours.

---

## Estimated Complexity

| Phase | Effort | New Files | Modified Files | New DB Objects |
|-------|--------|-----------|----------------|----------------|
| Phase 1 | 2-3 days | 4 (3 scripts + 1 migration) | 1 script | 2 tables, 4 columns |
| Phase 2 | 2-3 days | 5 (3 API + 1 component + 1 script) | 2 files | 0 (uses Phase 1 tables) |
| Phase 3 | 3-4 days | 4 (3 modules + 1 page) | 3 files | 0 |
| **Total** | **7-10 days** | **13 files** | **6 files** | **2 tables, 4 columns** |

## Implementation Order

```
Phase 1 (Days 1-3):
  1. supabase/migrations/20260202000000_communication_intelligence.sql
  2. scripts/lib/cultural-guard.mjs (needed by all subsequent modules)
  3. scripts/lib/contact-intelligence.mjs
  4. scripts/lib/project-linker.mjs
  5. scripts/enrich-communications.mjs
  6. Modify scripts/sync-gmail-to-supabase.mjs (auto-create pass)

Phase 2 (Days 4-6):
  7. scripts/generate-insights.mjs
  8. apps/command-center/src/app/api/intelligence/feed/route.ts
  9. apps/command-center/src/app/api/intelligence/feed/[id]/route.ts
  10. apps/command-center/src/app/api/intelligence/suggestions/route.ts
  11. apps/command-center/src/components/intelligence-feed.tsx
  12. Modify apps/command-center/src/lib/api.ts
  13. Modify apps/command-center/src/app/today/page.tsx

Phase 3 (Days 7-10):
  14. scripts/lib/knowledge-aligner.mjs
  15. scripts/lib/external-research.mjs
  16. Modify scripts/lib/knowledge-graph.mjs (extend types)
  17. Extend scripts/generate-insights.mjs (ecosystem + research generators)
  18. apps/command-center/src/app/intelligence/page.tsx
  19. Modify apps/command-center/src/components/top-nav.tsx
```
