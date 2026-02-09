-- Knowledge Graph: Edges between knowledge items and entities
-- Phase 2 of Advanced Memory System

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
  created_by TEXT,
  reasoning TEXT,

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
  WHERE ((ke.source_type = p_node_type AND ke.source_id = p_node_id)
     OR (ke.target_type = p_node_type AND ke.target_id = p_node_id))
    AND ke.strength >= p_min_strength
    AND ke.decay_score > 0.05;

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
    WHERE ((ke1.source_type = p_node_type AND ke1.source_id = p_node_id)
       OR (ke1.target_type = p_node_type AND ke1.target_id = p_node_id))
      AND ke2.strength >= p_min_strength
      AND ke2.decay_score > 0.05
      AND ke2.id NOT IN (
        SELECT ke3.id FROM knowledge_edges ke3
        WHERE (ke3.source_type = p_node_type AND ke3.source_id = p_node_id)
           OR (ke3.target_type = p_node_type AND ke3.target_id = p_node_id)
      )
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql;
