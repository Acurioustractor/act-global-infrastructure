# Tractorpedia — Agent Guide

This is a Karpathy-style LLM knowledge base for A Curious Tractor (ACT), a regenerative innovation ecosystem. Any LLM agent (Claude Code, Codex, Cursor, etc.) can work with this wiki using the conventions below.

## Directory Layout

### Canonical Graph (the wiki — lint and viewer operate on these)

| Directory | Content |
|-----------|---------|
| `concepts/` | Frameworks, methodologies, theories |
| `projects/` | ACT ecosystem projects (subdirs for large projects) |
| `communities/` | Place-based community relationships |
| `people/` | Key people with public roles |
| `stories/` | Vignettes from Empathy Ledger (consent-gated) |
| `art/` | Artworks, installations, exhibitions |
| `finance/` | Funding, grants, financial strategy |
| `technical/` | Architecture, infrastructure, tooling |
| `decisions/` | Key decisions and reasoning |
| `research/` | Compiled research and analysis |
| `synthesis/` | Answers to questions (the compounding loop) |

### Support Layers (not in viewer, used for traceability)

| Directory | Content |
|-----------|---------|
| `sources/` | One summary per raw file — bridge between raw and canonical |
| `narrative/` | Claims store — tracks what we've said publicly and where |

### Operational (skip — never edit, never lint)

| Directory | Content |
|-----------|---------|
| `raw/` | Immutable source capture (never edit) |
| `output/` | Generated reports, lint results, narrative drafts |
| `library/` | Book chapters, location briefs, series docs |
| `dashboards/` | Operational dashboards |

**Authoritative scope definition:** `scripts/lib/wiki-scope.mjs`

## Article Format

```markdown
---
title: Article Title
summary: One-line summary
tags: [tag1, tag2]
project_code: ACT-XX (if project-specific)
status: active
---

# Article Title

> One-line summary as blockquote.

## Section

Body content with [[wikilinks]] to other articles.
Use [[slug]] or [[slug|Display Text]] format.

## Backlinks

- [[related-article]]
- [[another-article]]
```

### Naming Conventions

- File names: `kebab-case.md`
- Large projects get their own subdirectory: `projects/justicehub/justicehub.md`
- The main article in a subdirectory matches the directory name
- `index.md` at wiki root is the master catalog — update it when adding articles

### Wikilinks

- Link to other articles: `[[slug]]` or `[[slug|Display Text]]`
- Slug = filename without `.md`, or `subdir/filename` for nested files
- Every article should have a `## Backlinks` section listing articles that reference it
- Hub pages (index, README, glossary) don't need reciprocal backlinks

## After Editing

1. **Lint:** `node scripts/wiki-lint.mjs` — checks for broken links, orphans, stubs, missing backlinks
2. **Rebuild viewer:** `node scripts/wiki-build-viewer.mjs` — regenerates the HTML viewer and command-center snapshot
3. **Push:** on push to `main`, a GitHub Action auto-rebuilds the viewer and syncs downstream surfaces

If you're running a batch of edits, lint and rebuild once at the end.

## Rules

- **Never edit `raw/`** — these are immutable source captures
- **Never create articles outside canonical graph dirs** — use the 11 directories listed above
- **Never hard-code article counts** in `index.md` or anywhere — they change constantly
- **Always add new articles to `wiki/index.md`** — orphaned articles fail lint
- **Always add a `## Backlinks` section** — missing backlinks generate lint warnings
- **Respect consent tiers** — stories from Empathy Ledger may have `consent_tier: internal-only` in frontmatter. These are excluded from the public viewer automatically.

## Key Scripts

| Script | Purpose |
|--------|---------|
| `scripts/wiki-lint.mjs` | Health check: orphans, broken links, stubs, backlinks |
| `scripts/wiki-build-viewer.mjs` | Rebuild HTML viewer + command-center snapshot |
| `scripts/wiki-verify-urls.mjs` | Check live status of all project URLs |
| `scripts/wiki-bootstrap-source-summaries.mjs` | Generate source summaries from raw files |
| `scripts/wiki-sync-command-center-snapshot.mjs` | Sync curated subset to command-center |
| `scripts/ingest-articles-to-wiki.mjs` | Pull published articles from Supabase into raw/ |

## Output Surfaces

This wiki feeds four downstream surfaces:

1. **Tractorpedia viewer** (`tools/act-wikipedia.html`) — self-contained Wikipedia-skin HTML, deployed at `/tractorpedia.html` on Vercel
2. **Command Center wiki** (`apps/command-center/src/app/wiki/`) — Next.js page with search, section nav, repair queue
3. **Command Center snapshot** (`apps/command-center/public/wiki/`) — 58-file curated mirror for Vercel runtime fallback
4. **ACT Regenerative Studio** (separate repo) — public-facing wiki at `/wiki`, synced via generated JSON at build time
