-- Memory Lifecycle: Consolidation & Decay
-- Adds lifecycle management to existing knowledge tables
-- Phase 1 of Advanced Memory System

-- 1. Add lifecycle columns to knowledge_chunks (raw memory layer)
ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decay_score FLOAT DEFAULT 1.0 CHECK (decay_score >= 0 AND decay_score <= 1),
  ADD COLUMN IF NOT EXISTS consolidated_into UUID REFERENCES project_knowledge(id),
  ADD COLUMN IF NOT EXISTS provenance JSONB DEFAULT '{}'::jsonb;

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
  source_ids UUID[] NOT NULL,
  target_id UUID,
  agent_id TEXT,
  reasoning TEXT,
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
