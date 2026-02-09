# Implementation Plan: Layered Memory System for ACT Ecosystem
Generated: 2026-01-30

## Goal

Add an advanced, human-inspired layered memory system to the ACT ecosystem that enables agents to consolidate knowledge over time, decay stale information, retrieve via hybrid (vector + graph) search, track provenance chains, and maintain working/episodic/procedural memory abstractions. Build on existing infrastructure (knowledge_chunks, project_knowledge, entity graph, decision_traces, agent_learnings) rather than replacing it.

## Existing Infrastructure Analysis (VERIFIED)

### What ACT Already Has

| Guide Concept | ACT Equivalent | Gap |
|---|---|---|
| Raw memory layer | `knowledge_chunks` (vector 384, IVFFlat) | No explicit layering or promotion |
| Structured memory | `project_knowledge` (typed, vector 384) | No link to raw chunks |
| Canonical/semantic | `canonical_entities` + `entity_identifiers` | Entity-only, no knowledge canonicalization |
| Graph structure | `entity_relationships` (works_on, knows, owns, etc.) | Entity-to-entity only; no knowledge-to-knowledge edges |
| Provenance | `decision_traces` (input_context, reasoning, retrieved_context) | Per-decision only; knowledge_chunks lacks provenance |
| Learning from outcomes | `agent_learnings` (pattern, threshold, bound_adjustment) | Bayesian; no consolidation/decay lifecycle |
| Working memory | `conversation_context` (session_id, history, expires_at) | 7-day TTL; chatbot-only; not shared across agents |
| Episodic memory | `communications_history`, `decision_traces` | No episodic abstraction (sequences of events as coherent episodes) |
| Procedural memory | `agent_actions` + `learned_thresholds` | Action registry exists; no learned workflow/procedure storage |
| Hybrid retrieval | `search_project_knowledge()` (vector), `find_potential_duplicates()` (graph) | Separate; never combined in a single query |
| Consolidation | None | NOT PRESENT |
| Decay | `expires_at` on `conversation_context` only | No general decay mechanism |

### Key Architecture Facts
- All scripts are ESM JavaScript (.mjs), NOT Python
- Supabase PostgreSQL with pgvector extension
- Embeddings: vector(384) via all-MiniLM-L6-v2 model
- Embedding caching: `scripts/lib/cache.mjs` (Redis/Upstash with memory fallback)
- LLM client: `scripts/lib/llm-client.mjs` (tracked embeddings/completions)
- Agentic workflow: 3-level bounded autonomy (manual/supervised/autonomous)
- Multi-agent coordination: parent/child proposal DAG via `agent_proposals`

---

## Implementation Phases

### Phase 1: Memory Consolidation & Decay Engine (Highest Value, Lowest Effort)

**Rationale:** The founder explicitly wants the system to "learn from mistakes/outcomes" and wants "data not fresh enough -- needs real-time." Consolidation (promoting repeated/validated knowledge upward) and decay (deprioritizing stale/unvalidated knowledge) directly address both needs. This requires only one new table, one migration, and one script.

**New Database Migration:**
`supabase/migrations/20260131000000_memory_lifecycle.sql`

```sql
-- Memory Lifecycle: Consolidation & Decay
-- Adds lifecycle management to existing knowledge tables

-- 1. Add lifecycle columns to knowledge_chunks (raw memory layer)
ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decay_score FLOAT DEFAULT 1.0 CHECK (decay_score >= 0 AND decay_score <= 1),
  ADD COLUMN IF NOT EXISTS consolidated_into UUID REFERENCES project_knowledge(id),
  ADD COLUMN IF NOT EXISTS provenance JSONB DEFAULT '{}'::jsonb;
  -- provenance: { source_agent: "...", source_session: "...",
  --               derived_from: [uuid...], confidence_at_creation: 0.9 }

-- 2. Add lifecycle columns to project_knowledge (structured memory layer)
ALTER TABLE project_knowledge
  ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decay_score FLOAT DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS consolidation_source_ids UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS provenance JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contradiction_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES project_knowledge(id);

-- 3. Memory consolidation log
CREATE TABLE IF NOT EXISTS memory_consolidation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidation_type TEXT NOT NULL CHECK (consolidation_type IN (
    'promote',      -- Raw chunk promoted to project_knowledge
    'merge',        -- Multiple chunks merged into one
    'strengthen',   -- Existing knowledge reinforced by new evidence
    'contradict',   -- New evidence contradicts existing knowledge
    'supersede',    -- New knowledge replaces old
    'decay',        -- Knowledge decayed below threshold
    'archive'       -- Knowledge archived (not deleted)
  )),
  source_ids UUID[] NOT NULL,          -- What was consolidated from
  target_id UUID,                       -- What was consolidated into
  agent_id TEXT,                        -- Which agent triggered this
  reasoning TEXT,                       -- Why this consolidation happened
  confidence_before FLOAT,
  confidence_after FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Decay function: reduces score based on time and access patterns
CREATE OR REPLACE FUNCTION calculate_decay_score(
  p_last_accessed TIMESTAMPTZ,
  p_access_count INTEGER,
  p_confidence FLOAT,
  p_importance TEXT DEFAULT 'normal'
)
RETURNS FLOAT AS $$
DECLARE
  days_since_access FLOAT;
  base_decay FLOAT;
  importance_multiplier FLOAT;
BEGIN
  days_since_access := EXTRACT(EPOCH FROM (NOW() - COALESCE(p_last_accessed, NOW() - INTERVAL '365 days'))) / 86400.0;

  -- Exponential decay with half-life based on importance
  importance_multiplier := CASE p_importance
    WHEN 'critical' THEN 0.01   -- Almost never decays
    WHEN 'high' THEN 0.05
    WHEN 'normal' THEN 0.1
    WHEN 'low' THEN 0.2
    ELSE 0.1
  END;

  -- Base decay: e^(-lambda * t), boosted by access frequency
  base_decay := EXP(-importance_multiplier * days_since_access / 30.0);

  -- Access count boost (log scale, max 2x)
  base_decay := base_decay * LEAST(2.0, 1.0 + LN(GREATEST(1, p_access_count)) / 5.0);

  -- Confidence floor
  RETURN GREATEST(0.01, LEAST(1.0, base_decay * COALESCE(p_confidence, 0.8)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Batch decay update (run periodically)
CREATE OR REPLACE FUNCTION run_memory_decay()
RETURNS TABLE (updated_chunks INT, updated_knowledge INT, archived INT) AS $$
DECLARE
  v_updated_chunks INT;
  v_updated_knowledge INT;
  v_archived INT;
BEGIN
  -- Update knowledge_chunks decay scores
  UPDATE knowledge_chunks kc
  SET decay_score = calculate_decay_score(
    kc.last_accessed_at, kc.access_count, kc.confidence, 'normal'
  )
  WHERE kc.consolidated_into IS NULL;
  GET DIAGNOSTICS v_updated_chunks = ROW_COUNT;

  -- Update project_knowledge decay scores
  UPDATE project_knowledge pk
  SET decay_score = calculate_decay_score(
    pk.last_accessed_at, pk.access_count,
    CASE pk.importance
      WHEN 'critical' THEN 0.95
      WHEN 'high' THEN 0.85
      ELSE 0.7
    END,
    pk.importance
  )
  WHERE pk.superseded_by IS NULL;
  GET DIAGNOSTICS v_updated_knowledge = ROW_COUNT;

  -- Archive deeply decayed chunks (score < 0.05, not accessed in 90 days)
  -- (Don't delete -- just mark as archived via consolidation log)
  INSERT INTO memory_consolidation_log (consolidation_type, source_ids, reasoning)
  SELECT 'archive', ARRAY[kc.id], 'Decay score below 0.05, not accessed in 90+ days'
  FROM knowledge_chunks kc
  WHERE kc.decay_score < 0.05
    AND kc.last_accessed_at < NOW() - INTERVAL '90 days'
    AND kc.consolidated_into IS NULL;
  GET DIAGNOSTICS v_archived = ROW_COUNT;

  RETURN QUERY SELECT v_updated_chunks, v_updated_knowledge, v_archived;
END;
$$ LANGUAGE plpgsql;

-- 6. Record access (call this when knowledge is retrieved)
CREATE OR REPLACE FUNCTION record_memory_access(p_table TEXT, p_id UUID)
RETURNS VOID AS $$
BEGIN
  IF p_table = 'knowledge_chunks' THEN
    UPDATE knowledge_chunks SET access_count = access_count + 1, last_accessed_at = NOW() WHERE id = p_id;
  ELSIF p_table = 'project_knowledge' THEN
    UPDATE project_knowledge SET access_count = access_count + 1, last_accessed_at = NOW() WHERE id = p_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Indexes for decay queries
CREATE INDEX IF NOT EXISTS idx_kc_decay ON knowledge_chunks(decay_score) WHERE consolidated_into IS NULL;
CREATE INDEX IF NOT EXISTS idx_pk_decay ON project_knowledge(decay_score) WHERE superseded_by IS NULL;
CREATE INDEX IF NOT EXISTS idx_kc_last_accessed ON knowledge_chunks(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_pk_last_accessed ON project_knowledge(last_accessed_at);
```

**New Script:**
`scripts/lib/memory-lifecycle.mjs`

This script wraps the SQL functions and adds the consolidation logic that requires LLM reasoning (determining when multiple chunks should be merged, when evidence strengthens or contradicts existing knowledge).

**Key Methods:**
- `runDecayCycle()` -- Calls `run_memory_decay()` on schedule
- `consolidateChunks(chunkIds)` -- Takes N similar chunks, uses LLM to merge into one project_knowledge entry
- `findConsolidationCandidates()` -- Vector search for near-duplicate chunks that should be merged
- `recordAccess(table, id)` -- Bump access counters on retrieval
- `promoteChunk(chunkId, knowledgeType)` -- Promote a raw chunk to project_knowledge

**Files to create:**
- `supabase/migrations/20260131000000_memory_lifecycle.sql`
- `scripts/lib/memory-lifecycle.mjs`

**Files to modify:**
- `scripts/unified-search.mjs` -- Add `recordAccess()` call when results are returned
- `scripts/lib/agent-learning.mjs` -- Call consolidation after learning cycles

**Acceptance criteria:**
- [ ] Decay scores update correctly based on time/access
- [ ] Near-duplicate knowledge chunks are detected and mergeable
- [ ] Consolidated knowledge has provenance chain back to source chunks
- [ ] Unified search records access to maintain freshness

---

### Phase 2: Knowledge Graph Edges (High Value, Medium Effort)

**Rationale:** ACT has entity-to-entity relationships but no knowledge-to-knowledge or knowledge-to-entity graph edges. This means the system cannot answer "what knowledge relates to this other knowledge" or "what decisions were made about this entity." Adding knowledge graph edges enables graph-traversal retrieval alongside vector search.

**New Database Migration:**
`supabase/migrations/20260131100000_knowledge_graph.sql`

```sql
-- Knowledge Graph: Edges between knowledge items and entities

CREATE TABLE IF NOT EXISTS knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source node (polymorphic)
  source_type TEXT NOT NULL CHECK (source_type IN (
    'knowledge_chunk', 'project_knowledge', 'decision_trace',
    'agent_learning', 'entity', 'communication'
  )),
  source_id UUID NOT NULL,

  -- Target node (polymorphic)
  target_type TEXT NOT NULL CHECK (target_type IN (
    'knowledge_chunk', 'project_knowledge', 'decision_trace',
    'agent_learning', 'entity', 'communication'
  )),
  target_id UUID NOT NULL,

  -- Edge properties
  edge_type TEXT NOT NULL CHECK (edge_type IN (
    'derived_from',    -- Target was source material for source
    'supports',        -- Source evidence supports target claim
    'contradicts',     -- Source contradicts target
    'supersedes',      -- Source replaces target
    'related_to',      -- General semantic relationship
    'caused_by',       -- Causal relationship
    'about',           -- Knowledge is about an entity
    'decided_in',      -- Entity/knowledge was decided in a decision
    'learned_from',    -- Learning derived from this decision/outcome
    'context_for'      -- Provides context for understanding target
  )),

  -- Edge metadata
  strength FLOAT DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  confidence FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  created_by TEXT,              -- 'agent:cultivator', 'system:consolidation', 'human:ben'
  reasoning TEXT,               -- Why this edge was created

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  decay_score FLOAT DEFAULT 1.0,

  -- Prevent duplicate edges
  UNIQUE(source_type, source_id, target_type, target_id, edge_type)
);

-- Indexes for graph traversal
CREATE INDEX IF NOT EXISTS idx_ke_source ON knowledge_edges(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ke_target ON knowledge_edges(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ke_edge_type ON knowledge_edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_ke_strength ON knowledge_edges(strength DESC);

-- Graph traversal: Get all edges for a node (1-hop)
CREATE OR REPLACE FUNCTION get_knowledge_neighbors(
  p_node_type TEXT,
  p_node_id UUID,
  p_edge_types TEXT[] DEFAULT NULL,
  p_min_strength FLOAT DEFAULT 0.0,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  edge_id UUID,
  edge_type TEXT,
  neighbor_type TEXT,
  neighbor_id UUID,
  direction TEXT,
  strength FLOAT,
  confidence FLOAT,
  reasoning TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Outgoing edges
  SELECT ke.id, ke.edge_type, ke.target_type, ke.target_id,
         'outgoing'::TEXT, ke.strength, ke.confidence, ke.reasoning
  FROM knowledge_edges ke
  WHERE ke.source_type = p_node_type AND ke.source_id = p_node_id
    AND ke.strength >= p_min_strength
    AND ke.decay_score > 0.05
    AND (p_edge_types IS NULL OR ke.edge_type = ANY(p_edge_types))
  UNION ALL
  -- Incoming edges
  SELECT ke.id, ke.edge_type, ke.source_type, ke.source_id,
         'incoming'::TEXT, ke.strength, ke.confidence, ke.reasoning
  FROM knowledge_edges ke
  WHERE ke.target_type = p_node_type AND ke.target_id = p_node_id
    AND ke.strength >= p_min_strength
    AND ke.decay_score > 0.05
    AND (p_edge_types IS NULL OR ke.edge_type = ANY(p_edge_types))
  ORDER BY strength DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 2-hop traversal for richer context
CREATE OR REPLACE FUNCTION get_knowledge_subgraph(
  p_node_type TEXT,
  p_node_id UUID,
  p_hops INT DEFAULT 2,
  p_min_strength FLOAT DEFAULT 0.3,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  hop INT,
  edge_id UUID,
  edge_type TEXT,
  from_type TEXT,
  from_id UUID,
  to_type TEXT,
  to_id UUID,
  strength FLOAT
) AS $$
BEGIN
  -- Hop 1
  RETURN QUERY
  SELECT 1, ke.id, ke.edge_type, ke.source_type, ke.source_id,
         ke.target_type, ke.target_id, ke.strength
  FROM knowledge_edges ke
  WHERE (ke.source_type = p_node_type AND ke.source_id = p_node_id)
     OR (ke.target_type = p_node_type AND ke.target_id = p_node_id)
  AND ke.strength >= p_min_strength AND ke.decay_score > 0.05;

  IF p_hops >= 2 THEN
    -- Hop 2: neighbors of neighbors
    RETURN QUERY
    SELECT 2, ke2.id, ke2.edge_type, ke2.source_type, ke2.source_id,
           ke2.target_type, ke2.target_id, ke2.strength
    FROM knowledge_edges ke1
    JOIN knowledge_edges ke2 ON (
      (ke2.source_type = ke1.target_type AND ke2.source_id = ke1.target_id)
      OR (ke2.target_type = ke1.target_type AND ke2.target_id = ke1.target_id)
    )
    WHERE (ke1.source_type = p_node_type AND ke1.source_id = p_node_id)
       OR (ke1.target_type = p_node_type AND ke1.target_id = p_node_id)
    AND ke2.strength >= p_min_strength AND ke2.decay_score > 0.05
    AND ke2.id NOT IN (
      SELECT ke3.id FROM knowledge_edges ke3
      WHERE (ke3.source_type = p_node_type AND ke3.source_id = p_node_id)
         OR (ke3.target_type = p_node_type AND ke3.target_id = p_node_id)
    )
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**New Script:**
`scripts/lib/knowledge-graph.mjs`

**Key Methods:**
- `addEdge(sourceType, sourceId, targetType, targetId, edgeType, metadata)` -- Create a knowledge graph edge
- `getNeighbors(nodeType, nodeId, options)` -- 1-hop graph traversal
- `getSubgraph(nodeType, nodeId, hops)` -- Multi-hop traversal
- `autoLinkDecision(decisionTraceId)` -- After a decision, auto-create edges to entities/knowledge referenced
- `autoLinkKnowledge(projectKnowledgeId)` -- After knowledge creation, find and link related items via vector similarity

**Files to create:**
- `supabase/migrations/20260131100000_knowledge_graph.sql`
- `scripts/lib/knowledge-graph.mjs`

**Files to modify:**
- `scripts/lib/agentic-workflow.mjs` -- After proposal completion, call `autoLinkDecision()` to build graph
- `scripts/unified-search.mjs` -- Add graph-augmented retrieval (see Phase 4)

**Acceptance criteria:**
- [ ] Knowledge edges can be created between any two knowledge/entity nodes
- [ ] 1-hop and 2-hop traversal works correctly
- [ ] Decision traces auto-link to entities and knowledge they reference
- [ ] New project_knowledge items auto-link to related items

---

### Phase 3: Episodic & Working Memory (Medium Value, Medium Effort)

**Rationale:** Working memory gives agents session-aware context. Episodic memory groups related events into coherent "episodes" (e.g., "the ACT-HV grant application process" as a sequence of meetings, decisions, and outcomes). The existing `conversation_context` table is chatbot-only; agents need their own working memory.

**New Database Migration:**
`supabase/migrations/20260131200000_episodic_working_memory.sql`

```sql
-- Episodic Memory: Coherent sequences of related events
CREATE TABLE IF NOT EXISTS memory_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Episode identification
  title TEXT NOT NULL,
  summary TEXT,
  episode_type TEXT NOT NULL CHECK (episode_type IN (
    'project_phase',     -- A phase in a project lifecycle
    'decision_sequence', -- A sequence of related decisions
    'interaction_arc',   -- Arc of interactions with a contact/org
    'incident',          -- Problem/incident and its resolution
    'learning_journey',  -- How the system learned something
    'campaign',          -- Marketing/outreach campaign lifecycle
    'grant_process'      -- Grant application lifecycle
  )),

  -- Scoping
  project_code TEXT,
  entity_ids UUID[],             -- Canonical entities involved

  -- Timeline
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,          -- NULL = ongoing

  -- Content
  key_events JSONB DEFAULT '[]', -- [{timestamp, event_type, description, source_id, source_type}]
  outcome TEXT,                  -- What was the result
  lessons_learned TEXT[],        -- What was learned

  -- Semantic
  embedding vector(384),
  topics TEXT[],

  -- Lifecycle
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  decay_score FLOAT DEFAULT 1.0,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_episodes_project ON memory_episodes(project_code);
CREATE INDEX IF NOT EXISTS idx_episodes_type ON memory_episodes(episode_type);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON memory_episodes(status);
CREATE INDEX IF NOT EXISTS idx_episodes_embedding ON memory_episodes
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS idx_episodes_time ON memory_episodes(started_at DESC);

-- Search episodes semantically
CREATE OR REPLACE FUNCTION search_episodes(
  query_embedding vector(384),
  p_project_code TEXT DEFAULT NULL,
  p_episode_types TEXT[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID, title TEXT, summary TEXT, episode_type TEXT,
  project_code TEXT, started_at TIMESTAMPTZ, status TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT me.id, me.title, me.summary, me.episode_type,
         me.project_code, me.started_at, me.status,
         1 - (me.embedding <=> query_embedding) as similarity
  FROM memory_episodes me
  WHERE me.embedding IS NOT NULL
    AND 1 - (me.embedding <=> query_embedding) > match_threshold
    AND (p_project_code IS NULL OR me.project_code = p_project_code)
    AND (p_episode_types IS NULL OR me.episode_type = ANY(p_episode_types))
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Working Memory: Per-agent session context (replaces chatbot-only conversation_context)
CREATE TABLE IF NOT EXISTS agent_working_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent identification
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,        -- Unique per execution/session

  -- Context window
  active_context JSONB DEFAULT '{}', -- Current focus: {project, entities, goals, constraints}
  retrieved_memories UUID[],         -- IDs of knowledge/episodes retrieved this session
  decisions_made UUID[],             -- Decision trace IDs from this session

  -- Scratchpad (agent's working notes)
  scratchpad JSONB DEFAULT '{}',     -- Agent-specific temp data

  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',

  UNIQUE(agent_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_awm_agent ON agent_working_memory(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_awm_session ON agent_working_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_awm_expiry ON agent_working_memory(expires_at);
```

**New Script:**
`scripts/lib/episodic-memory.mjs`

**Key Methods:**
- `createEpisode(title, type, projectCode, events)` -- Start a new episode
- `addEventToEpisode(episodeId, event)` -- Append event to ongoing episode
- `closeEpisode(episodeId, outcome, lessons)` -- Complete an episode with learnings
- `findRelatedEpisodes(query, options)` -- Semantic search over episodes
- `detectEpisodeBoundaries(projectCode)` -- Use temporal clustering to auto-detect episode boundaries from project_knowledge entries

**New Script:**
`scripts/lib/working-memory.mjs`

**Key Methods:**
- `initSession(agentId, sessionId, context)` -- Create working memory for a session
- `updateContext(agentId, sessionId, updates)` -- Update active context
- `addToScratchpad(agentId, sessionId, key, value)` -- Store working data
- `getSession(agentId, sessionId)` -- Retrieve current working memory
- `cleanupExpired()` -- Remove expired sessions

**Files to create:**
- `supabase/migrations/20260131200000_episodic_working_memory.sql`
- `scripts/lib/episodic-memory.mjs`
- `scripts/lib/working-memory.mjs`

**Files to modify:**
- `scripts/lib/agentic-workflow.mjs` -- Initialize working memory at session start; update during execution

**Acceptance criteria:**
- [ ] Episodes can be created, updated, and searched semantically
- [ ] Agent working memory persists within a session and expires after
- [ ] Auto-detection of episode boundaries from temporal knowledge clusters works
- [ ] Working memory integrates with agentic-workflow session lifecycle

---

### Phase 4: Hybrid Retrieval (Vector + Graph + Decay) (High Value, Medium Effort)

**Rationale:** This is the payoff phase. Combine vector similarity, graph traversal, and decay scores into a single retrieval function that returns the most relevant AND freshest AND most connected knowledge.

**New Database Migration:**
`supabase/migrations/20260131300000_hybrid_retrieval.sql`

```sql
-- Hybrid retrieval: combines vector similarity, graph connectivity, and freshness

CREATE OR REPLACE FUNCTION hybrid_memory_search(
  query_embedding vector(384),
  p_project_code TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,        -- Optional: boost results connected to this entity
  p_include_episodes BOOLEAN DEFAULT TRUE,
  p_freshness_weight FLOAT DEFAULT 0.2,  -- Weight for decay score
  p_graph_weight FLOAT DEFAULT 0.2,      -- Weight for graph connectivity
  p_vector_weight FLOAT DEFAULT 0.6,     -- Weight for vector similarity
  match_threshold FLOAT DEFAULT 0.4,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  source_table TEXT,
  source_id UUID,
  title TEXT,
  content TEXT,
  vector_score FLOAT,
  decay_score FLOAT,
  graph_score FLOAT,
  combined_score FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    -- Project knowledge (structured layer)
    SELECT 'project_knowledge'::TEXT as src, pk.id, pk.title, pk.content,
           (1 - (pk.embedding <=> query_embedding))::FLOAT as vscore,
           COALESCE(pk.decay_score, 1.0)::FLOAT as dscore,
           pk.importance, pk.knowledge_type
    FROM project_knowledge pk
    WHERE pk.embedding IS NOT NULL
      AND pk.superseded_by IS NULL
      AND 1 - (pk.embedding <=> query_embedding) > match_threshold * 0.8
      AND (p_project_code IS NULL OR pk.project_code = p_project_code)

    UNION ALL

    -- Knowledge chunks (raw layer)
    SELECT 'knowledge_chunks'::TEXT, kc.id, NULL, kc.content,
           (1 - (kc.embedding <=> query_embedding))::FLOAT,
           COALESCE(kc.decay_score, 1.0)::FLOAT,
           'normal', kc.source_type
    FROM knowledge_chunks kc
    WHERE kc.embedding IS NOT NULL
      AND kc.consolidated_into IS NULL
      AND 1 - (kc.embedding <=> query_embedding) > match_threshold * 0.8
  ),
  graph_scores AS (
    -- Calculate graph connectivity score for each result
    SELECT vr.id,
           COALESCE(
             (SELECT AVG(ke.strength) FROM knowledge_edges ke
              WHERE (ke.source_id = vr.id OR ke.target_id = vr.id)
                AND ke.decay_score > 0.05
                AND (p_entity_id IS NULL OR ke.source_id = p_entity_id OR ke.target_id = p_entity_id)
             ), 0.0
           )::FLOAT as gscore
    FROM vector_results vr
  )
  SELECT vr.src, vr.id, vr.title, vr.content,
         vr.vscore, vr.dscore,
         COALESCE(gs.gscore, 0.0),
         (vr.vscore * p_vector_weight + vr.dscore * p_freshness_weight + COALESCE(gs.gscore, 0.0) * p_graph_weight)::FLOAT,
         jsonb_build_object(
           'importance', vr.importance,
           'knowledge_type', vr.knowledge_type
         )
  FROM vector_results vr
  LEFT JOIN graph_scores gs ON gs.id = vr.id
  WHERE (vr.vscore * p_vector_weight + vr.dscore * p_freshness_weight + COALESCE(gs.gscore, 0.0) * p_graph_weight) > match_threshold
  ORDER BY (vr.vscore * p_vector_weight + vr.dscore * p_freshness_weight + COALESCE(gs.gscore, 0.0) * p_graph_weight) DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

**Files to modify:**
- `scripts/unified-search.mjs` -- Replace/augment `searchKnowledge()` with `hybrid_memory_search()` call
- `scripts/lib/agentic-workflow.mjs` -- Use hybrid search when agents need context for decisions

**Acceptance criteria:**
- [ ] Single query returns results ranked by combined vector + graph + freshness score
- [ ] Entity-scoped queries boost results connected to that entity in the graph
- [ ] Decayed/stale results are naturally deprioritized
- [ ] Unified search uses hybrid retrieval by default

---

### Phase 5: Procedural Memory (Medium Value, Low Effort)

**Rationale:** ACT already has `agent_actions` (the registry of what agents CAN do) and `agent_learnings` (what agents have learned about thresholds/patterns). Procedural memory adds learned WORKFLOWS -- multi-step procedures that agents discovered work well.

**New Database Migration:**
`supabase/migrations/20260131400000_procedural_memory.sql`

```sql
CREATE TABLE IF NOT EXISTS procedural_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Procedure identification
  procedure_name TEXT NOT NULL UNIQUE,
  description TEXT,
  agent_id TEXT NOT NULL,          -- Which agent owns this procedure

  -- The procedure itself
  steps JSONB NOT NULL,            -- [{step: 1, action: "...", params_template: {...}, conditions: {...}}]
  preconditions JSONB,             -- When to trigger this procedure
  postconditions JSONB,            -- Expected state after completion

  -- Learning metadata
  learned_from_episodes UUID[],    -- Episodes that taught this procedure
  learned_from_decisions UUID[],   -- Decisions that shaped this procedure

  -- Performance
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  success_rate FLOAT GENERATED ALWAYS AS (
    CASE WHEN execution_count > 0 THEN success_count::FLOAT / execution_count ELSE 0 END
  ) STORED,
  avg_duration_ms INTEGER,

  -- Lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'deprecated')),
  version INTEGER DEFAULT 1,
  superseded_by UUID REFERENCES procedural_memory(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_agent ON procedural_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_pm_status ON procedural_memory(status);
CREATE INDEX IF NOT EXISTS idx_pm_name ON procedural_memory(procedure_name);
```

**Files to create:**
- `supabase/migrations/20260131400000_procedural_memory.sql`
- `scripts/lib/procedural-memory.mjs`

**Files to modify:**
- `scripts/lib/agent-learning.mjs` -- After learning cycle, check if learnings suggest a procedure

**Acceptance criteria:**
- [ ] Multi-step procedures can be stored with pre/post conditions
- [ ] Execution tracking updates success rates
- [ ] Procedures can be versioned (superseded_by chain)

---

## Testing Strategy

1. **Unit tests** for each new script (`scripts/lib/memory-lifecycle.mjs`, `knowledge-graph.mjs`, etc.)
   - Test decay calculation with known inputs
   - Test graph traversal with mock data
   - Test hybrid scoring formula
2. **Integration tests** against Supabase
   - Create test data in knowledge_chunks and project_knowledge
   - Run consolidation and verify provenance chains
   - Run hybrid search and verify ranking order
3. **Regression tests** for modified files
   - Ensure existing unified-search still works with new access tracking
   - Ensure agentic-workflow proposal flow unchanged

Location: `tests/memory-system/`

---

## Risks & Considerations

1. **Performance**: Hybrid retrieval joins across multiple tables. The graph_scores CTE may be slow with many edges. Mitigate with `strength` and `decay_score` filters and limits on the sub-query.
2. **Embedding consistency**: All tables use vector(384) with all-MiniLM-L6-v2. Must ensure new episode embeddings use the same model via `cachedEmbedding()`.
3. **Migration safety**: All migrations use `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` to be idempotent. No destructive changes to existing tables.
4. **Decay tuning**: The exponential decay parameters (half-lives per importance level) are initial guesses. Should be tuned based on actual usage patterns. Consider making them configurable via a settings table.
5. **Graph explosion**: Auto-linking could create too many edges. Apply minimum confidence threshold (0.5) for auto-created edges.

---

## Estimated Complexity

| Phase | New Tables | New Scripts | Modified Files | Effort | Value |
|-------|-----------|-------------|---------------|--------|-------|
| 1. Consolidation & Decay | 1 | 1 | 2 | ~2 days | High |
| 2. Knowledge Graph | 1 | 1 | 2 | ~2 days | High |
| 3. Episodic & Working Memory | 2 | 2 | 1 | ~3 days | Medium |
| 4. Hybrid Retrieval | 0 (function only) | 0 | 2 | ~1 day | High |
| 5. Procedural Memory | 1 | 1 | 1 | ~1 day | Medium |
| **Total** | **5 new tables** | **5 new scripts** | **4 modified** | **~9 days** | |

## Priority Recommendation

**Start with Phase 1 + 2 together** (4 days). These provide the foundation (lifecycle management + graph structure) that Phase 4 (hybrid retrieval) depends on. Then Phase 4 (1 day) delivers the most visible improvement to agent intelligence. Phases 3 and 5 can follow as refinements.

**Critical path:** Phase 1 -> Phase 2 -> Phase 4 (6 days for the core system)
**Nice-to-have:** Phase 3, Phase 5 (4 days, can be done in parallel after Phase 2)

---

## Integration Points Summary

```
scripts/lib/memory-lifecycle.mjs     <-- NEW (Phase 1)
  calls: run_memory_decay(), calculate_decay_score()
  uses: cachedEmbedding() from cache.mjs
  used by: unified-search.mjs, agent-learning.mjs

scripts/lib/knowledge-graph.mjs      <-- NEW (Phase 2)
  calls: get_knowledge_neighbors(), get_knowledge_subgraph()
  used by: unified-search.mjs, agentic-workflow.mjs

scripts/lib/episodic-memory.mjs      <-- NEW (Phase 3)
  calls: search_episodes()
  uses: cachedEmbedding() from cache.mjs

scripts/lib/working-memory.mjs       <-- NEW (Phase 3)
  used by: agentic-workflow.mjs

scripts/lib/procedural-memory.mjs    <-- NEW (Phase 5)
  used by: agent-learning.mjs

scripts/unified-search.mjs           <-- MODIFY (Phase 1, 4)
  add: recordAccess() on retrieval
  add: hybrid_memory_search() as primary retrieval

scripts/lib/agentic-workflow.mjs     <-- MODIFY (Phase 2, 3)
  add: autoLinkDecision() after proposal completion
  add: working memory init/update in session lifecycle

scripts/lib/agent-learning.mjs       <-- MODIFY (Phase 1, 5)
  add: consolidation trigger after learning cycles
  add: procedural memory extraction from repeated patterns
```
