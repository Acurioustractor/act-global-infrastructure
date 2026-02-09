-- Goods Content Library: Catalog of Empathy Ledger content with AI analysis
-- Used by newsletter system and goods intelligence bot tool

CREATE TABLE IF NOT EXISTS goods_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  el_id TEXT UNIQUE,
  content_type TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  storyteller_name TEXT,
  url TEXT,
  image_url TEXT,

  -- AI analysis
  topics TEXT[],
  impact_themes TEXT[],
  audience_fit TEXT[],
  key_message TEXT,
  suggested_use TEXT,
  emotional_tone TEXT,

  -- Tracking
  times_used_newsletter INT DEFAULT 0,
  last_used_newsletter_at TIMESTAMPTZ,
  syndicated_to TEXT[],

  -- Metadata
  published_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goods_content_type ON goods_content_library(content_type);
CREATE INDEX IF NOT EXISTS idx_goods_content_audience ON goods_content_library USING GIN(audience_fit);
