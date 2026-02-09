-- Hybrid Retrieval: Vector + Graph + Decay combined scoring
-- Phase 4 of Advanced Memory System
--
-- Depends on:
--   Phase 1: decay_score columns on knowledge_chunks, project_knowledge
--   Phase 2: knowledge_edges table

CREATE OR REPLACE FUNCTION hybrid_memory_search(
  query_embedding vector(384),
  p_project_code TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_include_episodes BOOLEAN DEFAULT TRUE,
  p_freshness_weight FLOAT DEFAULT 0.2,
  p_graph_weight FLOAT DEFAULT 0.2,
  p_vector_weight FLOAT DEFAULT 0.6,
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
