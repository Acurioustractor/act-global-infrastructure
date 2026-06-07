---
title: ACT Communication Pipeline — content backbone + cross-codebase + newsletter + website
date: 2026-05-23
status: design doc — extends newsletter PRD, ties newsletter to website + EL + cross-codebase discovery
plan_slug: act-communication-pipeline-2026-05-23
related:
  - thoughts/shared/plans/newsletter-pipeline-2026-05-23.md (the four-audience newsletter)
  - act-regenerative-studio (the public website, already aggregates EL + wiki + Notion + GHL)
  - empathy-ledger-v2 (storyteller content with consent governance)
codebases_in_scope:
  - act-global-infrastructure (backend infra, command-center, scripts, wiki, finance)
  - act-regenerative-studio (act-main-website, public site at act.place)
  - empathy-ledger-v2 (storyteller content)
  - justicehub, goods, act-farm, oonchiumpa, picc-studio (project-specific sites)
---

# ACT Communication Pipeline

## The real question

Ben asked: "align the newsletter to the new website build · think about how EL articles can feed newsletter content across projects · come up with smart ways to search across all codebases and projects to continuously surface the latest updates · continue to communicate what we are doing."

The newsletter is one surface. The bigger question is the **communication backbone** — a single content layer that feeds the website, the newsletter, the bot, the funder briefs, the partner updates. Build that, and every communication channel inherits from it.

## What already exists (don't rebuild)

The `act-regenerative-studio` repo is the canonical public-facing surface. Its build pipeline already aggregates from every important source:

```
npm run build  =  sync:canon → sync:wiki → sync:project-codes
               → sync:el-media → sync:el-editorial → sync:el-packets
               → sync:el-storytellers → sync:el-transcripts
               → next build
```

That means the studio's Supabase tables (same shared instance as command-center) already hold:

| Source | What's synced | Sync script |
|---|---|---|
| Empathy Ledger media | Photos, video, audio with consent metadata | `sync-el-media.mjs` |
| Empathy Ledger editorial | Curated story drafts ready for publishing | `sync-el-editorial.mjs` |
| Empathy Ledger source packets | Raw transcripts + interview material | `sync-el-source-packets.mjs` |
| Empathy Ledger storytellers | People + consent state + tags | `sync-el-storytellers.mjs` |
| Empathy Ledger transcripts | Full transcripts with speaker labels | `sync-el-transcripts.mjs` |
| Canonical wiki projects | All ACT projects from `wiki/projects/*` | `sync-canonical-wiki-projects.mjs` |
| Canonical wiki pages | All wiki/*.md content with frontmatter | `sync-canonical-wiki-pages.mjs` |
| Flagship project packs | Funder-ready project bundles | `sync-canonical-wiki-flagship-packs.mjs` |
| Notion projects | Project Notion pages | `sync-notion-projects.mjs` |
| Project code registry | All 75+ ACT project codes from `config/` | `sync-project-code-registry.mjs` |

There's also `ask-act.mjs` — a CLI that queries the unified knowledge base via RAG. Two tiers (fast / deep). Source citations.

**This is the backbone.** Newsletter doesn't need to recreate it. Newsletter READS from it.

## Architecture: one backbone, many surfaces

```
                    CONTENT BACKBONE (act-regenerative-studio Supabase)
       ┌─────────────────────────────────────────────────────────────────┐
       │                                                                 │
       │  EL stories · wiki projects · wiki pages · flagship packs ·     │
       │  Notion projects · GHL contacts · project_code_registry ·       │
       │  decisions logs · meeting notes · transcripts · media library   │
       │                                                                 │
       └──┬────────┬──────────┬───────────┬───────────┬──────────────────┘
          │        │          │           │           │
          ▼        ▼          ▼           ▼           ▼
       ┌──────┐ ┌──────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐
       │ Web  │ │ Bot  │ │Newsltr  │ │ Funder   │ │ Cross-codbase│
       │ site │ │      │ │ pipeline│ │ briefs   │ │ feed         │
       │      │ │      │ │         │ │          │ │              │
       │ pull │ │ chat │ │ push    │ │ on-demand│ │ continuous   │
       └──────┘ └──────┘ └─────────┘ └──────────┘ └──────────────┘
       act.place @dali_S_bot 4 lists  /brief-funder  daily digest
```

Six surfaces, one substrate. Each consumes the backbone in its own way:
- **Website** = browsable always-on (pull-based discovery)
- **Bot** = conversational on-demand (chat-based discovery)
- **Newsletter** = scheduled push to 4 audiences
- **Funder briefs** = on-demand per-funder synthesis
- **Cross-codebase feed** = continuous low-noise "what's new" stream

The work is in the **bridges** — selectors, filters, and graders that take backbone content and shape it for each surface.

## How Empathy Ledger feeds newsletter content

EL is the highest-stakes content source. Every story has:
- `storyteller_id` — the person whose story this is
- `project_tags` — which project(s) it relates to
- `consent_visibility` — `private | partner | funder | public` (and `storyteller_review_due` date for renewal)
- `editorial_status` — `raw | drafted | published | archived`
- `media_assets` — photos/video/audio linked with same consent state

Per-audience filter rules:

| Audience | EL filter |
|---|---|
| Funders | `consent_visibility IN ('funder', 'public') AND project_tags && funder.projects AND editorial_status = 'published' AND storyteller_review_due > today` |
| Partners | `consent_visibility IN ('partner', 'public') AND project_tags && partner.project AND editorial_status = 'published'` |
| Brand/public | `consent_visibility = 'public' AND editorial_status = 'published'` |
| Storyteller (their own) | `storyteller_id = recipient_id` (any visibility, since it's theirs) |

**Story selection is automatable.** The newsletter content selector for each audience runs the SQL filter, picks N stories matching the edition's theme/cadence, and the drafter wraps them in audience-appropriate voice.

**Critical safeguard**: every send must re-check `storyteller_review_due`. If consent is expired (review-overdue), filter that story out and surface to Ben for re-consent before next edition. This is the OCAP loop.

## Cross-codebase discovery — "what's new across ACT"

The seven main ACT codebases each evolve independently:
- `act-global-infrastructure` (backend, finance, scripts, wiki, command-center)
- `act-regenerative-studio` (main website, content aggregation)
- `empathy-ledger-v2` (stories with consent)
- `justicehub` (justice project site)
- `goods` (Goods on Country site)
- `act-farm` (farm site)
- Smaller sites (Oonchiumpa, PICC, etc.)

A weekly **ecosystem-digest** already runs (see ecosystem.config.cjs entry). It pulls commits across repos and groups by `Plan: <slug>` trailers. That's the seed.

The expanded design:

```
Cross-codebase index (runs daily, lives in act-global-infrastructure/scripts/)
   │
   ├─ scan each repo for last-24h activity:
   │     ─ commits with Plan: trailers
   │     ─ new wiki/ pages
   │     ─ new thoughts/shared/decisions/
   │     ─ closed GitHub issues
   │     ─ merged PRs
   │     ─ new flagship-pack snapshots
   │
   ├─ scan studio Supabase for:
   │     ─ new EL stories (storyteller_id, project_tags, consent_visibility)
   │     ─ new wiki pages synced
   │     ─ new media gallery uploads
   │     ─ new knowledge_extraction_queue items
   │     ─ new GHL contact stage changes (warm → engaged etc)
   │
   ├─ scan Xero (via existing xero-sync) for:
   │     ─ new invoices raised
   │     ─ new payments received
   │     ─ new bills authorised
   │     ─ project-tagged spend
   │
   ├─ scan Notion for:
   │     ─ new Action Items
   │     ─ new Decisions
   │     ─ new Money Sync captures
   │     ─ new Meeting Notes
   │
   └─ output: thoughts/shared/cross-codebase-feed/<YYYY-MM-DD>.json
        + thoughts/shared/cross-codebase-feed/latest.md (human-readable)
```

The feed has rows like:
```json
{
  "date": "2026-05-23",
  "type": "el_story_published",
  "project": "ACT-OO",
  "storyteller_id": "kristy-bloomfield",
  "consent_visibility": "public",
  "title": "The court forgets. We remember.",
  "permalink": "https://act.place/stories/oonchiumpa-court-forgets",
  "media_count": 4
}
{
  "date": "2026-05-23",
  "type": "commit_with_plan",
  "repo": "act-global-infrastructure",
  "plan_slug": "newsletter-pipeline-2026-05-23",
  "sha": "23ecdfa",
  "title": "feat(ops): continuous tagging + audit skills + newsletter PRD"
}
{
  "date": "2026-05-23",
  "type": "invoice_paid",
  "funder": "Snow Foundation",
  "amount": 50000,
  "project": "ACT-OO",
  "invoice_id": "INV-0314"
}
```

**Newsletter content selectors read from this feed.** Funder newsletter for Snow Foundation gets: "Last month → INV-0314 paid · ACT-OO project advanced 5 commits · Kristy's new public-consent story landed." Already structured. Already filtered by audience-allowable consent. Just needs voice wrapping.

**The bot reads from this feed too.** Ben asks "what's new this week" — bot summarizes from the JSON.

**The website reads from this feed.** Homepage "Recent updates" widget pulls top 5 cross-codebase events (filtered to public-consent only).

## Public website ↔ newsletter alignment

The relationship:

| Surface | Mode | Discovery model | Voice |
|---|---|---|---|
| **Website** (act.place) | Pull | Browse-when-curious | Always-on, layered, deep |
| **Newsletter** | Push | Comes-to-inbox | Episode-shaped, voice-graded, one read |
| **Bot** | Chat | Ask-when-needed | Conversational, tool-augmented |

Both website and newsletter read the same backbone, but:
- Website shows ALL public-consent content (deep, browsable)
- Newsletter shows the SUBSET that matters this period (curated, scheduled)
- Every newsletter LINKS to website (each story → permalink)
- Every newsletter ARCHIVES on website (each edition becomes a published page at `act.place/newsletters/<edition-slug>`)
- Website's "Subscribe" CTA feeds GHL list directly

**Voice consistency** is enforced one place: `grade-voice.mjs` + per-rubric. The website has `check-public-copy.mjs` (regex-based internal-leak detection). The newsletter has the same voice rubrics but per-audience. Both pass through the same Curtis-discipline gate.

## Smart cross-codebase search (the discovery layer)

Beyond the daily feed, ad-hoc search across all ACT content:

### What we have
- `ask-act.mjs` in regen-studio = RAG over studio Supabase (wiki + EL + Notion). Currently single-codebase scope.
- Voice + funder + R&D + alignment graders in `act-global-infrastructure` for quality gates.
- `query_supabase` bot tool for SQL discovery.

### What to add (in order of leverage)

**A. Cross-codebase RAG (extend `ask-act.mjs`)**
- Index every repo's wiki/, README.md, CLAUDE.md, docs/, thoughts/shared/ into a single embeddings table
- Add metadata `source_repo` so results can filter
- Single endpoint `/api/ask-act` reads from the unified index
- Bot's `search_wiki` and `search_knowledge` tools route here instead of single-codebase searches

**B. Cross-codebase activity stream (the daily feed above)**
- New script: `scripts/build-cross-codebase-feed.mjs` runs daily 7am AEST
- Writes JSON to `thoughts/shared/cross-codebase-feed/<date>.json` and `latest.md`
- Published to website at `act.place/whats-new` (public-consent items only)
- Newsletter selectors read filtered slices

**C. Project-360 dashboard (already partial)**
- Bot tool `get_project_360` exists — pulls per-project status from Supabase
- Extend to include: cross-repo commit count, latest EL story, latest financial movement, GHL contact health, last decision logged
- Surface in Notion + command-center

**D. Storyteller dashboard**
- For each EL storyteller: their stories, consent state, review-due dates, where each story is currently being used (newsletter editions, website pages, funder briefs)
- Surfaces the OCAP loop visibly — "Kristy's stories need re-consent by July, 3 stories affected"

**E. Funder relationship surface (already partial)**
- Each funder gets a synthesis page: invoices, payments, related projects, EL stories visible to this funder, last contact, cadence health
- Fed into both website (private funder portal) and newsletter targeting

## The communication flywheel (the "continuous" answer)

```
        WORK HAPPENS                  CONTENT CAPTURES
   (commits, decisions, captures,    (studio sync layer pulls
    EL stories, payments)            it all into shared DB)
            │                                  ▲
            │                                  │
            ▼                                  │
    Cross-codebase feed         ←── runs daily ──┘
    (the index)
            │
   ┌────────┴────────────────┐
   │                         │
   ▼                         ▼
Newsletter selectors    Website "what's new"
(filtered per audience)   (filtered to public-consent)
   │                         │
   ▼                         │
Voice grader                 │
   │                         │
   ▼                         │
Drafter (Sonnet route)       │
   │                         │
   ▼                         │
Per-audience drafts          │
   │                         │
   ▼                         │
GHL list send       ─────────┘ ←── newsletter archive
   │                         (each edition becomes a website page)
   ▼
Recipient → opens, clicks, replies
   │
   ▼
GHL performance metrics    ─→  feed back into next selector
   │
   ▼
Notion log of what landed → influences next planning cycle
```

The result: communication runs as a background process, not as a quarterly campaign sprint. Ben works on what matters (decisions, conversations, the work itself); the pipeline picks it up, shapes it per audience, sends it, learns from it.

## Phased build

**Phase 1 (this session's PRD = funders MVP)**: one-audience newsletter pipeline shipped end-to-end. Reads from studio Supabase + wiki + Xero. Voice-graded. Hand-sends to GHL for first edition.

**Phase 2 (~1 week post-Phase 1)**: cross-codebase feed daily cron. Writes JSON + markdown. Bot's `search_wiki` upgraded to read from feed.

**Phase 3 (~2 weeks post-Phase 1)**: extend `ask-act.mjs` to cross-codebase RAG. Index all 7 repos. Bot's RAG tools route here.

**Phase 4 (~3 weeks)**: add second audience (partners) to newsletter pipeline. Reuse infrastructure, swap rubric + content selector + GHL list.

**Phase 5 (~4 weeks)**: storyteller dashboard + consent re-review automation. Each storyteller gets a page showing where their stories are being used. Re-consent prompts auto-flag.

**Phase 6 (ongoing)**: continuous flywheel — by now, every public-facing artefact across the seven repos is graded, audience-appropriate, OCAP-checked. Each surface (website, newsletter, bot, brief) reads the same backbone. Ben works on the work; the system communicates it.

## What this changes about how ACT operates

**Before**:
- Newsletter happens 1-2x/year (when Ben has time)
- Website updates lag commits by months
- Funders hear from ACT only when Ben sits down to write
- Stories get told once and forgotten
- Cross-project insight requires manual synthesis

**After**:
- Newsletter ships on cadence per audience (4 streams, scheduled)
- Website surfaces updates within hours of commit
- Funders receive auto-curated updates relevant to their projects + consent rights
- EL stories get distributed across surfaces with OCAP discipline
- Cross-project insight is one query away (`ask-act`, bot, feed)

The migration to cheap LLM was the unlock. Voice grading + drafting + RAG synthesis are all now affordable at continuous-operation cadence.

## Open questions for Ben

- **Cross-codebase feed cadence** — daily 7am AEST works for a Mon ecosystem digest pattern. Match that, or every 4h?
- **Storyteller dashboard** — separate page at act.place/storytellers/<id> or integrate into existing EL storyteller pages?
- **Funder portal** — public website or private link per funder (token-protected)?
- **Newsletter archive on website** — every edition published, or only the public/brand one?
- **Cross-repo embeddings** — keep in studio Supabase (shared instance) or its own pgvector table?
- **Auto-send threshold** — if drafter + grader produce a 10/10 first time, send without human review, or always-review for funder/partner audiences?

## What this session can ship as a first step

Three concrete next moves (any one of which could be ~1 day):

1. **Build the cross-codebase feed** — `scripts/build-cross-codebase-feed.mjs`. Daily cron. Writes JSON + markdown. Becomes the substrate for all the future selectors. (Highest leverage — unlocks newsletter + website + bot all at once.)

2. **Wire ask-act.mjs to read the feed** — extend the RAG so "what's new this week?" works. The studio already has the RAG plumbing; just adds a corpus.

3. **Build the storyteller dashboard route in regen-studio** — `/storytellers/<id>` page showing their stories + consent state + where each is being used. Enables the OCAP loop visibly.

Pick one, or sequence two.
