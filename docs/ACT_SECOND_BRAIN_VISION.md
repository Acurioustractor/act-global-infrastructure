# ACT Second Brain Dashboard

**Vision Document | January 2026**

A unified semantic search platform that aggregates all ACT ecosystem data into a beautiful, searchable knowledge base - combining the glassmorphic elegance of BK Goals 2026 with the data aggregation power of the semantic search platform pattern.

---

## The Vision

Your "second brain" for the ACT ecosystem - a single dashboard where you can:
- **Search everything** semantically across all 7 projects, Notion, Gmail, Slack, and local files
- **See at a glance** what's happening across the ecosystem
- **Surface insights** that connect dots across projects
- **Track relationships** and engagement with community members
- **Plan and reflect** using the moon cycle system you love

---

## Architecture: Three Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│        (Glassmorphic UI - BK Goals 2026 Style)                  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Morning  │  │ Semantic │  │ Project  │  │  Moon    │       │
│  │  Brief   │  │  Search  │  │  Health  │  │ Cycles   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                    INTELLIGENCE LAYER                            │
│        (Semantic Search + AI Analysis)                          │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Hybrid Search    │  │ AI Enrichment    │                    │
│  │ (Vector + BM25)  │  │ (Claude/Local)   │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Embeddings       │  │ Knowledge Graph  │                    │
│  │ (BGE/MiniLM)     │  │ (Relationships)  │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                    DATA LAYER                                    │
│        (Multi-Source Aggregation)                               │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Notion  │ │ Gmail   │ │ GitHub  │ │ Local   │ │ Supabase│  │
│  │ (17 DBs)│ │ (OAuth) │ │ (API)   │ │ (Files) │ │ (EL+All)│  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ Slack   │ │ GHL CRM │ │ Calendar│ │ LinkedIn│              │
│  │ (SDK)   │ │ (API)   │ │ (OAuth) │ │ (Import)│              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Visual Design: Glassmorphic Elegance

### Inspired by BK Goals 2026

```css
/* Design Tokens - ACT Brand */
:root {
  /* ACT Green (Primary) */
  --act-50: #e8f5e9;
  --act-500: #2e7d32;    /* ACT signature green */
  --act-600: #1b5e20;

  /* Ocean Blue (Secondary) */
  --ocean-50: #e3f2fd;
  --ocean-500: #1976d2;
  --ocean-600: #1565c0;

  /* Warm Earth (Accent) */
  --earth-50: #fff3e0;
  --earth-500: #e65100;

  /* Glassmorphic */
  --surface: rgba(255, 255, 255, 0.85);
  --surface-dark: rgba(15, 23, 42, 0.85);
  --stroke: rgba(15, 23, 42, 0.08);
  --shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
}
```

### UI Components

1. **Animated Backdrop Orbs** - Green and blue gradient orbs drifting
2. **Glassmorphic Cards** - `backdrop-filter: blur(16px)`
3. **Staggered Reveal Animations** - `animation-delay: var(--delay)`
4. **Fluid Typography** - `clamp(2rem, 3vw, 3.5rem)`
5. **Status Indicators** - Color-coded project health

---

## Dashboard Sections

### 1. Hero: Morning Brief

```
┌─────────────────────────────────────────────────────────────┐
│  🌅 MORNING BRIEF                              Jan 17, 2026 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                             │
│  ┌─────────────────────┐  ┌────────────────────────────┐  │
│  │ 🌙 MOON CYCLE 2     │  │ ECOSYSTEM HEALTH           │  │
│  │ "Build + Create"    │  │ ████████████░░ 85%        │  │
│  │                     │  │                            │  │
│  │ Day 12 of 28        │  │ Active: 5  Stale: 2       │  │
│  │ Feb 6 - Mar 5       │  │ Last sync: 2 min ago      │  │
│  └─────────────────────┘  └────────────────────────────┘  │
│                                                             │
│  TODAY'S FOCUS                                              │
│  • 3 emails need response (high priority contacts)          │
│  • JusticeHub sprint review at 2pm                          │
│  • Empathy Ledger partner demo prep                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Semantic Search Bar

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Search your second brain...                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ "grant opportunities for youth programs"              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Filters: [All ▾] [Notion] [Gmail] [GitHub] [Files]        │
│  Mode: [Semantic ●] [Keyword] [Hybrid ○]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Search Results (Hybrid)

```
┌─────────────────────────────────────────────────────────────┐
│  RESULTS (23 matches)                    Sort: Relevance ▾  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📧 Gmail | Re: QGC Community Grants 2026              │ │
│  │ From: Sarah Chen | 3 days ago | Tier: High            │ │
│  │ "...youth-focused programs eligible for up to $50k..." │ │
│  │ Relevance: 94% (semantic: 0.89, keyword: 0.92)        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📓 Notion | JusticeHub Grant Strategy                 │ │
│  │ Project: JusticeHub | Updated: Jan 15                 │ │
│  │ "...targeting youth justice diversion programs..."     │ │
│  │ Relevance: 91% (semantic: 0.91, keyword: 0.85)        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📁 File | /The Harvest/grants/youth-programs.md       │ │
│  │ Local file | Modified: Jan 10                         │ │
│  │ "...community youth engagement framework..."          │ │
│  │ Relevance: 87% (semantic: 0.88, keyword: 0.78)        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Project Health Grid

```
┌─────────────────────────────────────────────────────────────┐
│  📊 ECOSYSTEM HEALTH                          [Sync All ↻]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 🎨 Studio│ │ 📖 EL    │ │ ⚖️ JH    │ │ 🌾 Harvest│      │
│  │ ● Active │ │ ● Active │ │ ○ Stale  │ │ ● Active │      │
│  │ 2h ago   │ │ 5h ago   │ │ 3d ago   │ │ 1h ago   │      │
│  │ 12 files │ │ 8 files  │ │ 3 files  │ │ 5 files  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ 📦 Goods │ │ 🌱 Farm  │ │ 🧠 Intel │                   │
│  │ ● Active │ │ ○ Stale  │ │ ● Active │                   │
│  │ 4h ago   │ │ 5d ago   │ │ 30m ago  │                   │
│  │ 2 files  │ │ 1 file   │ │ 15 files │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5. Data Source Status

```
┌─────────────────────────────────────────────────────────────┐
│  📡 DATA SOURCES                              [Settings ⚙]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                             │
│  Source          Records    Size     Last Sync   Status     │
│  ─────────────────────────────────────────────────────────  │
│  📓 Notion       2,847      45MB     2min ago    ● Synced   │
│  📧 Gmail        12,432     128MB    5min ago    ● Synced   │
│  📂 GitHub       1,243      23MB     10min ago   ○ Syncing  │
│  📁 Local Files  8,921      256MB    1hr ago     ● Synced   │
│  💬 Slack        3,456      67MB     15min ago   ● Synced   │
│  📊 Supabase     45,678     1.2GB    Real-time   ● Live     │
│  📱 GHL CRM      892        12MB     30min ago   ● Synced   │
│  📅 Calendar     234        2MB      5min ago    ● Synced   │
│  ─────────────────────────────────────────────────────────  │
│  TOTAL           75,603     1.7GB                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6. Relationship Intelligence

```
┌─────────────────────────────────────────────────────────────┐
│  👥 RELATIONSHIP INTELLIGENCE                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                             │
│  NEEDS ATTENTION (engagement declining)                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Sarah Chen (QGC) - Last contact: 12 days ago         │ │
│  │ David Kim (Philanthropy Aus) - Last contact: 18 days │ │
│  │ Maria Santos (Community) - Last contact: 21 days     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  STRONG CONNECTIONS (active this week)                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ James O'Brien (JusticeHub partner) - 5 touchpoints   │ │
│  │ Emily Watson (Harvest CSA) - 3 touchpoints           │ │
│  │ Nic (Co-founder) - 12 touchpoints                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7. Quick Actions Panel

```
┌─────────────────────────────────────────────────────────────┐
│  ⚡ QUICK ACTIONS                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                             │
│  [📝 Capture Note]  [🔄 Sync All]  [📊 Run Health Check]   │
│                                                             │
│  [📧 Draft Email]   [📅 Schedule]  [🎯 Create Task]        │
│                                                             │
│  [🤖 Ask Claude]    [📓 New Notion] [🔍 Deep Research]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Option A: Enhance ACT Intelligence Platform

Build on top of your existing React infrastructure:

```
/Users/benknight/Code/act-intelligence-platform/
├── src/
│   ├── components/
│   │   ├── SecondBrain/           # NEW
│   │   │   ├── SemanticSearch.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   ├── DataSourceStatus.tsx
│   │   │   ├── ProjectHealth.tsx
│   │   │   └── MoonCycleWidget.tsx
│   │   └── ...existing components
│   │
│   ├── services/
│   │   ├── search/                # NEW
│   │   │   ├── embeddings.ts      # BGE/MiniLM embeddings
│   │   │   ├── vectorStore.ts     # FAISS/pgvector
│   │   │   ├── hybridSearch.ts    # Vector + BM25
│   │   │   └── indexer.ts         # Multi-source indexing
│   │   │
│   │   └── syncers/               # NEW
│   │       ├── notion.ts
│   │       ├── gmail.ts
│   │       ├── github.ts
│   │       ├── localFiles.ts
│   │       └── orchestrator.ts    # Parallel sync
│   │
│   └── hooks/
│       └── useSemanticSearch.ts   # NEW
│
└── server/
    └── api/
        └── search/                # NEW
            ├── embed.ts
            ├── query.ts
            └── sync.ts
```

**Pros:**
- Builds on existing 63 components
- Already has Notion, Gmail, Supabase integrations
- React 19 + TypeScript ready
- Tab-based navigation fits perfectly

**Cons:**
- More complex codebase
- Requires understanding existing patterns

### Option B: Standalone Vanilla Dashboard (BK Goals Style)

Create a new simple dashboard in the spirit of BK Goals 2026:

```
/Users/benknight/act-global-infrastructure/second-brain/
├── index.html           # Main structure
├── styles.css           # Glassmorphic design
├── app.js               # Dashboard logic
├── search.js            # Semantic search client
├── syncers/
│   ├── notion.js
│   ├── gmail.js
│   └── local.js
└── .env.example         # API keys
```

**Pros:**
- Simple, no build step
- Matches BK Goals 2026 style exactly
- Easy to understand and modify
- Fast development

**Cons:**
- Limited for complex interactions
- No TypeScript safety
- Would need a Python backend for embeddings

### Option C: Hybrid Approach (Recommended)

Keep the **vanilla frontend** for the beautiful UI, but use the **ACT Intelligence Platform backend** for data:

```
┌────────────────────────────────────────────────────────────────┐
│                 SECOND BRAIN FRONTEND                          │
│            (Vanilla HTML/CSS/JS - BK Goals Style)              │
└────────────────────────────┬───────────────────────────────────┘
                             │ fetch() API calls
                             ▼
┌────────────────────────────────────────────────────────────────┐
│              ACT INTELLIGENCE PLATFORM API                      │
│           (Express.js - 154 existing endpoints)                 │
│                                                                 │
│  + /api/search/semantic     (new - hybrid search)              │
│  + /api/search/embed        (new - embeddings)                 │
│  + /api/sync/orchestrate    (new - parallel sync)              │
│  + /api/health/ecosystem    (new - 7 project health)           │
└────────────────────────────────────────────────────────────────┘
```

**Why this works:**
1. **Frontend**: Glassmorphic elegance, fast iteration, no build
2. **Backend**: Existing integrations, TypeScript, scalable
3. **Separation**: UI can evolve independently from data layer

---

## Semantic Search Implementation

### Embedding Strategy

```javascript
// Use Sentence Transformers (local) or OpenAI (cloud)
const EMBEDDING_MODEL = "all-MiniLM-L6-v2"  // 384 dimensions, fast
// Alternative: "bge-large-en-v1.5"         // 1024 dimensions, better

// Batch processing with rate limiting
const batchEmbed = async (texts, batchSize = 32) => {
  const batches = chunk(texts, batchSize)
  const results = []

  for (const batch of batches) {
    const embeddings = await embed(batch)
    results.push(...embeddings)
    await sleep(100)  // Rate limit
  }

  return results
}
```

### Hybrid Search (Vector + BM25)

```javascript
// Reciprocal Rank Fusion (RRF)
const hybridSearch = async (query, k = 20) => {
  // Parallel search
  const [vectorResults, bm25Results] = await Promise.all([
    vectorSearch(query, k * 2),
    bm25Search(query, k * 2)
  ])

  // RRF fusion
  const scores = new Map()
  const RRF_K = 60

  vectorResults.forEach((doc, rank) => {
    const score = 1 / (RRF_K + rank)
    scores.set(doc.id, (scores.get(doc.id) || 0) + score)
  })

  bm25Results.forEach((doc, rank) => {
    const score = 1 / (RRF_K + rank)
    scores.set(doc.id, (scores.get(doc.id) || 0) + score)
  })

  // Sort by combined score
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
}
```

### Deduplication

```javascript
// Composite key: source + external_id
const getDocumentKey = (doc) => `${doc.source}:${doc.external_id}`

// Content fingerprinting for cross-source dedup
const getContentFingerprint = (text) => {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim()
  return simhash(normalized)  // Locality-sensitive hash
}
```

---

## Data Sources to Index

### Priority 1 (Core)
- [x] **Notion** - 17 databases (already connected in Intelligence Platform)
- [x] **Gmail** - Emails with contact intelligence (already connected)
- [ ] **Local Files** - All 7 project codebases + docs
- [ ] **Supabase** - Empathy Ledger stories, JusticeHub data

### Priority 2 (Extended)
- [x] **GitHub** - Issues, PRs, commits across repos
- [ ] **Slack** - Channel messages, threads
- [ ] **Calendar** - Events with context

### Priority 3 (Nice to Have)
- [ ] **GHL CRM** - Contact notes, pipeline stages
- [ ] **LinkedIn** - Connection context (already have 4,491 imported)
- [ ] **Claude Conversations** - Curated past chats

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up vanilla frontend with glassmorphic styling
- [ ] Add semantic search API endpoint to Intelligence Platform
- [ ] Implement basic vector search with existing Supabase data
- [ ] Create project health dashboard

### Phase 2: Data Pipeline (Week 2)
- [ ] Build parallel sync orchestrator
- [ ] Index local files from all 7 projects
- [ ] Add BM25 index alongside vector store
- [ ] Implement hybrid search fusion

### Phase 3: Intelligence (Week 3)
- [ ] Add AI-powered morning brief generation
- [ ] Implement relationship intelligence from email patterns
- [ ] Create moon cycle integration
- [ ] Build quick capture with auto-classification

### Phase 4: Polish (Week 4)
- [ ] Staggered reveal animations
- [ ] Dark mode support
- [ ] Mobile responsive design
- [ ] Performance optimization

---

## File Structure (Recommended)

```
/Users/benknight/act-global-infrastructure/
├── second-brain/                    # NEW - Standalone frontend
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── components/
│   │   ├── search.js
│   │   ├── health.js
│   │   └── moon-cycle.js
│   └── README.md
│
├── services/                        # NEW - Backend services
│   ├── search/
│   │   ├── embeddings.py           # Python for ML
│   │   ├── vector_store.py
│   │   └── hybrid_search.py
│   │
│   └── syncers/
│       ├── orchestrator.py
│       ├── notion_sync.py
│       ├── gmail_sync.py
│       └── local_files_sync.py
│
└── config/
    └── second-brain.json            # Data source configuration
```

---

## Next Steps

1. **Decide on approach**: A (enhance Intelligence Platform), B (standalone vanilla), or C (hybrid)?

2. **Start with search**: The semantic search is the core value - get that working first

3. **Iterate on UI**: Use the BK Goals 2026 styling as a template

4. **Connect existing data**: Leverage the integrations already built in Intelligence Platform

---

## Questions to Consider

1. **Primary use case**: Quick lookup? Morning planning? Relationship tracking?

2. **Search priority**: Which sources are most important to search across?

3. **Update frequency**: Real-time sync or periodic batch updates?

4. **AI integration**: Local embeddings (faster, private) or OpenAI (better quality)?

5. **Mobile**: Do you need this on phone/tablet?

---

*This is your second brain - design it to match how you think.*
