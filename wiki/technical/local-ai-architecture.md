# Local AI Architecture

> Edge computing + sovereign models = community-owned intelligence that never leaves country.

## The Problem

Cloud-based AI requires uploading sensitive cultural knowledge, personal trauma narratives, and community data to corporate servers. This is incompatible with Indigenous data sovereignty, CARE principles, and community trust.

## The Solution: Sovereign Edge AI

Run AI entirely on local hardware. Data never leaves the community's physical control.

## Architecture Layers

### 1. Hardware Layer (On-Country Edge Computing)

No massive server farms needed. Consumer-grade hardware with unified memory:

| Option | RAM | Use Case |
|--------|-----|----------|
| Mac Studio (M-series) | 64-128GB | Primary recommendation for PICC |
| NVIDIA RTX 5090 PC | 32GB VRAM | Alternative for GPU-intensive work |
| Laptop (M3/M4 Pro) | 36-48GB | Mobile/portable deployment |

### 2. Model Layer (Local LLM)

**Primary model:** Google Gemma 4 E4B (4.5B effective parameters)
- Runs offline on consumer hardware
- GGUF quantized format via LM Studio or Ollama
- Token-efficient: 2,351 in / 806 out for first turn
- No API keys required at query time

**Inference engines:**
- LM Studio (GUI, easy setup)
- Ollama (CLI, scriptable)

### 3. Ingestion Layer (Obsidian Vault)

Raw sources → standardized Markdown in Obsidian vault:

```
vault/
  raw/                  # Immutable source documents
    pdfs/               # Government reports, PICC docs
    transcripts/        # Empathy Ledger stories
    scraped/            # Web content converted to .md
  wiki/                 # LLM-compiled articles
    projects/
    people/
    community/
    evidence/
  index.md              # Master catalog
```

**Conversion tools:**
- Obsidian Web Clipper (articles → markdown)
- MarkItDown / Apify (PDF/HTML → markdown)
- Custom scripts for database exports

### 4. Governance Layer (TK Labels as Code)

Every markdown file carries YAML frontmatter with cultural protocols:

```yaml
---
title: Elder Stories - Hull River
tk_labels:
  - TK-Community-Voice
  - TK-Culturally-Sensitive
access: elders-only
consent: ongoing
fpic_date: 2026-03-15
community: bwgcolman
language_group: manbarra
---
```

AI agents read frontmatter BEFORE processing. Cannot synthesize restricted content.

Integration with Mukurtu CMS via Drupal MCP provides institutional-grade governance.

### 5. Agent Layer (Autonomous Librarian)

**Primary agent:** @jshph/digest (2,400 lines, open source)
**Alternative:** Custom LangGraph agent

**Capabilities:**
- Compile raw sources into wiki articles
- Maintain backlinks and cross-references
- Run health checks (contradictions, gaps, orphaned pages)
- Answer queries by navigating wiki
- Generate outputs (markdown reports, Marp slides, visualizations)

### 6. Index Layer (Compile-Time Semantic Search)

**Tool:** Enzyme
- Pre-computes semantic index before session starts
- 8ms lookup time
- No runtime vector database needed
- Dramatically reduces token usage vs. explore-mode agents

## Token Economics

| Approach | Tokens per query | Cost |
|----------|-----------------|------|
| Cloud explore-mode agent | 60,000-90,000 | $0.30-0.90 |
| @jshph/digest + Enzyme | 2,300-5,700 | $0 (local) |
| **Saving** | **90-97%** | **100%** |

## Federated Learning (Future)

Multiple community models can share learnings without sharing raw data:
- NT community model + QLD community model collaborate
- Mathematical improvements (weights) shared, not stories
- Privacy-preserving collaboration across the JusticeHub network

## Language Model Fine-Tuning (Future)

Indigenous languages can be embedded into localized models:
- 123 spoken Indigenous languages in Australia, many severely endangered
- Jingulu syntax translates efficiently to AI commands
- Conversational AI tested for Wororra cultural knowledge engagement
- Models become tools for **cultural continuity**, not just information retrieval

## Implementation Priority

1. **Now:** Set up Mac Studio + Ollama + Gemma 4 E4B for PICC
2. **Now:** Convert PICC's scraped history to Obsidian vault with TK frontmatter
3. **Month 1:** Deploy @jshph/digest agent, build initial wiki from 20 years of documents
4. **Month 2:** Connect Enzyme index, enable fast Q&A
5. **Month 3:** Generate 20th anniversary materials from compiled wiki
6. **Future:** Federated learning across community network, language model fine-tuning

## Backlinks

- [[llm-knowledge-base|LLM Knowledge Base]] — the pattern
- [[indigenous-data-sovereignty|Indigenous Data Sovereignty]] — governance framework
- [[picc|Palm Island Community Company]] — primary deployment site
- [[empathy-ledger|Empathy Ledger]] — narrative content source
