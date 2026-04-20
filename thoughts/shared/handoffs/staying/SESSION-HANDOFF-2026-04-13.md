# Session Handoff — 2026-04-13

**Updated:** 2026-04-13 (end of session)
**Goal:** Wiki hybrid search + ecosystem alignment for launch
**Status:** ALL PHASES COMPLETE — pushed to all 3 repos

## Completed This Session

### 1. Wiki Hybrid Search (act-global-infrastructure)
- **Migration:** `wiki_search_index` table — weighted tsvector trigger + pgvector 384-dim + `wiki_hybrid_search` RPC (BM25 + vector + RRF fusion, k=60)
- **Indexer:** `scripts/wiki-index-search.mjs` — 189 articles indexed, $0.006/full reindex, incremental by default
- **API:** `/api/wiki/search` — hybrid search with substring fallback
- **Viewer:** `tools/act-wikipedia.html` — API-first search with local fallback, "(semantic + keyword)" label
- **CI:** `wiki-rebuild.yml` runs indexer after lint (non-blocking)
- Commits: `721a3e1`, `2f095e7`, `d46e195` → pushed as `e7c893b`

### 2. EL v2 Fixes (empathy-ledger-v2)
- **Video player:** Already working — service tagging verified via REST API with service role key
- **Partner org badges:** `36aaa8ec` — "with ACT" ochre badge on non-ACT org project cards with ACT- prefix codes
- **Flatten projects:** `aa8b0f8f` — removed tier sections, sort by content richness (stories+people+media), tier label inline
- All pushed to main

### 3. Project Code Alignment
- **Sync script:** `scripts/sync-projects-to-el.mjs` — reads `config/project-codes.json`, syncs to EL v2
- **5 code mismatches fixed:** ACT-BCV→ACT-BV, ACT-CFTC→ACT-CA, ACT-TC→ACT-CF, ACT-CTD→ACT-CN, ACT-RAF→ACT-RA
- **12 missing projects created** in EL v2 under ACT org (CAMPFIRE, Redtape, Community Capital, etc.)
- **Result:** 30/34 active config projects matched in EL v2 (4 are separate orgs: PICC, SMART, BG Fit, Oonchiumpa)
- **DeadlyLabs ≠ Dad.Lab** — they are different projects, don't confuse them

### 4. Tractorpedia Sync
- 3 new articles: Marriage Celebrant (ACT-CB), Custodian Economy (ACT-CE), ACT Monthly Dinners (ACT-MD)
- Project code added to quandamooka-justice-strategy (ACT-QD)
- Search index: 189 articles, all with embeddings

### 5. Regen Studio (act-regenerative-studio)
- Wiki snapshots regenerated: 329 pages, 58 projects, 46 with codes
- **`getProjectData()` wiki fallback:** projects without static entries now render from wiki data
- **`getAllProjectSlugs()` merges static + wiki:** all 58 wiki projects get `/projects/[slug]` pages
- Commits: `1384793`, `e90b10b` → pushed

## Architecture Discovered

The regen studio is more wired up than the handoff ledger suggested:
- Wiki content → `wiki-pages.generated.json` (CI synced from act-global-infrastructure)
- Project data → merges static `projects.ts` + wiki snapshot + EL v2 HTTP + Notion JSON + ecosystem data
- Live signals (stories, media, services) already flow from EL v2 via `buildProjectIndexSignals()`
- 5 flagship projects (JusticeHub, Goods, Harvest, EL, BCV) get special treatment
- `projects.ts` still provides LCAA content, stats, quotes for flagship projects — that's fine, it's curated

## Also Completed — Phases B-E

### Phase B: Skipped (unnecessary)
Regen studio already fetches from EL v2 via HTTP + JSON snapshots. No `project_hub` table needed.

### Phase C+D: People + Media pages (act-regenerative-studio)
- `/people` — storyteller directory, 14 people across 2 projects, consent-first
- `/media` — media showcase with hero gallery, video section, masonry grid
- Both added to nav, both pull from EL featured content + local field media
- Commits: `ee9393f`, `25b00e9`

### Phase D: Wiki-only project pages
- `getProjectData()` falls back to wiki when no static entry exists
- `getAllProjectSlugs()` merges static + wiki — 58 projects get pages
- Commit: `e90b10b`

### Phase E: Health monitoring
- `/people` and `/media` added to `living-ecosystem-alignment-scan.mjs`
- Wiki search index auto-refreshes on wiki rebuild (CI)
- Commit: `e322bb5`

## What's Next (for future sessions)

- [ ] **Verify deploy** — check act-regenerative-studio.vercel.app /people, /media, /projects/campfire etc.
- [ ] **Enrich storyteller data** — only 14 people visible currently, most projects have no featured storytellers in EL v2
- [ ] **Add project descriptions** — 12 newly created EL v2 projects have config descriptions only, need richer content
- [ ] **Wiki article codes in frontmatter** — some sub-articles still missing formal `code:` field
- [ ] **Scheduled sync** — add `sync-projects-to-el.mjs` to PM2 cron (weekly)
- [ ] **DeadlyLabs** — needs its own proper project code (not ACT-DL, that's Dad.Lab)
- [ ] **EL v2 data health** — run the admin data-health checks, fix orphaned storytellers/media

## Key IDs
- ACT org (EL v2): `db0de7bd-eb10-446b-99e9-0f3b7c199b8a`
- ACT tenant: `5f1314c1-ffe9-4d8f-944b-6cdf02d4b943`
- Shared Supabase: `tednluwflfhxyucgwigh`
- EL v2 Supabase: `yvnuayzslukamizrlhwb`
- Regen Studio Supabase: `bhwyqqbovcjoefezgfnq`

## Key Files
- `config/project-codes.json` — SOURCE OF TRUTH for project codes
- `scripts/sync-projects-to-el.mjs` — config → EL v2 sync
- `scripts/wiki-index-search.mjs` — wiki → search index
- `thoughts/shared/plans/ecosystem-alignment-launch.md` — full alignment plan
- `src/lib/projects/get-project-data.ts` (regen studio) — project data merger with wiki fallback
