-- Daily Reflections: LCAA-framed end-of-day reflection practice
-- Stores voice/text reflections enriched with day activity data

CREATE TABLE daily_reflections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  reflection_date DATE NOT NULL,

  -- Voice transcript (raw user input)
  voice_transcript TEXT,

  -- LCAA synthesis (AI-generated from transcript + data)
  lcaa_listen TEXT,
  lcaa_curiosity TEXT,
  lcaa_action TEXT,
  lcaa_art TEXT,
  loop_to_tomorrow TEXT,

  -- Personal sections
  gratitude TEXT[],
  challenges TEXT[],
  learnings TEXT[],
  intentions TEXT[],

  -- Enrichment data snapshot
  day_stats JSONB,  -- {meetings: N, communications: N, knowledge_entries: N}

  -- Semantic search
  embedding vector(384),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(chat_id, reflection_date)
);

CREATE INDEX idx_reflections_date ON daily_reflections(reflection_date DESC);
CREATE INDEX idx_reflections_chat ON daily_reflections(chat_id, reflection_date DESC);
