# Tractorpedia

> ACT's living knowledge base — named after A Curious Tractor, powered by the [[llm-knowledge-base|Karpathy LLM Knowledge Base pattern]]. Every interaction makes the system smarter. Humans curate, LLM maintains.

**Status:** Active  
**First compiled:** 2026-04-06  
**Articles:** 14+  
**Domains:** projects, concepts, communities, people, art, finance, technical, decisions, research

---

## What It Is

Tractorpedia is ACT's institutional memory made queryable. It is not a static documentation site — it is a living knowledge base that compounds over time. Every raw source ingested, every article compiled, every gap surfaced by the linter adds to a body of knowledge that future agents and humans can draw on.

The name pays homage to the organisation: **A Curious Tractor** — curious, ground-level, working the soil of knowledge so that better ideas can grow.

Tractorpedia is the meta-layer above ACT's operational tools. Where Supabase holds structured data (587K entities, $74B contracts, grant records), Tractorpedia holds the *meaning* — the context, the relationships, the narrative that makes the data legible.

---

## How It Works

The system follows the [[llm-knowledge-base|Karpathy LLM Knowledge Base pattern]]:

```
Raw Sources → LLM Compilation → Articles → Query & Grow → Knowledge Compounds
```

**1. Raw sources** go into `wiki/raw/` — immutable. These are the ground truth: transcripts, meeting notes, scraped research, financial summaries, field reports. They are never edited once ingested.

**2. LLM compiles articles** from raw sources into domain directories (`concepts/`, `projects/`, `research/`, etc.). Articles are written in plain Markdown with `[[wikilink]]` cross-references. The LLM synthesises, never fabricates — every claim traces back to a raw source.

**3. Query and grow** — the `/wiki` skill allows agents and humans to query the knowledge base, ingest new sources, find gaps, and enrich articles with new data.

**4. Knowledge compounds** — backlinks connect articles across domains. Linting surfaces contradictions and stale facts. Over time, the wiki develops genuine institutional depth.

---

## The `/wiki` Skill

The `/wiki` slash command is the primary interface for operating Tractorpedia. Available operations:

| Operation | Description |
|-----------|-------------|
| `ingest` | Add a raw source document and compile it into articles |
| `query` | Ask a question against the knowledge base |
| `lint` | Find gaps, contradictions, and new article candidates |
| `enrich` | Pull in fresh data (Supabase, Xero, external APIs) to update articles |
| `status` | Show article count, domain coverage, last compiled date |

**Example usage:**
```
/wiki query "What is ACT's relationship with Palm Island?"
/wiki ingest raw/picc-annual-report-2025.md
/wiki lint --domain projects
/wiki enrich civicgraph --from supabase
```

---

## Visual Frontend: Wikipedia-Style HTML Viewer

Tractorpedia has a Wikipedia-style HTML frontend that renders the `wiki/` directory as a browsable knowledge base. Key features:

- **Article navigation** with breadcrumbs and domain categories
- **Wikilink resolution** — `[[civicgraph]]` renders as a clickable link to the CivicGraph article
- **Backlink display** — each article shows which other articles link to it
- **Search** across all articles and raw sources
- **Provenance indicators** — articles show their source documents and last-compiled date

The frontend is intentionally simple — a single HTML file with no build step, readable by any browser, deployable anywhere.

---

## Obsidian Backend

The `wiki/` directory is structured as an **Obsidian vault**. This means:

- Any team member can open `wiki/` in Obsidian to browse the knowledge base locally
- The graph view in Obsidian visualises the full network of wikilinks across all articles
- Obsidian's backlink panel shows every article that references a given concept
- The vault structure (`concepts/`, `projects/`, `communities/`, etc.) maps directly to Obsidian folder organisation
- Tags and frontmatter are Obsidian-compatible

This gives Tractorpedia a **dual interface**: the HTML viewer for external sharing and presentation, and the Obsidian vault for internal editorial work and graph exploration.

---

## Connection to Empathy Ledger

[[empathy-ledger|Empathy Ledger]] is the connective tissue between Tractorpedia and the people whose stories the knowledge base holds.

Where Tractorpedia stores the *knowledge about* a project or community, Empathy Ledger stores the *lived experience within* it — photos, stories, consent records, media artefacts. The two systems are linked:

- **Project articles** in Tractorpedia can reference EL collections via the EL API
- **Community articles** can surface story counts and consent-verified media
- **People articles** can link to their EL storyteller profiles (with permission)
- The EL API provides a sovereign data layer — Tractorpedia never stores Indigenous stories directly, it holds *references* to them, with sovereignty remaining with the storyteller and community

This architecture honours [[indigenous-data-sovereignty|Indigenous Data Sovereignty]] — Tractorpedia is a map, not the territory. The territory belongs to the people.

---

## Connection to CivicGraph

[[civicgraph|CivicGraph]] is Tractorpedia's most data-rich domain. Where Tractorpedia holds narrative knowledge, CivicGraph holds structured civic data: 587K entities, $74B in tracked contracts, political donation flows, justice funding streams.

The connection matters because CivicGraph exemplifies exactly what Tractorpedia is trying to do at the narrative level: **make complex systems legible**.

This aligns directly with Andrej Karpathy's civic transparency vision (see [[civic-transparency-movement|Civic Transparency Movement]]): AI systems that process public data to make government and institutions accountable to the people they serve. CivicGraph already does this structurally. Tractorpedia adds the narrative layer — the "why" behind the numbers, the relationships between the entities, the human stories that give the data meaning.

---

## "Seeing Like a State" — Reversed

The political theorist James C. Scott described how modern states make society *legible* — cadastral maps, standardised surnames, monoculture farming — in order to administer and control it. The problem is that this simplification destroys local knowledge and community complexity.

Tractorpedia, and ACT's broader mission, inverts this dynamic:

**Instead of states making society legible, society makes the state legible.**

AI tools can now process the full corpus of government procurement records, grant disclosures, lobbying registrations, and legislative text at a scale no individual or organisation could previously manage. CivicGraph is exactly this inversion — it takes the raw output of government administration and makes it navigable by citizens, journalists, researchers, and communities.

Tractorpedia is the knowledge layer that gives this data human meaning. The [[third-reality|Third Reality]] methodology connects the structural (what government does) with the experiential (what communities feel). That gap is where accountability lives.

---

## Vision

Every interaction makes the system smarter.

- A field worker files a trip report → it becomes a raw source → the community article is updated
- A grant application succeeds → the finance article is enriched with the outcome
- A new precedent is discovered → the research section grows
- A contradiction is surfaced → an article is corrected and the provenance is documented

The goal is not a perfect encyclopedia. It is a **good enough, always-improving** knowledge base that makes ACT's institutional knowledge survives turnover, scales with the organisation, and remains accountable to the communities it serves.

Humans curate. The LLM maintains.

---

## Backlinks

- [[llm-knowledge-base|LLM Knowledge Base]] — the pattern this implements
- [[third-reality|The Third Reality]] — methodology connecting structural and experiential knowledge
- [[civicgraph|CivicGraph]] — the most data-rich domain in Tractorpedia
- [[empathy-ledger|Empathy Ledger]] — sovereign story layer linked through EL API
- [[indigenous-data-sovereignty|Indigenous Data Sovereignty]] — why Tractorpedia holds references, not stories
