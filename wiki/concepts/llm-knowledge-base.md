# LLM Knowledge Base

> Raw data compiled by LLM into a .md wiki, operated on by agents to do Q&A and incrementally enhance. You rarely edit the wiki manually — it's the domain of the LLM.
> — Andrej Karpathy, April 2026

## The Pattern

A three-layer architecture where LLMs incrementally build and maintain a persistent wiki — sitting between raw sources and the user. Unlike RAG, which re-derives knowledge each query, the wiki compounds over time.

### Layer 1: Raw Sources (Immutable)
Articles, papers, repos, datasets, images the LLM reads but never modifies. Stored in `raw/`.

### Layer 2: The Wiki (LLM-Generated)
Markdown files the system owns entirely — summaries, entity pages, cross-references. The LLM keeps these current. Organized by domain, not chronology.

### Layer 3: The Schema
Convention documents (like CLAUDE.md) that tell the LLM how to maintain structure and consistency.

## Key Operations

| Operation | What Happens |
|-----------|-------------|
| **Ingest** | New source → LLM reads, writes summary, updates indices, revises related pages, logs activity |
| **Query** | Search relevant pages, synthesize answer, file valuable results back as new pages |
| **Lint** | Health-check for contradictions, stale claims, orphaned pages, missing cross-references |
| **Output** | Render markdown, slideshows (Marp), visualizations (matplotlib) — all viewable in Obsidian |

## Why It Works

"The tedious part of maintaining a knowledge base is the bookkeeping." LLMs don't abandon wikis due to maintenance burden. They handle updates across many files simultaneously. Humans curate sources and direct analysis; LLMs manage consistency.

## Token Efficiency

The @jshph/digest agent + Enzyme compile-time index demonstrates radical efficiency:
- First turn: 2,351 tokens in, 806 out
- Second turn with semantic search: 5,662 in, 1,527 out
- Compare: explore-mode agents burn 60-90K tokens to orient

8ms semantic lookup, pre-computed before session starts. Small enough for a 4B local model.

## How ACT Uses This Pattern

This wiki (`wiki/`) is itself an implementation of this pattern. Additionally:

### For CivicGraph / CivicScope
- Raw government data (AusTender, ACNC, AEC, AIHW) → compiled into civic wiki articles
- Autonomous agents continuously lint for contradictions between government claims and lived experience
- Auto-generate Third Reality assessments from compiled knowledge

### For PICC / Community Archives
- Local hardware + Gemma 4 E4B = sovereign, offline knowledge base
- Mukurtu CMS + TK Labels = culturally governed AI
- 20 years of community history compiled into queryable intelligence

### For Empathy Ledger
- Stories compiled with consent protocols as frontmatter
- Thematic analysis surfaces patterns across narratives
- Connections between individual stories and systemic data auto-discovered

### For Grant Applications
- Agent reads relevant project + community + evidence articles
- Synthesizes grant narratives that understand relationships between projects
- Every claim traceable to a source article

## Farzapedia Variant (Personal Wiki)

Farza's implementation uses diary entries, Apple Notes, and iMessage conversations to build a personal Wikipedia — 400+ articles organized as `people/`, `projects/`, `philosophies/`, `patterns/`, `eras/`, `decisions/`. Agent reads `index.md` and drills into specific pages. Adding new content triggers updates to 2-3 existing articles.

Key difference from ACT: personal vs. organizational. ACT's wiki is multi-stakeholder, multi-project, and has compliance/financial dimensions.

## Why It Matters To ACT's Public System

For ACT this pattern is not about a personal "brain clone." It is the memory discipline underneath the public ecosystem:

- the raw capture layer holds clipped articles, exports, transcripts, and operational snapshots
- the wiki compiles those into durable project, concept, story, and decision pages
- [[living-website-operating-system|Living Website Operating System]] then lets the websites compose that memory with live EL media and stories

That means the wiki is not separate from the website system. It is the thing that stops the sites from becoming fragmented content stores.

## Tools & Extensions

- **Obsidian** — frontend for viewing wiki, raw data, visualizations
- **Git** — version control, provenance via commit history
- **Enzyme** — compile-time semantic index for fast retrieval
- **@jshph/digest** — 2,400-line open source agent
- **Marp** — markdown to slides
- **Gemma 4 E4B** — local model for sovereign, offline operation

## Backlinks

- [[third-reality|The Third Reality]] — the methodology this architecture enables
- [[local-ai-architecture|Local AI Architecture]] — technical implementation
- [[picc|Palm Island Community Company]] — sovereign knowledge base build
- [[continuous-pipeline|Continuous Pipeline Architecture]] — ACT's concrete operating decision for keeping this pattern alive over time
- [[living-website-operating-system|Living Website Operating System]] — how ACT turns this knowledge-base pattern into a public publishing system
- [[act-knowledge-ops-loop|ACT Knowledge Ops Loop]] — the repeatable ACT workflow for capture, compile, lint, sync, publish, and learn
