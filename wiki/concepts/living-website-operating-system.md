---
title: Living Website Operating System
status: Active
date: 2026-04-10
---

# Living Website Operating System

> One memory layer, one live signal layer, one public shell. The website stays alive when each layer does its own job and nothing tries to become everything.

## Overview

ACT's public website is not supposed to be a second CMS, a second wiki, or a dashboard pretending to be a brand site. It is the public shell of a living system.

That system currently has three layers, following the [[llm-knowledge-base|Karpathy LLM Knowledge Base pattern]] for durable knowledge:

1. **Canonical wiki** — durable memory, framing, structure, and project truth
2. **Empathy Ledger** — consented stories, media, voice, and live field signals
3. **Public website** — the place where memory and live material are composed into legible public pages

The rule is simple:

> **Write truth once in the wiki. Let live material arrive through Empathy Ledger. Let the site compose the two.**

This keeps the system coherent as ACT grows. It also keeps the public shell honest. A page should not promise "live" unless it is truly connected to the story/media layer, and it should not carry strategic truth that exists nowhere else.

## Editorial Composition

The website does not just need **content**. It needs **composition**.

That composition belongs in the live layer, not in the wiki.

The wiki should continue to do what it was intended to do:

- compile durable knowledge from raw sources
- hold entity pages, concept pages, decisions, and synthesis
- compound over time through LLM maintenance and cross-linking

Empathy Ledger should hold the editorially live layer:

- featured stories for a site or project
- hero photos and hero video
- storyteller portraits and lead voices
- article syndication destinations
- gallery order and media emphasis
- the public material that should rise or fall with a page over time

The public website then composes:

- wiki framing
- live editorial choices
- enquiry and navigation

This keeps the wiki from turning into a content bucket, and it keeps the website from turning into a second CMS.

The same rule applies to project identity. The wiki may hold more pages than the operational project registry. Some pages are methodologies, works, alias pages, or pitch artefacts rather than standalone projects. See [[project-identity-and-tagging-system|Project Identity and Tagging System]] for the rule that decides what gets its own code, what rolls up to a parent, and what remains wiki-only.

The concrete field contract that downstream systems should read is in [[wiki-project-and-work-sync-contract|Wiki Project and Work Sync Contract]]. That is the place where canonical slugs, codes, website paths, EL keys, and parent relationships are supposed to be made explicit.

The repeatable day-to-day sequence for keeping those layers aligned lives in [[act-knowledge-ops-loop|ACT Knowledge Ops Loop]]. That article is the concrete operating rhythm: capture -> compile -> lint -> sync -> publish -> learn.

For the Studio line specifically, [[art/business/studio-business-model|Studio Business Model]] names what this operating system has to support economically: stronger works, stronger invitation surfaces, better media, and a field that can earn without flattening itself into SaaS language.

In practice, there can be a **transitional recipe layer** inside a website build while the full EL editorial manifest catches up. That recipe layer is still part of composition, not memory. It can say:

- which articles best belong on a flagship page
- which story fragments are strongest on the hub versus the spoke
- which media asset should lead a page right now
- which site-scoped media override should carry a homepage or flagship card while the live media graph catches up

But it should never become the place where ACT's durable truth is written. The wiki still owns that.

As the system matures, those recipes should move out of the site repo and into Empathy Ledger itself as a site-scoped editorial manifest. The current direction is:

- Empathy Ledger owns the editorial manifest
- the website sync pulls that manifest into a build-safe snapshot
- the manifest can control homepage article picks, flagship project order, and media emphasis
- the wiki remains untouched as the durable source of project truth

That is the intended shape: composition in EL, memory in Tractorpedia, surface in the site.

## Canonical Homes and Syndication

Every durable public object should have **one canonical home**.

That includes:

- articles
- stories
- works
- project pages

Other sites in the ecosystem should usually receive:

- an excerpt
- a hero image or video
- a quote fragment
- a storyteller portrait
- a "read more" or "open project" link

They should not all become independent full copies of the same thing.

The rule is:

1. keep one canonical page where the full object lives
2. syndicate selected fragments elsewhere
3. always preserve the backlink to the canonical page

That is how ACT can have a hub, several spokes, and one coherent editorial field instead of duplicating content across sites.

## Hub and Spokes

ACT's main public site is the **hub**, not the only website in the ecosystem.

Some projects will have their own public sites. Those are **spokes**:

- JusticeHub has its own public site
- Empathy Ledger has its own public site
- The Harvest can have its own public site
- PICC, Oonchiumpa, Goods on Country, and other projects may also have their own sites as they mature

The rule is:

1. the ACT hub should always keep the main ecosystem framing
2. each project page on the hub should link to the project's own site when it exists
3. the hub should never force people to choose between the ACT page and the project page
4. the wiki should remain the shared memory layer beneath both

So the relationship is:

- **Hub site** = ecosystem context, method, cross-links, enquiry, shared memory surface
- **Project site** = focused public front door for that specific work
- **Wiki** = durable knowledge layer both can draw from
- **Empathy Ledger** = live story/media layer both can draw from

This matters because ACT is not building a single monolith. It is building a living field of related public surfaces held together by shared memory and shared method.

## The Three-Layer Model

| Layer | What it holds | What it should not become |
|---|---|---|
| **Wiki** | Durable project framing, concept definitions, people, communities, decisions, method | A live media archive, a CRM, or a form backend |
| **Empathy Ledger** | Consented stories, storytellers, portraits, galleries, audio/video, living field proof | The canonical place for strategic ACT framing |
| **Website** | Public composition, navigation, invitation, inquiry, and curation | A second editing surface for core truth |

Another way to say it:

- **Wiki = memory**
- **EL = signal**
- **Website = surface**

## What Starts Where

### 1. New Project

Start in **`wiki/projects/`**.

Why: if a project does not have a durable purpose, framing, and relationship map, it is too early to become a polished public page.

Then:
- add or confirm a website slug
- connect any live story/media through EL
- expose it on the website only when the public shell can explain it truthfully

### 2. New Work / Artwork / Installation

If the work is load-bearing, create a durable article in **`wiki/art/`** or as a project-linked article in **`wiki/projects/`**.

Then:
- connect related stories, portraits, or documentation in EL
- surface it in the website's **Works** layer

The important distinction:
- **wiki/art** = durable context
- **website/works** = public curation
- **EL** = living material connected to the work

### 3. New Story

Start in **Empathy Ledger**.

Why: stories need permission, scope, and cultural handling before they need explanation.

Only create a wiki article if:
- the story becomes load-bearing for ACT's understanding of a project, person, or method
- or it belongs in `wiki/stories/` as a durable, consented reference

### 4. New Person

Start with **EL storyteller / public story context** unless the person is clearly load-bearing.

Only create a durable **`wiki/people/`** page when the person materially helps explain:
- a project
- a community relationship
- ACT's method
- a strategic partnership

This keeps `wiki/people/` curated rather than turning it into a mirror of every voice in EL.

The practical rule is in [[people/README|People Index]]: major-project anchors, cultural authorities, founders, and recurring load-bearing figures belong in the wiki; everyone else can stay in EL and the source bridge until they become structurally necessary.

### 5. New Media Set

Start in **EL / gallery infrastructure**.

The website can preview it. The wiki can reference it. But the media itself should live in the story/media layer, not in markdown as scattered links.

### 6. New Concept / Method / Decision

Start in the **wiki**:
- `wiki/concepts/`
- `wiki/decisions/`
- `wiki/research/`

These are durable by definition. The site may later render them through a page, route, or explainer, but the canonical wording should live in Tractorpedia.

### 7. New Service / Public Enquiry Path

Start in the **website**.

This is the main exception. A service or enquiry route is part of the public shell and should be shaped in the site first.

But it still needs to link back to:
- a project or field in the wiki
- the right project code / routing path
- the right public proof layer

## The Operating Sequence

When something new appears in the ACT field, use this order:

1. **Name it in the wiki**
2. **Attach live proof in Empathy Ledger**
3. **Decide whether it belongs on the public site**
4. **Expose it through the right route**
5. **Keep the route thin enough that it can change as the system grows**

This sequence matters because it prevents the website from becoming the place where unfinished thinking goes to harden.

## The Public Website Contract

The ACT public shell should only do four things:

1. explain what ACT is
2. help people navigate projects, works, method, and place
3. surface live but consented field material
4. open the right enquiry path

It should not become:
- the only place where project truth exists
- the only place where works are documented
- a second data store
- a place where placeholder claims linger for months because there is no upstream source of truth

## Build Contract

At the moment, the public website build in `act-regenerative-studio` works like this:

1. `sync:wiki`
2. `sync:el-media`
3. `sync:el-editorial`
4. `next build`

In practice, this means:
- the canonical ACT wiki is pulled into generated JSON snapshots
- live media is pulled from Empathy Ledger into a build-safe snapshot
- site-scoped editorial articles are pulled from Empathy Ledger into a build-safe snapshot
- then Next builds the public shell

`sync:notion` still exists as an optional legacy snapshot for older enrichment code paths, but it is no longer part of the main website build.

The important architectural point is not the exact number of seconds. It is this:

> **the build should degrade cleanly when a non-canonical source is offline.**

That remains the rule for any future live surfaces as well.

## How To Keep It Alive

The website stays alive if the editorial rhythm stays simple.

### Weekly

- update or create any load-bearing wiki pages
- review new EL stories/media that are safe for public syndication
- run a build and check whether the public shell still tells the truth

### When a project evolves

- update the wiki article first
- check whether the public route is now misleading, thin, or stale
- add or refresh live proof if it exists

### When a work emerges

- decide whether it is a durable art/project object or just supporting material
- add the durable context to the wiki
- then let the website curate it

### When a question keeps recurring

- answer it once in the wiki
- let the site link to that answer instead of rewriting it from scratch

## Decision Rules

If unsure where something belongs, use these tests.

### Put it in the wiki if:

- it explains what something **is**
- it will still matter in six months
- multiple pages or people will need to reference it
- it changes how ACT understands a project, method, person, or decision

### Put it in Empathy Ledger if:

- it is a story, voice, portrait, interview, or gallery
- it needs consent handling or scope control
- it may be revised, withdrawn, or recontextualised over time

### Put it on the website if:

- it helps a public visitor understand, navigate, inquire, or feel the work
- it can be composed from the other two layers
- it does not need to become the new source of truth

## What This Protects

This operating system protects ACT from four common drifts:

1. **Website drift** — important truth only exists in page copy
2. **Wiki drift** — the wiki starts trying to hold raw story/media infrastructure
3. **Portfolio drift** — works and projects separate from each other and become hard to trace
4. **Editorial drift** — every new page becomes a custom one-off instead of part of a repeatable system

## The Goal

The goal is not just "a website that updates."

The goal is:

> a public shell that stays honest because it is fed by durable memory, refreshed by consented field material, and light enough to keep changing as the work changes.

That is what makes it a living website rather than a marketing site with periodic manual refreshes.

## Sources

- `act-regenerative-studio/package.json`
- `act-regenerative-studio/src/lib/wiki/canonical-site-wiki.ts`
- `act-regenerative-studio/src/lib/wiki/canonical-project-wiki.ts`
- `act-regenerative-studio/src/lib/empathy-ledger-featured.ts`
- `act-regenerative-studio/src/lib/works/live-featured-works.ts`
- `act-regenerative-studio/src/lib/projects/get-project-data.ts`
- `wiki/decisions/url-audit-latest.json`

## Backlinks

- [[tractorpedia|Tractorpedia]] — the durable memory layer this operating system depends on
- [[ways-of-working|Ways of Working]] — the rhythm that keeps the website alive over time
- [[continuous-pipeline|Continuous Pipeline Architecture]] — the automation and snapshot layer underneath the wiki
- [[empathy-ledger|Empathy Ledger]] — the live story and media layer
- [[llm-knowledge-base|LLM Knowledge Base]] — the pattern behind the canonical wiki
- [[beautiful-obsolescence|Beautiful Obsolescence]] — why the website should stay thin and handover-friendly
