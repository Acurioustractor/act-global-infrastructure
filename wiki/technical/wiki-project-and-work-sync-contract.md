---
title: Wiki Project and Work Sync Contract
status: Active
date: 2026-04-11
---

# Wiki Project and Work Sync Contract

> The wiki is the anchor for what a project or work **is**. Supabase, Empathy Ledger, and the websites should read from this contract instead of inventing parallel truths.

## Why This Exists

The ACT system now has enough moving parts that identity drift becomes expensive fast:

- Tractorpedia holds the durable memory
- Empathy Ledger holds the live editorial, story, photo, and video layer
- Supabase holds operational rows, sync state, and history
- the websites compose the public surface

If those layers all define project identity independently, the same thing ends up with three names, two slugs, and the wrong photos.

This contract fixes that.

## Knowledge-Base Method

This follows the [[llm-knowledge-base|LLM Knowledge Base]] pattern and should continue to.

### The layers stay distinct

| Layer | Purpose | What belongs there |
|---|---|---|
| `wiki/raw/` | Immutable source memory | transcripts, articles, screenshots, datasets, exports |
| `wiki/sources/` | One-summary-per-source bridge | what a raw source contains, who/what it touches |
| `wiki/projects/`, `wiki/art/`, etc. | Durable entity / concept memory | projects, works, communities, methods, decisions |
| `wiki/synthesis/` | Compounding answers | query outputs worth keeping |
| Empathy Ledger | Live editorial and consented proof | stories, storytellers, galleries, photos, video, hero selections |
| Supabase | Operational mirror and sync state | `projects`, sync metadata, history tables, CRM/finance joins |
| Websites | Public composition | curated pages, routing, enquiry, syndication |

The wiki should remain the place where ACT's understanding compounds. It should not become a media bucket or a redundant content store.

The same applies to people. `wiki/people/` is a curated explanatory layer, not a mirror of every EL storyteller or every operational contact. The curation rule lives in [[people/README|People Index]].

## The Rule

For any real ACT project or work:

1. **Name it and frame it in the wiki**
2. **Classify it through the identity rules**
3. **Link live stories/media in Empathy Ledger**
4. **Mirror canonical identifiers into Supabase**
5. **Compose it on the website from generated snapshots**

That means the website is downstream of the wiki, not parallel to it.

## Canonical Fields

Every load-bearing page that might sync to the website, Empathy Ledger, or Supabase should have frontmatter like this.

### Required for operational/project surfaces

| Field | Meaning |
|---|---|
| `title` | Human-readable canonical title |
| `status` | Current lifecycle state (`Active`, `Paused`, `Ideation`, etc.) |
| `date` | Last structural update date for the page |
| `entity_type` | What kind of object this page is |
| `tagging_mode` | How it behaves across systems |
| `canonical_slug` | Canonical slug across wiki/site/EL |
| `canonical_code` | Canonical cross-system project code |

### Strongly recommended for website / EL composition

| Field | Meaning |
|---|---|
| `website_slug` | Website-facing slug if different from wiki file slug |
| `website_path` | Primary ACT-site route for the page |
| `public_surface` | `project`, `hub`, `work`, or `index` |
| `cluster` | Cluster or field this page belongs to |
| `parent_project` | Canonical parent slug when this is a work, sub-project, or cluster member |
| `empathy_ledger_key` | Canonical EL project key when it differs from `canonical_slug` |

### Current controlled value sets

- `entity_type`
  - `project`
  - `project-hub`
  - `cluster-hub`
  - `sub-project`
  - `deliverable`
  - `work`
  - `work-series`
  - `work-placeholder`
  - `methodology`
  - `flagship-program`
  - `pitch-package`
  - `working-draft`
  - `partner-proof`
  - `alias-brand`
  - `community-strategy`
  - `method-lab`

- `tagging_mode`
  - `own-code`
  - `parent-code`
  - `alias-of`
  - `related-proof`
  - `no-tag-yet`

- `public_surface`
  - `project`
  - `hub`
  - `work`
  - `index`

## Example: Project

```yaml
---
title: JusticeHub
status: Active
date: 2026-04-11
entity_type: project-hub
tagging_mode: own-code
canonical_slug: justicehub
canonical_code: ACT-JH
website_slug: justicehub
website_path: /justicehub
public_surface: project
cluster: justicehub
empathy_ledger_key: justicehub
---
```

## Example: Work

```yaml
---
title: Gold.Phone
status: Active
date: 2026-04-11
entity_type: work
tagging_mode: own-code
canonical_slug: gold-phone
canonical_code: ACT-GP
website_slug: gold-phone
website_path: /projects/gold-phone
public_surface: work
cluster: act-studio
parent_project: act-studio
empathy_ledger_key: gold-phone
---
```

## What Syncs Where

### To the website

The ACT site should consume generated wiki snapshots, not scrape page bodies ad hoc forever. The project snapshot should at minimum expose:

- `slug`
- `title`
- `summary`
- `overview`
- `status`
- `code`
- `canonicalSlug`
- `canonicalCode`
- `entityType`
- `taggingMode`
- `cluster`
- `parentProject`
- `websiteSlug`
- `websitePath`
- `projectPagePath`
- `publicSurface`
- `empathyLedgerKey`

For the five flagship ACT public fields, the system should also emit a dedicated pack snapshot:

- `wiki/output/flagship-project-packs.json` in the wiki repo
- `src/data/wiki-flagship-project-packs.generated.json` in the ACT website repo

Those packs are the direct handoff for richer public composition and EL alignment. They should carry:

- the canonical identity fields above
- the flagship page summary / overview / system position
- curated key people
- key source bridges
- website path + EL key in one object

That gives the website and Empathy Ledger a stable object to consume without reparsing long-form wiki markdown every time.

### To Supabase

Supabase should mirror canonical identity, not redefine it.

Current practical rule:

- `public.projects` should carry the canonical code
- `public.projects.metadata.canonical_slug` should carry the canonical wiki slug
- wrapper or legacy rows should point back to the canonical slug/code, not diverge from it

Supabase is the operational mirror and history surface. It is not the place where project identity is invented.

### To Empathy Ledger

Empathy Ledger should use the canonical slug or explicit `empathy_ledger_key` to attach:

- hero image / hero video
- galleries
- storyteller portraits
- featured stories
- syndicated articles

That keeps media and stories attached to the same identity the wiki defines.

## Ongoing History

The system's history should remain legible across layers:

- **Wiki history** — durable page evolution, decisions, synthesis, backlinks
- **`wiki/log.md`** — operational trail of wiki maintenance actions
- **Supabase history** — operational rows, sync metadata, CRM / finance / opportunity traces
- **Empathy Ledger history** — stories, media, editorial manifests, consent-aware live proof

The website should present the current composed view, but it should not be the only place where history can be understood.

## Works and Art

The `wiki/art/` directory should remain the **conceptual and curatorial layer**.

That means:
- `wiki/art/art-projects.md` is the studio-line index
- individual load-bearing works can still live in `wiki/projects/` when they behave like real projects or operational works
- the website's `Works` layer should compose those wiki pages with EL photos/video/story fragments

Do **not** duplicate the same work article across `wiki/art/` and `wiki/projects/`. The index can point. The canonical page should stay singular.

## Retagging Rule

Reclassification is allowed and expected.

When a page changes shape:

1. update the page frontmatter
2. update [[project-identity-and-tagging-system|Project Identity and Tagging System]] if the classification changed
3. rerun the sync chain
4. let Supabase / EL / site converge from that updated contract

That is how the system grows without freezing mistakes in place.

## Backlinks

- [[act-knowledge-ops-loop|ACT Knowledge Ops Loop]] — the concrete operating rhythm that applies this contract in practice
- [[living-website-operating-system|Living Website Operating System]] — explains how the layers compose into public surfaces
- [[project-identity-and-tagging-system|Project Identity and Tagging System]] — determines what gets its own code and what rolls up
- [[llm-knowledge-base|LLM Knowledge Base]] — the underlying second-brain method
- [[art-projects|ACT Art Projects]] — how the works layer is organized conceptually
- [[tractorpedia|Tractorpedia]] — the wiki itself as the durable memory graph
