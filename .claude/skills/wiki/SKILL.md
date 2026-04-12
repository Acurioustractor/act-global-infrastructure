---
name: wiki
description: ACT Wikipedia — ingest sources, query knowledge, lint for gaps, and manage the LLM-compiled wiki at wiki/. Use when user says "wiki", "ingest", "add to wiki", "wiki query", "wiki lint", "knowledge base", or wants to add/query/maintain the ACT knowledge base.
---

# ACT Wikipedia Skill

LLM-managed knowledge base at `wiki/` following the Karpathy second-brain pattern. The wiki is the domain of the LLM — humans curate sources, the LLM compiles and maintains articles. **Questions feed back as synthesis articles**, so curiosity literally makes the system smarter.

## Folder layout (second-brain pattern)

```
wiki/
  raw/          ← immutable source documents (never edit)
  sources/      ← one summary per ingested raw file
  concepts/     ← frameworks, methodologies, theories
  projects/, people/, communities/, art/, finance/, technical/, decisions/, research/, stories/
  synthesis/    ← THE COMPOUNDING LAYER — answers built by /wiki query
  output/       ← reports, audits, lint results (not part of the article graph)
  log.md        ← append-only timeline of every wiki operation
  index.md      ← master catalog
```

The four layers that compound:
- **Sources** — what was ingested (one summary per raw file in `sources/`)
- **Entities & concepts** — the things sources are *about*
- **Synthesis** — the answers to your *questions*, saved permanently so the next query builds on them
- **Output** — reports the wiki *generated*, not part of the curated graph

## Commands

Parse the user's intent and route to the appropriate operation:

| Trigger | Operation | Example |
|---------|-----------|---------|
| `/wiki ingest <path-or-url>` | Ingest | "ingest this article into the wiki" |
| `/wiki query <question>` | Query (read-only) | "what do we know about PICC?" |
| `/wiki synthesize <question>` | Query + auto-save synthesis | "synthesize Diagrama vs Oonchiumpa" |
| `/wiki lint` | Lint | "health check the wiki" |
| `/wiki status` | Status | "how big is the wiki?" |
| `/wiki enrich <slug>` | Enrich | "flesh out the goods-on-country article" |
| `/wiki log [n]` | Recent activity | "what's been happening in the wiki?" |
| `/wiki narrative status [project]` | Narrative — frame distribution + gaps | "what claims have we made about CONTAINED?" |
| `/wiki narrative draft <project> [--frame ... --channel ...]` | Narrative — assemble draft brief | "draft a moral-frame LinkedIn post for CONTAINED" |
| `/wiki narrative oped <project>` | Narrative — long-form draft brief | "write an op-ed for CONTAINED" |
| `/wiki narrative log <claim> <channel>` | Narrative — record a deployment | "log that we shipped claim-cost-comparison on LinkedIn today" |
| `/wiki narrative refresh [project]` | Narrative — regenerate INDEX | "refresh the narrative index" |
| `/wiki narrative ingest <path>` | Narrative — extract from a file/folder | "ingest the goods-on-country folder into the narrative store" |
| `/wiki narrative watch [--schedule daily\|weekly]` | Narrative — run all configured sources | "watch the narrative sources" |
| `/wiki narrative process <digest>` | Narrative — apply an ingest digest | "process today's digest" |
| `/wiki narrative funder <slug>` | Narrative — assemble funder pitch brief | "draft a Minderoo pitch" |
| `/wiki narrative cycle <phase>` | Narrative — filter draft by campaign cycle | "draft for budget-week" |
| `/wiki narrative review [project]` | Narrative — weekly strategy review | "what's the campaign retro saying" |
| `/wiki` (no args) | Status | Show current wiki stats |

After **every** ingest, lint, synthesis, viewer-build or url-audit operation, append a one-line entry to `wiki/log.md` via `node scripts/wiki-log.mjs <op> "<summary>" [files...]`. The log is the second-brain timeline — without it the system can't answer "what changed and when?".

### Auto-rebuild pipeline

When wiki content is pushed to `main`, the `wiki-rebuild.yml` GitHub Action automatically:
1. Lints the wiki
2. Rebuilds the Tractorpedia HTML viewer (`tools/act-wikipedia.html`)
3. Syncs the command-center snapshot (`apps/command-center/public/wiki/`)
4. Copies the viewer to `apps/command-center/public/tractorpedia.html`
5. Dispatches to `act-regenerative-studio` to sync its wiki JSON snapshots

**You do NOT need to manually run `wiki-build-viewer.mjs` after every edit** — just commit and push. The pipeline handles the rest. Run it manually only if you want to preview locally before pushing.

See also: `wiki/AGENTS.md` for agent-agnostic wiki conventions.

---

## Operation: Ingest

Add a new source to the wiki and update affected articles.

### Steps

1. **Identify the source.** The user provides a file path, URL, or pastes content.
   - If URL: fetch with WebFetch and save to `wiki/raw/YYYY-MM-DD-<slug>.md`
   - If file path: read the file, copy or reference it in `wiki/raw/`
   - If pasted content: save to `wiki/raw/YYYY-MM-DD-<slug>.md`

2. **Read the source.** Extract key entities, concepts, facts, and relationships.

2a. **Write a source summary to `wiki/sources/<slug>.md`.** Always create one summary per ingested raw file. The summary captures: 1-line description, key facts (3-7 bullets), entities mentioned (linked), concepts touched (linked), and a backlink to the raw file. This is the bridge between immutable `raw/` and the curated entity/concept layer.

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

Research a question using the wiki as the knowledge base. Two modes:

- `/wiki query <question>` — read-only, present the answer in chat
- `/wiki synthesize <question>` — same as query, then **automatically save the answer as a synthesis article** (no confirmation needed). This is the compounding loop — use it for any non-trivial question.

### Steps

1. **Read the index.** Start at `wiki/index.md` to understand what's available. Also check `wiki/synthesis/index.md` — the answer may already exist.

2. **Identify relevant articles.** Based on the question, determine which articles to read. Use the index and backlinks to navigate.

3. **Read relevant articles.** Deep-read 3-7 articles that are most relevant to the question. Follow backlinks if needed.

4. **Synthesize an answer.** Combine information across articles into a coherent response. Cite which articles informed the answer.

5. **Save back to synthesis (the compounding step).**
   - If the user invoked `/wiki synthesize`, immediately call:
     ```bash
     node scripts/wiki-save-synthesis.mjs "<question>" "<answer markdown>" <citation1.md> <citation2.md> ...
     ```
     Or for long answers, pipe via stdin:
     ```bash
     cat answer.md | node scripts/wiki-save-synthesis.mjs "<question>" --stdin <citations...>
     ```
   - If the user invoked `/wiki query` and the answer is non-trivial (multiple citations, real synthesis, not just a fact lookup), **proactively offer to save it**: "Want me to save this as a synthesis article so future queries can build on it?"
   - The script writes to `wiki/synthesis/<slug>.md`, updates `wiki/synthesis/index.md`, and appends a `synthesis` entry to `wiki/log.md` automatically.

6. **Report.** Tell the user what was answered, which articles were cited, and (if saved) the path to the synthesis article.

### Rules for Queries

- **Always cite sources.** Reference which wiki articles informed your answer. The save-synthesis script preserves citations as wikilinks.
- **Flag gaps.** If the wiki doesn't have enough information, say so and suggest what to ingest into `raw/`.
- **Synthesize, don't just retrieve.** A query that returns the contents of one article isn't a synthesis. A query that combines facts from 3+ articles to produce a new claim is — and that's worth saving.
- **Don't save trivial answers.** Single-fact lookups ("what year was PICC founded?") don't need a synthesis page. Multi-source comparisons, contradictions, gap analyses, and "what's the trend across X" do.

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

---

## Operation: Narrative

The narrative store is a Rowboat-style typed-entity layer that lives at `wiki/narrative/<project>/`. Each file is a **claim** — one public argument the project has made — with frontmatter (frame, channels, deployment count, audiences, sources) and a body that lists variants used, audience reactions, and an explicit `## What we haven't said yet` section.

**Read first:** `wiki/narrative/README.md` — the schema, frame taxonomy, and lint rules.

The narrative layer answers a different question than the rest of the wiki. The wiki tells you what something **is**. The narrative store tells you what we have already **said about it** — so the next post builds on the last one instead of repeating it.

### Subcommands

#### `/wiki narrative status [project]`

Read the project's `INDEX.md` and report:
- Frame distribution (which frames are overused, which are starved)
- Top 7 under-deployed claims (highest leverage)
- Recently-deployed claims (what's hot)
- Stat conflicts blocking publication

If no project is given, list all projects with claim counts.

#### `/wiki narrative draft <project>`

Run `node scripts/narrative-draft.mjs <project> [--frame ...] [--channel ...] [--length ...] [--news-hook "..."]`.

The script reads the claim files, picks the right ones for the requested frame and channel, and writes a **brief** to `wiki/output/narrative-drafts/<date>-<slug>.md`. The brief is not the final post — it shows you (or the LLM writing the next post) which claims to build on, what we have already said (so we don't repeat), and what the gaps are (so we build something new).

Default behaviour:
- If no `--frame` is given, picks the most starved frame automatically
- Default `--length` is `medium` (3 claims)
- Default `--channel` is `oped`
- Selection mode is "gap" (least-deployed first); pass `--recent` to build on momentum instead

After drafting the actual post against the brief, **always** call `/wiki narrative log` to record the deployment.

#### `/wiki narrative oped <project>`

Equivalent to `/wiki narrative draft <project> --channel oped --length long`. Pulls 5 claims, prefers under-deployed across multiple frames, and structures the brief for a long-form piece.

#### `/wiki narrative log <claim-id> <channel>`

Run `node scripts/narrative-log-deployment.mjs <claim> <channel> [--source ...] [--variant "..."] [--audience ...] [--date ...]`.

Updates the claim file's frontmatter:
- `times_deployed` += 1
- `last_used` = today (or `--date`)
- `channels` += channel if new
- `status` flips back to `live` if it was `needs-refresh`
- New entry in `sources:` with the URL/path
- Optional new row in the `## Variants used` table

Then auto-runs `narrative-refresh` for the project so `INDEX.md` re-sorts.

**Always log every public deployment.** This is what keeps the system live.

#### `/wiki narrative refresh [project]`

Run `node scripts/narrative-refresh.mjs [project]`.

Reads every claim file and regenerates `INDEX.md`:
- Most-recently-used claims at the top
- Frame distribution recomputed from frontmatter
- Top under-deployed claims surfaced
- Claims untouched > 90 days flipped to `status: needs-refresh`

Run after every deployment (the log command does this automatically) or on a weekly cron.

### Drafting an op-ed — the canonical workflow

1. `/wiki narrative status contained` — see the gap landscape
2. Pick a frame the campaign has not been leading with (usually `moral`, `confrontational`, or `testimonial` for CONTAINED right now)
3. `/wiki narrative draft contained --frame moral --channel oped --news-hook "..."` — generates a brief
4. Read the brief — confirm the picked claims are the right ones; if not, re-run with `--claim` to target a specific one
5. Write the op-ed against the **What we haven't said yet** sections, not from memory
6. **Verify every stat against `STAT-CONFLICTS.md` before publishing.** A hostile journalist will check the math.
7. After publishing: `/wiki narrative log <each-claim-id> <channel> --source <url> --variant "<the actual line>"` for each claim used
8. The system now knows the claim has been used, the next draft will skip it, and the index updates automatically

### Rules for narrative ops

- **Never edit `INDEX.md` by hand.** It's auto-regenerated by `narrative-refresh.mjs` from the claim file frontmatter. Edit individual claim files instead.
- **Never invent stats.** Every number must trace to a `sources:` entry in a claim file. If it isn't sourced there, it doesn't go in a draft.
- **Always log deployments.** A claim that was used but not logged looks "starved" to the next draft and gets recommended again — producing the exact "we've said this so many times" loop the system exists to prevent.
- **The brief is not the post.** The brief tells you which claims to build on. You (or the model) still write the post. Then you log it.
- **Cross-project pollination.** A claim in one project (e.g. `claim-built-by-hand` for CONTAINED) can be referenced via `related_claims` in another project's claim file. The narrative store is a graph, not a folder.

### Ingestion — how the system learns from new content

The narrative store does not depend on humans hand-extracting every claim. It has a one-command ingestion pipeline that reads new content from any source — local files, JSON exports, scraped pages, database queries — and produces a structured **digest** that proposes which claims to update or create.

#### `/wiki narrative ingest <path>`

Run `node scripts/narrative-ingest.mjs <path> --project <slug> --source-type <type>`.

The script walks the path (file or folder), extracts:
- **Stats** — every dollar figure, percentage, and unit count via regex
- **Named quotes** — `"..." — Name` patterns
- **Argument paragraphs** — paragraphs containing trigger phrases (`The argument is`, `The decision rule`, `The point is`, etc.)
- **Headings** — section structure for context
- **Likely matches** — keyword overlap against every existing claim file

It writes a digest to `wiki/output/narrative-ingest/<date>-<source>.md` that lists each finding with a suggested action: *log as a variant of claim-X*, *file as new claim*, *log as audience reaction*, or *file in `wiki/decisions/` instead because this is operational not narrative*.

The script does **not** call an LLM API. It's heuristic. The point is to give Claude (you) a structured handoff so that processing the digest is one command, not a multi-hour read.

#### `/wiki narrative process <digest>`

Open the digest, walk through each finding, and apply the suggested actions:
1. For "log as variant" findings → `node scripts/narrative-log-deployment.mjs <claim-id> <channel> --source <path> --variant "<line>"`
2. For "new claim" findings → write a new `claim-*.md` file using the template
3. For "audience reaction" findings → edit the matched claim file's `## Audience reactions logged` section directly
4. For "file in decisions" findings → write to `wiki/decisions/` instead, do not pollute the narrative store

After processing, run `narrative-refresh` (or wait — the log command auto-refreshes).

#### `/wiki narrative watch [--schedule daily|weekly]`

Run `node scripts/narrative-watch.mjs [--schedule <s>] [--source <id>]`.

Reads `wiki/narrative/sources.json` — a config of every source the system watches — and ingests anything new since the last run. Tracks last-seen via `wiki/narrative/.seen.json`. Drop into a cron / launchd loop and the inbox fills automatically with digests for review.

### Sources — what the system can learn from

`wiki/narrative/sources.json` lists every connected source. Edit that file to add new ones. Currently configured:

| Source | Type | Project | Wired |
|---|---|---|---|
| `act-wiki-raw-essays` | folder (`wiki/raw/`) | contained | ✅ |
| `justicehub-compendium` | folder (JusticeHub) | contained | ✅ |
| `justicehub-output-emails` | folder | contained | ✅ |
| `justicehub-linkedin-engagement` | folder (JSON) | contained | ✅ (basic) |
| `justicehub-output-goods` | folder | goods-on-country | ✅ |
| `contained-site-content` | folder (Astro src) | contained | ✅ |
| `supabase-articles` | Supabase MCP query | auto | ⏳ adapter needed |
| `empathy-ledger-stories` | EL v2 Supabase | auto | ⏳ adapter needed |
| `ghl-contact-responses` | GHL API | auto | ⏳ adapter needed |
| `act-place-website` | URL scrape | auto | ⏳ adapter needed |

To wire a new source:

1. Add it to `sources.json` with `wired: true` if it's a local folder, or `wired: false` if it needs an adapter
2. For local folders, no code needed — `narrative-watch.mjs` picks it up automatically
3. For Supabase / GHL / EL APIs, add an adapter case in `narrative-watch.mjs` that fetches the data, writes it to a temp `.md` file, then calls `narrative-ingest.mjs` on that file
4. For URL scrapes, use `firecrawl_scrape` (MCP) and pipe the result through ingest

### Cross-project linking

Claim files can reference claims in other projects via `related_claims: [project:claim-id, ...]`. Example: `goods-on-country/claim-bed-to-courtroom.md` references `contained:claim-goods-on-country-bed-pipeline`. The same argument can live in multiple projects with different framings, and the relationship is explicit.

This is how the strategy compounds across the ecosystem — a Goods on Country pitch can pull a CONTAINED claim, a CONTAINED essay can pull a Goods claim, and the deployment-logging flows in both directions.

### Funder targeting (`--funder <slug>`)

`wiki/narrative/funders.json` lists every active funder with their thesis tags, stage, deadline, primary contact, and the specific claims that should lead any pitch to them. The draft script reads this file when invoked with `--funder`:

```bash
node scripts/narrative-draft.mjs contained \
  --funder qbe-catalysing-impact \
  --channel pitch --length long
```

The script:
1. Loads claims from **all** projects (so cross-project picks work — a QBE pitch can pull both `contained:` and `goods-on-country:` claims)
2. Pulls exactly the claims listed in `funders[slug].claims_to_lead_with`
3. Refuses to include any claim in `claims_to_avoid`
4. Includes the funder's framing notes, tone, and deadline at the top of the brief
5. Logs the pitch via the same deployment workflow

When you add a new funder to the pipeline, add them to `funders.json`. When a funder's thesis shifts, update their `claims_to_lead_with`. The system does not infer the right pitch — you tell it once, then it applies the same logic forever.

### Campaign cycle filtering (`--cycle <phase>`)

Claim files can carry a `cycle:` array in frontmatter — `pre-launch`, `launch`, `tour-stop`, `budget-week`, `funder-pitch`, `term-sheet`, `election-cycle`, `always`, etc. The draft script filters by cycle:

```bash
node scripts/narrative-draft.mjs contained --cycle budget-week --frame confrontational
```

Pick the cycle when the campaign moment changes — launch week, budget week, parliament sitting, election, term sheet pending. Claims that don't carry the matching cycle tag are excluded from the pool, so the brief only shows what's appropriate for the moment.

### Weekly strategy review (`/wiki narrative review`)

Run `node scripts/narrative-strategy-review.mjs [project]` weekly. It writes `wiki/narrative/<project>/STRATEGY-REVIEW.md` containing:

- **Frame budget** — actual vs recommended distribution, with `over` / `starved` flags. The "what frame should I lead with this week" answer in one table.
- **Audience coverage** — under-served audiences flagged
- **Channel freshness** — when each channel was last touched, color-coded by recency
- **Cold claims** — anything untouched 30+ days, ranked
- **Funder pipeline** — funders with open asks whose lead-with claims have gone cold (14+ days). Names the specific funder and the specific claim.
- **Cycle coverage** — how many claims tagged for each cycle phase
- **This week's recommended actions** — 3-4 concrete commands to run

The strategy review file IS the campaign retro. No meeting required — open the file Monday morning, run the recommended commands, ship the post.

### Wired sources

Every adapter is built and wired in `narrative-watch.mjs`:

- **Local folders** — JusticeHub compendium, output, contained-site content, wiki/raw, Goods folder
- **`scripts/narrative-adapters/supabase-articles.mjs`** — pulls published articles from the shared Supabase, routes by tag/category to the right project, ingests
- **`scripts/narrative-adapters/el-stories.mjs`** — pulls Empathy Ledger v2 stories with **default-deny consent enforcement** (`internal-only` is refused at the adapter layer; `with-care` is tagged in the digest so downstream draft scripts respect the constraint)
- **`scripts/narrative-adapters/ghl-responses.mjs`** — pulls contact notes for `contained-*` and `goods-*` tagged contacts via the existing `GHLService`
- **`scripts/narrative-adapters/url-scrape.mjs`** — fetches a URL, converts to text, diffs against last snapshot at `wiki/narrative/.url-snapshots/`, only ingests if changed. Falls back to plain `fetch` + HTML→text; uses Firecrawl if `USE_FIRECRAWL=1` and `FIRECRAWL_API_KEY` are set.

Run all of them at once:

```bash
node scripts/narrative-watch.mjs                  # daily + weekly sources
node scripts/narrative-watch.mjs --schedule daily
node scripts/narrative-watch.mjs --source supabase-articles  # single source
```

`narrative-watch.mjs` dispatches by `source.type` to the right adapter, deduplicates against `wiki/narrative/.seen.json`, and leaves digests in the inbox for `/wiki narrative process`.
