---
title: Sources Index
status: Auto-maintained
cluster: sources
---

# Sources

> One summary per ingested raw file. The bridge between the immutable `raw/` folder and the curated wiki.

When a document, transcript, or article is ingested via `/wiki ingest`, two things happen:

1. The original is saved verbatim to [[../raw/index|wiki/raw/]] (immutable)
2. A summary page is created here in `sources/` that captures: the key facts, the entities mentioned, the concepts referenced, and which wiki articles were created or updated as a result

This separation matters: `raw/` is the historical record, `sources/` is the *processed* layer the LLM uses to navigate. Concept and entity articles synthesize *across* sources; this folder lets you trace any wiki claim back to its specific origin.

## Source articles

_(This index is auto-maintained. New source summaries appear here as raw files are ingested.)_

## Backlinks

- [[../raw/index|raw/]] — the immutable originals
- [[../synthesis/index|synthesis/]] — answers built on top of sources
- [[../concepts/llm-knowledge-base|LLM Knowledge Base pattern]] — why this folder exists
