# ACT Knowledge System — Idea File

> Inspired by [Karpathy's LLM Knowledge Base pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). This is ACT's version — adapted for an organisational ecosystem, not a personal research wiki.

## The Core Idea

Raw data from every corner of the ACT ecosystem — published articles, meeting notes, Notion projects, website copy, strategic plans, code documentation, Supabase records — is collected, then **compiled by an LLM into a markdown wiki**, then operated on by various tools to do Q&A, generate outputs, and incrementally enhance the knowledge base. You rarely edit the wiki manually. It's the domain of the LLM.

Two frontends:
- **Obsidian** for authoring, graph exploration, and LLM-assisted curation
- **ACT Wikipedia** (`tools/act-wikipedia.html`) for reading — a Wikipedia-skin browser with search, infoboxes, Empathy Ledger photo integration, and domain navigation

## Architecture

```
Sources (immutable)          The Wiki (LLM-compiled)        Schema
  wiki/raw/                    wiki/concepts/                 /wiki skill (SKILL.md)
  Supabase tables              wiki/projects/                 CLAUDE.md
  Notion pages                 wiki/communities/              Article templates
  Published articles           wiki/art/                      Domain taxonomy
  thoughts/shared/             wiki/finance/
  docs/                        wiki/people/
  Webflow sites                wiki/decisions/
  command-center/wiki/         wiki/research/
  compendium/                  wiki/technical/
                               wiki/index.md

Operations                   Actors
  /wiki ingest                 Human: curate sources, ask questions, think
  /wiki query                  LLM Agent: summarise, cross-ref, maintain, compile
  /wiki lint                   Scheduled agents: periodic ingestion + linting
  /wiki enrich
  /wiki present (new)
  /wiki search (new)
```

## What Makes This Different from a Personal Wiki

1. **Organisational memory, not personal notes.** Meeting decisions, project evolution, strategic pivots — this is institutional knowledge that survives people leaving.

2. **Cultural provenance.** TK protocols, Elder review flags, community validation markers. Knowledge about First Nations communities requires governance that a personal wiki doesn't.

3. **Dual-entity context.** Foundation (charitable) + Ventures (trading) means knowledge needs to be legible across legal structures, grant applications, R&D tax claims, and board reporting.

4. **Multi-project ecosystem.** 7+ active projects (Empathy Ledger, JusticeHub, Goods on Country, The Harvest, ACT Farm, Art, Black Cockatoo Valley) each with their own knowledge domains that cross-pollinate.

5. **Living data integration.** Photos from Empathy Ledger, financial data from Xero, CRM data from GHL, project status from Notion — the wiki isn't just text, it's connected to live systems.

## Project Codes — The Universal Key

The `ACT-XX` project code system (`config/project-codes.json`) is already the connective tissue across **every system**: Xero (finances), Notion (projects), GHL (CRM), Supabase (data), Dext (receipts), EL (media), ALMA (evidence). The wiki must use these same codes so that **any wiki article about a project can be traced back to its financials, its CRM contacts, its photos, its meeting notes, and its evidence base**.

### How Codes Connect Systems

```
ACT-OO (Oonchiumpa)
  → Xero:     "ACT-OO — Oonchiumpa" tracking category → revenue, expenses, R&D claims
  → Notion:   project page with status, milestones, team
  → GHL:      tagged contacts, opportunities, pipeline
  → EL:       org "oonchiumpa" (276 photos), storyteller profiles
  → Supabase: project_knowledge records (meetings, decisions)
  → ALMA:     linked interventions and outcomes (JusticeHub)
  → Wiki:     wiki/projects/oonchiumpa.md → compiled article with all of the above
```

### Current Code Coverage

| System | Uses project codes? | Status |
|--------|-------------------|--------|
| `project-codes.json` | Canonical source (55 codes) | Source of truth |
| Wiki articles | Yes — `**Code:** ACT-XX` in status line | 28 project articles with codes |
| Wikipedia viewer | Yes — `projectOrgMap` links slugs to EL orgs | 25 mappings |
| Xero tracking | Yes — `ACT-XX — Name` format | All active projects |
| Supabase `project_knowledge` | Yes — `project_code` column | 55 unique codes in use |
| Notion | Via `notion_page_id` mapping | Mapped in project-codes.json |
| GHL | Via `ghl_tags` mapping | Mapped in project-codes.json |
| Dext | Via `dext_category` | Mapped in project-codes.json |
| EL media | Via `projectOrgMap` in viewer | 25 project→org mappings |

### Wiki Convention

Every project article MUST include the project code in its status line:
```markdown
**Status:** Active | **Code:** ACT-XX | **Tier:** Ecosystem/Studio/Satellite
```

This makes every wiki article a **node in the graph** — from any article, you can trace back to finances (Xero), contacts (GHL), photos (EL), evidence (ALMA), decisions (Supabase), and status (Notion) using the code.

### Tiers as Wiki Organisation

The three tiers from project-codes.json map naturally to wiki sections:
- **Ecosystem** (5 core platforms): EL, JH, Goods, Harvest, Farm — the infrastructure
- **Studio** (art/creative): PICC, Uncle Allan, Photo Studio, CONTAINED, Confessional — art that feeds the ecosystem
- **Satellite** (partnerships): Oonchiumpa, Diagrama, SMART, BG Fit, etc. — community-led projects

The Wikipedia viewer sidebar already uses these groupings. The wiki should mirror them.

## The Four Intellectual Pillars

The wiki should become the deepest available resource on ACT's four core areas of practice:

### 1. Art as System Change
How art creates the conditions for transformation. Uncle Allan's paintings, CONTAINED installations, The Confessional, creative practice as methodology (not decoration). What's the evidence? What are the precedents? What's the theory?

### 2. Data Ownership & Narrative Sovereignty
Empathy Ledger's core thesis: communities own their stories. Indigenous Data Sovereignty principles (CARE, OCAP). How CivicGraph and the Third Reality framework give communities control over how they're represented. Counter-narrative to extractive data practices.

### 3. Civic Scope & Social Systems
Youth justice reform (Diagrama model, CAMPFIRE, Oonchiumpa). How systems actually change — not policy papers, but what happens when community leads. The QLD submission, the Mount Isa work, Palm Island. Evidence that alternative approaches work.

### 4. Regenerative Innovation
The LCAA method (Listen, Curiosity, Action, Art). How ACT builds things differently — not move-fast-break-things, but listen-deeply-build-with. The Farm as literal regeneration. Black Cockatoo Valley. How technology serves country.

## The Full Content Landscape

**~2,900 content files across 4 codebases, 2 databases, and multiple websites.**
Wiki currently has 39 articles from 7 raw sources. That's <2% compiled.

### By Codebase

| Codebase | Content Files | Scale | Key Knowledge Domains |
|----------|--------------|-------|----------------------|
| **act-global-infrastructure** | 771+ | 10M+ chars | Projects, strategy, finance, R&D, ecosystem orchestration |
| **empathy-ledger-v2** | 634+ | 558MB docs | OCAP framework, consent infrastructure, narrative sovereignty, cultural protocols, storytelling systems |
| **JusticeHub** | 596+ | 160K+ lines | ALMA (1,112 interventions), CONTAINED campaign, youth justice evidence, civic tech viral adoption research |
| **GrantScope/CivicGraph** | 351+ | 4.2M records | Power dynamics, funding transparency, 100K entity graph, government procurement intelligence |

### By Content Type (Cross-Repo)

| Content Type | Source | Count | Signal Level |
|-------------|--------|-------|-------------|
| **Published articles** | Supabase `articles` + act.place blogs | 49 | Highest — polished, public |
| **Platform prospectuses** | EL docs/13-platform/ | 3 files (27-44K each) | Very high — vision documents |
| **Campaign bibles** | JH compendium/ | 27 files | High — CONTAINED tour, brand, comms |
| **Strategic plans** | All repos thoughts/plans/ | ~50 files | High — product vision, roadmaps |
| **Research documents** | JH artifacts/research/, GS thoughts/ | ~30 files | High — civic tech, power dynamics, Indigenous advocacy |
| **In-app content hub** | CC public/wiki/ | 56 files (364K) | High — stories, methodology, project docs |
| **Meeting intelligence** | Supabase project_knowledge | 107 meetings (360K chars) | Medium — decisions embedded in noise |
| **Technical docs** | All repos docs/ | 1,100+ files | Medium — architecture, systems, data models |
| **Data pipeline outputs** | GS output/, JH scraper reports | 100+ files | Medium — analytical reports, entity profiles |
| **Archived work** | EL .archive/, JH docs/archive/ | 297 files | Low-medium — historical context, superseded work |
| **Government datasets** | GS data/ | 133 files | Reference — raw public data |

### Tier 1: Published Writing (highest signal, ready to ingest now)

| Source | Count | Example Content |
|--------|-------|----------------|
| Supabase `articles` | 49 published | "Eating the Paperwork" (26K), "The Cure Already Exists" (21K), "Oonchiumpa" (10K), "Spain Diagrama Trip Reflection" (20K) |
| `compendium/identity.md` | 1 | Core identity statement |
| JH `compendium/first-nations-news-oped-draft.md` | 1 (17K) | Op-ed on Indigenous justice |
| EL `content/stories/example-consent-as-infrastructure.md` | 1 (452 lines) | Deep narrative on OCAP as database architecture |

### Tier 2: Vision & Strategy Documents

| Source | Count | Content |
|--------|-------|---------|
| EL `docs/13-platform/EMPATHY_LEDGER_WIKI.md` | 1 (21K) | Mission, pillars, cultural protocols, governance |
| EL `docs/13-platform/EMPATHY_LEDGER_COMPLETE_PLATFORM_PROSPECTUS.md` | 1 (27K) | Full platform vision |
| JH `docs/strategic/STRATEGIC_VISION_2026-2036.md` | 1 (9.7K) | 10-year roadmap with justice metrics |
| GS `MISSION.md` + `WHY.md` + strategy docs | 5+ | Decision infrastructure vision, $107B funding gap |
| CC `apps/command-center/public/wiki/` | 56 files | In-app stories, LCAA methodology, project docs |
| JH `compendium/contained-tour-intelligence.md` | 1 (54K!) | Complete CONTAINED demand mapping |
| JH `compendium/engagement-and-comms-plan.md` | 1 (20.5K) | Partnership outreach strategy |

### Tier 3: Research & Evidence

| Source | Count | Content |
|--------|-------|---------|
| JH `artifacts/research/civic-tech-viral-adoption.md` | 1 | Case studies: Citizens Police Data Project, SeeClickFix, FixMyStreet — how civic tech changes policy |
| JH `artifacts/research/australian-indigenous-advocacy.md` | 1 | Cross-cultural advocacy approaches |
| GS `thoughts/plans/power-dynamics-report.md` | 1 (511 lines) | Australian philanthropy power structures |
| EL `docs/01-principles/` | 3 files | Core philosophical and design principles |
| EL `docs/02-methods/` | 6 files | Research methods and frameworks |
| Supabase `project_knowledge` | 488 records | Meeting decisions (107), actions (234), decisions (58) |
| JH ALMA data | 1,112 interventions | Youth justice evidence base with outcomes |

### Tier 4: External Sources (need scraping)

| Source | Content |
|--------|---------|
| act.place website | Full page copy, project descriptions, team bios |
| justicehub.org.au | Public-facing content, intervention profiles |
| civicgraph.com.au | Product copy, methodology explanation |
| Notion workspace | Full page content beyond synced summaries |
| Webflow CMS (2 sites) | Blog posts, case studies |

### Key Numbers

- **Youth justice evidence**: 1,112 interventions, 840 with outcomes, $3,320/day detention vs $150/day community
- **Funding intelligence**: 100K entities, 672K contracts, 312K donations, 140 donor-contractor overlaps
- **Storytelling platform**: 207 database tables, 131 React components, OCAP-compliant
- **Published writing**: ~200K chars of polished articles on system change, data ownership, civic scope
- **Meeting knowledge**: 360K chars of decisions, strategy shifts, project evolution

## Ingestion Strategy

### Phase 1: Article Backbone (immediate — highest signal)
Export all 49 published Supabase articles into `wiki/raw/` as dated source files. These are polished, public pieces — they become the backbone of wiki articles on system change, data ownership, civic scope, and art.

Key articles to anchor each pillar:
- **Art**: "Creating Spaces for Growth", Uncle Allan content, CONTAINED materials
- **System Change**: "The Cure Already Exists", "Eating the Paperwork", QLD submission
- **Data Ownership**: EL "Consent as Infrastructure" essay, OCAP principles docs
- **Civic Scope**: "Oonchiumpa: What Happens When Community Leads", Diagrama reflection, CAMPFIRE journey

### Phase 2: Cross-Repo Vision Documents
Pull the highest-signal strategic documents from sister repos into `wiki/raw/` with repo-prefixed names:

From **empathy-ledger-v2**:
- `EMPATHY_LEDGER_WIKI.md` (21K) — mission, pillars, cultural protocols, governance
- `EMPATHY_LEDGER_COMPLETE_PLATFORM_PROSPECTUS.md` (27K) — full platform vision
- `content/stories/example-consent-as-infrastructure.md` — OCAP as database architecture
- `docs/01-principles/` — philosophical foundations

From **JusticeHub**:
- `docs/strategic/STRATEGIC_VISION_2026-2036.md` — 10-year youth justice roadmap
- `compendium/contained-tour-intelligence.md` (54K!) — CONTAINED national campaign
- `compendium/engagement-and-comms-plan.md` (20.5K) — partnership strategy
- `compendium/first-nations-news-oped-draft.md` (17K) — Indigenous justice op-ed
- `artifacts/research/civic-tech-viral-adoption.md` — how civic tech changes policy (9 case studies)
- `artifacts/research/australian-indigenous-advocacy.md` — cross-cultural advocacy
- `Conference_Abstract_Submission.md` — "We Know The Way" with Oonchiumpa presenters

From **GrantScope/CivicGraph**:
- `MISSION.md` + `WHY.md` — $107B funding transparency gap
- `thoughts/plans/grantscope-strategy.md` (884 lines) — Australia's Community Capital Ledger
- `thoughts/plans/power-dynamics-report.md` (511 lines) — philanthropy power structures
- `thoughts/shared/civicgraph-product-vision.md` (405 lines) — product positioning

### Phase 3: Command Center Wiki Merge
The 56 files in `apps/command-center/public/wiki/` are a parallel knowledge base with stories and methodology content. Ingest as raw sources, merge into the canonical wiki. Deduplicate where content overlaps.

### Phase 4: Research & Evidence Compilation
- JusticeHub ALMA data summaries — 1,112 interventions, outcomes evidence
- GrantScope entity graph insights — 140 donor-contractor overlaps, funding gaps by postcode
- EL `docs/02-methods/` — research methods and frameworks
- Supabase `project_knowledge` decisions (58 records) — key organisational decisions

### Phase 5: Meeting Intelligence
488 Supabase records. LLM extracts durable knowledge (decisions, strategy shifts, project evolution) from 107 meeting notes. Discard ephemeral action items.

### Phase 6: External Scraping
- act.place website — full page copy, blog posts, project descriptions
- justicehub.org.au — intervention profiles, public content
- civicgraph.com.au — methodology, product copy
- Full Notion page content (beyond synced summaries)

### Phase 7: Continuous Ingestion Pipeline
- **Obsidian Web Clipper** for ad-hoc article ingestion (Karpathy's approach)
- **Scheduled agent** runs `/wiki lint` weekly, flags gaps
- **Post-meeting hook** — after meeting notes land in Supabase, auto-trigger wiki enrichment
- **Post-publish hook** — after a new article is published, auto-ingest into wiki
- **Cross-repo watcher** — when key docs change in EL/JH/GS repos, re-ingest

### Cross-Repo Ingestion Approach

The wiki lives in `act-global-infrastructure` but draws from 3 other repos. Two options:

**Option A: Symlinks** — symlink `wiki/raw/el/`, `wiki/raw/jh/`, `wiki/raw/gs/` to source repos. Obsidian sees them as local files.

**Option B: Copy on ingest** — `/wiki ingest` reads from other repos and copies into `wiki/raw/` with repo-prefixed, dated names. Immutable snapshots.

**Recommendation: Option B** — keeps raw/ self-contained, works even when other repos aren't checked out, maintains Karpathy's principle that raw sources are immutable snapshots. File naming: `2026-04-07-el-platform-prospectus.md`, `2026-04-07-jh-strategic-vision.md`, etc.

## New Operations to Build

### `/wiki present <topic>`
Generate a Marp slideshow from wiki content on a topic. Output to `wiki/output/` for viewing in Obsidian or browser.

### `/wiki search <query>` (CLI tool)
Lightweight search across the wiki that returns ranked results with snippets. Usable by the LLM as a tool during larger queries, and by humans via web UI. The current `act-wikipedia.html` has search — extract it into a standalone CLI.

### `/wiki graph <entity>`
Render the relationship graph around an entity. Which articles link to it? What's the neighbourhood? Output as SVG or interactive HTML.

### `/wiki compile`
Full recompilation: re-read all raw sources, rebuild all articles, regenerate index. Nuclear option for when the wiki gets out of sync.

### `/wiki diff <date>`
What changed in the wiki since a given date? Which articles were added/updated? What raw sources were ingested?

## Empathy Ledger Media Integration — The Visual Layer

### What Already Works (Built)
The Wikipedia viewer (`tools/act-wikipedia.html`) already connects to EL v2 Supabase:
- Fetches `media_assets` per organization via REST API
- 25 wiki projects mapped to EL org IDs
- **4,669 photos** already queryable (PICC: 2,611, ACT: 1,036, SMART: 425, JusticeHub: 301, Oonchiumpa: 276)
- Renders infobox images + 3-column thumbnail galleries per project article

### What Needs Building

**1. Art Portfolio Articles (`wiki/art/` — currently empty)**
The photos exist but have no narrative context. Need articles for:
- Uncle Allan's paintings — significance, connection to Country, Palm Island context
- CONTAINED — shipping container as installation art + social commentary + tour evidence
- The Confessional — art project concept and documentation
- PICC Photo Kiosk — community photography as agency and storytelling tool
- ACT's art practice as methodology — not decoration, but how art creates conditions for transformation

**2. Storyteller Profiles (`wiki/people/` — currently empty)**
EL has storyteller profiles with stories. With appropriate consent:
- Key community voices connected to wiki knowledge
- Attribution chains: photo → storyteller → community → project → concept
- Cultural protocol markers: where Elder review is needed, where TK protocols apply

**3. Rich Media in Article Bodies (not just infobox thumbnails)**
Current: 6 thumbnails in sidebar infobox. Vision:
- **Hero images** — full-width opening images for articles, pulled from EL
- **Photo essays** — inline image sequences with captions telling a visual story
- **Gallery pages** — dedicated gallery articles (e.g., `art/uncle-allan-gallery.md`) with curated image sets
- **Before/after** — visual evidence of transformation (spaces, communities, programs)

**4. Video Integration**
- EL has `storyteller_videos` table infrastructure
- Embed video players in wiki articles where video testimony supports the narrative
- Video linked to storyteller consent model

**5. Consent-Aware Media Display (CRITICAL)**
The wiki must respect EL's consent architecture:
- Only display media where consent status = granted
- Flag articles where media requires Elder review
- Show provenance: who took the photo, who gave consent, what context
- Never display media that's been revoked — even if cached
- This is the fundamental difference between ACT's wiki and a standard knowledge base: **narrative sovereignty extends to the visual layer**

### Media → Wiki Article Pipeline

```
EL media_assets (4,669 photos)
  ↓ filtered by consent status
  ↓ tagged by project/org/storyteller
Wiki infobox (automatic, per-project)
  + Hero images (curated, per-article)
  + Photo essays (compiled, per-topic)
  + Gallery pages (dedicated art portfolio articles)
  + Video embeds (storyteller testimony)
```

### Art Portfolio as Wiki Domain

The `wiki/art/` domain should become the richest visual section:
- Every art project gets an article with EL photo integration
- Gallery articles curate images around themes (Country, community, transformation, justice)
- Uncle Allan's work gets multiple articles — the paintings themselves, their Palm Island context, their role in the ecosystem
- CONTAINED gets a visual journey article — installation photos, community reactions, tour documentation
- Cross-linked to `concepts/` (art as system change) and `communities/` (place-based context)

## The Wikipedia Frontend — Evolution

Current `tools/act-wikipedia.html` is a 3800-line single-file app. Next steps:
1. **Auto-sync with wiki/ directory** — currently articles are hardcoded in JS. Build a compile step that reads `wiki/` and generates the articles object.
2. **Rich media rendering** — hero images, inline photo essays, video embeds, full-width galleries
3. **Graph view** — Obsidian-style relationship graph embedded in the viewer
4. **Timeline view** — chronological view of when knowledge was created/updated
5. **Four Pillars landing** — homepage organised around Art, Data Ownership, Civic Scope, Regenerative Innovation
6. **Citation/provenance view** — click any claim to see its source chain back to raw/
7. **Storyteller attribution** — photos credited to storytellers with links to their EL profiles
8. **Consent status indicators** — visual cues for media governance status

## The End Game

The ACT wiki becomes the most comprehensive, LLM-maintained knowledge base on how art, data sovereignty, civic systems, and regenerative innovation intersect. It's:

- **The institutional memory** that survives founder transitions
- **The R&D evidence base** that supports 43.5% tax refund claims
- **The grant application engine** — query the wiki for evidence to support any grant
- **The onboarding system** — new team members read the wiki instead of asking Ben
- **The content engine** — blog posts, slide decks, and reports generated from wiki knowledge
- **The research tool** — ask complex questions across the full ACT knowledge base

This is not a documentation project. It's a knowledge compilation system that compounds with every source ingested, every query answered, and every article enriched.

---

*Written 2026-04-07. Inspired by Karpathy's LLM Wiki pattern, built on ACT's existing Tractorpedia system.*
