# Unified Storyteller Analysis System
## The World's Best Storyteller-Led Impact Platform

**Date**: January 11, 2026
**Vision**: One analysis per storyteller → feeds everything → searchable by world/org/project
**Mission**: Storyteller-owned impact measurement for global social change

---

## 🎯 Core Vision

**"One Analysis, Infinite Insights"**

Every storyteller gets ONE comprehensive AI analysis of their transcripts that:
1. **Happens once** per storyteller (re-triggered only when new content added)
2. **Belongs to the storyteller** (private by default, shareable by choice)
3. **Feeds everything** (organization stats, project reports, global impact)
4. **Searchable everywhere** (RAG/wiki system across all data)
5. **Rolls up naturally** (storyteller → project → organization → world)

---

## 🏗️ System Architecture

### Level 1: STORYTELLER ANALYSIS (Foundation - Happens Once)

**Input**: All transcripts for one storyteller
**Process**: Best-in-class AI analysis
**Output**: Comprehensive storyteller profile

```
storyteller_master_analysis (NEW TABLE)
├── id (uuid, PK)
├── storyteller_id (uuid, FK → storytellers, UNIQUE)
├── tenant_id (uuid) -- Privacy isolation
├── analysis_version (text) -- "v1-claude-opus-4.5-20250111"
├── analyzed_at (timestamptz)
├── transcript_count (integer)
├── total_content_length (integer)
│
├── extracted_themes (jsonb) -- All themes with frequency, confidence
│   └── [
│         {
│           "theme": "Intergenerational Wisdom",
│           "category": "cultural",
│           "frequency": 15,
│           "confidence": 0.92,
│           "context_quotes": ["quote1", "quote2"],
│           "related_themes": ["Land Connection", "Elder Knowledge"]
│         }
│       ]
│
├── extracted_quotes (jsonb) -- Best quotes with context
│   └── [
│         {
│           "quote": "Text of quote",
│           "context": "What was being discussed",
│           "themes": ["theme1", "theme2"],
│           "impact_score": 0.85,
│           "sentiment": "positive",
│           "transcript_id": "uuid"
│         }
│       ]
│
├── cultural_markers (jsonb) -- Indigenous/cultural knowledge
│   └── {
│         "languages_mentioned": ["Wiradjuri", "English"],
│         "places_of_significance": ["Murray River", "Country"],
│         "ceremonies_practices": ["Smoking ceremony"],
│         "kinship_connections": ["Grandmother's line"],
│         "cultural_protocols": ["Permission for land entry"]
│       }
│
├── impact_dimensions (jsonb) -- ALMA-aligned outcomes
│   └── {
│         "individual": {
│           "healing": 0.78,
│           "empowerment": 0.85,
│           "identity": 0.92
│         },
│         "community": {
│           "connection": 0.88,
│           "capability": 0.75,
│           "sovereignty": 0.82
│         },
│         "environmental": {
│           "land_connection": 0.95,
│           "sustainable_practice": 0.70
│         }
│       }
│
├── knowledge_contributions (jsonb) -- What they shared with world
│   └── {
│         "traditional_knowledge": ["Fishing techniques", "Plant medicine"],
│         "lived_experience": ["Resilience", "Community healing"],
│         "innovations": ["Youth engagement model"],
│         "warnings": ["Cultural appropriation risks"]
│       }
│
├── sentiment_analysis (jsonb)
│   └── {
│         "overall_sentiment": 0.65,
│         "emotional_journey": ["struggle", "breakthrough", "hope"],
│         "tone": "reflective and hopeful"
│       }
│
├── network_data (jsonb) -- Who they mention, connect to
│   └── {
│         "mentioned_people": ["Elder Grace", "Youth leader Jason"],
│         "organizations": ["Land Council", "Health Service"],
│         "places": ["Community center", "Sacred site"],
│         "connections_strength": 0.82
│       }
│
├── embedding (vector(1536)) -- For RAG semantic search
├── processing_metadata (jsonb)
│   └── {
│         "model": "claude-opus-4.5",
│         "cost": 2.45,
│         "duration_ms": 45000,
│         "tokens_input": 125000,
│         "tokens_output": 8500
│       }
│
├── storyteller_consent (jsonb) -- What they allow
│   └── {
│         "share_themes_publicly": true,
│         "share_quotes_org_only": true,
│         "allow_global_aggregation": true,
│         "allow_project_attribution": true,
│         "allow_ai_training": false
│       }
│
├── privacy_level (text) -- "private", "organization", "public"
├── is_featured (boolean) -- Showcase this story globally
├── quality_score (numeric) -- 0.0-1.0
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

**Indexes:**
```sql
CREATE INDEX idx_stm_analysis_storyteller ON storyteller_master_analysis(storyteller_id);
CREATE INDEX idx_stm_analysis_embedding ON storyteller_master_analysis USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_stm_analysis_privacy ON storyteller_master_analysis(privacy_level);
CREATE INDEX idx_stm_analysis_themes ON storyteller_master_analysis USING gin(extracted_themes);
CREATE INDEX idx_stm_analysis_quality ON storyteller_master_analysis(quality_score DESC);
```

---

### Level 2: PROJECT AGGREGATION (Roll-up from Storytellers)

**Input**: All storyteller analyses in a project
**Process**: Aggregate + synthesize patterns
**Output**: Project impact report

```
project_impact_analysis (REPLACES project_analyses)
├── id (uuid, PK)
├── project_id (uuid, FK → projects, UNIQUE per version)
├── organization_id (uuid, FK → organizations)
├── analysis_version (text)
├── analyzed_at (timestamptz)
│
├── storyteller_count (integer)
├── transcript_count (integer)
├── storyteller_ids (uuid[]) -- Who contributed
│
├── aggregated_themes (jsonb) -- Rolled up from storyteller analyses
│   └── [
│         {
│           "theme": "Community Healing",
│           "storyteller_count": 12,
│           "total_mentions": 45,
│           "avg_confidence": 0.87,
│           "storytellers": ["uuid1", "uuid2", ...],
│           "representative_quotes": ["quote1", "quote2"]
│         }
│       ]
│
├── project_outcomes (jsonb) -- Custom project outcomes
│   └── {
│         "outcome_name": "Sleep Quality Improvement",
│         "evidence_count": 25,
│         "storyteller_count": 11,
│         "confidence": 0.78,
│         "supporting_quotes": [...],
│         "trend": "improving"
│       }
│
├── cultural_impact (jsonb) -- Cultural-specific outcomes
├── social_impact (jsonb) -- Social Return on Investment metrics
├── knowledge_generated (jsonb) -- New knowledge this project created
├── network_analysis (jsonb) -- Connection patterns between storytellers
├── geographic_spread (jsonb) -- Places, regions affected
├── demographic_insights (jsonb) -- Age, gender, culture breakdown
│
├── executive_summary (text) -- AI-generated summary
├── key_insights (text[]) -- Top 5-10 insights
├── recommendations (text[]) -- What to do next
│
├── embedding (vector(1536)) -- For project search
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

---

### Level 3: ORGANIZATION INTELLIGENCE (All Projects)

**Input**: All project analyses + all storyteller analyses in org
**Process**: Organization-wide patterns and impact
**Output**: Organization impact dashboard

```
organization_impact_intelligence (REPLACES organization_analytics)
├── id (uuid, PK)
├── organization_id (uuid, FK → organizations, UNIQUE per version)
├── analysis_version (text)
├── analyzed_at (timestamptz)
│
├── total_storytellers (integer)
├── total_projects (integer)
├── total_transcripts (integer)
├── geographic_reach (jsonb) -- All places served
│
├── master_theme_taxonomy (jsonb) -- All themes across all projects
├── signature_strengths (jsonb) -- What this org is known for
├── cross_project_patterns (jsonb) -- Insights spanning projects
├── cultural_footprint (jsonb) -- Cultural groups, languages, protocols
├── cumulative_impact (jsonb) -- Total impact across all work
│
├── storyteller_network (jsonb) -- Community connections
├── knowledge_repository (jsonb) -- All knowledge contributed
├── innovation_index (jsonb) -- Novel approaches, learnings
│
├── funder_report_data (jsonb) -- Ready for grant reports
├── sroi_calculation (jsonb) -- Social Return on Investment
│
├── embedding (vector(1536))
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

---

### Level 4: GLOBAL INTELLIGENCE (World Impact)

**Input**: All organization analyses
**Process**: Global patterns, cross-cultural insights
**Output**: World Tour impact map

```
global_impact_intelligence (NEW TABLE)
├── id (uuid, PK)
├── analysis_date (date, UNIQUE) -- Daily/weekly/monthly snapshots
├── version (text)
│
├── total_organizations (integer)
├── total_storytellers (integer)
├── total_stories_shared (integer)
├── countries_reached (text[])
├── languages_preserved (text[])
├── cultural_groups (text[])
│
├── global_themes (jsonb) -- Universal human themes
│   └── [
│         {
│           "theme": "Intergenerational Wisdom",
│           "org_count": 45,
│           "storyteller_count": 892,
│           "geographic_spread": ["Australia", "Canada", "USA"],
│           "cultural_contexts": ["Indigenous", "Migrant", "Elder"]
│         }
│       ]
│
├── cross_cultural_insights (jsonb) -- What transcends culture
├── regional_patterns (jsonb) -- By continent, country, region
├── impact_by_dimension (jsonb) -- ALMA dimensions globally
│
├── world_tour_insights (jsonb) -- For July 2026 tour
│   └── {
│         "country_impact_stories": [...],
│         "local_heroes": [...],
│         "cultural_exchange_opportunities": [...],
│         "partnership_potential": [...]
│       }
│
├── platform_health (jsonb) -- Platform usage, engagement
├── embedding (vector(1536))
└── created_at (timestamptz)
```

---

## 🔍 RAG/Wiki Search System

### Universal Search Table

```
empathy_ledger_knowledge_base (NEW TABLE)
├── id (uuid, PK)
├── content_type (text) -- "storyteller_analysis", "project_report", etc.
├── source_id (uuid) -- FK to source table
├── source_table (text) -- Which table it came from
│
├── title (text) -- Searchable title
├── summary (text) -- AI-generated summary
├── content (text) -- Full searchable content
├── metadata (jsonb) -- All structured data from source
│
├── themes (text[]) -- Extracted themes
├── entities (jsonb) -- People, places, organizations mentioned
├── keywords (text[]) -- Search keywords
│
├── privacy_level (text) -- "private", "organization", "public"
├── owner_id (uuid) -- Storyteller who owns this
├── organization_id (uuid) -- Which org (if applicable)
├── tenant_id (uuid) -- Multi-tenant isolation
│
├── embedding (vector(1536)) -- Semantic search
├── search_vector (tsvector) -- Full-text search
│
├── view_count (integer) -- Usage tracking
├── last_accessed (timestamptz)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

**Indexes:**
```sql
CREATE INDEX idx_kb_embedding ON empathy_ledger_knowledge_base
  USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_kb_search ON empathy_ledger_knowledge_base
  USING gin(search_vector);
CREATE INDEX idx_kb_themes ON empathy_ledger_knowledge_base
  USING gin(themes);
CREATE INDEX idx_kb_privacy ON empathy_ledger_knowledge_base(privacy_level, owner_id);
CREATE INDEX idx_kb_org ON empathy_ledger_knowledge_base(organization_id);
```

### Search API

```sql
-- Semantic search across everything (respecting privacy)
CREATE FUNCTION search_empathy_knowledge(
  query_text text,
  query_embedding vector(1536),
  user_id uuid,
  search_scope text DEFAULT 'accessible', -- 'owned', 'organization', 'public', 'accessible'
  limit_results integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  relevance_score float,
  content_type text,
  source_url text
);

-- Hybrid search: semantic + keyword
CREATE FUNCTION hybrid_search_knowledge(
  query_text text,
  query_embedding vector(1536),
  user_id uuid,
  semantic_weight float DEFAULT 0.7,
  keyword_weight float DEFAULT 0.3
)
RETURNS TABLE (...);

-- Faceted search: filter by themes, org, time, etc.
CREATE FUNCTION faceted_search_knowledge(
  filters jsonb,
  user_id uuid
)
RETURNS TABLE (...);
```

---

## 🔒 Privacy-First Architecture

### Privacy Rules

```sql
-- RLS Policy: Storytellers own their analysis
CREATE POLICY "Storytellers view own analysis"
  ON storyteller_master_analysis
  FOR SELECT
  TO authenticated
  USING (
    storyteller_id IN (
      SELECT id FROM storytellers WHERE profile_id = auth.uid()
    )
    OR privacy_level = 'public'
    OR (
      privacy_level = 'organization'
      AND tenant_id IN (
        SELECT tenant_id FROM organization_members WHERE profile_id = auth.uid()
      )
    )
  );

-- Knowledge base privacy
CREATE POLICY "Privacy-aware knowledge search"
  ON empathy_ledger_knowledge_base
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() -- Own content
    OR privacy_level = 'public' -- Public content
    OR (
      privacy_level = 'organization'
      AND organization_id IN (
        SELECT organization_id FROM organization_members WHERE profile_id = auth.uid()
      )
    )
  );
```

### Consent Management

```
storyteller_analysis_consent (NEW TABLE)
├── storyteller_id (uuid, PK)
├── share_analysis_publicly (boolean) DEFAULT false
├── share_analysis_with_org (boolean) DEFAULT true
├── share_quotes_publicly (boolean) DEFAULT false
├── share_themes_publicly (boolean) DEFAULT true
├── allow_global_aggregation (boolean) DEFAULT true
├── allow_project_reports (boolean) DEFAULT true
├── allow_funder_reports (boolean) DEFAULT true
├── allow_world_tour_inclusion (boolean) DEFAULT false
├── require_attribution (boolean) DEFAULT true
├── updated_at (timestamptz)
└── updated_by (uuid)
```

---

## 🤖 AI Processing Pipeline

### One-Time Storyteller Analysis

```typescript
async function analyzeStoryteller(storytellerId: uuid) {
  // 1. Gather all transcripts
  const transcripts = await getStorytellerTranscripts(storytellerId);

  // 2. Run comprehensive AI analysis (Claude Opus 4.5)
  const analysis = await claudeOpus4_5.analyze({
    transcripts,
    instructions: `
      You are analyzing transcripts from an Indigenous storyteller for the Empathy Ledger platform.
      Extract:
      1. Themes (cultural, personal, community, environmental)
      2. Powerful quotes with context
      3. Cultural markers (languages, places, ceremonies, protocols)
      4. Impact dimensions (individual, community, environmental)
      5. Knowledge contributions (traditional knowledge, lived experience, innovations)
      6. Sentiment and emotional journey
      7. Network connections (people, places, organizations)

      Output must be structured JSON following the schema.
      Prioritize cultural safety and respect Indigenous knowledge sovereignty.
    `
  });

  // 3. Generate embedding for RAG
  const embedding = await generateEmbedding(
    `${analysis.themes.join(' ')} ${analysis.quotes.join(' ')}`
  );

  // 4. Store in storyteller_master_analysis
  await db.insert('storyteller_master_analysis', {
    storyteller_id: storytellerId,
    ...analysis,
    embedding,
    analyzed_at: new Date()
  });

  // 5. Populate knowledge base
  await populateKnowledgeBase(storytellerId, analysis);

  // 6. Trigger aggregation updates
  await updateProjectAnalyses(storytellerId);
  await updateOrganizationIntelligence(storytellerId);
  await updateGlobalIntelligence();
}
```

### Incremental Updates

```typescript
async function updateStorytellerAnalysis(storytellerId: uuid) {
  // Check if new transcripts added since last analysis
  const lastAnalysis = await getLastAnalysis(storytellerId);
  const newTranscripts = await getTranscriptsSince(storytellerId, lastAnalysis.analyzed_at);

  if (newTranscripts.length === 0) {
    return { message: 'No new content to analyze' };
  }

  // Re-run full analysis with all transcripts (ensures coherence)
  await analyzeStoryteller(storytellerId);
}
```

---

## 📊 Impact Hierarchy Queries

### World → Organization → Project → Storyteller

```sql
-- Global impact summary
SELECT
  COUNT(DISTINCT organization_id) as orgs,
  COUNT(DISTINCT storyteller_id) as storytellers,
  jsonb_agg(DISTINCT themes) as all_themes
FROM empathy_ledger_knowledge_base
WHERE privacy_level IN ('public', 'organization')
  AND content_type = 'storyteller_analysis';

-- Organization drill-down
SELECT
  oii.*,
  json_agg(pia.*) as projects,
  COUNT(DISTINCT sma.storyteller_id) as storyteller_count
FROM organization_impact_intelligence oii
LEFT JOIN project_impact_analysis pia ON pia.organization_id = oii.organization_id
LEFT JOIN storyteller_master_analysis sma ON sma.tenant_id = oii.organization_id
WHERE oii.organization_id = $1
GROUP BY oii.id;

-- Project drill-down
SELECT
  pia.*,
  json_agg(sma.*) as storyteller_analyses
FROM project_impact_analysis pia
LEFT JOIN unnest(pia.storyteller_ids) stid ON true
LEFT JOIN storyteller_master_analysis sma ON sma.storyteller_id = stid
WHERE pia.project_id = $1
GROUP BY pia.id;

-- Storyteller view (privacy-aware)
SELECT sma.*
FROM storyteller_master_analysis sma
WHERE sma.storyteller_id = $1
  AND (
    sma.storyteller_id IN (SELECT id FROM storytellers WHERE profile_id = auth.uid())
    OR sma.privacy_level = 'public'
  );
```

---

## 🌍 World Tour Integration (July 2026)

### World Tour Dashboard

```sql
-- Impact by country for world tour
SELECT
  country,
  COUNT(DISTINCT organization_id) as organizations,
  COUNT(DISTINCT storyteller_id) as storytellers,
  jsonb_agg(DISTINCT signature_theme) as key_themes,
  json_agg(featured_story) as showcase_stories
FROM (
  SELECT
    oii.organization_id,
    o.country,
    sma.storyteller_id,
    theme_name as signature_theme,
    CASE WHEN sma.is_featured THEN sma.id END as featured_story
  FROM organization_impact_intelligence oii
  JOIN organizations o ON o.id = oii.organization_id
  JOIN storyteller_master_analysis sma ON sma.tenant_id = o.id
  CROSS JOIN LATERAL jsonb_array_elements_text(sma.extracted_themes) as theme_name
  WHERE sma.privacy_level = 'public'
    AND sma.storyteller_consent->>'allow_world_tour_inclusion' = 'true'
) sub
GROUP BY country
ORDER BY storytellers DESC;
```

---

## 🎯 ALMA Integration Framework

### ALMA Dimensions Mapping

```jsonb
{
  "ALMA_dimensions": {
    "individual_wellbeing": {
      "healing": "Extract from impact_dimensions->individual->healing",
      "identity": "Extract from cultural_markers + impact_dimensions",
      "empowerment": "Extract from knowledge_contributions",
      "connection": "Extract from network_data"
    },
    "community_strength": {
      "capability": "Extract from impact_dimensions->community->capability",
      "sovereignty": "Extract from cultural_markers + cultural_protocols",
      "resilience": "Extract from sentiment_analysis + themes",
      "collaboration": "Extract from network_data"
    },
    "environmental_care": {
      "land_connection": "Extract from cultural_markers + themes",
      "sustainable_practice": "Extract from knowledge_contributions",
      "biodiversity": "Extract from environmental themes",
      "regeneration": "Extract from impact stories"
    },
    "economic_justice": {
      "employment": "Extract from project_outcomes",
      "enterprise": "Extract from innovations",
      "resource_access": "Extract from impact dimensions",
      "financial_wellbeing": "Extract from SROI data"
    }
  }
}
```

### Curator Tractor Integration (Future)

```
ALMA_curator_annotations (NEW TABLE - Future)
├── analysis_id (uuid, FK → storyteller_master_analysis)
├── curator_id (uuid, FK → profiles)
├── ALMA_dimension (text) -- Which dimension being assessed
├── human_rating (numeric) -- Curator's assessment (0-1)
├── ai_rating (numeric) -- AI's assessment (0-1)
├── variance_explanation (text) -- Why human/AI differ
├── cultural_context_notes (text) -- Curator's cultural insights
├── improvement_suggestions (text[]) -- How to improve AI
├── validated_at (timestamptz)
└── validation_confidence (numeric)
```

**Curator Workflow:**
1. AI analyzes storyteller transcript → generates ALMA scores
2. Curator reviews AI analysis
3. Curator adjusts scores based on cultural understanding
4. System learns from variance between AI and curator
5. Future AI analyses improve based on curator feedback

---

## 🚀 Implementation Roadmap

### Phase 1: Core Analysis System (Weeks 1-2)
- [ ] Create `storyteller_master_analysis` table
- [ ] Build AI analysis pipeline (Claude Opus 4.5)
- [ ] Migrate existing data from `project_analyses` → new structure
- [ ] Test on 10 storytellers, validate quality

### Phase 2: RAG/Wiki Search (Weeks 3-4)
- [ ] Create `empathy_ledger_knowledge_base` table
- [ ] Build semantic search API
- [ ] Create search UI components
- [ ] Test search quality and relevance

### Phase 3: Privacy & Consent (Week 5)
- [ ] Build `storyteller_analysis_consent` system
- [ ] Implement RLS policies
- [ ] Create consent management UI
- [ ] Audit privacy compliance

### Phase 4: Aggregation Layers (Weeks 6-7)
- [ ] Build project aggregation from storyteller analyses
- [ ] Build organization intelligence rollup
- [ ] Build global intelligence system
- [ ] Create hierarchy queries

### Phase 5: World Tour Prep (Week 8)
- [ ] Build world tour dashboard
- [ ] Create country-level impact reports
- [ ] Design storyteller showcase features
- [ ] Test with sample organizations

### Phase 6: ALMA Integration (Future - Post July 2026)
- [ ] Map ALMA dimensions to analysis data
- [ ] Build curator tractor interface
- [ ] Train AI on curator feedback
- [ ] Launch ALMA-aligned impact reports

---

## 🎨 User Experience

### Storyteller View
1. **My Analysis** - View your comprehensive analysis
2. **My Impact** - See how your story contributes to projects/org/world
3. **Privacy Settings** - Control who sees what
4. **Sharing** - Generate embeddable impact cards

### Organization Admin View
1. **Organization Intelligence** - All storytellers, all projects
2. **Project Reports** - Per-project impact analysis
3. **Funder Reports** - Export for grant applications
4. **Search Knowledge** - Find themes, quotes, insights across org

### World Tour View (Public)
1. **Global Impact Map** - Interactive world map
2. **Country Spotlights** - Impact by country
3. **Featured Storytellers** - Showcase stories
4. **Theme Explorer** - Universal human themes

---

## 📈 Success Metrics

### Technical Excellence
- [ ] < 2 second search response time
- [ ] > 95% search relevance (user feedback)
- [ ] < $5 per storyteller analysis cost
- [ ] 100% privacy compliance (audit)

### Impact Measurement
- [ ] Every storyteller has master analysis
- [ ] Every project has impact report
- [ ] Every organization has intelligence dashboard
- [ ] Global dashboard updated daily

### World Tour Ready (July 2026)
- [ ] 50+ countries represented
- [ ] 500+ storytellers analyzed
- [ ] 100+ organizations showcased
- [ ] 10,000+ searchable insights

---

## 🌟 The Vision Realized

**By July 2026**, Empathy Ledger will be:

1. **The world's best storyteller-led impact platform**
   - Every storyteller owns their analysis
   - One source of truth, infinitely searchable
   - Privacy-first, consent-driven

2. **A living wiki of human resilience**
   - RAG search across all knowledge
   - Cultural wisdom preserved and accessible
   - Universal themes discovered

3. **An impact measurement revolution**
   - Storyteller → Project → Organization → World
   - ALMA-aligned, culturally grounded
   - Curator-enhanced AI learning

4. **A tool for global change**
   - World tour ready with country-level insights
   - Organization-specific impact reports
   - Funder-ready documentation

---

**Next Step**: Review this architecture and confirm:
1. Does this capture your vision?
2. Any additions/changes needed?
3. Ready to start Phase 1 implementation?
