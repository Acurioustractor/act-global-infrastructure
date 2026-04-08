## Ledger
**Updated:** 2026-04-07T14:30:00+10:00
**Goal:** Tractorpedia Knowledge System — 7-phase build
**Branch:** main

### Phase Progress
| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Article Backbone — 49 Supabase articles → raw/, compiled to wiki | **COMPLETE** (55 articles, 4 people, 2 communities, 8 concepts, 35 projects) |
| **Phase 2** | Cross-Repo Vision Documents — EL prospectus, JH strategy, GS mission | **COMPLETE** (10 raw files → 4 new articles + 3 enriched) |
| **Phase 3** | Command Center Wiki Merge — 56 files in `public/wiki/` | **COMPLETE** (56 raw files → 29 stories + 12 new concept/technical/decision articles + 6 project enrichments; index.md updated; total 97 articles) |
| **Phase 4** | Research & Evidence — ALMA data, GrantScope graph, EL methods | **COMPLETE** (4 raw Supabase snapshots + 4 EL methods raw + 5 compiled articles: alma-intervention-portfolio, justice-funding-landscape, political-donations-power, strategic-decisions-log, transcript-analysis-method) |
| **Phase 5** | Meeting Intelligence — 77 non-MISC meetings analyzed, 6 research articles + 1 raw snapshot written | **COMPLETE** (wiki/research: justicehub-evolution-meetings, harvest-property-arc, empathy-ledger-relationships, diagrama-spain-context, smart-recovery-context, meeting-intelligence-synthesis; raw: 2026-04-07-supabase-meetings-snapshot.md; index.md updated to 109 articles) |
| **Phase 6** | External Scraping — act.place (6 pages), justicehub.com.au (3 pages), civicgraph.app (2 pages); 9 raw files + 1 new article (act-public-voice) + Public Voice sections on justicehub, civicgraph, empathy-ledger; index updated to 110 articles | **COMPLETE** |
| **Phase 7** | Continuous Pipeline — scripts/wiki-lint.mjs + scripts/wiki-watch-meetings.mjs + wiki/decisions/continuous-pipeline.md (architecture); index → 111 articles | **COMPLETE** |
| **Refinement Sprint 1** | Priority 1 (close obvious gaps) — 9 new articles (nicholas-marchesi, ocap-principles, act-identity, act-ecosystem, green-harvest-witta, picc-{annual-report,centre-precinct,elders-hull-river,photo-kiosk}) + 6 stubs enriched (vic, cars-and-microcontrollers, barkly-backbone, community-capital, feel-good-project, treacher) + 28 missing-from-index added + lint code-span fix → **0 orphans, 0 broken links, 0 stubs, 0 missing-from-index** at 124 articles, 753 wikilinks | **COMPLETE** |

### Phase 2 Target Files

**From empathy-ledger-v2:**
- `docs/13-platform/EMPATHY_LEDGER_WIKI.md` (21K) — mission, pillars, cultural protocols
- `docs/13-platform/EMPATHY_LEDGER_COMPLETE_PLATFORM_PROSPECTUS.md` (27K) — full platform vision
- `content/stories/example-consent-as-infrastructure.md` — OCAP as database architecture
- `docs/01-principles/` — philosophical foundations
- `docs/02-methods/` — research methods

**From JusticeHub:**
- `docs/strategic/STRATEGIC_VISION_2026-2036.md` (9.7K) — 10-year roadmap
- `compendium/contained-tour-intelligence.md` (54K!) — CONTAINED national campaign
- `compendium/engagement-and-comms-plan.md` (20.5K) — partnership strategy
- `compendium/first-nations-news-oped-draft.md` (17K) — Indigenous justice op-ed
- `artifacts/research/civic-tech-viral-adoption.md` — civic tech case studies
- `Conference_Abstract_Submission.md` — "We Know The Way" with Oonchiumpa

**From GrantScope/CivicGraph:**
- `MISSION.md` + `WHY.md` — $107B funding transparency gap
- `thoughts/plans/grantscope-strategy.md` (884 lines) — Australia's Community Capital Ledger
- `thoughts/plans/power-dynamics-report.md` (511 lines) — philanthropy power structures
- `thoughts/shared/civicgraph-product-vision.md` (405 lines) — product positioning

### Key Reference
- Full plan: `thoughts/shared/plans/act-knowledge-system-idea.md`
- Wiki index: `wiki/index.md` (55 articles)
- Raw sources: `wiki/raw/` (49 articles + audit files)
- Ingestion approach: Option B (copy on ingest, repo-prefixed dated names)
- Naming convention: `2026-04-07-el-<slug>.md`, `2026-04-07-jh-<slug>.md`, `2026-04-07-gs-<slug>.md`

### Architecture
```
wiki/
  index.md (55 articles)
  concepts/ (8) — lcaa, ai-community-engagement, youth-justice-reform, etc.
  projects/ (35) — all active ACT projects covered
  communities/ (2) — palm-island, mount-isa
  people/ (4) — benjamin-knight, richard-cassidy, brodie-germaine, vic
  research/ (3) — acco, global-precedents, civic-transparency
  technical/ (1) — local-ai-architecture
  art/ (0) — empty, needs Phase 2+ content
  finance/ (0) — empty
  decisions/ (0) — empty
  raw/ (49 articles + 6 audit/meta files)
```
