---
title: ACT Knowledge Ops Loop
status: Active
date: 2026-04-11
type: technical
tags:
  - technical
  - wiki
  - obsidian
  - website
  - empathy-ledger
  - supabase
---

# ACT Knowledge Ops Loop

> Capture -> compile -> lint -> sync -> publish -> learn. The wiki stays the brain, Empathy Ledger stays the live field layer, Supabase stays the ledger, and the websites stay thin.

## Why This Exists

ACT now has enough moving parts that "just keep building" creates drift:

- the wiki can become a dumping ground
- Empathy Ledger can become a second wiki
- Supabase can start inventing identity
- the website can turn into a redundant content store

This loop exists to stop that.

It turns the [[llm-knowledge-base|LLM Knowledge Base]] method into a repeatable ACT operating rhythm.

## The Four-System Model

| System | Job | What it must not become |
|---|---|---|
| **Tractorpedia / wiki** | Durable memory, project truth, concepts, synthesis, identity | A media bucket or CRM |
| **Empathy Ledger** | Live stories, storytellers, galleries, photos, video, editorial emphasis | The canonical source of strategic framing |
| **Supabase** | Operational mirror, sync state, history, CRM/finance joins | The place where project meaning is invented |
| **Websites** | Public composition, navigation, invitation, syndication | A second editing surface for truth |

Another way to say it:

- **wiki = brain**
- **EL = senses + voice**
- **Supabase = ledger**
- **websites = face**

## Obsidian's Role

The `wiki/` folder should continue to work as an **Obsidian vault**.

That means:

- capture and compilation stay as plain markdown
- wikilinks stay the primary internal link type
- graph view and backlinks remain useful for editorial navigation
- humans can browse, steer, and spot missing links without needing a custom app
- LLM agents can maintain the same files the humans see

Obsidian is the editorial frontend, not the source of truth by itself. The source of truth is still the markdown graph on disk.

Relevant vault-facing references:

- [[tractorpedia|Tractorpedia]]
- [[llm-knowledge-base|LLM Knowledge Base]]
- [[living-website-operating-system|Living Website Operating System]]
- [[wiki-project-and-work-sync-contract|Wiki Project and Work Sync Contract]]

Operational vault surfaces:

- [Knowledge Ops Dashboard](../dashboards/knowledge-ops-dashboard.md)
- `wiki/sources/` as the bridge layer from raw capture to compiled knowledge
- `wiki/output/lint-YYYY-MM-DD.md` as the weekly health checkpoint

## The Loop

## 1. Capture

Put raw material into the system before trying to explain it.

### Where capture goes

| Kind | Location |
|---|---|
| raw docs, transcripts, exports, screenshots, scraped material | `wiki/raw/` |
| one-summary-per-source bridge | `wiki/sources/` |
| live field stories, portraits, media, articles | Empathy Ledger |
| operational rows, pipeline, finance, CRM events | Supabase |

### Rule

Do not skip straight to the website. If a thing is real, it should exist first as:

1. a raw/source memory object
2. or a durable wiki article
3. or a live EL object with consent and provenance

## 2. Compile

Turn raw material into durable knowledge.

### Wiki compile targets

| Type | Folder |
|---|---|
| projects and sub-projects | `wiki/projects/` |
| works, curatorial logic, art philosophy | `wiki/art/` |
| concepts and method | `wiki/concepts/` |
| decisions | `wiki/decisions/` |
| research | `wiki/research/` |
| durable stories or story references | `wiki/stories/` |
| compounding answers | `wiki/synthesis/` |

### Rule

The wiki article is where ACT decides what something **is**.

That means:

- name it
- classify it
- link it
- give it canonical identity if it is load-bearing

For project/work pages, use the contract in [[wiki-project-and-work-sync-contract|Wiki Project and Work Sync Contract]].

## 3. Lint

Make the system audit itself before more polish lands.

### Current wiki checks

- broken wikilinks
- orphans
- stubs
- missing index entries
- backlink debt
- missing sync frontmatter on load-bearing pages
- raw files in `wiki/raw/` that still lack bridge summaries in `wiki/sources/`
- source summaries that point at missing raw files

### Commands

```bash
node scripts/wiki-lint.mjs --write-report
node scripts/wiki-build-viewer.mjs
node scripts/wiki-sync-supabase-projects-snapshot.mjs
node scripts/wiki-bootstrap-source-summaries.mjs
npm run wiki:bootstrap:sources:articles -- --limit 20
npm run wiki:bootstrap:sources:priority -- --limit 20
```

### Rule

If the wiki graph is broken, do not treat the website as healthy just because it still builds.

## 4. Sync

Move durable truth and live proof into build-safe artifacts.

### Current sync chain

For the ACT website:

```bash
cd /Users/benknight/Code/act-regenerative-studio
npm run sync:wiki
npm run sync:project-codes
npm run sync:el-media
npm run sync:el-editorial
```

### What each sync does

| Sync | Purpose |
|---|---|
| `sync:wiki` | Pulls canonical wiki pages/projects into generated website snapshots |
| `sync:project-codes` | Pulls canonical cross-system codes into the website registry |
| `sync:el-media` | Pulls build-safe project media snapshots from EL |
| `sync:el-editorial` | Pulls build-safe editorial/article selections from EL |

### Rule

The website should read generated snapshots. It should not depend on ad hoc scraping of wiki bodies or live querying every service on every page render.

Supabase should also feed back into the wiki as source material, not just sit underneath it. The `wiki-sync-supabase-projects-snapshot.mjs` script turns the live `public.projects` table into:

- a raw immutable snapshot in `wiki/raw/`
- a bridge summary in `wiki/sources/`
- a refreshed `wiki/sources/index.md`

## 5. Publish

Compose the public surface from the generated layers.

### Website build

```bash
cd /Users/benknight/Code/act-regenerative-studio
npx tsc --noEmit
npm run build
```

### Public composition rule

The websites should compose:

- wiki framing
- EL live proof
- enquiry/navigation

They should not invent a new project story that exists nowhere else.

### Hub and spoke rule

- ACT site = ecosystem hub
- project sites = spokes
- wiki = shared memory below both
- EL = shared live field layer below both

Syndicate fragments, not duplicate full truth everywhere.

## 6. Learn

Questions should compound back into the system.

### What learning looks like

- run queries against the wiki
- turn non-trivial answers into `wiki/synthesis/`
- ingest new raw sources when gaps are discovered
- backfill missing links, missing fields, or missing articles
- let editorial selections in EL evolve as the field changes

### Commands and patterns

- `node scripts/wiki-log.mjs ...` after ingest, lint, synthesis, and viewer builds
- `/wiki query ...`
- `/wiki synthesize ...`

### Rule

Good questions should leave artifacts behind. Otherwise the system is only pretending to learn.

## The Ongoing Flow By Object Type

## New project

1. Create or enrich page in `wiki/projects/`
2. Apply canonical frontmatter if load-bearing
3. Attach live stories/media in EL
4. Mirror canonical identity into Supabase
5. Sync into the websites

## New work

1. Create or enrich a durable page in `wiki/projects/` or the curatorial layer in `wiki/art/`
2. Link to the parent field or project
3. Attach media/story fragments in EL
4. Surface through the website `Works` layer

## New story

1. Start in EL
2. Only create a durable wiki page if it becomes load-bearing
3. Syndicate excerpts to the websites as needed

## New article

1. Start in EL if it is living editorial writing
2. Keep one canonical home
3. Syndicate excerpts to hub/spoke sites
4. Add a wiki article only if the piece becomes durable ACT knowledge

## New concept or decision

1. Start in the wiki
2. Link to affected projects and works
3. Let the sites render it only when it helps public understanding

## Where Supabase Fits

Supabase is essential, but it is not the knowledge base.

### Supabase should hold

- canonical codes mirrored into `public.projects`
- `metadata.canonical_slug`
- sync timestamps and status
- CRM, pipeline, finance, and opportunity joins
- historical rows and operational traces

### Supabase should not decide

- what a project is called
- whether something is a work or a methodology
- which page is canonical
- how a project is framed publicly

Those decisions belong upstream in the wiki and editorially in EL.

### Practical rule

If wiki and Supabase disagree about identity, the wiki should win and Supabase should be corrected.

## Success Criteria

The system is working when:

- a new project can be introduced once in the wiki and flow downstream cleanly
- a new EL story or gallery can appear on the right site without manual copy-paste
- a page on the website never has to become the only place where ACT truth lives
- Obsidian graph/backlinks still help humans understand the field
- Supabase can answer operational questions without redefining the field itself

## Anti-Patterns

Do not do these:

- write core project truth only in page copy on the website
- use EL as the only place a project is described
- let Supabase codes drift away from canonical wiki identity
- duplicate the same work article in multiple wiki locations
- publish live pages that have no durable wiki framing underneath

## Recommended Weekly Rhythm

1. Capture new raw material and EL objects
2. Compile or update the durable wiki pages
3. Run wiki lint and viewer build
4. Run website syncs
5. Build the public site
6. Save one synthesis or improvement artifact from what was learned

That is the loop.

## Backlinks

- [[llm-knowledge-base|LLM Knowledge Base]] — the underlying second-brain method
- [[tractorpedia|Tractorpedia]] — the ACT knowledge system as a whole
- [[living-website-operating-system|Living Website Operating System]] — public composition rules
- [[wiki-project-and-work-sync-contract|Wiki Project and Work Sync Contract]] — canonical field contract for load-bearing pages
- [[continuous-pipeline|Continuous Pipeline Architecture]] — what is automated and what is still manual
