-- Fix knowledge_chunks embedding dimensions
-- Change from 1536 (OpenAI ada-002) to 384 (all-MiniLM-L6-v2)
-- All embeddings are currently NULL so this is a non-destructive change

-- Drop the existing column and recreate with new dimensions
ALTER TABLE knowledge_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE knowledge_chunks ADD COLUMN embedding VECTOR(384);

-- Recreate the vector index
DROP INDEX IF EXISTS idx_knowledge_chunks_embedding;
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

COMMENT ON COLUMN knowledge_chunks.embedding IS '384-dimensional embedding from all-MiniLM-L6-v2 model';
