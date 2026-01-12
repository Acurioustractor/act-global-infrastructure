# ACT Unified Knowledge Architecture

**Date:** 2026-01-12
**Status:** Architecture Document
**Purpose:** Connect all ACT systems into a living, learning knowledge ecosystem

---

## Vision

> "This is about leaning into new ways of using technology to support the known and dig into the unknown - this is ALMA, this is ACT."

ACT's knowledge isn't stored in one place - it flows through:
- **Stories** captured in Empathy Ledger
- **Projects** documented in the Compendium
- **Pages** published on the Studio website
- **Intelligence** distilled into AI models

This architecture connects them into a **continuous learning loop** where:
1. Community stories become project evidence
2. Project evidence becomes publishable content
3. Published content trains AI models
4. AI models help capture more stories

---

## System Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ACT KNOWLEDGE ECOSYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │  EMPATHY LEDGER │    │    COMPENDIUM   │    │  STUDIO WEBSITE │        │
│  │                 │    │                 │    │                 │        │
│  │ • 328 stories   │ ──►│ • 38 projects   │ ──►│ • 38 projects   │        │
│  │ • 239 tellers   │    │ • 26 vignettes  │    │ • LCAA content  │        │
│  │ • ALMA signals  │    │ • Identity docs │    │ • Impact stats  │        │
│  │ • Descript vids │    │ • Operations    │    │ • Visual media  │        │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘        │
│           │                      │                      │                  │
│           └──────────────────────┼──────────────────────┘                  │
│                                  │                                         │
│                                  ▼                                         │
│                    ┌─────────────────────────┐                             │
│                    │    KNOWLEDGE EXPORT     │                             │
│                    │                         │                             │
│                    │ • 98 QA pairs           │                             │
│                    │ • RAG chunks            │                             │
│                    │ • Search index          │                             │
│                    └───────────┬─────────────┘                             │
│                                │                                           │
│                                ▼                                           │
│                    ┌─────────────────────────┐                             │
│                    │     ACT VOICE MODEL     │                             │
│                    │                         │                             │
│                    │ • v0.1: 88/100 score    │                             │
│                    │ • v1.0: 96/100 score    │                             │
│                    │ • Fine-tuned GPT-4o-mini│                             │
│                    └───────────┬─────────────┘                             │
│                                │                                           │
│                                ▼                                           │
│                    ┌─────────────────────────┐                             │
│                    │   COMMUNITY ACCESS      │                             │
│                    │                         │                             │
│                    │ • RAG chat interface    │                             │
│                    │ • Story search          │                             │
│                    │ • Content generation    │                             │
│                    │ • Philosophy inquiry    │                             │
│                    └─────────────────────────┘                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Systems

### 1. Empathy Ledger v2 (Story Capture)

**Location:** `/Users/benknight/Code/empathy-ledger-v2`

**Capabilities:**
- 328 stories from 239 storytellers
- ALMA v2.0 impact signals (6 dimensions)
- Content Hub API at `/api/v1/content-hub/stories`
- Descript video integration (30+ videos)
- Cultural consent management (4-tier tagging)

**Key Tables:**
- `stories` - Core narrative content
- `storytellers` - Voice owners with consent
- `media_items` - Photos, videos, audio
- `alma_scores` - Impact measurements

**API Endpoints for Integration:**
```
GET  /api/v1/content-hub/stories         # Publishable stories
GET  /api/v1/content-hub/projects/:id    # Stories by project
POST /api/v1/stories/analyze             # ALMA analysis
```

### 2. Compendium (Knowledge Wiki)

**Location:** `/Users/benknight/Code/act-regenerative-studio/compendium/`

**Structure:**
```
compendium/
├── 01-identity/        # Mission, LCAA, principles, voice
├── 02-place/           # Black Cockatoo Valley, Harvest
├── 03-ecosystem/       # 38 projects, platforms
├── 04-story/           # ALMA model, 26 vignettes
├── 05-operations/      # Protocols, governance, AI
├── 06-roadmap/         # 2026 focus, risks
└── appendices/         # Templates, glossary
```

**Gap Analysis (Current State):**
- 38 projects listed
- Only 3 have detailed pages (8% coverage)
- 26 vignettes synced from EL
- 6 art opportunities identified

### 3. Studio Website (Public Face)

**Location:** `/Users/benknight/Code/act-regenerative-studio`

**Tech Stack:**
- Next.js 15 with React 19
- 38 projects in TypeScript data file
- LCAA content structure (listen, curiosity, action, art)
- Theme system: earth, justice, goods, valley, harvest

**Content Fields per Project:**
```typescript
{
  slug: string;
  title: string;
  theme: "earth" | "justice" | "goods" | "valley" | "harvest";
  tagline: string;
  description: string;
  focus: string[];
  listen?: string;       // LCAA
  curiosity?: string;    // LCAA
  action?: string;       // LCAA
  art?: string;          // LCAA
  stats?: ProjectStat[];
  quote?: Quote;
  heroImage?: string;
  videoUrl?: string;
}
```

### 4. ACT Personal AI (Intelligence Layer)

**Location:** `/Users/benknight/act-personal-ai`

**Models:**
- ACT Voice v0.1: 88/100 brand alignment score
- ACT Voice v1.0: 96/100 brand alignment score
- Fine-tuned GPT-4o-mini on ACT content

**Services Built:**
| Service | Purpose | Command |
|---------|---------|---------|
| `page-review.mjs` | Score content for ACT Voice | `node services/page-review.mjs <file>` |
| `gap-analysis.mjs` | Map stories to projects | `node services/gap-analysis.mjs` |
| `compendium-review.mjs` | Audit all project docs | `node services/compendium-review.mjs` |
| `reflect-on-art.mjs` | 5-question art reflection | `node scripts/reflect-on-art.mjs` |
| `fill-gaps.mjs` | Generate project pages | `node scripts/fill-gaps.mjs --project X` |
| `export-knowledge.mjs` | Export for LLM training | `node scripts/export-knowledge.mjs` |

**RAG System:**
- Supabase pgvector with OpenAI embeddings (1536 dimensions)
- Semantic search across all ACT knowledge
- `/api/rag/query` endpoint for natural language questions

---

## Content Flows

### Flow 1: Story → Website

```
Empathy Ledger Story
       │
       │ 1. Record with consent
       ▼
   EL Database (stories, media_items)
       │
       │ 2. Tag with project_slugs
       ▼
   gap-analysis.mjs maps to projects
       │
       │ 3. Extract publishable stories
       ▼
   Content Hub API
       │
       │ 4. Sync to compendium vignette
       ▼
   /compendium/04-story/vignettes/
       │
       │ 5. Link in project page
       ▼
   /compendium/03-ecosystem/projects/
       │
       │ 6. Publish to website
       ▼
   act.place/projects/{slug}
```

### Flow 2: Knowledge → AI Model

```
All ACT Sources
       │
       │ Compendium + EL + Studio
       ▼
   export-knowledge.mjs
       │
       │ 98 QA pairs + RAG chunks
       ▼
   /act-personal-ai/data/knowledge-exports/
       │
       │ Fine-tuning dataset
       ▼
   ACT Voice Model (96/100 score)
       │
       │ Inference
       ▼
   RAG Chat Interface
       │
       │ User queries
       ▼
   Natural language answers about ACT
```

### Flow 3: Gap → Content

```
   gap-analysis.mjs
       │
       │ Identifies missing coverage
       ▼
   fill-gaps.mjs --list
       │
       │ Shows projects needing content
       ▼
   fill-gaps.mjs --project "X"
       │
       │ Generates template with EL data
       ▼
   Project page markdown
       │
       │ Human review + enrichment
       ▼
   /compendium/03-ecosystem/projects/x.md
       │
       │ Sync to studio data
       ▼
   Website project page
```

---

## Brand Voice Alignment Strategy

### ACT Voice Principles

1. **"With" not "for"** - Community partnership, not service delivery
2. **Community authority** - Center who holds power, not ACT achievement
3. **Name place and people** - With consent, honor specific locations
4. **Include the messiness** - Honest about challenges, not just wins
5. **Growth metaphors** - Seeds, harvests, seasons (not extraction)

### Voice Consistency Across Systems

| System | Voice Application |
|--------|-------------------|
| **Empathy Ledger** | Story capture prompts use LCAA framing |
| **Compendium** | All docs follow voice-guide.md patterns |
| **Studio Website** | Project taglines reviewed by page-review.mjs |
| **AI Model** | Trained on voice-aligned content (96/100) |

### Automated Voice Checking

```bash
# Score any content for ACT Voice alignment
node /Users/benknight/act-personal-ai/services/page-review.mjs <file.md>

# Output: Score 0-100 with specific feedback
# Example: "86/100 - Good use of growth metaphors,
#          consider adding community authority framing"
```

---

## Continuous Learning Architecture

### 1. Story Capture Loop

```
Monthly Dinners → Conversations → EL Stories → Vignettes → Website
    │                                              │
    └──────── Community feedback ←─────────────────┘
```

### 2. Knowledge Refresh Cycle

| Cadence | Action | Tool |
|---------|--------|------|
| **On-change** | Sync new EL stories to compendium | gap-analysis.mjs |
| **Weekly** | Generate gap report | compendium-review.mjs |
| **Monthly** | Export updated QA pairs | export-knowledge.mjs |
| **Quarterly** | Retrain ACT Voice model | OpenAI fine-tuning |

### 3. Model Improvement Pipeline

```
New content created
       │
       │ Added to compendium/EL
       ▼
   export-knowledge.mjs
       │
       │ Generate fresh training data
       ▼
   OpenAI Fine-tuning API
       │
       │ Create new model version
       ▼
   page-review.mjs evaluation
       │
       │ Score against test prompts
       ▼
   Deploy if score > 90/100
```

---

## Opening the Model for Anyone

### Public Access Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC ACCESS LAYER                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐               │
│  │   CHAT UI       │    │   API ENDPOINT  │               │
│  │                 │    │                 │               │
│  │ "Ask about ACT" │    │ /api/ask        │               │
│  │ Web interface   │    │ REST/GraphQL    │               │
│  └────────┬────────┘    └────────┬────────┘               │
│           │                      │                         │
│           └──────────┬───────────┘                         │
│                      │                                     │
│                      ▼                                     │
│           ┌─────────────────────┐                         │
│           │    RAG PIPELINE     │                         │
│           │                     │                         │
│           │ 1. Embed query      │                         │
│           │ 2. Search vectors   │                         │
│           │ 3. Retrieve context │                         │
│           │ 4. Generate answer  │                         │
│           └───────────┬─────────┘                         │
│                       │                                    │
│                       ▼                                    │
│           ┌─────────────────────┐                         │
│           │   ACT VOICE MODEL   │                         │
│           │   (96/100 aligned)  │                         │
│           └─────────────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Access Patterns

1. **Web Chat** - act.place/ask - Natural language Q&A
2. **API** - For partners to integrate ACT knowledge
3. **Export** - Downloadable knowledge packs for offline use
4. **Model** - OpenAI model ID for direct inference

### What Anyone Can Ask

- "What is ACT's philosophy?"
- "How does LCAA work?"
- "What projects does ACT run?"
- "Tell me about Empathy Ledger"
- "What is community authority?"
- "How does ALMA measure impact?"

---

## Implementation Roadmap

### Phase 1: Foundation (Done)

- [x] gap-analysis.mjs - Maps EL to projects
- [x] compendium-review.mjs - Audits documentation
- [x] fill-gaps.mjs - Generates content templates
- [x] export-knowledge.mjs - Creates training data
- [x] 98 QA pairs exported

### Phase 2: Content Pipeline (Next 2 weeks)

- [ ] Generate pages for 35 undocumented projects
- [ ] Sync all 28 EL vignettes to compendium
- [ ] Add LCAA content to all studio projects
- [ ] Link Descript videos to project pages
- [ ] Create "Story Gaps" Notion database

### Phase 3: Model Training (Week 3-4)

- [ ] Expand QA pairs to 200+
- [ ] Add RAG chunks from all vignettes
- [ ] Fine-tune new ACT Voice model
- [ ] Evaluate against test prompts
- [ ] Deploy if score > 95/100

### Phase 4: Public Access (Month 2)

- [ ] Build RAG chat UI at act.place/ask
- [ ] Create API documentation
- [ ] Add rate limiting and usage tracking
- [ ] Launch beta to partners
- [ ] Gather feedback and iterate

---

## Key Commands Reference

```bash
# Review compendium coverage
cd /Users/benknight/act-personal-ai && node services/compendium-review.mjs

# See all project gaps
cd /Users/benknight/act-personal-ai && node scripts/fill-gaps.mjs --list

# Generate project page template
cd /Users/benknight/act-personal-ai && node scripts/fill-gaps.mjs --project "Empathy Ledger"

# Export knowledge for training
cd /Users/benknight/act-personal-ai && node scripts/export-knowledge.mjs --format qa --output act-qa.json

# Score content for ACT Voice
cd /Users/benknight/act-personal-ai && node services/page-review.mjs <file>

# Run gap analysis with media
cd /Users/benknight/act-personal-ai && node services/gap-analysis.mjs

# Art reflection (5 questions)
cd /Users/benknight/act-personal-ai && node scripts/reflect-on-art.mjs
```

---

## This IS ACT

This architecture embodies ACT's philosophy:

1. **Story sovereignty** - Community owns their narratives
2. **Designing for obsolescence** - Systems that community can run without us
3. **LCAA in practice** - Listen (capture), Curiosity (analyze), Action (build), Art (share)
4. **Open by default** - Knowledge accessible to anyone who wants to learn
5. **Continuous rhythm** - Not batch processes, but ongoing flow

The goal isn't a perfect static document - it's a living system that grows with the community's stories.

---

*"Every story matters. This architecture makes sure they're heard."*
