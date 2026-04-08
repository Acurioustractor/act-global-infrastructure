---
title: Continuous Pipeline Architecture
status: Active
date: 2026-04-07
---

# Continuous Pipeline Architecture

> How the Tractorpedia wiki stays alive after the initial 7-phase build. What's automated, what's manual, what triggers what.

## The Question Phase 7 Answers

Phases 1–6 were a one-time backfill: bring 5 years of accumulated knowledge into the wiki. Phase 7 is the standing infrastructure that prevents the wiki from going stale the moment we stop paying attention to it.

The principle: **the LLM owns the wiki, the human curates the sources.** Automation should bring new sources into `raw/` and surface gaps; the human (or a Claude Code session) decides what to compile.

## Pipeline Components

### 1. Wiki Lint — `scripts/wiki-lint.mjs`

A pure Node.js script that walks `wiki/`, builds the wikilink graph, and reports:
- **Orphans** — articles with no incoming links and not in `index.md`
- **Broken wikilinks** — `[[link-name]]` pointing to non-existent files
- **Stubs** — articles with fewer than 20 non-blank lines
- **Missing from index** — articles that exist but aren't listed in `index.md`
- **Missing backlinks** — A links to B but B doesn't link back

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

### 4. The `/wiki` Skill (existing)

The Claude Code skill at `.claude/skills/wiki/SKILL.md` provides the `ingest`, `query`, `enrich`, `lint`, and `status` operations. It's the human-facing interface — when you run `/wiki ingest <path>`, it reads the raw source and compiles it into the appropriate domain article.

The skill is the LLM half of the pipeline. The scripts above are the data half.

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

1. **The wiki is small.** ~110 articles, ~1,800 wikilinks. Lint runs in under a second.
2. **The compile step needs judgment.** An LLM (via the `/wiki` skill) decides what to merge where. Automating the compile would push us toward generic summarization, which is exactly what the knowledge base is supposed to avoid.
3. **The cost of staleness is low.** This isn't a real-time system. A weekly lint catches drift; a monthly enrich session keeps the wiki fresh.
4. **Beautiful obsolescence.** The pipeline should be possible to abandon for 6 months without breaking. Heavy automation creates ongoing dependency.

## Backlinks

- [[tractorpedia|Tractorpedia]] — the wiki this pipeline serves
- [[llm-knowledge-base|LLM Knowledge Base pattern]] — Karpathy's principles
- [[beautiful-obsolescence|Beautiful Obsolescence]] — why we kept the pipeline light
- [[ways-of-working|Ways of Working]] — operational rhythms
- [[roadmap-2026|Roadmap 2026]] — broader 2026 plan
