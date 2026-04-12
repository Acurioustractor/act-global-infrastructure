# Plan: Ecosystem Alignment for Launch

> Slug: `ecosystem-alignment-launch`
> Created: 2026-04-13
> Status: draft
> Owner: ben

## The Problem

Three systems hold ACT's content but don't talk to each other:

| System | What it holds | Instance |
|--------|--------------|----------|
| **EL v2** | Projects, storytellers, media, galleries, stories | `yvnuayzslukamizrlhwb` |
| **ACT shared** | Project codes, finance, GHL contacts, wiki search index | `tednluwflfhxyucgwigh` |
| **Wiki** | 189 markdown articles, knowledge graph | Filesystem (git) |

**The public site** (`act-regenerative-studio` at `/Users/benknight/Code/act-regenerative-studio/`) has richer content than `apps/website/` but still largely static. It has wiki pages (326 articles), project pages, and an `/empathy-ledger` route pulling from EL v2, but no live project showcase, no storyteller directory, and no public media gallery.

**The goal:** EL v2 becomes the CMS (projects, people, media, stories). Wiki becomes the knowledge layer (context, strategy, background). The public site pulls from both. `act_project_code` is the universal join key.

## Current Gaps (Priority Order)

### 1. `act_project_code` coverage (THE KEY)

This is the universal join key across all systems. Current state:

- **EL v2 projects:** ~20 of ~43 active projects have `act_project_code` set. The rest are untagged.
- **Wiki articles:** Article slugs loosely match project codes but there's no frontmatter `code:` field linking them canonically.
- **Media assets:** `project_code` field exists but is nullable and sparsely populated. Most media links via gallery chain, not direct code.
- **Storytellers:** No project code on storytellers — linked via `project_storytellers` junction table.

**Fix:** Backfill `act_project_code` on all EL v2 projects. Add `code:` to wiki article frontmatter. These two steps make everything joinable.

### 2. No sync between EL v2 ↔ ACT shared

Currently zero data flows between the two Supabase instances. The shared instance has `project-codes.json` synced to a `projects` table, but EL v2 has its own `projects` table with different data.

**Fix:** Build a lightweight sync that:
- Reads canonical project list from `config/project-codes.json`
- Ensures every active project exists in EL v2 with correct `act_project_code`
- Pulls project metadata (description, cover image, storyteller count, media count) FROM EL v2 INTO the shared instance for the public site to consume

### 3. Wiki ↔ Project code linkage

Wiki articles exist for most projects but aren't formally linked. `wiki-build-viewer.mjs` queries EL v2 for story counts but doesn't use `project-loader.mjs`.

**Fix:** Add `code:` field to wiki article frontmatter. Update `wiki-lint.mjs` to flag articles missing codes. Update `wiki-build-viewer.mjs` to embed project codes so the viewer can link to EL v2 project pages.

### 4. Public site data source

The website (`apps/website/`) has hardcoded project arrays. The regenerative studio is further ahead but still largely static.

**Fix:** Build API routes on the shared instance that serve:
- `/api/projects` — merged data from EL v2 + wiki (name, description, cover, stats, wiki article link)
- `/api/people` — storyteller profiles from EL v2 (opt-in public profiles)
- `/api/media/featured` — curated media from EL v2 galleries
- Public site consumes these instead of hardcoded data

### 5. Orphaned storytellers and unlinked media

EL v2's data-health page flags storytellers with stories but missing `project_storytellers` links. Media assets exist without gallery associations.

**Fix:** Run the existing data-health checks, fix the orphans, then add a scheduled job that flags new orphans weekly.

## Proposed Architecture

```
┌─────────────────────────────────────────────────┐
│                   PUBLIC SITES                    │
│        act.place / regenerative studio            │
│  Pulls from: shared API + wiki markdown           │
└──────────────┬──────────────┬────────────────────┘
               │              │
     ┌─────────▼──────┐  ┌───▼──────────────┐
     │  ACT Shared DB  │  │  Wiki (git/md)   │
     │  (tednl...)     │  │  189 articles    │
     │                 │  │  + search index  │
     │  project_hub    │  │                  │
     │  (merged view)  │  │  code: ACT-XX    │
     └────────┬────────┘  └──────────────────┘
              │ sync
     ┌────────▼────────┐
     │    EL v2 DB     │
     │  (yvnua...)     │
     │                 │
     │  projects       │
     │  storytellers   │
     │  media_assets   │
     │  stories        │
     │  galleries      │
     └─────────────────┘
```

**Key principle:** EL v2 is the CMS (writes happen here). ACT shared is the read layer (aggregated, cached, public-safe). Wiki is the knowledge layer (context, not operational data). `act_project_code` joins everything.

## Task Ledger

### Phase A: Tag Everything (half day)
- [ ] Backfill `act_project_code` on all EL v2 projects that match config
- [ ] Add `code:` frontmatter to all wiki project articles
- [ ] Update `wiki-lint.mjs` to flag articles missing `code:` field
- [ ] Verify: every active project in config has both an EL v2 record AND a wiki article

### Phase B: Build the Sync (half day)
- [ ] Script: `sync-el-projects-to-shared.mjs` — pull project metadata from EL v2 into a `project_hub` table on shared instance
- [ ] Include: name, description, cover_image_url, storyteller_count, story_count, media_count, act_project_code, wiki_article_path
- [ ] Run on schedule (daily) or on-demand
- [ ] Add to PM2 cron

### Phase C: Public API (half day)
- [ ] API route `/api/ecosystem/projects` on command-center — serves merged project data
- [ ] API route `/api/ecosystem/people` — public storyteller profiles (opt-in only)
- [ ] API route `/api/ecosystem/media` — featured media for project pages
- [ ] Each route joins `project_hub` + wiki search index for rich responses

### Phase D: Wire Public Site (1 day)
- [ ] Replace hardcoded project arrays with API calls
- [ ] Build project detail pages pulling from API + wiki content
- [ ] Build people directory (storyteller profiles)
- [ ] Build media showcase (featured galleries)
- [ ] Ensure all cross-links work: project → wiki article → storytellers → media

### Phase E: Ongoing Health (ongoing)
- [ ] Weekly ecosystem-health check (existing `living-ecosystem-alignment-scan.mjs`)
- [ ] Wiki-lint flags missing project codes
- [ ] Data-health dashboard in command center flags orphaned storytellers/media
- [ ] Search index auto-refreshes on wiki rebuild (already wired in CI)

## Decision Log

| Decision | Rationale |
|----------|-----------|
| EL v2 = CMS, not shared DB | EL v2 has the richest schema, RLS, auth, and all the content creation UX |
| Shared DB = read cache, not source of truth | Avoids cross-instance writes, keeps public queries fast |
| `act_project_code` as join key, not UUIDs | Codes are human-readable, stable, and already exist across Xero/GHL/Notion |
| Wiki stays as markdown, not in DB | Versioned, LLM-friendly, git-tracked, already has search index |
| Sync is pull (shared pulls from EL), not push | Simpler, EL doesn't need to know about downstream consumers |

## What NOT to Build

- Don't build a unified "super schema" across instances — keep them separate with sync
- Don't move wiki into a database — markdown is the right format for LLM knowledge
- Don't build real-time sync — daily batch is fine for public content
- Don't build auth on the public API — it's read-only, pre-aggregated data
