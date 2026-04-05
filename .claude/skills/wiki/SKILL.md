---
name: wiki
description: ACT Wikipedia — ingest sources, query knowledge, lint for gaps, and manage the LLM-compiled wiki at wiki/. Use when user says "wiki", "ingest", "add to wiki", "wiki query", "wiki lint", "knowledge base", or wants to add/query/maintain the ACT knowledge base.
---

# ACT Wikipedia Skill

LLM-managed knowledge base at `wiki/` following the Karpathy pattern. The wiki is the domain of the LLM — humans curate sources, the LLM compiles and maintains articles.

## Commands

Parse the user's intent and route to the appropriate operation:

| Trigger | Operation | Example |
|---------|-----------|---------|
| `/wiki ingest <path-or-url>` | Ingest | "ingest this article into the wiki" |
| `/wiki query <question>` | Query | "what do we know about PICC?" |
| `/wiki lint` | Lint | "health check the wiki" |
| `/wiki status` | Status | "how big is the wiki?" |
| `/wiki enrich <slug>` | Enrich | "flesh out the goods-on-country article" |
| `/wiki` (no args) | Status | Show current wiki stats |

---

## Operation: Ingest

Add a new source to the wiki and update affected articles.

### Steps

1. **Identify the source.** The user provides a file path, URL, or pastes content.
   - If URL: fetch with WebFetch and save to `wiki/raw/YYYY-MM-DD-<slug>.md`
   - If file path: read the file, copy or reference it in `wiki/raw/`
   - If pasted content: save to `wiki/raw/YYYY-MM-DD-<slug>.md`

2. **Read the source.** Extract key entities, concepts, facts, and relationships.

3. **Check existing articles.** Read `wiki/index.md` to understand current wiki state. For each entity/concept found in the source, check if an article already exists.

4. **Update or create articles.**
   - If an article exists: read it, merge new information, preserve existing structure and backlinks, write updated file
   - If no article exists: create a new article in the appropriate domain directory
   - Use Obsidian `[[wikilinks]]` format for all internal links: `[[filename|Display Text]]`
   - Add backlinks section at the bottom of every article

5. **Update index.** Add any new articles to `wiki/index.md` in the appropriate section.

6. **Report.** Tell the user what was ingested, which articles were created/updated, and suggest related topics to explore.

### Article Structure Template

```markdown
# Title

> One-line summary or quote

## Overview
What this is and why it matters.

## [Domain-specific sections]
Details, data, evidence.

## Backlinks
- [[related-article|Display Name]] — how it connects
```

### Domain Directory Guide

| Content Type | Directory | Examples |
|-------------|-----------|---------|
| Frameworks, methodologies, theories | `concepts/` | LCAA, Third Reality |
| ACT ecosystem projects | `projects/` | CivicGraph, PICC, Empathy Ledger |
| Place-based relationships | `communities/` | Palm Island, Quandamooka |
| Key people and roles | `people/` | Named individuals with public roles |
| Artworks, installations, exhibitions | `art/` | Uncle Allan paintings, CONTAINED |
| Funding, grants, R&D, financial strategy | `finance/` | R&D tax, grant pipeline |
| Architecture, infrastructure, builds | `technical/` | Local AI, Supabase architecture |
| Key decisions and reasoning | `decisions/` | Dual entity structure, mono-repo |
| Compiled research and analysis | `research/` | ACCO sector, global precedents |

### Rules for Ingestion

- **Never modify files in `raw/`.** They are immutable source documents.
- **Always use `[[wikilinks]]`** — `[[filename|Display Text]]` format, no markdown links for internal references.
- **Preserve existing content.** When updating an article, merge new info — don't overwrite what's already there.
- **Add provenance.** Note the source at the bottom of new/updated sections: `(Source: raw/YYYY-MM-DD-slug.md)`
- **Cross-link aggressively.** If an article mentions another wiki topic, link it.
- **Keep articles focused.** One article per entity/concept. Split if an article grows past ~200 lines.

---

## Operation: Query

Research a question using the wiki as the knowledge base.

### Steps

1. **Read the index.** Start at `wiki/index.md` to understand what's available.

2. **Identify relevant articles.** Based on the question, determine which articles to read. Use the index and backlinks to navigate.

3. **Read relevant articles.** Deep-read 3-7 articles that are most relevant to the question. Follow backlinks if needed.

4. **Synthesize an answer.** Combine information across articles into a coherent response. Cite which articles informed the answer.

5. **Optionally file the answer.** If the query produced a valuable synthesis, offer to save it as a new article or append it to an existing one. Explorations should compound.

### Rules for Queries

- **Always cite sources.** Reference which wiki articles informed your answer.
- **Flag gaps.** If the wiki doesn't have enough information, say so and suggest what to ingest.
- **Offer to file.** After answering, ask if the user wants the answer saved back to the wiki.

---

## Operation: Lint

Health check the wiki for quality, consistency, and completeness.

### Checks to Run

1. **Orphaned articles.** Files in wiki directories that aren't linked from `index.md` or any other article.

2. **Broken wikilinks.** `[[links]]` that point to articles that don't exist.

3. **Stub articles.** Articles with "Stub — needs enrichment" or fewer than 20 lines of content.

4. **Missing backlinks.** If article A links to article B, article B should link back to A.

5. **Stale data.** Articles with claims that can be verified against live data (Supabase, git, Notion). Flag anything that looks outdated.

6. **Missing articles.** Entities, people, or concepts mentioned in multiple articles but lacking their own article.

7. **Index completeness.** All articles should be listed in `wiki/index.md`.

### Steps

1. Glob all `.md` files in `wiki/` (excluding `raw/`)
2. Read each file, extract all `[[wikilinks]]`
3. Build a link graph: which articles link to which
4. Run each check above
5. Report findings as a health scorecard

### Output Format

```
## Wiki Health Report — YYYY-MM-DD

**Articles:** X total (Y full, Z stubs)
**Links:** X total (Y valid, Z broken)
**Orphans:** X articles not linked from anywhere
**Missing backlinks:** X one-way links that need reciprocation
**Suggested new articles:** [list of frequently-mentioned but unwritten topics]
**Enrichment priority:** [top 5 stubs that would benefit most from enrichment]
```

---

## Operation: Status

Quick overview of the wiki's current state.

### Steps

1. Count all `.md` files in `wiki/` by directory (excluding `raw/`)
2. Count files in `raw/`
3. Report total articles, articles per domain, raw sources

### Output

```
## ACT Wikipedia Status

Total articles: X
  concepts/: X | projects/: X | communities/: X
  people/: X   | art/: X      | finance/: X
  technical/: X | decisions/: X | research/: X
Raw sources: X
Last modified: [most recent file modification date]
```

---

## Operation: Enrich

Flesh out a stub article or deepen an existing article using available data sources.

### Steps

1. **Read the current article.** Understand what's already there.

2. **Gather data from available sources:**
   - Supabase: query relevant tables (use `LIMIT 10` for exploratory queries)
   - Notion: search for related pages
   - Git history: check for related commits and code
   - `thoughts/` directory: look for related plans, research, handoffs
   - `config/` directory: check for project configuration data
   - Web: fetch relevant public information if needed

3. **Enrich the article.** Add sections, data, context, and backlinks. Maintain the existing article structure.

4. **Update backlinks.** If the enriched article now connects to new topics, add backlinks in both directions.

5. **Update index if needed.**

### Rules for Enrichment

- **Verify before writing.** Don't add data you haven't confirmed from a source.
- **Cite sources.** Note where enrichment data came from.
- **Don't fabricate.** If you can't find data to enrich with, say so. Suggest what sources might help.
- **Respect TK protocols.** If enriching community or cultural articles, note where cultural review is needed.

---

## Wiki Conventions

### File Naming
- Use kebab-case: `goods-on-country.md`, `third-reality.md`
- Match project slugs from `config/active-projects.json` where possible

### Wikilinks
- Always use `[[filename|Display Text]]` format
- Filename is just the stem — no path, no `.md` extension
- Example: `[[third-reality|The Third Reality]]`

### Backlinks Section
Every article ends with a `## Backlinks` section listing related articles with a brief note on the relationship.

### Provenance
When adding information from specific sources, note it inline: `(Source: raw/2026-04-06-acco-report.md)` or `(Source: Supabase gs_entities table)`

### Article Size
- Stub: < 20 lines — needs enrichment
- Standard: 30-150 lines — solid article
- Comprehensive: 150-300 lines — deep reference
- Consider splitting if > 300 lines

### Cultural Sensitivity
Articles about communities, Indigenous knowledge, or cultural practices should note where Elder/community review is needed. Never present cultural information as definitive without community validation.
