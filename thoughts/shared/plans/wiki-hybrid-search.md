# Plan: Wiki Hybrid Search (BM25 + Vector + RRF)

> Slug: `wiki-hybrid-search`
> Created: 2026-04-13
> Status: draft
> Owner: ben

## Objective

Replace Tractorpedia's naive substring search with a hybrid system combining Postgres full-text search (BM25-equivalent) and pgvector semantic search, fused via Reciprocal Rank Fusion. 268 articles, ~890 words avg — small enough to embed whole articles (no chunking needed).

## Task Ledger

- [ ] Phase 1: Migration SQL — create `wiki_search_index` table + RPC functions
- [ ] Phase 2: Indexing script — `scripts/wiki-index-search.mjs`
- [ ] Phase 3: Search API — update `/api/wiki/search` route
- [ ] Phase 4: Client integration — HTML viewer + Command Center
- [ ] Phase 5: CI hook — run indexer after wiki rebuild

## Decision Log

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-04-13 | New table, not reuse `project_knowledge` | PK is project-scoped catch-all with different lifecycle. Wiki index is a derived cache that can be rebuilt from files at any time. Clean separation. | Yes |
| 2026-04-13 | Whole-article embeddings, no chunking | Avg 890 words/article fits within 8K token embedding window. Eliminates chunk boundary issues and keeps the system simple. Revisit if articles grow past ~2000 words regularly. | Yes |
| 2026-04-13 | 384-dim `text-embedding-3-small` | Matches existing `project_knowledge` pattern. Cheap, fast, good enough for 268 docs. | Yes |
| 2026-04-13 | RRF over learned fusion | RRF (k=60) is parameter-free, well-studied, and trivial to implement in SQL. No training data needed. | Yes |
| 2026-04-13 | Postgres `tsvector` for BM25 | Native, no external deps. `ts_rank_cd` with `english` config gives term-frequency + inverse-doc-frequency approximation. Good enough. | Yes |

## Phase 1: Migration SQL

**File:** `supabase/migrations/20260413000000_wiki_search_index.sql`

```sql
-- Wiki Search Index — derived from wiki/ markdown files
CREATE TABLE IF NOT EXISTS wiki_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_path TEXT NOT NULL UNIQUE,  -- e.g. 'projects/empathy-ledger'
  title TEXT NOT NULL,
  section_id TEXT,                     -- 'concepts', 'projects', etc.
  aliases TEXT[],                      -- from frontmatter
  tags TEXT[],                         -- from frontmatter
  body TEXT NOT NULL,                  -- markdown body (frontmatter stripped)
  fts tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(aliases, ' '), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'C')
  ) STORED,
  embedding vector(384),
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wiki_fts ON wiki_search_index USING GIN(fts);
CREATE INDEX idx_wiki_embedding ON wiki_search_index
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20);
CREATE INDEX idx_wiki_section ON wiki_search_index(section_id);

-- Hybrid search RPC
CREATE OR REPLACE FUNCTION wiki_hybrid_search(
  query_text TEXT,
  query_embedding vector(384),
  match_count INT DEFAULT 15,
  rrf_k INT DEFAULT 60
)
RETURNS TABLE (
  article_path TEXT,
  title TEXT,
  section_id TEXT,
  snippet TEXT,
  fts_rank FLOAT,
  vec_score FLOAT,
  rrf_score FLOAT
) AS $$
WITH fts_results AS (
  SELECT w.article_path, w.title, w.section_id, w.body,
         ts_rank_cd(w.fts, websearch_to_tsquery('english', query_text))::FLOAT as rank,
         ROW_NUMBER() OVER (ORDER BY ts_rank_cd(w.fts, websearch_to_tsquery('english', query_text)) DESC) as rn
  FROM wiki_search_index w
  WHERE w.fts @@ websearch_to_tsquery('english', query_text)
  ORDER BY rank DESC LIMIT 30
),
vec_results AS (
  SELECT w.article_path, w.title, w.section_id, w.body,
         (1 - (w.embedding <=> query_embedding))::FLOAT as score,
         ROW_NUMBER() OVER (ORDER BY w.embedding <=> query_embedding) as rn
  FROM wiki_search_index w
  WHERE w.embedding IS NOT NULL
  ORDER BY w.embedding <=> query_embedding LIMIT 30
),
combined AS (
  SELECT
    COALESCE(f.article_path, v.article_path) as article_path,
    COALESCE(f.title, v.title) as title,
    COALESCE(f.section_id, v.section_id) as section_id,
    COALESCE(f.body, v.body) as body,
    COALESCE(f.rank, 0) as fts_rank,
    COALESCE(v.score, 0) as vec_score,
    COALESCE(1.0 / (rrf_k + f.rn), 0) + COALESCE(1.0 / (rrf_k + v.rn), 0) as rrf_score
  FROM fts_results f
  FULL OUTER JOIN vec_results v ON f.article_path = v.article_path
)
SELECT c.article_path, c.title, c.section_id,
       ts_headline('english', c.body, websearch_to_tsquery('english', query_text),
         'MaxWords=35, MinWords=15, StartSel=**, StopSel=**') as snippet,
       c.fts_rank, c.vec_score, c.rrf_score
FROM combined c
ORDER BY c.rrf_score DESC
LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

**Acceptance:** Table creates, RPC callable, indexes build.

## Phase 2: Indexing Script

**File:** `scripts/wiki-index-search.mjs`

Core logic:
1. Import `walkMarkdown` + `parseFrontmatter` patterns from `wiki-files.ts` (JS port)
2. Read all canonical wiki articles (reuse `wiki-scope.mjs` for scope filtering)
3. For each article: extract path, title, section, aliases, tags, body
4. Generate embedding via OpenAI `text-embedding-3-small` (384 dims) — batch where possible
5. Upsert into `wiki_search_index` on `article_path` conflict
6. Delete rows whose `article_path` no longer exists (stale articles)
7. Log: `{indexed} articles indexed, {deleted} stale removed, {errors} errors`

Key details:
- Rate limit: OpenAI embedding API allows batch input (up to ~50 texts per call). Batch in groups of 25 to stay safe.
- Estimated cost: 268 articles x ~890 words x 1.3 tokens/word = ~310K tokens = ~$0.006 per full reindex.
- Incremental mode: compare file mtime vs `indexed_at` — only re-embed changed articles. Pass `--full` to force all.
- Script should be idempotent and safe to run in CI.

**Acceptance:** `node scripts/wiki-index-search.mjs` populates table with 268 rows, all with embeddings.

## Phase 3: Search API

**File:** `apps/command-center/src/app/api/wiki/search/route.ts`

Updated logic:
1. Receive `q` query param (existing contract)
2. If `q.length < 2`, return empty (existing)
3. Generate embedding for query text (OpenAI, same model/dims)
4. Call `wiki_hybrid_search` RPC with both query text and embedding
5. Return `{ results: [{ path, title, snippet, section, score }] }`
6. **Fallback:** If Supabase call fails or returns 0 results, fall back to existing `searchCanonicalWiki(q)` substring search — graceful degradation.

New server-side helper in `apps/command-center/src/lib/wiki-search.ts`:
- `generateQueryEmbedding(text: string): Promise<number[]>` — thin wrapper around OpenAI
- `hybridSearch(query: string): Promise<SearchResult[]>` — calls RPC, returns formatted results

**Acceptance:** Search for "empathy ledger" returns relevant results. Search for "how does ACT approach regeneration" (semantic) returns conceptual matches, not just keyword hits.

## Phase 4: Client Integration

**HTML viewer** (`tools/act-wikipedia.html`):
- Already has a search input. Replace client-side substring filter with fetch to `/api/wiki/search?q=...` (debounced 300ms).
- Display results with snippet highlighting. Minimal change — the viewer is a single HTML file.
- Need CORS or same-origin consideration: viewer is served from same Vercel deploy, so same origin. Fine.

**Command Center** (`apps/command-center/src/app/wiki/page.tsx`):
- Already calls `/api/wiki/search`. No client changes needed — just returns better results.

**Acceptance:** Both surfaces return hybrid results.

## Phase 5: CI Integration

Add indexer to the existing wiki rebuild workflow (`.github/workflows/wiki-rebuild.yml` in `act-regenerative-studio` repo):
- After wiki-lint step, run `node scripts/wiki-index-search.mjs`
- Needs `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as GitHub secrets (likely already configured)
- Non-blocking: if indexing fails, wiki rebuild still succeeds (same pattern as wiki-lint)

**Acceptance:** Push to wiki triggers reindex.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI API down during CI | Index stale | Incremental mode means only changed articles fail. Fallback to substring search works. |
| ivfflat index on 268 rows | Suboptimal | `lists = 20` is fine for <1000 rows. Switch to HNSW if we hit 1000+. |
| `websearch_to_tsquery` fails on weird input | 500 error | Wrap in try/catch, fall back to `plainto_tsquery` |
| Generated tsvector column bloats table | Minimal | 268 rows, negligible storage |

## Verification Log

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| 268 wiki articles in canonical graph | Yes | `find wiki/ -name "*.md" | wc -l` = 268 | 2026-04-13 |
| Avg ~890 words/article | Yes | 238K total words / 268 articles | 2026-04-13 |
| pgvector extension available | Yes | `project_knowledge` migration enables it | 2026-04-13 |
| Existing embedding uses 384 dims | Yes | `capture-knowledge.mjs` line 76: `dimensions: 384` | 2026-04-13 |
| OpenAI key in env | Yes | Referenced in `capture-knowledge.mjs` | 2026-04-13 |
| `project_knowledge` has different lifecycle | Yes | Project-scoped, manually captured, has decision/action tracking — not a derived index | 2026-04-13 |

## Provenance

- **Data sources queried:** wiki/ directory (filesystem), existing migrations, capture-knowledge.mjs
- **Unverified assumptions:** GitHub secrets for CI (likely exist but not checked)
- **Generated by:** architect-agent (Claude Opus 4.6)
