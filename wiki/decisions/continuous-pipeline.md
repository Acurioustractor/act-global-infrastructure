---
title: Continuous Pipeline Architecture
status: Active
date: 2026-04-07
---

# Continuous Pipeline Architecture

> How the Tractorpedia wiki stays alive after the initial 7-phase build. What's automated, what's manual, what triggers what.

## The Question Phase 7 Answers

Phases 1–6 were a one-time backfill: bring 5 years of accumulated knowledge into the wiki. Phase 7 is the standing infrastructure that prevents the wiki from going stale the moment we stop paying attention to it.

The principle: **the LLM maintains the wiki graph, the human curates the sources and steers the canon.** Automation should bring new sources into `raw/` and surface gaps; the human (or a Claude Code session) decides what to compile and when a load-bearing page needs a direct edit.

## Pipeline Components

### Phase 1 Convergence Artifacts

The pipeline now has explicit phase-1 machine-readable scaffolding:

- `config/living-ecosystem-canon.json` — current canon map for hub/spoke/support/archive ownership
- `config/living-source-packet.schema.json` — contract for approved source packets
- `config/living-source-packet.example.json` — example packet for implementation and QA
- `thoughts/shared/templates/source-bridge-note-template.md` — reusable bridge-note template
- `thoughts/shared/templates/provenance-template.md` — reusable provenance sidecar template
- `node scripts/validate-living-ecosystem-config.mjs` — validation pass for the canon map and source packet contract

These files do not replace human decisions. They make the current operating assumptions explicit and machine-checkable.

### 1. Wiki Lint — `scripts/wiki-lint.mjs`

A pure Node.js script that walks `wiki/`, builds the wikilink graph, and reports:
- **Orphans** — articles with no incoming links and not in `index.md`
- **Broken wikilinks** — `[[link-name]]` pointing to non-existent files
- **Stubs** — articles with fewer than 20 non-blank lines
- **Missing from index** — articles that exist but aren't listed in `index.md`
- **Missing backlinks** — reciprocal links expected for non-hub pages
- **Advisory backlink opportunities** — hub pages, cluster pages, portfolios, and broad overviews that reference an article without needing a manual reverse link
- **Source-bridge coverage** — how many raw markdown captures in `wiki/raw/` still lack a corresponding bridge summary in `wiki/sources/`
- **Orphan source summaries** — summaries that point at raw files that no longer exist

```bash
node scripts/wiki-lint.mjs                  # human-readable report
node scripts/wiki-lint.mjs --json           # machine-readable
node scripts/wiki-lint.mjs --write-report   # save to wiki/decisions/wiki-health-YYYY-MM-DD.md
```

Exit code 1 if broken links exist (CI-friendly).

**Recommended cadence:** Weekly. Either via local cron or via `/schedule` to set up a remote agent that runs the lint and posts the report somewhere visible.

### 2. Meeting Watcher — `scripts/wiki-watch-meetings.mjs`

Pulls new meeting records from the Supabase `project_knowledge` table (where `knowledge_type = 'meeting'`) into `wiki/raw/` for subsequent ingestion. Tracks state in `wiki/raw/.last-meeting-sync` so each run only fetches genuinely new records.

Filters out:
- `ACT-MISC` project code (student-team ephemera)
- Meetings under 800 characters (sparse stubs)

```bash
node scripts/wiki-watch-meetings.mjs                 # incremental
node scripts/wiki-watch-meetings.mjs --since 2026-03-01
node scripts/wiki-watch-meetings.mjs --dry-run
```

**Recommended cadence:** Daily. New meetings land in raw/, and the next Claude Code session compiles them via `/wiki ingest`.

### 3. Article Ingest (existing) — `scripts/ingest-articles-to-wiki.mjs`

Already exists from Phase 1. Pulls published Supabase `articles` records into `wiki/raw/`. Should be re-run when new articles are published.

### 4. Supabase Project Snapshot — `scripts/wiki-sync-supabase-projects-snapshot.mjs`

Supabase is an operational mirror, but it should still feed the knowledge loop. This script captures the live `public.projects` table back into the vault as:

- an immutable raw snapshot in `wiki/raw/`
- a bridge summary in `wiki/sources/`
- a refreshed `wiki/sources/index.md`

```bash
node scripts/wiki-sync-supabase-projects-snapshot.mjs
node scripts/wiki-sync-supabase-projects-snapshot.mjs --dry-run
```

This means project identity drift in Supabase becomes visible to both humans and LLMs inside the same markdown system that powers the website.

### 5. Viewer + Snapshot Surfaces — `scripts/wiki-build-viewer.mjs` + `scripts/wiki-sync-command-center-snapshot.mjs`

The public-facing wiki surfaces are generated, not hand-maintained:

- `scripts/wiki-build-viewer.mjs` rebuilds `tools/act-wikipedia.html` from the canonical Tractorpedia graph
- as part of the same run, it calls `scripts/wiki-sync-command-center-snapshot.mjs`
- that script regenerates `apps/command-center/public/wiki/` as a clearly-marked legacy mirror for command-center compatibility

```bash
node scripts/wiki-build-viewer.mjs
node scripts/wiki-sync-command-center-snapshot.mjs   # manual fallback if needed
```

This means the command-center snapshot is no longer a second wiki. It is a generated surface with banners pointing back to the canonical repo-root source.

### 6. People Candidate Queue — `scripts/wiki-refresh-people-candidates.mjs`

The people layer should stay connected to [[empathy-ledger|Empathy Ledger]] without turning `wiki/people/` into a mirror of every storyteller profile.

This script builds a **curated candidate queue** from EL's public storyteller and story surfaces:

- scans active EL storytellers
- considers only public story evidence when recommending new pages
- maps storyteller activity back to canonical ACT project pages
- scores people by project relevance, public proof, Elder/featured status, and existing wiki mentions
- writes a report to `wiki/output/el-people-candidates-latest.md`

```bash
node scripts/wiki-refresh-people-candidates.mjs
```

This keeps the architecture clean:

- **EL** = full voice population
- **project story blocks / voices views** = broad live surface
- **`wiki/people/`** = curated, durable profiles for load-bearing people only

### 7. The `/wiki` Skill (existing)

The Claude Code skill at `.agents/skills/wiki/SKILL.md` provides the `ingest`, `query`, `enrich`, `lint`, and `status` operations. It's the human-facing interface — when you run `/wiki ingest <path>`, it reads the raw source and compiles it into the appropriate domain article.

The skill is the LLM half of the pipeline. The scripts above are the data half.

### 8. Public Website Build Layer — `act-regenerative-studio`

The public website is downstream of the canonical wiki, not parallel to it.

Its current build contract is:

1. `sync:wiki`
2. `next build`

This matters because the public shell should always be rebuilt from generated memory, not from hand-maintained copy drifting away from the canonical graph. The website also pulls live, consented field material from [[empathy-ledger|Empathy Ledger]], but that layer should degrade gracefully when a supporting backend is unavailable.

`sync:notion` still exists as an optional legacy snapshot step for older enrichment paths, but it is no longer part of the default public build contract.

See [[living-website-operating-system|Living Website Operating System]] for the editorial workflow that sits on top of this build contract.

Alongside that website build path, ACT now keeps a generated **project identity report** so the wiki roster and the operational code registry do not drift silently. The rule is documented in [[project-identity-and-tagging-system|Project Identity and Tagging System]], and the generated report lives at `wiki/output/project-registry-latest.md`.

## What's NOT Automated

These were considered for Phase 7 and deliberately deferred:

### Cross-repo file watcher
Watching for changes in `empathy-ledger-v2/docs/`, `JusticeHub/compendium/`, and `grantscope/thoughts/` to trigger re-ingestion. Deferred because (a) the cadence of changes is low, (b) Phase 2 already snapshotted the strategic docs, and (c) `git pull && rerun ingest` is fine for now.

### Post-publish hook
Auto-ingesting newly-published `articles` records as soon as their status flips to `published`. Deferred because the existing `ingest-articles-to-wiki.mjs` is idempotent — running it on cron is simpler than wiring a webhook.

### Obsidian Web Clipper integration
Documented as a convention rather than automated. Convention: any clipped article gets dropped into `wiki/raw/YYYY-MM-DD-clip-<slug>.md`. Then `/wiki ingest <path>` compiles it. No code needed.

### Notion full-page sync
Confirmed in Phase 6 that all 79 existing `notion_sync` records in `project_knowledge` are empty title stubs. A real Notion content sync would require building from scratch, and the strategic Notion content is already covered by the Phase 2 cross-repo ingestion. Skip until proven needed.

## Operational Cadence (Recommended)

| Task | Cadence | Trigger | Owner |
|------|---------|---------|-------|
| `wiki-lint.mjs` | Weekly (Sun) | Cron or `/schedule` | Automated → human reviews |
| `wiki-watch-meetings.mjs` | Daily | Cron | Automated → next Claude session ingests |
| `ingest-articles-to-wiki.mjs` | Daily | Cron | Automated → next Claude session ingests |
| `wiki-sync-supabase-projects-snapshot.mjs` | Daily or pre-publish | Cron or manual | Automated → wiki + humans review alignment |
| `wiki-build-viewer.mjs` | Weekly | Cron | Automated → also syncs command-center snapshot |
| `wiki-refresh-people-candidates.mjs` | Weekly | Cron or manual | Automated → human curates additions to `wiki/people/` |
| `/wiki ingest` | On-demand | Human runs it after raws appear | Claude Code session |
| `/wiki enrich <slug>` | On-demand | Human picks a stub from lint report | Claude Code session |
| Web scraping (Phase 6 sites) | Quarterly | Manual | Human + agent |

## State Files

Two small state files live in `wiki/raw/`:

- **`.last-meeting-sync`** — ISO timestamp of the latest meeting `recorded_at` we've seen
- **`.last-article-sync`** — same idea, for `articles` table (TODO: add to ingest-articles-to-wiki.mjs)

These are gitignored conceptually (they're operational state, not knowledge). If you delete them, the next run treats it as a first-run and fetches the last 30 days.

## Why the Pipeline Stays Light

A heavier pipeline would mean: webhooks, queue workers, dedicated infrastructure, monitoring. We chose not to build that. The reasons:

1. **The canonical graph is still small.** Roughly 150 articles and about 1,000 wikilinks. Lint runs in under a second.
2. **The compile step needs judgment.** An LLM (via the `/wiki` skill) decides what to merge where. Automating the compile would push us toward generic summarization, which is exactly what the knowledge base is supposed to avoid.
3. **The cost of staleness is low.** This isn't a real-time system. A weekly lint catches drift; a monthly enrich session keeps the wiki fresh.
4. **Beautiful obsolescence.** The pipeline should be possible to abandon for 6 months without breaking. Heavy automation creates ongoing dependency.

## Obsidian Front Door

The working vault surface for the loop is now [Knowledge Ops Dashboard](../dashboards/knowledge-ops-dashboard.md). It is not another system. It is just the human-readable frontend onto the same markdown graph, raw capture layer, source bridge, and lint outputs the scripts already maintain.

## Backlinks

- [[tractorpedia|Tractorpedia]] — the wiki this pipeline serves
- [[llm-knowledge-base|LLM Knowledge Base pattern]] — Karpathy's principles
- [[beautiful-obsolescence|Beautiful Obsolescence]] — why we kept the pipeline light
- [[ways-of-working|Ways of Working]] — operational rhythms
- [[living-website-operating-system|Living Website Operating System]] — how the public website stays aligned to the wiki and EL layers
- [[roadmap-2026|Roadmap 2026]] — broader 2026 plan
