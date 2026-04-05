# Raw Sources

This directory contains immutable source documents that are compiled into wiki articles by the LLM. Files here are never modified after ingestion.

## Naming Convention

`YYYY-MM-DD-source-slug.md`

## Ingested Sources

- `2026-04-06-gemini-civicscope-third-reality.md` — Gemini Deep Research conversation on CivicScope, Third Reality, PICC, global precedents, and local AI architecture
- `2026-04-06-karpathy-llm-knowledge-bases.md` — Karpathy tweet thread + gist on LLM wiki pattern
- `2026-04-06-farza-farzapedia.md` — Farza's personal wiki implementation + Claude skill
- `2026-04-06-acco-sector-analysis.md` — Deep research on Aboriginal Community Controlled Organizations and PICC

## How to Ingest New Sources

1. Save source document to this directory with date prefix
2. Ask the LLM to "ingest [filename] to the wiki"
3. LLM will: read source, write/update articles, update index, revise backlinks
4. Source file remains immutable in `raw/`
